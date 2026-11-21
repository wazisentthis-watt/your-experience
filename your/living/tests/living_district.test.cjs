/* Living District in root · Node tests. Run: node your/living/tests/living_district.test.cjs
 * Loads the real module files into a vm sandbox with a small fake of the root game (MAPS, M, WIR_GAME, WIR_HERO), then walks
 * Savannah → Living District → Savannah, saves and reloads, and checks the rules (vendored core unchanged, root save only, one brain). */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm'), crypto = require('crypto');
const ROOT = path.join(__dirname, '..', '..', '..'), rd = p => fs.readFileSync(path.join(ROOT, p), 'utf8');
const sha = p => crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT, p))).digest('hex');
let pass = 0, fail = 0;
function check(name, cond, info) { if (cond) { pass++; console.log('ok - ' + name); } else { fail++; console.log('not ok - ' + name + (info !== undefined ? '  ' + JSON.stringify(info) : '')); } }

/* ---------- static rules */
check('Nimbus combat module byte-identical', sha('your/v23/vendor/wir_mella_combat.js') === 'a6aa3384fdd7ac5c3954fae35e2baf7b15dd6f426a373705b9503ecde2fbf517');
if (fs.existsSync(path.join(ROOT, 'living/your/v24/cce_core.js'))) {
  check('vendored cce_core.js is byte-identical to the live living/ build', sha('your/living/vendor/cce_core.js') === sha('living/your/v24/cce_core.js'));
  const a = rd('living/your/v24/cce_config.js').split('\n'), b = rd('your/living/vendor/cce_config.js').split('\n');
  const diff = a.map((l, i) => l === b[i] ? null : i).filter(i => i !== null);
  check('vendored cce_config.js differs from living/ only in one header comment line (title emoji removed)', a.length === b.length && diff.length === 1 && /Owner spec/.test(b[diff[0]]) && !/\u{1F577}/u.test(b[diff[0]]), diff);
}
const cfgSrc = rd('your/living/living_config.js');
check('host city is one config line', (cfgSrc.match(/^\s*hostCity:\s*'[A-Z]+',/mg) || []).length === 1);
const mine = ['your/living/living_district.js', 'your/living/living_art.js', 'your/living/living_config.js'].map(rd).join('\n');
check('no localStorage / sessionStorage / indexedDB in the Living layer', !/(localStorage|sessionStorage|indexedDB)\s*[.\[(]/.test(mine));
check('no second KAW brain (no brain created or vendored here)', !/WIRKAWLivingBrain|kaw_brain|wir_kaw_living_brain/i.test(mine) && !fs.readdirSync(path.join(ROOT, 'your/living/vendor')).some(f => /kaw|brain/i.test(f)));
check('no damage calls (combat is not part of this PR)', !/V23\.damage|YOUR_V23\.damage|hurtPlayer|hitRobot/.test(mine));
check('no network or iframe', !/fetch\(|XMLHttpRequest|<iframe|createElement\('iframe'\)|https?:\/\//.test(mine));
const html = rd('index.html');
const tags = ['your/integration/section_handoff.js', 'your/living/vendor/cce_config.js', 'your/living/vendor/cce_core.js', 'your/living/living_config.js', 'your/living/living_art.js', 'your/living/living_district.js'];
check('index.html loads the six scripts in order after Muse', html.includes('<script src="your/muse/your_muse.js"></script>\n' + tags.map(t => '<script src="' + t + '"></script>').join('\n') + '\n'));

/* ---------- art */
const ctx0 = { window: null, console }; ctx0.window = ctx0; ctx0.globalThis = ctx0; vm.createContext(ctx0); vm.runInContext(rd('your/living/living_art.js'), ctx0);
const ART = ctx0.YOUR_LIVING_ART, missing = Object.values(ART.FILES).filter(f => !fs.existsSync(path.join(ROOT, 'your/living/assets', f)));
check('every art file the loader asks for exists (' + Object.keys(ART.FILES).length + ')', missing.length === 0, missing);
check('all art is webp', Object.values(ART.FILES).every(f => /\.webp$/.test(f)));
const tj = JSON.parse(rd('your/living/assets/ground/root_ground_tileset_32.json'));
check('atlas cells match ROOT_GROUND_TILESET json', Object.keys(ART.TILESET.tiles).every(k => { const j = tj.tiles[ART.TILE_JSON_KEY[k]]; return j && j.x === ART.TILESET.tiles[k][0] && j.y === ART.TILESET.tiles[k][1] && j.w === 32; }) && tj.image === ART.TILESET.image);
const man = JSON.parse(rd('your/living/assets/LIVING_ART_MANIFEST.json'));
check('manifest lists every shipped asset', Object.values(ART.FILES).every(f => man.files[f]));
const shipped = []; (function walk(d, rel) { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) walk(p, rel + f + '/'); else if (/\.webp$/.test(f)) shipped.push(rel + f); } })(path.join(ROOT, 'your/living/assets'), '');
check('every shipped image is used by the loader and listed in the manifest (' + shipped.length + ')', shipped.every(f => Object.values(ART.FILES).includes(f) && man.files[f]) && Object.keys(man.files).length === shipped.length, shipped.filter(f => !Object.values(ART.FILES).includes(f)));

/* ---------- a small fake of the root game */
function cityMap(id, w, h) { const m = { id, w, h, t: new Uint8Array(w * h).fill(0), objs: [], props: [], block: new Uint8Array(w * h) };
  for (let x = 0; x < w; x++) { m.block[x] = m.block[(h - 1) * w + x] = 1; } for (let y = 0; y < h; y++) { m.block[y * w] = m.block[y * w + w - 1] = 1; }
  for (let x = 0; x < w; x++) for (const y of [14, 15]) m.t[y * w + x] = 2; m.spawn = [4.5, 12.5]; return m; }
function boot(hostCity, extra) {
  const ctx = { console: { log() {}, warn: (...a) => ctx.warns.push(a.join(' ')), error: (...a) => ctx.errors.push(a.join(' ')) }, warns: [], errors: [], Math, JSON, Object, Array, Uint8Array, Int16Array, Int32Array, Float32Array, Promise, Number, String, Error, Date };
  ctx.window = ctx; ctx.self = ctx; ctx.globalThis = ctx; vm.createContext(ctx);
  const store = {}; let profile = { schema: 'wir.hero/1', id: 'hero_test01', games: {} };
  ctx.WIR_HERO = { exists: () => true, get: () => profile, gameData: (id, d) => { if (d) { profile.games[id] = Object.assign({}, profile.games[id], d); } return profile.games[id] || null; } };
  ctx.WIRPeople = { randomLook: s => ({ seed: s }), draw() {} };
  for (const f of ['your/integration/section_handoff.js', 'your/living/vendor/cce_config.js', 'your/living/vendor/cce_core.js', 'your/living/living_config.js']) vm.runInContext(rd(f), ctx, { filename: f });
  if (hostCity) ctx.YOUR_LIVING_CONFIG.hostCity = hostCity;
  for (const f of ['your/living/living_art.js', 'your/living/living_district.js']) vm.runInContext(rd(f), ctx, { filename: f });
  const CITIES = { SAV: { name: 'Savannah', air: 'x', ride: 0, mods: {} }, JAX: { name: 'Jacksonville', air: 'y', ride: 1, mods: {} } };
  const MAPS = { HOME: cityMap('HOME', 12, 11), SAV: cityMap('SAV', 44, 32), JAX: cityMap('JAX', 44, 32) };
  const S = { t: 30.5, city: 'SAV', visited: { SAV: 1 }, busy: null }, G = { map: MAPS.SAV, px: 4.5, py: 12.5, cars: [1], peds: [1] };
  const toasts = []; let saves = 0; const fns = { paused: () => false, goDo: (c, b) => { fns.goDoCalls.push([c, b, G.map.id]); } }; fns.goDoCalls = [];
  function enterMap(id, at) { G.map = MAPS[id]; const sp = at || G.map.spawn; G.px = sp[0]; G.py = sp[1]; if (id !== 'HOME') { S.city = id; S.visited[id] = 1; } for (const w of ctx.WIR_WORLD_MODULES) if (w.enterMap) w.enterMap(id); }
  ctx.WIR_GAME = { get S() { return ctx.__S || S; }, G, cx: null, T: 32, walkable: () => true, toast: (s) => toasts.push(s), save: () => saves++, enterMap };
  const X = { MAPS, M: { CITIES }, fn: { paused: () => fns.paused, goDo: () => fns.goDo }, set(n, f) { if (n === 'goDo') fns.goDo = f; else throw new Error('unexpected hook ' + n); } };
  ctx.YOUR_V20_INSTALL(X);
  const tick = (dt, n) => { for (let i = 0; i < (n || 1); i++) for (const w of ctx.WIR_WORLD_MODULES) if (w.tick) w.tick(dt); };
  return { ctx, L: ctx.YOUR_LIVING, MAPS, CITIES, S, G, X, fns, toasts, tick, enterMap, profile: () => profile, saves: () => saves };
}
function bfs(m, from, okAt) { const W = m.w, seen = new Uint8Array(m.w * m.h), q = [[Math.floor(from[0]), Math.floor(from[1])]]; seen[q[0][1] * W + q[0][0]] = 1;
  while (q.length) { const [x, y] = q.shift(); if (okAt(x, y)) return true; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= m.w || ny >= m.h || seen[ny * W + nx] || m.block[ny * W + nx]) continue; seen[ny * W + nx] = 1; q.push([nx, ny]); } } return false; }

