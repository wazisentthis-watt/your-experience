'use strict';
const assert = require('node:assert/strict');
const { test } = require('node:test');
const registry = require('../wir_sprite_registry.js');
const doc = require('../registry.v1.json');
const clone = value => JSON.parse(JSON.stringify(value));
const fixture = () => ({
  schema: 'wir.sprite-registry/1', status: 'PROPOSAL_HOLD',
  assets: [{ id: 'test-art', path: 'your/assets/hero/test.png', source_kind: 'ORIGINAL_WIR',
    rights_status: 'APPROVED_ORIGINAL_WIR', geometry_status: 'VERIFIED',
    provenance: 'test fixture only; NOT an actual production approval',
    sha256: 'a'.repeat(64), cols: 4, rows: 4, frameW: 96, frameH: 96, fps: 8,
    anims: { idle_down: [0], walk_down: [0,1,2,3] } }] });
const bad = (fn, expression) => assert.throws(fn, expression);
test('current repository registry is valid but both entries are held', () => {
  assert.equal(registry.validate(doc), true);
  assert.deepEqual(registry.preflight(doc).map(x => x.ready), [false,false]);
  assert.equal(registry.find(doc, 'mella-sheet-existing').git_blob_sha.length, 40);
});
test('missing or duplicate identifiers are rejected', () => {
  const m = fixture(); m.assets.push(clone(m.assets[0]));
  bad(() => registry.validate(m), /duplicate asset id/);
  m.assets[1].id = 'Bad Id'; bad(() => registry.validate(m), /asset id/);
});
test('unsafe external, traversal and absolute paths are rejected', () => {
  for (const p of ['https://example.com/a.png','/your/assets/a.png','your/assets/../private.png',
    'your/assets//a.png','your/assets/a.svg','your/assets/%2e%2e/a.png','your/assets/./a.png']) {
    const m = fixture(); m.assets[0].path = p;
    bad(() => registry.validate(m), /unsafe asset path/);
  }
});
test('frame geometry must be finite and bounded', () => {
  for (const key of ['cols','rows','frameW','frameH']) {
    const m = fixture(); m.assets[0][key] = 0;
    bad(() => registry.validate(m), /frame geometry/);
  }
  const m = fixture(); m.assets[0].anims.walk_down = [0,16];
  bad(() => registry.validate(m), /out-of-bounds frame/);
});
test('invalid FPS and empty actions rejected', () => {
  const m = fixture(); m.assets[0].fps = 80;
  bad(() => registry.validate(m), /invalid fps/);
  m.assets[0].fps = 8; m.assets[0].anims = {};
  bad(() => registry.validate(m), /no animations/);
});
test('SHA-256 duplicate detection rejects repeated assets', () => {
  const m = fixture(); const extra = clone(m.assets[0]); extra.id = 'other-art'; extra.path = 'your/assets/hero/other.png'; m.assets.push(extra);
  bad(() => registry.validate(m), /duplicate SHA-256/);
});
test('approved entries require original WIR provenance and hash', () => {
  const m = fixture(); m.assets[0].sha256 = null;
  bad(() => registry.validate(m), /approved entry/);
  m.assets[0].sha256 = 'a'.repeat(64); m.assets[0].source_kind = 'UNVERIFIED';
  bad(() => registry.validate(m), /approved entry/);
});
test('review-held image is refused before touching runtime loader', async () => {
  let loadCount = 0;
  const Y = { core: { assets: { load: () => { loadCount++; return Promise.resolve(); } } } };
  await assert.rejects(registry.loadSheet(doc, 'mella-sheet-existing', Y), /HOLD/);
  assert.equal(loadCount, 0);
});
test('approved fixture maps to existing YOUR.SpriteSheet constructor', async () => {
  const m = fixture(); let path = null;
  function SpriteSheet(options) { Object.assign(this, options); }
  const Y = { SpriteSheet, core: { assets: {
    load: paths => { path = paths['test-art']; return Promise.resolve(); },
    get: () => ({ width: 384, height: 384 })
  } } };
  const sheet = await registry.loadSheet(m, 'test-art', Y);
  assert.equal(path, 'your/assets/hero/test.png');
  assert.equal(sheet.frameW, 96); assert.equal(sheet.fps, 8);
  assert.deepEqual(sheet.anims.walk_down.frames, [0,1,2,3]);
});
test('wrong image dimensions are rejected, not silently stretched', async () => {
  const Y = { SpriteSheet: function() {}, core: { assets: {
    load: () => Promise.resolve(), get: () => ({ width: 383, height: 384 })
  } } };
  await assert.rejects(registry.loadSheet(fixture(), 'test-art', Y), /dimensions mismatch/);
});
test('absent engine adapter returns a meaningful error', async () => {
  await assert.rejects(registry.loadSheet(fixture(), 'test-art', {}), /adapter unavailable/);
});
test('no changes to global game state or saves during import', () => {
  const before = JSON.stringify(doc);
  registry.validate(doc); registry.preflight(doc);
  assert.equal(JSON.stringify(doc), before);
  assert.equal(typeof globalThis.WIRSpriteRegistry, 'undefined');
});
