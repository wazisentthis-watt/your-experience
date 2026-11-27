'use strict';
const assert=require('node:assert/strict');
const {test}=require('node:test');
const T=require('../mella_training.js');
test('original Mella PNG geometry is exactly 1536x672',()=>{
  assert.equal(T.verifyImage(1536,672),true);
  assert.equal(T.verifyImage(1535,672),false);
  assert.equal(T.verifyImage(1536,671),false);
});
test('starts away from obstacles with three uncollected markers',()=>{
  const s=T.initialState();assert.equal(T.available(s.x,s.y),true);
  assert.equal(T.collected(s),0);assert.equal(s.finished,false);
});
test('fixed dt cap prevents huge jumps after background-tab resume',()=>{
  const s=T.initialState();T.step(s,1,0,2);
  assert.ok(Math.abs(s.x-69.5)<.001);
});
test('diagonal speed does not exceed straight speed',()=>{
  const a=T.initialState(),b=T.initialState();T.step(a,1,0,.05);T.step(b,1,1,.05);
  assert.ok(Math.abs(Math.hypot(b.x-62,b.y-335)-7.5)<.001);
  assert.ok(Math.abs((a.x-62)-7.5)<.001);
});
test('walls block motion and allow sliding along wall',()=>{
  const s=T.initialState();s.x=175;s.y=165;
  T.step(s,1,0,.05);assert.equal(s.x,175);
  T.step(s,1,1,.05);assert.equal(s.x,175);assert.ok(s.y>165);
});
test('boundaries cannot be crossed',()=>{
  const s=T.initialState();s.x=28;s.y=28;T.step(s,-1,-1,.05);
  assert.ok(s.x>=27&&s.y>=27);
});
test('three markers are collectible, exit is locked until all',()=>{
  const s=T.initialState();s.x=T.EXIT.x;s.y=T.EXIT.y;T.step(s,0,0,0);
  assert.equal(s.finished,false);
  T.MARKERS.forEach((m,i)=>{s.x=m.x;s.y=m.y;T.step(s,0,0,0);assert.equal(T.collected(s),i+1)});
  s.x=T.EXIT.x;s.y=T.EXIT.y;T.step(s,0,0,0);
  assert.equal(s.finished,true);
});
test('finished trial does not keep moving or adding time',()=>{
  const s=T.initialState();s.finished=true;const before={x:s.x,y:s.y,t:s.elapsed};
  T.step(s,1,1,.05);assert.equal(s.x,before.x);assert.equal(s.y,before.y);assert.equal(s.elapsed,before.t);
});
test('moving source walk uses 8 frames in documented 96px grid',()=>{
  const s=T.initialState();s.moving=true;
  assert.deepEqual([0,.126,.251,.376,.501,.626,.751,.876,1.001].map(t=>{s.animTime=t;return T.frame(s).sx/96}),[4,5,6,7,8,9,10,11,4]);
});
test('four rows map down, up, left, right; left is identified as fallback',()=>{
  const s=T.initialState();const values=[];
  for(const dir of ['down','up','left','right']){s.dir=dir;values.push(T.frame(s).sy/96);}
  assert.deepEqual(values,[0,1,2,3]);s.dir='left';assert.equal(T.frame(s).fallback,true);
  s.dir='right';assert.equal(T.frame(s).fallback,false);
});
test('idle returns documented 0 column; invalid direction throws',()=>{
  const s=T.initialState();s.dir='up';s.moving=false;s.animTime=999;assert.equal(T.frame(s).sx,0);
  s.dir='unknown';assert.throws(()=>T.frame(s));
});
test('route from spawn to markers and exit is navigable with collisions',()=>{
  const goals=[...T.MARKERS,T.EXIT],start=T.initialState();
  const cell=8,keys=new Set(),queue=[[Math.round(start.x/cell),Math.round(start.y/cell)]];
  const key=(x,y)=>x+','+y;
  keys.add(key(queue[0][0],queue[0][1]));
  for(let i=0;i<queue.length;i++){
    const [x,y]=queue[i];
    for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
      const nx=x+dx,ny=y+dy,k=key(nx,ny);
      if(!keys.has(k)&&T.available(nx*cell,ny*cell)){keys.add(k);queue.push([nx,ny]);}
    }
  }
  for(const goal of goals){const k=key(Math.round(goal.x/cell),Math.round(goal.y/cell));assert.ok(keys.has(k),'goal accessible: '+k);}
});
test('invalid input rejected and no browser import side effect',()=>{
  assert.throws(()=>T.step(T.initialState(),NaN,0,.05));
  assert.equal(typeof globalThis.WIRMellaTrial,'undefined');
});
