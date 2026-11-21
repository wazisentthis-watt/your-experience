/* Nimbus-safe controls · Node tests. Run: node your/controls/tests/controls.test.cjs
 * 1. rules: Nimbus byte-identical, only additive files / script lines, no storage key / network / eval / drawing in the layer
 * 2. map: in every context no two actions share a button, nothing needs R3 (11), Home (16) or Back (8), chords only use L1
 * 3. wiring: each world button feeds the exact legacy index the older layers listen to (v22 MC.pad, v20, index.html pollPad)
 * 4. runtime (simulated pad): remap per context, L1 chords never fire the base action, latch across menu open/close,
 *    SIKEE fight gets its own buttons and nothing else, R3/Home do nothing, a non-standard pad uses its saved setup */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm'), crypto = require('crypto'), cp = require('child_process');
const ROOT = path.join(__dirname, '..', '..', '..'), rd = p => fs.readFileSync(path.join(ROOT, p), 'utf8');
const sha = p => crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT, p))).digest('hex');
let pass = 0, fail = 0;
function check(name, cond, info) { if (cond) { pass++; console.log('ok - ' + name); } else { fail++; console.log('not ok - ' + name + (info !== undefined ? '  ' + JSON.stringify(info).slice(0, 600) : '')); } }

/* ---------- 1. rules */
check('Nimbus combat module byte-identical', sha('your/v23/vendor/wir_mella_combat.js') === 'a6aa3384fdd7ac5c3954fae35e2baf7b15dd6f426a373705b9503ecde2fbf517');
let base = null; try { base = cp.execSync('git merge-base HEAD origin/main', { cwd: ROOT, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); } catch (e) {}
if (base) {
  const changed = cp.execSync('git diff --name-only ' + base, { cwd: ROOT }).toString().trim().split('\n').filter(Boolean)
    .concat(cp.execSync('git ls-files --others --exclude-standard', { cwd: ROOT }).toString().trim().split('\n').filter(Boolean));
  check('only index.html, your/powers/ and your/controls/ change (no older layer edited)', changed.every(f => f === 'index.html' || f.startsWith('your/powers/') || f.startsWith('your/controls/')), changed);
  const d = cp.execSync('git diff ' + base + ' -- index.html', { cwd: ROOT }).toString().split('\n').filter(l => /^[+-][^+-]/.test(l));
  check('index.html: only added script lines, nothing removed', d.every(l => /^\+<script src="your\/(powers|controls)\/[a-z_]+\.js"><\/script>$/.test(l)), d);
} else console.log('# (no git base found: file-change checks skipped)');
const html = rd('index.html');
check('controls load right after the Power Forge', html.includes('<script src="your/powers/power_forge.js"></script>\n<script src="your/controls/controls_map.js"></script>\n<script src="your/controls/nimbus_controls.js"></script>\n'));
const rt = rd('your/controls/nimbus_controls.js'), mp = rd('your/controls/controls_map.js');
[['localStorage', /localStorage|sessionStorage|indexedDB/], ['network', /fetch\(|XMLHttpRequest|WebSocket|sendBeacon/], ['eval', /\beval\(|new Function/], ['canvas drawing', /getContext|fillRect|drawImage|strokeRect|\.arc\(/]]
  .forEach(([n, re]) => check('layer has no ' + n, !re.test(rt) && !re.test(mp)));

/* ---------- 2. map */
const MAP = require('../controls_map.js');
check('no conflicts in any context (map.conflicts() is empty)', MAP.conflicts().length === 0, MAP.conflicts());
Object.keys(MAP.CONTEXTS).forEach(c => {
  const A = MAP.CONTEXTS[c].actions, plain = A.filter(a => !a.chord).map(a => a.btn), chords = A.filter(a => a.chord).map(a => a.chord.join('+'));
  check(c + ': no two actions share a button', new Set(plain).size === plain.length, plain);
  check(c + ': no two chords share a combo', new Set(chords).size === chords.length, chords);
  check(c + ': nothing needs R3, Home or Back', A.every(a => (a.chord || [a.btn]).every(b => b !== 11 && b !== 16 && b !== 8)));
  check(c + ': every chord is L1 + a button, and L1 has no plain action here', A.filter(a => a.chord).every(a => a.chord.length === 2 && a.chord[0] === 4) && (!chords.length || plain.indexOf(4) < 0));
});
const W = MAP.CONTEXTS.world.actions, wid = id => W.find(a => a.id === id);
check('★4 and ★5 have real pad buttons (L1 + X, L1 + Y)', wid('slot4').chord.join() === '4,2' && wid('slot5').chord.join() === '4,3');
check('transform no longer needs R3 (now R1)', wid('transform').btn === 5);
check('fly reachable without L3 too (L1 + B)', wid('fly').btn === 10 && wid('fly2').chord.join() === '4,1');
check('B does one move in the world (dash tap / sprint hold), not also back', W.filter(a => a.btn === 1).length === 1);
check('lab and football can be left without a Back button', MAP.CONTEXTS.lab.actions[0].btn === 9 && MAP.CONTEXTS.football.actions.find(a => a.id === 'leave').btn === 9);
check('football R3 "ask" reachable on L3', MAP.CONTEXTS.football.actions.find(a => a.id === 'ask').btn === 10);

/* ---------- 3. wiring to the older layers */
const ctxv = { window: {} }; vm.createContext(ctxv); vm.runInContext(rd('your/v22/your_v22_config.js'), ctxv); const MC = ctxv.window.YOUR_V22_CONFIG.mella;
['jump', 'hit', 'blast', 'calm', 'transform', 'root', 'core', 'crown', 'dash'].forEach(k => check('world ' + k + ' feeds v22 MC.pad.' + k + ' (' + MC.pad[k] + ')', wid(k) && wid(k).legacy === MC.pad[k], wid(k)));
const pp = html.slice(html.indexOf('function pollPad()'), html.indexOf('function overlayPad()'));
check('index.html pollPad still: A=0 interact, X=2 Do tab, Y=3 ride, Start=9 phone, 4/5 tabs', /edge\(0\)/.test(pp) && /edge\(2\)/.test(pp) && /edge\(3\) && S && !layer\) cycleRide/.test(pp) && /edge\(9\)/.test(pp) && /edge\(4\)\) tabCycle/.test(pp));
check('world interact/ride/phone/Do tab feed 0/3/9/2', wid('interact').legacy === 0 && wid('ride').legacy === 3 && wid('phone').legacy === 9 && wid('doTab').legacy === 2);
const v20 = rd('your/v20/your_v20.js'); check('v20 still: hold 1 = sprint, 5 = fly; world fly feeds 5', /gp\.buttons\[1\]/.test(v20) && /gp\.buttons\[5\]/.test(v20) && wid('fly').legacy === 5 && wid('fly2').legacy === 5);
const sk = rd('your/sikee/sikee_world.js'); check('fight calls exist in SIKEE (skStrike, skDodge, skBlast, skMella2, skRun)', ['skStrike', 'skDodge', 'skBlast', 'skMella2', 'skRun'].every(id => sk.indexOf("'#" + id + "'") >= 0 || sk.indexOf('#' + id) >= 0));
const legacyWorld = Object.values(MAP.table('world')); check('world legacy outputs are unique (each older listener gets one button)', new Set(legacyWorld).size === legacyWorld.length, legacyWorld);

/* ---------- 4. runtime with a simulated pad */
const stdPad = held => ({ id: 'SteelSeries Nimbus+ (sim)', index: 0, connected: true, mapping: 'standard', timestamp: 1, axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, (_, i) => ({ pressed: held.includes(i), touched: held.includes(i), value: held.includes(i) ? 1 : 0 })) });
let env;
try { env = makeEnv(); } catch (err) { check('runtime env builds', false, String(err && err.stack || err)); }
function makeEnv() {
  const code = rd('your/controls/nimbus_controls.js');
  const els = {}, clicks = [], casts = []; let toastN = 0;
  const el = (id, extra) => (els[id] = Object.assign({ id, hidden: false, disabled: false, dataset: {}, click() { clicks.push(id); }, querySelector: () => null, querySelectorAll: () => [] }, extra || {}));
  el('start', { hidden: true }); ['skStrike', 'skDodge', 'skBlast', 'skMella2', 'skRun', 'fbLeave'].forEach(id => el(id));
  let pad = null;
  const nav = { getGamepads: () => [pad] };
  const env = { t: 0, fighting: false, clicks, casts, els, setPad(p) { pad = p; } };
  const sb = { navigator: nav, console, requestAnimationFrame: () => 0, cancelAnimationFrame() {}, setTimeout() {},
    performance: { now: () => env.t }, document: { getElementById: id => els[id] || null, createElement: () => ({ style: {}, dataset: {}, appendChild() {} }), head: { appendChild() {} } },
    YOUR_CONTROLS_MAP: MAP, YOUR_POWER_RUNTIME: { castSlot: (i, s) => casts.push([i, s]) }, SIKEE: { fighting: () => env.fighting }, YOUR_V20_INSTALL: function () {} };
  sb.window = sb; vm.createContext(sb); vm.runInContext(code, sb);
  const G = { phone: false, sheet: false }, S = { controls: null };
  const X = { G, get S() { return S; }, MG: { cur: null }, FB: {}, $: s => els[s.replace('#', '')] || null, esc: s => String(s), set() {},
    fn: { toast: () => () => { toastN++; }, renderPhone: () => () => {}, openSheet: () => () => { G.sheet = true; }, closeSheet: () => () => { G.sheet = false; }, closePhone: () => () => {}, save: () => () => {} } };
  sb.YOUR_V20_INSTALL(X);
  Object.assign(env, { G, S, X, C: sb.YOUR_CONTROLS, toasts: () => toastN, read() { env.t += 20; const v = nav.getGamepads()[0]; return v ? v.buttons.map((b, i) => b.pressed ? i : -1).filter(i => i >= 0) : []; } });
  return env;
}
if (env) {
  const p = held => env.setPad(stdPad(held)), r = () => env.read();
  check('runtime installed', env.C.installed === true, env.C.error);
  p([]); r(); check('context = world on foot', env.C.context() === 'world');
  p([2]); check('world: X → legacy 14 (hit)', JSON.stringify(r()) === '[14]');
  p([]); r(); p([3]); check('world: Y → legacy 13 (jump)', JSON.stringify(r()) === '[13]');
  p([]); r(); p([5]); check('world: R1 → legacy 11 (transform), not 5 (fly)', JSON.stringify(r()) === '[11]');
  p([]); r(); p([10]); check('world: L3 → legacy 5 (fly)', JSON.stringify(r()) === '[5]');
  p([]); r(); p([13]); check('world: D-pad down → legacy 3 (ride)', JSON.stringify(r()) === '[3]');
  p([]); r(); p([14]); check('world: D-pad left → legacy 4 (ROOT)', JSON.stringify(r()) === '[4]');
  p([]); r(); p([4]); check('world: L1 alone feeds nothing', r().length === 0);
  p([4, 2]); const o1 = r(); check('L1 + X casts ★4 once and feeds no hit / ROOT', env.casts.length === 1 && env.casts[0][0] === 0 && o1.length === 0, { casts: env.casts, o1 });
  p([4, 2]); r(); check('holding the chord does not repeat ★4', env.casts.length === 1);
  p([2]); check('releasing L1 first: X stays silent until let go', r().length === 0);
  p([]); r(); p([2]); check('then X alone hits again', JSON.stringify(r()) === '[14]');
  p([]); r(); p([4]); r(); p([4, 3]); r(); check('L1 + Y casts ★5', env.casts.length === 2 && env.casts[1][0] === 1);
  p([]); r(); p([4]); r(); p([4, 1]); check('L1 + B → fly (legacy 5) only, no dash (1)', JSON.stringify(r()) === '[5]');
  p([]); r(); p([4]); r(); p([4, 9]); check('L1 + Menu → Do tab (legacy 2) only, not phone (9)', JSON.stringify(r()) === '[2]');
  p([]); r(); p([11]); check('R3 does nothing', r().length === 0); p([16]); check('Home does nothing', r().length === 0); p([8]); check('Back does nothing in the world', r().length === 0);
  p([]); r(); p([0]); r(); env.G.sheet = true; p([0]); check('A held across a menu opening is ignored (no double press)', r().length === 0);
  p([]); r(); p([0]); check('menu: A → 0', JSON.stringify(r()) === '[0]');
  p([]); r(); p([4]); check('menu: L1 → tab left (4)', JSON.stringify(r()) === '[4]');
  p([]); r(); p([3]); check('menu: Y does nothing', r().length === 0);
  env.G.sheet = false; p([]); r(); env.fighting = true; p([]); r(); check('context = fight', env.C.context() === 'fight');
  [[2, 'skStrike'], [1, 'skDodge'], [7, 'skBlast'], [6, 'skMella2'], [3, 'skRun']].forEach(([b, id]) => { env.clicks.length = 0; p([b]); const o = r(); p([]); r(); check('fight: ' + MAP.label(b) + ' → ' + id + ' and nothing leaks to the world', env.clicks.join() === id && o.length === 0, { clicks: env.clicks, o }); });
  [0, 9, 4, 5, 12, 14].forEach(b => { p([b]); const o = r(); p([]); r(); check('fight: ' + MAP.label(b) + ' is off (no interact / phone / powers)', o.length === 0, o); });
  env.fighting = false; env.G.lab = { id: 'rifft' }; p([]); r(); p([9]); check('lab: Menu → legacy 8 (end session), not the phone', JSON.stringify(r()) === '[8]');
  env.G.lab = null; env.G.fb = { kind: 'scrimmage' }; p([]); r(); env.clicks.length = 0; p([9]); const f1 = r(); check('football: Menu tap stays in the engine (no 8 / 9 to the shell)', f1.length === 0 && env.clicks.length === 0, f1);
  for (let i = 0; i < 70; i++) r(); check('football: hold Menu 1.2 s → Leave', env.clicks.join() === 'fbLeave', env.clicks);
  p([8]); p([]); r(); p([8]); const f2 = r(); check('football: Back tap no longer ends the scrimmage from the shell (view stays the engine\'s)', f2.indexOf(8) < 0);
  env.G.fb = null; p([]); r();
  // non-standard pad + saved setup
  const raw = held => ({ id: 'Nimbus HID (sim)', index: 0, connected: true, mapping: '', timestamp: 1, axes: [0, 0, 0, 0, 0, 0, 0, 0, 0, 1.2857], buttons: Array.from({ length: 16 }, (_, i) => ({ pressed: held.includes(i), value: held.includes(i) ? 1 : 0 })) });
  const t0 = env.toasts(); env.setPad(raw([])); r(); check('non-standard pad without setup: one toast pointing at Set up buttons', env.toasts() === t0 + 1);
  env.S.controls = { v: 1, profiles: { 'Nimbus HID (sim)': { map: { 0: { b: 1 }, 2: { b: 3 }, 12: { a: 9, v: -1 } } } } };
  env.setPad(raw([3])); check('saved setup: raw button 3 = X → hit (14)', JSON.stringify(r()) === '[14]');
  env.setPad(raw([])); r(); const hatUp = raw([]); hatUp.axes[9] = -1; env.setPad(hatUp); check('saved setup: hat axis up = D-pad up → CORE (6)', JSON.stringify(r()) === '[6]');
}
console.log('\n# controls: ' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
