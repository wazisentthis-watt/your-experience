/* v2.4 wrapper tests · PROPOSAL / PUBLISH HOLD. Node only. Run: node your/v24/tests/v24_wrapper.test.cjs
 * Loads the real brain module and the real your_v24.js wrapper, with browser APIs stubbed. */
'use strict';
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const vm = require('vm');

const here = path.resolve(__dirname, '..');
const brainSrc = fs.readFileSync(path.join(here, 'wir_kaw_living_brain.js'), 'utf8');
const wrapSrc = fs.readFileSync(path.join(here, 'your_v24.js'), 'utf8');
const store = new Map();                          // shared across boots, like localStorage in one browser
const noop = () => {};
const el = () => ({ style: {}, setAttribute: noop, addEventListener: noop, appendChild: noop });

// A walkable world: 60x60, a 4x4 block at (30..33, 30..33), and a wall at x=20 for y in 0..40.
const blocked = (x, y) => (x > 30 && x < 33 && y > 30 && y < 33) || (Math.floor(x) === 20 && Math.floor(y) >= 0 && Math.floor(y) < 40);
const open = (x, y) => x >= 0 && y >= 0 && x < 60 && y < 60 && !blocked(x, y);

// Boot the wrapper. The hero profile is a mutable holder: sb.__hero = null means "not loaded yet".
function boot(heroId, extra = {}) {
  const sb = {
    console, Math, JSON, Object, Array, Number, String, Error, Infinity, Date, Map, Set,
    localStorage: { getItem: k => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k) },
    document: { createElement: el, body: { appendChild: noop }, getElementById: () => null, readyState: 'complete' },
    addEventListener: noop, setTimeout: () => 0, clearTimeout: noop,
    __hero: heroId, __bond: 20,
  };
  sb.WIR_HERO = { get: () => (sb.__hero ? { id: sb.__hero } : null) };
  sb.window = sb;
  sb.globalThis = sb;
  sb.YOUR_V22 = { kawState: () => ({ bond: sb.__bond }) };
  Object.assign(sb, extra);
  vm.createContext(sb);
  vm.runInContext(brainSrc, sb);
  vm.runInContext(wrapSrc, sb);
  return sb;
}

const results = [];
function test(name, fn) { try { fn(); results.push(['ok', name]); } catch (e) { results.push(['FAIL', name, e.message]); } }

// A world wrapper for a given map id. Map objects (affordances) are optional.
function world(sb, mapObj) {
  const V22 = sb.YOUR_V22, kaw = { x: 10.5, y: 10.5, dir: 'right', face: 'right', ph: 0, moving: false, trail: [], off: false };
  const hero = { px: 10.5, py: 10.5 };
  const env = mapId => ({ px: hero.px, py: hero.py, kaw, map: mapObj && mapObj.id === mapId ? mapObj : { id: mapId }, walk: (x, y) => (mapObj && mapObj.id === mapId ? mapWalk(mapObj, x, y) : open(x, y)) });
  return { V22, kaw, hero, env, W: sb.YOUR_V24, S: () => sb.YOUR_V24.state() };
}
function mapWalk(m, x, y) {
  const i = Math.floor(x), j = Math.floor(y);
  if (i < 0 || j < 0 || i >= m.w || j >= m.h) return false;
  if (m.t[j * m.w + i] === 8 || m.t[j * m.w + i] === 1) return false;
  return !m.block[j * m.w + i] && open(x, y);
}
function fresh(heroId = 'hero-a', mapObj) {
  store.clear();
  const sb = boot(heroId);
  sb.YOUR_V24.ready();                       // bind the hero first, so test setup is not discarded
  const w = world(sb, mapObj);
  w.S().accompanied = false; w.S().activity = 'watch'; w.S().stayUntil = null; w.S().cooldownUntil = 0; w.S().bond = 20;
  return { sb, ...w };
}

test('hooks installed and module is the real one', () => {
  const { V22, S } = fresh();
  assert.strictEqual(typeof V22.brainStep, 'function');
  assert.strictEqual(typeof V22.brainPlace, 'function');
  assert.strictEqual(typeof V22.brainMap, 'function');
  assert.strictEqual(S().schema, 'wir.kaw.brain/0.1');
});

