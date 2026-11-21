
/* ---------------------------------------------------------------- hero: walk / skate / drive + V7-kit combat through Nimbus */
var HC = C.hero, shell = NB ? NB.createValenceShell() : null, fx = { shots: [], pops: [], flash: 0 }, flash = 0, feedDirty = true;
var hs = { ph: 0, moving: false, act: null, actT: 0, hitCd: 0, blastCd: 0, dashCd: 0, dashT: 0, air: 0, airMax: 0, grind: null, trick: null, trickT: 0, combo: 0, comboPts: 0, comboT: 0, lastSafe: null, talkT: 0, carCd: 0, ramCd: 0 };
L.hs = hs;
function walkable(x, y) { return sim.walkable(x, y); }
function canStand(x, y, r) { r = r || .28; return walkable(x - r, y - r) && walkable(x + r, y - r) && walkable(x - r, y + r) && walkable(x + r, y + r); }
function moveBody(o, dx, dy, r) { var nx = clamp(o.x + dx, .3, C.map.W - .3), ny = clamp(o.y + dy, .3, C.map.H - .3), hitX = false, hitY = false;
  if (canStand(nx, o.y, r)) o.x = nx; else hitX = true; if (canStand(o.x, ny, r)) o.y = ny; else hitY = true; return { hx: hitX, hy: hitY }; }
function dirOf(x, y, prev) { if (Math.abs(x) < .15 && Math.abs(y) < .15) return prev; return Math.abs(x) > Math.abs(y) ? (x > 0 ? 'right' : 'left') : (y > 0 ? 'down' : 'up'); }
function dirVec(d) { return { right: [1, 0], left: [-1, 0], up: [0, -1], down: [0, 1] }[d] || [0, 1]; }
function inRect(x, y, r) { return x >= r[0] && x <= r[0] + r[2] && y >= r[1] && y <= r[1] + r[3]; }
function onRail(x, y) { var R = C.plaza.rails; for (var i = 0; i < R.length; i++) { var r = R[i]; if (r[3] === 'h' ? (Math.abs(y - r[1] - .5) < .45 && x >= r[0] && x <= r[0] + r[2]) : (Math.abs(x - r[0] - .5) < .45 && y >= r[1] && y <= r[1] + r[2])) return r; } return null; }
function onRamp(x, y) { return C.plaza.ramps.some(function (r) { return inRect(x, y, r); }); }
function pop(x, y, txt, col) { fx.pops.push({ x: x, y: y, txt: txt, col: col || '#fff', t: 1.1 }); if (fx.pops.length > 30) fx.pops.shift(); }
function nimbus(kind, defender, dv) {
  if (!NB) return kind === 'hit' ? 18 : 22; var lane = C.nimbus[kind], ci = { rx: dv[0], ry: -dv[1] }; if (lane !== 'melee') { ci.buttons = {}; ci.buttons[lane] = true; }
  var r = NB.executeMellaCombatFrame({ controllerInput: ci, valenceShell: shell, defenderMove: defender || 'Guard' }); L.lastNimbus = { kind: kind, dmg: r.finalDamage, ccr: r.ccrResolution.outcome, stars: r.valenceStars, strike: r.intent.meleeStrike ? r.intent.meleeStrike.strikeName : null, lane: r.chosenLane ? r.chosenLane.id : null }; return r.finalDamage; }
