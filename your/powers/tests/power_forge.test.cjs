/* U2 power creator · Node tests. Run: node your/powers/tests/power_forge.test.cjs
 * Loads the real schema / kit / registry / runtime / forge files in a sandbox with a small fake of the game (V22 resources, V23 foes, boss,
 * Nimbus roll, damage), then checks: cost + cooldown, Nimbus-only damage with the scale and the hit cap, target shapes and max targets,
 * KO / menus / resources block casting, boss lessons, anti-loop caps, the save (S.powers) and that broken saved powers are switched off, not deleted. */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm'), crypto = require('crypto');
const ROOT = path.join(__dirname, '..', '..', '..'), rd = p => fs.readFileSync(path.join(ROOT, p), 'utf8');
const sha = p => crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT, p))).digest('hex');
let pass = 0, fail = 0;
function check(name, cond, info) { if (cond) { pass++; console.log('ok - ' + name); } else { fail++; console.log('not ok - ' + name + (info !== undefined ? '  ' + JSON.stringify(info).slice(0, 600) : '')); } }

/* ---------- static rules */
check('Nimbus combat module byte-identical', sha('your/v23/vendor/wir_mella_combat.js') === 'a6aa3384fdd7ac5c3954fae35e2baf7b15dd6f426a373705b9503ecde2fbf517');
const html = rd('index.html');
check('index.html loads runtime + forge right after the registry', html.includes('<script src="your/powers/your_powers.js"></script>\n<script src="your/powers/power_runtime.js"></script>\n<script src="your/powers/power_forge.js"></script>\n'));
const u2 = ['your/powers/power_runtime.js', 'your/powers/power_forge.js'].map(rd).join('\n');
check('no localStorage / sessionStorage / indexedDB (save = root S.powers)', !/(localStorage|sessionStorage|indexedDB)\s*[.\[(]/.test(u2));
check('no eval / new Function / network', !/\beval\s*\(|new\s+Function|fetch\(|XMLHttpRequest|https?:\/\//.test(u2));
check('damage only through YOUR_V23.nimbus → YOUR_V23.damage (no foe HP writes)', !/\bm\.hp\s*[-+*/]?=|executeMellaCombatFrame/.test(u2) && /V23\.nimbus\(p\.base/.test(u2) && /V23\.damage\(m, n/.test(u2));
check('no drawn shapes: only drawImage from the existing VFX sheet', !/fillRect|strokeRect|beginPath|\.arc\(|createLinearGradient|fillText/.test(u2) && (u2.match(/drawImage/g) || []).length === 1);
const rawHtml = u2.split(/;\s*/).filter(st => /innerHTML\s*=/.test(st) && /\b(p|r|rec|draft)\.(name|desc)\b/.test(st) && !/esc\(/.test(st));
check('player text is never written as raw HTML (escaped or textContent)', rawHtml.length === 0, rawHtml);

/* ---------- a small fake of the game */
function boot(saved) {
  const ctx = { console: { log() {}, warn: (...a) => ctx.warns.push(a.join(' ')) }, warns: [], Math, JSON, Object, Array, Number, String, isFinite, Error, setInterval: () => 0, setTimeout: (f) => f(), parseInt };
  ctx.window = ctx; vm.createContext(ctx);
  const el = () => ({ style: {}, dataset: {}, classList: { add() {}, toggle() {} }, appendChild() {}, addEventListener() {}, setAttribute() {}, querySelector: () => null, querySelectorAll: () => [] });
  ctx.document = { head: { appendChild() {} }, createElement: el }; ctx.addEventListener = (t, f) => { if (t === 'keydown') ctx.keydown = f; };
  const S = { powers: saved }, G = { px: 10, py: 10, dir: 'right', map: {}, ride: 'walk', tab: 'shop' }, start = { hidden: true };
  let saves = 0; const toasts = [];
  const nimbusCalls = [], dmgCalls = [];
  const P = { energy: 100, stamina: 100, stab: 100, act: null, actT: 0, cells: [], dashT: 0 };
  ctx.YOUR_V22 = { P, power: { hit: () => true }, use: () => true, tpp: 3.1 / 200, bondUp: (n) => { ctx.bond = (ctx.bond || 0) + n; } };
  ctx.YOUR_V23 = { foes: [], boss: null, raid: null, fx: [], hero: { hp: 3, max: 5, inv: 0, ko: 0 },
    nimbus: (kind, def, dv, dry) => { nimbusCalls.push([kind, def]); return { dmg: ctx.roll || 30 }; },
    damage: (m, n, kx, ky, src, label) => { dmgCalls.push({ m: m.id, n, src, label }); m.hp -= n; m.st = 'stun'; return true; } };
  let rp = () => {}; const F = { renderPhone: () => rp, paused: () => () => false, outdoors: () => () => true, toast: () => (m) => toasts.push(m), save: () => () => saves++, walkable: () => () => true,
    newGame: () => () => {}, resume: () => () => {}, openSheet: () => () => {}, closeSheet: () => () => {}, closePhone: () => () => {} };
  const X = { G, get S() { return S; }, T: 32, cx: null, $: s => (s === '#start' ? start : null), esc: s => String(s).replace(/[<>&"]/g, ''), fn: F, set: (n, f) => { if (n === 'renderPhone') rp = f; } };
  ctx.YOUR_V20_INSTALL = () => {};
  for (const f of ['your/v22/your_v22_config.js', 'your/v23/your_v23_config.js', 'your/powers/power_schema.js', 'your/powers/core_kit.js', 'your/powers/your_powers.js', 'your/powers/power_runtime.js', 'your/powers/power_forge.js']) vm.runInContext(rd(f), ctx, { filename: f });
  ctx.YOUR_V20_INSTALL(X);
  return { ctx, S, G, P, X, RT: ctx.YOUR_POWER_RUNTIME, R: ctx.YOUR_POWERS, SC: ctx.WIR_POWER_SCHEMA, V23: ctx.YOUR_V23, nimbusCalls, dmgCalls, saves: () => saves, start, toasts,
    tick: (dt) => ctx.WIR_WORLD_MODULES.find(w => w.id === 'your-powers').tick(dt) };
}
const foe = (id, x, y, kind) => ({ id, kind: kind || 'loader', x, y, hp: 90, st: 'chase', stun: 0, vx: 0, vy: 0, D: { r: 20 } });
const lash = { schema: 'wir.power/1', id: 'user.hero.tide-whip', name: 'Tide Whip', desc: 'A water whip.', version: '1.0.0', tier: 'user', owner: 'hero', base: 'root',
  cost: { energy: 18, stamina: 0, stability: 6 }, cooldown: 6, cast: { time: 0.4, anim: 'cast_down' }, target: { shape: 'line', range: 4, width: 0.8, maxTargets: 2 },
  effects: [{ type: 'damage', scale: 0.7 }, { type: 'pull', tiles: 1.5 }, { type: 'stun', seconds: 0.6 }], visual: { sheet: 'hero.vfx', row: 1, frames: [0, 1, 2, 3, 4, 5], icon: [6, 0], tint: '#6fe3c8' } };

const A = boot();
check('runtime + forge installed, empty S.powers created', A.RT.installed && A.ctx.YOUR_POWER_FORGE.installed && A.S.powers.v === 1 && A.S.powers.mine.length === 0 && A.S.powers.slots.join() === ',');
check('save a power → S.powers.mine + registry, root save called', A.RT.saveMine(lash).ok && A.S.powers.mine.length === 1 && A.R.get('user.hero.tide-whip') && A.saves() > 0);
check('equip ★4; core powers cannot be equipped', A.RT.equip(0, 'user.hero.tide-whip') && A.S.powers.slots[0] === 'user.hero.tide-whip' && A.RT.equip(1, 'core.mella.hit') === false);
A.V23.foes.push(foe('a', 11.5, 10), foe('b', 12.5, 10.1), foe('c', 13.2, 10), foe('behind', 8, 10), foe('side', 11, 12));
A.ctx.roll = 30;
const ok1 = A.RT.castSlot(0, 'qa');
check('cast spends 18 energy + 6 stability', ok1 && A.P.energy === 82 && A.P.stab === 94);
check('line hits the 2 nearest in the line only (max targets 2)', A.dmgCalls.map(d => d.m).join() === 'a,b', A.dmgCalls);
check('damage = Nimbus roll on the ROOT lane × 0.7', A.nimbusCalls.every(c => c[0] === 'root') && A.dmgCalls.every(d => Math.abs(d.n - 21) < 1e-9 && d.src === 'power' && d.label === 'TIDE WHIP'));
check('stun applied on hit targets', A.V23.foes[0].stun >= 0.6 && A.V23.foes[0].st === 'stun');
check('cast frames: v2.2 cast pose for 0.4 s', A.P.act === 'blast' && A.P.actT === 0.4);
check('cooldown: second cast refused, works after 6 s', A.RT.castSlot(0) === false && (A.tick(6.01), A.RT.castSlot(0) === true));
A.dmgCalls.length = 0; A.ctx.roll = 500; A.tick(7); A.P.energy = 100; A.P.stab = 100;
A.RT.cast('user.hero.tide-whip');
check('hit cap: a 500 Nimbus roll lands as ' + A.SC.CAPS.hitCap, A.dmgCalls.length > 0 && A.dmgCalls.every(d => d.n === A.SC.CAPS.hitCap));
A.ctx.roll = 30; A.tick(7);
A.P.energy = 5; check('not enough energy → no cast, nothing spent', A.RT.cast('user.hero.tide-whip') === false && A.P.energy === 5); A.P.energy = 100;
A.V23.hero.ko = 1; check('knocked out → no cast', A.RT.cast('user.hero.tide-whip') === false); A.V23.hero.ko = 0;
A.G.phone = true; check('phone / menus open → no cast', A.RT.cast('user.hero.tide-whip') === false); A.G.phone = false;
A.start.hidden = false; check('title screen → no cast', A.RT.cast('user.hero.tide-whip') === false); A.start.hidden = true;
check('core powers are not cast by the runtime (they stay on v2.2)', A.RT.cast('core.mella.blast') === false);
A.ctx.keydown({ key: '4', target: {}, preventDefault() {} }); check('key 4 casts slot ★4', A.RT.last.src === 'key');
// projectile
const bolt = Object.assign(JSON.parse(JSON.stringify(lash)), { id: 'user.hero.tide-bolt', name: 'Tide Bolt', base: 'blast', target: { shape: 'projectile', speed: 10, life: 1.5, radius: 0.3, maxTargets: 1 }, effects: [{ type: 'damage', scale: 0.6 }], cooldown: 3, cost: { energy: 14 } });
check('a projectile power validates and saves', A.RT.saveMine(bolt).ok);
A.V23.foes.length = 0; A.V23.foes.push(foe('far', 14, 10)); A.dmgCalls.length = 0; A.nimbusCalls.length = 0; A.tick(10); A.RT.cast('user.hero.tide-bolt');
for (let i = 0; i < 30; i++) A.tick(1 / 30);
check('projectile flies, hits the first machine once on the BLAST lane', A.dmgCalls.length === 1 && A.dmgCalls[0].m === 'far' && A.nimbusCalls[0][0] === 'blast' && A.RT.shots.length === 0);
// bosses
const groundCell = Object.assign(JSON.parse(JSON.stringify(lash)), { id: 'user.hero.root-snare', name: 'Root Snare', base: 'root', target: { shape: 'cell', range: 2, radius: 1, life: 3 }, effects: [{ type: 'damage', scale: 1 }], cooldown: 4, cost: { energy: 20, stability: 8 } });
check('a ground cell power validates (budget ' + A.SC.validate(groundCell, { tier: 'user' }).budget + ')', A.RT.saveMine(groundCell).ok);
A.V23.foes.length = 0; A.tick(10);
A.V23.boss = { id: 'ballast', def: { torsionDmg: 11 }, stab: 100, intro: 0, done: false, st: 'free', x: 12, y: 10 };
A.RT.cast('user.hero.tide-whip'); check('BALLAST: a direct line power bounces (stability unchanged)', A.V23.boss.stab === 100 && A.RT.stats.boss_bounce >= 1);
A.RT.cast('user.hero.root-snare'); check('BALLAST: a ROOT ground cell under him between shifts lands (Nimbus roll × scale)', A.V23.boss.stab === 70, A.V23.boss.stab);
A.tick(10); A.V23.boss.st = 'braced'; A.RT.cast('user.hero.root-snare'); check('BALLAST braced: SNAP, no damage', A.V23.boss.stab === 70);
A.tick(10); A.V23.boss = { id: 'glassjaw', def: { torsionDmg: 11 }, stab: 100, intro: 0, done: false, st: 'free', x: 12, y: 10 };
A.P.energy = 100; A.P.stab = 100; const gj = A.RT.cast('user.hero.root-snare'); check('GLASSJAW: ground cell cracks by torsion damage × scale (11)', A.V23.boss.stab === 89, [gj, A.V23.boss.stab, A.P.energy, A.P.stab, A.RT.stats]);
A.V23.boss = null;
// limits
const cityOnly = Object.assign(JSON.parse(JSON.stringify(groundCell)), { id: 'user.hero.city-only', name: 'City Only', limits: { inCity: true, inRaid: false, inBoss: false } });
A.RT.saveMine(cityOnly); A.V23.raid = { wave: 1 }; check('limits.inRaid false → refused during a raid', A.RT.cast('user.hero.city-only') === false); A.V23.raid = null;
// anti-loop caps
const V = r => A.SC.validate(r, { tier: 'user' });
const base = { schema: 'wir.power/1', id: 'user.hero.x', name: 'X', version: '1.0.0', tier: 'user', owner: 'hero', base: 'utility', cost: { stamina: 10 }, cooldown: 1, cast: { time: 0.3, anim: 'none' }, target: { shape: 'self' }, visual: { icon: [0, 0] } };
check('anti-loop: heal needs ≥ 8 s, shield ≥ 3 s, energy ≥ 6 s with no energy cost, bond ≥ 10 s, cooldown ≥ 2× stun',
  !V(Object.assign({}, base, { effects: [{ type: 'heal_self', hp: 1 }] })).ok && V(Object.assign({}, base, { cooldown: 8, effects: [{ type: 'heal_self', hp: 1 }] })).ok
  && !V(Object.assign({}, base, { effects: [{ type: 'shield', seconds: 1 }] })).ok && !V(Object.assign({}, base, { cooldown: 6, cost: { energy: 10 }, effects: [{ type: 'energy_self', amount: 10 }] })).ok
  && !V(Object.assign({}, base, { effects: [{ type: 'bond_kaw', amount: 5 }] })).ok
  && !V(Object.assign({}, base, { base: 'root', target: { shape: 'circle', radius: 1 }, cooldown: 1, effects: [{ type: 'stun', seconds: 1 }] })).ok);
// heal lands on the hero, capped at max
const heal = Object.assign({}, base, { id: 'user.hero.mend', name: 'Mend', cooldown: 8, effects: [{ type: 'heal_self', hp: 1 }] });
A.RT.saveMine(heal); A.V23.hero.hp = 4; A.RT.cast('user.hero.mend'); check('heal: +1 heart, never above max', A.V23.hero.hp === 5 && (A.tick(9), A.RT.cast('user.hero.mend'), A.V23.hero.hp === 5));
check('at most ' + A.SC.CAPS.saved + ' saved powers', (() => { for (let i = 0; i < 20; i++) A.RT.saveMine(Object.assign({}, heal, { id: 'user.hero.m' + i, name: 'M' + i })); return A.S.powers.mine.length === A.SC.CAPS.saved; })());
check('delete clears the slot and the registry', A.RT.remove('user.hero.tide-whip') && A.S.powers.slots[0] === null && !A.R.get('user.hero.tide-whip'));
// load a save with one good and one tampered power
const tampered = Object.assign(JSON.parse(JSON.stringify(lash)), { id: 'user.hero.cheat', name: 'Cheat', effects: [{ type: 'damage', scale: 50 }] });
const B = boot({ v: 1, mine: [JSON.parse(JSON.stringify(lash)), tampered], slots: ['user.hero.cheat', 'user.hero.tide-whip'] });
check('load: a tampered saved power is switched off (kept in the save, not registered, slot emptied)', B.S.powers.mine.length === 2 && !B.R.get('user.hero.cheat') && B.RT.off['user.hero.cheat'] && B.S.powers.slots[0] === null && B.S.powers.slots[1] === 'user.hero.tide-whip');
const C = boot({ v: 7, junk: true }); check('load: an unknown S.powers shape resets safely', C.S.powers.v === 1 && C.S.powers.mine.length === 0);
// forge: the default draft validates; it never saves an invalid record
const FG = A.ctx.YOUR_POWER_FORGE; check('Forge installed; its default draft is a valid power', FG.installed && A.SC.validate(Object.assign({}, { schema: 'wir.power/1', id: 'user.hero.rainroot-lash', name: 'Rainroot Lash', desc: 'x', version: '1.0.0', tier: 'user', owner: 'hero', base: 'root', cost: { energy: 18, stamina: 0, stability: 6 }, cooldown: 6, cast: { time: 0.4, anim: 'cast_down' }, target: { shape: 'line', range: 4, width: 0.8, maxTargets: 2 }, effects: [{ type: 'damage', scale: 0.8 }, { type: 'pull', tiles: 1.5 }, { type: 'stun', seconds: 0.6 }], visual: { sheet: 'hero.vfx', row: 1, frames: [0, 1, 2, 3, 4, 5], icon: [6, 0], tint: '#6fe3c8' }, limits: { inCity: true, inRaid: true, inBoss: true } }), { tier: 'user' }).ok);
check('saveMine refuses an invalid record', A.RT.saveMine(Object.assign({}, lash, { id: 'user.hero.bad', cooldown: 0 })).ok === false && !A.S.powers.mine.some(r => r.id === 'user.hero.bad'));

console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
