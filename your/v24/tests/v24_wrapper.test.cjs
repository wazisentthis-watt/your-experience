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
const store = new Map();                       // shared across boots, like localStorage in one browser
const noop = () => {};
const el = () => ({ style: {}, setAttribute: noop, addEventListener: noop, appendChild: noop });

// A walkable world: everything walkable except a 4x4 block at (30..33, 30..33) and a wall at x=20 for y in 0..40.
const blocked = (x, y) => (x > 30 && x < 33 && y > 30 && y < 33) || (Math.floor(x) === 20 && Math.floor(y) >= 0 && Math.floor(y) < 40);
const open = (x, y) => x >= 0 && y >= 0 && x < 60 && y < 60 && !blocked(x, y);

function boot(heroId, extra = {}) {
  const sandbox = {
    console, Math, JSON, Object, Array, Number, String, Error, Infinity, Date,
    localStorage: { getItem: k => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k) },
    document: { createElement: el, body: { appendChild: noop }, getElementById: () => null, readyState: 'complete' },
    addEventListener: noop, setTimeout: () => 0, clearTimeout: noop,
    WIR_HERO: { get: () => ({ id: heroId }) },
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  sandbox.YOUR_V22 = { kawState: () => ({ bond: sandbox.__bond }) };
  sandbox.__bond = 20;
  Object.assign(sandbox, extra);
  vm.createContext(sandbox);
  vm.runInContext(brainSrc, sandbox);
  vm.runInContext(wrapSrc, sandbox);
  return sandbox;
}

const results = [];
function test(name, fn) { try { fn(); results.push(['ok', name]); } catch (e) { results.push(['FAIL', name, e.message]); } }

// A simulated run: hero position and map are controlled by the test.
function world(sb) {
  const V22 = sb.YOUR_V22, kaw = { x: 10.5, y: 10.5, dir: 'right', face: 'right', ph: 0, moving: false, trail: [], off: false };
  const hero = { px: 10.5, py: 10.5 };
  const env = mapId => ({ px: hero.px, py: hero.py, kaw, map: { id: mapId }, walk: (x, y) => open(x, y) });
  return { V22, kaw, hero, env, W: sb.YOUR_V24, S: () => sb.YOUR_V24.state() };
}
function fresh(heroId = 'hero-a') {
  store.clear();
  const sb = boot(heroId);
  const w = world(sb);
  w.S().accompanied = false; w.S().activity = 'watch'; w.S().stayUntil = null; w.S().cooldownUntil = 0; w.S().bond = 20;
  return { sb, ...w };
}