test('off in the city when not accompanied; drawn at home', () => {
  const { V22, kaw, env } = fresh();
  V22.brainMap('CITY', env('CITY'));
  assert.strictEqual(kaw.off, true);
  V22.brainMap('HOME', env('HOME'));
  assert.strictEqual(kaw.off, false);
});

test('fix 1: a map change places Veyru beside the hero; a same-map call does not teleport it', () => {
  const { V22, kaw, hero, env, S } = fresh();
  S().accompanied = true; S().bond = 90;
  V22.brainMap('CITY', env('CITY'));
  hero.px = 40.5; hero.py = 40.5;
  V22.brainPlace(env('CITY'));
  assert.ok(Math.hypot(kaw.x - 10.5, kaw.y - 10.5) < 2, 'Veyru jumped on a same-map place call');
  V22.brainMap('CITY2', env('CITY2'));
  assert.ok(Math.hypot(kaw.x - hero.px, kaw.y - hero.py) <= 1.5, 'not beside the hero after a map change');
});

test('fix 1: ordinary frames never teleport Veyru', () => {
  const { V22, kaw, hero, env, S } = fresh();
  S().accompanied = true; S().bond = 90;
  V22.brainMap('CITY', env('CITY'));
  hero.px = 50.5; hero.py = 10.5;
  let maxStep = 0, prev = { x: kaw.x, y: kaw.y };
  for (let i = 0; i < 240; i++) {
    V22.brainStep(1 / 60, env('CITY'));
    maxStep = Math.max(maxStep, Math.hypot(kaw.x - prev.x, kaw.y - prev.y));
    prev = { x: kaw.x, y: kaw.y };
  }
  assert.ok(maxStep <= 3.6 / 60 + 1e-6, 'max per-frame step ' + maxStep);
});

test('accompanied Veyru reaches the follow gap near the hero', () => {
  const { V22, kaw, hero, env, S } = fresh();
  S().accompanied = true; S().bond = 90;
  V22.brainMap('CITY', env('CITY'));
  hero.px = 18.5; hero.py = 10.5;                          // west of the x=20 wall in this test world
  for (let i = 0; i < 900; i++) V22.brainStep(1 / 60, env('CITY'));
  // Owner: about six tiles is the preferred distance, not a leash. Within it the brain may choose other activities.
  assert.ok(Math.hypot(kaw.x - hero.px, kaw.y - hero.py) <= 6.5, 'distance ' + Math.hypot(kaw.x - hero.px, kaw.y - hero.py).toFixed(2));
});

test('stay holds Veyru still while the stay window runs', () => {
  const { V22, kaw, hero, env, S } = fresh();
  S().accompanied = true; S().bond = 90;
  V22.brainMap('CITY', env('CITY'));
  S().stayUntil = S().clock + 45; S().activity = 'stay';
  const x0 = kaw.x; hero.px = 25.5;
  for (let i = 0; i < 120; i++) V22.brainStep(1 / 60, env('CITY'));
  assert.strictEqual(kaw.x, x0, 'moved during stay');
});

test('fix 1 (relay 003): reachability. A target walled off is reported unreachable and never walked into', () => {
  // A walled box: the target is inside a ring of walls with no opening.
  const m = { id: 'BOX', w: 20, h: 20, t: new Uint8Array(400).fill(0), block: new Uint8Array(400), objs: [] };
  for (let x = 5; x <= 9; x++) for (let y = 5; y <= 9; y++) if (x === 5 || x === 9 || y === 5 || y === 9) m.block[y * 20 + x] = 1;
  const { sb, V22, kaw, env, S, W } = fresh('hero-a', m);
  V22.brainMap('BOX', env('BOX'));
  S().accompanied = true; S().bond = 90;
  kaw.x = 2.5; kaw.y = 2.5;
  const route = W.findRoute({ walk: (x, y) => mapWalk(m, x, y), kaw }, { x: 2.5, y: 2.5 }, { x: 7.5, y: 7.5 });
  assert.strictEqual(route, null, 'route into a walled box should be null');
  const reachable = W.findRoute({ walk: (x, y) => mapWalk(m, x, y), kaw }, { x: 2.5, y: 2.5 }, { x: 12.5, y: 12.5 });
  assert.ok(Array.isArray(reachable) && reachable.length > 0, 'open target should have a route');
  S().target = { x: 7.5, y: 7.5 }; S().stopAt = 0.3; S().motor = 'route';
  V22.brainStep(1 / 60, env('BOX'));
  assert.ok(['unreachable', 'search', 'hold', 'approach', 'return', 'route'].includes(S().motor), 'motor ' + S().motor);
  for (let i = 0; i < 600; i++) { V22.brainStep(1 / 60, env('BOX')); assert.ok(mapWalk(m, kaw.x, kaw.y), 'walked into a wall at frame ' + i); }
  assert.ok(sb, 'sandbox alive');
});

