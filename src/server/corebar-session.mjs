import tls from 'node:tls';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';

const fingerprint = '4A:A8:30:D5:FE:23:6A:41:E5:B8:50:2C:EC:D3:AA:5F:8D:A7:42:AC:75:7B:F6:E3:19:65:4F:31:D6:79:0B:93';
const certificate = new URL('./certs/corebar-v1.0.4.pem', import.meta.url);
const MAX_FRAME = 1048576;

export class CorebarSession {
  constructor(socket, { timeoutMs = 15000 } = {}) {
    this.socket = socket;
    this.timeoutMs = timeoutMs;
    this.pending = new Map();
    this.buffer = Buffer.alloc(0);
    this.authenticated = false;
    this.closed = false;
    socket.on('data', chunk => this.receive(chunk));
    socket.on('error', () => this.close(new Error('CoreBAR connection failed')));
    socket.on('close', () => this.close(new Error('CoreBAR disconnected')));
  }
  receive(chunk) {
    if (this.closed) return;
    this.buffer = Buffer.concat([this.buffer, chunk]);
    while (true) {
      const end = this.buffer.indexOf(10);
      if (end < 0) break;
      if (end > MAX_FRAME) return this.close(new Error('CoreBAR frame exceeds size limit'));
      const line = this.buffer.subarray(0, end).toString('utf8').trim();
      this.buffer = this.buffer.subarray(end + 1);
      if (!line) continue;
      let message;
      try { message = JSON.parse(line); } catch { return this.close(new Error('Invalid CoreBAR response')); }
      if (!message || typeof message !== 'object' || Array.isArray(message)) return this.close(new Error('Invalid CoreBAR response'));
      const request = this.pending.get(message.id);
      if (!request) continue;
      if (message.code !== 200) { request.reject(new Error('CoreBAR rejected the request')); continue; }
      // Pairing has an intermediate acknowledgement before physical confirmation.
      if (request.pairing && message.data?.state === 0) { request.onPending?.(); continue; }
      request.resolve(message);
    }
    if (this.buffer.length > MAX_FRAME) this.close(new Error('CoreBAR frame exceeds size limit'));
  }
  request(act, data, { pairing = false, onPending } = {}) {
    if (this.closed) return Promise.reject(new Error('CoreBAR is disconnected'));
    const id = randomUUID();
    return new Promise((resolve, reject) => {
      const finish = (fn, value) => {
        const entry = this.pending.get(id); if (!entry) return;
        clearTimeout(entry.timer); this.pending.delete(id); fn(value);
      };
      const timer = setTimeout(() => finish(reject, new Error(pairing ? 'Pairing timed out. Confirm on CoreBAR within ten seconds.' : 'CoreBAR request timed out')), this.timeoutMs);
      this.pending.set(id, { timer, pairing, onPending, resolve: value => finish(resolve, value), reject: error => finish(reject, error) });
      this.socket.write(`${JSON.stringify({ id, act, data })}\n`, error => {
        if (error) finish(reject, new Error('Cannot write to CoreBAR'));
      });
    });
  }
  async pair(clientId, name, onPending) {
    const result = await this.request(101, { id: clientId, name }, { pairing: true, onPending });
    if (result.data?.state !== 1 || typeof result.data.token !== 'string' || !result.data.token) throw new Error('CoreBAR returned an invalid pairing response');
    this.authenticated = true;
    return result.data.token;
  }
  async authenticate(token) {
    await this.request(100, token);
    this.authenticated = true;
  }
  close(error = new Error('CoreBAR session closed')) {
    if (this.closed) return;
    this.closed = true; this.authenticated = false;
    for (const request of this.pending.values()) request.reject(error);
    this.socket.destroy();
  }
}

export async function connectCorebar(host, { port = 7431, timeoutMs = 15000, connectImpl = tls.connect } = {}) {
  const ca = await readFile(certificate);
  return new Promise((resolve, reject) => {
    const socket = connectImpl({ host, port, ca, allowPartialTrustChain: true, minVersion: 'TLSv1.3', rejectUnauthorized: true,
      checkServerIdentity: (_hostname, cert) => cert.fingerprint256 === fingerprint ? undefined : new Error('CoreBAR certificate does not match the release') });
    const timer = setTimeout(() => { socket.destroy(); reject(new Error('CoreBAR TLS connection timed out')); }, timeoutMs);
    const failure = () => { clearTimeout(timer); reject(new Error('Cannot establish a trusted CoreBAR TLS connection')); };
    socket.once('error', failure);
    socket.once('secureConnect', () => {
      clearTimeout(timer); socket.off('error', failure);
      resolve(new CorebarSession(socket, { timeoutMs }));
    });
  });
}
