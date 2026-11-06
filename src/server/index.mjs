import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { readConfig } from './config.mjs';
import { discoverCorebar } from './corebar.mjs';
import { createCorebarManager } from './corebar-manager.mjs';
import { createNativeProject } from './native-project.mjs';
import { createHash } from 'node:crypto';
import { createConnections, loadSavedConnections } from './connections.mjs';

const publicRoot = fileURLToPath(new URL('../../public/', import.meta.url));
const assets = new Map([
  ['/', ['index.html', 'text/html']], ['/app.mjs', ['app.mjs', 'text/javascript']],
  ['/styles.css', ['styles.css', 'text/css']], ['/constants/copy.mjs', ['constants/copy.mjs', 'text/javascript']],
  ['/connections.mjs', ['connections.mjs', 'text/javascript']],
  ['/profiles.mjs', ['profiles.mjs', 'text/javascript']], ['/widgets.mjs', ['widgets.mjs', 'text/javascript']],
]);

export function createApp(config, dependencies = {}) {
  const connections = createConnections(config, dependencies);
  const corebar = dependencies.corebarManager ?? createCorebarManager(config.corebarHost);
  const nativeKey = createHash('sha256').update(config.nativeProjectFile || '').digest('hex').slice(0, 16);
  const nativeProject = dependencies.nativeProject ?? createNativeProject(config.nativeProjectFile, fileURLToPath(new URL(`../../artifacts/native-editor-${nativeKey}.umpf`, import.meta.url)));
  const server = createServer(async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Security-Policy', "default-src 'self'; style-src 'self'; script-src 'self'; connect-src 'self'; img-src 'self' blob:; object-src 'none'; base-uri 'none'; frame-ancestors 'self'");
    const host = req.headers.host ?? '';
    if (!/^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(host)) { res.writeHead(403); return res.end('Local access only'); }
    if (req.headers['sec-fetch-site'] === 'cross-site') { res.writeHead(403); return res.end('Local access only'); }
    let pathname;
    try { pathname = new URL(req.url, 'http://localhost').pathname; } catch { res.writeHead(400); return res.end(); }
    if (pathname.startsWith('/api/connections')) {
      res.setHeader('Content-Type', 'application/json');
      if (req.headers.origin && req.headers.origin !== `http://${host}`) { res.writeHead(403); return res.end(); }
      try {
        if (pathname === '/api/connections' && req.method === 'GET') return res.end(JSON.stringify(connections.settings()));
        if (pathname === '/api/connections/beszel/systems' && req.method === 'GET') return res.end(JSON.stringify({ systems: await connections.beszelSystems() }));
        if (req.method !== 'POST' || !['/api/connections/truenas','/api/connections/beszel','/api/connections/beszel/login'].includes(pathname)) { res.writeHead(405); return res.end(); }
        const chunks = []; let size = 0;
        for await (const chunk of req) { size += chunk.length; if (size > 32000) throw new Error(); chunks.push(chunk); }
        const input = JSON.parse(Buffer.concat(chunks).toString('utf8'));
        const result = pathname.endsWith('/login') ? await connections.loginBeszel(input) : await connections.update(pathname.split('/').at(-1), input);
        return res.end(JSON.stringify(result));
      } catch { res.writeHead(400); return res.end(JSON.stringify({ error: 'Cannot save or verify this connection. Check its address, credentials, and TLS trust.' })); }
    }
    if (pathname.startsWith('/api/native-project')) {
      if (req.headers.origin && req.headers.origin !== `http://${host}`) { res.writeHead(403); return res.end(); }
      try {
        if (pathname === '/api/native-project' && req.method === 'GET') {
          res.setHeader('Content-Type', 'application/json');
          return res.end(JSON.stringify(config.nativeProjectFile ? await nativeProject.summary() : { configured: false }));
        }
        if (pathname === '/api/native-project/export' && req.method === 'GET') {
          const bytes = await nativeProject.export();
          res.writeHead(200, { 'Content-Type': 'application/octet-stream', 'Content-Disposition': 'attachment; filename="Ultra-Craft.umpf"' });
          return res.end(bytes);
        }
        if (['/api/native-project/rename', '/api/native-project/reorder', '/api/native-project/widget-name', '/api/native-project/create', '/api/native-project/default'].includes(pathname) && req.method === 'POST') {
          const chunks = []; let size = 0;
          for await (const chunk of req) { size += chunk.length; if (size > 10000) throw new Error('Request too large'); chunks.push(chunk); }
          const input = JSON.parse(Buffer.concat(chunks).toString('utf8'));
          const summary = pathname.endsWith('/create') ? await nativeProject.create(input.name)
            : pathname.endsWith('/default') ? await nativeProject.setDefault(input.id)
            : pathname.endsWith('/reorder') ? await nativeProject.reorder(input.profileId, input.ids)
            : pathname.endsWith('/widget-name') ? await nativeProject.renameWidget(input.id, input.name)
            : await nativeProject.rename(input.id, input.name);
          res.setHeader('Content-Type', 'application/json'); return res.end(JSON.stringify(summary));
        }
        res.writeHead(405); return res.end();
      } catch { res.writeHead(400, { 'Content-Type': 'application/json' }); return res.end(JSON.stringify({ error: 'Cannot read or edit the configured native project copy' })); }
    }
    if (pathname === '/api/device/status' && req.method === 'GET') {
      res.setHeader('Content-Type', 'application/json');
      try { return res.end(JSON.stringify(await corebar.status())); }
      catch { res.writeHead(500); return res.end(JSON.stringify({ error: 'Cannot read local CoreBAR state' })); }
    }
    if (pathname === '/api/device/catalog' && req.method === 'GET') {
      res.setHeader('Content-Type', 'application/json');
      try {
        const parent = new URL(req.url, 'http://localhost').searchParams.get('parent');
        return res.end(JSON.stringify({ items: await corebar.catalog(parent) }));
      } catch { res.writeHead(502); return res.end(JSON.stringify({ error: 'Cannot read the paired CoreBAR widget catalog' })); }
    }
    if (pathname === '/api/device/pair' && req.method === 'POST') {
      const origin = req.headers.origin;
      if (origin && origin !== `http://${host}`) { res.writeHead(403); return res.end(); }
      res.setHeader('Content-Type', 'application/json');
      try { return res.end(JSON.stringify(await corebar.pair())); }
      catch { res.writeHead(502); return res.end(JSON.stringify({ error: 'Pairing failed. Confirm on CoreBAR within ten seconds and check its connection.' })); }
    }
    if (pathname === '/api/device/discover' && req.method === 'POST') {
      const origin = req.headers.origin;
      if (origin && origin !== `http://${host}`) { res.writeHead(403); return res.end(); }
      res.setHeader('Content-Type', 'application/json');
      if (!config.corebarHost) { res.writeHead(400); return res.end(JSON.stringify({ error: 'Set COREBAR_HOST in .env and restart the bridge.' })); }
      try {
        const { serialNo, ...device } = await (dependencies.discoverCorebar ?? discoverCorebar)(config.corebarHost);
        return res.end(JSON.stringify({ device, paired: false }));
      } catch { res.writeHead(502); return res.end(JSON.stringify({ error: 'CoreBAR did not answer directed discovery. Check its address and network.' })); }
    }
    if (req.method !== 'GET') { res.writeHead(405, { Allow: pathname === '/api/device/discover' ? 'POST' : 'GET' }); return res.end(); }
    if (pathname === '/api/metrics') {
      const sources = await connections.metrics();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ sources }));
    }
    const asset = assets.get(pathname) ?? (pathname === '/widget' ? assets.get('/') : null);
    if (!asset) { res.writeHead(404); return res.end('Not found'); }
    try { res.writeHead(200, { 'Content-Type': `${asset[1]}; charset=utf-8` }); res.end(await readFile(resolve(publicRoot, asset[0]))); }
    catch { res.destroy(); }
  });
  server.on('close', () => connections.close());
  return server;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const config = await loadSavedConnections(readConfig());
  const server = createApp(config);
  server.listen(config.port, '127.0.0.1', () => console.log(`Ultra Craft: http://127.0.0.1:${server.address().port}`));
  for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => server.close());
}