const B = boot();
const { L, MAPS, CITIES, S, G, ctx } = B, CFG = ctx.YOUR_LIVING_CONFIG, CC = ctx.CCE_CONFIG;
check('installs without error', L.installed && !L.error, L.error);
check('one world module registered', ctx.WIR_WORLD_MODULES.filter(w => w.id === 'living-district').length === 1);
const m = MAPS.LIV;
check('MAPS.LIV is 64 × 44 at the CCE geometry', m && m.w === CC.map.W && m.h === CC.map.H && m.t.length === 64 * 44);
check('district edge is wall (no root road exit can fire)', [...Array(m.w).keys()].every(x => m.block[x] && m.block[(m.h - 1) * m.w + x]) && [...Array(m.h).keys()].every(y => m.block[y * m.w] && m.block[y * m.w + m.w - 1]));
check('19 CCE buildings become blocking lots', m.objs.length === CC.buildings.length && CC.buildings.every(b => m.block[(b.r[1] + 1) * m.w + b.r[0] + 1] === 1));
check('roads are root road tiles', CC.map.roadsY.every(ry => m.t[ry * m.w + 5] === 2 && m.t[(ry + 1) * m.w + 5] === 2));
check('entry spawn is walkable', L.walkableAt(m, CFG.entry));
const ez = CFG.exitZone;
check('west exit zone is reachable from the entry', bfs(m, CFG.entry, (x, y) => x + .5 >= ez[0] && x + .5 < ez[0] + ez[2] + .3 && y + .5 >= ez[1] && y + .5 < ez[1] + ez[3]));
check('every building door is reachable from the entry', CC.buildings.every(b => bfs(m, CFG.entry, (x, y) => Math.abs(x - b.door[0]) + Math.abs(y - b.door[1]) <= 1)));
check('city lists still see exactly the cities they had', Object.keys(CITIES).join() === 'SAV,JAX');
check('district HUD name reads from the host city', CITIES.LIV && CITIES.LIV.name === 'Living District · Savannah');
const gate = MAPS.SAV.objs.find(o => o.id === 'living_gate');
check('Savannah gets one walk-in gate at the configured spot', gate && gate.walk && gate.decor && [gate.x, gate.y, gate.w, gate.h].join() === CFG.hostGates.SAV.join());
check('gate is walkable in Savannah', L.walkableAt(MAPS.SAV, [gate.x + 1.5, gate.y + 1]));

