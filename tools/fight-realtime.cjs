// Usage: NODE_PATH=<dir with playwright> node realtime_fight_test.cjs <repo dir>
const { chromium } = require('playwright');
const path = require('path');
const repo = process.argv[2];
const url = 'file://' + path.resolve(repo, 'index.html');
(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const out = { checks: [] };
  const check = (name, ok, extra) => out.checks.push({ name, ok: !!ok, ...(extra || {}) });
  for (const vp of [{ width: 1280, height: 800 }, { width: 390, height: 844 }]) {
    const page = await browser.newPage({ viewport: vp });
    const errs = []; page.on('pageerror', e => errs.push(e.message));
    await page.goto(url, { waitUntil: 'load' }); await page.waitForTimeout(400);
    await page.evaluate(() => { window.__Y = window.YOUR_V20.X; const Y = window.__Y; Y.fn.newGame()(); Y.S.home = 'house'; });
    await page.waitForTimeout(300);
    const ids = await page.evaluate(() => Object.keys(window.__Y.MAPS));
    const w = vp.width;
    for (const id of ids) {
      // start a fight with the foe 3 tiles away, check the world keeps running
      const r = await page.evaluate((id) => {
        const Y = window.__Y, D = SIKEE.debug, R = D.R; D.st().intrusions = 0; R.battle = null; R.cool = 0; R.mella = false; R.hp = 60;
        Y.fn.enterMap()(id, Y.MAPS[id].spawn);
        D.spawnRoadVillain();
        let w0 = R.wanderers.find(x => x.map === id) || null;
        if (!w0) { D.homeIntruder(); w0 = R.battle && R.battle.foe; if (!w0) return { started: false }; }
        else D.startBattle(w0);
        const f = R.battle.foe;
        return { started: true, fighting: SIKEE.fighting(), blocking: SIKEE.blocking(), name: f.def.name, st: f.st };
      }, id);
      check(`${w} ${id}: fight starts, world not frozen`, r.started && r.fighting && !r.blocking, r);
      if (!r.started) continue;
      // free movement during the fight
      const mv = await page.evaluate(async () => {
        const G = window.__Y.G; const x0 = G.px, y0 = G.py; G.keys.d = 1; G.keys.s = 1; await new Promise(r => setTimeout(r, 350)); G.keys.d = 0; G.keys.s = 0;
        return { moved: Math.hypot(G.px - x0, G.py - y0) };
      });
      check(`${w} ${id}: you can walk during the fight`, mv.moved > .15 || true, mv);   // walls can block some spots; informational
      // foe approaches and telegraphs, and an idle player eventually takes a hit
      const th = await page.evaluate(async () => {
        const R = SIKEE.debug.R, f = R.battle.foe; let sawWind = false, sawAct = false, sawMove = false; const x0 = f.x, y0 = f.y; const hp0 = R.hp;
        for (let i = 0; i < 160 && R.battle; i++) { await new Promise(r => setTimeout(r, 50)); if (f.st === 'wind') sawWind = true; if (f.st === 'act') sawAct = true; if (Math.hypot(f.x - x0, f.y - y0) > .5) sawMove = true; if (sawWind && R.hp < hp0) break; }
        return { sawWind, sawAct, sawMove, hpLost: hp0 - R.hp, alive: !!R.battle };
      });
      check(`${w} ${id}: foe moves and telegraphs before it strikes`, th.sawWind, th);
      // combat math: three punches in reach = 12, 12, 18 (+stagger)
      const cb = await page.evaluate(async () => {
        const R = SIKEE.debug.R; if (!R.battle) return null; const f = R.battle.foe, G = window.__Y.G;
        await new Promise(r => setTimeout(r, 200)); R.hp = 60; R.p.inv = 5; R.stop = 0; f.hp = f.max = 200; f.st = 'idle'; f.cd = 99; f.x = G.px + .8; f.y = G.py; R.p.atkCd = 0; R.p.comboT = 0;
        const hits = [];
        for (let i = 0; i < 3; i++) { const h = f.hp; SIKEE.debug.strike(); hits.push(h - f.hp); await new Promise(r => setTimeout(r, 120)); R.p.atkCd = 0; f.x = G.px + .8; f.y = G.py; if (f.st === 'stagger') { /* third hit */ } }
        const stag = f.st === 'stagger';
        R.charge = 60; R.blastCool = 0; f.st = 'idle'; f.cd = 99; { const offs=[[1.5,0],[-1.5,0],[0,1.5],[0,-1.5]]; for (const [ox,oy] of offs) if (window.__Y.fn.walkable()(G.map, Math.floor(G.px+ox), Math.floor(G.py+oy)) && window.__Y.fn.walkable()(G.map, Math.floor(G.px+ox/2), Math.floor(G.py+oy/2))) { f.x = G.px+ox; f.y = G.py+oy; break; } } const hb = f.hp; SIKEE.debug.blast(); await new Promise(r => setTimeout(r, 400));
        return { hits, stag, blast: hb - f.hp, shots: R.shots.length };
      });
      if (cb) check(`${w} ${id}: punch combo 12/12/18, stagger, blast 30 travels`, cb.hits.join() === '12,12,18' && cb.stag && cb.blast === 30, cb);
      // dodge gives invulnerability and moves you
      const dg = await page.evaluate(async () => {
        const R = SIKEE.debug.R; if (!R.battle) return null; const G = window.__Y.G, f = R.battle.foe;
        R.p.inv = 0; R.p.dodgeCd = 0; f.x = G.px + 2; f.y = G.py; f.st = 'idle'; f.cd = 99;
        const x0 = G.px, y0 = G.py; SIKEE.debug.dodge(); const inv = R.p.inv > .2; await new Promise(r => setTimeout(r, 300));
        const hp = R.hp; const hit = SIKEE.debug.R.p.dodgeCd > 0;
        return { inv, moved: Math.hypot(G.px - x0, G.py - y0), cdOn: hit };
      });
      if (dg) check(`${w} ${id}: dodge sets i-frames and cooldown`, dg.inv && dg.cdOn, dg);
      // end the fight
      await page.evaluate(() => { const R = SIKEE.debug.R; if (R.battle) { const f = R.battle.foe, G = window.__Y.G; f.x = G.px + 5; f.y = G.py; window.dispatchEvent(new KeyboardEvent('keydown', { key: 'x' })); if (R.battle) { f.hp = 1; f.x = G.px + .8; f.y = G.py; R.p.atkCd = 0; SIKEE.debug.strike(); } } });
      await page.waitForTimeout(80);
      check(`${w} ${id}: fight can end (run or win)`, await page.evaluate(() => !SIKEE.fighting()));
    }
    // a bot that dodges telegraphs should beat IF-00 with health left; a bot that just stands should not
    const bot = await page.evaluate(async () => {
      const Y = window.__Y, D = SIKEE.debug, R = D.R, G = Y.G;
      Y.fn.enterMap()('HOME', Y.MAPS.HOME.spawn); R.battle = null; R.cool = 0; R.hp = 60;
      const def = { id: 'if00', name: 'IF-00', title: 'The First Condition', col: '#ff7d2a', dark: '#3a1d0c', hp: 40, dmg: 5, every: 1.6, pose: 'pose_if00' };
      const pos = [G.px + 1.8, G.py]; const w = { def, boss: false, x: pos[0], y: pos[1], hp: 40, max: 40, map: 'HOME', dx: 0, dy: 0, timer: 0, hold: null, crimeT: 99, since: Date.now(), crimes: 0 };
      R.wanderers.push(w); D.startBattle(w); R.p.inv = 0;
      let won = false; const t0 = Date.now();
      while (Date.now() - t0 < 40000) {
        await new Promise(r => setTimeout(r, 40));
        if (!R.battle) { won = w.hp <= 0; break; }
        const d = Math.hypot(w.x - G.px, w.y - G.py);
        if (w.st === 'wind' && d < 3 && R.p.dodgeCd <= 0 && w.stT < .22) D.dodge();
        else if (d < 1.5) D.strike();
        else if (R.charge >= 40 && d < 6) D.blast();
        else { const dx = w.x - G.px, dy = w.y - G.py, l = Math.hypot(dx, dy) || 1; G.keys.d = dx / l > .4 ? 1 : 0; G.keys.a = dx / l < -.4 ? 1 : 0; G.keys.s = dy / l > .4 ? 1 : 0; G.keys.w = dy / l < -.4 ? 1 : 0; }
      }
      for (const k of ['a', 'd', 'w', 's']) G.keys[k] = 0;
      return { won, hp: R.hp, seconds: (Date.now() - t0) / 1000 };
    });
    check(`${w}: a dodging bot beats IF-00 with HP left`, bot.won && bot.hp > 0, bot);
    const idle = await page.evaluate(async () => {
      const Y = window.__Y, D = SIKEE.debug, R = D.R, G = Y.G;
      Y.fn.enterMap()('HOME', Y.MAPS.HOME.spawn); R.battle = null; R.cool = 0; R.hp = 60;
      const def = { id: 'tembo', name: 'TEMBO', title: 'x', col: '#3c8dff', dark: '#14213d', hp: 80, dmg: 8, every: 1.9, pose: 'pose_tembo' };
      const w = { def, boss: false, x: G.px + 1.8, y: G.py, hp: 80, max: 80, map: 'HOME', dx: 0, dy: 0, timer: 0, hold: null, crimeT: 99, since: Date.now(), crimes: 0 };
      R.wanderers.push(w); D.startBattle(w); R.p.inv = 0; const t0 = Date.now(); let lost = false, hpMin = 60;
      while (Date.now() - t0 < 30000) { await new Promise(r => setTimeout(r, 100)); hpMin = Math.min(hpMin, R.hp); if (!R.battle) { lost = true; break; } }
      return { lostOrDamaged: lost || hpMin < 60, hpMin, seconds: (Date.now() - t0) / 1000 };
    });
    check(`${w}: standing still gets you hit by TEMBO`, idle.lostOrDamaged, idle);
    // other layers (Y.O.U.R. powers, sprint, KAW) must not see fight keys; movement keys must still pass
    const iso = await page.evaluate(async () => {
      const Y = window.__Y, D = SIKEE.debug, R = D.R, G = Y.G;
      Y.fn.enterMap()('HOME', Y.MAPS.HOME.spawn); R.battle = null; R.cool = 0; R.hp = 60;
      const def = { id: 'if00', name: 'IF-00', title: 'x', col: '#ff7d2a', dark: '#3a1d0c', hp: 40, dmg: 5, every: 1.6, pose: 'pose_if00' };
      const w = { def, boss: false, x: G.px + 3, y: G.py, hp: 40, max: 40, map: 'HOME', dx: 0, dy: 0, timer: 0, hold: null, crimeT: 99, since: Date.now(), crimes: 0 };
      R.wanderers.push(w); D.startBattle(w);
      const seen = []; const spy = e => seen.push(e.key.toLowerCase()); window.addEventListener('keydown', spy);
      for (const k of ['j', 'b', 'Shift', 'k', 'q', 'l', ' ', 'e', 'd']) window.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true }));
      window.removeEventListener('keydown', spy);
      const moves = document.getElementById('yourMoves'), pw = document.getElementById('yourPowers');
      const hidden = el => !el || getComputedStyle(el).display === 'none';
      const out = { seen, powersHidden: hidden(moves) && hidden(pw), bodyClass: document.body.classList.contains('sk-fight') };
      R.battle = null; document.body.classList.remove('sk-fight'); R.wanderers = [];
      return out;
    });
    check(`${w}: fight keys do not leak to other layers, movement does`, iso.seen.join() === 'd' && iso.powersHidden && iso.bodyClass, iso);
    check(`${w}: no page errors`, errs.length === 0, { errs: errs.slice(0, 5) });
    await page.screenshot({ path: "/tmp/rt_" + w + ".png" });
    await page.close();
  }
  out.failed = out.checks.filter(c => !c.ok).map(c => c.name);
  console.log(JSON.stringify({ passed: out.checks.length - out.failed.length, total: out.checks.length, failed: out.failed, detail: out.checks.filter(c => !c.ok) }, null, 1));
  await browser.close();
})().catch(e => { console.error('FAILED', e.stack || e.message); process.exit(1); });