function heroStep(dt, inp) {
  var p = S.player, I = inp.pressed;
  hs.hitCd -= dt; hs.blastCd -= dt; hs.dashCd -= dt; hs.actT -= dt; hs.carCd -= dt; hs.ramCd -= dt; if (hs.actT <= 0) hs.act = null; hs.talkT -= dt;
  if (I.car && hs.carCd <= 0) toggleCar();
  if (p.ko > 0) { p.vx = p.vy = 0; return; }
  if (p.mode === 'car') { driveStep(dt, inp); return; }
  if (I.skate) { p.mode = p.mode === 'skate' ? 'walk' : 'skate'; hs.grind = null; p.z = 0; hs.air = 0; pop(p.x, p.y - 1.4, p.mode === 'skate' ? 'BOARD ON' : 'BOARD OFF', '#8ff5ea'); sim.reportAction('skate'); count('skate_toggle'); }
  var mx = inp.mx, my = inp.my; p.dir = dirOf(mx, my, p.dir);
  if (I.dash && hs.dashCd <= 0 && p.mode === 'walk') { hs.dashCd = HC.dashCd; hs.dashT = .18; var dv = (Math.abs(mx) + Math.abs(my)) > .2 ? [mx, my] : dirVec(p.dir); var dl = hyp(dv[0], dv[1]) || 1; hs.dashV = [dv[0] / dl * HC.dashDist / .18, dv[1] / dl * HC.dashDist / .18]; p.inv = Math.max(p.inv, .3); sim.reportAction('dash'); count('dash'); }
  if (hs.dashT > 0) { hs.dashT -= dt; moveBody(p, hs.dashV[0] * dt, hs.dashV[1] * dt); hs.moving = true; }
  else if (p.mode === 'walk') {
    var sp = HC.walk * (btn.dash ? 1.35 : 1); var m = moveBody(p, mx * sp * dt, my * sp * dt); hs.moving = hyp(mx, my) > .15; if (hs.moving) hs.ph += dt * 10;
    if (I.jump && p.z <= 0) { hs.air = .5; hs.airMax = .5; count('jump'); }
    if (hs.air > 0) { hs.air -= dt; p.z = Math.sin(Math.PI * (1 - hs.air / hs.airMax)) * 1.1; if (hs.air <= 0) p.z = 0; }
  } else skateStep(dt, inp);
  if (I.hit && hs.hitCd <= 0) heroHit();
  if (I.blast && hs.blastCd <= 0) heroBlast();
  if (I.calm) heroCalm();
  if (I.act) heroAct();
  C.discoveries.forEach(function (d) { if (!S.discovered[d.id] && hyp(d.at[0] - p.x, d.at[1] - p.y) < .9) { sim.discover(d.id); pop(p.x, p.y - 1.5, 'DISCOVERY', '#63e6be'); showTalk('Discovery', d.text); count('discovery'); } });
}
function skateStep(dt, inp) {
  var p = S.player, I = inp.pressed;
  if (hs.grind) { var r = hs.grind, ax = r[3] === 'h' ? [1, 0] : [0, 1], s = (p.vx * ax[0] + p.vy * ax[1]) >= 0 ? 1 : -1; p.vx = ax[0] * s * HC.grindSpeed; p.vy = ax[1] * s * HC.grindSpeed; p.x += p.vx * dt; p.y += p.vy * dt;
    hs.comboPts += dt * 60; hs.comboT = 2; if (!onRail(p.x, p.y) || I.jump) { if (I.jump) { hs.air = HC.ollieT; hs.airMax = HC.ollieT; } hs.grind = null; pop(p.x, p.y - 1.4, 'GRIND +' + Math.round(hs.comboPts), '#ffd43b'); } hs.moving = true; hs.ph += dt * 8; return; }
  var ax2 = inp.mx * HC.skateAccel, ay2 = inp.my * HC.skateAccel; if (hs.air <= 0) { p.vx += ax2 * dt; p.vy += ay2 * dt; var f = Math.exp(-HC.skateFric * dt); p.vx *= f; p.vy *= f; }
  var sp = hyp(p.vx, p.vy); if (sp > HC.skateMax) { p.vx *= HC.skateMax / sp; p.vy *= HC.skateMax / sp; sp = HC.skateMax; }
  if (sp > .3) p.dir = dirOf(p.vx, p.vy, p.dir);
  var m = moveBody(p, p.vx * dt, p.vy * dt); if (m.hx) p.vx *= -.3; if (m.hy) p.vy *= -.3; if ((m.hx || m.hy) && sp > 6 && hs.air <= 0) { bail('Wall!'); }
  hs.moving = sp > .4; hs.ph += dt * sp * 1.2;
  if (hs.air <= 0) { if (I.jump) { hs.air = HC.ollieT; hs.airMax = HC.ollieT; hs.comboPts += 10; hs.comboT = 2; count('ollie'); pop(p.x, p.y - 1.4, 'OLLIE', '#fff'); }
    else if (onRamp(p.x, p.y) && sp > 4.5) { hs.air = HC.rampT; hs.airMax = HC.rampT; hs.comboPts += 25; hs.comboT = 2; pop(p.x, p.y - 1.4, 'AIR!', '#8ff5ea'); count('ramp_air'); } }
  if (hs.air > 0) { hs.air -= dt; p.z = Math.sin(Math.PI * (1 - Math.max(0, hs.air) / hs.airMax)) * (hs.airMax > .7 ? 1.8 : 1.1);
    if (I.hit && !hs.trick) { hs.trick = ['KICKFLIP', 'HEELFLIP', '360 SHUV', 'VARIAL'][Math.floor((S.t * 7) % 4)]; hs.trickT = .35; }
    if (I.blast && !hs.trick) { hs.trick = ['METHOD GRAB', 'NOSE GRAB', 'INDY'][Math.floor((S.t * 5) % 3)]; hs.trickT = .3; }
    if (hs.trick) { hs.trickT -= dt; if (hs.trickT <= 0) { hs.comboPts += 40; hs.combo++; pop(p.x, p.y - 1.8, hs.trick + '!', '#ffd43b'); count('trick'); hs.trick = null; } }
    if (hs.air <= 0) { p.z = 0; var rl = onRail(p.x, p.y); if (hs.trick) { bail('Bailed the ' + hs.trick); hs.trick = null; } else if (rl) { hs.grind = rl; count('grind'); pop(p.x, p.y - 1.4, 'GRIND', '#ffd43b'); } else { hs.combo++; hs.comboT = 1.6; } } }
  if (hs.comboT > 0) { hs.comboT -= dt; if (hs.comboT <= 0 && hs.comboPts > 0) { var pts = Math.round(hs.comboPts * Math.max(1, hs.combo)); S.skate.total += pts; if (pts > S.skate.best) { S.skate.best = pts; pop(p.x, p.y - 2, 'NEW BEST ' + pts, '#63e6be'); } else pop(p.x, p.y - 2, '+' + pts, '#63e6be'); hs.comboPts = 0; hs.combo = 0; } }
}
function bail(why) { hs.comboPts = 0; hs.combo = 0; hs.comboT = 0; hs.air = 0; S.player.z = 0; S.player.vx *= .2; S.player.vy *= .2; hs.act = 'bail'; hs.actT = .6; pop(S.player.x, S.player.y - 1.4, 'BAIL', '#ff8787'); count('bail'); }
function toggleCar() {
  var p = S.player, car = S.game.pcar; hs.carCd = .4;
  if (p.mode === 'car') { var ox = -Math.sin(car.ang) * 1.1, oy = Math.cos(car.ang) * 1.1; var spot = [[ox, oy], [-ox, -oy], [1.3, 0], [-1.3, 0], [0, 1.3], [0, -1.3]].filter(function (o) { return canStand(car.x + o[0], car.y + o[1]); })[0];
    if (!spot) { pop(p.x, p.y - 1.4, 'NO ROOM TO GET OUT', '#ff8787'); return; } p.mode = 'walk'; p.x = car.x + spot[0]; p.y = car.y + spot[1]; car.speed = 0; count('car_exit'); return; }
  if (hyp(car.x - p.x, car.y - p.y) < C.car.enterRange) { p.mode = 'car'; hs.grind = null; p.z = 0; hs.air = 0; count('car_enter'); sim.reportAction('drive'); pop(car.x, car.y - 1.2, 'DRIVE', '#8ff5ea'); }
  else pop(p.x, p.y - 1.4, 'Your car is parked at Riverside (F / RT near it)', '#adb5bd');
}
function driveStep(dt, inp) {
  var p = S.player, car = S.game.pcar, K = C.car, mag = hyp(inp.mx, inp.my);
  if (mag > .2) { var want = Math.atan2(inp.my, inp.mx), d = want - car.ang; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
    var rev = Math.abs(d) > 2.4 && car.speed < 1; if (rev) car.speed = Math.max(-4, car.speed - K.brake * dt * .5); else { car.ang += clamp(d, -K.turn * dt, K.turn * dt) * clamp(Math.abs(car.speed) / 3, .35, 1); car.speed = Math.min(K.max * (btn.dash ? 1.15 : 1), car.speed + K.accel * mag * dt * (Math.abs(d) > 1.6 ? .2 : 1)); } }
  else car.speed *= Math.exp(-K.fric * dt);
  if (btn.jump) car.speed *= Math.exp(-K.brake * .25 * dt);
  var vx = Math.cos(car.ang) * car.speed * dt, vy = Math.sin(car.ang) * car.speed * dt, m = moveBody(car, vx, vy, .45);
  if (m.hx || m.hy) { if (Math.abs(car.speed) > 6) { pop(car.x, car.y - 1, 'CRUNCH', '#ffa94d'); count('car_bump'); } car.speed *= -.3; }
  p.x = car.x; p.y = car.y; p.vx = vx / dt; p.vy = vy / dt; p.dir = dirOf(Math.cos(car.ang), Math.sin(car.ang), p.dir);
  if (Math.abs(car.speed) > 4) {
    S.robots.forEach(function (r) { if (r.st !== 'down' && !r.security && !r.riding && hyp(r.x - car.x, r.y - car.y) < 1) { sim.hitRobot(r, Math.abs(car.speed) * 3, 'mella-drive'); car.speed *= .6; count('car_ram_robot'); } });
    if (hs.ramCd <= 0) S.vehicles.forEach(function (v) { if (v.inc && !v.stopped && hyp(v.x - car.x, v.y - car.y) < 1.5) { sim.damageVehicle(v.id, 1.5, 'mella-ram'); hs.ramCd = .8; car.speed *= .4; pop(v.x, v.y - 1, 'RAM!', '#ffa94d'); count('car_ram_vehicle'); } });
    S.civs.forEach(function (c) { if (!c.inside && hyp(c.x - car.x, c.y - car.y) < 1.1) { var a = Math.atan2(c.y - car.y, c.x - car.x); if (sim.walkable(c.x + Math.cos(a) * .6, c.y + Math.sin(a) * .6)) { c.x += Math.cos(a) * .6; c.y += Math.sin(a) * .6; } c.needs.safety = Math.min(c.needs.safety, .5); } });
  }
}
function targetsInFront(range, arc) { var p = S.player, dv = dirVec(p.dir), out = [];
  S.robots.forEach(function (r) { if (r.st === 'down' || r.security || r.riding) return; var dx = r.x - p.x, dy = r.y - p.y, d = hyp(dx, dy); if (d < range && (d < .7 || (dx * dv[0] + dy * dv[1]) / d > arc)) out.push(r); }); return out; }
