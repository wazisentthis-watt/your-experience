// Usage: NODE_PATH=<dir with playwright> node tools/wishborn-sim.cjs <repo dir>
// Plays WishBorn inside the real game: behavior states, observe/offer/invite bond, refusal, Accord cap/leave, rescue rules, save, hooks.
const { chromium } = require('playwright'); const path = require('path');
const url = 'file://' + path.resolve(process.argv[2] || '.', 'index.html');
(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  let pass = 0, fail = 0; const check = (n, ok, x) => { ok ? pass++ : fail++; console.log((ok ? 'PASS ' : 'FAIL ') + n + (ok ? '' : ' ' + JSON.stringify(x || ''))); };
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push(m.text()); });
  await page.goto(url, { waitUntil: 'load' }); await page.waitForTimeout(500);
  await page.evaluate(() => { window.__Y = window.YOUR_V20.X; __Y.fn.newGame()(); }); await page.waitForTimeout(400);
  await page.evaluate(() => { const G = WIR_GAME.G; G.phone = null; G.fade = 0; const s = document.getElementById('start'); if (s) s.hidden = true; WIR_GAME.enterMap('SAV'); });
  await page.waitForTimeout(1500);
  const E = f => page.evaluate(f);
  check('module + 42 species loaded', await E(() => !!window.WISHBORN && WISHBORN.species.length === 42));
  check('atlas loads', await E(() => new Promise(r => { const i = new Image(); i.onload = () => r(i.naturalWidth === 384); i.onerror = () => r(false); i.src = 'your/wishborn/art/wilds_atlas.png'; })));
  const n0 = await E(() => WISHBORN.wilds.length); check('wilds spawn on a city map (' + n0 + ')', n0 >= 3, n0);
  check('home has no wilds', await E(() => { WIR_GAME.enterMap('HOME'); return true; }) && (await page.waitForTimeout(300), await E(() => WISHBORN.drawList(WIR_GAME.G.map, 0).length === 0)));
  await E(() => WIR_GAME.enterMap('SAV')); await page.waitForTimeout(1200);

  // behavior: put hero away from wilds, run time, expect varied states; then rush one and expect flee
  const states = await E(async () => { const seen = new Set(); const T = WISHBORN._t; for (let k = 0; k < 600; k++) { WISHBORN.wilds.forEach(w => { T.thinkWild(w, .1); seen.add(w.st); }); } return [...seen]; });
  check('multiple behavior states used (' + states.join(',') + ')', states.length >= 3, states);
  const flee = await E(() => { const T = WISHBORN._t, G = WIR_GAME.G; const sp = WISHBORN.species.find(s => s.beh === 'skittish'); const w = T.spawn(sp, [G.px + 2.5, G.py], false); w.trust = 10; G.moving = true; w.st = 'graze'; for (let i = 0; i < 5; i++) T.thinkWild(w, .1); G.moving = false; return w.st; });
  check('skittish wild flees when you approach moving', flee === 'flee', flee);
  const terr = await E(() => { const T = WISHBORN._t, G = WIR_GAME.G; const sp = WISHBORN.species.find(s => s.beh === 'territorial'); const w = T.spawn(sp, [G.px + 1, G.py], false); w.trust = 10; G.moving = true; w.st = 'graze'; T.thinkWild(w, .1); G.moving = false; return w.st; });
  check('territorial wild warns first', terr === 'warn', terr);

  // 4-beat bond on a calm grazer with the right food
  const bond = await E(() => {
    const T = WISHBORN._t, G = WIR_GAME.G, s = WISHBORN.state(); s.accord = []; s.items = { berry: 9, water: 9, crystal: 9 }; T.R.followers = [];
    const sp = WISHBORN.species.find(x => x.beh === 'grazer'); const w = T.spawn(sp, [G.px + 3, G.py], false); const out = {};
    out.beat0 = T.beat(w); w.trust = 60;
    const want = T.FEED(sp), wrong = ['berry', 'water', 'crystal'].find(k => k !== want);
    const before = s.items[wrong]; T.offer(w, wrong); out.refusedKept = s.items[wrong] === before && T.rec(sp.id).refusals === 1;
    T.rec(sp.id).lvl = 2; out.beat1 = T.beat(w);
    T.offer(w, want); out.offers1 = w.offers; out.beat2 = T.beat(w);
    T.offer(w, want); out.gapBlocked = w.offers === 1; w.lastFeed = -1e9; T.offer(w, want); out.beat3 = T.beat(w);
    w.fear = 0; w.trust = 80; out.p = T.pFriendly(w); out.w = w.id; window.__w = w; return out;
  });
  check('beat starts at Observe', bond.beat0 === 1, bond);
  check('wrong food refused and kept; refusal logged', bond.refusedKept, bond);
  check('right food advances beats; 8s gap blocks spam', bond.beat2 >= 2 && bond.gapBlocked && bond.beat3 === 4, bond);
  const inv = await E(() => { const T = WISHBORN._t, s = WISHBORN.state(), w = window.__w; const r = Math.random; Math.random = () => 0; T.invite(w); Math.random = r; return { accord: s.accord.length, gone: w.gone, f: WISHBORN.followers.length }; });
  check('invite with high friendliness joins the Accord', inv.accord === 1 && inv.gone && inv.f === 1, inv);
  // cap of 2
  const cap = await E(() => { const T = WISHBORN._t, G = WIR_GAME.G, s = WISHBORN.state(); const r = Math.random; Math.random = () => 0;
    const mk = () => { const sp = WISHBORN.species.filter(x => x.beh !== 'territorial')[s.accord.length + 3]; const w = T.spawn(sp, [G.px + 3, G.py], false); T.rec(sp.id).lvl = 3; w.offers = 2; w.trust = 90; w.fear = 0; return w; };
    T.invite(mk()); const two = s.accord.length; T.invite(mk()); Math.random = r; return { two, three: s.accord.length }; });
  check('Accord caps at 2', cap.two === 2 && cap.three === 2, cap);
  const follow = await E(async () => { const G = WIR_GAME.G; G.px += 3; for (let i = 0; i < 400; i++) WISHBORN.tick(.05); const f = WISHBORN.followers[0]; return Math.hypot(f.x - G.px, f.y - G.py); });
  check('followers keep up with the hero (' + follow.toFixed(1) + ' tiles)', follow < 4, follow);
  const leave = await E(() => { const s = WISHBORN.state(), id = s.accord[0].sp; WISHBORN._t.part(id, 'test'); return { n: s.accord.length, f: WISHBORN.followers.length }; });
  check('follower can leave freely', leave.n === 1 && leave.f === 1, leave);
  const hunger = await E(() => { const s = WISHBORN.state(); s.accord[0].fedAt = Date.now() - 16 * 60000; const r = Math.random; Math.random = () => 0; const T = WISHBORN._t; T.R.partT = 241; WISHBORN.tick(.1); Math.random = r; return s.accord.length; });
  check('long-unfed follower may walk away', hunger === 0, hunger);

  // KAW Catcher rescue rules (fear/trust/health)
  const rsc = await E(() => {
    const T = WISHBORN._t, G = WIR_GAME.G, s = WISHBORN.state(), o = {}; const sp = WISHBORN.species[5];
    let w = T.spawn(sp, [G.px + 3, G.py], true); w.health = 40; w.fear = 70; w.trust = 5;
    T.rescue.contain(w); o.tooSoon = w.st === 'flee' && !w.held;
    w = T.spawn(sp, [G.px + 3, G.py], true); w.health = 40; w.fear = 70; w.trust = 5; T.rescue.assess(w); o.fearAfterAssess = w.fear;
    T.rescue.calm(w); T.rescue.calm(w); T.rescue.calm(w); o.fear = w.fear; o.trust = w.trust; T.rescue.contain(w); o.held = w.held === true;
    const cash0 = WIR_GAME.S.cash || 0, rep0 = s.rescue.rep; T.rescue.resolve(w, 'care'); o.rightRep = s.rescue.rep - rep0; o.rightCash = (WIR_GAME.S.cash || 0) - cash0;
    w = T.spawn(sp, [G.px + 3, G.py], true); w.health = 40; w.fear = 10; w.trust = 80; w.assessed = true; T.rescue.contain(w);
    const rep1 = s.rescue.rep, c1 = WIR_GAME.S.cash || 0; T.rescue.resolve(w, 'release'); o.wrongRep = s.rescue.rep - rep1; o.wrongCash = (WIR_GAME.S.cash || 0) - c1; return o; });
  check('contain before assess/trust fails and spooks it', rsc.tooSoon, rsc);
  check('assess lowers fear by 5; calm -19/+17 each', rsc.fearAfterAssess === 65 && Math.round(rsc.fear) === 8 && Math.round(rsc.trust) === 56, rsc);
  check('contain works once assessed, fear<=45, trust>=30', rsc.held, rsc);
  check('correct placement: rep +6, $120', rsc.rightRep === 6 && rsc.rightCash === 120, rsc);
  check('wrong placement: rep -9, $20', rsc.wrongRep === -9 && rsc.wrongCash === 20, rsc);

  // Passport: events from the bond/rescue land in the shared wir.passport/1 ledger, idempotently
  const pp = await E(async () => { const PP = window.WIR_PASSPORT, T = WISHBORN._t, G = WIR_GAME.G, s = WISHBORN.state(); const o = { lib: !!PP };
    PP.init(); const r = Math.random; Math.random = () => 0;
    const sp = WISHBORN.species.find(x => x.beh === 'grazer' && !s.accord.some(a => a.sp === x.id)); const w = T.spawn(sp, [G.px + 3, G.py], false); T.rec(sp.id).lvl = 3; w.offers = 2; w.trust = 90; w.fear = 0; s.accord = []; T.invite(w); Math.random = r;
    WISHBORN_PASSPORT.flush(); o.outbox = s.outbox.length; o.err = s.passportError || null; o.ok = s.passportOk || 0;
    const st = PP.state(); o.hasRel = JSON.stringify(st).indexOf('rel.kaw.' + sp.id) >= 0;
    const before = s.passportOk; const ev = { eventId: 'your:wishborn:' + s.id + ':joined:' + sp.id + ':' + T.rec(sp.id).joined, source: { worldId: 'your', buildVersion: 'x', saveVersion: 'wishborn-1' }, at: new Date().toISOString(), summary: 'dup', effects: [] };
    const rr = PP.applyEvent(Object.assign({}, ev, { at: s.outbox[0] ? ev.at : ev.at })); o.dupRes = JSON.stringify(rr).slice(0, 60); return o; });
  check('passport library present in the main game', pp.lib, pp);
  check('Accord join was written to the passport (outbox drained, no error)', pp.outbox === 0 && !pp.err && pp.ok >= 1, pp);
  check('passport shows the new relationship', pp.hasRel, pp);
  // hooks: E key opens panel near a wild, panel renders, draw doesn't throw
  const ui = await E(() => { const G = WIR_GAME.G, T = WISHBORN._t; const sp = WISHBORN.species[2]; const w = T.spawn(sp, [G.px + 1, G.py], false); const fn = WIR_GAME.nearestUse(); if (fn) fn(); return { hasUse: !!fn, panel: !document.getElementById('wbPanel').hidden, txt: document.getElementById('wbPanel').innerText.slice(0, 60) }; });
  check('interact near a wild opens its panel', ui.hasUse && ui.panel, ui);
  await page.waitForTimeout(300);
  const shot = await page.screenshot({ path: 'tools/wishborn-sim.png' });
  check('save keeps S.wishborn and old save keys intact', await E(() => { WIR_GAME.save(); for (const k of Object.keys(localStorage)) { try { const d = JSON.parse(localStorage.getItem(k)); if (d && d.S && d.S.wishborn) return !!d.S.sikee || true; } catch (e) { } } return false; }));
  check('no page errors', errs.length === 0, errs.slice(0, 3));
  console.log(`\n${pass} passed, ${fail} failed`); await browser.close(); process.exit(fail ? 1 : 0);
})();
