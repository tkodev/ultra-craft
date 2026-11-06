import test from 'node:test';
import assert from 'node:assert/strict';
import { newProfile, exportProfile, validateProfile, loadProfiles, moveWidget } from './profiles.mjs';
const widget = { id: 'widget1', kind: 'truenas', sourceId: 'truenas', name: 'NAS', sensor: '' };
test('profile import strips credentials and export preserves widget order and settings', () => {
  const profile = newProfile('Homelab', [{ ...widget, apiKey: 'secret' }, { ...widget, id: 'widget2', kind: 'beszel', sourceId: 'beszel', sensor: 'cpu' }]);
  profile.token = 'secret';
  const parsed = JSON.parse(exportProfile(profile));
  assert.equal(parsed.token, undefined); assert.equal(parsed.widgets[0].apiKey, undefined);
  assert.equal(parsed.widgets[1].sensor, 'cpu');
  moveWidget(profile, 'widget2', -1); assert.equal(profile.widgets[0].id, 'widget2');
  assert.equal(moveWidget(profile, 'widget2', -1), false);
});
test('rejects native or malformed profiles, duplicate IDs and excessive widgets', () => {
  assert.throws(() => validateProfile({ name: 'native', widgets: [] }));
  assert.throws(() => newProfile('test', [widget, widget]));
  assert.throws(() => newProfile('test', [{ ...widget, sourceId: 'http://internal' }]));
  assert.throws(() => newProfile('test', Array.from({ length: 9 }, (_, i) => ({ ...widget, id: `widget${i}` }))));
  assert.throws(() => loadProfiles({ getItem: () => JSON.stringify([{ ...newProfile('one'), id: 'same' }, { ...newProfile('two'), id: 'same' }]) }));
});
