export function finite(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function percent(value) {
  const n = finite(value);
  return n !== null && n >= 0 && n <= 100 ? n : null;
}

export function memoryPercent(total, available) {
  if (finite(total) === null || total <= 0 || finite(available) === null || available < 0 || available > total) return null;
  return (1 - available / total) * 100;
}

export function truenasMetrics(fields, sensor = '') {
  if (!fields || typeof fields !== 'object' || Array.isArray(fields)) throw new Error('Invalid TrueNAS event');
  const cpu = fields.cpu ?? {};
  const sensors = Object.fromEntries(Object.entries(cpu)
    .filter(([, core]) => finite(core?.temp) !== null)
    .map(([key, core]) => [key, core.temp]));
  const temperatures = Object.values(sensors);
  return {
    cpu: percent(cpu.cpu?.usage),
    ram: memoryPercent(fields.memory?.physical_memory_total, fields.memory?.physical_memory_available),
    temperature: sensor ? (sensors[sensor] ?? null) : (temperatures.length ? Math.max(...temperatures) : null),
    sensors,
  };
}

export function beszelMetrics(stats, sensor = '') {
  if (!stats || typeof stats !== 'object' || Array.isArray(stats)) throw new Error('Invalid Beszel stats');
  const sensors = Object.fromEntries(Object.entries(stats.t ?? {}).filter(([, value]) => finite(value) !== null));
  return { cpu: percent(stats.cpu), ram: percent(stats.mp), temperature: sensor ? (sensors[sensor] ?? null) : null, sensors };
}

export function pocketbaseTimestamp(value) {
  if (typeof value !== 'string') return null;
  const normalized = value.replace(' ', 'T');
  // PocketBase timestamps are UTC; reject ambiguous zone-less input.
  if (!/(Z|[+-]\d{2}:?\d{2})$/.test(normalized)) return null;
  const timestamp = Date.parse(normalized);
  return Number.isFinite(timestamp) ? timestamp : null;
}

export function snapshot(source, now = Date.now()) {
  const age = source.observedAt === null ? null : now - source.observedAt;
  const status = !source.configured ? 'unconfigured' : source.error ? 'error'
    : age === null ? 'waiting' : age < -5000 || age > source.staleAfterMs ? 'stale' : 'live';
  return { id: source.id, name: source.name, kind: source.kind, status, error: source.error,
    observedAt: source.observedAt, staleAfterMs: source.staleAfterMs, ...source.metrics };
}