function heroHit() {
  var p = S.player; hs.hitCd = .32; hs.act = 'hit'; hs.actT = .22; var dv = dirVec(p.dir); count('hit'); sim.reportAction('hit');
  var T2 = targetsInFront(HC.hitRange, .2); T2.forEach(function (r) { var R = C.robots[r.cls] || {}; var dmg = nimbus('hit', R.defender, dv); var res = sim.hitRobot(r, dmg, 'mella-hit'); pop(r.x, r.y - 1.2, res === 'dodged' ? 'DODGED' : '-' + Math.round(dmg), '#ffe066'); count('hit_robot'); });
  S.vehicles.forEach(function (v) { if (v.inc && !v.stopped && hyp(v.x - p.x, v.y - p.y) < HC.hitRange + .6) { sim.damageVehicle(v.id, 1, 'mella-hit'); pop(v.x, v.y - 1, 'HIT', '#ffe066'); count('hit_vehicle'); } });
}
function heroBlast() { var p = S.player; hs.blastCd = .55; hs.act = 'blast'; hs.actT = .3; var dv = dirVec(p.dir); fx.shots.push({ x: p.x + dv[0] * .5, y: p.y + dv[1] * .5 - .2, vx: dv[0] * HC.blastSpeed, vy: dv[1] * HC.blastSpeed, d: 0 }); count('blast'); sim.reportAction('blast'); }
function shotsStep(dt) {
  fx.shots = fx.shots.filter(function (s) { s.x += s.vx * dt; s.y += s.vy * dt; s.d += hyp(s.vx, s.vy) * dt; if (s.d > HC.blastRange || !walkable(s.x, s.y + .2)) return false;
    for (var i = 0; i < S.robots.length; i++) { var r = S.robots[i]; if (r.st === 'down' || r.security || r.riding) continue; if (hyp(r.x - s.x, r.y - s.y) < .65) { var R = C.robots[r.cls] || {}; var dmg = nimbus('blast', R.defender, [Math.sign(s.vx), Math.sign(s.vy)]); var res = sim.hitRobot(r, dmg, 'mella-blast'); pop(r.x, r.y - 1.2, res === 'dodged' ? 'DODGED' : '-' + Math.round(dmg), '#74c0fc'); count('blast_hit'); return false; } }
    for (var j = 0; j < S.vehicles.length; j++) { var v = S.vehicles[j]; if (v.inc && !v.stopped && hyp(v.x - s.x, v.y - s.y) < 1) { sim.damageVehicle(v.id, 1, 'mella-blast'); pop(v.x, v.y - 1, 'BLAST', '#74c0fc'); return false; } }
    return true; });
}
function heroCalm() { var p = S.player, n = 0; hs.act = 'calm'; hs.actT = .5; sim.reportAction('calm'); count('calm'); if (shell && NB) NB.stepValenceControllerActions(shell, { valenceRegulationActive: true });
  S.civs.forEach(function (c) { if (!c.inside && hyp(c.x - p.x, c.y - p.y) < HC.calmRadius) { c.needs.safety = Math.min(1, c.needs.safety + .5); if (c.injured > 0) { c.injured = Math.max(0, c.injured - 60); n++; } } });
  var k = S.game.veyru; if (hyp(k.x - p.x, k.y - p.y) < HC.calmRadius && !k.inCar) { k.brain.bond = Math.min(100, k.brain.bond + 1); k.brain.needs.fear = Math.max(0, k.brain.needs.fear - 20); } pop(p.x, p.y - 1.6, n ? 'CALM · eased ' + n : 'CALM', '#b2f2bb'); }
