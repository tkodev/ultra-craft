import { copy } from './constants/copy.mjs';
export const element = (tag, className = '', text) => {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};
export function metricValue(value, suffix) { return typeof value === 'number' && Number.isFinite(value) ? `${value.toFixed(1)}${suffix}` : copy.unavailable; }
export function renderWidget(widget, source) {
  const card = element('article', `metric-card ${widget.kind}`);
  const header = element('header', 'card-header');
  header.append(element('span', 'eyebrow', copy[widget.kind]), element('span', `status ${source?.status ?? 'unconfigured'}`, copy.status[source?.status ?? 'unconfigured']));
  card.append(header, element('h3', '', widget.name));
  const metrics = element('dl', 'metrics');
  let temperature = null;
  if (widget.sensor) temperature = source?.sensors?.[widget.sensor] ?? null;
  else temperature = source?.temperature ?? null;
  for (const [key, value, suffix] of [['cpu', source?.cpu, '%'], ['ram', source?.ram, '%'], ['temperature', temperature, '°C']]) {
    const group = element('div', 'metric');
    group.append(element('dt', '', copy[key]), element('dd', '', metricValue(value, suffix)));
    if (key !== 'temperature') {
      const meter = document.createElement('meter');
      meter.min = 0; meter.max = 100; meter.value = value ?? 0;
      meter.setAttribute('aria-label', copy[key]);
      if (value === null || value === undefined) meter.hidden = true;
      group.append(meter);
    }
    metrics.append(group);
  }
  const age = source?.observedAt ? `${Math.max(0, Math.floor((Date.now() - source.observedAt) / 1000))}${copy.secondsAgo}` : copy.noObservation;
  card.append(metrics, element('p', 'observation', `${copy.age}: ${age}`));
  if (source?.error) card.append(element('p', 'connection-error', source.error));
  return card;
}
