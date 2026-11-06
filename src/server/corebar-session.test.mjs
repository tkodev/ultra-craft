import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { CorebarSession, connectCorebar } from './corebar-session.mjs';
class Socket extends EventEmitter {
  sent = []; destroyed = false;
  write(data, callback) { this.sent.push(JSON.parse(data)); callback?.(); }
  destroy() { this.destroyed = true; }
  reply(data) { this.emit('data', Buffer.from(JSON.stringify(data) + '\n')); }
}
test('pairing waits for physical approval and returns the token only after final acknowledgement', async () => {
  const socket = new Socket(), session = new CorebarSession(socket);
  let pending = false, settled = false;
  const pairing = session.pair('stable-client-id', 'Ultra Craft', () => { pending = true; }).then(token => { settled = true; return token; });
  const request = socket.sent[0];
  assert.equal(request.act, 101); assert.deepEqual(request.data, { id: 'stable-client-id', name: 'Ultra Craft' });
  socket.reply({ id: request.id, act: 101, code: 200, data: { state: 0 } });
  await Promise.resolve(); assert.equal(pending, true); assert.equal(settled, false);
  socket.reply({ id: request.id, act: 101, code: 200, data: { state: 1, token: 'private-token' } });
  assert.equal(await pairing, 'private-token'); assert.equal(session.authenticated, true);
  session.close();
});
test('session matches request IDs across split/multiple frames and closes on invalid JSON', async () => {
  const socket = new Socket(), session = new CorebarSession(socket);
  const one = session.request(20, {}), two = session.request(1002, {});
  const raw = JSON.stringify({ id: socket.sent[1].id, code: 200, data: 'second' }) + '\n' + JSON.stringify({ id: socket.sent[0].id, code: 200, data: 'first' }) + '\n';
  socket.emit('data', Buffer.from(raw.slice(0, 15))); socket.emit('data', Buffer.from(raw.slice(15)));
  assert.equal((await one).data, 'first'); assert.equal((await two).data, 'second');
  socket.emit('data', Buffer.from('invalid\n')); assert.equal(socket.destroyed, true);
});
test('denied and timed-out pairing rejects without authenticating', async () => {
  const socket = new Socket(), session = new CorebarSession(socket, { timeoutMs: 20 });
  const rejected = session.pair('id', 'name'); socket.reply({ id: socket.sent[0].id, code: -1, msg: 'private-info' });
  await assert.rejects(rejected, /rejected/); assert.equal(session.authenticated, false);
  await assert.rejects(session.pair('id', 'name'), /timed out/); session.close();
});
test('TLS connection requires the release certificate pin and never disables verification', async () => {
  const socket = new Socket();
  let options;
  const connected = connectCorebar('192.0.2.1', { connectImpl: input => { options = input; setImmediate(() => socket.emit('secureConnect')); return socket; } });
  const session = await connected;
  assert.equal(options.rejectUnauthorized, true); assert.equal(options.minVersion, 'TLSv1.3');
  assert.ok(options.checkServerIdentity('ignored', { fingerprint256: 'wrong' }) instanceof Error);
  assert.equal(options.allowPartialTrustChain, true); session.close();
});