function heroAct() { if (morrowNear()) { openMorrow('hero'); return; } var r = sim.interact(); if (!r) { if (veyruAsk()) return; pop(S.player.x, S.player.y - 1.4, 'nothing here', '#adb5bd'); return; }
  count('act_' + r.kind); showTalk(r.who || (r.kind === 'capture' ? 'Prototype' : r.kind === 'loot' ? 'Getaway van' : 'Truck'), r.line || '', r.role); }
function showTalk(who, line, role, img) { var t = $('talk'); t.innerHTML = (img && IMG[img] ? '<img alt="" src="' + IMG[img].src + '" style="float:left;width:54px;height:72px;object-fit:cover;border-radius:8px;margin:0 8px 0 0">' : '') + '<b>' + esc(who) + '</b>' + (role ? ' <span class="small">· ' + esc(role) + '</span>' : '') + '<br>' + esc(line); t.classList.add('on'); hs.talkT = 4.5; L.lastTalk = { who: who, line: line }; }

/* ---------------------------------------------------------------- Veyru on the KAW Living Brain v0.1 (your/v24/kaw_brain_adapter.js).
   DEFAULT rules (owner has not decided): ask to leave the house each departure; a refusal means you go alone and must come back home to ask again;
   city needs rest/fear/curiosity/social/comfort (no hunger/thirst); PROPOSED traits; no teleport snap (Veyru walks/runs; it only rides when it is
   next to you as you get in the car). Veyru's home is Riverside A (PROPOSED). The brain has its own seed, so the city RNG is never touched. */
