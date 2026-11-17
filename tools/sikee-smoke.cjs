const { chromium } = require('playwright');
const url = 'file://' + require('path').resolve(__dirname, '..', 'index.html');
(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.addInitScript(() => {
    let orig = null;
    Object.defineProperty(window, 'YOUR_V20_INSTALL', { configurable: true,
      get() { return function (obj) { window.__Y = obj; return orig ? orig(obj) : undefined; }; },
      set(v) { orig = v; } });
  });
  await page.goto(url, { waitUntil: 'load' }); await page.waitForTimeout(500);
  const out = {};
  out.start = await page.evaluate(() => { const Y = window.__Y; Y.fn.newGame()(); Y.S.home = 'house'; return { S: !!Y.S, map: Y.G.map.id, sikeeApi: typeof window.SIKEE }; });
  // 1. enter Savannah, spawn villains on the road
  out.road = await page.evaluate(() => {
    const Y = window.__Y; Y.fn.enterMap()('SAV', [4.5, 12.5]);
    for (let i = 0; i < 3; i++) SIKEE.debug.spawnRoadVillain();
    const R = SIKEE.debug.R; return { wanderers: R.wanderers.length, names: R.wanderers.map(w => w.def.name), rescues: SIKEE.debug.st().rescues.length };
  });
  await page.waitForTimeout(300);
  // 2. battle: contact, no Mella -> no damage to foe; Mella on -> win
  out.battle = await page.evaluate(() => {
    const R = SIKEE.debug.R; const w = R.wanderers[0]; SIKEE.debug.startBattle(w);
    const battleOpen = !document.getElementById('sikeeBattle').hidden;
    const blocked = SIKEE.blocking();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'j' })); // no mella: should not hit
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'j' }));
    const hpNoMella = w.hp;
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'm' }));  // mella on
    return { battleOpen, blocked, hpNoMella, mella: R.mella, foe: w.def.name, foeHp: w.hp };
  });
  // strike until the foe falls (real-time cooldown 0.35s)
  for (let i = 0; i < 12 && await page.evaluate(() => SIKEE.blocking()); i++) {
    await page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'j' })));
    await page.waitForTimeout(400);
  }
  out.afterWin = await page.evaluate(() => { const s = SIKEE.debug.st(); return { blocking: SIKEE.blocking(), defeated: s.defeated, rescued: s.rescued, failed: s.failed, rescueStates: s.rescues.map(r => r.state), hp: SIKEE.debug.R.hp }; });
  // 3. plants at stage 4 at home, draw without error
  out.plants = await page.evaluate(() => {
    const Y = window.__Y; SIKEE.debug.st().plantStart = Date.now() - 45 * 60 * 1000;
    Y.fn.enterMap()('HOME', Y.MAPS.HOME.spawn); return { stage: SIKEE.debug.plantStage() };
  });
  await page.waitForTimeout(600);
  // 4. KAW home check: K starts trip, expires, reports
  out.kaw = await page.evaluate(() => { window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k' })); const s = SIKEE.debug.st(); const started = !!s.kawTrip; s.kawTrip.until = Date.now() - 1; return { started }; });
  await page.waitForTimeout(400);
  out.kawDone = await page.evaluate(() => ({ trip: SIKEE.debug.st().kawTrip }));
  // 5. house intrusion: outside, intrusion count goes to home fight on entry
  out.intrusion = await page.evaluate(() => {
    const Y = window.__Y; const s = SIKEE.debug.st(); s.intrusions = 1;
    Y.fn.enterMap()('SAV', [4.5, 12.5]); Y.fn.enterMap()('HOME', Y.MAPS.HOME.spawn);
    return { intrusionsLeft: s.intrusions, wanderersAtHome: SIKEE.debug.R.wanderers.filter(w => w.map === 'HOME').length };
  });
  await page.waitForTimeout(500);
  out.intrusionFight = await page.evaluate(() => ({ blocking: SIKEE.blocking(), foe: SIKEE.debug.R.battle && SIKEE.debug.R.battle.foe.def.name }));
  // run away from the house fight
  await page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'x' })));
  // 6. Sikee boss after three defeats
  out.boss = await page.evaluate(() => {
    const Y = window.__Y; const s = SIKEE.debug.st(); s.defeated = 3; Y.fn.enterMap()('SAV', [4.5, 12.5]);
    SIKEE.debug.spawnSikeeOnRoad(); const boss = SIKEE.debug.R.wanderers.find(w => w.boss);
    if (boss) { SIKEE.debug.startBattle(boss); boss.hp = 3; }
    return { bossSpawned: !!boss, battle: SIKEE.blocking() };
  });
  for (let i = 0; i < 6 && await page.evaluate(() => SIKEE.blocking()); i++) {
    await page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'j' })));
    await page.waitForTimeout(400);
  }
  out.bossDown = await page.evaluate(() => ({ bossDown: SIKEE.debug.st().bossDown, blocking: SIKEE.blocking() }));
  // 7. the game still runs: a few frames of movement and no page errors
  await page.waitForTimeout(800);
  out.errors = errs.slice(0, 5);
  console.log(JSON.stringify(out, null, 1));
  await page.screenshot({ path: require('path').resolve(__dirname, 'sikee-smoke.png') });
  await browser.close();
})().catch(e => { console.error('FAILED', e.message); process.exit(1); });
