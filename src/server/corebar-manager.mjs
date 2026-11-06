import { readFile, mkdir, writeFile, rename, unlink } from 'node:fs/promises';
import { dirname } from 'node:path';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { discoverCorebar } from './corebar.mjs';
import { connectCorebar } from './corebar-session.mjs';

export function createCorebarManager(host, {
  stateFile = fileURLToPath(new URL('../../artifacts/corebar-auth.json', import.meta.url)),
  discover = discoverCorebar, connect = connectCorebar,
} = {}) {
  let pairing = null;
  async function load() {
    try {
      const state = JSON.parse(await readFile(stateFile, 'utf8'));
      if (state.host !== host || typeof state.clientId !== 'string' || typeof state.token !== 'string' || !state.token) return null;
      return state;
    } catch (error) { if (error.code === 'ENOENT') return null; throw new Error('Cannot read saved CoreBAR pairing'); }
  }
  async function save(state) {
    await mkdir(dirname(stateFile), { recursive: true, mode: 0o700 });
    const temporary = `${stateFile}.${randomUUID()}.tmp`;
    try {
      await writeFile(temporary, JSON.stringify(state), { mode: 0o600, flag: 'wx' });
      await rename(temporary, stateFile);
    } catch { await unlink(temporary).catch(() => {}); throw new Error('Cannot save CoreBAR pairing locally'); }
  }
  return {
    async status() {
      return { configured: Boolean(host), paired: Boolean(host && await load()), pairing: Boolean(pairing) };
    },
    async catalog(parent = null) {
      if (parent !== null && (typeof parent !== 'string' || parent.length > 512)) throw new Error('Invalid catalog category');
      const saved = await load();
      if (!saved) throw new Error('Pair CoreBAR first');
      const device = await discover(host);
      if (device.serialNo !== saved.serialNo) throw new Error('CoreBAR identity changed; pair the intended device again');
      const session = await connect(host, { port: device.advertisedTcpPort });
      try {
        await session.authenticate(saved.token);
        const result = await session.request(1002, parent);
        if (!Array.isArray(result.data) || result.data.length > 2000) throw new Error('Invalid native widget catalog');
        return result.data.filter(item => item && typeof item.id === 'string' && item.id.length <= 512).map(item => ({
          id: item.id, name: typeof item.name === 'string' ? item.name.slice(0, 200) : item.id,
          type: typeof item.type === 'string' ? item.type.slice(0, 100) : null, leaf: item.last === true,
        }));
      } finally { session.close(); }
    },
    async pair() {
      if (!host) throw new Error('Configure COREBAR_HOST first');
      if (pairing) return pairing;
      pairing = (async () => {
        const device = await discover(host);
        const saved = await load();
        const session = await connect(host, { port: device.advertisedTcpPort });
        try {
          const clientId = saved?.clientId ?? randomUUID();
          const token = await session.pair(clientId, 'Ultra Craft');
          await save({ host, serialNo: device.serialNo, clientId, token });
          return { paired: true, host, version: device.version };
        } finally { session.close(); }
      })().finally(() => { pairing = null; });
      return pairing;
    },
  };
}