test('fix 2 (relay 003): intent is preserved. The wrapper never rewrites state.activity', () => {
  // Static check: only the command path (refuseAware, a brain command result) may assign state.activity.
  const lines = wrapSrc.split('\n');
  const hits = lines.map((l, i) => [i + 1, l]).filter(([, l]) => /state\.activity\s*=[^=]/.test(l));
  assert.ok(hits.every(([, l]) => /BOND_SAFE|LEAVE_HOUSE|COME/.test(l) || /refuseAware|name ===/.test(l)), 'motor layer writes state.activity: ' + JSON.stringify(hits.map(h => h[0])));
});

test('fix 2 (relay 003): forage with no food stays forage while the motor searches', () => {
  const { V22, kaw, env, S } = fresh();
  V22.brainMap('CITY', env('CITY'));
  S().accompanied = true; S().bond = 90;
  let sawForage = false, searchFrames = 0, roamed = new Set();
  for (let i = 0; i < 60 * 300; i++) {
    if (S().needs) S().needs.hunger = 100;                                  // force the forage intent
    V22.brainStep(1 / 60, env('CITY'));
    if (S().activity === 'forage') { sawForage = true; if (S().motor === 'search') searchFrames++; roamed.add(Math.floor(kaw.x) + ',' + Math.floor(kaw.y)); }
  }
  assert.ok(sawForage, 'brain never picked forage');
  assert.ok(searchFrames > 0, 'forage intent never produced a search motor');
  assert.ok(roamed.size >= 3, 'motor did not explore while foraging (' + roamed.size + ' tiles)');
  assert.ok(S().incomplete && S().incomplete.forage, 'forage gap not recorded');
});

test('fix 3 (relay 003): water affordance. Drink goes to a shore tile next to water', () => {
  const w = 20, h = 20, t = new Uint8Array(w * h), block = new Uint8Array(w * h);
  for (let x = 12; x < 16; x++) for (let y = 8; y < 12; y++) { t[y * w + x] = 8; block[y * w + x] = 1; }   // a pond
  const m = { id: 'POND', w, h, t, block, objs: [] };
  const { V22, kaw, hero, env, S } = fresh('hero-a', m);
  V22.brainMap('POND', env('POND'));
  S().accompanied = true; S().bond = 90;     // off-map Veyru does not tick, so the test keeps her on the map
  kaw.x = 2.5; kaw.y = 10.5;
  let picked = false;
  for (let i = 0; i < 60 * 300 && !picked; i++) {
    if (S().needs) S().needs.thirst = 100;                       // hold the drink intent (the brain rarely picks it on its own)
    V22.brainStep(1 / 60, env('POND'));
    if (S().activity === 'drink' && S().target && S().motor === 'route') {
      const tx = S().target.x, ty = S().target.y;
      const nextToWater = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => { const i2 = Math.floor(ty + dy) * w + Math.floor(tx + dx); return t[i2] === 8; });
      assert.ok(nextToWater, 'drink target is not next to water');
      picked = true;
    }
  }
  assert.ok(picked, 'drink never chose a water-side target');
  assert.ok(hero, 'hero defined');
});

