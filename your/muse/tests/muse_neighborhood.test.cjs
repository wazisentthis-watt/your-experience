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
  assert.equal(MUSE.storeImageLoaded, true);
  assert.equal(MUSE.storeImageSrc, 'your/assets/muse/muse_store_props.png');
  assert.equal(MUSE.drawWrapped, true);
  assert.equal(MUSE.waterAdded, true);
  assert.equal(MUSE.error, null);
  assert.equal(MUSE.storeError, null);
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
check('home exterior: SAV home building draws the sprite (cell 3) when sheet present', () => {
  const bldg = { id: 'home', draw: 'bldg', x: 2, y: 6, w: 5, h: 6, door: [4, 11], use: [4.5, 12.5] };
  X.G.map = { id: 'SAV' }; // wrapper checks the live map id at draw time
  cx.calls.length = 0; prevDrawCalls.length = 0;
  global.window.drawObj(bldg, 0);
  X.G.map = home;
  const di = cx.calls.find((c) => c[0] === 'drawImage');
  assert.ok(di, 'no drawImage for the home building');
  assert.equal(di[2], 576); // cell x: home is cell 3 of 192
  assert.equal(di[3], 0); assert.equal(di[4], 192); assert.equal(di[5], 192);
  assert.equal(di[6], 2 * 32); // X = o.x * T
  assert.equal(di[7], (6 - 1) * 32); // Y = (o.y - 1) * T (roof overhang)
  assert.equal(di[8], 5 * 32); // W = o.w * T
  assert.equal(di[9], (6 + 1) * 32); // H = (o.h + 1) * T
  assert.ok(cx.calls.some((c) => c[0] === 'fillRect'), 'no ground shadow under the sprite');
  assert.equal(prevDrawCalls.length, 0, 'sprite draw must not also call the procedural draw');
  assert.equal(MUSE.homeDrawMode, 'sprite');
  assert.equal(MUSE.status().homeDrawMode, 'sprite');
});
check('sofa rest affordance present in affordances(HOME) (verify, not re-implemented)', () => {
  const aff = MUSE.affordances('HOME');
  assert.ok(aff.rest.some((s) => s.objectId === 'sofa'), 'sofa rest spot missing');
  assert.ok(aff.rest.some((s) => s.objectId === 'bed'), 'bed rest spot missing');
});
function bfsPath(map, startTiles, goalTest) {
  const W = map.w, seen = new Uint8Array(W * map.h), prev = new Int32Array(W * map.h).fill(-1);
  const q = [];
  for (const [sx, sy] of startTiles) {
    if (mm_blocked(map, sx, sy)) continue;
    const i = sy * W + sx; seen[i] = 1; prev[i] = i; q.push(i);
  }
  let qi = 0;
  while (qi < q.length) {
    const c = q[qi++], x = c % W, y = (c / W) | 0;
    if (goalTest(x, y)) {
      const out = []; let n = c;
      while (prev[n] !== n) { out.push([n % W, (n / W) | 0]); n = prev[n]; }
      out.push([n % W, (n / W) | 0]); return out.reverse();
    }
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (mm_blocked(map, nx, ny)) continue;
      const ni = ny * W + nx;
      if (seen[ni]) continue; seen[ni] = 1; prev[ni] = c; q.push(ni);
    }
  }
  return null;
}
check('Roar Well reachable: BFS from spawn to a use spot, water tile stays blocked', () => {
  // Spawn quirk (live game): spawn [10,10.5] floors to tile (10,10), which
  // is a divider-wall tile in the block array; the live game tolerates it
  // only because fractional walk checks are bounds-only (see README).
  // BFS therefore starts from the walkable neighbours of the spawn tile.
  assert.equal(mm_blocked(home, 10, 10), true, 'spawn tile expected blocked (divider wall)');
  const water = home.objs.find((o) => o.id === 'muse_water');
  const spots = MUSE._test.ringSpots(F, home, water).map((s) => [Math.floor(s.x), Math.floor(s.y)]);
  assert.ok(spots.length > 0, 'no Roar Well use spot');
  const starts = [];
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) starts.push([10 + dx, 10 + dy]);
  const path = bfsPath(home, starts, (x, y) => spots.some(([sx, sy]) => sx === x && sy === y));
  assert.ok(path, 'no walkable path from spawn to the Roar Well use spot');
  assert.ok(!path.some(([x, y]) => x === 18 && y === 4), 'path crosses the blocked water tile');
  assert.ok(path.length < 60, 'path implausibly long: ' + path.length);
  assert.ok(path.every(([x, y]) => !mm_blocked(home, x, y)), 'path crosses a blocked tile');
});

