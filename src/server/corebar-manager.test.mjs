import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createCorebarManager } from './corebar-manager.mjs';

test('pairing persists private credentials atomically and exposes only public state', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'ultra-pair-')); t.after(() => rm(directory, { recursive: true, force: true }));
  const file = join(directory, 'pairing.json'); let calls = 0, closed = false;
  const manager = createCorebarManager('192.0.2.1', { stateFile: file,
    discover: async () => ({ serialNo: 'fixture-serial', version: '1.0.9(9)', advertisedTcpPort: 7431 }),
    connect: async (_host, options) => { assert.equal(options.port, 7431); return {
      pair: async (id, name) => { calls++; assert.ok(id); assert.equal(name, 'Ultra Craft'); return 'fixture-private-token'; },
      close: () => { closed = true; },
    }; },
  });
  assert.equal((await manager.status()).paired, false);
  const results = await Promise.all([manager.pair(), manager.pair()]);
  assert.equal(calls, 1); assert.equal(closed, true);
  assert.equal(results[0].paired, true); assert.ok(!JSON.stringify(results).includes('fixture-private-token'));
  const saved = JSON.parse(await readFile(file, 'utf8')); assert.equal(saved.token, 'fixture-private-token');
  assert.equal((await stat(file)).mode & 0o777, 0o600);
  assert.equal((await manager.status()).paired, true);
  assert.ok(!JSON.stringify(await manager.status()).includes('fixture-private-token'));
});
test('pairing denial never writes credentials or marks the device paired', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'ultra-pair-')); t.after(() => rm(directory, { recursive: true, force: true }));
  let closed = false;
  const manager = createCorebarManager('192.0.2.1', { stateFile: join(directory, 'pairing.json'),
    discover: async () => ({ serialNo: 'fixture', advertisedTcpPort: 7431 }),
    connect: async () => ({ pair: async () => { throw new Error('Denied'); }, close: () => { closed = true; } }),
  });
  await assert.rejects(manager.pair(), /Denied/); assert.equal(closed, true); assert.equal((await manager.status()).paired, false);
});

test('catalog reads authenticate the matching paired device and omit private catalog fields', async t => {
  const { writeFile } = await import('node:fs/promises');
  const directory=await mkdtemp(join(tmpdir(),'ultra-catalog-'));t.after(()=>rm(directory,{recursive:true,force:true}));
  const stateFile=join(directory,'state.json');await writeFile(stateFile,JSON.stringify({host:'192.0.2.1',serialNo:'device1',clientId:'client',token:'private-token'}));
  let closed=false;
  const manager=createCorebarManager('192.0.2.1',{stateFile,
    discover:async()=>({serialNo:'device1',advertisedTcpPort:7431}),
    connect:async()=>({authenticate:async token=>assert.equal(token,'private-token'),request:async(act,parent)=>{
      assert.equal(act,1002);assert.equal(parent,'sys.widget.apps');
      return {data:[{id:'app.one',name:'Example app',type:'APPS',last:true,param:{token:'private-extra'}}]};
    },close:()=>{closed=true;}}),
  });
  assert.deepEqual(await manager.catalog('sys.widget.apps'),[{id:'app.one',name:'Example app',type:'APPS',leaf:true}]);assert.equal(closed,true);
  let connected=false;
  const changed=createCorebarManager('192.0.2.1',{stateFile,discover:async()=>({serialNo:'different'}),connect:async()=>{connected=true;}});
  await assert.rejects(changed.catalog(),/identity changed/);assert.equal(connected,false);
});
