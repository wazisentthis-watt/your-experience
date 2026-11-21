'use strict';
const assert = require('node:assert/strict');
const H = require('../section_handoff.js');
let passed = 0;
function test(name, fn) { fn(); passed++; console.log('PASS', name); }
function fixture() {
  const profile = { schema: 'wir.hero/1', id: 'hero_test123', name: 'Hero',
    kaw: { id: 'kaw-veyru-001', bond: 42 }, games: { football: { data: { tds: 4 } },
      your_universe: { data: { priorFlag: true } } } };
  let writes = 0;
  const api = {
    exists() { return true; },
    get() { return profile; },
    gameData(id, update) {
      const g = profile.games[id] || {};
      if (update !== undefined) { writes++; profile.games[id] = Object.assign({}, g, update); }
      return profile.games[id] || {};
    }
  };
  return { profile, api, bridge: H.create(api), count: () => writes };
}
function ticket(f, from='HOME', to='LIVING_DISTRICT') {
  return f.bridge.prepare({ from, to, exitId: 'front-door', entryId: 'riverside-door' });
}
function arrive(f, t, x=14.5, y=9.5) {
  return f.bridge.confirmArrival(t, { arrived: true, section: t.to, entryId: t.entryId, x, y });
}
test('four approved directed section routes', () => {
  assert.equal(H.isAllowed('HOME', 'LIVING_DISTRICT'), true);
  assert.equal(H.isAllowed('LIVING_DISTRICT', 'HOME'), true);
  assert.equal(H.isAllowed('LIVING_DISTRICT', 'MORROW_CITY'), true);
  assert.equal(H.isAllowed('MORROW_CITY', 'LIVING_DISTRICT'), true);
});
test('no direct HOME to Morrow shortcut', () => assert.equal(H.isAllowed('HOME', 'MORROW_CITY'), false));
test('reject unsupported section and anchors', () => {
  const f = fixture();
  assert.throws(() => f.bridge.prepare({ from:'HOME', to:'OTHER', exitId:'a',entryId:'b' }));
  assert.throws(() => f.bridge.prepare({ from:'HOME', to:'LIVING_DISTRICT', exitId:'',entryId:'b' }));
});
test('no checkpoint written by preparing travel', () => {
  const f = fixture(); ticket(f); assert.equal(f.count(), 0);
});
test('requires confirmed destination and matching entry', () => {
  const f = fixture(), t = ticket(f);
  assert.throws(() => f.bridge.confirmArrival(t, { arrived: false, section: t.to, entryId: t.entryId, x:1, y:1 }));
  assert.throws(() => f.bridge.confirmArrival(t, { arrived: true, section: t.to, entryId:'wrong', x:1, y:1 }));
  assert.equal(f.count(), 0);
});
test('rejects fake, missing, and non-finite arrival coordinates', () => {
  const f = fixture(), t = ticket(f);
  assert.throws(() => arrive(f,t,NaN,0));
  assert.throws(() => arrive(f,t,'12',0));
  assert.equal(f.count(), 0);
});
test('saves only after walkable spawn confirmed by world adapter', () => {
  const f = fixture(), t = ticket(f);
  assert.deepEqual(arrive(f,t), { section: 'LIVING_DISTRICT',entryId:'riverside-door',x:14.5,y:9.5 });
  assert.equal(f.count(),1);
});
test('resume restores the same section and coordinates', () => {
  const f = fixture(); arrive(f,ticket(f),20,30);
  assert.deepEqual(f.bridge.resume(), { section:'LIVING_DISTRICT',entryId:'riverside-door',x:20,y:30 });
});
test('preserves existing game data, unrelated game progress, and Veyru', () => {
  const f = fixture(); arrive(f,ticket(f));
  assert.equal(f.profile.games.your_universe.data.priorFlag, true);
  assert.equal(f.profile.games.football.data.tds,4);
  assert.deepEqual(f.profile.kaw,{id:'kaw-veyru-001',bond:42});
});
test('hero swap during travel is rejected', () => {
  const f = fixture(), t = ticket(f); f.profile.id='hero_other456';
  assert.throws(() => arrive(f,t),/Hero identity changed/);
  assert.equal(f.count(),0);
});
test('does not create a hero when no profile exists', () => {
  const f = fixture(); f.api.exists = () => false;
  assert.throws(() => ticket(f),/No existing/);
});
test('cannot silently exceed the existing hero gameData cap', () => {
  const f = fixture(); f.profile.games.your_universe.data.priorFlag='x'.repeat(4090);
  assert.throws(() => arrive(f,ticket(f)),/4 KB/);
  assert.equal(f.count(),0);
});
test('full out-and-back path preserves a single hero', () => {
  const f=fixture(); let t=ticket(f); arrive(f,t);
  t=ticket(f,'LIVING_DISTRICT','MORROW_CITY'); arrive(f,t,7,8);
  t=ticket(f,'MORROW_CITY','LIVING_DISTRICT'); arrive(f,t,14,9);
  t=ticket(f,'LIVING_DISTRICT','HOME'); arrive(f,t,3,5);
  assert.equal(f.bridge.resume().section,'HOME');
  assert.equal(f.profile.id,'hero_test123');
  assert.equal(f.count(),4);
});
console.log(passed+'/'+passed+' contract checks passed');
