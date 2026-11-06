export const STORAGE_KEY = 'ultra-craft.profiles.v1';
const text = value => typeof value === 'string' && value.trim().length > 0 && value.length <= 100;
const id = value => typeof value === 'string' && /^[a-zA-Z0-9_-]{1,80}$/.test(value);
export function validateProfile(input) {
  if (!input || input.format !== 'ultra-craft' || input.version !== 1 || !text(input.name) || !Array.isArray(input.widgets) || input.widgets.length > 8) throw new Error('Invalid profile');
  const ids = new Set();
  const widgets = input.widgets.map(widget => {
    if (!widget || !id(widget.id) || ids.has(widget.id) || !['truenas', 'beszel'].includes(widget.kind)
      || !['truenas', 'beszel'].includes(widget.sourceId) || !text(widget.name)
      || typeof widget.sensor !== 'string' || widget.sensor.length > 200) throw new Error('Invalid widget');
    ids.add(widget.id);
    return { id: widget.id, kind: widget.kind, sourceId: widget.sourceId, name: widget.name, sensor: widget.sensor };
  });
  // Explicit fields keep imported credentials and unknown metadata out of storage and export.
  return { format: 'ultra-craft', version: 1, name: input.name.trim(), widgets };
}
export function newProfile(name, widgets = []) {
  return { id: crypto.randomUUID(), ...validateProfile({ format: 'ultra-craft', version: 1, name, widgets }) };
}
export function exportProfile(profile) { return JSON.stringify(validateProfile(profile), null, 2); }
export function loadProfiles(storage) {
  const raw = storage.getItem(STORAGE_KEY);
  if (!raw) return null;
  const data = JSON.parse(raw);
  if (!Array.isArray(data) || data.length < 1 || data.length > 50) throw new Error('Invalid profiles');
  const ids = new Set();
  return data.map(profile => {
    if (!id(profile.id) || ids.has(profile.id)) throw new Error('Invalid profile ID');
    ids.add(profile.id);
    return { id: profile.id, ...validateProfile(profile) };
  });
}
export function moveWidget(profile, widgetId, delta) {
  const index = profile.widgets.findIndex(widget => widget.id === widgetId);
  const target = index + delta;
  if (index < 0 || target < 0 || target >= profile.widgets.length || ![-1, 1].includes(delta)) return false;
  [profile.widgets[index], profile.widgets[target]] = [profile.widgets[target], profile.widgets[index]];
  return true;
}
