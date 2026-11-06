import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createConnections, loadSavedConnections } from './connections.mjs';
import { readConfig } from './config.mjs';

test('Beszel login saves only the returned token, lists permitted systems and activates telemetry without a restart', async t => {
  const directory=await mkdtemp(join(tmpdir(),'ultra-connect-'));t.after(()=>rm(directory,{recursive:true,force:true}));
  const stateFile=join(directory,'connections.json');let loginCalls=0;
  const connections=createConnections(readConfig({}),{stateFile,fetchImpl:async (url,options)=>{
    if(String(url).endsWith('/auth-with-password')) {
      loginCalls++;assert.deepEqual(JSON.parse(options.body),{identity:'user@example.com',password:'fixture-password'});
      return new Response(JSON.stringify({token:'fixture-token',record:{id:'user'}}));
    }
    assert.equal(options.headers.Authorization,'fixture-token');
    if(String(url).includes('/systems/records'))return new Response(JSON.stringify({items:[{id:'abc123',name:'Server',token:'do-not-return'}]}));
    return new Response(JSON.stringify({items:[{created:new Date().toISOString(),stats:{cpu:12,mp:34,t:{cpu:45}}}]}));
  }});t.after(()=>connections.close());
  const publicSettings=await connections.loginBeszel({url:'https://beszel.example.com',identity:'user@example.com',password:'fixture-password'});
  assert.equal(loginCalls,1);assert.ok(!JSON.stringify(publicSettings).includes('fixture-token'));
  const saved=await readFile(stateFile,'utf8');assert.ok(saved.includes('fixture-token'));assert.ok(!saved.includes('fixture-password'));
  assert.equal((await stat(stateFile)).mode&0o777,0o600);
  assert.deepEqual(await connections.beszelSystems(),[{id:'abc123',name:'Server'}]);
  await connections.update('beszel',{systemId:'abc123',sensor:'cpu'});
  const source=(await connections.metrics()).find(source=>source.id==='beszel');
  assert.equal(source.status,'live');assert.equal(source.cpu,12);assert.equal(source.ram,34);assert.equal(source.temperature,45);
  const restored=await loadSavedConnections(readConfig({}),stateFile);assert.equal(restored.beszel.systemId,'abc123');
});
test('invalid settings do not replace an existing connection',async t=>{
  const directory=await mkdtemp(join(tmpdir(),'ultra-connect-'));t.after(()=>rm(directory,{recursive:true,force:true}));
  const connections=createConnections(readConfig({}),{stateFile:join(directory,'connections.json')});t.after(()=>connections.close());
  await connections.update('beszel',{url:'https://beszel.example.com',token:'secret'});
  await assert.rejects(connections.update('beszel',{url:'file:///etc/passwd'}));
  assert.equal(connections.settings().beszel.url,'https://beszel.example.com');
  await assert.rejects(connections.update('beszel',{systemId:'x" || true'}));
  assert.ok(!JSON.stringify(connections.settings()).includes('secret'));
});
