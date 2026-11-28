'use strict';
const assert=require('node:assert/strict');
const {test}=require('node:test');
const episode=require('../wir_mission_episodes.js');

const obj=[
  {id:'market',use:[8.5,12.5]},{id:'field',use:[30.5,12.5]},
  {id:'gym',use:[31.5,24.5]},{id:'park',use:[7.5,28.5]}
];
function state(id,progress=[],completed=[]) {return {active:id,progress,completed,session:'s'};}
function snap(map='SAV'){return {map,objects:obj,x:10,y:10};}
function map(w=30,h=30) {
  const block=new Uint8Array(w*h);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(x===0||y===0||x===w-1||y===h-1)block[y*w+x]=1;
  return {id:'SAV',w,h,block,objs:obj};
}
function win(active='ghost_sweep',at={x:15.5,y:15.5}) {
  const world={S:{},G:{map:map(),px:at.x,py:at.y,w:400,h:500,cam:{x:15.5,y:15.5,s:1.5}}};
  const foes=[];
  const v23={foes,raid:null,site:null,boss:null,spawn:function(kind,x,y){
    const f={kind,x,y,st:'chase',src:'qa'};foes.push(f);return f;
  }};
  return {__VL:world,YOUR_V23:v23,YOUR_V23_CONFIG:{machines:{loader:{},lifter:{}}},
    WIRMissions:{valid:d=>d||{}},WIR_HERO:{get:()=>({games:{your_missions:{data:state(active,[])}}})}};
}
test('each original mission gets a named briefing and finish scene',()=>{
  for (const id of ['street_watch','veyru_signal','first_wish','ghost_sweep']) {
    assert.ok(episode.DIALOGUE[id].start[0]);assert.ok(episode.DIALOGUE[id].start[1]);
    assert.ok(episode.DIALOGUE[id].finish[0]);
  }
});
test('stage dialogue is only emitted on real mission acceptance',()=>{
  assert.deepEqual(episode.dialogueEvents(state(null),state('street_watch',[])),[episode.DIALOGUE.street_watch.start]);
});
test('completing a single stage triggers matching dialogue, not another stage',()=>{
  let a=state('street_watch',[false,false,false]);
  let b=state('street_watch',[false,true,false]);
  assert.deepEqual(episode.dialogueEvents(a,b),[episode.DIALOGUE.street_watch.steps[1]]);
});
test('a completed mission gets one finale, not repeated on unchanged state',()=>{
  let a=state('ghost_sweep',[false]);
  let b=state(null,[],['ghost_sweep']);
  assert.deepEqual(episode.dialogueEvents(a,b),[episode.DIALOGUE.ghost_sweep.finish]);
  assert.deepEqual(episode.dialogueEvents(b,b),[]);
});
test('already saved cleared missions do not replay on a new page session',()=>{
  assert.deepEqual(episode.dialogueEvents(null,state(null,[],['street_watch'])),[]);
});
test('first incomplete street-watch location is the only target',()=>{
  const target=episode.currentTarget(state('street_watch',[true,false,false]),snap());
  assert.equal(target.key,'field');
  assert.equal(target.x,30.5);
});
test('park objective marker disappears once reached',()=>{
  assert.equal(episode.currentTarget(state('veyru_signal',[false,false]),snap()).key,'park');
  assert.equal(episode.currentTarget(state('veyru_signal',[true,false]),snap()),null);
});
test('markers are hidden outside Savannah and during a combat-only mission',()=>{
  assert.equal(episode.currentTarget(state('street_watch',[]),snap('JAX')),null);
  assert.equal(episode.currentTarget(state('ghost_sweep',[]),snap()),null);
});
test('camera projection respects 32px tiles, zoom and player-centered camera',()=>{
  const p=episode.screenPoint({x:11,y:9},{x:10,y:10,s:2},500,300);
  assert.equal(p.x,314);assert.equal(p.y,86);assert.equal(p.offscreen,false);
});
test('far targets use pinned screen-edge markers and direction angle',()=>{
  const p=episode.screenPoint({x:90,y:10},{x:10,y:10,s:2},400,300);
  assert.equal(p.offscreen,true);assert.ok(p.x<=356&&p.x>=44);
});
test('edge marker arrow follows true direction, never a fixed corner',()=>{
  assert.equal(episode.arrowForDirection(0),'→');
  assert.equal(episode.arrowForDirection(Math.PI),'←');
  assert.equal(episode.arrowForDirection(Math.PI/2),'↓');
  assert.equal(episode.arrowForDirection(-Math.PI/2),'↑');
});
test('invalid camera geometry safely refuses marker',()=>{
  assert.equal(episode.screenPoint({x:1,y:1},{x:0,y:0,s:0},300,200),null);
  assert.equal(episode.screenPoint(null,{x:0,y:0,s:1},300,200),null);
});
test('BFS enemy spots are reachable, separated and clear',()=>{
  const level=map();const spots=episode.spawnPositions(level,15.5,15.5,2);
  assert.equal(spots.length,2);
  assert.ok(Math.hypot(spots[0].x-spots[1].x,spots[0].y-spots[1].y)>=5);
  spots.forEach(p=>assert.equal(level.block[Math.floor(p.y)*level.w+Math.floor(p.x)],0));
});
test('spawn resolver avoids unreachable walled zones',()=>{
  const level=map();
  for(let y=1;y<level.h-1;y++)level.block[y*level.w+12]=1;
  const spots=episode.spawnPositions(level,5.5,15.5,2);
  assert.equal(spots.length,2);spots.forEach(p=>assert.ok(p.x<12));
});
test('spawn resolver declines completely blocked/invalid maps',()=>{
  const level=map();level.block.fill(1);
  assert.deepEqual(episode.spawnPositions(level,15.5,15.5,2),[]);
  assert.deepEqual(episode.spawnPositions({w:5,h:5,block:[]},2.5,2.5,2),[]);
});
test('encounter cannot launch before GHOST SWEEP is accepted',()=>{
  assert.equal(episode.encounterPlan(win(),state('street_watch')).ok,false);
});
test('encounter cannot launch outside Savannah',()=>{
  const w=win();w.__VL.G.map.id='JAX';
  assert.equal(episode.encounterPlan(w,state('ghost_sweep')).ok,false);
});
test('encounter must not stack with ongoing raid, site, or foes',()=>{
  const w=win(),s=state('ghost_sweep');
  w.YOUR_V23.raid={};assert.equal(episode.encounterPlan(w,s).ok,false);
  w.YOUR_V23.raid=null;w.YOUR_V23.site={state:'live'};
  assert.equal(episode.encounterPlan(w,s).ok,false);
  w.YOUR_V23.site=null;w.YOUR_V23.foes.push({st:'chase'});
  assert.equal(episode.encounterPlan(w,s).ok,false);
});
test('encounter validates both native V23 machine types',()=>{
  const w=win();delete w.YOUR_V23_CONFIG.machines.lifter;
  assert.equal(episode.encounterPlan(w,state('ghost_sweep')).ok,false);
});
test('scripted encounter spawns two actual V23 enemies only after guards',()=>{
  const w=win();
  const r=episode.spawnEncounter(w,state('ghost_sweep'));
  assert.equal(r.ok,true);assert.equal(r.foes.length,2);assert.equal(w.YOUR_V23.foes.length,2);
  assert.deepEqual(r.foes.map(f=>f.kind),['loader','lifter']);
  assert.ok(r.foes.every(f=>f.src==='mission_ghost_sweep'));
  assert.equal(episode.spawnEncounter(w,state('ghost_sweep')).ok,false);
});
test('failed second spawn is rolled back, no orphaned mission machine',()=>{
  const w=win();let calls=0;
  const real=w.YOUR_V23.spawn;
  w.YOUR_V23.spawn=function(...args){calls++;if(calls===2)throw Error('synthetic failure');return real(...args);};
  assert.equal(episode.spawnEncounter(w,state('ghost_sweep')).ok,false);
  assert.equal(w.YOUR_V23.foes.length,0);
});
test('read state uses existing hero mission save only',()=>{
  const w=win('veyru_signal');
  assert.equal(episode.activeState(w).active,'veyru_signal');
  w.__VL.S=null;assert.equal(episode.activeState(w),null);
});
test('episode module is safe to import without document or window',()=>{
  assert.equal(typeof globalThis.WIRMissionEpisodes,'undefined');
});