/* ---------- phase 1b: corner store (Relay 009 P2) ---------- */
function makeSav() {
  const W = 44, H = 32;
  const m = { id: 'SAV', w: W, h: H, t: new Uint8Array(W * H).fill(0), objs: [], props: [], block: new Uint8Array(W * H) };
  for (const [x, y] of [[8, 2], [11, 3], [14, 2]]) { m.t[y * W + x] = 6; m.block[y * W + x] = 1; } // trees the widened store footprint covers
  m.objs.push({ id: 'home', name: 'Your Place', x: 2, y: 6, w: 5, h: 6, draw: 'bldg', enter: 'HOME', door: [4, 11], use: [4.5, 12.5] });
  return m;
}
/* M.buy mirror for the stocked items only (read at index.html:1377-1400):
 * cost = price + 5% base city tax (no taxCut), groceries +5 meals,
 * mealprep Fuel +.45, pie/snack Fuel +.15 Play +.08, berry Fuel/Rest +.18,
 * roar lifts Fuel/Rest to >= .3, donut Fuel +.3 (cap 1.25) Play +.35.
 * The live shop path (openShop -> M.buy) is NOT verified here (no browser). */
const STORE_ITEMS = {
  groceries: { price: 40 }, mealprep: { price: 25 }, pie: { price: 6 }, donut: { price: 12 },
  roar: { price: 180 }, snack: { price: 4 }, berry: { price: 65 }
};
function stubBuy(S, id) {
  const it = STORE_ITEMS[id]; if (!it) return 'unknown item ' + id;
  const cost = Math.round(it.price * 1.05 * 100) / 100;
  if (S.money < cost) return 'Need $' + Math.ceil(cost);
  S.money = Math.round((S.money - cost) * 100) / 100;
  if (id === 'groceries') S.groceries = (S.groceries || 0) + 5;
  else if (id === 'mealprep') S.slots.Fuel = Math.min(1, S.slots.Fuel + .45);
  else if (id === 'pie' || id === 'snack') { S.slots.Fuel = Math.min(1, S.slots.Fuel + .15); S.slots.Play = Math.min(1, S.slots.Play + .08); }
  else if (id === 'berry') { for (const k of ['Fuel', 'Rest']) S.slots[k] = Math.min(1, S.slots[k] + .18); }
  else if (id === 'roar') { for (const k of ['Fuel', 'Rest']) S.slots[k] = Math.max(S.slots[k], .3); }
  else if (id === 'donut') { S.slots.Fuel = Math.min(1.25, S.slots.Fuel + .3); S.slots.Play = Math.min(1.25, S.slots.Play + .35); }
  return '';
}

