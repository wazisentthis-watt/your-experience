/* v2.4 wrapper tests · PROPOSAL / PUBLISH HOLD. Node only. Run: node your/v24/tests/v24_wrapper.test.cjs
 * Loads the real brain module and the real your_v24.js wrapper, with browser APIs stubbed. */
'use strict';
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const vm = require('vm');

const here = path.resolve(__dirname, '..');
const store = new Map();
const noop = () => {};
const doc = {
  createElement: () => ({ style: {}, set textContent(v) { this._t = v; }, get textContent() { return this._t; } }),
  body: { appendChild: noop },
};
const sandbox = {
  console, setTimeout: () => 0, clearTimeout: noop, Math, JSON, Object, Array, Number, String, Error,
  localStorage: { getItem: k => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k) },
  document: doc, addEventListener: noop,
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(here, 'wir_kaw_living_brain.js'), 'utf8'), sandbox);

// Fake v2.2 side: the kaw object and walkable map the hooks use.
const open = (x, y) => x >= 0 && y >= 0 && x < 60 && y < 60 && !(x > 30 && x < 33 && y > 30 && y < 33);
const kaw = { x: 10.5, y: 10.5, dir: 'right', face: 'right', ph: 0, moving: false, trail: [], off: false };
let bond = 20;
const V22 = { kaw, kawState: () => ({ bond }) };
sandbox.YOUR_V22 = V22;
const hero = { px: 10.5, py: 10.5 };
const mapOf = id => ({ id });
const env = (mapId) => ({ px: hero.px, py: hero.py, kaw, map: mapOf(mapId), walk: (x, y) => open(x, y) });
vm.runInContext(fs.readFileSync(path.join(here, 'your_v24.js'), 'utf8'), sandbox);
const W = sandbox.YOUR_V24;
const S = () => W.state();

const results = [];
function test(name, fn) { try { fn(); results.push(['ok', name]); } catch (e) { results.push(['FAIL', name, e.message]); } }
function fresh() {
  store.clear();
  Object.assign(kaw, { x: 10.5, y: 10.5, off: false, moving: false });
  hero.px = 10.5; hero.py = 10.5; bond = 20;
  W.state().accompanied = false; W.state().activity = 'watch'; W.state().stayUntil = null; W.state().cooldownUntil = 0; W.state().bond = 20;
  W.state().currentMap = 'HOME';
  V22.brainMap('HOME', env('HOME'));
}

test('hooks are installed on v2.2 and the module is the real one', () => {
  assert.strictEqual(typeof V22.brainStep, 'function');
  assert.strictEqual(typeof V22.brainPlace, 'function');
  assert.strictEqual(typeof V22.brainMap, 'function');
  assert.strictEqual(S().schema, 'wir.kaw.brain/0.1');
});

test('not accompanied and off in the city: Veyru stays home (off, not moved)', () => {
  fresh();
  V22.brainMap('CITY', env('CITY'));
  assert.strictEqual(kaw.off, true);
  const x0 = kaw.x;
  for (let i = 0; i < 60; i++) V22.brainStep(1 / 60, env('CITY'));
  assert.strictEqual(kaw.x, x0);
});

test('at home and not accompanied: Veyru is drawn at home', () => {
  fresh();
  V22.brainMap('HOME', env('HOME'));
  assert.strictEqual(kaw.off, false);
});

test('no teleport: a far hero jump never moves Veyru faster than the sprint speed', () => {
  fresh();
  S().accompanied = true; S().bond = 90; bond = 90;
  V22.brainMap('CITY', env('CITY'));
  hero.px = 50.5; hero.py = 10.5;   // hero jumps 40 tiles in one frame
  let maxStep = 0, prev = { x: kaw.x, y: kaw.y };
  for (let i = 0; i < 240; i++) {
    V22.brainStep(1 / 60, env('CITY'));
    const d = Math.hypot(kaw.x - prev.x, kaw.y - prev.y);
    if (d > maxStep) maxStep = d;
    prev = { x: kaw.x, y: kaw.y };
  }
  assert.ok(maxStep <= 3.6 / 60 + 1e-6, 'max per-frame step ' + maxStep);
});

test('accompanied Veyru ends up near the hero (follow gap)', () => {
  fresh();
  S().accompanied = true; S().bond = 90; bond = 90;
  V22.brainMap('CITY', env('CITY'));
  hero.px = 20.5; hero.py = 10.5;
  for (let i = 0; i < 600; i++) V22.brainStep(1 / 60, env('CITY'));
  const d = Math.hypot(kaw.x - hero.px, kaw.y - hero.py);
  assert.ok(d < 4, 'distance ' + d.toFixed(2));
});

test('stay freezes Veyru until the stay window ends', () => {
  fresh();
  S().accompanied = true; S().bond = 90; bond = 90;
  V22.brainMap('CITY', env('CITY'));
  S().stayUntil = S().clock + 45; S().activity = 'stay';
  const x0 = kaw.x;
  hero.px = 25.5;
  for (let i = 0; i < 120; i++) V22.brainStep(1 / 60, env('CITY'));
  assert.strictEqual(kaw.x, x0, 'moved during stay');
});

test('bond below 30 never refuses LEAVE_HOUSE at the door', () => {
  for (let trial = 0; trial < 60; trial++) {
    fresh();
    bond = 20; S().bond = 20;
    W.call(env('HOME'));
    assert.strictEqual(S().accompanied, true, 'refused on trial ' + trial);
  }
});

test('a refusal above the safe bond starts a cooldown before re-asking', () => {
  let refused = false;
  for (let trial = 0; trial < 300 && !refused; trial++) {
    fresh();
    bond = 80; S().bond = 80;
    W.call(env('HOME'));
    if (!S().accompanied) refused = true;
  }
  assert.ok(refused, 'no refusal in 300 tries (willingness too high)');
  assert.ok(S().cooldownUntil > S().clock, 'cooldown not set');
  const before = S().accompanied;
  W.call(env('HOME'));
  assert.strictEqual(S().accompanied, before, 'asked again during cooldown');
});

test('state saves to localStorage and reloads', () => {
  fresh();
  S().accompanied = true; S().clock = 10;
  W.save();
  const raw = JSON.parse(store.get('wir-kaw-brain-v24'));
  assert.strictEqual(raw.accompanied, true);
  assert.strictEqual(raw.schema, 'wir.kaw.brain/0.1');
});

const failed = results.filter(r => r[0] === 'FAIL');
for (const r of results) console.log(r[0] === 'ok' ? 'ok   ' + r[1] : 'FAIL ' + r[1] + ' :: ' + r[2]);
console.log(`\n${results.length - failed.length} passed, ${failed.length} failed`);
process.exit(failed.length ? 1 : 0);
