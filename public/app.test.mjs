import test from 'node:test';
import assert from 'node:assert/strict';
import { Window } from 'happy-dom';
import { copy } from './constants/copy.mjs';
import { STORAGE_KEY } from './profiles.mjs';

test('workspace edits and persists profiles, orders widgets, safely renders labels, and opens standalone widget state', async t => {
  const original = Object.fromEntries(['document', 'location', 'localStorage', 'fetch', 'setTimeout'].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  t.after(() => { for (const [key, descriptor] of Object.entries(original)) { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key]; } });
  const window = new Window({ url: 'http://localhost:3140' });
  window.document.body.innerHTML = '<div id="app"></div>';
  for (const key of ['document', 'location', 'localStorage']) Object.defineProperty(globalThis, key, { configurable: true, value: window[key] });
  globalThis.setTimeout = () => 0;
  globalThis.fetch = async url => url === '/api/connections' ? new Response(JSON.stringify({ truenas: { url: '', name: 'TrueNAS' }, beszel: { url: '', name: 'Beszel' } })) : new Response(JSON.stringify({ sources: [
    { id: 'truenas', name: 'NAS', status: 'live', cpu: 12, ram: 25, temperature: 48, sensors: { cpu0: 48 }, observedAt: Date.now() },
    { id: 'beszel', name: 'Host', status: 'unconfigured', cpu: null, ram: null, temperature: null, sensors: {}, observedAt: null },
  ] }));
  await import('./app.mjs?workspace-test');
  await new Promise(resolve => setImmediate(resolve));
  const document = window.document;
  const click = text => { const button = [...document.querySelectorAll('button')].find(node => node.textContent === text); assert.ok(button, text); button.click(); };
  assert.equal(document.querySelectorAll('.metric-card').length, 2);
  assert.match(document.querySelector('.metric-card').textContent, /12.0%/);
  assert.match(document.querySelector('.metric-card.beszel').textContent, /Unavailable/);
  click('TrueNAS');
  const nameInput = document.querySelector('#settings input');
  nameInput.value = '<img src=x onerror=alert(1)>';
  nameInput.dispatchEvent(new window.Event('change'));
  assert.equal(document.querySelector('.metric-card h3').textContent, '<img src=x onerror=alert(1)>');
  assert.equal(document.querySelector('img'), null);
  click(copy.right);
  assert.equal(JSON.parse(window.localStorage.getItem(STORAGE_KEY))[0].widgets[1].name, '<img src=x onerror=alert(1)>');
  click(copy.duplicate);
  assert.equal(document.querySelectorAll('.profile-link').length, 2);
  click(copy.delete);
  assert.equal(document.querySelectorAll('.profile-link').length, 1);
  click(`+ ${copy.newProfile}`);
  assert.match(document.querySelector('#canvas').textContent, /Add a widget/);
  click(copy.add);
  assert.equal(document.querySelectorAll('.metric-card').length, 1);
  assert.ok(document.querySelector('.deployment button').disabled);
  window.location.href = 'http://localhost:3140/widget?source=truenas&sensor=cpu0';
  await import('./app.mjs?standalone-test');
  await new Promise(resolve => setImmediate(resolve));
  assert.ok(document.querySelector('main.standalone'));
  assert.match(document.querySelector('.metric-card').textContent, /48.0°C/);
});