/* ---------- Savannah → district */
G.px = gate.x + 1.5; G.py = gate.y + 4; B.tick(.05);                       // arm outside the gate
G.py = gate.y + 1; B.tick(.05);                                            // step into it
check('walking into the gate enters the district', G.map.id === 'LIV', G.map.id);
check('arrives at the entry spawn', G.px === CFG.entry[0] && G.py === CFG.entry[1]);
check('root city stays the host (S.city)', S.city === 'SAV');
check('district does not count as a visited city', !S.visited.LIV && Object.keys(S.visited).length === 1);
check('root traffic and walkers cleared in the district', G.cars.length === 0 && G.peds.length === 0);
check('state lives in the root save as S.living', S.living && S.living.v === 1 && S.living.host === 'SAV' && S.living.sim && Array.isArray(S.living.sim.civs));
check('PR #18 checkpoint written for LIVING_DISTRICT', B.profile().games.your_universe && B.profile().games.your_universe.data.checkpoint.section === 'LIVING_DISTRICT' && S.living.lastTrip.checkpoint === true, S.living.lastTrip);
check('20 civilians, 5 supers in the sim', S.living.sim.civs.length === 20 && S.living.sim.supers.length === 5);
const clk = L.sim.clock();
check('district clock starts at the root clock', Math.abs(clk.abs - S.t * 60) < 1 && clk.weekday === 'Tuesday', clk);
B.tick(.05, 3);                                                             // re-arm while still inside? the spawn is outside the exit zone
const civ0 = JSON.stringify(S.living.sim.civs.map(c => [c.x, c.y]));
B.tick(.25, 200);
check('the sim runs while you are in the district', L.stats.steps > 900 && JSON.stringify(S.living.sim.civs.map(c => [c.x, c.y])) !== civ0, L.stats.steps);
check('quiet first playable: no incidents, robots or Divider ops', S.living.sim.incidents.length === 0 && S.living.sim.robots.length === 0 && !S.living.sim.divider.plannedOp);
B.fns.paused = () => true; const st0 = L.stats.steps; B.tick(.25, 20); B.fns.paused = () => false;
check('sim pauses with the game', L.stats.steps === st0);

