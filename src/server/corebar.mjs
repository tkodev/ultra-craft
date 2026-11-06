import { createSocket } from 'node:dgram';
import { isIP } from 'node:net';

export const DISCOVERY_PORT = 5319;
export const DISCOVERY_REQUEST = 'discovery.ultrabar';

export function parseAnnouncement(buffer, expectedHost) {
  if (buffer.length > 16384) throw new Error('Oversized CoreBAR announcement');
  const data = JSON.parse(buffer.toString('utf8'));
  if (!data || data.ip !== expectedHost || data.name !== 'ultrabar'
    || typeof data.ver !== 'string' || data.ver.length > 80
    || typeof data.serialNo !== 'string' || !data.serialNo.length || data.serialNo.length > 200
    || !Number.isInteger(data.tcpPort) || data.tcpPort < 1 || data.tcpPort > 65535) throw new Error('Invalid CoreBAR announcement');
  return { host: expectedHost, name: data.name, version: data.ver, advertisedTcpPort: data.tcpPort, serialNo: data.serialNo };
}

// A directed request to one configured IP, never a LAN broadcast or pairing attempt.
export function discoverCorebar(host, { port = DISCOVERY_PORT, timeoutMs = 3000 } = {}) {
  if (isIP(host) !== 4) return Promise.reject(new Error('Configure a CoreBAR IPv4 address'));
  return new Promise((resolve, reject) => {
    const socket = createSocket('udp4');
    let settled = false;
    const finish = (error, result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      socket.close();
      if (error) reject(error); else resolve(result);
    };
    const timer = setTimeout(() => finish(new Error('CoreBAR discovery timed out')), timeoutMs);
    socket.on('error', () => finish(new Error('Cannot discover CoreBAR')));
    socket.on('message', (data, peer) => {
      if (peer.address !== host || peer.port !== port) return;
      try { finish(null, parseAnnouncement(data, host)); } catch { /* Ignore unrelated or malformed packets until the deadline. */ }
    });
    socket.bind(0, '0.0.0.0', () => {
      socket.send(DISCOVERY_REQUEST, port, host, error => { if (error) finish(new Error('Cannot send CoreBAR discovery')); });
    });
  });
}