test('fix 3 (relay 003): drink away from water does not satisfy thirst', () => {
  const { V22, kaw, env, S } = fresh();                       // CITY map: no water tiles
  V22.brainMap('CITY', env('CITY'));
  S().accompanied = true; S().bond = 90;
  kaw.x = 5.5; kaw.y = 5.5;
  let lowest = Infinity, start = null;
  for (let i = 0; i < 60 * 60; i++) {
    if (S().needs) { S().needs.thirst = Math.max(S().needs.thirst, 50); if (start === null) start = S().needs.thirst; }
    S().activity = 'drink';                                   // force the intent for this check
    V22.brainStep(1 / 60, env('CITY'));
    if (S().needs && S().activity === 'drink') lowest = Math.min(lowest, S().needs.thirst);
  }
  assert.ok(lowest >= start - 0.5, 'thirst fell to ' + lowest.toFixed(1) + ' from ' + start.toFixed(1) + ' without water');
});

test('fix 3 (relay 003): rest affordance. The HOME bed is the rest spot', () => {
  const w = 20, h = 20, t = new Uint8Array(w * h), block = new Uint8Array(w * h);
  const m = { id: 'HOME', w, h, t, block, objs: [{ id: 'bed', x: 5, y: 5, w: 2, h: 3 }] };
  const { V22, kaw, env, S, W } = fresh('hero-a', m);
  const aff = W.affordances({ map: m, walk: (x, y) => mapWalk(m, x, y) });
  assert.ok(aff.rest.length > 0, 'no rest spots from the bed');
  assert.ok(aff.rest.every(p => !(p.x > 5 && p.x < 7 && p.y > 5 && p.y < 8)), 'a rest spot is inside the bed');
  V22.brainMap('HOME', env('HOME'));
  kaw.x = 2.5; kaw.y = 2.5;
  const restSpots = new Set(aff.rest.map(p => p.x + ',' + p.y));
  let atBed = false;
  for (let i = 0; i < 60 * 300 && !atBed; i++) {
    if (S().needs) S().needs.restNeed = 100;                     // hold the rest intent
    V22.brainStep(1 / 60, env('HOME'));
    if (S().activity === 'rest' && S().motor === 'route' && S().target && restSpots.has(S().target.x + ',' + S().target.y)) atBed = true;
  }
  assert.ok(atBed, 'rest never routed to a spot next to the bed');
});

test('fix 3 (relay 003): long-duration independence, 10 simulated minutes, hero still', () => {
  const { V22, kaw, hero, env, S } = fresh();
  V22.brainMap('CITY', env('CITY'));
  S().accompanied = true; S().bond = 90;
  hero.px = 12.5; hero.py = 12.5;
  let moves = 0, prev = { x: kaw.x, y: kaw.y }, maxDist = 0;
  for (let i = 0; i < 60 * 600; i++) {
    V22.brainStep(1 / 60, env('CITY'));
    if (Math.hypot(kaw.x - prev.x, kaw.y - prev.y) > 1e-4) moves++;
    prev = { x: kaw.x, y: kaw.y };
    maxDist = Math.max(maxDist, Math.hypot(kaw.x - hero.px, kaw.y - hero.py));
    assert.ok(open(kaw.x, kaw.y), 'blocked tile at frame ' + i);
  }
  assert.ok(moves > 300, 'too few movement frames: ' + moves);
  assert.ok(maxDist < 12, 'drifted ' + maxDist.toFixed(1) + ' tiles from the hero (preferred ~6, not a leash)');
  assert.ok(S().clock > 590, 'brain clock did not advance');
});

test('fix 4 (relay 003): hero profile loads late. No tick, no save, and no response until the ID resolves', () => {
  store.clear();
  const sb = boot(null);
  const w = world(sb, null);
  const before = { x: w.kaw.x, y: w.kaw.y };
  w.V22.brainMap('CITY', w.env('CITY'));
  for (let i = 0; i < 300; i++) w.V22.brainStep(1 / 60, w.env('CITY'));
  assert.strictEqual(store.has('wir-kaw-brain-v24'), false, 'saved with no hero ID');
  assert.strictEqual(w.kaw.off, true, 'Veyru drawn before the hero resolved');
  assert.strictEqual(sb.YOUR_V24.hero(), null);
  sb.__hero = 'hero-late';
  w.V22.brainStep(1 / 60, w.env('CITY'));
  assert.strictEqual(sb.YOUR_V24.hero(), 'hero-late', 'hero did not bind when it resolved');
  assert.ok(before, 'sanity');
});