/* ---------- save and reload */
const saved = JSON.parse(JSON.stringify({ S, map: G.map.id, px: G.px, py: G.py }));
check('root save JSON carries the district (size ' + JSON.stringify(saved.S.living).length + ' B)', saved.S.living && saved.S.living.sim.civs.length === 20 && JSON.stringify(saved.S.living).length < 120000);
const t0 = saved.S.living.sim.t; ctx.__S = saved.S; B.tick(.05);
check('reloaded save rebuilds the sim from S.living', L.sim && L.simS === saved.S && Math.abs(L.sim.S.t - t0) < .2 && L.sim.S.civs.length === 20);
ctx.__S = null; B.tick(.05);

/* ---------- district → Savannah */
G.px = 1.5; G.py = 23.5; B.tick(.05);
check('walking into the west gate returns to Savannah', G.map.id === 'SAV', G.map.id);
check('arrives in front of the Savannah gate, outside it', G.py > gate.y + gate.h && L.walkableAt(MAPS.SAV, [G.px, G.py]));
check('PR #18 checkpoint written for HOME (root world)', B.profile().games.your_universe.data.checkpoint.section === 'HOME' && B.profile().games.your_universe.data.checkpoint.entryId === CFG.handoff.hostExitId);
B.tick(.05); check('no bounce back into the district on arrival', G.map.id === 'SAV');
check('district sim does not tick outside the district', (() => { const s = L.stats.steps; B.tick(.25, 20); return L.stats.steps === s; })());
check('no console errors in the sandbox', ctx.errors.length === 0, ctx.errors);

/* ---------- phone shortcut from inside the district */
G.px = gate.x + 1.5; G.py = gate.y + 4; B.tick(.05); G.py = gate.y + 1; B.tick(.05);
B.X.fn.goDo()('SAV', 'diner');
check('a phone "go do" from the district walks out to Savannah first', B.fns.goDoCalls.length === 1 && B.fns.goDoCalls[0][2] === 'SAV' && G.map.id === 'SAV');

/* ---------- one-line host change */
const J = boot('JAX');
const jg = J.MAPS.JAX.objs.find(o => o.id === 'living_gate');
check('hostCity = JAX: installs and finds a free gate spot automatically', J.L.installed && jg && J.L.walkableAt(J.MAPS.JAX, [jg.x + .5, jg.y + .5]) && !J.MAPS.SAV.objs.some(o => o.id === 'living_gate'));
check('hostCity = JAX: HUD name follows the host', J.CITIES.LIV.name === 'Living District · Jacksonville');
J.G.map = J.MAPS.JAX; J.S.city = 'JAX'; J.G.px = jg.x + 1.5; J.G.py = jg.y + 4; J.tick(.05); J.G.py = jg.y + 1; J.tick(.05);
check('hostCity = JAX: the gate leads into the district and S.city stays JAX', J.G.map.id === 'LIV' && J.S.city === 'JAX');

/* ---------- vendored CCE core in Node */
const CCE = require(path.join(ROOT, 'your/living/vendor/cce_core.js'));
const s1 = CCE.create({ seed: 42 }), s2 = CCE.create({ seed: 42 }); s1.advance(120); s2.advance(120);
check('CCE core is deterministic for a seed (120 s)', s1.digest() === s2.digest());
const full = CCE.create({ seed: 7 }); let threw = null; try { full.advance(900); } catch (e) { threw = String(e); }
check('full CCE (director on) runs 15 sim minutes without throwing', !threw, threw);
const q = CCE.create({ seed: 7, config: B.L.simConfig(0) }); q.advance(900);
check('quiet config: same 15 minutes, no incidents or robots', q.S.incidents.length === 0 && q.S.robots.length === 0 && q.S.history.length === 0);
console.log('\n' + pass + ' passed, ' + fail + ' failed'); process.exit(fail ? 1 : 0);
