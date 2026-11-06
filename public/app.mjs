import { mountConnections } from './connections.mjs';
import { copy, widgetTypes } from './constants/copy.mjs';
import { STORAGE_KEY, newProfile, exportProfile, loadProfiles, moveWidget } from './profiles.mjs';
import { element as el, renderWidget } from './widgets.mjs';

const root = document.querySelector('#app');
let profiles, selectedId, widgetId, sources = [], storageError = '', bridgeError = '', device = null, discovering = false, deviceError = '', paired = false, pairing = false, nativeProject = null, deviceCatalog = null, catalogLoading = false;
try { profiles = loadProfiles(localStorage); } catch { storageError = copy.restoreError; }
profiles ??= [newProfile(copy.profileDefault, widgetTypes.map(kind => ({ id: crypto.randomUUID(), kind, sourceId: kind, name: copy[kind], sensor: '' })))];
selectedId = profiles[0].id;
const standalone = location.pathname === '/widget';
const params = new URLSearchParams(location.search);
const standaloneKind = widgetTypes.includes(params.get('source')) ? params.get('source') : 'truenas';
const current = () => profiles.find(profile => profile.id === selectedId);
const selectedWidget = () => current().widgets.find(widget => widget.id === widgetId);
function button(text, onClick, className = '') {
  const node = el('button', className, text); node.type = 'button'; node.addEventListener('click', onClick); return node;
}
function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
    storageError = '';
  } catch { storageError = copy.saveError; }
  document.querySelector('#save-status')?.replaceChildren(document.createTextNode(storageError || copy.saved));
}
function labelInput(text, value, onInput) {
  const label = el('label', 'field', text), input = el('input'); input.value = value; input.maxLength = 100;
  input.addEventListener('change', () => { if (input.value.trim()) onInput(input.value.trim()); else input.value = value; });
  label.append(input); return label;
}
function selectField(text, options, value, onChange) {
  const label = el('label', 'field', text), select = el('select');
  for (const [key, title] of options) { const option = el('option', '', title); option.value = key; select.append(option); }
  select.value = value; select.addEventListener('change', () => onChange(select.value)); label.append(select); return label;
}
function saveAndRender() { persist(); render(); }
function download() {
  const url = URL.createObjectURL(new Blob([exportProfile(current())], { type: 'application/json' }));
  const a = el('a'); a.href = url; a.download = `${current().name.replace(/[^a-zA-Z0-9_-]/g, '-')}.ultracraft.json`; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function renderConnections() {
  const region = document.querySelector('#connections'); if (!region) return;
  region.replaceChildren(el('h2', '', copy.sources));
  for (const kind of widgetTypes) {
    const source = sources.find(item => item.id === kind);
    const row = el('div', 'connection-row'); row.append(el('strong', '', source?.name || copy[kind]), el('span', `status ${source?.status ?? 'unconfigured'}`, copy.status[source?.status ?? 'unconfigured'])); region.append(row);
  }
  region.append(el('p', 'hint', copy.setup));
  const manage = el('a', '', copy.manageConnections); manage.href = '#server-connections'; region.append(manage);
  const deviceSection = el('section', 'device-section');
  deviceSection.append(el('h2', '', copy.corebar));
  const discover = button(discovering ? copy.discovering : copy.discover, async () => {
    discovering = true; deviceError = ''; renderConnections();
    try {
      const response = await fetch('/api/device/discover', { method: 'POST', signal: AbortSignal.timeout(6000) });
      const result = await response.json();
      if (!response.ok || !result.device) throw new Error();
      device = result.device;
    } catch { deviceError = copy.discoveryFailed; }
    finally { discovering = false; renderConnections(); }
  });
  discover.disabled = discovering || pairing;
  deviceSection.append(discover, el('p', 'hint', device ? `${device.version} · ${device.host} · ${paired ? copy.paired : copy.deviceUnpaired}` : copy.deviceIdle));
  if (device && !paired) {
    const pair = button(pairing ? copy.pairing : copy.pair, async () => {
      pairing = true; deviceError = ''; renderConnections();
      try {
        const response = await fetch('/api/device/pair', { method: 'POST', signal: AbortSignal.timeout(20000) });
        const result = await response.json();
        if (!response.ok || !result.paired) throw new Error();
        paired = true;
      } catch { deviceError = copy.pairFailed; }
      finally { pairing = false; renderConnections(); }
    });
    pair.disabled = pairing; deviceSection.append(pair);
  }
  if (paired) deviceSection.append(button(copy.readCatalog, () => readDeviceCatalog(null)));
  if (deviceError) deviceSection.append(el('p', 'error', deviceError));
  region.append(deviceSection);
}
function renderCanvas() {
  const canvas = document.querySelector('#canvas'); if (!canvas) return;
  const focusedWidget = canvas.contains(document.activeElement) ? document.activeElement?.dataset.widgetId : null;
  canvas.replaceChildren();
  if (!current().widgets.length) canvas.append(el('p', 'empty', copy.empty));
  for (const widget of current().widgets) {
    const wrapper = el('div', `widget-slot${widget.id === widgetId ? ' selected' : ''}`);
    const choose = button(widget.name, () => { widgetId = widget.id; render(); document.querySelector(`[data-widget-id="${widget.id}"]`)?.focus(); }, 'widget-select');
    choose.dataset.widgetId = widget.id;
    choose.setAttribute('aria-pressed', String(widget.id === widgetId));
    wrapper.append(choose, renderWidget(widget, sources.find(source => source.id === widget.sourceId))); canvas.append(wrapper);
    if (widget.id === focusedWidget) choose.focus();
  }
}
function renderSettings() {
  const settings = document.querySelector('#settings'); if (!settings) return;
  const widget = selectedWidget(); settings.replaceChildren(el('h2', '', copy.settings));
  if (!widget) { settings.append(el('p', 'hint', copy.noSelection)); return; }
  settings.append(labelInput(copy.label, widget.name, value => { widget.name = value; saveAndRender(); }));
  settings.append(selectField(copy.source, widgetTypes.map(kind => [kind, copy[kind]]), widget.sourceId, value => { widget.sourceId = value; widget.sensor = ''; saveAndRender(); }));
  const source = sources.find(item => item.id === widget.sourceId);
  const sensors = [['', widget.sourceId === 'truenas' ? copy.automatic : copy.selectSensor], ...Object.keys(source?.sensors ?? {}).map(key => [key, key])];
  if (widget.sensor && !sensors.some(([key]) => key === widget.sensor)) sensors.push([widget.sensor, widget.sensor]);
  settings.append(selectField(copy.sensor, sensors, widget.sensor, value => { widget.sensor = value; saveAndRender(); }));
  const controls = el('div', 'button-row');
  for (const [delta, text] of [[-1, copy.left], [1, copy.right]]) {
    const move = button(text, () => { moveWidget(current(), widget.id, delta); saveAndRender(); });
    const index = current().widgets.indexOf(widget); move.disabled = index + delta < 0 || index + delta >= current().widgets.length; controls.append(move);
  }
  settings.append(controls, button(copy.remove, () => { current().widgets = current().widgets.filter(item => item.id !== widget.id); widgetId = null; saveAndRender(); }, 'danger'));
}

async function readDeviceCatalog(parent) {
  catalogLoading = true; deviceError = ''; renderDeviceCatalog();
  try {
    const query = parent === null ? '' : `?parent=${encodeURIComponent(parent)}`;
    const response = await fetch(`/api/device/catalog${query}`, { signal: AbortSignal.timeout(20000) });
    if (!response.ok) throw new Error();
    deviceCatalog = await response.json();
  } catch { deviceError = copy.catalogFailed; }
  finally { catalogLoading = false; renderDeviceCatalog(); }
}
function renderDeviceCatalog() {
  const section = document.querySelector('#device-catalog'); if (!section) return;
  section.replaceChildren(el('h2', '', copy.catalogTitle));
  if (catalogLoading) section.append(el('p', 'hint', copy.catalogReading));
  if (deviceError === copy.catalogFailed) section.append(el('p', 'error', deviceError));
  if (!deviceCatalog?.items) return;
  section.append(button(copy.catalogRoot, () => readDeviceCatalog(null)));
  const list = el('ul', 'native-widgets');
  for (const item of deviceCatalog.items) {
    const row = el('li');
    if (item.leaf) row.append(el('span', '', item.name), el('span', 'hint', item.type ? ` · ${item.type}` : ''));
    else row.append(button(item.name, () => readDeviceCatalog(item.id)));
    list.append(row);
  }
  section.append(list);
}
async function editNative(url, input) {
  try {
    const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) });
    if (!response.ok) throw new Error();
    nativeProject = await response.json(); renderNativeProject();
  } catch { bridgeError = copy.nativeFailed; render(); }
}
function renderNativeProject() {
  const section = document.querySelector('#native-project'); if (!section) return;
  section.replaceChildren(el('h2', '', copy.nativeProject), el('p', 'hint', copy.nativeNote));
  if (!nativeProject?.profiles) { section.append(el('p', 'hint', copy.nativeUnconfigured)); return; }
  for (const profile of nativeProject.profiles) {
    const row = el('div', 'native-profile');
    const preferred = button(profile.preferred ? copy.defaultProfile : copy.makeDefault, () => editNative('/api/native-project/default', { id: profile.id }));
    preferred.disabled = profile.preferred; row.append(preferred);
    row.append(labelInput(copy.rename, profile.name, async name => {
      try {
        const response = await fetch('/api/native-project/rename', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: profile.id, name }) });
        if (!response.ok) throw new Error();
        nativeProject = await response.json(); renderNativeProject();
      } catch { bridgeError = copy.nativeFailed; render(); }
    }));
    const list = el('ul', 'native-widgets');
    for (const [index, widget] of profile.widgets.entries()) {
      const item = el('li', 'native-widget');
      item.append(labelInput(copy.nativeWidgetName, widget.name, name => editNative('/api/native-project/widget-name', { id: widget.id, name })));
      item.append(el('span', 'hint', widget.nativeType || widget.kind));
      const controls = el('div', 'button-row');
      for (const [delta, text] of [[-1, copy.left], [1, copy.right]]) {
        const move = button(text, () => {
          const ids = profile.widgets.map(item => item.id);
          [ids[index], ids[index + delta]] = [ids[index + delta], ids[index]];
          editNative('/api/native-project/reorder', { profileId: profile.id, ids });
        });
        move.disabled = index + delta < 0 || index + delta >= profile.widgets.length; controls.append(move);
      }
      item.append(controls); list.append(item);
    }
    row.append(list); section.append(row);
  }
  section.append(button(copy.nativeNewProfile, () => editNative('/api/native-project/create', { name: copy.newName })));
  const download = el('a', '', copy.nativeExport); download.href = '/api/native-project/export'; download.download = 'Ultra-Craft.umpf'; section.append(download);
}

