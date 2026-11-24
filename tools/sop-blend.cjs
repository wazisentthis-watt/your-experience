// Usage: NODE_PATH=<dir with playwright> node tools/sop-blend.cjs <repo dir>
// Stay On Page v44 controller layout inside Y.O.U.R. street fights, driven through a fake Nimbus pad.
const { chromium } = require('playwright'); const path = require('path');
const url = 'file://' + path.resolve(process.argv[2] || '.', 'index.html');
(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] }); let pass = 0, fail = 0;
  const check = (n, ok, x) => { ok ? pass++ : fail++; console.log((ok ? 'PASS ' : 'FAIL ') + n + (ok ? '' : ' ' + JSON.stringify(x === undefined ? '' : x))); };
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } }); const errs = [];
  page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push(m.text()); });
  await page.addInitScript(() => { const P = { id: 'SteelSeries Nimbus (STANDARD GAMEPAD)', index: 0, connected: true, mapping: 'standard', timestamp: 0, axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })) }; window.__P = P;
    window.__down = (...a) => a.forEach(i => { P.buttons[i] = { pressed: true, value: 1 }; }); window.__up = (...a) => a.forEach(i => { P.buttons[i] = { pressed: false, value: 0 }; });
    window.__ax = (a, b, c, d) => { P.axes = [a, b, c, d]; }; navigator.getGamepads = () => [P]; });
  await page.goto(url, { waitUntil: 'load' }); await page.waitForTimeout(500);
  await page.evaluate(() => { window.__Y = window.YOUR_V20.X; __Y.fn.newGame()(); }); await page.waitForTimeout(400);
  await page.evaluate(() => { const G = WIR_GAME.G; G.phone = null; G.fade = 0; const s = document.getElementById('start'); if (s) s.hidden = true; WIR_GAME.enterMap('SAV'); }); await page.waitForTimeout(1500);
  const E = f => page.evaluate(f); const frame = () => page.waitForTimeout(60);
  await E(() => { window.__fresh = (dx) => { const D = SIKEE.debug, R = D.R; if (R.battle) R.battle = null; R.cool = 0; const G = WIR_GAME.G, st = WISHBORN.state(); st.accord = []; WISHBORN._t.R.followers = [];
    D.spawnRoadVillain(); const w = R.wanderers[R.wanderers.length - 1]; w.x = G.px + (dx || 1); w.y = G.py; D.startBattle(w); const f = R.battle.foe; f.cd = 99; f.hp = f.max = 400; R.hp = 60; R.mella = true; R.charge = 100; R.p.atkCd = 0; R.p.comboT = 0; R.stop = 0; R.crit = 0; R.counter = 0; return f; };
    window.__tap = async (btns, ms = 90) => { __down(...btns); await new Promise(r => setTimeout(r, ms)); __up(...btns); await new Promise(r => setTimeout(r, 70)); window.__reset = () => { const R = SIKEE.debug.R; R.p.atkCd = 0; R.stop = 0; }; };
    window.__dmg = async (btns, mods, dx) => { const f = __fresh(dx); const R = SIKEE.debug.R; R.p.atkCd = 0; const h0 = f.hp; const all = [...(mods || []), ...btns]; __down(...(mods || [])); await new Promise(r => setTimeout(r, 90)); __down(...btns); await new Promise(r => setTimeout(r, 90)); __up(...all); await new Promise(r => setTimeout(r, 60)); return h0 - f.hp; }; });
  const on = await E(() => { __fresh(); return SIKEE.fighting(); }); check('fight starts', on);
  await frame(); const ctx = await E(() => NIMBUS.ctx); check('Nimbus is in fight context', ctx === 'fight', ctx);

  // buttons: X jab, Y cross, A teep, B kick (indices X2 Y3 A0 B1)
  const strikes = {};
  for (const [k, b] of [['jab', 2], ['cross', 3], ['teep', 0], ['kick', 1]]) strikes[k] = await E(() => __dmg([b], [], 1.1)).catch(() => 0) || await page.evaluate(async b => await __dmg([b], [], 1.1), b);
  check('X jab = 10', strikes.jab === 10, strikes); check('Y cross = 15', strikes.cross === 15, strikes); check('A teep = 8 (or 8 w/ stagger)', strikes.teep === 8, strikes); check('B kick = 13', strikes.kick === 13, strikes);
  const knee = await page.evaluate(async () => { const f = __fresh(.7); const h0 = f.hp; SIKEE.debug.R.p.atkCd = 0; __down(1); await new Promise(r => setTimeout(r, 90)); __up(1); await new Promise(r => setTimeout(r, 60)); return h0 - f.hp; });
  check('B up close = knee (14)', knee === 14, knee);
  // RB power strikes (RB=5)
  const pw = {}; for (const [k, b] of [['hook', 2], ['upper', 3], ['head', 0]]) pw[k] = await page.evaluate(async b => await __dmg([b], [5], 1.1), b);
  check('RB+X hook = 20', pw.hook === 20, pw); check('RB+Y uppercut = 22', pw.upper === 22, pw); check('RB+A head kick = 23', pw.head === 23, pw);
  const spin = await page.evaluate(async () => await __dmg([1], [5, 6], 1.1)); check('RB+LT+B spinning back kick = 24', spin === 24, spin);
  const clinch = await page.evaluate(async () => await __dmg([0], [5, 6], .9)); check('LT+RB+A clinch throw = 18', clinch === 18, clinch);
  const far = await page.evaluate(async () => await __dmg([0], [5, 6], 3)); check('clinch from far does nothing', far === 0, far);
  // LT low strikes
  const body = await page.evaluate(async () => await __dmg([2], [6], 1.1)); check('LT+X body shot = 11', body === 11, body);
  const leg = await page.evaluate(async () => { const f = __fresh(1.1); SIKEE.debug.R.p.atkCd = 0; __down(6); await new Promise(r => setTimeout(r, 90)); __down(0); await new Promise(r => setTimeout(r, 90)); __up(0, 6); await new Promise(r => setTimeout(r, 60)); return { d: 400 - f.hp, root: f.root > 0 }; });
  check('LT+A leg kick hurts and roots', leg.d === 11 && leg.root, leg);
  // plain strikes blocked while guarding
  const guarded = await page.evaluate(async () => { const f = __fresh(1.1); __down(6); await new Promise(r => setTimeout(r, 90)); const g = SIKEE.debug.R.p.block; __up(6); await new Promise(r => setTimeout(r, 90)); return { g, after: SIKEE.debug.R.p.block }; });
  check('holding LT blocks, releasing stops', guarded.g === true && guarded.after === false, guarded);

  // block reduces damage, parry negates + staggers + counter +35%
  const blk = await page.evaluate(async () => { const f = __fresh(1.2), R = SIKEE.debug.R; R.p.inv = 0; __down(6); await new Promise(r => setTimeout(r, 400)); R.p.parryT = 0; R.p.inv = 0; const hp0 = R.hp; f.st = 'act'; f.stT = .3; f.atk = { id: 'lunge', wind: .5, act: .3, rec: .5, reach: 2.6, rad: .9 }; f.ax = -1; f.ay = 0; f.hit = false; f.x = WIR_GAME.G.px + 1; f.y = WIR_GAME.G.py; f.def.dmg = 10; SIKEE.tick(.016); __up(6); await new Promise(r => setTimeout(r, 80)); return { lost: hp0 - R.hp }; });
  check('blocking cuts a hit to 30%', blk.lost >= 1 && blk.lost <= 4, blk);
  const par = await page.evaluate(async () => { const f = __fresh(1.2), R = SIKEE.debug.R, G = WIR_GAME.G; R.p.inv = 0; R.p.parryCd = 0; f.x = G.px + 1; f.y = G.py; f.st = 'wind'; f.stT = .1; f.atk = { id: 'lunge', wind: .1, act: .3, rec: .5, reach: 2.6, rad: .9 }; f.ax = -1; f.ay = 0; f.hit = false;
    __down(6); await new Promise(r => setTimeout(r, 70)); const hp0 = R.hp; for (let i = 0; i < 20; i++) SIKEE.tick(.016); const r = { lost: hp0 - R.hp, st: f.st, counter: R.counter > 0 }; __up(6); await new Promise(r => setTimeout(r, 400));
    R.p.atkCd = 0; R.stop = 0; f.x = G.px + 1.1; f.y = G.py; const h0 = f.hp; __down(3); await new Promise(r => setTimeout(r, 90)); __up(3); await new Promise(r => setTimeout(r, 60)); r.counterDmg = h0 - f.hp; return r; });
  check('tap LT before a hit = PARRY: no damage, foe staggers', par.lost === 0 && par.st === 'stagger' && par.counter, par);
  check('next strike is a +35% counter (cross 15 -> 20)', par.counterDmg === 20, par);

  // roll: LT + left-stick flick dodges in the stick direction
  const roll = await page.evaluate(async () => { const f = __fresh(2), R = SIKEE.debug.R; R.p.dodgeCd = 0; R.p.dodgeT = 0; __down(6); await new Promise(r => setTimeout(r, 90)); __ax(0, 0, 0, 0); await new Promise(r => setTimeout(r, 60)); __ax(1, 0, 0, 0); await new Promise(r => setTimeout(r, 120)); const d = R.p.dodgeT > 0 || R.p.dodgeCd > 0; __ax(0, 0, 0, 0); __up(6); await new Promise(r => setTimeout(r, 100)); return { d }; });
  check('LT + left-stick flick rolls', roll.d, roll);
  const noroll = await page.evaluate(async () => { const f = __fresh(2), R = SIKEE.debug.R; R.p.dodgeCd = 0; R.p.dodgeT = 0; __ax(1, 0, 0, 0); await new Promise(r => setTimeout(r, 150)); const d = R.p.dodgeT > 0 || R.p.dodgeCd > 0; __ax(0, 0, 0, 0); await new Promise(r => setTimeout(r, 80)); return d; });
  check('plain stick movement does not roll', noroll === false, noroll);

  // RT ki blast aims with the right stick, LB charge, LB specials
  const blast = await page.evaluate(async () => { const f = __fresh(3), R = SIKEE.debug.R, G = WIR_GAME.G; R.blastCool = 0; R.shots = []; R.charge = 100; let first = null; const iv = setInterval(() => { if (!first && R.shots[0]) first = { vx: R.shots[0].vx, vy: R.shots[0].vy }; }, 2); __ax(0, 0, 0, -1); await new Promise(r => setTimeout(r, 90)); __P.buttons[7] = { pressed: true, value: 1 }; await new Promise(r => setTimeout(r, 90)); clearInterval(iv); const s = first; __P.buttons[7] = { pressed: false, value: 0 }; __ax(0, 0, 0, 0); await new Promise(r => setTimeout(r, 60)); return { fired: !!s, vx: s && +s.vx.toFixed(1), vy: s && +s.vy.toFixed(1), charge: R.charge }; });
  check('RT fires a ki blast along the RIGHT STICK (up), not at the foe', blast.fired && Math.abs(blast.vx) < 1 && blast.vy < -8 && blast.charge === 60, blast);
  const auto = await page.evaluate(async () => { const f = __fresh(3), R = SIKEE.debug.R; R.blastCool = 0; R.shots = []; __P.buttons[7] = { pressed: true, value: 1 }; await new Promise(r => setTimeout(r, 90)); const s = R.shots[0]; __P.buttons[7] = { pressed: false, value: 0 }; await new Promise(r => setTimeout(r, 60)); return { vx: s && s.vx }; });
  check('RT with the right stick idle still auto-aims at the foe', auto.vx > 8, auto);
  const chg = await page.evaluate(async () => { __fresh(3); const R = SIKEE.debug.R; R.charge = 10; __down(4); await new Promise(r => setTimeout(r, 600)); for (let i = 0; i < 20; i++) SIKEE.tick(.016); const c = R.charge; __up(4); await new Promise(r => setTimeout(r, 100)); const c2 = R.charge; return { c, held: c > 20 }; });
  check('holding LB charges ki', chg.held, chg);
  const ob = await page.evaluate(async () => { const f = __fresh(3), R = SIKEE.debug.R; R.blastCool = 0; R.shots = []; R.charge = 100; __down(4); await new Promise(r => setTimeout(r, 90)); __down(3); await new Promise(r => setTimeout(r, 90)); const s = R.shots[0]; __up(3, 4); await new Promise(r => setTimeout(r, 60)); return { dmg: s && s.dmg }; });
  check('LB+Y = Overblast (55)', ob.dmg === 55, ob);
  const kaw = await page.evaluate(async () => { __fresh(3); let called = 0; const o = WISHBORN.fightCall; WISHBORN.fightCall = () => { called++; }; __down(4); await new Promise(r => setTimeout(r, 90)); __down(2); await new Promise(r => setTimeout(r, 90)); __up(2, 4); await new Promise(r => setTimeout(r, 60)); __down(12); await new Promise(r => setTimeout(r, 90)); __up(12); await new Promise(r => setTimeout(r, 60)); WISHBORN.fightCall = o; return called; });
  check('LB+X and D-pad up both call your KAW', kaw === 2, kaw);
  const vanish = await page.evaluate(async () => { const f = __fresh(6), R = SIKEE.debug.R; R.blastCool = 0; __down(4); await new Promise(r => setTimeout(r, 90)); __P.buttons[7] = { pressed: true, value: 1 }; await new Promise(r => setTimeout(r, 120)); __P.buttons[7] = { pressed: false, value: 0 }; __up(4); await new Promise(r => setTimeout(r, 80)); return { over: !SIKEE.fighting() }; });
  check('LB+RT vanishes (runs once clear of the foe)', vanish.over, vanish);
  const snap = await page.evaluate(async () => { const f = __fresh(3), R = SIKEE.debug.R; R.p.fx = 0; R.p.fy = -1; __down(5); await new Promise(r => setTimeout(r, 60)); __up(5); await new Promise(r => setTimeout(r, 90)); return { fx: +R.p.fx.toFixed(1) }; });
  check('tap RB snaps aim onto the foe', snap.fx === 1, snap);
  const rbpow = await page.evaluate(async () => { const f = __fresh(1.1), R = SIKEE.debug.R; R.p.fx = 0; R.p.fy = -1; R.p.atkCd = 0; __down(5); await new Promise(r => setTimeout(r, 60)); __down(2); await new Promise(r => setTimeout(r, 90)); __up(2, 5); await new Promise(r => setTimeout(r, 90)); return { hit: 400 - f.hp }; });
  check('RB + button is a power strike, not a snap', rbpow.hit === 20, rbpow);
  // left stick still walks; right stick no longer punches
  const rs = await page.evaluate(async () => { const f = __fresh(1.1); __ax(0, 0, 1, 0); await new Promise(r => setTimeout(r, 400)); __ax(0, 0, 0, 0); await new Promise(r => setTimeout(r, 80)); return 400 - f.hp; });
  check('right stick alone does not punch (it only aims)', rs === 0, rs);
  const ult = await page.evaluate(async () => { const f = __fresh(3), R = SIKEE.debug.R; R.charge = 50; const h0 = f.hp; __down(4); await new Promise(r => setTimeout(r, 90)); __down(1); await new Promise(r => setTimeout(r, 90)); __up(1); await new Promise(r => setTimeout(r, 60)); const early = h0 - f.hp; f.hp = h0; R.charge = 100; __down(1); await new Promise(r => setTimeout(r, 90)); __up(1, 4); await new Promise(r => setTimeout(r, 60)); return { early, dealt: h0 - f.hp, charge: R.charge, brk: f.brk > 0 }; });
  check('LB+B ultimate needs full charge', ult.early === 0, ult); check('ultimate: 60 damage, guard break, charge spent', ult.dealt === 60 && ult.charge < 10 && ult.brk, ult);
  const tf = await page.evaluate(async () => { const f = __fresh(1.1), R = SIKEE.debug.R; R.charge = 60; __down(4); await new Promise(r => setTimeout(r, 90)); __down(0); await new Promise(r => setTimeout(r, 90)); __up(0, 4); await new Promise(r => setTimeout(r, 60)); const r = { form: R.form > 8, charge: R.charge }; R.p.atkCd = 0; const h0 = f.hp; __down(3); await new Promise(r => setTimeout(r, 90)); __up(3); await new Promise(r => setTimeout(r, 60)); r.cross = h0 - f.hp; return r; });
  check('LB+A transform spends 50 charge, starts the form', tf.form && tf.charge <= 20, tf); check('transformed cross = 20 (+30%)', tf.cross === 20, tf);
  const tn = await page.evaluate(async () => { const f = __fresh(3), R = SIKEE.debug.R; R.charge = 10; f.cd = 99; __down(14); await new Promise(r => setTimeout(r, 90)); __up(14); await new Promise(r => setTimeout(r, 60)); return { c: R.charge, cd: f.cd }; });
  check('D-pad left taunts: +12 charge and the foe is baited', tn.c >= 22 && tn.cd <= .3, tn);
  check('no page errors', errs.length === 0, errs.slice(0, 3));
  await page.screenshot({ path: path.join(process.argv[2] || '.', 'tools/sop-blend.png') });
  console.log(`\n${pass} passed, ${fail} failed`); await browser.close(); process.exit(fail ? 1 : 0);
})();