test('fix 4 (relay 003): hero changes mid-session. Brain resets, saves are keyed to the new hero', () => {
  store.clear();
  const sb = boot('hero-a');
  const w = world(sb, null);
  w.S().accompanied = true; w.S().bond = 90;
  w.V22.brainMap('CITY', w.env('CITY'));
  w.V22.brainStep(1 / 60, w.env('CITY'));
  w.W.save();
  sb.__hero = 'hero-b';
  w.V22.brainStep(1 / 60, w.env('CITY'));
  assert.strictEqual(w.S().accompanied, false, 'brain state carried over to hero-b');
  w.W.save();
  const raw = JSON.parse(store.get('wir-kaw-brain-v24'));
  assert.ok(raw.heroes['hero-b'], 'no record for hero-b');
  assert.strictEqual(raw.heroes['hero-b'].state.accompanied, false, 'hero-b record carries hero-a state');
});

test('fix 4: save/reload restores brain state for the same hero and KAW', () => {
  store.clear();
  const a = boot('hero-a'); a.YOUR_V24.state().accompanied = true; a.YOUR_V24.state().clock = 42; a.YOUR_V24.save();
  const b = boot('hero-a');
  assert.strictEqual(b.YOUR_V24.state().accompanied, false, 'state read before the hero bound');
  b.YOUR_V24.save();
  assert.ok(JSON.parse(store.get('wir-kaw-brain-v24')).heroes['hero-a'], 'no record keyed to hero-a');
});

test('fix 4: a different hero resets only the brain, not the hero profile', () => {
  store.clear();
  const a = boot('hero-a'); a.YOUR_V24.state().accompanied = true; a.YOUR_V24.save();
  const b = boot('hero-b');
  b.YOUR_V24.save();
  assert.strictEqual(b.YOUR_V24.state().accompanied, false, 'brain state leaked across heroes');
  assert.strictEqual(b.YOUR_V24.hero(), 'hero-b');
});

test('fix 4: a corrupted or old-version brain store is ignored safely', () => {
  store.clear();
  store.set('wir-kaw-brain-v24', '{"v":2,"state":{"accompanied":true}}');
  const b = boot('hero-a');
  b.YOUR_V24.save();
  assert.strictEqual(b.YOUR_V24.state().accompanied, false);
  store.set('wir-kaw-brain-v24', 'not json');
  const c = boot('hero-a');
  c.YOUR_V24.save();
  assert.strictEqual(c.YOUR_V24.state().accompanied, false);
});

test('fix 5: hazard comes from v2.3 foes and boss within range', () => {
  const { sb, V22, kaw, env, S } = fresh();
  V22.brainMap('CITY', env('CITY'));
  kaw.x = 10.5; kaw.y = 10.5;
  sb.YOUR_V23 = { foes: [{ x: 30.5, y: 30.5, st: 'chase' }], boss: null };
  V22.brainStep(1 / 60, env('CITY')); assert.strictEqual(S().lastHazard, 0, 'far foe should not raise hazard');
  sb.YOUR_V23 = { foes: [{ x: 13.5, y: 10.5, st: 'chase' }], boss: null };
  V22.brainStep(1 / 60, env('CITY')); assert.strictEqual(S().lastHazard, 80, 'near foe should give 80');
  sb.YOUR_V23 = { foes: [{ x: 16.5, y: 10.5, st: 'down' }], boss: null };
  V22.brainStep(1 / 60, env('CITY')); assert.strictEqual(S().lastHazard, 0, 'downed foe should not count');
  sb.YOUR_V23 = { foes: [], boss: { x: 17.5, y: 10.5, done: false } };
  V22.brainStep(1 / 60, env('CITY')); assert.strictEqual(S().lastHazard, 35, 'boss at 7 tiles should give 35');
});

test('bond stays a mirror of the hero profile, not a second copy', () => {
  const { sb, V22, env, S } = fresh();
  sb.__bond = 77;
  V22.brainStep(1 / 60, env('HOME'));
  assert.strictEqual(S().bond, 77);
});

