/* Muse Living Neighborhood v1 — Node tests (no DOM, no game).
 * Run: node your/muse/tests/muse_neighborhood.test.cjs
 * Mirrors the verified live layout: HOME is buildHomeV2 (20x13) with
 * fridge (11,2,2x2), bed (2,2,3x3), sofa (12,8,3x2), aquarium (17,4),
 * wall at x=19; cities use tile 8 = water. The mirror is checked against
 * index.html by hand (see your/muse/README.md §1); these tests check the
 * module's logic against that layout, not the layout itself. */
'use strict';
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..', '..');
const MUSE_PATH = path.resolve(__dirname, '..', 'your_muse.js');

/* ---- fake HOME (buildHomeV2 facts) ---- */
function makeHome() {
  const W = 20, H = 13;
  const m = { id: 'HOME', w: W, h: H, t: new Uint8Array(W * H).fill(4), objs: [], block: new Uint8Array(W * H), spawn: [10, 10.5] };
  const rect = (x, y, w, h, v) => { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) m.t[j * W + i] = v; };
  rect(0, 0, 20, 2, 1); rect(0, 12, 20, 1, 1); rect(0, 0, 1, 13, 1); rect(19, 0, 1, 13, 1);
  rect(10, 2, 1, 5, 1); rect(10, 9, 1, 3, 1);
  rect(11, 2, 8, 10, 5);
  m.t[12 * 20 + 9] = 4; m.t[12 * 20 + 10] = 4;
  const F = (id, x, y, w, h, extra) => Object.assign({ id, x, y, w, h, draw: 'fur' }, extra || {});
  m.objs.push(
    F('bed', 2, 2, 3, 3, { fur: 'bed', acts: ['sleep', 'nap'] }),
    F('desk', 6, 2, 3, 2, { fur: 'computer_desk', acts: ['beats', 'code', 'film', 'rehearse'] }),
    F('fridge', 11, 2, 2, 2, { fur: 'fridge', acts: ['cook', 'harvest', 'order'] }),
    F('sink', 13, 2, 2, 2, { fur: 'kitchen_sink', acts: ['tidy'] }),
    F('stove', 15, 2, 2, 2, { fur: 'stove', acts: ['cook', 'harvest'] }),
    F('aquarium', 17, 4, 1, 1, { fur: 'aquarium', decor: 1 }),
    F('sofa', 12, 8, 3, 2, { fur: 'sofa', acts: ['scroll', 'nap'] }),
    F('tv', 16, 6, 2, 2, { fur: 'flat_tv', acts: ['scroll'] }),
    F('console', 16, 9, 2, 1, { fur: 'game_console', acts: ['arcade'] }),
    { id: 'garden', x: 15, y: 11, w: 3, h: 1, draw: 'garden', garden: 1 },
    { id: 'door', x: 9, y: 12, w: 2, h: 1, draw: 'door', exit: 'SAV', use: [10, 11.5], walk: 1 }
  );
  // finishMap(): blocking tiles 1,6,8 + object footprints (unless walk:1)
  for (let i = 0; i < m.t.length; i++) if ([1, 6, 8].includes(m.t[i])) m.block[i] = 1;
  for (const o of m.objs) if (!o.walk) for (let j = o.y; j < o.y + o.h; j++) for (let i = o.x; i < o.x + o.w; i++) m.block[j * W + i] = 1;
  return m;
}
function makeShoreMap() {
  const W = 10, H = 10;
  const m = { id: 'SAV', w: W, h: H, t: new Uint8Array(W * H).fill(0), objs: [], block: new Uint8Array(W * H) };
  for (let x = 1; x < 9; x++) { m.t[8 * W + x] = 8; m.block[8 * W + x] = 1; } // river row
  return m;
}
function stubF(map) {
  const calls = [];
  return {
    calls,
    walkable: () => (mm, tx, ty) => { calls.push([tx, ty]); return !mm.block[ty * mm.w + tx]; },
    useSpot: () => (o) => { // nearest walkable ring tile to the player (fake player at spawn)
      let best = null, bd = 1e9;
      for (let j = o.y - 1; j <= o.y + o.h; j++) for (let i = o.x - 1; i <= o.x + o.w; i++) {
        if (i >= o.x && i < o.x + o.w && j >= o.y && j < o.y + o.h) continue;
        if (mm_blocked(map, i, j)) continue;
        const d = Math.hypot(i + 0.5 - 10, j + 0.5 - 10.5);
        if (d < bd) { bd = d; best = [i + 0.5, j + 0.5]; }
      }
      return best;
    }
  };
}
function mm_blocked(map, tx, ty) {
  if (tx < 0 || ty < 0 || tx >= map.w || ty >= map.h) return true;
  return !!map.block[ty * map.w + tx];
}
function stubCx() {
  const calls = [];
  return {
    calls,
    save() { calls.push(['save']); }, restore() { calls.push(['restore']); },
    set imageSmoothingEnabled(v) { calls.push(['smoothing', v]); },
    drawImage() { calls.push(['drawImage', ...arguments]); },
    fillRect() { calls.push(['fillRect', ...arguments]); }
  };
}
function loadFresh(withImage, prevInstall) {
  delete require.cache[MUSE_PATH];
  if (withImage) {
    global.Image = class {
      constructor() { this._src = ''; }
      set src(v) { this._src = v; if (this.onload) this.onload(); }
      get src() { return this._src; }
    };
  } else { delete global.Image; }
  global.window = global;
  global.window.YOUR_V20_INSTALL = prevInstall || undefined;
  global.window.drawObj = undefined;
  return require(MUSE_PATH);
}

