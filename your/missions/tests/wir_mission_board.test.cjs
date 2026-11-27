'use strict';
const assert=require('node:assert/strict');
const {test}=require('node:test');
const M=require('../wir_mission_board.js');
const session='test-session';
const objects=[
  {id:'market',use:[8.5,12.5]},{id:'field',use:[30.5,12.5]},
  {id:'gym',use:[30.5,23.5]},{id:'park',use:[7.5,28.5]}
];
function snap(x=3,y=3,over={}){return {ready:true,map:'SAV',x,y,objects,calm:0,circuit:0,isolated:0,...over};}
function start(id,ctx=snap()){const s=M.begin(M.empty(),id,ctx,session);assert.ok(s);return s;}
function go(s,ctx){return M.next(s,ctx,session);}
test('four distinct playable WIR missions have unique canonical IDs',()=>{
  assert.equal(M.MISSIONS.length,4);
  assert.equal(new Set(M.MISSIONS.map(m=>m.id)).size,4);
});
test('accepting requires actual initialized game',()=>{
  assert.equal(M.begin(M.empty(),'street_watch',{ready:false},session),null);
});
test('accepting invalid mission is rejected',()=>{
  assert.equal(M.begin(M.empty(),'not_a_mission',snap(),session),null);
});
test('only one active mission at a time',()=>{
  const s=start('street_watch');
  assert.equal(M.begin(s,'ghost_sweep',snap(),session),null);
});
test('persisted mission data is versioned and sanitized',()=>{
  const state=M.valid({schema:M.SCHEMA,active:'unknown',completed:['ghost_sweep','ghost_sweep','bogus']});
  assert.deepEqual(state.completed,['ghost_sweep']);assert.equal(state.active,null);
});
test('patrol does not progress from distant location',()=>{
  const r=go(start('street_watch'),snap());assert.equal(r.changed,false);
});
test('a shop visit is not credited on a different city map',()=>{
  const r=go(start('street_watch'),snap(8.5,12.5,{map:'JAX'}));assert.deepEqual(r.state.progress,[false,false,false]);
});
test('visits complete by true world positions and in any order',()=>{
  let s=start('street_watch');
  s=go(s,snap(30.5,12.5)).state;assert.deepEqual(s.progress,[false,true,false]);
  s=go(s,snap(8.5,12.5)).state;assert.deepEqual(s.progress,[true,true,false]);
  const r=go(s,snap(30.5,23.5));assert.equal(r.finished,'street_watch');
  assert.deepEqual(r.state.completed,['street_watch']);assert.equal(r.state.active,null);
});
test('moving near but outside entrance radius cannot mark a visit',()=>{
  const r=go(start('street_watch'),snap(8.5,14.31));
  assert.equal(r.state.progress[0],false);
});
test('missing dynamic map object cannot be marked visited',()=>{
  const r=go(start('street_watch'),snap(8.5,12.5,{objects:[]}));
  assert.equal(r.state.progress[0],false);
});
test('Veyru mission requires both park visit and a successful calm after accepting',()=>{
  let s=start('veyru_signal',snap(3,3,{calm:4}));
  s=go(s,snap(7.5,28.5,{calm:4})).state;
  assert.deepEqual(s.progress,[true,false]);
  const r=go(s,snap(3,3,{calm:5}));assert.equal(r.finished,'veyru_signal');
});
test('preexisting CALM uses do not count',()=>{
  const s=start('veyru_signal',snap(3,3,{calm:7}));
  const r=go(s,snap(7.5,28.5,{calm:7}));assert.deepEqual(r.state.progress,[true,false]);
});
test('circuit mission requires gym AND a new living circuit',()=>{
  let s=start('first_wish',snap(1,1,{circuit:2}));
  s=go(s,snap(30.5,23.5,{circuit:2})).state;
  assert.deepEqual(s.progress,[true,false]);
  const r=go(s,snap(1,1,{circuit:3}));assert.equal(r.finished,'first_wish');
});
test('ghost sweep requires two new isolated machines, not two old ones',()=>{
  let s=start('ghost_sweep',snap(0,0,{isolated:11}));
  s=go(s,snap(0,0,{isolated:12})).state;assert.deepEqual(s.progress,[false]);
  const r=go(s,snap(0,0,{isolated:13}));assert.equal(r.finished,'ghost_sweep');
});
test('combat records count the isolated types robustly',()=>{
  assert.equal(M.totalIsolated({isolated:{loader:2,lifter:1,breacher:-1}}),3);
  assert.equal(M.totalIsolated({isolated:{loader:'3',bad:'abc'}}),3);
  assert.equal(M.totalIsolated(null),0);
});
test('page reload resets only unfinished ephemeral baselines',()=>{
  let s=start('veyru_signal',snap(1,1,{calm:10}));
  s=go(s,snap(7.5,28.5,{calm:10})).state;
  const r=M.next(s,snap(1,1,{calm:0}),'new-browser-session');
  assert.equal(r.changed,true);assert.deepEqual(r.state.progress,[true,false]);
  assert.equal(r.state.baseline.calm,0);
  assert.equal(M.next(r.state,snap(1,1,{calm:1}),'new-browser-session').finished,'veyru_signal');
});
test('completed mission cannot be claimed twice',()=>{
  let s=start('ghost_sweep');
  s=go(s,snap(1,1,{isolated:2})).state;
  assert.equal(M.begin(s,'ghost_sweep',snap(),session),null);
});
test('abandon clears active progress but preserves completed badges',()=>{
  let s=start('street_watch');s.completed.push('ghost_sweep');s=M.abandon(s);
  assert.equal(s.active,null);assert.deepEqual(s.completed,['ghost_sweep']);
});
test('source snapshot reads real Valence coordinates and combat record',()=>{
  const win={__VL:{S:{},G:{map:{id:'SAV',objs:objects},px:8.5,py:12.5}},
    YOUR_V22:{P:{uses:{calm:3,circuit:2}}},YOUR_V23:{rec:()=>({isolated:{loader:2,lifter:1}})}};
  assert.deepEqual(M.getSnapshot(win),{ready:true,map:'SAV',x:8.5,y:12.5,objects,calm:3,circuit:2,isolated:3});
});
test('persistent ghost kills keep their baseline across reload',()=>{
  let s=start('ghost_sweep',snap(0,0,{isolated:10}));
  s=go(s,snap(0,0,{isolated:11})).state;
  const r=M.next(s,snap(0,0,{isolated:11}),'new-browser-session');
  assert.equal(r.state.baseline.isolated,10);
  assert.equal(M.next(r.state,snap(0,0,{isolated:12}),'new-browser-session').finished,'ghost_sweep');
});
test('module evaluation does not write global state in Node',()=>assert.equal(typeof globalThis.WIRMissions,'undefined'));