check('store: SAV building added at BK2 row (7x4), footprint blocked, trees cleared', () => {
  const sav = makeSav();
  X.MAPS.SAV = sav;
  MUSE._test.install(X);
  const b = sav.objs.find((o) => o.id === 'muse_store');
  assert.ok(b, 'no muse_store building in SAV');
  assert.deepEqual([b.x, b.y, b.w, b.h], [8, 1, 7, 4]);
  assert.equal(b.enter, 'STORE');
  assert.deepEqual(b.door, [11, 4]);
  assert.deepEqual(b.use, [11.5, 5.5]);
  for (let y = 1; y <= 4; y++) for (let x = 8; x <= 14; x++) assert.equal(sav.block[y * sav.w + x], 1, 'footprint tile not blocked: ' + x + ',' + y);
  for (const [x, y] of [[8, 2], [11, 3], [14, 2]]) assert.equal(sav.t[y * sav.w + x], 0, 'tree not cleared at ' + x + ',' + y);
  assert.equal(mm_blocked(sav, 11, 5), false, 'store use spot blocked');
  assert.ok(X.MAPS.STORE, 'MAPS.STORE missing');
  assert.equal(X.MAPS.STORE.spawn.join(','), '10,10.5');
  MUSE._test.install(X);
  assert.equal(sav.objs.filter((o) => o.id === 'muse_store').length, 1, 'store building duplicated on re-install');
});
check('store map: walkable aisles, blocked shelves/counter/fridge, door gap open', () => {
  const st = MUSE._test.buildStoreMap();
  assert.equal(st.id, 'STORE');
  assert.deepEqual([st.w, st.h], [20, 13]);
  assert.equal(mm_blocked(st, 9, 12), false, 'door gap tile (9,12) blocked');
  assert.equal(mm_blocked(st, 10, 12), false, 'door gap tile (10,12) blocked');
  assert.equal(mm_blocked(st, 10, 10), false, 'spawn tile blocked');
  for (const [x, y] of [[3, 2], [7, 2], [15, 2], [16, 3], [3, 5], [6, 5], [3, 9], [12, 6], [15, 6]]) assert.equal(mm_blocked(st, x, y), true, 'fixture tile not blocked: ' + x + ',' + y);
  for (const [x, y] of [[9, 3], [10, 4], [11, 7], [10, 10], [8, 9]]) assert.equal(mm_blocked(st, x, y), false, 'aisle tile blocked: ' + x + ',' + y);
  const byId = Object.fromEntries(st.objs.map((o) => [o.id, o]));
  for (const id of ['store_counter', 'store_fridge', 'store_shelf1', 'store_shelf2']) {
    assert.deepEqual(byId[id].acts, ['market'], id + ' has no market act');
    assert.ok(byId[id].shop.length > 0, id + ' has no shop stock');
    for (const item of byId[id].shop) assert.ok(STORE_ITEMS[item], id + ' stocks unknown item ' + item);
  }
  assert.equal(byId.store_shelf3.acts, undefined, 'display shelf should have no shop act');
  const starts = [[10, 10], [9, 10], [11, 10], [10, 11], [10, 9]];
  for (const targetId of ['store_counter', 'store_fridge', 'store_shelf1', 'store_shelf2']) {
    const o = byId[targetId];
    const spots = MUSE._test.ringSpots(stubF(st), st, o).map((s) => [Math.floor(s.x), Math.floor(s.y)]);
    assert.ok(spots.length > 0, targetId + ' has no use spot');
    const path = bfsPath(st, starts, (x, y) => spots.some(([sx, sy]) => sx === x && sy === y));
    assert.ok(path, 'no walkable path from store spawn to ' + targetId);
    assert.ok(path.length < 60, targetId + ' path implausibly long: ' + path.length);
  }
});
check('store purchase: buying deducts taxed money and adds to inventory (M.buy mirror)', () => {
  const st = MUSE._test.buildStoreMap();
  const byId = Object.fromEntries(st.objs.map((o) => [o.id, o]));
  const S = { money: 100, groceries: 0, slots: { Fuel: 0.5, Play: 0.5, Rest: 0.5 }, inv: {} };
  assert.equal(stubBuy(S, 'groceries'), '');
  assert.equal(S.money, 58, 'groceries should cost $40 + 5% tax = $42');
  assert.equal(S.groceries, 5);
  assert.equal(stubBuy(S, 'snack'), '');
  assert.equal(S.money, 53.8, 'snack should cost $4 + 5% tax = $4.20');
  assert.equal(S.slots.Fuel, 0.65);
  assert.ok(stubBuy(S, 'roar').startsWith('Need $'), 'roar ($189 taxed) should be unaffordable at $53.80');
  assert.equal(S.money, 53.8, 'failed purchase must not deduct money');
  assert.ok(byId.store_counter.shop.includes('groceries'), 'counter does not stock groceries');
  assert.ok(byId.store_fridge.shop.includes('roar'), 'fridge does not stock roar');
});
check('store affordances: food at counter/fridge/shelves, water at fridge, all walkable', () => {
  const st = X.MAPS.STORE;
  assert.ok(st, 'MAPS.STORE missing (install must have added it)');
  const aff = MUSE.affordances('STORE');
  const foodIds = new Set(aff.food.map((s) => s.objectId));
  for (const id of ['store_counter', 'store_fridge', 'store_shelf1', 'store_shelf2']) assert.ok(foodIds.has(id), id + ' missing from food affordances');
  assert.ok(!foodIds.has('store_shelf3'), 'display shelf must not be a food affordance');
  const waterIds = new Set(aff.water.map((s) => s.objectId));
  assert.ok(waterIds.has('store_fridge'), 'fridge missing from water affordances');
  for (const list of [aff.food, aff.water]) assert.ok(list.every((s) => !mm_blocked(st, Math.floor(s.x), Math.floor(s.y))), 'affordance spot blocked');
  const c = MUSE.objects('STORE').find((o) => o.id === 'store_fridge');
  assert.equal(c.resources.food.kind, 'shop');
  assert.equal(c.resources.drink.kind, 'shop');
  assert.equal(MUSE.objects('STORE').find((o) => o.id === 'store_counter').resources.food.kind, 'shop');
});
check('store exterior: SAV store building draws the sprite (cell 0) when sheet present', () => {
  const bldg = { id: 'muse_store', draw: 'bldg', x: 8, y: 1, w: 7, h: 4, door: [11, 4], use: [11.5, 5.5] };
  X.G.map = { id: 'SAV' };
  cx.calls.length = 0; prevDrawCalls.length = 0;
  global.window.drawObj(bldg, 0);
  X.G.map = home;
  const di = cx.calls.find((c) => c[0] === 'drawImage');
  assert.ok(di, 'no drawImage for the store building');
  assert.equal(di[2], 0); // cell x: exterior is cell 0
  assert.equal(di[6], 8 * 32);
  assert.equal(di[7], (1 - 1) * 32);
  assert.equal(di[8], 7 * 32);
  assert.equal(di[9], (4 + 1) * 32);
  assert.equal(prevDrawCalls.length, 0, 'sprite draw must not also call the procedural draw');
  assert.equal(MUSE.storeDrawMode, 'sprite');
});
check('store objects draw their sheet cells (shelf, fridge, counter)', () => {
  const st = X.MAPS.STORE;
  const shelf = st.objs.find((o) => o.id === 'store_shelf1');
  cx.calls.length = 0; prevDrawCalls.length = 0;
  global.window.drawObj(shelf, 0);
  let di = cx.calls.find((c) => c[0] === 'drawImage');
  assert.ok(di, 'no drawImage for the shelf');
  assert.equal(di[2], 192); // cell 1
  assert.equal(di[8], 120); // dw = STORE_DRAW_W.shelf(60) * 2
  const fridge = st.objs.find((o) => o.id === 'store_fridge');
  cx.calls.length = 0;
  global.window.drawObj(fridge, 0);
  di = cx.calls.find((c) => c[0] === 'drawImage');
  assert.ok(di, 'no drawImage for the store fridge');
  assert.equal(di[2], 384); // cell 2
  assert.equal(di[8], 40); // dw = STORE_DRAW_W.fridge(20) * 2
  const counter = st.objs.find((o) => o.id === 'store_counter');
  cx.calls.length = 0;
  global.window.drawObj(counter, 0);
  di = cx.calls.find((c) => c[0] === 'drawImage');
  assert.ok(di, 'no drawImage for the counter');
  assert.equal(di[2], 576); // cell 3
  assert.equal(di[8], 140); // dw = STORE_DRAW_W.counter(70) * 2
  assert.equal(prevDrawCalls.length, 0, 'store objects must not fall through to the old drawObj');
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
check('home exterior: procedural fallback when sheet absent', () => {
  const bldg = { id: 'home', draw: 'bldg', x: 2, y: 6, w: 5, h: 6, door: [4, 11], use: [4.5, 12.5] };
  XB.G.map = { id: 'SAV' };
  cxB.calls.length = 0; prevB.length = 0;
  global.window.drawObj(bldg, 0);
  XB.G.map = homeB;
  assert.equal(cxB.calls.filter((c) => c[0] === 'drawImage').length, 0, 'no sprite without the sheet');
  assert.deepEqual(prevB, ['home'], 'procedural draw not called for the home building');
  assert.equal(MUSE_B.homeDrawMode, 'procedural');
});
check('store sheet missing: store object still draws (code fallback), never invisible', () => {
  assert.equal(MUSE_B.storeImageLoaded, false);
  const shelf = { id: 'store_shelf1', draw: 'muse', museArt: 'store_shelf', x: 3, y: 5, w: 4, h: 1 };
  cxB.calls.length = 0; prevB.length = 0;
  global.window.drawObj(shelf, 0);
  assert.ok(cxB.calls.some((c) => c[0] === 'fillRect'), 'store fallback drew nothing');
  assert.equal(prevB.length, 0);
});
check('store exterior: procedural fallback when sheet absent', () => {
  const bldg = { id: 'muse_store', draw: 'bldg', x: 8, y: 1, w: 7, h: 4, door: [11, 4], use: [11.5, 5.5] };
  XB.G.map = { id: 'SAV' };
  cxB.calls.length = 0; prevB.length = 0;
  global.window.drawObj(bldg, 0);
  XB.G.map = homeB;
  assert.equal(cxB.calls.filter((c) => c[0] === 'drawImage').length, 0, 'no sprite without the sheet');
  assert.deepEqual(prevB, ['muse_store'], 'procedural draw not called for the store building');
  assert.equal(MUSE_B.storeDrawMode, 'procedural');
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
check('store data file decodes to the real 768x192 store sheet PNG', () => {
  const js = fs.readFileSync(path.join(ROOT, 'your', 'muse', 'muse_store_props_data.js'), 'utf8');
  const m = js.match(/data:image\/png;base64,([A-Za-z0-9+/=]+)/);
  assert.ok(m, 'no base64 data URL in store data file');
  const buf = Buffer.from(m[1], 'base64');
  assert.deepEqual([...buf.subarray(0, 8)], [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  assert.equal(buf.readUInt32BE(16), 768);
  assert.equal(buf.readUInt32BE(20), 192);
  const png = fs.readFileSync(path.join(ROOT, 'your', 'assets', 'muse', 'muse_store_props.png'));
  assert.ok(buf.equals(png), 'embedded store data must byte-match the shipped PNG');
});
check('store cell manifest matches the module cell order', () => {
  const man = JSON.parse(fs.readFileSync(path.join(ROOT, 'your', 'assets', 'muse', 'muse_store_props.json'), 'utf8'));
  assert.equal(man.cell, 192);
  assert.deepEqual(Object.keys(man.cells), ['exterior', 'shelf', 'fridge', 'counter']);
  assert.equal(man.cells.fridge.index, 2);
  assert.equal(man.cells.fridge.x, 384);
  assert.equal(man.cells.counter.index, 3);
});
check('home sheet untouched by the store work (no reorder, no resize)', () => {
  const png = fs.readFileSync(path.join(ROOT, 'your', 'assets', 'muse', 'muse_home_props.png'));
  assert.equal(png.readUInt32BE(16), 768);
  assert.equal(png.readUInt32BE(20), 192);
  const man = JSON.parse(fs.readFileSync(path.join(ROOT, 'your', 'assets', 'muse', 'muse_home_props.json'), 'utf8'));
  assert.deepEqual(Object.keys(man.cells), ['fridge', 'bed', 'water', 'home']);
});

console.log('\n' + pass + '/' + pass + ' Muse neighborhood tests passing');