let pass = 0;
function check(name, fn) { fn(); pass++; console.log('ok - ' + name); }

/* ---------- phase 1: with an Image (sheet loads) ---------- */
const prevInstallCalls = [];
const MUSE = loadFresh(true, function (X) { prevInstallCalls.push('prev'); });
const home = makeHome();
const F = stubF(home);
const cx = stubCx();
const prevDrawCalls = [];
global.window.drawObj = function (o, t) { prevDrawCalls.push(o.id); };
const X = { G: { map: home }, fn: F, M: { ACTS: {} }, T: 32, MAPS: { HOME: home }, cx, $: () => null, esc: (s) => s };
global.window.YOUR_V20_INSTALL(X);

check('install chain runs previous install, then Muse install', () => {
  assert.deepEqual(prevInstallCalls, ['prev']);
  assert.equal(MUSE.installed, true);
  assert.equal(MUSE.imageLoaded, true);
  assert.equal(MUSE.imageSrc, 'your/assets/muse/muse_home_props.png');
  assert.equal(MUSE.drawWrapped, true);
  assert.equal(MUSE.waterAdded, true);
  assert.equal(MUSE.error, null);
});
check('fridge + bed re-skinned, sofa untouched', () => {
  const byId = Object.fromEntries(home.objs.map((o) => [o.id, o]));
  assert.equal(byId.fridge.museArt, 'fridge');
  assert.equal(byId.bed.museArt, 'bed');
  assert.equal(byId.sofa.museArt, undefined);
  assert.deepEqual(byId.fridge.acts, ['cook', 'harvest', 'order']); // acts unchanged
  assert.deepEqual(MUSE.objectsPatched.slice().sort(), ['bed', 'fridge']);
});
check('Roar Well added at (18,4), blocking its tile, with drink act', () => {
  const w = home.objs.find((o) => o.id === 'muse_water');
  assert.ok(w);
  assert.deepEqual([w.x, w.y, w.w, w.h], [18, 4, 1, 1]);
  assert.equal(home.block[4 * home.w + 18], 1);
  assert.deepEqual(w.acts, ['drink']);
  assert.ok(X.M.ACTS.drink);
  assert.equal(X.M.ACTS.drink.h, 0.25);
  assert.deepEqual(X.M.ACTS.drink.gain, { Fuel: 0.06, Clean: 0.08 });
});
check('install is idempotent (no second water object)', () => {
  MUSE._test.install(X);
  assert.equal(home.objs.filter((o) => o.id === 'muse_water').length, 1);
});
check('walkTile floors fractional coords (blocked tile stays blocked)', () => {
  F.calls.length = 0;
  assert.equal(MUSE._test.walkTile(F, home, 18.5, 4.5), false); // water tile, blocked
  assert.deepEqual(F.calls[0], [18, 4]); // floored, not 18.5/4.5
  assert.equal(MUSE._test.walkTile(F, home, 18.5, 5.5), true); // free kitchen tile
});
check('affordances: food at fridge, rest at bed AND sofa, water at Roar Well', () => {
  const aff = MUSE.affordances('HOME');
  assert.ok(aff.food.length > 0 && aff.food.every((s) => s.objectId === 'fridge'));
  assert.ok(aff.food.every((s) => !mm_blocked(home, Math.floor(s.x), Math.floor(s.y))));
  const restIds = new Set(aff.rest.map((s) => s.objectId));
  assert.ok(restIds.has('bed'), 'bed rest missing');
  assert.ok(restIds.has('sofa'), 'sofa rest missing (v24 couch-only gap)');
  const water = aff.water.filter((s) => s.objectId === 'muse_water');
  assert.ok(water.length > 0, 'no Roar Well water spot');
  assert.ok(water.every((s) => !mm_blocked(home, Math.floor(s.x), Math.floor(s.y))));
});
check('affordances: tile-8 water gives shore spots, never on the water', () => {
  const shore = makeShoreMap();
  const aff = MUSE._test.affordances(stubF(shore), shore);
  assert.ok(aff.water.length > 0);
  assert.ok(aff.water.every((s) => shore.t[Math.floor(s.y) * shore.w + Math.floor(s.x)] !== 8));
  assert.ok(aff.water.every((s) => s.objectId === null && s.kind === 'shore'));
});
check('contract: every object has the Relay 005 fields; use is walkable + adjacent', () => {
  const objs = MUSE.objects('HOME');
  assert.equal(objs.length, home.objs.length);
  for (const c of objs) {
    for (const k of ['id', 'mapId', 'x', 'y', 'w', 'h', 'type', 'use', 'actions', 'resources', 'asset']) assert.ok(k in c, c.id + ' missing ' + k);
    assert.equal(c.mapId, 'HOME');
    const [ux, uy] = c.use;
    assert.ok(!mm_blocked(home, Math.floor(ux), Math.floor(uy)), c.id + ' use spot blocked');
    assert.ok(Math.abs(ux - (c.x + c.w / 2)) <= c.w / 2 + 1.5 && Math.abs(uy - (c.y + c.h / 2)) <= c.h / 2 + 1.5, c.id + ' use spot far from object');
  }
  const fridge = objs.find((c) => c.id === 'fridge');
  assert.equal(fridge.type, 'food');
  assert.equal(fridge.asset, 'muse_home_props.png#fridge');
  assert.equal(fridge.resources.food.kind, 'stand-in');
  const water = objs.find((c) => c.id === 'muse_water');
  assert.equal(water.type, 'water');
  assert.equal(water.resources.drink.available, true);
  const sink = objs.find((c) => c.id === 'sink');
  assert.equal(sink.resources.drink.available, false); // wash only, not a drink source
});
check('drawObj wrap: muse object draws the water cell; plain object falls through', () => {
  const water = home.objs.find((o) => o.id === 'muse_water');
  cx.calls.length = 0; prevDrawCalls.length = 0;
  global.window.drawObj(water, 0);
  const di = cx.calls.find((c) => c[0] === 'drawImage');
  assert.ok(di, 'no drawImage for water');
  assert.equal(di[2], 384); // cell x: water is cell 2 of 192
  assert.equal(di[3], 0); assert.equal(di[4], 192); assert.equal(di[5], 192);
  assert.equal(di[8], 40); // dw = DRAW_W.water(20) * 2
  assert.equal(prevDrawCalls.length, 0, 'muse draw must not also call the old drawObj');
  const sofa = home.objs.find((o) => o.id === 'sofa');
  global.window.drawObj(sofa, 0);
  assert.deepEqual(prevDrawCalls, ['sofa']);
});

