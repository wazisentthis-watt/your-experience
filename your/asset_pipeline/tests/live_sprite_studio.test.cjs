'use strict';
const assert = require('node:assert/strict');
const { test } = require('node:test');
const lab = require('../live_sprite_studio.js');

test('catalog contains existing sheets, not invented new sprite art', () => {
 assert.deepEqual(Object.keys(lab.SHEETS), ['hero','mella']);
 assert.equal(lab.SHEETS.hero.path,'your/assets/hero/hero_sheet_96.png');
 assert.equal(lab.SHEETS.mella.path,'your/assets/mella/mella_sheet_96.png');
});
test('hero four native walking direction rows', () => {
 assert.deepEqual(['down','left','right','up'].map(d=>lab.frameFor('hero',d,'walk',0).row),[0,1,2,3]);
});
test('hero walk loops through the four authored walk columns', () => {
 assert.deepEqual([0,.126,.251,.376,.501].map(t=>lab.frameFor('hero','down','walk',t).col),[0,1,2,3,0]);
});
test('Mella native documented walk is columns 4-11', () => {
 assert.deepEqual([0,.126,.251,.376,.501,.626,.751,.876].map(t=>lab.frameFor('mella','up','walk',t).col),[4,5,6,7,8,9,10,11]);
});
test('Mella left row is marked fallback, not authored native walk', () => {
 assert.equal(lab.frameFor('mella','left','walk',.1).fallback,true);
 assert.equal(lab.frameFor('mella','right','walk',.1).fallback,false);
});
test('Mella cast frames stay on documented direction row', () => {
 assert.deepEqual([0,.126,.251,.376].map(t=>lab.frameFor('mella','down','cast',t).col),[12,13,14,15]);
});
test('hero cast is unavailable rather than faked', () => assert.throws(()=>lab.frameFor('hero','down','cast',0)));
test('wrong atlas dimensions are detected', () => {
 assert.equal(lab.geometryMatches('hero',1536,1056),true);
 assert.equal(lab.geometryMatches('mella',1536,672),true);
 assert.equal(lab.geometryMatches('hero',1535,1056),false);
 assert.equal(lab.geometryMatches('mella',1536,1056),false);
});
test('invalid selections and timing are rejected', () => {
 for(const f of [()=>lab.frameFor('bad','down','walk',0),()=>lab.frameFor('hero','bad','walk',0),
  ()=>lab.frameFor('hero','down','bad',0),()=>lab.frameFor('hero','down','walk',-1),
  ()=>lab.frameFor('hero','down','walk',Number.NaN)]) assert.throws(f);
});
test('every documented animation stays inside sheet bounds', () => {
 for(const [name,s] of Object.entries(lab.SHEETS)) {
  for(const d of Object.keys(s.directions))for(const a of ['idle','walk','cast']) {
   if(!s[a])continue;
   for(let t=0;t<4;t+=.125) {
    const f=lab.frameFor(name,d,a,t);
    assert.ok(f.sx>=0 && f.sx+f.sw<=s.cols*s.cell);
    assert.ok(f.sy>=0 && f.sy+f.sh<=s.rows*s.cell);
   }
  }
 }
});
test('module import is side-effect-free when no browser exists', () => assert.equal(typeof globalThis.WIRSpriteStudio,'undefined'));
