import test from 'node:test';
import assert from 'node:assert/strict';
import { createSocket } from 'node:dgram';
import { once } from 'node:events';
import { discoverCorebar, parseAnnouncement, DISCOVERY_REQUEST } from './corebar.mjs';
const announcement = { ip: '127.0.0.1', name: 'ultrabar', ver: '1.0.9(9)', tcpPort: 7431, serialNo: 'fixture-device' };
test('directed discovery sends the recovered request and validates the device reply', async t => {
  const server = createSocket('udp4'); server.bind(0, '127.0.0.1'); await once(server, 'listening'); t.after(() => server.close());
  server.on('message', (data, peer) => {
    assert.equal(data.toString(), DISCOVERY_REQUEST);
    server.send(JSON.stringify({ ...announcement, ip: '192.0.2.1' }), peer.port, peer.address);
    server.send(JSON.stringify(announcement), peer.port, peer.address);
  });
  const result = await discoverCorebar('127.0.0.1', { port: server.address().port });
  assert.equal(result.version, '1.0.9(9)'); assert.equal(result.serialNo, 'fixture-device');
});
test('discovery rejects unknown reply shapes and invalid destinations', async () => {
  assert.throws(() => parseAnnouncement(Buffer.from('{}'), '127.0.0.1'));
  assert.throws(() => parseAnnouncement(Buffer.from(JSON.stringify({ ...announcement, tcpPort: 70000 })), '127.0.0.1'));
  await assert.rejects(discoverCorebar('example.com'), /IPv4/);
});
test('discovery times out without leaving an open UDP socket', async t => {
  const server = createSocket('udp4'); server.bind(0, '127.0.0.1'); await once(server, 'listening'); t.after(() => server.close());
  await assert.rejects(discoverCorebar('127.0.0.1', { port: server.address().port, timeoutMs: 30 }), /timed out/);
});

test('discovery API reports unpaired metadata without serial numbers and rejects foreign origins', async t => {
  const { createApp } = await import('./index.mjs');
  const { readConfig } = await import('./config.mjs');
  let calls = 0;
  const app = createApp(readConfig({ COREBAR_HOST: '192.0.2.1' }), { discoverCorebar: async host => {
    calls++; assert.equal(host, '192.0.2.1');
    return { host, name: 'ultrabar', version: '1.0.9(9)', advertisedTcpPort: 7431, serialNo: 'private-identifier' };
  } });
  app.listen(0, '127.0.0.1'); await once(app, 'listening'); t.after(() => app.close());
  const url = `http://127.0.0.1:${app.address().port}/api/device/discover`;
  const denied = await fetch(url, { method: 'POST', headers: { Origin: 'https://external.example' } });
  assert.equal(denied.status, 403); assert.equal(calls, 0);
  const response = await fetch(url, { method: 'POST' });
  const body = await response.json(); assert.equal(response.status, 200);
  assert.equal(body.paired, false); assert.equal(body.device.version, '1.0.9(9)');
  assert.equal(body.device.serialNo, undefined);
});