function renderStandalone() {
  root.replaceChildren(); const main = el('main', 'standalone'); main.append(el('h1', 'visually-hidden', `${copy[standaloneKind]} ${copy.standalone}`));
  main.append(renderWidget({ kind: standaloneKind, sourceId: standaloneKind, name: params.get('name')?.slice(0, 100) || copy[standaloneKind], sensor: params.get('sensor') ?? '' }, sources.find(source => source.id === standaloneKind)));
  const back = el('a', 'back-link', copy.back); back.href = '/'; main.append(back); root.append(main);
}
function render() {
  if (standalone) return renderStandalone();
  const preservedConnections = document.querySelector('#server-connections');
  root.replaceChildren();
  const skip = el('a', 'skip-link', copy.skip); skip.href = '#workspace'; root.append(skip);
  const header = el('header', 'app-header'), brand = el('div', 'brand'); brand.append(el('strong', '', copy.title), el('span', '', copy.tagline));
  const actions = el('div', 'button-row');
  const file = el('input', 'visually-hidden'); file.type = 'file'; file.accept = '.json'; file.setAttribute('aria-label', copy.import);
  file.addEventListener('change', async () => {
    try {
      if (profiles.length >= 50 || file.files[0].size > 100000) throw new Error();
      const data = JSON.parse(await file.files[0].text());
      const profile = newProfile(data.name, data.widgets);
      if (data.format !== 'ultra-craft' || data.version !== 1) throw new Error();
      profiles.push(profile); selectedId = profile.id; widgetId = null; saveAndRender();
    } catch { bridgeError = copy.importError; render(); }
  });
  actions.append(button(copy.import, () => file.click()), button(copy.export, download, 'primary'), file); header.append(brand, actions); root.append(header);
  const layout = el('div', 'app-layout'), sidebar = el('aside', 'sidebar'); sidebar.append(el('h2', '', copy.profiles));
  const nav = el('nav'); nav.setAttribute('aria-label', copy.profiles);
  for (const profile of profiles) {
    const select = button(profile.name, () => { selectedId = profile.id; widgetId = null; render(); }, `profile-link${profile.id === selectedId ? ' active' : ''}`);
    if (profile.id === selectedId) select.setAttribute('aria-current', 'true'); nav.append(select);
  }
  sidebar.append(nav, button(`+ ${copy.newProfile}`, () => {
    if (profiles.length >= 50) return;
    const profile = newProfile(copy.newName); profiles.push(profile); selectedId = profile.id; widgetId = null; saveAndRender();
  }));
  const connections = el('section', 'connections'); connections.id = 'connections'; sidebar.append(connections);
  const main = el('main', 'workspace'); main.id = 'workspace';
  const intro = el('section', 'intro'); intro.append(el('p', 'eyebrow', copy.welcome), el('h1', '', current().name), el('p', 'hint', copy.subtitle)); main.append(intro);
  const toolbar = el('div', 'profile-toolbar'); toolbar.append(labelInput(copy.rename, current().name, value => { current().name = value; saveAndRender(); }), button(copy.duplicate, () => {
    if (profiles.length >= 50) return;
    const profile = newProfile(`${current().name.slice(0, 90)}${copy.copySuffix}`, current().widgets.map(widget => ({ ...widget, id: crypto.randomUUID() })));
    profiles.push(profile); selectedId = profile.id; widgetId = null; saveAndRender();
  }), button(copy.delete, () => {
    if (profiles.length === 1) { bridgeError = copy.deleteLast; return render(); }
    profiles = profiles.filter(profile => profile.id !== selectedId); selectedId = profiles[0].id; widgetId = null; saveAndRender();
  }, 'danger')); main.append(toolbar);
  const status = el('p', 'save-status', storageError || copy.saved); status.id = 'save-status'; status.setAttribute('role', 'status'); main.append(status);
  const error = el('p', 'error', bridgeError); error.id = 'bridge-error'; error.setAttribute('role', 'status'); main.append(error);
  const previewHeader = el('div', 'section-heading'); previewHeader.append(el('h2', '', copy.canvas), el('span', 'hint', copy.canvasNote)); main.append(previewHeader);
  const canvas = el('section', 'canvas'); canvas.id = 'canvas'; canvas.setAttribute('aria-label', copy.canvas); main.append(canvas);
  const panels = el('div', 'panels'), library = el('section', 'panel library'); library.append(el('h2', '', copy.library));
  for (const kind of widgetTypes) {
    const row = el('div', 'library-item'); row.append(el('strong', '', copy[kind]), el('p', 'hint', `${copy.cpu} · ${copy.ram} · ${copy.temperature}`));
    const add = button(copy.add, () => { const widget = { id: crypto.randomUUID(), kind, sourceId: kind, name: copy[kind], sensor: '' }; current().widgets.push(widget); widgetId = widget.id; saveAndRender(); });
    add.disabled = current().widgets.length >= 8;
    const link = el('a', '', copy.preview); link.href = `/widget?source=${kind}`; row.append(add, link); library.append(row);
  }
  const settings = el('section', 'panel'); settings.id = 'settings'; panels.append(library, settings); main.append(panels);
  const serverConnections = preservedConnections || el('section', 'server-connections'); serverConnections.id = 'server-connections'; main.append(serverConnections); if (!preservedConnections) mountConnections(serverConnections);
  const catalogSection = el('section', 'panel'); catalogSection.id = 'device-catalog'; main.append(catalogSection);
  const nativeSection = el('section', 'panel'); nativeSection.id = 'native-project'; main.append(nativeSection);
  const deploy = el('section', 'deployment'); const deployButton = button(copy.deploy, () => {}); deployButton.disabled = true;
  deploy.append(deployButton, el('p', 'hint', copy.deployNote)); main.append(deploy); layout.append(sidebar, main); root.append(layout);
  renderConnections(); renderCanvas(); renderSettings(); renderNativeProject(); renderDeviceCatalog();
}
async function refresh() {
  try {
    const response = await fetch('/api/metrics', { signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error();
    const data = await response.json();
    if (!Array.isArray(data.sources)) throw new Error();
    sources = data.sources;
    if (bridgeError === copy.loadError) bridgeError = '';
  } catch {
    bridgeError = copy.loadError;
    sources = sources.map(source => ({ ...source, status: 'error', error: copy.loadError }));
  }
  try {
    const statusResponse = await fetch('/api/device/status', { signal: AbortSignal.timeout(3000) });
    if (statusResponse.ok) paired = Boolean((await statusResponse.json()).paired);
  } catch { /* Telemetry remains usable when local pairing state cannot be read. */ }
  if (standalone) renderStandalone();
  else {
    renderConnections(); renderCanvas();
    // Keep controls stable while a user is editing them.
    if (!document.querySelector('#settings')?.contains(document.activeElement)) renderSettings();
    const error = document.querySelector('#bridge-error'); if (error) error.textContent = bridgeError;
  }
  setTimeout(refresh, 5000);
}
render(); refresh();
if (!standalone) fetch('/api/native-project').then(response => { if (!response.ok) throw new Error(); return response.json(); }).then(data => { nativeProject = data; renderNativeProject(); }).catch(() => { /* Keep the telemetry workspace usable without a native file. */ });
