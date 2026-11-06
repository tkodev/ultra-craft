import { beszelMetrics, truenasMetrics, pocketbaseTimestamp } from '../shared/metrics.mjs';

export function createSource(id, name, configured, staleAfterMs) {
  return { id, kind: id, name, configured, staleAfterMs, observedAt: null, error: null,
    metrics: { cpu: null, ram: null, temperature: null, sensors: {} } };
}

export function startTrueNAS(source, config, { WebSocketClass = WebSocket, retryMs = 5000, timeoutMs = 12000 } = {}) {
  let socket, retry, timeout, stopped = false;
  const collection = 'reporting.realtime:{"interval":2}';
  function connect() {
    if (stopped) return;
    let stage = 'auth';
    const fail = (message) => {
      if (stopped) return;
      source.error = message;
      clearTimeout(timeout);
      socket?.close();
    };
    try {
      socket = new WebSocketClass(config.url);
      timeout = setTimeout(() => fail('TrueNAS timed out. Check endpoint, certificate, and permissions.'), timeoutMs);
      socket.addEventListener('open', () => socket.send(JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'auth.login_with_api_key', params: [config.key] })));
      socket.addEventListener('message', (event) => {
        if (stopped) return;
        try {
          const message = JSON.parse(event.data);
          if (message.id === 1) {
            if (message.error || message.result !== true) return fail('TrueNAS authentication failed. Check your API key.');
            stage = 'subscribe';
            socket.send(JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'core.subscribe', params: [collection] }));
          } else if (message.id === 2) {
            if (message.error || typeof message.result !== 'string') return fail('TrueNAS denied the telemetry subscription.');
            stage = 'stream';
          } else if (message.method === 'notify_unsubscribed') {
            return fail('TrueNAS ended the telemetry subscription.');
          } else if (message.method === 'collection_update' && stage === 'stream'
            && (message.params?.collection === collection || message.params?.collection === 'reporting.realtime')) {
            source.metrics = truenasMetrics(message.params.fields, config.sensor);
            source.observedAt = Date.now();
            source.error = null;
            clearTimeout(timeout);
          }
        } catch { fail('TrueNAS returned an invalid telemetry message.'); }
      });
      socket.addEventListener('error', () => fail('Cannot connect to TrueNAS. Check endpoint and TLS trust.'));
      socket.addEventListener('close', () => {
        clearTimeout(timeout);
        if (!stopped) {
          source.error ||= 'TrueNAS disconnected. Reconnecting…';
          retry = setTimeout(connect, retryMs);
        }
      });
    } catch {
      source.error = 'Cannot open the TrueNAS connection.';
      clearTimeout(timeout);
      retry = setTimeout(connect, retryMs);
    }
  }
  if (source.configured) connect();
  return () => { stopped = true; clearTimeout(retry); clearTimeout(timeout); socket?.close(); };
}

export function createBeszelPoller(source, config, { fetchImpl = fetch, now = Date.now } = {}) {
  let pending, lastAttempt = -Infinity;
  async function poll() {
    if (!source.configured) return;
    if (pending) return pending;
    if (now() - lastAttempt < 5000) return;
    lastAttempt = now();
    pending = (async () => {
      try {
        const url = new URL(`${config.url.replace(/\/$/, '')}/api/collections/system_stats/records`);
        url.search = new URLSearchParams({ filter: `system="${config.systemId}" && type="1m"`, sort: '-created', perPage: '1', fields: 'created,stats' });
        const response = await fetchImpl(url, { headers: { Authorization: config.token }, redirect: 'error', signal: AbortSignal.timeout(10000) });
        if (!response.ok) throw new Error(response.status === 401 || response.status === 403 ? 'Beszel authentication expired or access was denied.' : 'Beszel request failed.');
        const body = await response.json();
        const item = body.items?.[0];
        if (!item) throw new Error('No Beszel records found for this system.');
        const observedAt = pocketbaseTimestamp(item.created);
        if (observedAt === null) throw new Error('Beszel returned an invalid observation timestamp.');
        const metrics = beszelMetrics(item.stats, config.sensor);
        source.metrics = metrics;
        source.observedAt = observedAt;
        source.error = null;
      } catch (error) {
        // Never forward upstream response bodies, URLs, or tokens to the browser.
        source.error = error.message.startsWith('Beszel ') || error.message.startsWith('No Beszel') ? error.message : 'Cannot read Beszel telemetry. Check connection and TLS trust.';
      }
    })().finally(() => { pending = null; });
    return pending;
  }
  return poll;
}
