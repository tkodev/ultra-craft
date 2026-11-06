import test from 'node:test';
import assert from 'node:assert/strict';
import { truenasMetrics, beszelMetrics, snapshot, pocketbaseTimestamp } from './metrics.mjs';
import { createSource } from '../server/connectors.mjs';

test('TrueNAS computes RAM from physical availability and selects hottest CPU core', () => {
  const fields = { cpu: { cpu: { usage: 0, temp: null }, cpu0: { usage: 0, temp: 43 }, cpu1: { usage: 0, temp: 51 } }, memory: { physical_memory_total: 1000, physical_memory_available: 750 } };
  const metric = truenasMetrics(fields);
  assert.equal(metric.cpu, 0); assert.equal(metric.ram, 25); assert.equal(metric.temperature, 51);
  assert.equal(truenasMetrics(fields, 'cpu0').temperature, 43);
  assert.equal(truenasMetrics(fields, 'missing').temperature, null);
});
test('missing, invalid and out-of-range values remain unavailable', () => {
  assert.deepEqual(truenasMetrics({}), { cpu: null, ram: null, temperature: null, sensors: {} });
  assert.equal(truenasMetrics({ memory: { physical_memory_total: 0, physical_memory_available: 0 } }).ram, null);
  assert.equal(beszelMetrics({ cpu: '10', mp: 101, t: { zero: 0 } }, 'zero').temperature, 0);
  assert.equal(beszelMetrics({ cpu: '10', mp: 101 }).cpu, null);
  assert.equal(beszelMetrics({ cpu: 10, mp: 101 }).ram, null);
});
test('Beszel requires explicit sensor selection rather than choosing a disk temperature', () => {
  const stats = { cpu: 12, mp: 34, t: { cpu: 40, disk: 65 } };
  assert.equal(beszelMetrics(stats).temperature, null);
  assert.equal(beszelMetrics(stats, 'cpu').temperature, 40);
});
test('freshness uses observation time, including after successful refetch of old records', () => {
  const source = createSource('beszel', 'Beszel', true, 180000);
  source.observedAt = 1000;
  assert.equal(snapshot(source, 182000).status, 'stale');
  assert.equal(snapshot(source, 2000).status, 'live');
  source.error = 'Disconnected'; assert.equal(snapshot(source, 2000).status, 'error');
  assert.equal(snapshot({ ...source, error: null, observedAt: 100000 }, 2000).status, 'stale');
});
test('PocketBase timestamps must carry UTC or an explicit offset', () => {
  assert.equal(pocketbaseTimestamp('2026-11-05 12:00:00.000Z'), Date.UTC(2026, 10, 5, 12));
  assert.equal(pocketbaseTimestamp('2026-11-05 12:00:00'), null);
  assert.equal(pocketbaseTimestamp('nonsense'), null);
});