var KB = window.YOUR_KAW_BRAIN, KHOME = (function () { var b = C.buildings.filter(function (x) { return x.id === 'aptA'; })[0]; return { id: b.id, name: b.name, x: b.door[0] + .5, y: b.door[1] + .7 }; })();
var KAW_HOME_R = 3, KAW_AWAY_R = 8;   // PROPOSED: "at home" radius around the door; how far you must go before coming back counts as a new visit
function veyruInit() { var g = S.game, k = g.veyru;
  if (!k || !k.brain) { var old = k || {}; k = g.veyru = { x: KHOME.x, y: KHOME.y, brain: null, lock: false, away: false, homeT: 0, inCar: false, face: 1, ph: 0, moving: false, think: 0 }; }
  var fresh = !k.brain; k.brain = KB.create((S.seed || 1) ^ 0x5eed, k.brain); if (fresh) setTimeout(function () { showTalk('Veyru', 'Veyru is at home at ' + KHOME.name + ' (east, by the river). Go home and press E / TALK to ask it to come out with you.', 'KAW · at home', 'portrait_curious'); }, 400); if (!k.brain.accompanied) { k.x = k.x || KHOME.x; k.y = k.y || KHOME.y; } }
function kawCtx(k) { var p = S.player, th = 99, tr = null; S.robots.forEach(function (r) { if (r.st !== 'down' && r.hostile && !r.riding && !r.security) { var dd = hyp(r.x - k.x, r.y - k.y); if (dd < th) { th = dd; tr = r; } } });
  var fr = null, fd = 9; if (!k.brain.accompanied) S.civs.forEach(function (c) { if (!c.inside) { var dd = hyp(c.x - k.x, c.y - k.y); if (dd < fd) { fd = dd; fr = c; } } });
  return { mapId: k.brain.accompanied ? 'DISTRICT' : 'HOME', position: { x: k.x, y: k.y }, player: { x: p.x, y: p.y }, hazard: KB.hazard(th), threat: tr ? { x: tr.x, y: tr.y } : null,
    cover: { x: KHOME.x, y: KHOME.y }, home: { x: KHOME.x, y: KHOME.y }, friend: fr ? { x: fr.x, y: fr.y } : null, running: p.mode !== 'walk', inHome: !k.brain.accompanied, distance: hyp(k.x - p.x, k.y - p.y) }; }
