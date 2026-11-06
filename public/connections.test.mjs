import test from 'node:test';
import assert from 'node:assert/strict';
import { Window } from 'happy-dom';
import { mountConnections } from './connections.mjs';
import { copy } from './constants/copy.mjs';

test('connection forms clear credentials after use and select a Beszel system without browser persistence', async t => {
  const window=new Window({url:'http://localhost:3140'});
  const previous=Object.fromEntries(['document','fetch'].map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
  t.after(()=>{for(const [key,descriptor] of Object.entries(previous)){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}});
  Object.defineProperty(globalThis,'document',{configurable:true,value:window.document});
  const settings={truenas:{url:'wss://nas.example/api/current',name:'NAS'},beszel:{url:'https://stats.example',name:'Stats'}};
  let key,login,selected;
  globalThis.fetch=async(url,options)=>{
    const input=options?.body?JSON.parse(options.body):null;
    if(url==='/api/connections/truenas'){key=input.key;settings.truenas.hasCredential=true;}
    if(url==='/api/connections/beszel/login'){login=input;settings.beszel.hasCredential=true;}
    if(url==='/api/connections/beszel'){selected=input.systemId;settings.beszel.systemId=selected;}
    return new Response(JSON.stringify(url.endsWith('/systems')?{systems:[{id:'system1',name:'Host one'}]}:settings));
  };
  const container=window.document.createElement('section');window.document.body.append(container);await mountConnections(container);
  const forms=container.querySelectorAll('form');
  forms[0].querySelector('input[type=password]').value='fixture-api-key';
  forms[0].dispatchEvent(new window.Event('submit',{cancelable:true}));await new Promise(resolve=>setImmediate(resolve));
  assert.equal(key,'fixture-api-key');assert.equal(forms[0].querySelector('input[type=password]').value,'');
  forms[1].querySelector('input[type=email]').value='user@example.com';forms[1].querySelector('input[type=password]').value='fixture-password';
  forms[1].dispatchEvent(new window.Event('submit',{cancelable:true}));await new Promise(resolve=>setImmediate(resolve));
  assert.equal(login.password,'fixture-password');assert.equal(forms[1].querySelector('input[type=password]').value,'');
  const use=[...forms[1].querySelectorAll('button')].find(node=>node.textContent===copy.saveSystem);assert.equal(use.disabled,false);use.click();
  await new Promise(resolve=>setImmediate(resolve));assert.equal(selected,'system1');
  assert.ok(!container.textContent.includes('fixture-password'));assert.ok(!container.textContent.includes('fixture-api-key'));
  assert.equal(window.localStorage.length,0);
});
