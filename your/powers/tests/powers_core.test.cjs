/* U1 powers as data · Node tests. Run: node your/powers/tests/powers_core.test.cjs
 * 1. rules: Nimbus byte-identical, the kit's engine files untouched, additive script tags, no storage / network / eval / HP writes / drawing here
 * 2. parity: every core record equals the live v2.2 / v2.3 configs (numbers, keys, pad buttons, Nimbus lanes, icons)
 * 3. validator: core records pass; broken and over-cap records fail; 3,000 random player powers never get past the caps or the budget
 * 4. registry: use(id) runs exactly the v2.2 kit move it names, records are frozen, duplicates are refused, lane drift is reported */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm'), crypto = require('crypto'), cp = require('child_process');
const ROOT = path.join(__dirname, '..', '..', '..'), rd = p => fs.readFileSync(path.join(ROOT, p), 'utf8');
const sha = p => crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT, p))).digest('hex');
let pass = 0, fail = 0;
function check(name, cond, info) { if (cond) { pass++; console.log('ok - ' + name); } else { fail++; console.log('not ok - ' + name + (info !== undefined ? '  ' + JSON.stringify(info).slice(0, 600) : '')); } }
const near = (a, b, t) => typeof a === 'number' && Math.abs(a - b) <= (t || 0.0011);