function kawSay(code, extra) { var k = S.game.veyru; showTalk('Veyru', KB.line(code) + (extra ? ' ' + extra : ''), 'KAW · ' + KB.mood(k.brain), 'portrait_' + KB.face(k.brain)); L.lastKaw = { code: code, mood: KB.mood(k.brain), accompanied: k.brain.accompanied }; count('kaw_' + code.toLowerCase()); }
function veyruAsk() {   // E / Y / TALK with nothing else in reach
  var k = S.game.veyru, p = S.player, b = k.brain, dHome = hyp(p.x - KHOME.x, p.y - KHOME.y), dK = hyp(k.x - p.x, k.y - p.y);
  if (!b.accompanied) { if (dHome > KAW_HOME_R + 1) { if (dK < 1.8) { kawSay('NOT_AT_HOME'); return true; } return false; }
    if (k.lock) { kawSay('LOCKED'); return true; }
    var r = KB.ask(b, 'LEAVE_HOUSE', Object.assign(kawCtx(k), { exitingHome: true })); if (!r.accepted) { k.lock = true; k.away = false; } else { k.away = false; k.homeT = 0; }
    kawSay(r.code, '(' + Math.round(r.willingness * 100) + '% willing)'); return true; }
  if (dK < 1.8) { var r2 = b.stayUntil != null ? KB.ask(b, 'AT_EASE', kawCtx(k)) : KB.ask(b, 'STAY', Object.assign(kawCtx(k), { duration: 45 })); kawSay(r2.code); return true; }
  var r3 = KB.ask(b, 'COME', kawCtx(k)); kawSay(r3.code, '(' + Math.round(r3.willingness * 100) + '% willing)'); return true; }
function veyruStep(dt) {
  var k = S.game.veyru, p = S.player, b = k.brain, dHome = hyp(p.x - KHOME.x, p.y - KHOME.y);
  if (dHome > KAW_AWAY_R) { k.away = true; if (k.lock) { k.lockLeft = true; } }
  if (k.lock && k.lockLeft && dHome <= KAW_HOME_R) { k.lock = false; k.lockLeft = false; }        // D2: came back home → may ask again
  if (b.accompanied && k.away && dHome <= KAW_HOME_R && hyp(k.x - KHOME.x, k.y - KHOME.y) <= KAW_HOME_R + 1) { k.homeT += dt; if (k.homeT > 1.5) {   // D1: outing ends at home
      b.accompanied = false; b.currentMap = 'HOME'; b.stayUntil = null; b.activity = 'home'; b.reason = 'Back home'; KB.B.emit(b, 'RETURNED_HOME', {}); k.away = false; k.homeT = 0; kawSay('HOME'); } } else k.homeT = 0;
  if (p.mode === 'car') { if (!k.inCar && b.accompanied && hyp(k.x - p.x, k.y - p.y) < 3) { k.inCar = true; count('kaw_board_car'); } }
  else if (k.inCar) { k.inCar = false; k.x = p.x - .6; k.y = p.y + .5; count('kaw_leave_car'); }
  if (k.inCar) { k.x = p.x; k.y = p.y; k.moving = false; return; }
  k.think -= dt; if (k.think <= 0) { var ctx = kawCtx(k); k.ctxCache = ctx; KB.think(b, ctx, KB.DEFAULTS.thinkSec - k.think); k.think = KB.DEFAULTS.thinkSec; k.action = b.activity; }
  var c = k.ctxCache || kawCtx(k), gl = KB.goal(b, { pos: { x: k.x, y: k.y }, player: c.player, home: c.home, threat: c.threat, cover: c.cover, friend: c.friend });
  k.moving = false; if (!gl) return; var dx = gl.x - k.x, dy = gl.y - k.y, dd = hyp(dx, dy); if (dd <= gl.stop) return;
  var st = Math.min(dd - gl.stop * .5, gl.speed * dt), ox = k.x, oy = k.y; moveBody(k, dx / dd * st, dy / dd * st, .25);
  k.moving = hyp(k.x - ox, k.y - oy) > 1e-4; if (Math.abs(dx) > .05) k.face = dx < 0 ? -1 : 1; k.ph = (k.ph || 0) + dt * (gl.speed > 6 ? 12 : 8);
  k.maxStep = Math.max(k.maxStep || 0, hyp(k.x - ox, k.y - oy)); }