/* ---------- phase 2: no Image (sheet missing) — code fallback ---------- */
const MUSE_B = loadFresh(false);
const homeB = makeHome();
const FB = stubF(homeB);
const cxB = stubCx();
const prevB = [];
global.window.drawObj = function (o, t) { prevB.push(o.id); };
const XB = { G: { map: homeB }, fn: FB, M: { ACTS: {} }, T: 32, MAPS: { HOME: homeB }, cx: cxB, $: () => null, esc: (s) => s };
MUSE_B._test.install(XB);
check('sheet missing: muse object still draws (code fallback), never invisible', () => {
  assert.equal(MUSE_B.imageLoaded, false);
  const water = homeB.objs.find((o) => o.id === 'muse_water');
  cxB.calls.length = 0; prevB.length = 0;
  global.window.drawObj(water, 0);
  assert.ok(cxB.calls.some((c) => c[0] === 'fillRect'), 'fallback drew nothing');
  assert.equal(prevB.length, 0);
});

/* ---------- phase 3: shipped files ---------- */
check('embedded data file decodes to the real 768x192 sheet PNG', () => {
  const js = fs.readFileSync(path.join(ROOT, 'your', 'muse', 'muse_home_props_data.js'), 'utf8');
  const m = js.match(/data:image\/png;base64,([A-Za-z0-9+/=]+)/);
  assert.ok(m, 'no base64 data URL in data file');
  const buf = Buffer.from(m[1], 'base64');
  assert.deepEqual([...buf.subarray(0, 8)], [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  assert.equal(buf.readUInt32BE(16), 768);
  assert.equal(buf.readUInt32BE(20), 192);
  const png = fs.readFileSync(path.join(ROOT, 'your', 'assets', 'muse', 'muse_home_props.png'));
  assert.ok(buf.equals(png), 'embedded data must byte-match the shipped PNG');
});
check('cell manifest matches the module cell order', () => {
  const man = JSON.parse(fs.readFileSync(path.join(ROOT, 'your', 'assets', 'muse', 'muse_home_props.json'), 'utf8'));
  assert.equal(man.cell, 192);
  assert.deepEqual(Object.keys(man.cells), ['fridge', 'bed', 'water', 'home']);
  assert.equal(man.cells.water.index, 2);
  assert.equal(man.cells.water.x, 384);
});

console.log('\n' + pass + '/' + pass + ' Muse neighborhood tests passing');
