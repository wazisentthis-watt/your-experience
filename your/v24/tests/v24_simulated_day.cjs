/* v2.4 simulated day · Node only. Run: node your/v24/tests/v24_simulated_day.cjs
 * One simulated day (86,400 s, 0.25 s steps) on a HOME map with a fridge, a bed and a water channel.
 * Prints hourly needs and activity counts, and checks bounds, blocked tiles and resource gating.
 * Uses the real brain module and the real wrapper, with browser APIs stubbed. */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert');
const here = path.resolve(__dirname, '..');
const brainSrc = fs.readFileSync(path.join(here, 'wir_kaw_living_brain.js'), 'utf8');
const wrapSrc = fs.readFileSync(path.join(here, 'your_v24.js'), 'utf8');
const store = new Map(), noop = () => {};
const el = () => ({ style: {}, setAttribute: noop, addEventListener: noop, appendChild: noop });
const W = 30, H = 20, t = new Uint8Array(W * H), block = new Uint8Array(W * H);
for (let y = 0; y < H; y++) { t[y * W + 25] = 8; t[y * W + 26] = 8; }               // water channel at x=25..26
block[2 * W + 2] = 1; block[6 * W + 10] = 1; block[6 * W + 11] = 1;                    // fridge, bed
const map = { id: 'HOME', w: W, h: H, t, block, objs: [{ id: 'fridge', x: 2, y: 2, w: 1, h: 1 }, { id: 'bed', x: 10, y: 6, w: 2, h: 1 }] };
const walk = (x, y) => { const i = Math.floor(x), j = Math.floor(y); if (i < 0 || j < 0 || i >= W || j >= H) return false; const k = j * W + i; return t[k] !== 8 && t[k] !== 1 && !block[k]; };
const sb = { console, Math, JSON, Object, Array, Number, String, Error, Infinity, Date, Map, Set, Int32Array, Uint8Array,
  localStorage: { getItem: k => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k) },
  document: { createElement: el, body: { appendChild: noop }, getElementById: () => null, readyState: 'complete' },
  addEventListener: noop, setTimeout: () => 0, clearTimeout: noop, __hero: 'hero-day', __bond: 20 };
sb.WIR_HERO = { get: () => (sb.__hero ? { id: sb.__hero } : null) }; sb.window = sb; sb.globalThis = sb;
sb.YOUR_V22 = { kawState: () => ({ bond: sb.__bond }) };
vm.createContext(sb); vm.runInContext(brainSrc, sb); vm.runInContext(wrapSrc, sb);
const V22 = sb.YOUR_V22, S = () => sb.YOUR_V24.state();
const kaw = { x: 4.5, y: 4.5, dir: 'right', face: 'right', ph: 0, moving: false, trail: [], off: false };
const hero = { px: 4.5, py: 4.5 };
const env = () => ({ px: hero.px, py: hero.py, kaw, map, walk });
sb.YOUR_V24.ready();
S().accompanied = false; S().activity = 'watch'; S().stayUntil = null; S().cooldownUntil = 0; S().bond = 20;
V22.brainMap('HOME', env());

const DT = 0.25, DAY = 86400, STEPS = DAY / DT;
const hours = [];
let cur = { acts: {}, n: { hunger: [], thirst: [], restNeed: [], socialNeed: [] }, met: { food: 0, water: 0, bed: 0, inPlace: 0 }, blocked: 0 };
let wastes = 0, lastNeed = null;
const outcomeKey = o => (o && o.satisfied ? (o.need === 'hunger' ? 'food' : o.need === 'thirst' ? 'water' : o.place === 'bed' ? 'bed' : null) : null);
for (let i = 0; i < STEPS; i++) {
  const before = { h: S().needs.hunger, t: S().needs.thirst };
  V22.brainStep(DT, env());
  assert.ok(walk(kaw.x, kaw.y), 'Veyru on a blocked tile at step ' + i);
  const n = S().needs;
  for (const k of ['hunger', 'thirst', 'restNeed', 'socialNeed']) assert.ok(n[k] >= 0 && n[k] <= 100, k + ' out of range at step ' + i);
  // resource gating: a satisfied outcome is the only way a need can fall (hunger and thirst; rest may fall anywhere)
  const o = S().outcome;
  if (o && o.need === 'hunger' && !o.satisfied && n.hunger < before.h - 1e-9) wastes++;
  if (o && o.need === 'thirst' && !o.satisfied && n.thirst < before.t - 1e-9) wastes++;
  cur.acts[S().activity] = (cur.acts[S().activity] || 0) + 1;
  const key = outcomeKey(o); if (key) cur.met[key]++;
  if (i % 60 === 0) { cur.n.hunger.push(n.hunger); cur.n.thirst.push(n.thirst); cur.n.restNeed.push(n.restNeed); cur.n.socialNeed.push(n.socialNeed); }
  if ((i + 1) % (STEPS / 24) === 0) {
    hours.push(cur); cur = { acts: {}, n: { hunger: [], thirst: [], restNeed: [], socialNeed: [] }, met: { food: 0, water: 0, bed: 0, inPlace: 0 }, blocked: 0 };
  }
}
const fmt = a => (a.length ? [Math.min(...a), Math.round(a.reduce((x, y) => x + y, 0) / a.length), Math.max(...a)].map(v => Math.round(v)).join('/') : '-');
console.log('hour  hunger min/avg/max  thirst min/avg/max  rest min/avg/max  social min/avg/max  met(food/water/bed)  top activities');
hours.forEach((h, k) => {
  const top = Object.entries(h.acts).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([a, c]) => a + ' ' + Math.round(100 * c / (STEPS / 24)) + '%').join(', ');
  console.log(String(k).padStart(2) + '    ' + fmt(h.n.hunger).padEnd(18) + fmt(h.n.thirst).padEnd(20) + fmt(h.n.restNeed).padEnd(18) + fmt(h.n.socialNeed).padEnd(20) +
    (h.met.food + '/' + h.met.water + '/' + h.met.bed).padEnd(20) + top);
});
const total = {}; hours.forEach(h => Object.entries(h.acts).forEach(([a, c]) => (total[a] = (total[a] || 0) + c)));
const sum = Object.values(total).reduce((x, y) => x + y, 0);
console.log('\nactivity share over the day:', Object.entries(total).sort((a, b) => b[1] - a[1]).map(([a, c]) => a + ' ' + (100 * c / sum).toFixed(1) + '%').join(', '));
const sumMet = k => hours.reduce((x, h) => x + h.met[k], 0);
console.log('satisfied steps: food', sumMet('food'), 'water', sumMet('water'), 'bed', sumMet('bed'));
console.log('need falls without a satisfied outcome (food/water):', wastes);
// Hard invariants (exit 1 on failure): bounds, no blocked tiles, and no need falling without its resource.
assert.strictEqual(wastes, 0, 'a need fell without its resource');
// Open findings (reported, not hidden): see README "Simulated day". Food and rest were not reached in this run.
const open = [];
if (sumMet('food') === 0 || sumMet('food') < 10) open.push('food: fridge reached ' + sumMet('food') + ' satisfied steps in a day (intent flips at the spot)');
if (sumMet('bed') === 0) open.push('rest: bed never satisfied in a day (rest never wins while other needs are at 100)');
if (total.socialize === undefined) open.push('socialize: never chosen in this run');
if (total.investigate === undefined) open.push('investigate: never chosen (no score term in choose())');
console.log(open.length ? '\nOPEN FINDINGS:\n - ' + open.join('\n - ') : '\nno open findings');
