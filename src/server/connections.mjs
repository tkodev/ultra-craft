import { readFile, writeFile, rename, mkdir, unlink } from 'node:fs/promises';
import { dirname } from 'node:path';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { readConfig } from './config.mjs';
import { createSource, startTrueNAS, createBeszelPoller } from './connectors.mjs';
import { snapshot } from '../shared/metrics.mjs';
export const connectionsFile = fileURLToPath(new URL('../../artifacts/connections.json', import.meta.url));

function validate(kind, value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid connection');
  for (const field of ['url', 'name', 'sensor', 'key', 'token', 'systemId']) {
    const maximum = { url: 2048, name: 100, sensor: 200, key: 16384, token: 16384, systemId: 64 }[field];
    if (value[field] !== undefined && (typeof value[field] !== 'string' || value[field].length > maximum)) throw new Error('Invalid connection field');
  }
  const env = kind === 'truenas' ? { TRUENAS_URL: value.url, TRUENAS_API_KEY: value.key, TRUENAS_NAME: value.name, TRUENAS_SENSOR: value.sensor }
    : { BESZEL_URL: value.url, BESZEL_TOKEN: value.token, BESZEL_NAME: value.name, BESZEL_SENSOR: value.sensor, BESZEL_SYSTEM_ID: value.systemId };
  return readConfig(env)[kind];
}
export async function loadSavedConnections(config, file = connectionsFile) {
  let saved;
  try { saved = JSON.parse(await readFile(file, 'utf8')); }
  catch (error) { if (error.code === 'ENOENT') return config; throw new Error('Cannot read saved server connections'); }
  return { ...config, truenas: validate('truenas', { ...config.truenas, ...saved.truenas }), beszel: validate('beszel', { ...config.beszel, ...saved.beszel }) };
}

export function createConnections(config, { stateFile = connectionsFile, ...dependencies } = {}) {
  let settings = { truenas: config.truenas, beszel: config.beszel }, sources, stopTrueNAS, pollBeszel;
  let saving = Promise.resolve();
  const fetchImpl = dependencies.fetchImpl ?? fetch;
  sources = [];
  function start(kind) {
    if (!kind || kind === 'truenas') {
      stopTrueNAS?.();
      sources[0] = createSource('truenas', settings.truenas.name, Boolean(settings.truenas.url && settings.truenas.key), 15000);
      stopTrueNAS = startTrueNAS(sources[0], settings.truenas, dependencies);
    }
    if (!kind || kind === 'beszel') {
      sources[1] = createSource('beszel', settings.beszel.name, Boolean(settings.beszel.url && settings.beszel.token && settings.beszel.systemId), 180000);
      pollBeszel = createBeszelPoller(sources[1], settings.beszel, dependencies);
    }
  }
  start();
  const publicSettings = () => ({
    truenas: { url: settings.truenas.url, name: settings.truenas.name, sensor: settings.truenas.sensor, hasCredential: Boolean(settings.truenas.key) },
    beszel: { url: settings.beszel.url, name: settings.beszel.name, sensor: settings.beszel.sensor, systemId: settings.beszel.systemId, hasCredential: Boolean(settings.beszel.token) },
  });
  function update(kind, input) {
    if (!['truenas', 'beszel'].includes(kind)) return Promise.reject(new Error('Unknown server kind'));
    if (!input || typeof input !== 'object' || Array.isArray(input)) return Promise.reject(new Error('Invalid connection'));
    const operation = saving.then(async () => {
      const next = { ...settings, [kind]: validate(kind, { ...settings[kind], ...input }) };
      await mkdir(dirname(stateFile), { recursive: true, mode: 0o700 });
      const temporary = `${stateFile}.${randomUUID()}.tmp`;
      try {
        await writeFile(temporary, JSON.stringify(next), { mode: 0o600, flag: 'wx' });
        await rename(temporary, stateFile);
      } catch { await unlink(temporary).catch(() => {}); throw new Error('Cannot save server connection'); }
      settings = next; start(kind); return publicSettings();
    });
    saving = operation.catch(() => {});
    return operation;
  }
  return {
    settings: publicSettings,
    update,
    async metrics() { await pollBeszel(); return sources.map(source => snapshot(source)); },
    close() { stopTrueNAS(); },
    async loginBeszel(input) {
      if (typeof input.identity !== 'string' || typeof input.password !== 'string' || !input.identity || !input.password || input.identity.length > 256 || input.password.length > 4096) throw new Error('Beszel login requires email and password');
      const next = validate('beszel', { ...settings.beszel, url: input.url, name: input.name });
      if (!next.url) throw new Error('Beszel URL is required');
      const response = await fetchImpl(`${next.url}/api/collections/users/auth-with-password`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ identity: input.identity, password: input.password }),
        redirect: 'error', signal: AbortSignal.timeout(10000),
      });
      if (!response.ok) throw new Error('Beszel login failed');
      const result = await response.json();
      if (typeof result.token !== 'string' || !result.token || result.token.length > 16384) throw new Error('Beszel returned an invalid session');
      return update('beszel', { ...next, token: result.token });
    },
    async beszelSystems() {
      if (!settings.beszel.url || !settings.beszel.token) throw new Error('Sign in to Beszel first');
      const url = new URL(`${settings.beszel.url}/api/collections/systems/records`);
      url.search = new URLSearchParams({ perPage: '200', sort: 'name', fields: 'id,name,status' });
      const response = await fetchImpl(url, { headers: { Authorization: settings.beszel.token }, redirect: 'error', signal: AbortSignal.timeout(10000) });
      if (!response.ok) throw new Error('Cannot list Beszel systems');
      const result = await response.json();
      if (!Array.isArray(result.items)) throw new Error('Invalid Beszel system list');
      return result.items.filter(item => /^[a-zA-Z0-9]{1,64}$/.test(item.id) && typeof item.name === 'string').map(({ id, name }) => ({ id, name: name.slice(0, 100) }));
    },
  };
}
