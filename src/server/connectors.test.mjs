import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createServer, get } from 'node:http';
import { createSource, startTrueNAS, createBeszelPoller } from './connectors.mjs';
import { createApp } from './index.mjs';
import { readConfig } from './config.mjs';

class FakeSocket extends EventTarget {
  static instances = [];
  sent = [];
  constructor(url) { super(); this.url = url; FakeSocket.instances.push(this); }
  send(raw) { this.sent.push(JSON.parse(raw)); }
  close() { this.dispatchEvent(new Event('close')); }
  receive(data) { this.dispatchEvent(new MessageEvent('message', { data: JSON.stringify(data) })); }
}

test('TrueNAS authenticates, subscribes, receives telemetry, and stops cleanly', () => {
  const source = createSource('truenas', 'NAS', true, 15000);
  const stop = startTrueNAS(source, { url: 'wss://example/api/current', key: 'private-key', sensor: '' }, { WebSocketClass: FakeSocket });
  try {
    const socket = FakeSocket.instances.at(-1);
    socket.dispatchEvent(new Event('open'));
    assert.deepEqual(socket.sent[0], { jsonrpc: '2.0', id: 1, method: 'auth.login_with_api_key', params: ['private-key'] });
    socket.receive({ id: 1, result: true });
    assert.equal(socket.sent[1].method, 'core.subscribe');
    assert.deepEqual(socket.sent[1].params, ['reporting.realtime:{"interval":2}']);
    socket.receive({ id: 2, result: 'subscription' });
    socket.receive({ method: 'collection_update', params: { collection: 'disk.query', fields: {} } });
    assert.equal(source.observedAt, null);
    socket.receive({ method: 'collection_update', params: { collection: 'reporting.realtime', fields: { cpu: { cpu: { usage: 20, temp: 48 } }, memory: { physical_memory_total: 100, physical_memory_available: 25 } } } });
    assert.equal(source.metrics.cpu, 20); assert.equal(source.metrics.ram, 75);
    assert.equal(source.metrics.temperature, 48); assert.ok(source.observedAt);
    socket.receive({ method: 'notify_unsubscribed', params: {} });
    assert.equal(source.error, 'TrueNAS ended the telemetry subscription.');
  } finally { stop(); }
});
test('TrueNAS does not subscribe after denied authentication or leak upstream errors', () => {
  const source = createSource('truenas', 'NAS', true, 15000);
  const stop = startTrueNAS(source, { url: 'wss://example/api/current', key: 'secret' }, { WebSocketClass: FakeSocket });
  try {
    const socket = FakeSocket.instances.at(-1); socket.dispatchEvent(new Event('open'));
    socket.receive({ id: 1, error: { message: 'secret' } });
    assert.equal(socket.sent.length, 1); assert.ok(!source.error.includes('secret'));
  } finally { stop(); }
});

test('Beszel polling uses the system filter, deduplicates requests and retains old observation time', async t => {
  let requests = 0;
  const fixture = createServer((req, res) => {
    requests++;
    assert.equal(req.headers.authorization, 'private-token');
    const url = new URL(req.url, 'http://localhost');
    assert.equal(url.pathname, '/api/collections/system_stats/records');
    assert.equal(url.searchParams.get('filter'), 'system="abc123" && type="1m"');
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ items: [{ created: '2026-11-05 12:00:00.000Z', stats: { cpu: 10, mp: 20, t: { cpu: 45 } } }] }));
  });
  fixture.listen(0, '127.0.0.1'); await once(fixture, 'listening'); t.after(() => fixture.close());
  const source = createSource('beszel', 'Beszel', true, 180000);
  const poll = createBeszelPoller(source, { url: `http://127.0.0.1:${fixture.address().port}`, token: 'private-token', systemId: 'abc123', sensor: 'cpu' });
  await Promise.all([poll(), poll()]); await poll();
  assert.equal(requests, 1); assert.equal(source.metrics.temperature, 45);
  assert.equal(source.observedAt, Date.UTC(2026, 10, 5, 12));
});
test('Beszel errors retain last metrics and never expose upstream response bodies', async () => {
  const source = createSource('beszel', 'Beszel', true, 180000);
  source.observedAt = 10; source.metrics.cpu = 25;
  const poll = createBeszelPoller(source, { url: 'https://example.com', token: 'secret', systemId: 'abc' }, { fetchImpl: async () => new Response('secret', { status: 403 }) });
  await poll(); assert.equal(source.metrics.cpu, 25); assert.equal(source.observedAt, 10);
  assert.ok(!source.error.includes('secret')); assert.match(source.error, /authentication/);
});
test('configuration rejects insecure TrueNAS auth and filter injection', () => {
  assert.throws(() => readConfig({ TRUENAS_URL: 'ws://nas/api/current' }));
  assert.throws(() => readConfig({ BESZEL_SYSTEM_ID: 'a" || true' }));
  assert.throws(() => readConfig({ BESZEL_URL: 'https://user:password@example.com' }));
});
test('local server serves workspace and widget views, reports unconfigured sources, and blocks hostile hosts', async t => {
  const app = createApp(readConfig({ PORT: '0' }));
  app.listen(0, '127.0.0.1'); await once(app, 'listening'); t.after(() => app.close());
  const base = `http://127.0.0.1:${app.address().port}`;
  assert.match(await (await fetch(base)).text(), /Ultra Craft/);
  assert.equal((await fetch(`${base}/widget?source=beszel`)).status, 200);
  const response = await fetch(`${base}/api/metrics`);
  const body = await response.json(); assert.deepEqual(body.sources.map(source => source.status), ['unconfigured', 'unconfigured']);
  assert.equal((await fetch(`${base}/.env`)).status, 404);
  const hostileStatus = await new Promise((resolve, reject) => { get(base, { headers: { Host: 'attacker.example' } }, response => { response.resume(); resolve(response.statusCode); }).on('error', reject); });
  assert.equal(hostileStatus, 403);
  assert.equal((await fetch(base, { method: 'POST' })).status, 405);
});
