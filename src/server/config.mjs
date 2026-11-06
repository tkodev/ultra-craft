import { isIP } from 'node:net';
function endpoint(raw, protocols, label) {
  if (!raw) return '';
  const url = new URL(raw);
  if (!protocols.includes(url.protocol) || url.username || url.password || url.search || url.hash) throw new Error(`Invalid ${label} URL`);
  return url.href.replace(/\/$/, '');
}

export function readConfig(env = process.env) {
  const corebarHost = env.COREBAR_HOST ?? '';
  if (corebarHost && isIP(corebarHost) !== 4) throw new Error('Invalid COREBAR_HOST');
  const systemId = env.BESZEL_SYSTEM_ID ?? '';
  if (systemId && !/^[a-zA-Z0-9]{1,64}$/.test(systemId)) throw new Error('Invalid Beszel system ID');
  const port = Number(env.PORT ?? 3140);
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error('Invalid PORT');
  return { port, corebarHost, nativeProjectFile: env.NATIVE_PROJECT_FILE ?? '',
    truenas: { url: endpoint(env.TRUENAS_URL, ['wss:'], 'TrueNAS'), key: env.TRUENAS_API_KEY ?? '', name: env.TRUENAS_NAME || 'TrueNAS', sensor: env.TRUENAS_SENSOR ?? '' },
    beszel: { url: endpoint(env.BESZEL_URL, ['https:', 'http:'], 'Beszel'), token: env.BESZEL_TOKEN ?? '', systemId, name: env.BESZEL_NAME || 'Beszel', sensor: env.BESZEL_SENSOR ?? '' },
  };
}