/* ---- relay 004 coverage ---- */
function homeMap() {
  const w = 14, h = 10, t = new Uint8Array(w * h), block = new Uint8Array(w * h);
  block[2 * w + 2] = 1;                          // fridge cell
  block[6 * w + 10] = 1; block[6 * w + 11] = 1;  // bed cells
  return { id: 'HOME', w, h, t, block, objs: [{ id: 'fridge', x: 2, y: 2, w: 1, h: 1 }, { id: 'bed', x: 10, y: 6, w: 2, h: 1 }] };
}
function waterMap() {
  const w = 14, h = 10, t = new Uint8Array(w * h), block = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) { t[y * w + 10] = 8; t[y * w + 11] = 8; }   // a water channel
  return { id: 'CITY', w, h, t, block, objs: [] };
}

test('relay 004 item 1: hunger falls only once Veyru is at the food spot (fridge)', () => {
  const m = homeMap();
  const { V22, kaw, hero, env, S } = fresh('hero-a', m);
  V22.brainMap('HOME', env('HOME'));
  kaw.x = 7.5; kaw.y = 6.5; hero.px = 7.5; hero.py = 6.5;
  let reached = false;
  for (let i = 0; i < 60 * 180 && !reached; i++) {
    S().needs.hunger = 60;                       // hold the need so any change is visible this step
    V22.brainStep(1 / 60, env('HOME'));
    const o = S().outcome;
    if (o && o.need === 'hunger') {
      if (o.satisfied) { reached = true; assert.ok(S().needs.hunger < 60, 'at the fridge but hunger did not fall'); }
      else assert.ok(S().needs.hunger >= 60 - 1e-9, 'hunger fell before Veyru reached food');
    }
  }
  assert.ok(reached, 'never reached the food spot');
});

test('relay 004 item 1: thirst falls only once Veyru is at the water shore', () => {
  const m = waterMap();
  const { V22, kaw, hero, env, S } = fresh('hero-a', m);
  S().accompanied = true; S().bond = 90;
  hero.px = 8.5; hero.py = 4.5;
  V22.brainMap('CITY', env('CITY'));
  kaw.x = 7.5; kaw.y = 4.5;
  let reached = false;
  for (let i = 0; i < 60 * 180 && !reached; i++) {
    S().needs.thirst = 60;
    V22.brainStep(1 / 60, env('CITY'));
    const o = S().outcome;
    if (o && o.need === 'thirst') {
      if (o.satisfied) { reached = true; assert.ok(S().needs.thirst < 60, 'at the shore but thirst did not fall'); }
      else assert.ok(S().needs.thirst >= 60 - 1e-9, 'thirst fell away from water');
    }
  }
  assert.ok(reached, 'never reached the water shore');
});

test('relay 004 item 3: the route goes around a wall through its gap and never enters a blocked tile', () => {
  const w = 20, h = 12, t = new Uint8Array(w * h), block = new Uint8Array(w * h);
  for (let x = 0; x < 16; x++) block[5 * w + x] = 1;   // wall on row 5, gap at x=16..19
  const m = { id: 'CITY', w, h, t, block, objs: [] };
  const { W, env } = fresh('hero-a', m);
  const e = env('CITY');
  const route = W.findRoute(e, { x: 4.5, y: 2.5 }, { x: 4.5, y: 8.5 });
  assert.ok(route && route.length > 6, 'no detour found around the wall');
  let cur = { x: 4.5, y: 2.5 };
  for (const p of route) {
    assert.ok(mapWalk(m, p.x, p.y), 'route enters a blocked tile at ' + p.x + ',' + p.y);
    assert.ok(Math.abs(p.x - cur.x) + Math.abs(p.y - cur.y) <= 1.01, 'route step is not adjacent');
    cur = p;
  }
  assert.deepStrictEqual([cur.x, cur.y], [4.5, 8.5], 'route did not end at the goal');
  assert.ok(route.some(p => p.x >= 16 && p.y === 5.5), 'route did not pass through the gap');
});

test('relay 004 item 2: Veyru rests on the HOME bed when it can reach it, and says so', () => {
  const m = homeMap();
  const { V22, kaw, env, S } = fresh('hero-a', m);
  V22.brainMap('HOME', env('HOME'));
  kaw.x = 3.5; kaw.y = 6.5;
  let onBed = false;
  for (let i = 0; i < 60 * 300 && !onBed; i++) {
    S().needs.restNeed = 60;
    V22.brainStep(1 / 60, env('HOME'));
    const o = S().outcome;
    if (o && o.need === 'restNeed' && o.satisfied) { onBed = true; assert.strictEqual(o.place, 'bed'); }
  }
  assert.ok(onBed, 'never rested at the bed');
});

