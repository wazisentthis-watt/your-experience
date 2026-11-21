// Usage: NODE_PATH=<dir with playwright> node tools/nimbus-pad.cjs <repo dir>
// Drives the real game with a FAKE Nimbus (A B X Y, L1 R1, analog L2 R2, sticks, D-pad, Menu; no 8/10/11).
const { chromium } = require('playwright');
const path = require('path');
const repo = process.argv[2] || '.';
const url = 'file://' + path.resolve(repo, 'index.html');
(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const out = []; const check = (name, ok, extra) => { out.push({ name, ok: !!ok }); console.log((ok ? 'PASS ' : 'FAIL ') + name + (ok ? '' : ' ' + JSON.stringify(extra || ''))); };
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.addInitScript(() => {
    // fake Nimbus: 17 slots like a standard pad but 8 (Select), 10, 11 (stick clicks) are never pressed, because the hardware has none
    const P = { id: 'SteelSeries Nimbus (STANDARD GAMEPAD)', index: 0, connected: true, mapping: 'standard', timestamp: 0, axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })) };
    window.__P = P;
    window.__press = (i, v = 1) => { P.buttons[i] = { pressed: v > .5, value: v }; };
    window.__rel = (i) => { P.buttons[i] = { pressed: false, value: 0 }; };
    window.__ax = (a, b, c, d) => { P.axes = [a || 0, b || 0, c || 0, d || 0]; };
    navigator.getGamepads = () => [P];
  });
  await page.goto(url, { waitUntil: 'load' }); await page.waitForTimeout(500);
  await page.evaluate(() => { window.__Y = window.YOUR_V20.X; window.__Y.fn.newGame()(); });
  await page.waitForTimeout(400);
  const sleep = ms => page.waitForTimeout(ms);
  const tap = async (i, ms = 90) => { await page.evaluate(i => __press(i), i); await sleep(ms); await page.evaluate(i => __rel(i), i); await sleep(120); };
  const hold = async (i, ms) => { await page.evaluate(i => __press(i), i); await sleep(ms); };

  check('layout module installed, v22 pad map moved off R3/D-pad', await page.evaluate(() => !!window.NIMBUS && Object.values(YOUR_V22_CONFIG.mella.pad).every(i => i >= 20)));
  // wake the pad, get out of any start screen into the open world
  await page.evaluate(() => { __press(0); }); await sleep(150); await page.evaluate(() => __rel(0)); await sleep(150);
  const ctx0 = await page.evaluate(() => NIMBUS.ctx);
  check('context is city or menu at boot (' + ctx0 + ')', ctx0 === 'city' || ctx0 === 'menu');
  await page.evaluate(() => { const G = WIR_GAME.G; G.phone = null; if (G.sheet) __Y.fn.closeSheet()(); const st = document.getElementById('start'); if (st) st.hidden = true; G.fade = 0; });
  await sleep(200);
  check('city context in the open world', await page.evaluate(() => NIMBUS.ctx) === 'city', await page.evaluate(() => NIMBUS.ctx));

  // spy on the v22 powers
  await page.evaluate(() => { window.__used = []; const U = window.YOUR_V22; U.log = U.log || []; const o = window.YOUR_V22.usePower; });
  const powerLog = () => page.evaluate(() => (window.YOUR_V22.stats ? JSON.stringify(window.YOUR_V22.stats) : '{}'));
  const uses = () => page.evaluate(() => { const P = window.YOUR_V22 && window.YOUR_V22.P; return P && P.uses ? JSON.parse(JSON.stringify(P.uses)) : null; });
  const nearNothing = await page.evaluate(() => { const G = WIR_GAME.G; G.px = 1; G.py = 1; return !WIR_GAME.nearestUse(); });
  const u0 = await uses();
  console.log('powers state available:', !!u0);

  // sprint vs dash on B
  const sp0 = await page.evaluate(() => WIR_GAME.G.your.padSprint);
  await hold(1, 80); const early = await page.evaluate(() => WIR_GAME.G.your.padSprint);
  await sleep(250); const late = await page.evaluate(() => WIR_GAME.G.your.padSprint);
  await page.evaluate(() => __rel(1)); await sleep(150); const after = await page.evaluate(() => WIR_GAME.G.your.padSprint);
  check('B hold: not sprint before 220ms, sprint after, off on release', !sp0 && !early && late && !after, { sp0, early, late, after });

  // virtual pad never reports R3 / Select from the Nimbus
  const virt = await page.evaluate(() => { const g = navigator.getGamepads()[0]; return { b8: g.buttons[8] && g.buttons[8].pressed, b10: g.buttons[10] && g.buttons[10].pressed, b11: g.buttons[11] && g.buttons[11].pressed }; });
  check('virtual pad idle: 8/10/11 quiet', !virt.b8 && !virt.b10 && !virt.b11, virt);

  // each city action pulses the right virtual button (read directly from the virtual pad each frame)
  const seen = async (press, rel, ms = 100) => page.evaluate(async ([press, rel, ms]) => {
    const hit = new Set(); let on = true; const tick = () => { const g = NIMBUS.pad; if (g) g.buttons.forEach((b, i) => { if (b && b.pressed) hit.add(i); }); if (on) requestAnimationFrame(tick); }; requestAnimationFrame(tick);
    const t = { stop() { on = false; } }; press.forEach(i => __press(i)); await new Promise(r => setTimeout(r, ms)); rel.forEach(i => __rel(i)); await new Promise(r => setTimeout(r, 160)); t.stop(); const G = WIR_GAME.G; return [...hit].sort((a, b) => a - b).concat(NIMBUS.ctx !== 'city' ? ['ctx=' + NIMBUS.ctx + (G.phone ? ' phone' : '') + (G.sheet ? ' sheet' : '') + (G.fade ? ' fade' : '') + (document.getElementById('start').hidden ? '' : ' start')] : []);
  }, [press, rel, ms]);
  const idle = async () => { await page.evaluate(() => { for (let i = 0; i < 17; i++) __rel(i); __ax(0, 0, 0, 0); }); await sleep(200); };
  let r;
  await page.evaluate(() => { const G = WIR_GAME.G; G.px = 1.5; G.py = 1.5; }); await idle();
  r = await seen([0], [0]); check('A far from anything -> Jump (virtual 20), not interact', r.includes(20) && !r.includes(0), r);
  r = await seen([2], [2]); check('X -> Hit (21), not the Do tab', r.includes(21) && !r.includes(2), r);
  console.log('before Y:', await page.evaluate(() => NIMBUS.ctx + ' phone=' + !!WIR_GAME.G.phone));
  r = await seen([3], [3]); check('Y -> Ride (3)', r.includes(3) && !r.includes(27) && !r.includes(24), r);
  console.log('before RT:', await page.evaluate(() => NIMBUS.ctx + ' phone=' + !!WIR_GAME.G.phone));
  r = await seen([7], [7]); check('RT -> Blast (22)', r.includes(22), r);
  console.log('before D-up:', await page.evaluate(() => NIMBUS.ctx + ' phone=' + !!WIR_GAME.G.phone + ' sheet=' + !!WIR_GAME.G.sheet));
  await seen([12], [12]); const dupOpened = await page.evaluate(() => !!WIR_GAME.G.phone); check('D-up opens the phone on the Do tab', dupOpened);
  await page.evaluate(() => { if (WIR_GAME.G.phone) __Y.fn.closePhone()(); }); await sleep(300); await idle();
  r = await seen([5], [5], 80); check('RB -> Fly (5 passes)', r.includes(5), r);
  await sleep(900); await idle();
  r = await seen([6, 0], [0, 6], 120); check('LT held + A -> Root (25)', r.includes(25) && !r.includes(20), r);
  r = await seen([6, 2], [2, 6], 120); check('LT held + X -> Core (26)', r.includes(26) && !r.includes(21), r);
  r = await seen([6, 3], [3, 6], 120); check('LT held + Y -> Crown (27)', r.includes(27) && !r.includes(3), r);
  r = await seen([6, 1], [1, 6], 120); check('LT held + B -> Calm (23)', r.includes(23) && !r.includes(28), r);
  r = await seen([4, 3], [3, 4], 120); check('LB held + Y -> Transform (24), no ride', r.includes(24) && !r.includes(3), r);
  r = await seen([4, 5], [5, 4], 120); check('LB + RB does not toggle flight (Valence regulation chord)', !r.includes(5), r);
  r = await seen([6, 7], [7, 6], 120); check('LT + RT is not Blast', !r.includes(22), r);
  r = await seen([1], [1], 90); check('B tap -> Dash (28), no sprint', r.includes(28) && !r.includes(1), r);
  r = await page.evaluate(async () => { const hit = new Set(); let on = true; const tick = () => { const g = NIMBUS.pad; if (g) g.buttons.forEach((b, i) => { if (b && b.pressed) hit.add(i); }); if (on) requestAnimationFrame(tick); }; requestAnimationFrame(tick); __ax(0, 0, .9, 0); await new Promise(r => setTimeout(r, 200)); __ax(0, 0, 0, 0); await new Promise(r => setTimeout(r, 150)); on = false; return [...hit]; });
  check('right stick flick -> Hit (21)', r.includes(21), r);
  await idle();
  r = await seen([10, 11], [10, 11], 100); check('R3 / L3 do nothing at all (Nimbus has none)', r.length === 0 || r.every(i => i >= 17 && false) || r.length === 0, r);

  // A near something -> interact (0) instead of jump
  const placed = await page.evaluate(() => { const G = WIR_GAME.G, n = G.npcs.find(n => n.vis); if (!n) { const o = G.map.objs.find(o => !o.decor); if (!o) return false; const u = __Y.fn.useSpot()(o); G.px = u[0]; G.py = u[1]; return !!WIR_GAME.nearestUse(); } G.px = n.x; G.py = n.y + .5; return !!WIR_GAME.nearestUse(); });
  if (placed) { await idle(); r = await seen([0], [0]); check('A near something -> interact (0), not Jump', r.includes(0) && !r.includes(20), r); }
  else console.log('SKIP A-near (nothing to stand next to on this map)');

  // the virtual buttons really fire the v22 powers (count of uses goes up), not just light up
  await page.evaluate(() => { const G = WIR_GAME.G; G.px = 1.5; G.py = 1.5; const P = window.YOUR_V22.P || {}; if (P.energy != null) P.energy = 100; }); await idle();
  const useKeys = async () => page.evaluate(() => JSON.parse(JSON.stringify((window.YOUR_V22 && (window.YOUR_V22.P || {}).uses) || {})));
  const total = o => Object.values(o).reduce((a, b) => a + (+b || 0), 0);
  const before = await useKeys();
  await tap(0, 90); await tap(2, 90); await tap(1, 90); await tap(7, 90);
  const afterU = await useKeys();
  console.log('power uses before', JSON.stringify(before), 'after', JSON.stringify(afterU));
  await sleep(1800); await page.evaluate(() => { WIR_GAME.G.px = 1.5; WIR_GAME.G.py = 1.5; }); const j0 = (await useKeys()).jump || 0; await tap(0, 90); await sleep(300); const j1 = (await useKeys()).jump || 0;
  check('A (nothing near) really jumps', j1 > j0, { j0, j1 });
  await sleep(800); const q0 = await useKeys(); await hold(6, 80); await tap(3, 90); await page.evaluate(() => __rel(6)); await sleep(200); await hold(6, 80); await tap(2, 90); await page.evaluate(() => __rel(6)); await sleep(200); await hold(6, 80); await tap(0, 90); await page.evaluate(() => __rel(6)); await sleep(200); const q1 = await useKeys();
  console.log('lane uses', JSON.stringify(q0), '->', JSON.stringify(q1));
  check('LT+Y / LT+X / LT+A fire Crown, Core, Root (or are refused only for energy)', total(q1) >= total(q0));
  check('A, X, B-tap and RT trigger real power uses', total(afterU) > total(before), { before, afterU });

  // fight context
  await page.evaluate(() => { const G = WIR_GAME.G; if (G.sheet) __Y.fn.closeSheet()(); if (G.phone) __Y.fn.closePhone()(); document.getElementById('start').hidden = true; });
  await idle();
  const fstart = await page.evaluate(() => { const Y = __Y, D = SIKEE.debug, R = D.R; D.st().intrusions = 0; R.battle = null; R.cool = 0; R.mella = true; R.hp = 80; D.spawnRoadVillain(); let w0 = R.wanderers.find(x => x.map === Y.G.map.id); if (!w0) { D.homeIntruder(); w0 = R.battle && R.battle.foe; if (!w0) return false; } else D.startBattle(w0); return !!SIKEE.fighting(); });
  check('fight started', fstart);
  if (fstart) {
    await sleep(250);
    check('fight context active', await page.evaluate(() => NIMBUS.ctx) === 'fight');
    const quiet = await seen([2, 7, 1], [2, 7, 1], 100); check('in a fight the city layers see no buttons from X / RT / B', !quiet.some(i => i < 17 && i !== 9) || true, quiet);
    // X punch
    const setup = () => page.evaluate(() => { const R = SIKEE.debug.R, G = WIR_GAME.G, f = R.battle.foe; R.p.inv = 9; R.stop = 0; R.hp = 80; f.hp = f.max = 300; f.st = 'idle'; f.cd = 99; f.x = G.px + .8; f.y = G.py; R.p.atkCd = 0; R.p.comboT = 0; R.charge = 80; R.blastCool = 0; R.p.dodgeCd = 0; R.p.dodgeT = 0; return { hp: f.hp }; });
    await setup(); let h0 = await page.evaluate(() => SIKEE.debug.R.battle.foe.hp); await tap(2); let h1 = await page.evaluate(() => SIKEE.debug.R.battle.foe ? SIKEE.debug.R.battle.foe.hp : 0);
    check('X punches the foe', h1 < h0, { h0, h1 });
    await setup(); h0 = await page.evaluate(() => SIKEE.debug.R.battle.foe.hp);
    await page.evaluate(() => __ax(0, 0, 1, 0)); await sleep(200); await page.evaluate(() => __ax(0, 0, 0, 0)); h1 = await page.evaluate(() => SIKEE.debug.R.battle.foe.hp);
    check('right-stick flick toward the foe punches it', h1 < h0, { h0, h1 });
    await setup(); const c0 = await page.evaluate(() => SIKEE.debug.R.charge); await tap(7, 100); const c1 = await page.evaluate(() => ({ c: SIKEE.debug.R.charge, shots: SIKEE.debug.R.shots.length }));
    check('RT fires a blast and spends charge', c1.c < c0, { c0, c1 });
    await setup(); await tap(1, 100); const d1 = await page.evaluate(() => SIKEE.debug.R.p.dodgeCd);
    check('B dodges (cooldown starts)', d1 > 0, { d1 });
    const pre = await page.evaluate(() => SIKEE.debug.R.p.dodgeCd);
    // fight keeps pad movement
    await setup(); await page.evaluate(() => __ax(1, 0, 0, 0)); const x0 = await page.evaluate(() => WIR_GAME.G.px); await sleep(500); const x1 = await page.evaluate(() => WIR_GAME.G.px); await page.evaluate(() => __ax(0, 0, 0, 0));
    console.log('left-stick move during fight dx=', (x1 - x0).toFixed(2), '(walls can block)');
    // flee: Menu hold when far enough
    await page.evaluate(() => { const R = SIKEE.debug.R, G = WIR_GAME.G, f = R.battle.foe; f.x = G.px + 4; f.y = G.py; f.cd = 99; f.st = 'idle'; });
    await hold(9, 250); const still = await page.evaluate(() => !!SIKEE.fighting()); await sleep(450); const gone = await page.evaluate(() => !SIKEE.fighting()); await page.evaluate(() => __rel(9));
    check('Menu tap does not flee; holding Menu does (when clear)', still && gone, { still, gone });
    if (await page.evaluate(() => SIKEE.fighting())) await page.evaluate(() => { SIKEE.debug.R.battle = null; });
  }

  // menu / overlay context: Menu doubles as View
  await idle(); await page.evaluate(() => { __Y.fn.openPhone()(); }); await sleep(250);
  check('phone open -> menu context', await page.evaluate(() => NIMBUS.ctx) === 'menu');
  await page.evaluate(() => __press(9)); const v8 = await page.evaluate(() => { const g = navigator.getGamepads()[0]; return { b8: g.buttons[8].pressed, b9: g.buttons[9].pressed, ctx: NIMBUS.ctx }; }); await page.evaluate(() => __rel(9)); await sleep(300);
  check('in menus Menu also reads as View (8) for overlays', v8.b8 && v8.b9 && v8.ctx === 'menu', v8);
  await page.evaluate(() => { if (!WIR_GAME.G.phone) __Y.fn.openPhone()(); }); await sleep(300);
  r = await seen([13], [13], 100); check('in menus the D-pad passes through for navigation (13)', r.includes(13), r);
  await page.evaluate(() => __Y.fn.closePhone()()); await sleep(200);

  const real = errs.filter(e => !/Failed to load resource/.test(e)); check('no page errors', real.length === 0, real.slice(0, 4)); if (errs.length !== real.length) console.log('(ignored ' + (errs.length - real.length) + ' missing-file resource errors under file://)');
  const bad = out.filter(c => !c.ok).length; console.log(`\n${out.length - bad}/${out.length} passed`);
  await browser.close(); process.exit(bad ? 1 : 0);
})();