/* ---------- 1. rules */
check('Nimbus combat module byte-identical', sha('your/v23/vendor/wir_mella_combat.js') === 'a6aa3384fdd7ac5c3954fae35e2baf7b15dd6f426a373705b9503ecde2fbf517');
let base = null; try { base = cp.execSync('git merge-base HEAD origin/main', { cwd: ROOT, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); } catch (e) {}
if (base) {
  const changed = cp.execSync('git diff --name-only ' + base, { cwd: ROOT }).toString().trim().split('\n').filter(Boolean)
    .concat(cp.execSync('git ls-files --others --exclude-standard', { cwd: ROOT }).toString().trim().split('\n').filter(Boolean));
  check('only index.html, your/powers/ and your/controls/ change', changed.every(f => f === 'index.html' || f.startsWith('your/powers/') || f.startsWith('your/controls/')), changed);
  const d = cp.execSync('git diff ' + base + ' -- index.html', { cwd: ROOT }).toString().split('\n').filter(l => /^[+-][^+-]/.test(l));
  check('index.html: only added your/powers + your/controls script lines, nothing removed', d.length >= 3 && d.every(l => /^\+<script src="your\/(powers|controls)\/[a-z_]+\.js"><\/script>$/.test(l)), d);
} else console.log('# (no git base found: file-change checks skipped)');
const html = rd('index.html');
check('scripts load in order after the Living layer', html.includes('<script src="your/living/living_district.js"></script>\n<script src="your/powers/power_schema.js"></script>\n<script src="your/powers/core_kit.js"></script>\n<script src="your/powers/your_powers.js"></script>\n'));
const mine = ['your/powers/power_schema.js', 'your/powers/core_kit.js', 'your/powers/your_powers.js'].map(rd).join('\n');
check('no localStorage / sessionStorage / indexedDB', !/(localStorage|sessionStorage|indexedDB)\s*[.\[(]/.test(mine));
check('no eval / new Function / string timers', !/\beval\s*\(|new\s+Function|Function\s*\(|setTimeout\s*\(\s*['"]|setInterval\s*\(\s*['"]/.test(mine));
check('no network or iframe', !/fetch\(|XMLHttpRequest|WebSocket|<iframe|createElement\('iframe'\)|https?:\/\//.test(mine));
check('never writes HP or calls damage directly', !/\.hp\s*[-+*/]?=|hurtHero\(|V23\.damage\(|executeMellaCombatFrame/.test(mine));
check('draws nothing (no canvas calls: art comes from existing sheets)', !/getContext|fillRect|strokeRect|beginPath|\.arc\(|drawImage|createLinearGradient/.test(mine));
check('core_kit.js is data only (no functions)', !/function\s*\(|=>/.test(rd('your/powers/core_kit.js').replace(/^\(function \(root\) \{|\}\)\(typeof window[^\n]*$/gm, '').replace(/\(function \(root\) \{/, '')));

/* ---------- load configs + schema + kit in a sandbox */
const ctx = { console, Math, JSON, Object, Array, Number, String, isFinite }; ctx.window = ctx; vm.createContext(ctx);
for (const f of ['your/v22/your_v22_config.js', 'your/v23/your_v23_config.js', 'your/powers/power_schema.js', 'your/powers/core_kit.js']) vm.runInContext(rd(f), ctx, { filename: f });
const MC = ctx.YOUR_V22_CONFIG.mella, C23 = ctx.YOUR_V23_CONFIG, SC = ctx.WIR_POWER_SCHEMA, KIT = ctx.YOUR_POWER_KIT;
const tpp = ctx.YOUR_V22_CONFIG.scale.valenceWalkTiles / ctx.YOUR_V22_CONFIG.scale.v7RunPx, PX = 1 / C23.scale.metalTilePx;
const P = id => KIT.powers.find(p => p.id === 'core.mella.' + id);

/* ---------- 2. parity with the live configs */
check('nine core records, unique ids', KIT.powers.length === 9 && new Set(KIT.powers.map(p => p.id)).size === 9);
check('kit resources = v2.2 config', JSON.stringify(KIT.resources.energy) === JSON.stringify(MC.energy) && JSON.stringify(KIT.resources.stamina) === JSON.stringify(MC.stamina)
  && KIT.resources.stability.min === MC.ccr.stabilityMin && KIT.resources.stability.regen === MC.ccr.stabilityRegen && KIT.resources.stability.regenGuardian === MC.ccr.stabilityRegenGuardian);
check('chain = ROOT → CORE → CROWN in ' + MC.ccr.chainWindow + ' s', KIT.chain.order.join() === MC.ccr.chain.map(k => 'core.mella.' + k).join() && KIT.chain.window === MC.ccr.chainWindow);
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
check('v7 blocks equal the config blocks the engine reads', same(P('jump').v7, MC.jump) && same(P('dash').v7, MC.dash) && same(P('hit').v7, MC.hit) && same(P('blast').v7, MC.blast)
  && same(P('transform').v7, MC.transform) && same(P('calm').v7, MC.calm)
  && ['root', 'core', 'crown'].every(k => same(P(k).v7, Object.assign({ cost: MC.ccr.cost[k], stabilityCost: MC.ccr.stabilityCost[k] }, MC.ccr[k]))));
check('costs restate the config', P('blast').cost.energy === MC.blast.energyCost && P('dash').cost.stamina === MC.dash.staminaCost
  && ['root', 'core', 'crown'].every(k => P(k).cost.energy === MC.ccr.cost[k] && P(k).cost.stability === MC.ccr.stabilityCost[k])
  && ['jump', 'hit', 'transform', 'calm'].every(k => Object.keys(P(k).cost).length === 0));
check('cast times restate the config', near(P('jump').cast.time, 2 * MC.jump.vz / MC.jump.gravity) && P('dash').cast.time === MC.dash.time && P('hit').cast.time === MC.hit.time
  && P('blast').cast.time === MC.blast.time && P('transform').cast.time === MC.transform.time && ['root', 'core', 'crown'].every(k => P(k).cast.time === 0.28));
check('distances in tiles = V7 px × ' + tpp + ' / METAL px ÷ 64', near(P('dash').effects[0].tiles, MC.dash.impulsePx * tpp * MC.dash.time) && near(P('blast').target.speed, MC.blast.speedPx * tpp)
  && near(P('blast').target.speedTransformed, MC.blast.speedTransformedPx * tpp) && P('blast').target.life === MC.blast.life && near(P('calm').target.radius, MC.calm.rangePx * tpp)
  && near(P('root').target.range, MC.ccr.root.offsetPx * tpp) && near(P('root').target.radius, MC.ccr.root.sizePx * tpp / 2) && P('root').target.life === MC.ccr.root.life
  && near(P('core').target.range, MC.ccr.core.offsetPx * tpp) && near(P('core').target.radius, MC.ccr.core.sizePx * tpp / 2) && P('core').target.life === MC.ccr.core.life
  && near(P('core').effects[2].kawRange, MC.ccr.core.kawRangePx * tpp, 0.006)
  && near(P('hit').target.range, C23.nimbus.hitRangePx * PX + .4) && P('hit').target.arc === C23.nimbus.hitArc && near(P('hit').target.close, C23.nimbus.hitClosePx * PX)
  && P('crown').target.radius === C23.nimbus.crownRangeTiles && near(P('hit').effects[1].tiles, 160 * PX));
check('effects restate the config', near(P('hit').effects[0].transformedScale, C23.nimbus.transformHitK) && P('calm').effects[0].amount === MC.calm.bond && P('calm').effects[1].amount === MC.calm.energy
  && P('calm').effects[2].seconds === C23.veyru.calmStun && P('calm').effects[3].hp === C23.veyru.calmHeal && P('dash').effects[1].seconds === C23.hero.dodgeInv && P('dash').effects[2].hits === C23.nimbus.dashRamDmgHits
  && P('transform').effects[0].minEnergy === MC.transform.minEnergy && P('transform').effects[0].drainPerSec === MC.energy.transformedDrain && P('transform').effects[0].exitCap === MC.transform.exitCap
  && near(P('transform').effects[0].runK, MC.transform.runPxTransformed / ctx.YOUR_V22_CONFIG.scale.v7RunPx) && P('crown').effects[1].reaction === MC.ccr.crown.reaction && P('crown').effects[2].amount === MC.ccr.crown.kawBond
  && P('core').effects[2].amount === MC.ccr.core.kawBond);
check('keys and pad buttons = v2.2 config', KIT.powers.every(p => { const k = p.id.split('.').pop(); return k === 'dash' ? p.input.pad === MC.pad.dash : p.input.key === MC.keys[k] && p.input.pad === MC.pad[k]; }));
check('Nimbus lanes = v2.3 wiring', KIT.powers.every(p => p.nimbus === (C23.nimbus[p.base] || null)));
const icon = JSON.parse(rd('your/art/your_hero_art.js').match(/var ICON = (\{[^}]+\})/)[1].replace(/(\w+):/g, '"$1":'));
check('icons = the cells your_hero_art.js uses on the MELLA pad', Object.keys(icon).every(k => same(P(k).visual.icon, icon[k])));
check('every engine name is a real v2.2 kit move', KIT.powers.every(p => new RegExp("\\b" + p.engine.split(':')[1] + ": function").test(rd('your/v22/your_v22.js'))));

/* ---------- 3. validator */
check('all nine core records validate', KIT.powers.every(p => SC.validate(p, { tier: 'core' }).ok), KIT.powers.map(p => [p.id, SC.validate(p, { tier: 'core' }).errors]).filter(x => x[1].length));
const good = { schema: 'wir.power/1', id: 'user.hero.rainroot-lash', name: 'Rainroot Lash', desc: 'A rooted water whip.', version: '1.0.0', tier: 'user', owner: 'hero', base: 'root',
  cost: { energy: 18, stability: 6 }, cooldown: 6, cast: { time: 0.5, anim: 'cast_down' }, target: { shape: 'line', range: 4, width: 0.8 },
  effects: [{ type: 'damage', scale: 0.8 }, { type: 'pull', tiles: 1.5 }, { type: 'stun', seconds: 0.6 }], visual: { sheet: 'hero.vfx', row: 1, frames: [0, 1, 2, 3], icon: [6, 0], tint: '#6fe3c8' } };
const gv = SC.validate(good, { tier: 'user' });
check('a sane player power validates (budget ' + gv.budget + ')', gv.ok, gv.errors);
const bad = {
  'unknown field': Object.assign({}, good, { script: 'x' }), 'name too long': Object.assign({}, good, { name: 'x'.repeat(29) }), 'wrong schema': Object.assign({}, good, { schema: 'wir.power/2' }), 'claims core tier': Object.assign({}, good, { tier: 'core' }),
  'core id': Object.assign({}, good, { id: 'core.mella.hit' }), 'bad id': Object.assign({}, good, { id: 'User Power' }), 'damage ×5': Object.assign({}, good, { effects: [{ type: 'damage', scale: 5 }] }),
  'no cooldown': Object.assign({}, good, { cooldown: 0 }), 'free': Object.assign({}, good, { cost: {} }), 'huge radius': Object.assign({}, good, { target: { shape: 'circle', radius: 40 } }),
  'many targets': Object.assign({}, good, { target: { shape: 'circle', radius: 2, maxTargets: 99 } }), 'two damage effects': Object.assign({}, good, { effects: [{ type: 'damage', scale: .5 }, { type: 'damage', scale: .5 }] }),
  'damage on calm lane': Object.assign({}, good, { base: 'calm' }), 'self damage': Object.assign({}, good, { target: { shape: 'self' } }), 'infinite': Object.assign({}, good, { cooldown: Infinity }),
  'NaN cost': Object.assign({}, good, { cost: { energy: NaN } }), 'negative cost': Object.assign({}, good, { cost: { energy: -50 } }), 'unknown effect': Object.assign({}, good, { effects: [{ type: 'set_hp', hp: 0 }] }),
  'core-only effect': Object.assign({}, good, { effects: [{ type: 'transform' }] }), 'engine hook': Object.assign({}, good, { engine: 'v22:hit' }), 'picks own lane': Object.assign({}, good, { nimbus: 'B' }),
  'unregistered sheet': Object.assign({}, good, { visual: { sheet: 'http://x/y.png', row: 0, frames: [0] } }), 'frame out of range': Object.assign({}, good, { visual: { sheet: 'hero.vfx', row: 9, frames: [0] } }),
  'nested object in effect': Object.assign({}, good, { effects: [{ type: 'damage', scale: { valueOf: 1 } }] }),
  'too strong for budget': Object.assign({}, good, { cost: { energy: 4 }, cooldown: 0.5, effects: [{ type: 'damage', scale: 1.25 }, { type: 'stun', seconds: 1.5 }, { type: 'shield', seconds: 1 }, { type: 'knockback', tiles: 3 }] }),
  'not an object': 'power', 'array': [good], 'null': null
};
const leaked = Object.entries(bad).filter(([k, r]) => SC.validate(r, { tier: 'user' }).ok).map(([k]) => k);
check('rejects ' + Object.keys(bad).length + ' broken / over-cap records', leaked.length === 0, leaked);
// fuzz: random player powers. Anything that validates must be inside every cap and the budget.
let seed = 7; const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648, pick = a => a[Math.floor(rnd() * a.length)], r = (a, b) => +(a + rnd() * (b - a)).toFixed(2);
let accepted = 0, broke = [];
for (let i = 0; i < 3000; i++) {
  const shape = pick(SC.SHAPES), t = { shape }; const TC = SC.CAPS.target[shape]; Object.keys(TC).forEach(k => t[k] = r(TC[k][0] - 1, TC[k][1] * 1.6)); if (rnd() < .3) t.maxTargets = Math.floor(r(0, 8));
  const effs = []; const n = 1 + Math.floor(rnd() * 5); for (let j = 0; j < n; j++) { const ty = pick(SC.USER_EFFECTS), e = { type: ty }, EC = SC.CAPS.effect[ty]; Object.keys(EC).forEach(k => e[k] = r(EC[k][0] - 1, EC[k][1] * 1.8)); effs.push(e); }
  const rec = { schema: 'wir.power/1', id: 'user.fz.p' + i, name: 'Fuzz ' + i, version: '1.0.0', tier: 'user', owner: 'hero', base: pick(SC.LANES),
    cost: { energy: r(-5, 80), stamina: r(-5, 50), stability: r(-5, 30) }, cooldown: r(-1, 40), cast: { time: r(0, 2), anim: pick(SC.ANIMS) }, target: t, effects: effs, visual: { icon: [Math.floor(r(0, 7.9)), Math.floor(r(0, 1.9))] } };
  const v = SC.validate(rec, { tier: 'user' }); if (!v.ok) continue; accepted++;
  const d = effs.find(e => e.type === 'damage');
  const inside = rec.cooldown >= .5 && rec.cooldown <= 30 && (!d || d.scale <= 1.25) && v.budget <= SC.CAPS.budget && (t.maxTargets || 1) <= 5 && effs.length <= 4
    && rec.cost.energy + rec.cost.stamina + rec.cost.stability >= 4 && (!d || SC.DAMAGE_LANES.includes(rec.base)) && (!t.radius || t.radius <= 3) && (!t.range || t.range <= 6);
  if (!inside) broke.push(rec.id);
}
check('fuzz: 3000 random player powers, ' + accepted + ' accepted, all inside the caps and budget', broke.length === 0 && accepted > 0, broke.slice(0, 5));
check('validator never throws on junk', [undefined, 0, '', [], {}, { effects: 'x' }, { cost: null, target: 7, visual: [] }].every(x => { try { SC.validate(x, { tier: 'user' }); return true; } catch (e) { return false; } }));

/* ---------- 4. registry + use() routing (fake v2.2: records which kit move ran) */
const calls = [];
const rctx = { console: { log() {}, warn: (...a) => rctx.warns.push(a.join(' ')) }, warns: [], Math, JSON, Object, Array, Number, String, isFinite, Error };
rctx.window = rctx; vm.createContext(rctx);
const ph = { innerHTML: '', insertBefore() {}, appendChild(n) { ph.kids.push(n); }, kids: [] };
rctx.document = { head: { appendChild() {} }, createElement: () => ({ style: {}, set innerHTML(v) { this._h = v; }, get innerHTML() { return this._h; } }) };
const POW = {}; ['jump', 'dash', 'hit', 'blast', 'transform', 'calm', 'root', 'core', 'crown'].forEach(k => POW[k] = () => true);
rctx.YOUR_V22 = { power: POW, use: (k, src) => { calls.push([k, src]); return k !== 'transform'; } };
let rp = () => {}; const X = { G: { tab: 'your' }, $: s => (s === '#pbody' ? ph : null), esc: s => String(s).replace(/[<>&"]/g, ''), fn: { renderPhone: () => rp }, set: (n, f) => { if (n === 'renderPhone') rp = f; } };
rctx.YOUR_V20_INSTALL = () => {};
for (const f of ['your/v22/your_v22_config.js', 'your/v23/your_v23_config.js', 'your/powers/power_schema.js', 'your/powers/core_kit.js', 'your/powers/your_powers.js']) vm.runInContext(rd(f), rctx, { filename: f });
const R = rctx.YOUR_POWERS; rctx.YOUR_V20_INSTALL(X);
check('registry installed with 9 core records, 0 rejected, no drift', R.installed && R.list('core').length === 9 && R.stats.rejected === 0 && R.errors.length === 0, R.errors);
const routed = KIT.powers.map(p => { calls.length = 0; R.use(p.id, 'qa'); return calls.length === 1 && calls[0][0] === p.id.split('.').pop() && calls[0][1] === 'qa'; });
check('use(id) runs exactly the v2.2 kit move it names (9/9)', routed.every(Boolean), routed);
check('use() returns what v2.2 returns; unknown ids do nothing', R.use('core.mella.transform') === false && R.use('core.mella.hit') === true && (calls.length = 0, R.use('core.nope.x') === false && calls.length === 0));
const g = R.get('core.mella.blast'); try { g.cost.energy = 0; } catch (e) {} try { g.effects.push({ type: 'damage', scale: 9 }); } catch (e) {}
check('records are frozen (cannot be edited at run time)', R.get('core.mella.blast').cost.energy === 14 && R.get('core.mella.blast').effects.length === 2);
check('duplicate ids are refused', R.register(KIT.powers[0], { tier: 'core' }).ok === false);
check('U1 does not run player powers yet (U2)', (R.register(good, { tier: 'user' }).ok) && R.use('user.hero.rainroot-lash') === false);
check('byKey finds the kit by its v2.2 key', R.byKey('L').id === 'core.mella.blast' && R.byKey('3').id === 'core.mella.crown');
rp(false); check('phone YOUR tab lists the kit from the registry', ph.kids.length === 1 && (ph.kids[0]._h.match(/data-power=/g) || []).length === 10 && /Living Refraction/.test(ph.kids[0]._h));
// drift detection: a lane change in v2.3 config shows up as an error (data never picks its own lane)
const dctx = Object.assign({}, rctx, { warns: [] }); dctx.window = dctx; vm.createContext(dctx); dctx.console = { log() {}, warn() {} }; dctx.YOUR_V20_INSTALL = () => {};
for (const f of ['your/v22/your_v22_config.js', 'your/v23/your_v23_config.js']) vm.runInContext(rd(f), dctx);
dctx.YOUR_V23_CONFIG.nimbus.blast = 'Y';
for (const f of ['your/powers/power_schema.js', 'your/powers/core_kit.js', 'your/powers/your_powers.js']) vm.runInContext(rd(f), dctx);
dctx.YOUR_V20_INSTALL(X); check('lane drift between data and v2.3 is reported', dctx.YOUR_POWERS.errors.some(e => e.id === 'core.mella.blast'));

console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
