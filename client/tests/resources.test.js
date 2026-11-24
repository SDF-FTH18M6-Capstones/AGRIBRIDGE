import test from 'node:test';
import assert from 'node:assert/strict';
import { createResourceLoader } from '../src/services/resourceLoader.js';

test('coalesces concurrent reference requests and expires the short public cache', async () => {
  let calls=0, at=0;
  const loader=createResourceLoader(async path => ({path,request:++calls}),()=> 'account-A',()=>at);
  const [one,two]=await Promise.all([loader.load('/locations'),loader.load('/locations')]);
  assert.equal(calls,1);assert.equal(one,two);
  await loader.load('/locations');assert.equal(calls,1);
  at=30001;await loader.load('/locations');assert.equal(calls,2);
  await loader.load('/locations',{force:true});assert.equal(calls,3);
});

test('never caches private responses and never shares in-flight results across identities', async () => {
  let identity='account-A', calls=0;
  const loader=createResourceLoader(async()=>({identity,request:++calls}),()=>identity);
  const first=loader.load('/orders');await Promise.resolve();
  identity='account-B';const second=loader.load('/orders');
  assert.notEqual(await first,await second);assert.equal(calls,2);
  await loader.load('/orders');assert.equal(calls,3);
});

test('invalidation discards an older pending public response and permits retry after failure', async () => {
  let resolve, calls=0;
  const loader=createResourceLoader(()=>{calls++;return calls===1?new Promise(done=>{resolve=done;}):Promise.resolve('new');},()=> 'account');
  const old=loader.load('/categories/');await Promise.resolve();loader.invalidate();
  assert.equal(await loader.load('/categories/'),'new');resolve('old');await old;
  assert.equal(await loader.load('/categories/'),'new');assert.equal(calls,2);
  let attempts=0;
  const retry=createResourceLoader(()=>{if(++attempts===1) throw new Error('offline');return 'online';},()=> 'account');
  await assert.rejects(retry.load('/locations'),/offline/);assert.equal(await retry.load('/locations'),'online');
});