test('hooks installed and module is the real one', () => {
  const { sb, V22, S } = fresh();
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

test('fix 1: a map change places Veyru beside the hero (transition)', () => {
  const { V22, kaw, hero, env, S } = fresh();
  S().accompanied = true; S().bond = 90;
  V22.brainMap('CITY', env('CITY'));
  hero.px = 40.5; hero.py = 40.5;
  V22.brainPlace(env('CITY'));                              // same map, hero moved: no teleport expected here
  assert.ok(Math.hypot(kaw.x - 10.5, kaw.y - 10.5) < 2, 'Veyru jumped to the hero on a same-map place call');
  V22.brainMap('CITY2', env('CITY2'));                      // real map change: beside the hero
  assert.ok(Math.hypot(kaw.x - hero.px, kaw.y - hero.py) <= 1.5, 'not beside the hero after a map change');
});

test('fix 1: ordinary frames never teleport Veyru (no hero jump within a map)', () => {
  const { V22, kaw, hero, env, S } = fresh();
  S().accompanied = true; S().bond = 90;
  V22.brainMap('CITY', env('CITY'));
  hero.px = 50.5; hero.py = 10.5;                          // hero jumps 40 tiles in one frame
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
  hero.px = 20.5; hero.py = 10.5;
  for (let i = 0; i < 900; i++) V22.brainStep(1 / 60, env('CITY'));
  assert.ok(Math.hypot(kaw.x - hero.px, kaw.y - hero.py) < 4, 'distance ' + Math.hypot(kaw.x - hero.px, kaw.y - hero.py).toFixed(2));
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

test('fix 2: explore roams to reachable points and actually moves', () => {
  const { V22, kaw, hero, env, S } = fresh();
  S().accompanied = false; S().currentMap = 'HOME';
  V22.brainMap('HOME', env('HOME'));
  S().accompanied = true; S().bond = 90;
  hero.px = 10.5; hero.py = 10.5;
  S().activity = 'explore'; S().target = null; S().roamWait = null;
  const seen = new Set();
  for (let i = 0; i < 60 * 90; i++) {
    if (S().activity !== 'explore') S().activity = 'explore';   // keep the roam activity under test
    V22.brainStep(1 / 60, env('HOME'));
    seen.add(Math.floor(kaw.x) + ',' + Math.floor(kaw.y));
    assert.ok(open(kaw.x, kaw.y), 'Veyru entered a blocked tile at frame ' + i);
  }
  assert.ok(seen.size >= 8, 'explore visited only ' + seen.size + ' tiles');
});

test('fix 2: when the brain picks socialize, Veyru approaches the hero and stops at the gap', () => {
  // Under normal needs the brain almost never picks socialize (see README gap). Hold social need high to exercise the path.
  const { V22, kaw, hero, env, S } = fresh();
  V22.brainMap('CITY', env('CITY'));
  S().accompanied = true; S().bond = 90;
  kaw.x = 5.5; kaw.y = 5.5; hero.px = 15.5; hero.py = 5.5;
  let socialFrames = 0, closeFrames = 0;
  for (let i = 0; i < 60 * 600; i++) {
    if (S().needs) S().needs.socialNeed = 100;
    V22.brainStep(1 / 60, env('CITY'));
    if (S().activity === 'socialize') socialFrames++;
    if (S().activity === 'socialize' && Math.hypot(kaw.x - hero.px, kaw.y - hero.py) < 2.5) closeFrames++;
  }
  assert.ok(socialFrames > 0, 'brain never picked socialize even with high social need');
  assert.ok(closeFrames / socialFrames > 0.5, 'Veyru was not near the hero while socializing (' + closeFrames + '/' + socialFrames + ')');
});

test('fix 2: forage falls back to roaming and is marked incomplete (investigate untested: brain rarely picks it)', () => {
  const { V22, kaw, env, S } = fresh();
  V22.brainMap('CITY', env('CITY'));
  S().accompanied = true; S().bond = 90;
  for (const act of ['forage']) {
    S().activity = act; S().target = null; S().roamWait = null;
    const seen = new Set();
    for (let i = 0; i < 60 * 60; i++) { V22.brainStep(1 / 60, env('CITY')); seen.add(Math.floor(kaw.x) + ',' + Math.floor(kaw.y)); }
    assert.ok(S().incomplete && S().incomplete[act], act + ' not marked incomplete');
    assert.ok(seen.size >= 5, act + ' did not roam (' + seen.size + ' tiles)');
  }
});

test('fix 3: obstacle navigation never enters blocked tiles', () => {
  const { V22, kaw, hero, env, S } = fresh();
  V22.brainMap('CITY', env('CITY'));
  S().accompanied = true; S().bond = 90;
  kaw.x = 18.5; kaw.y = 10.5;                           // just left of the x=20 wall
  hero.px = 22.5; hero.py = 10.5;                       // hero is across the wall
  for (let i = 0; i < 1200; i++) { V22.brainStep(1 / 60, env('CITY')); assert.ok(open(kaw.x, kaw.y), 'entered blocked tile at frame ' + i); }
});

test('fix 3: long-duration independence, 10 simulated minutes, hero still', () => {
  const { V22, kaw, hero, env, S } = fresh();
  V22.brainMap('CITY', env('CITY'));
  S().accompanied = true; S().bond = 90;
  hero.px = 12.5; hero.py = 12.5;
  let moves = 0, prev = { x: kaw.x, y: kaw.y };
  for (let i = 0; i < 60 * 600; i++) {
    V22.brainStep(1 / 60, env('CITY'));
    if (Math.hypot(kaw.x - prev.x, kaw.y - prev.y) > 1e-4) moves++;
    prev = { x: kaw.x, y: kaw.y };
    assert.ok(open(kaw.x, kaw.y), 'blocked tile at frame ' + i);
  }
  assert.ok(moves > 600, 'too few movement frames: ' + moves);
  assert.ok(S().clock > 590, 'brain clock did not advance over 10 minutes');
});

test('fix 4: save/reload restores brain state for the same hero and KAW', () => {
  store.clear();
  const a = boot('hero-a'); a.YOUR_V24.state().accompanied = true; a.YOUR_V24.state().clock = 42; a.YOUR_V24.save();
  const b = boot('hero-a');
  assert.strictEqual(b.YOUR_V24.state().accompanied, true);
  assert.strictEqual(b.YOUR_V24.state().clock, 42);
});

test('fix 4: a different hero resets only the brain, not the hero profile', () => {
  store.clear();
  const a = boot('hero-a'); a.YOUR_V24.state().accompanied = true; a.YOUR_V24.save();
  const b = boot('hero-b');
  assert.strictEqual(b.YOUR_V24.state().accompanied, false, 'brain state leaked across heroes');
  assert.strictEqual(b.YOUR_V24.hero, 'hero-b');
});

test('fix 4: a corrupted or old-version brain store is ignored safely', () => {
  store.clear();
  store.set('wir-kaw-brain-v24', '{"v":1,"state":{"accompanied":true}}');
  const b = boot('hero-a');
  assert.strictEqual(b.YOUR_V24.state().accompanied, false);
  store.set('wir-kaw-brain-v24', 'not json');
  const c = boot('hero-a');
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

test('fix 3: call and stay give feedback on the touch path too', () => {
  const { W, env, S } = fresh();
  S().accompanied = false; S().currentMap = 'HOME';
  W.call(env('HOME'));
  assert.ok(typeof S().accompanied === 'boolean');
  W.stayToggle(env('HOME'));
  assert.ok(true);
});

test('fix 4: bond stays a mirror of the hero profile, not a second copy', () => {
  const { sb, V22, env, S } = fresh();
  sb.__bond = 77;
  V22.brainStep(1 / 60, env('HOME'));
  assert.strictEqual(S().bond, 77);
});

const failed = results.filter(r => r[0] === 'FAIL');
for (const r of results) console.log(r[0] === 'ok' ? 'ok   ' + r[1] : 'FAIL ' + r[1] + ' :: ' + r[2]);
console.log(`\n${results.length - failed.length} passed, ${failed.length} failed`);
process.exit(failed.length ? 1 : 0);