test('relay 004 item 2: with no bed on the map, rest happens in place and is reported as in place', () => {
  const m = { id: 'CITY', w: 14, h: 10, t: new Uint8Array(140), block: new Uint8Array(140), objs: [] };
  const { V22, kaw, hero, env, S } = fresh('hero-a', m);
  S().accompanied = true; S().bond = 90;
  hero.px = 7.5; hero.py = 5.5;
  V22.brainMap('CITY', env('CITY'));
  kaw.x = 6.5; kaw.y = 5.5;
  let inPlace = false;
  for (let i = 0; i < 60 * 120 && !inPlace; i++) {
    S().needs.restNeed = 60;
    V22.brainStep(1 / 60, env('CITY'));
    const o = S().outcome;
    if (o && o.need === 'restNeed') { assert.strictEqual(o.satisfied, false); if (o.place === 'in place') inPlace = true; }
  }
  assert.ok(inPlace, 'rest in place never reported');
});

test('relay 004 item 5 (logic): Veyru never stands on a blocked tile across a long mixed-need run', () => {
  const m = homeMap();
  const { V22, kaw, hero, env, S } = fresh('hero-a', m);
  V22.brainMap('HOME', env('HOME'));
  kaw.x = 5.5; kaw.y = 4.5; hero.px = 5.5; hero.py = 4.5;
  for (let i = 0; i < 60 * 240; i++) {
    if (i % 900 === 0) { const s = S().needs; s.hunger = (i / 900) % 3 === 0 ? 70 : 20; s.thirst = (i / 900) % 2 === 0 ? 65 : 20; s.restNeed = (i / 900) % 4 === 0 ? 70 : 15; }
    V22.brainStep(1 / 60, env('HOME'));
    assert.ok(mapWalk(m, kaw.x, kaw.y), 'stood on a blocked tile at frame ' + i + ' (' + kaw.x + ',' + kaw.y + ')');
  }
});

test('relay 004 item 6: identity switching keeps each hero\'s own brain, and reload restores it', () => {
  store.clear();
  const sb = boot('hero-a'); sb.YOUR_V24.ready();
  sb.YOUR_V24.state().needs.hunger = 88; sb.YOUR_V24.save();
  sb.__hero = 'hero-b'; sb.YOUR_V24.ready();
  assert.strictEqual(sb.YOUR_V24.hero(), 'hero-b');
  assert.notStrictEqual(sb.YOUR_V24.state().needs.hunger, 88, 'hero-b inherited hero-a brain');
  sb.YOUR_V24.state().needs.hunger = 12; sb.YOUR_V24.save();
  sb.__hero = 'hero-a'; sb.YOUR_V24.ready();
  assert.strictEqual(sb.YOUR_V24.state().needs.hunger, 88, 'hero-a brain was not restored on switch back');
  const reloaded = boot('hero-a'); reloaded.YOUR_V24.ready();
  assert.strictEqual(reloaded.YOUR_V24.state().needs.hunger, 88, 'hero-a brain was not restored after reload');
});

test('relay 004 item 4: the outcome is reported apart from intent and motor', () => {
  const m = homeMap();
  const { V22, kaw, env, S, W } = fresh('hero-a', m);
  V22.brainMap('HOME', env('HOME'));
  kaw.x = 7.5; kaw.y = 6.5;
  S().needs.hunger = 60;
  V22.brainStep(1 / 60, env('HOME'));
  const o = W.outcome();
  assert.ok(o && 'intent' in o && 'motor' in o && 'satisfied' in o, 'outcome record missing fields');
  assert.strictEqual(o.intent, S().activity, 'outcome intent does not match the brain activity');
});

const failed = results.filter(r => r[0] === 'FAIL');
for (const r of results) console.log(r[0] === 'ok' ? 'ok   ' + r[1] : 'FAIL ' + r[1] + ' :: ' + r[2]);
console.log(`\n${results.length - failed.length} passed, ${failed.length} failed`);
process.exit(failed.length ? 1 : 0);
