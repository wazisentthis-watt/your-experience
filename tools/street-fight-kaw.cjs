// Usage: NODE_PATH=<dir with playwright> node tools/street-fight-kaw.cjs <repo dir>
// Street fight upgrade (slip, crit, guard break, roots/burn, VFX) + KAW allies (own timing, may refuse, Veyru via his brain).
const { chromium } = require('playwright'); const path = require('path');
const url = 'file://' + path.resolve(process.argv[2] || '.', 'index.html');
(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] }); let pass = 0, fail = 0;
  const check = (n, ok, x) => { ok ? pass++ : fail++; console.log((ok ? 'PASS ' : 'FAIL ') + n + (ok ? '' : ' ' + JSON.stringify(x === undefined ? '' : x))); };
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } }); const errs = [];
  page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push(m.text()); });
  await page.addInitScript(() => { const P = { id: 'SteelSeries Nimbus (STANDARD GAMEPAD)', index: 0, connected: true, mapping: 'standard', timestamp: 0, axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })) }; window.__P = P; window.__press = i => { P.buttons[i] = { pressed: true, value: 1 }; }; window.__rel = i => { P.buttons[i] = { pressed: false, value: 0 }; }; navigator.getGamepads = () => [P]; });
  await page.goto(url, { waitUntil: 'load' }); await page.waitForTimeout(500);
  await page.evaluate(() => { window.__Y = window.YOUR_V20.X; __Y.fn.newGame()(); }); await page.waitForTimeout(400);
  await page.evaluate(() => { const G = WIR_GAME.G; G.phone = null; G.fade = 0; const s = document.getElementById('start'); if (s) s.hidden = true; WIR_GAME.enterMap('SAV'); }); await page.waitForTimeout(1500);
  const E = f => page.evaluate(f);
  // helper installed in page: fresh fight vs a plain villain with the hero beside open ground
  await E(() => { window.__fresh = () => { const D = SIKEE.debug; if (D.R.battle) { D.R.battle = null; } D.R.cool = 0; const G = WIR_GAME.G, st = WISHBORN.state(); st.accord = []; WISHBORN._t.R.followers = [];
    D.spawnRoadVillain(); const w = D.R.wanderers[D.R.wanderers.length - 1]; w.x = G.px + 1.6; w.y = G.py; D.startBattle(w); const f = D.R.battle.foe; f.cd = 99; f.hp = f.max = 400; return f; }; });
  const f0 = await E(() => { const f = __fresh(); return { on: SIKEE.fighting(), hp: f.hp }; }); check('fight starts', f0.on, f0);

  // SLIP: dodge into an active lunge
  const slip = await E(async () => { const D = SIKEE.debug, R = D.R, f = R.battle.foe, G = WIR_GAME.G; R.hp = 60; R.p.inv = 0; f.x = G.px + 1; f.y = G.py; f.st = 'act'; f.stT = .3; f.atk = { id: 'lunge', wind: .5, act: .3, rec: .5, reach: 2.6, rad: .9 }; f.ax = -1; f.ay = 0; f.hit = false; D.dodge();
    for (let i = 0; i < 6; i++) SIKEE.tick(.016); return { hp: R.hp, slow: R.slow, crit: R.crit, charge: R.charge, dcd: R.p.dodgeCd }; });
  check('dodge into an attack = SLIP (no damage, slow-mo, crit ready, dodge refreshed)', slip.hp === 60 && slip.slow > 0 && slip.crit > 0 && slip.dcd === 0, slip);
  const crit = await E(async () => { const D = SIKEE.debug, R = D.R, f = R.battle.foe, G = WIR_GAME.G; R.slow = 0; R.stop = 0; R.p.dodgeT = 0; R.p.atkCd = 0; R.p.comboT = 0; f.x = G.px + 1; f.y = G.py; f.st = 'idle'; f.cd = 99; const h0 = f.hp, p0 = f.poise; D.strike(); return { dealt: h0 - f.hp, crit: R.crit }; });
  check('next punch crits for double and the crit is spent', crit.dealt === 24 && crit.crit === 0, crit);

  // BREAK
  const brk = await E(async () => { const f = __fresh(), R = SIKEE.debug.R; R.stop = 0; const before = f.brk; let n = 0; while (f.brk <= 0 && n++ < 20) { R.stop = 0; R.p.atkCd = 0; f.x = WIR_GAME.G.px + 1; f.y = WIR_GAME.G.py; f.st = 'idle'; f.cd = 99; SIKEE.debug.strike(); }
    const h = f.hp; R.stop = 0; const r = { brk: f.brk > 0, st: f.st, n }; const hp1 = f.hp; SIKEE.debug.API.hit(10, '#fff'); r.brkDmg = hp1 - f.hp; return r; });
  check('enough hits break the guard (stagger) in under 6 punches', brk.brk && brk.st === 'stagger' && brk.n <= 6, brk);
  check('a broken foe takes 1.5x damage', brk.brkDmg === 15, brk);

  // ROOT + BURN statuses
  const stat = await E(async () => { const f = __fresh(), G = WIR_GAME.G; f.x = G.px + 4; f.y = G.py; f.cd = 99; SIKEE.debug.API.root(1.5); const x0 = f.x; for (let i = 0; i < 50; i++) SIKEE.tick(.016); const moved = Math.abs(f.x - x0);
    f.root = 0; for (let i = 0; i < 50; i++) SIKEE.tick(.016); const free = Math.abs(f.x - x0);
    const h0 = f.hp; SIKEE.debug.API.burn(5, 2); for (let i = 0; i < 160; i++) SIKEE.tick(.016); return { moved, free, burned: h0 - f.hp }; });
  check('rooted foe cannot walk, then walks again', stat.moved < .05 && stat.free > .3, stat);
  check('burn ticks damage over time', stat.burned >= 5 && stat.burned <= 30, stat);

  // KAW assists: one follower per effect, forced willing
  const roles = await E(async () => { const out = {}, T = WISHBORN._t; const rr = Math.random;
    for (const fx of ['heal', 'shock', 'burn', 'snare', 'stagger']) { const f = __fresh(), D = SIKEE.debug, R = D.R, G = WIR_GAME.G; f.x = G.px + 2.5; f.y = G.py; f.cd = 99; R.hp = 20; const sp = WISHBORN.species.find(x => x.fx === fx); const s = WISHBORN.state(); s.accord = [{ sp: sp.id, since: 'x', fedAt: Date.now(), energy: 1 }]; T.followerObjs(); const fol = WISHBORN.followers[0]; fol.x = G.px - 1.5; fol.y = G.py;
      const h0 = f.hp, hp0 = R.hp; f.st = 'wind'; f.stT = .4; f.atk = { id: 'lunge', wind: .55, act: .22, rec: .7, reach: 2.6, rad: .75 }; Math.random = () => 0; SIKEE.act('kaw'); Math.random = rr;
      out[fx] = { cast: fol.fcd > 0, heal: R.hp - hp0, dmg: h0 - f.hp, root: f.root > 0, burn: !!f.burn, st: f.st, energy: fol.a.energy }; }
    return out; });
  check('heal ally mends you', roles.heal.cast && roles.heal.heal === 12, roles.heal);
  check('shock ally zaps and staggers', roles.shock.cast && roles.shock.dmg >= 8 && roles.shock.st === 'stagger', roles.shock);
  check('burn ally sets the foe burning', roles.burn.cast && roles.burn.burn && roles.burn.dmg >= 6, roles.burn);
  check('snare ally roots the foe and cancels its wind-up', roles.snare.cast && roles.snare.root && roles.snare.st === 'idle', roles.snare);
  check('stagger ally shoves and interrupts the attack', roles.stagger.cast && roles.stagger.st === 'stagger', roles.stagger);
  check('using a power costs the ally energy', roles.shock.energy < 1, roles.shock);

  // their own behavior: refusal, hunger, cooldown, distance
  const beh = await E(async () => { const o = {}, T = WISHBORN._t; const f = __fresh(), D = SIKEE.debug, G = WIR_GAME.G; f.x = G.px + 2.5; f.y = G.py; f.cd = 99; const sp = WISHBORN.species.find(x => x.fx === 'shock'); const s = WISHBORN.state();
    s.accord = [{ sp: sp.id, since: 'x', fedAt: Date.now(), energy: 1 }]; T.followerObjs(); const fol = WISHBORN.followers[0]; fol.x = G.px - 1; fol.y = G.py; const rr = Math.random;
    Math.random = () => .99; const h0 = f.hp; SIKEE.act('kaw'); o.refusedNoCast = f.hp === h0 && fol.emote === '…'; Math.random = rr;
    fol.fcd = 0; s.accord[0].fedAt = Date.now() - 20 * 60000; const ws = WISHBORN.assistants()[0].will; s.accord[0].fedAt = Date.now(); const wf = WISHBORN.assistants()[0].will; o.hungryLessWilling = ws < wf;
    Math.random = () => 0; fol.fcd = 5; SIKEE.act('kaw'); o.cooldownBlocks = f.hp === h0; Math.random = rr;
    fol.fcd = 0; fol.x = G.px - 30; fol.y = G.py; Math.random = () => 0; SIKEE.act('kaw'); Math.random = rr; o.farBlocks = f.hp === h0; return o; });
  check('an ally can refuse when called', beh.refusedNoCast, beh);
  check('a hungry ally is less willing', beh.hungryLessWilling, beh);
  check('cooldown blocks repeat casts', beh.cooldownBlocks, beh);
  check('an ally too far away does not hear you', beh.farBlocks, beh);
  const auto = await E(async () => { const T = WISHBORN._t, f = __fresh(), D = SIKEE.debug, G = WIR_GAME.G, R = D.R; f.x = G.px + 2.5; f.y = G.py; f.cd = 99; const sp = WISHBORN.species.find(x => x.fx === 'heal'); const s = WISHBORN.state();
    s.accord = [{ sp: sp.id, since: 'x', fedAt: Date.now(), energy: 1 }]; T.followerObjs(); const fol = WISHBORN.followers[0]; fol.x = G.px - 1; fol.y = G.py; R.hp = 15; const rr = Math.random; Math.random = () => 0; for (let i = 0; i < 90; i++) SIKEE.tick(.016); Math.random = rr; return { hp: R.hp }; });
  check('a healer helps on its own when you are low (no button)', auto.hp > 15, auto);

  // Veyru via his own brain
  const vey = await E(async () => { const f = __fresh(), D = SIKEE.debug, R = D.R, G = WIR_GAME.G; WISHBORN.state().accord = []; WISHBORN._t.R.followers = []; const real = YOUR_V24.state; const fake = Object.assign({}, real(), { accompanied: true, currentMap: G.map.id }); YOUR_V24.state = () => fake;
    const o = { listed: WISHBORN.assistants().some(a => a.key === 'veyru'), will: WISHBORN.assistants().find(a => a.key === 'veyru').will }; R.hp = 20; const rr = Math.random; Math.random = () => 0; SIKEE.act('kaw'); Math.random = rr; o.healed = R.hp > 20;
    fake.accompanied = false; o.leftHomeOut = !WISHBORN.assistants().some(a => a.key === 'veyru'); fake.accompanied = true; fake.needs = Object.assign({}, fake.needs, { restNeed: 95, fear: 60 }); o.tiredWill = WISHBORN.assistants().find(a => a.key === 'veyru').will; YOUR_V24.state = real; return o; });
  check('Veyru helps only when he is out with you, using his own bond/needs', vey.listed && vey.healed && vey.leftHomeOut, vey);
  check('an exhausted, scared Veyru is much less willing', vey.tiredWill < vey.will - .3, vey);

  // VFX alive and cleaned up
  const vfx = await E(async () => { const f = __fresh(), D = SIKEE.debug, R = D.R, G = WIR_GAME.G; f.x = G.px + 1; f.y = G.py; f.st = 'idle'; f.cd = 99; R.stop = 0; R.p.dodgeT = 0; R.p.atkCd = 0; R.p.comboT = 0; D.strike(); const parts = R.parts.length, shake = R.shake; for (let i = 0; i < 4; i++) SIKEE.tick(.016); const tr = document.querySelector('canvas').style.transform; f.hp = 1; f.x = G.px + 1; f.y = G.py; f.kx = 0; f.ky = 0; R.stop = 0; R.p.atkCd = 0; R.p.comboT = 0; D.strike(); return { parts, shake, tr: !!tr }; });
  check('hits spawn particles and shake the screen', vfx.parts > 0 && vfx.shake > 0, vfx);
  await page.waitForTimeout(100); await page.screenshot({ path: 'tools/street-fight-kaw.png' });
  const after = await E(async () => { for (let i = 0; i < 40; i++) SIKEE.tick(.03); return { fighting: SIKEE.fighting(), tr: document.querySelector('canvas').style.transform, parts: SIKEE.debug.R.parts.length }; });
  check('after the fight the screen settles and effects clear', !after.fighting && after.tr === '' && after.parts === 0, after);
  // follower returns to normal after the fight
  const back = await E(async () => { WISHBORN.state().accord = []; WISHBORN._t.R.followers = []; const sp = WISHBORN.species[3]; WISHBORN.state().accord = [{ sp: sp.id, since: 'x', fedAt: Date.now(), energy: 1 }]; WISHBORN._t.followerObjs(); WISHBORN._t.R.fightAt = performance.now() - 5000; const G = WIR_GAME.G; G.px += 6; for (let i = 0; i < 200; i++) WISHBORN.tick(.05); const f = WISHBORN.followers[0]; return Math.hypot(f.x - G.px, f.y - G.py); });
  check('followers go back to normal follow after a fight (' + back.toFixed(1) + ')', back < 4, back);
  // Nimbus Y calls KAW in a fight
  const ny = await E(async () => { __fresh(); let n = 0; const orig = WISHBORN.fightCall; WISHBORN.fightCall = () => { n++; }; const gp = { id: 'Nimbus', index: 0, connected: true, mapping: 'standard', timestamp: 0, axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 })) };
    await new Promise(r => setTimeout(r, 150)); __press(3); await new Promise(r => setTimeout(r, 200)); __rel(3); await new Promise(r => setTimeout(r, 120)); WISHBORN.fightCall = orig; return n; });
  check('Nimbus Y calls your KAW in a fight', ny >= 1, ny);
  check('no page errors', errs.length === 0, errs.slice(0, 4));
  console.log(`\n${pass} passed, ${fail} failed`); await browser.close(); process.exit(fail ? 1 : 0);
})();
