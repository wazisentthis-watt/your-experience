/* Y.O.U.R. v2.4-living · Living District game layer (render, input, hero movement + combat, HUD, saves) · PROPOSAL_HOLD (PUBLISH HOLD)
   The simulation lives in cce_core.js (deterministic). This file only reads input, moves the hero, calls the core API and draws.
   Reuses: hero sheet (ChatGPT 18–27 via v1.2.1), Veyru 64 px frames (v2.2), METAL machine sprites (v2.3), Valence NPC sprites,
   wir_mella_combat.js v1.2.0 (byte-identical, via your/v23/vendor), wir_hero_profile.js, Mella Passport (your/v24/vendor copy).
   Built by concatenating your/v24/src/game_*.js (tools/build_v24.py). */
(function () {
'use strict';
var C = window.CCE_CONFIG, NB = window.WIRMellaCombat, H = window.WIR_HERO, PP = window.WIR_PASSPORT;
var Q = new URLSearchParams(location.search), T = C.map.tile;
var L = window.LIVING = { ready: false, error: null, version: C.version, status: C.status, stats: {}, qa: {} };
function $(id) { return document.getElementById(id); }
function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
function hyp(x, y) { return Math.sqrt(x * x + y * y); }
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
function count(k) { L.stats[k] = (L.stats[k] || 0) + 1; }

/* ---------------------------------------------------------------- assets */
var IMG = {}, MFR = null;
var SRC = { hero: 'your/assets/hero/hero_sheet_96.png', npc0: 'your/assets/npc0_livingwir.png', npc1: 'your/assets/npc1_livingwir.png', portrait: 'your/assets/hero/hero_portrait_256.png',
  vIdle: 'your/assets/kaw/veyru/veyru_idle_64.png', vW0: 'your/assets/kaw/veyru/veyru_walk_r_0_64.png', vW1: 'your/assets/kaw/veyru/veyru_walk_r_1_64.png', vW2: 'your/assets/kaw/veyru/veyru_walk_r_2_64.png' };
['happy', 'curious', 'alert', 'calm'].forEach(function (m) { SRC['portrait_' + m] = 'your/assets/kaw/veyru/portraits/veyru_' + m + '.png'; });   // ChatGPT CG-09 Veyru portraits (art 47), one per brain mood
['scout', 'walker', 'breacher'].forEach(function (k) { for (var i = 0; i < 4; i++) SRC[k + i] = 'your/assets/villains/metal_machines/' + k + '_' + i + '.png'; });
function loadAll(done) {
  var keys = Object.keys(SRC), left = keys.length + 2;
  function one() { if (--left === 0) done(); }
  keys.forEach(function (k) { var im = new Image(); im.onload = function () { IMG[k] = im; one(); }; im.onerror = function () { L.missing = (L.missing || []).concat([SRC[k]]); one(); }; im.src = SRC[k]; });
  fetch('your/assets/villains/metal_machines/frames.json').then(function (r) { return r.json(); }).then(function (j) { MFR = j; one(); }).catch(function () { MFR = null; one(); });
  if (window.MAP_ART && MAP_ART.whenReady) MAP_ART.whenReady.then(function () { one(); }, function () { one(); }); else one();
}
var TINTS = [0, 40, 100, 160, 220, 300];
function tinted(base, deg) { var c = document.createElement('canvas'); c.width = base.width; c.height = base.height; var x = c.getContext('2d'); x.filter = 'hue-rotate(' + deg + 'deg) saturate(1.1)'; x.drawImage(base, 0, 0); return c; }

/* ---------------------------------------------------------------- sim + save */
var sim, S, saveT = 0, pendingSave = false;
function newSeed() { return Q.get('seed') ? (+Q.get('seed') >>> 0) : ((Date.now() ^ (Math.random() * 1e9)) >>> 0); }
function loadSave() { if (Q.get('new') === '1') return null; try { var raw = localStorage.getItem(C.saveKey); if (!raw) return null; var o = JSON.parse(raw); if (!o || o.schema !== C.saveSchema) return null; return o; } catch (e) { L.saveError = String(e); return null; } }
function boot() {
  var sv = loadSave();
  try { sim = sv ? CCE.create({ save: sv }) : CCE.create({ seed: newSeed() }); } catch (e) { L.saveError = String(e); sim = CCE.create({ seed: newSeed() }); }
  S = sim.S; L.sim = sim; L.loadedFromSave = !!sv;
  if (!S.game) S.game = { pcar: { x: C.parkedCar[0], y: C.parkedCar[1], ang: 0, speed: 0 }, veyru: null, skate: { combo: 0, best: 0 }, bootCount: 0 };
  S.game.bootCount++; veyruInit();
  sim.on(function (type, d) { if (type === 'resolved') { pendingSave = true; syncProfile(); flushPassport(); } if (type === 'hurt') { flash = .25; count('hurt'); } if (type === 'feed') feedDirty = true; });
  flushPassport(); syncProfile();
}
function save(why) { try { localStorage.setItem(C.saveKey, JSON.stringify(sim.serialize())); L.lastSave = { at: S.t, why: why || 'auto', bytes: (localStorage.getItem(C.saveKey) || '').length }; count('save'); return true; } catch (e) { L.saveError = String(e); return false; } }
function syncProfile() {   // wir_hero_profile: games.your_living summary (backward compatible, like games.your_combat in v2.3)
  if (!H) return; try { var hist = S.history.filter(function (h) { return h.type !== 'note'; });
    H.gameData('your_living', { data: { version: C.version, day: sim.clock().day, incidents: hist.length, withMella: hist.filter(function (h) { return h.mella; }).length, contained: hist.filter(function (h) { return h.outcome === 'contained'; }).length, research: S.research, discoveries: Object.keys(S.discovered).length, skateBest: S.skate.best, iteronGen: S.iteron.gen, director: S.director.mode } }); } catch (e) { L.profileError = String(e); } }
function flushPassport() {   // Mella Passport: idempotent event ids; only incidents Mella took part in; record/upgrade effects only
  if (!PP || !S.outbox.length) return; try { PP.init(); } catch (e) { L.passportError = String(e); return; }
  S.outbox = S.outbox.filter(function (ev) { try { var pe = { eventId: ev.eventId, source: { worldId: 'your', buildVersion: 'v2.4-living', saveVersion: C.saveSchema }, at: ev.at || new Date().toISOString(), summary: ev.summary, effects: ev.effects }; ev.at = pe.at; var r = PP.applyEvent(pe); L.lastPassportEvent = pe;
      if (r && r.ok) { count(r.duplicate ? 'passport_dup' : 'passport_applied'); return false; } L.passportError = r && r.error; return true; } catch (e) { L.passportError = String(e); return true; } });
}

/* ---------------------------------------------------------------- input: keyboard + gamepad + touch */
var keys = {}, prevBtn = {}, btn = {}, touchMove = { x: 0, y: 0 }, touchBtn = {}, usingPad = false;
var KEYMAP = { KeyJ: 'hit', KeyL: 'blast', KeyK: 'dash', Space: 'jump', KeyE: 'act', KeyQ: 'skate', KeyF: 'car', KeyC: 'calm', Escape: 'menu', KeyP: 'menu', KeyH: 'hist', Enter: 'confirm' };
addEventListener('keydown', function (e) { if (e.repeat) { if (/Arrow|Key[WASD]/.test(e.code)) e.preventDefault(); return; } keys[e.code] = true; usingPad = false; if (/Arrow|Space/.test(e.code)) e.preventDefault(); });
addEventListener('keyup', function (e) { keys[e.code] = false; });
addEventListener('blur', function () { keys = {}; });
function readInput() {
  var mx = 0, my = 0, b = {};
  if (keys.KeyA || keys.ArrowLeft) mx -= 1; if (keys.KeyD || keys.ArrowRight) mx += 1; if (keys.KeyW || keys.ArrowUp) my -= 1; if (keys.KeyS || keys.ArrowDown) my += 1;
  for (var k in KEYMAP) if (keys[k]) b[KEYMAP[k]] = true;
  var pads = navigator.getGamepads ? navigator.getGamepads() : [];
  for (var i = 0; i < (pads ? pads.length : 0); i++) { var p = pads[i]; if (!p || !p.connected) continue;
    var ax = p.axes[0] || 0, ay = p.axes[1] || 0; if (Math.abs(ax) > .2 || Math.abs(ay) > .2) { mx += ax; my += ay; usingPad = true; }
    var B = function (n) { return p.buttons[n] && p.buttons[n].pressed; };
    if (B(14)) mx -= 1; if (B(15)) mx += 1; if (B(12)) my -= 1; if (B(13)) my += 1;
    if (B(0)) b.jump = b.confirm = true; if (B(1)) b.blast = b.back = true; if (B(2)) b.hit = true; if (B(3)) b.act = true; if (B(4)) b.calm = true; if (B(5)) b.dash = true; if (B(6)) b.skate = true; if (B(7)) b.car = true; if (B(8)) b.hist = true; if (B(9)) b.menu = true;
    if (B(12)) b.up = true; if (B(13)) b.down = true; if (B(14)) b.left = true; if (B(15)) b.right = true;
    for (var bi = 0; bi < 16; bi++) if (B(bi)) usingPad = true; }
  mx += touchMove.x; my += touchMove.y; for (var t in touchBtn) if (touchBtn[t]) b[t] = true;
  if (keys.ArrowUp) b.up = true; if (keys.ArrowDown) b.down = true; if (keys.ArrowLeft) b.left = true; if (keys.ArrowRight) b.right = true;
  var m = hyp(mx, my); if (m > 1) { mx /= m; my /= m; }
  var pressed = {}; for (var kk in b) if (b[kk] && !prevBtn[kk]) pressed[kk] = true; prevBtn = b; btn = b;
  return { mx: mx, my: my, held: b, pressed: pressed };
}
function setupTouch() {
  var st = $('stick'), kn = $('knob'), tid = null, cx = 0, cy = 0;
  function upd(x, y) { var dx = x - cx, dy = y - cy, d = hyp(dx, dy), R = 50; if (d > R) { dx = dx / d * R; dy = dy / d * R; } kn.style.transform = 'translate(' + dx + 'px,' + dy + 'px)'; touchMove.x = dx / R; touchMove.y = dy / R; }
  st.addEventListener('pointerdown', function (e) { tid = e.pointerId; var r = st.getBoundingClientRect(); cx = r.left + r.width / 2; cy = r.top + r.height / 2; st.setPointerCapture(e.pointerId); upd(e.clientX, e.clientY); e.preventDefault(); });
  st.addEventListener('pointermove', function (e) { if (e.pointerId === tid) upd(e.clientX, e.clientY); });
  function end(e) { if (e.pointerId !== tid) return; tid = null; touchMove.x = touchMove.y = 0; kn.style.transform = ''; }
  st.addEventListener('pointerup', end); st.addEventListener('pointercancel', end);
  Array.prototype.forEach.call(document.querySelectorAll('#pad button'), function (b) { var k = b.getAttribute('data-k');
    b.addEventListener('pointerdown', function (e) { touchBtn[k] = true; b.setPointerCapture(e.pointerId); e.preventDefault(); });
    function off() { touchBtn[k] = false; } b.addEventListener('pointerup', off); b.addEventListener('pointercancel', off); b.addEventListener('lostpointercapture', off); });
  var coarse = matchMedia('(pointer:coarse)').matches || ('ontouchstart' in window) || Q.get('touch') === '1';
  if (coarse && Q.get('touch') !== '0') { $('touch').classList.add('on'); document.body.classList.add('touchui'); L.touchUI = true; }
}

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

/* ---------------------------------------------------------------- rendering */
var cv, cx, mini, mx, base, W = 0, Hh = 0, DPR = 1, scale = 1, cam = { x: 0, y: 0 }, NPCV = [];
function resize() { DPR = Math.min(2, window.devicePixelRatio || 1); W = innerWidth; Hh = innerHeight; cv.width = W * DPR; cv.height = Hh * DPR; scale = clamp(Math.min(W / (22 * T), Hh / (14 * T)), .62, 1.3); }
function prerender() {   // static district: roads, sidewalks, buildings, plaza, park (images when MAP_ART loaded; code fill fallback)
  var G = sim.G, MA = window.MAP_ART, b = document.createElement('canvas'); b.width = G.W * T; b.height = G.H * T; var x = b.getContext('2d');
  if (!(MA && MA.tileFill(x, 'sidewalk', 0, 0, b.width, b.height))) { x.fillStyle = '#9aa3ad'; x.fillRect(0, 0, b.width, b.height); }
  for (var ty = 0; ty < G.H; ty++) for (var tx = 0; tx < G.W; tx++) {
    var g = G.g[ty * G.W + tx];
    if (g === 0) {
      var worn = ((tx * 13 + ty * 7) % 11) === 0;
      if (!(MA && MA.tileFill(x, worn ? 'asphalt_worn' : 'asphalt', tx * T, ty * T, T, T))) { x.fillStyle = '#3b4048'; x.fillRect(tx * T, ty * T, T, T); }
    }
  }
  if (!(MA && MA.tileFill(x, 'grass', 1 * T, 1 * T, 10 * T, 8 * T))) { x.fillStyle = '#5f9e55'; x.fillRect(1 * T, 1 * T, 10 * T, 8 * T); }
  for (var i = 0; i < 14; i++) {
    var px = (1.6 + (i * 3.7) % 9) * T, py = (1.5 + (i * 2.3) % 7) * T;
    if (!(MA && MA.blitSouth(x, 'tree', px, py + 10, 36, 48))) { x.fillStyle = '#4f8a46'; x.beginPath(); x.arc(px, py, 13, 0, 7); x.fill(); }
  }
  if (MA && MA.ok('bench')) { MA.blitSouth(x, 'bench', 2 * T, 2.6 * T, 28, 22); if (C.places && C.places.parkBench) MA.blitSouth(x, 'bench', C.places.parkBench[0] * T, C.places.parkBench[1] * T + 6, 28, 22); }
  if (!(MA && MA.tileFill(x, 'plaza', 14 * T, 24 * T, 18 * T, 10 * T))) { x.fillStyle = '#c0b8a8'; x.fillRect(14 * T, 24 * T, 18 * T, 10 * T); x.strokeStyle = 'rgba(0,0,0,.08)'; for (var gx = 14; gx < 32; gx += 2) { x.beginPath(); x.moveTo(gx * T, 24 * T); x.lineTo(gx * T, 34 * T); x.stroke(); } }
  if (!(MA && MA.tileFill(x, 'plaza', 14 * T, 36 * T, 18 * T, 5 * T))) { x.fillStyle = '#b8b0a0'; x.fillRect(14 * T, 36 * T, 18 * T, 5 * T); }
  if (MA && MA.ok('fountain')) MA.blitSouth(x, 'fountain', 23 * T, 29.5 * T, 40, 48);
  C.plaza.ramps.forEach(function (r) {
    if (MA && MA.ok('skate_ramp') && MA.blitSouth(x, 'skate_ramp', (r[0] + r[2] / 2) * T, (r[1] + r[3]) * T, r[2] * T, r[3] * T * 1.4)) return;
    var g2 = x.createLinearGradient(r[0] * T, 0, (r[0] + r[2]) * T, 0); g2.addColorStop(0, '#8d8577'); g2.addColorStop(1, '#e3dccd'); x.fillStyle = g2; x.fillRect(r[0] * T, r[1] * T, r[2] * T, r[3] * T); x.strokeStyle = '#5c564c'; x.lineWidth = 2; x.strokeRect(r[0] * T, r[1] * T, r[2] * T, r[3] * T);
  });
  C.plaza.rails.forEach(function (r) {
    var hk = r[3] === 'h' ? 'rail_long' : 'rail_short';
    if (MA && MA.ok(hk)) {
      if (r[3] === 'h') MA.blitCenter(x, hk, (r[0] + r[2] / 2) * T, (r[1] + .5) * T, r[2] * T, 16);
      else MA.blitCenter(x, hk, (r[0] + .5) * T, (r[1] + r[2] / 2) * T, 16, r[2] * T);
      return;
    }
    x.strokeStyle = '#d0d4da'; x.lineWidth = 5; x.beginPath(); if (r[3] === 'h') { x.moveTo(r[0] * T, (r[1] + .5) * T); x.lineTo((r[0] + r[2]) * T, (r[1] + .5) * T); } else { x.moveTo((r[0] + .5) * T, r[1] * T); x.lineTo((r[0] + .5) * T, (r[1] + r[2]) * T); } x.stroke(); x.strokeStyle = '#6c737d'; x.lineWidth = 1; x.stroke();
  });
  C.map.roadsY.forEach(function (ry) {
    if (MA && MA.ok('dash_h')) { for (var tx = 0; tx < G.W; tx++) { if (G.g[ry * G.W + tx] === 0 || G.g[(ry + 1) * G.W + tx] === 0) MA.tileFill(x, 'dash_h', tx * T, (ry + 1) * T, T, T); } return; }
    x.strokeStyle = 'rgba(255,255,255,.55)'; x.lineWidth = 2; x.setLineDash([12, 12]); x.beginPath(); x.moveTo(0, (ry + 1) * T); x.lineTo(b.width, (ry + 1) * T); x.stroke(); x.setLineDash([]);
  });
  C.map.roadsX.forEach(function (rx) {
    if (MA && MA.ok('dash_v')) { for (var ty = 0; ty < G.H; ty++) { if (G.g[ty * G.W + rx] === 0 || G.g[ty * G.W + rx + 1] === 0) MA.tileFill(x, 'dash_v', (rx + 1) * T, ty * T, T, T); } return; }
    x.strokeStyle = 'rgba(255,255,255,.55)'; x.lineWidth = 2; x.setLineDash([12, 12]); x.beginPath(); x.moveTo((rx + 1) * T, 0); x.lineTo((rx + 1) * T, b.height); x.stroke(); x.setLineDash([]);
  });
  C.map.roadsX.forEach(function (rx) { C.map.roadsY.forEach(function (ry) {
    if (MA && MA.ok('crosswalk')) {
      MA.tileFill(x, 'crosswalk', (rx - 1) * T, ry * T, T, 2 * T);
      MA.tileFill(x, 'crosswalk', (rx + 2) * T, ry * T, T, 2 * T);
      return;
    }
    x.fillStyle = 'rgba(255,255,255,.7)'; for (var k = 0; k < 5; k++) { x.fillRect((rx - 1) * T + 4, (ry + k * .4) * T + 2, T - 8, 5); x.fillRect((rx + 2) * T + 4, (ry + k * .4) * T + 2, T - 8, 5); }
  }); });
  C.buildings.forEach(function (bd) {
    var r = bd.r, muralProg = (sim.S && sim.S.mural) || 0;
    if (MA && MA.drawLivingBuilding(x, bd, T, muralProg)) {
      x.font = 'bold 11px system-ui'; x.textAlign = 'center'; x.fillStyle = '#fff'; x.strokeStyle = 'rgba(0,0,0,.75)'; x.lineWidth = 3;
      var lx = (r[0] + r[2] / 2) * T, ly = (r[1] + r[3]) * T + 12; x.strokeText(bd.name, lx, ly); x.fillText(bd.name, lx, ly);
      return;
    }
    x.fillStyle = 'rgba(0,0,0,.25)'; x.fillRect(r[0] * T + 5, r[1] * T + 6, r[2] * T, r[3] * T); x.fillStyle = bd.color; x.fillRect(r[0] * T, r[1] * T, r[2] * T, r[3] * T);
    x.fillStyle = 'rgba(255,255,230,.12)'; x.fillRect(r[0] * T, r[1] * T, r[2] * T, 8); x.strokeStyle = 'rgba(0,0,0,.45)'; x.lineWidth = 2; x.strokeRect(r[0] * T + 1, r[1] * T + 1, r[2] * T - 2, r[3] * T - 2);
    if (bd.kind !== 'mural') { x.fillStyle = 'rgba(255,255,230,.35)'; for (var wy = r[1] + .7; wy < r[1] + r[3] - .6; wy += 1.3) for (var wx = r[0] + .6; wx < r[0] + r[2] - .5; wx += 1.2) x.fillRect(wx * T, wy * T, 12, 9); }
    x.fillStyle = '#2b2b2b'; x.fillRect((bd.door[0] + .2) * T, (bd.door[1] - (bd.door[1] > r[1] ? .25 : -.75)) * T, .6 * T, 7);
    x.font = 'bold 11px system-ui'; x.textAlign = 'center'; x.fillStyle = '#fff'; x.strokeStyle = 'rgba(0,0,0,.75)'; x.lineWidth = 3; var lx2 = (r[0] + r[2] / 2) * T, ly2 = (r[1] + Math.min(1.2, r[3] / 2)) * T + 4; x.strokeText(bd.name, lx2, ly2); x.fillText(bd.name, lx2, ly2);
  });
  C.grates.forEach(function (g3) {
    if (MA && MA.ok('grate') && MA.blitCenter(x, 'grate', (g3[0] + .5) * T, (g3[1] + .5) * T, T, T)) return;
    x.fillStyle = '#222'; x.fillRect(g3[0] * T + 6, g3[1] * T + 6, T - 12, T - 12); x.strokeStyle = '#555'; for (var k2 = 0; k2 < 4; k2++) { x.beginPath(); x.moveTo(g3[0] * T + 8 + k2 * 5, g3[1] * T + 7); x.lineTo(g3[0] * T + 8 + k2 * 5, g3[1] * T + T - 7); x.stroke(); }
  });
  base = b;
}

function W2S(x, y) { return [(x * T - cam.x) * scale + W / 2, (y * T - cam.y) * scale + Hh / 2]; }
var DIRROW = { down: 0, up: 1, left: 2, right: 3 };
function heroFrame() { var p = S.player, side = p.dir === 'left', t = S.t;
  if (p.ko > 0) return { c: 14, r: 4, f: side };
  if (hs.act === 'hit') return { c: 3, r: 4, f: side }; if (hs.act === 'blast') return { c: 10, r: 4, f: side }; if (hs.act === 'calm') return { c: 12, r: 1, f: false };
  if (p.mode === 'skate') { if (hs.act === 'bail') return { c: 5, r: 6, f: side }; if (hs.grind) return { c: 2, r: 6, f: side }; if (hs.air > 0) return { c: hs.trick ? 4 : 3, r: 6, f: side }; return { c: hs.moving ? [0, 1, 0, 6][Math.floor(hs.ph * .5) % 4] : 0, r: 6, f: side }; }
  if (hs.dashT > 0 && (p.dir === 'left' || p.dir === 'right')) return { c: 8 + (Math.floor(t * 12) % 2), r: side ? 8 : 7, f: false };
  if (hs.air > 0) return { c: 5, r: side ? 8 : 7, f: false };
  var r = DIRROW[p.dir] || 0; return hs.moving ? { c: 4 + Math.floor(hs.ph * .55) % 8, r: r, f: false } : { c: Math.floor(t * 1.6) % 4, r: r, f: false }; }
function shadowAt(sx, sy, rx) { cx.fillStyle = 'rgba(0,0,0,.28)'; cx.beginPath(); cx.ellipse(sx, sy, rx * scale, rx * .4 * scale, 0, 0, 7); cx.fill(); }
function label(sx, sy, txt, col, size) { cx.font = 'bold ' + Math.round((size || 10) * Math.max(.9, scale)) + 'px system-ui'; cx.textAlign = 'center'; cx.lineWidth = 3; cx.strokeStyle = 'rgba(0,0,0,.8)'; cx.strokeText(txt, sx, sy); cx.fillStyle = col || '#fff'; cx.fillText(txt, sx, sy); }
function drawMachine(kind, fr, sx, sy, k, alpha, flip) { var im = IMG[kind + fr]; if (!im) { cx.fillStyle = '#444'; cx.fillRect(sx - 10, sy - 24, 20, 24); return; } var m = MFR && MFR[kind + '_' + fr], ax = m ? m[2] : im.width / 2, ay = m ? m[3] : im.height;
  cx.save(); cx.globalAlpha = alpha == null ? 1 : alpha; cx.translate(sx, sy); if (flip) cx.scale(-1, 1); cx.drawImage(im, -ax * k * scale, -ay * k * scale, im.width * k * scale, im.height * k * scale); cx.restore(); }
function vehicleShape(v, sx, sy) {
  if (window.MAP_ART && MAP_ART.drawVehicle(cx, v, sx, sy, T, scale, S.t)) return;
  var L2 = v.kind === 'truck' ? 2.3 : v.kind === 'van' ? 1.9 : v.kind === 'repair' ? 2 : 1.5, W2 = v.kind === 'truck' ? 1 : v.kind === 'van' ? .9 : .78;
  cx.save(); cx.translate(sx, sy); cx.rotate(v.ang || 0); var l = L2 * T * scale, w = W2 * T * scale; cx.fillStyle = 'rgba(0,0,0,.3)'; cx.fillRect(-l / 2 + 3, -w / 2 + 4, l, w); cx.fillStyle = v.color || '#ccc'; cx.fillRect(-l / 2, -w / 2, l, w);
  cx.fillStyle = 'rgba(20,30,40,.75)'; cx.fillRect(l / 2 - l * .28, -w / 2 + 2, l * .18, w - 4); if (v.kind === 'truck') { cx.fillStyle = '#ced4da'; cx.fillRect(-l / 2, -w / 2, l * .62, w); cx.fillStyle = '#495057'; cx.font = 'bold ' + Math.round(8 * scale) + 'px system-ui'; cx.textAlign = 'center'; cx.fillText('DELIVERY', -l * .2, 3); }
  if (v.kind === 'repair') { cx.fillStyle = '#212529'; for (var i = 0; i < 4; i++) cx.fillRect(-l / 2 + i * l / 4, -w / 2, l / 8, w); }
  if (v.stopped && Math.floor(S.t * 3) % 2) { cx.fillStyle = '#ffd43b'; cx.fillRect(-l / 2, -w / 2, 5, 5); cx.fillRect(l / 2 - 5, -w / 2, 5, 5); cx.fillRect(-l / 2, w / 2 - 5, 5, 5); cx.fillRect(l / 2 - 5, w / 2 - 5, 5, 5); }
  cx.restore();
}

function draw() {
  var p = S.player; var tx = p.x * T, ty = (p.y - .4) * T; cam.x += (tx - cam.x) * .18; cam.y += (ty - cam.y) * .18;
  var hw = W / 2 / scale, hh = Hh / 2 / scale; cam.x = clamp(cam.x, Math.min(hw, base.width / 2), Math.max(base.width - hw, base.width / 2)); cam.y = clamp(cam.y, Math.min(hh, base.height / 2), Math.max(base.height - hh, base.height / 2));
  cx.setTransform(DPR, 0, 0, DPR, 0, 0); cx.fillStyle = '#0b0f16'; cx.fillRect(0, 0, W, Hh);
  cx.save(); cx.translate(W / 2, Hh / 2); cx.scale(scale, scale); cx.translate(-cam.x, -cam.y); cx.drawImage(base, 0, 0);
  // live city state: damage, closures, mural progress, traffic lights, road closures
  var clk = sim.clock(), nightNow = clk.hour >= 20 || clk.hour < 6 ? .42 : clk.hour >= 18 ? (clk.minute - 1080) / 120 * .42 : clk.hour < 7 ? (420 - clk.minute) / 60 * .42 : 0;
  C.buildings.forEach(function (bd) { var B = S.buildings[bd.id], r = bd.r;
    if (window.MAP_ART && MAP_ART.drawLivingBuildingLive(cx, bd, B, T, S.t, nightNow, S.mural)) return;
    if (bd.kind === 'mural') { var n = Math.floor(r[2] * S.mural / 100); for (var i = 0; i < n; i++) { cx.fillStyle = 'hsl(' + ((i * 47) % 360) + ',70%,60%)'; cx.fillRect((r[0] + i) * T, r[1] * T + 3, T, r[3] * T - 6); } }
    if (B.dmg > 3) { cx.fillStyle = 'rgba(30,20,10,' + Math.min(.55, B.dmg / 140) + ')'; cx.fillRect(r[0] * T, r[1] * T, r[2] * T, r[3] * T); cx.strokeStyle = 'rgba(0,0,0,.6)'; cx.lineWidth = 2; for (var k = 0; k < Math.floor(B.dmg / 12); k++) { var sx0 = (r[0] + ((k * 2.7) % r[2])) * T, sy0 = (r[1] + ((k * 1.9) % r[3])) * T; cx.beginPath(); cx.moveTo(sx0, sy0); cx.lineTo(sx0 + 14, sy0 + 9); cx.lineTo(sx0 + 6, sy0 + 20); cx.stroke(); }
      if (B.dmg > 35 && Math.sin(S.t * 2 + r[0]) > -.2) { cx.fillStyle = 'rgba(120,120,120,.35)'; cx.beginPath(); cx.arc((r[0] + r[2] / 2) * T, (r[1] + .5) * T - (S.t * 20 % 30), 12 + (S.t * 10 % 8), 0, 7); cx.fill(); } }
    if (B.closed) { var lx = (bd.door[0] + .5) * T, ly = (bd.door[1] + .5) * T; cx.fillStyle = '#c92a2a'; cx.fillRect(lx - 26, ly - 9, 52, 16); cx.fillStyle = '#fff'; cx.font = 'bold 10px system-ui'; cx.textAlign = 'center'; cx.fillText('CLOSED', lx, ly + 3); } });
  (S.roadClosures || []).forEach(function (rc) {
    if (window.MAP_ART && MAP_ART.ok('cones') && MAP_ART.blitCenter(cx, 'cones', rc.x * T, rc.y * T, 42, 32)) return;
    for (var i = -1; i <= 1; i++) { var cx0 = rc.x * T + i * 14, cy0 = rc.y * T; cx.fillStyle = '#ff922b'; cx.beginPath(); cx.moveTo(cx0, cy0 - 9); cx.lineTo(cx0 - 6, cy0 + 7); cx.lineTo(cx0 + 6, cy0 + 7); cx.fill(); cx.fillStyle = '#fff'; cx.fillRect(cx0 - 3, cy0 - 1, 6, 2); }
  });
  var ph = sim.light(); sim.G.nodes.forEach(function (n) { if (n.edge) return;
    if (window.MAP_ART && MAP_ART.ok('traffic_light')) {
      MAP_ART.blitSouth(cx, 'traffic_light', n.x * T - 26, n.y * T - 10, 18, 36);
      MAP_ART.blitSouth(cx, 'traffic_light', n.x * T + 26, n.y * T + 42, 18, 36);
      cx.fillStyle = ph === 'h' ? '#51cf66' : '#ff6b6b'; cx.beginPath(); cx.arc(n.x * T - 26, n.y * T - 32, 3, 0, 7); cx.fill();
      cx.fillStyle = ph === 'v' ? '#51cf66' : '#ff6b6b'; cx.beginPath(); cx.arc(n.x * T + 26, n.y * T + 20, 3, 0, 7); cx.fill();
      return;
    }
    cx.fillStyle = ph === 'h' ? '#51cf66' : '#ff6b6b'; cx.beginPath(); cx.arc(n.x * T - 26, n.y * T - 26, 4, 0, 7); cx.fill(); cx.fillStyle = ph === 'v' ? '#51cf66' : '#ff6b6b'; cx.beginPath(); cx.arc(n.x * T + 26, n.y * T + 26, 4, 0, 7); cx.fill();
  });
  C.discoveries.forEach(function (d) { if (S.discovered[d.id]) return; var dd = hyp(d.at[0] - p.x, d.at[1] - p.y); if (dd < 5) {
    var tag = (d.id === 'd6' && window.MAP_ART && MAP_ART.ok('sunflower')) ? 'sunflower' : (d.id === 'd1' && window.MAP_ART && MAP_ART.ok('octopus_tag')) ? 'octopus_tag' : 'discovery_glint';
    if (window.MAP_ART && MAP_ART.ok(tag) && MAP_ART.blitCenter(cx, tag, d.at[0] * T, d.at[1] * T, 22, 22)) return;
    cx.fillStyle = 'rgba(99,230,190,' + (.35 + .3 * Math.sin(S.t * 5)) + ')'; cx.beginPath(); cx.arc(d.at[0] * T, d.at[1] * T, 6, 0, 7); cx.fill();
  } });
  drawMorrowGate();
  S.items.forEach(function (it) { var a = .6 + .4 * Math.sin(S.t * 10);
    if (it.kind === 'evidence') {
      if (window.MAP_ART && MAP_ART.ok('evidence') && MAP_ART.blitCenter(cx, 'evidence', it.x * T, it.y * T, 22, 22)) { cx.globalAlpha = 1; cx.fillStyle = '#ffd43b'; cx.font = '700 9px system-ui'; cx.textAlign = 'center'; cx.fillText('EVIDENCE · E', it.x * T, it.y * T - 16); return; }
      cx.fillStyle = 'rgba(255,212,59,' + a + ')'; cx.fillRect(it.x * T - 8, it.y * T - 6, 16, 12); cx.strokeStyle = '#fff'; cx.lineWidth = 2; cx.strokeRect(it.x * T - 8, it.y * T - 6, 16, 12); cx.fillStyle = '#ffd43b'; cx.font = '700 9px system-ui'; cx.textAlign = 'center'; cx.fillText('EVIDENCE · E', it.x * T, it.y * T - 10); return;
    }
    if (window.MAP_ART && MAP_ART.ok('prototype_core') && MAP_ART.blitCenter(cx, 'prototype_core', it.x * T, it.y * T, 22, 22)) return;
    cx.fillStyle = 'rgba(218,119,242,' + a + ')'; cx.beginPath(); cx.arc(it.x * T, it.y * T, 9, 0, 7); cx.fill(); cx.strokeStyle = '#fff'; cx.lineWidth = 2; cx.stroke();
  });
  cx.restore();
  // y-sorted sprites in screen space
  var list = [];
  S.vehicles.forEach(function (v) { list.push({ y: v.y, f: function () { var s = W2S(v.x, v.y); vehicleShape(v, s[0], s[1]); if (v.inc && v.maxHp) { var w = 34 * scale; cx.fillStyle = '#000'; cx.fillRect(s[0] - w / 2, s[1] - 26 * scale, w, 4); cx.fillStyle = '#ff922b'; cx.fillRect(s[0] - w / 2, s[1] - 26 * scale, w * clamp(v.hp / v.maxHp, 0, 1), 4); if (v.protT > 0) label(s[0], s[1] - 30 * scale, 'SHIELDED', '#ffa94d', 9); } } }); });
  var car = S.game.pcar; if (S.player.mode !== 'car') list.push({ y: car.y, f: function () { var s = W2S(car.x, car.y); vehicleShape({ kind: 'car', ang: car.ang, color: '#2ec4b6', player: true }, s[0], s[1]); if (hyp(car.x - p.x, car.y - p.y) < 6) label(s[0], s[1] - 18 * scale, 'YOUR CAR · F / RT', '#8ff5ea', 9); } });
  S.civs.forEach(function (c, i) { if (c.inside) return; list.push({ y: c.y, f: function () { var s = W2S(c.x, c.y), im = NPCV[i % NPCV.length]; shadowAt(s[0], s[1], 9); cx.save(); cx.translate(s[0], s[1]); if (c.injured > 0) cx.rotate(Math.PI / 2);
    var bob = (c.dest && !(c.injured > 0)) ? Math.abs(Math.sin(S.t * 9 + i)) * 2 : 0; if (im) cx.drawImage(im, -20 * scale, (-40 - bob) * scale, 40 * scale, 40 * scale); cx.restore();
    if (c.grabbed) label(s[0], s[1] - 44 * scale, 'HELP!', '#ff6b6b', 11); else if (c.injured > 0) label(s[0], s[1] - 18 * scale, 'hurt · E / CALM', '#ffa8a8', 9);
    else if (c.chat > 0 && c.said) label(s[0], s[1] - 46 * scale, '💬 ' + c.said.slice(0, 34), '#e9ecef', 9); else if (hyp(c.x - p.x, c.y - p.y) < 3) label(s[0], s[1] - 44 * scale, c.name + ' · ' + c.role, '#dee2e6', 9);
    if (c.action === 'protest' && !c.dest) label(s[0], s[1] - 52 * scale, '🪧 FIX OUR STREETS', '#ffd43b', 9); } }); });
  S.supers.forEach(function (s) { if (s.state === 'captured') return; var d = sim.sdef(s.id); list.push({ y: s.y, f: function () { var q = W2S(s.x, s.y); shadowAt(q[0], q[1], 10);
    if (!(window.MAP_ART && MAP_ART.drawSuper(cx, s.id, s.state, q[0], q[1], scale))) {
      cx.save(); cx.translate(q[0], q[1]); if (s.state === 'injured') cx.rotate(Math.PI / 2);
      cx.fillStyle = d.color; cx.beginPath(); cx.moveTo(-9 * scale, -10 * scale); cx.lineTo(9 * scale, -10 * scale); cx.lineTo(12 * scale, 4 * scale); cx.lineTo(-12 * scale, 4 * scale); cx.fill();
      cx.fillStyle = '#1b1f27'; cx.beginPath(); cx.arc(0, -16 * scale, 10 * scale, 0, 7); cx.fill(); cx.strokeStyle = d.color; cx.lineWidth = 3; cx.stroke(); cx.fillStyle = d.color; cx.beginPath(); cx.arc(0, -30 * scale, 7 * scale, 0, 7); cx.fill(); cx.strokeStyle = '#fff'; cx.lineWidth = 1.5; cx.stroke(); cx.restore();
    }
    label(q[0], q[1] - 42 * scale, d.codename + (s.state === 'injured' ? ' · HURT · E' : s.state === 'alerted' ? ' · !' : s.state === 'feud' ? ' · FEUD · E/C' : (S.divider && S.divider.rival && S.divider.rival.id === s.id) ? ' · ' + S.divider.rival.name : ''), s.state === 'injured' ? '#ff8787' : s.state === 'feud' ? '#ffa94d' : d.color, 9); } }); });
  S.robots.forEach(function (r) { list.push({ y: r.y, f: function () { var s = W2S(r.x, r.y);
    if (r.security) { shadowAt(s[0], s[1], 9); if (!(window.MAP_ART && MAP_ART.drawSecurity(cx, !!r.hostile || r.st === 'alert' || r.st === 'atk', s[0], s[1], scale))) { cx.fillStyle = '#4dabf7'; cx.beginPath(); cx.arc(s[0], s[1] - 12 * scale, 9 * scale, 0, 7); cx.fill(); cx.strokeStyle = '#fff'; cx.stroke(); } label(s[0], s[1] - 26 * scale, 'CITY SECURITY', '#a5d8ff', 8); return; }
    if (r.riding) return; var R = C.robots[r.cls], spr = R.sprite, fr = r.st === 'tele' ? 2 : r.st === 'atk' ? 3 : r.st === 'down' ? 3 : Math.floor(r.cyc * 4) % 2, k = r.cls === 'scout' ? .62 : r.cls === 'interceptor' ? .7 : .8;
    if (r.cls === 'commander' && r.st !== 'down') { cx.strokeStyle = 'rgba(116,192,252,.35)'; cx.lineWidth = 2; cx.beginPath(); cx.arc(s[0], s[1], C.robots.commander.shieldR * T * scale, 0, 7); cx.stroke(); }
    if (r.st === 'tele') { cx.strokeStyle = 'rgba(255,169,77,.8)'; cx.lineWidth = 6 * scale; cx.beginPath(); cx.moveTo(s[0], s[1]); cx.lineTo(s[0] + Math.cos(r.face) * 2.6 * T * scale, s[1] + Math.sin(r.face) * 2.6 * T * scale); cx.stroke(); }
    shadowAt(s[0], s[1], 11);
    if (r.disguised && hyp(r.x - p.x, r.y - p.y) > 3) { cx.fillStyle = '#e9ecef'; cx.fillRect(s[0] - 9 * scale, s[1] - 30 * scale, 18 * scale, 12 * scale); cx.fillStyle = '#868e96'; cx.fillRect(s[0] - 14 * scale, s[1] - 33 * scale, 28 * scale, 3 * scale); label(s[0], s[1] - 38 * scale, C.patrolDrone.name, '#ced4da', 8); return; }
    var lift = r.cls === 'scout' ? (10 + Math.sin(r.cyc * 3) * 3) * scale : 0; drawMachine(spr, fr, s[0], s[1] - lift, k, r.st === 'down' ? clamp(r.t / 2.2, 0, 1) : 1, Math.cos(r.face || 0) < 0 || (r.x > p.x && r.cls !== 'scout'));
    if (r.flash > 0) { cx.fillStyle = 'rgba(255,255,255,.5)'; cx.beginPath(); cx.arc(s[0], s[1] - 18 * scale, 14 * scale, 0, 7); cx.fill(); }
    if (r.st !== 'down') { var w = 28 * scale; cx.fillStyle = '#000'; cx.fillRect(s[0] - w / 2, s[1] - 50 * scale - lift, w, 3); cx.fillStyle = r.hostile ? '#fa5252' : '#adb5bd'; cx.fillRect(s[0] - w / 2, s[1] - 50 * scale - lift, w * r.hp / r.max, 3);
      if (hyp(r.x - p.x, r.y - p.y) < 7 || r.fleeing) label(s[0], s[1] - 54 * scale - lift, (r.fleeing && r.inc ? '◎ SIGNAL · ' : '') + (r.patrol ? 'ITERON PATROL' : R.name) + (sim.shielded(r) ? ' · SHIELDED' : ''), r.fleeing ? '#da77f2' : '#ffc9c9', 8); } } }); });
  if (!(S.game.veyru.inCar)) { var k2 = S.game.veyru; list.push({ y: k2.y, f: function () { var s = W2S(k2.x, k2.y), im = k2.moving ? IMG['vW' + (Math.floor(k2.ph || 0) % 3)] : IMG.vIdle; shadowAt(s[0], s[1], 12); if (im) { cx.save(); cx.translate(s[0], s[1]); if (k2.face < 0) cx.scale(-1, 1); cx.drawImage(im, -24 * scale, -40 * scale, 48 * scale, 48 * scale); cx.restore(); } var b2 = k2.brain; label(s[0], s[1] - 40 * scale, 'Veyru · ' + (b2.accompanied ? (b2.stayUntil != null ? 'staying' : b2.activity) : 'home · ' + b2.activity), b2.accompanied ? '#b2f2bb' : '#ffd8a8', 8); } }); }
  list.push({ y: p.y + .01, f: function () { var s = W2S(p.x, p.y); if (p.mode === 'car') { vehicleShape({ kind: 'car', ang: car.ang, color: '#2ec4b6', player: true }, s[0], s[1]); label(s[0], s[1] - 18 * scale, 'MELLA', '#8ff5ea', 9); return; }
    shadowAt(s[0], s[1], p.z > 0 ? 8 : 11); var f = heroFrame(), im = IMG.hero, sz = 70 * scale, lift = p.z * 18 * scale; if (p.inv > 0 && Math.floor(S.t * 20) % 2 && p.ko <= 0) return;
    if (p.mode === 'skate' && f.r !== 6) { cx.fillStyle = '#2b2b2b'; cx.fillRect(s[0] - 14 * scale, s[1] - 4 * scale - lift, 28 * scale, 5 * scale); }
    if (im) { cx.save(); cx.translate(s[0], s[1] - lift); if (f.f) cx.scale(-1, 1); cx.drawImage(im, f.c * 96, f.r * 96, 96, 96, -sz / 2, -sz * .96, sz, sz); cx.restore(); }
    if (hs.act === 'calm') { cx.strokeStyle = 'rgba(178,242,187,.7)'; cx.lineWidth = 3; cx.beginPath(); cx.arc(s[0], s[1], HC.calmRadius * T * scale * (1 - hs.actT), 0, 7); cx.stroke(); }
    if (hs.act === 'hit') { var dv = dirVec(p.dir); cx.strokeStyle = 'rgba(255,224,102,.8)'; cx.lineWidth = 4; cx.beginPath(); cx.arc(s[0] + dv[0] * 20 * scale, s[1] - 20 * scale + dv[1] * 14 * scale, 16 * scale, 0, 7); cx.stroke(); } } });
  list.sort(function (a, b) { return a.y - b.y; }); list.forEach(function (o) { o.f(); });
  fx.shots.forEach(function (s) { var q = W2S(s.x, s.y); cx.fillStyle = '#74c0fc'; cx.beginPath(); cx.arc(q[0], q[1] - 14 * scale, 7 * scale, 0, 7); cx.fill(); cx.fillStyle = '#e7f5ff'; cx.beginPath(); cx.arc(q[0], q[1] - 14 * scale, 3 * scale, 0, 7); cx.fill(); });
  (S.fx || []).forEach(function (f) { var q = W2S(f.x, f.y); cx.fillStyle = 'rgba(255,146,43,' + f.t + ')'; cx.beginPath(); cx.arc(q[0], q[1], (1 - f.t) * 40 * scale + 8, 0, 7); cx.fill(); });
  fx.pops.forEach(function (o) { var q = W2S(o.x, o.y - (1.1 - o.t) * .8); cx.globalAlpha = clamp(o.t, 0, 1); label(q[0], q[1], o.txt, o.col, 11); cx.globalAlpha = 1; });
  var c = sim.clock(), night = c.hour >= 20 || c.hour < 6 ? .42 : c.hour >= 18 ? (c.minute - 1080) / 120 * .42 : c.hour < 7 ? (420 - c.minute) / 60 * .42 : 0; if (night > 0) { cx.fillStyle = 'rgba(10,18,48,' + night.toFixed(3) + ')'; cx.fillRect(0, 0, W, Hh); }
  if (flash > 0) { cx.fillStyle = 'rgba(255,60,60,' + (flash * 1.2).toFixed(2) + ')'; cx.fillRect(0, 0, W, Hh); }
  S.incidents.forEach(function (inc) { var q = W2S(inc.x, inc.y); if (q[0] > 20 && q[0] < W - 20 && q[1] > 20 && q[1] < Hh - 20) { label(q[0], q[1] - 70 * scale, '⚠ ' + inc.label.toUpperCase(), '#ffb347', 11); return; }
    var a = Math.atan2(q[1] - Hh / 2, q[0] - W / 2), ex = W / 2 + Math.cos(a) * (W / 2 - 34), ey = Hh / 2 + Math.sin(a) * (Hh / 2 - 34); ex = clamp(ex, 30, W - 30); ey = clamp(ey, 60, Hh - 60);
    cx.save(); cx.translate(ex, ey); cx.rotate(a); cx.fillStyle = inc.tier === 'major' ? '#ff6b6b' : '#ffb347'; cx.beginPath(); cx.moveTo(14, 0); cx.lineTo(-8, -9); cx.lineTo(-8, 9); cx.fill(); cx.restore(); label(ex, ey + 22, inc.label + ' · ' + Math.round(hyp(inc.x - p.x, inc.y - p.y)) + 'm', '#ffd8a8', 9); });
}
function drawMini() { var G = sim.G, w = mini.width, h = mini.height, kx = w / G.W, ky = h / G.H; mx.drawImage(base, 0, 0, w, h);
  mx.fillStyle = 'rgba(0,0,0,.25)'; mx.fillRect(0, 0, w, h);
  S.robots.forEach(function (r) { if (r.riding || r.st === 'down') return; mx.fillStyle = r.security ? '#4dabf7' : r.hostile ? '#ff6b6b' : '#adb5bd'; mx.fillRect(r.x * kx - 2, r.y * ky - 2, 4, 4); });
  S.supers.forEach(function (s) { if (s.state === 'captured') return; mx.fillStyle = sim.sdef(s.id).color; mx.beginPath(); mx.arc(s.x * kx, s.y * ky, 3.5, 0, 7); mx.fill(); });
  S.incidents.forEach(function (i) { mx.strokeStyle = '#ffb347'; mx.lineWidth = 2; mx.beginPath(); mx.arc(i.x * kx, i.y * ky, 9 + Math.sin(S.t * 6) * 2, 0, 7); mx.stroke(); });
  mx.fillStyle = '#2ec4b6'; mx.beginPath(); mx.arc(S.player.x * kx, S.player.y * ky, 4.5, 0, 7); mx.fill(); mx.strokeStyle = '#fff'; mx.lineWidth = 1.5; mx.stroke(); }
/* ---- v2.4 merge · Morrow City as a district of the main Y.O.U.R. city (owner: publish "v2.4 Living District and Morrow City").
   A Morrow Line gate beside the Transit Depot (Foundry Edge) opens the Morrow City district (METAL: IN DA RIFFT v17 engine + the Y.O.U.R. co-op
   layer, your/morrow/district/morrow_v17.html, from your-build-v24-metal 6654d44) in a full-screen frame. The Living District pauses while you are away
   and resumes when Morrow posts 'your-morrow-exit'. Progress is kept by the Morrow engine's own saves and the shared hero profile (games.your_morrow). */
var MORROW = { x: 60.5, y: 21.5, r: 1.4, overlay: null, lead: null, visits: 0, last: null, wasPaused: false };
L.morrow = MORROW;
function morrowNear() { var p = S.player; return p.mode !== 'car' && hyp(p.x - MORROW.x, p.y - MORROW.y) < MORROW.r; }
function drawMorrowGate() { var t = S.t, X0 = MORROW.x * T, Y0 = MORROW.y * T + 6, near = morrowNear(); cx.save();
  if (!(window.MAP_ART && MAP_ART.drawGate(cx, X0, Y0, near, t))) {
    for (var k = 0; k < 3; k++) { cx.strokeStyle = k === 1 ? 'rgba(201,166,255,.85)' : 'rgba(124,240,224,.75)'; cx.lineWidth = 2; cx.beginPath(); cx.ellipse(X0, Y0 - 16, 9 + k * 3 + Math.sin(t * 2 + k) * 1.5, 15 + k * 3, 0, 0, 7); cx.stroke(); }
    cx.fillStyle = 'rgba(124,240,224,.18)'; cx.beginPath(); cx.ellipse(X0, Y0 - 16, 9, 15, 0, 0, 7); cx.fill();
  }
  cx.font = '700 9px system-ui'; cx.textAlign = 'center'; var lab = 'MORROW LINE · MORROW CITY · E', w = cx.measureText(lab).width + 8;
  cx.fillStyle = 'rgba(8,10,24,.8)'; cx.fillRect(X0 - w / 2, Y0 - 70, w, 13); cx.fillStyle = '#7cf0e0'; cx.fillText(lab, X0, Y0 - 60); cx.restore(); }
function openMorrow(lead) { if (MORROW.overlay) return false; MORROW.wasPaused = paused; paused = true; save('morrow');
  var ov = document.createElement('div'); ov.id = 'livingMorrowOverlay'; ov.style.cssText = 'position:fixed;inset:0;z-index:9999;background:#120e16';
  var fr = document.createElement('iframe'); fr.id = 'livingMorrowFrame'; fr.title = 'Morrow City district'; fr.setAttribute('allow', 'gamepad; autoplay');
  fr.style.cssText = 'border:0;width:100%;height:100%;display:block'; fr.src = 'your/morrow/district/morrow_v17.html?lead=' + (lead === 'metal' ? 'metal' : 'hero') + '&from=living';
  ov.appendChild(fr); document.body.appendChild(ov); MORROW.overlay = ov; MORROW.lead = lead; MORROW.visits++; count('morrow_enter_' + lead);
  setTimeout(function () { try { fr.focus(); } catch (e) { } }, 300); return true; }
function closeMorrow(summary) { if (!MORROW.overlay) return; MORROW.overlay.remove(); MORROW.overlay = null; MORROW.last = summary || null; paused = MORROW.wasPaused; count('morrow_exit');
  var s = summary || {}; sim.note('Mella came back from Morrow City (Metal Story ' + (s.finished ? '10/10' : (s.step | 0) + '/10') + ').');
  pop(S.player.x, S.player.y - 1.4, 'BACK FROM MORROW CITY', '#7cf0e0'); }
window.addEventListener('message', function (e) { var d = e.data; if (d && d.type === 'your-morrow-exit') closeMorrow(d.summary); });

/* ---------------------------------------------------------------- HUD + menus */
var hudT = 0, ui = { menu: false, hist: false, focus: 0, histAll: false };
function bar(lbl, v, col) { return '<span>' + lbl + '</span><div class="bar"><i style="width:' + clamp(v, 0, 100).toFixed(0) + '%;background:' + col + '"></i></div>'; }
function hud() {
  var c = sim.clock(), p = S.player, z = sim.zoneAt(p.x, p.y), Z = S.zones[z], M = C.director.modes[S.director.mode];
  $('hudL').innerHTML = '<div class="brand"><b>Y.O.U.R. Experience</b> — Experience Wonders · LIVING DISTRICT v2.4 · PROPOSAL_HOLD</div>' +
    '<div class="clk">Day ' + c.day + ' · ' + c.weekday.slice(0, 3) + ' ' + c.hhmm + '</div>' +
    '<div class="row"><span class="hearts">' + '♥'.repeat(p.hp) + '<span style="opacity:.25">' + '♥'.repeat(Math.max(0, HC.hp - p.hp)) + '</span></span><span class="chip mode">' + (p.ko > 0 ? 'KNOCKED DOWN' : p.mode.toUpperCase()) + '</span><span class="chip dir">' + M.label.toUpperCase() + '</span>' + (hs.comboPts > 0 ? '<span class="chip">COMBO ' + Math.round(hs.comboPts) + ' ×' + Math.max(1, hs.combo) + '</span>' : '') + '</div>' +
    '<div class="row small">' + C.zones[z].name + (Z.security ? ' · security ' + Z.security : '') + ' · Iteron gen ' + S.iteron.gen + '</div>' +
    '<div class="bars">' + bar('Infra', Z.infrastructure, '#4dabf7') + bar('Trust', Z.confidence, '#51cf66') + bar('Crime', Z.crime, '#fa5252') + bar('Damage', Z.damage, '#fd7e14') + '</div>';
  var A = sim.activeObjectives();
  $('hudR').innerHTML = A.map(function (i) { return '<div class="inc"><h4>⚠ ' + esc(i.label) + ' · ' + esc(i.zone) + (i.phase !== 'active' ? ' · ' + esc(i.phase) : '') + ' · ' + i.left + 's</h4><div class="cause">' + esc(i.cause) + '</div>' +
    i.objectives.map(function (o) { return '<div class="ob ' + o.state + '">' + (o.state === 'done' ? '✔' : o.state === 'failed' ? '✖' : '☐') + ' ' + esc(o.label) + (o.by ? ' · ' + esc(o.by === 'mella' ? 'Mella' : (sim.sdef(o.by) || { codename: o.by }).codename) : '') + '</div>'; }).join('') +
    (i.heroes.length ? '<div class="heroes">Heroes: ' + esc(i.heroes.join(' · ')) + '</div>' : '<div class="heroes">No heroes responding yet</div>') + '</div>'; }).join('');
  if (feedDirty) { feedDirty = false; $('feed').innerHTML = S.feed.slice(-4).map(function (f) { return '<div class="' + f.kind + '">' + (f.kind === 'history' ? '' : esc(f.at) + ' · ') + esc(f.text) + '</div>'; }).join(''); }
}
function menuItems() { return Array.prototype.slice.call(document.querySelectorAll(ui.menu ? '#menuCard .mb' : '#histCard .mb')); }
function openMenu(on) { ui.menu = on; ui.hist = false; $('menu').classList.toggle('on', on); $('hist').classList.remove('on'); if (on) renderMenu(); ui.focus = 0; focusItem(); count(on ? 'menu_open' : 'menu_close'); }
function openHist(on) { ui.hist = on; ui.menu = false; $('hist').classList.toggle('on', on); $('menu').classList.remove('on'); if (on) renderHist(); ui.focus = 0; focusItem(); count(on ? 'hist_open' : 'hist_close'); }
function focusItem() { var it = menuItems(); it.forEach(function (b, i) { b.classList.toggle('focus', i === ui.focus && usingPad); }); }
function renderMenu() {
  var V = C.villains, M = S.director.mode;
  var DV = S.divider || {}, RP = S.rep || {}, DS = sim.dividerStatus();
  $('menuCard').innerHTML = '<h2>Y.O.U.R. City · Living District · menu</h2><div class="small">The main Y.O.U.R. city (owner t88s472) · CCE 2.0 · PROPOSAL_HOLD · nothing here is published. Times are in-game.</div>' +
    '<h3>Event director</h3><div class="btns">' + Object.keys(C.director.modes).map(function (k) { var m = C.director.modes[k]; return '<button class="mb' + (k === M ? ' sel' : '') + '" data-mode="' + k + '">' + m.label + '<br><span class="small">minor ' + m.minorMin.join('–') + ' min · major ' + m.majorMin.join('–') + ' min · patrols ' + m.patrols.join('–') + ' · ' + Math.round(m.intensity * 100) + '%</span><span class="tag">' + m.tag + '</span></button>'; }).join('') + '</div>' +
    '<div class="small">All modes keep villain plans, civilian life and city consequences running; the setting only changes how often disruptions reach you (owner spec §4).</div>' +
    '<h3>Game</h3><div class="btns"><button class="mb" data-act="resume">Resume</button><button class="mb" data-act="save">Save now</button><button class="mb" data-act="hist">City history</button><button class="mb" data-act="morrow">Travel to Morrow City</button><button class="mb" data-act="newcity">New city (new seed)</button><a class="mb" href="index.html?valence=1" style="text-decoration:none" data-act="back" id="valenceLink">Play the Valence day</a></div>' +
    '<div class="small" id="saveMsg">' + (L.lastSave ? 'Last save: ' + L.lastSave.why + ' · ' + L.lastSave.bytes + ' bytes' : 'Autosaves every 20 s and after every incident.') + '</div>' +
    '<h3>Controls</h3><table class="v"><tr><td>Move</td><td>WASD / arrows · left stick / D-pad · touch stick</td></tr><tr><td>Hit · Blast · Dash</td><td>J · L · K &nbsp;|&nbsp; X · B · RB &nbsp;|&nbsp; HIT · BLAST · DASH</td></tr><tr><td>Jump / ollie</td><td>Space · A · JUMP (in the air on the board: Hit / Blast = tricks; land on a rail to grind)</td></tr><tr><td>Talk / act</td><td>E · Y · TALK/ACT (talk, heal, revive heroes, capture cores, open the truck, recover loot, ask Veyru to stay)</td></tr><tr><td>Calm</td><td>C · LB · CALM (eases nearby civilians)</td></tr><tr><td>Skate · Car</td><td>Q · LT · SKATE &nbsp;|&nbsp; F · RT · CAR (near your teal car at Riverside)</td></tr><tr><td>Menu · History</td><td>Esc/P · Start &nbsp;|&nbsp; H · Back/Select</td></tr></table>' +
    '<h3>The six villains (proposed original characters, owner spec t83u)</h3><table class="v">' + Object.keys(V).map(function (k) { return '<tr><td><b>' + V[k].name + '</b><br><span class="small">' + V[k].title + '</span></td><td>' + V[k].slice + '</td></tr>'; }).join('') + '</table>' +
    '<h3>Public opinion (city confidence ' + Math.round(DS.confidence) + '%)</h3><table class="v">' + Object.keys(RP).map(function (k) { return '<tr><td>' + (k === 'mella' ? 'Mella' : sim.sdef(k).codename) + '</td><td>' + Math.round(RP[k]) + ' / 100' + (DV.rival && DV.rival.id === k ? ' · recruited by ' + DV.rival.name : '') + '</td></tr>'; }).join('') + '</table>' +
    '<div class="small">The Divider: ' + (DS.dormant ? 'lying low after being exposed' : DS.planned ? 'planning something' : 'watching') + ' · exposure ' + Math.round(DV.exposure || 0) + '% · forgery skill ' + (DV.mods ? DV.mods.forgery.toFixed(2) : '–') + '. Look for EVIDENCE (E to examine), talk to or CALM feuding heroes.</div>' +
    '<h3>This city right now</h3><div class="small">Iteron generation ' + S.iteron.gen + ' (melee guard ' + Math.round(S.iteron.mods.meleeGuard * 100) + '%, blast dodge ' + Math.round(S.iteron.mods.blastDodge * 100) + '%) · lab ' + (S.labRevealed ? 'REVEALED under the Old Foundry' : 'unknown') + ' · prototype cores ' + S.research + ' · discoveries ' + Object.keys(S.discovered).length + '/' + C.discoveries.length + ' · skate best ' + S.skate.best + ' · mural ' + Math.round(S.mural) + '%</div>' +
    '<div class="small">Placeholders: the five heroes and every vehicle are drawn shapes (no art yet); robots reuse METAL machine sprites; Veyru uses the temporary 64 px frames and the KAW Living Brain v0.1 with DEFAULT rules (ask to leave home each time; a no means come back home to ask again; no hunger/thirst in the city). Veyru lives at Riverside A.</div>';
  Array.prototype.forEach.call(document.querySelectorAll('#menuCard [data-mode]'), function (b) { b.onclick = function () { sim.setMode(b.getAttribute('data-mode')); save('mode'); renderMenu(); }; });
  Array.prototype.forEach.call(document.querySelectorAll('#menuCard [data-act]'), function (b) { b.onclick = function (e) { var a = b.getAttribute('data-act');
    if (a === 'resume') openMenu(false); else if (a === 'save') { save('manual'); renderMenu(); } else if (a === 'hist') openHist(true); else if (a === 'morrow') { openMenu(false); openMorrow('hero'); }
    else if (a === 'newcity') { if (confirm('Start a new city? The current city save is replaced in this browser (the hero profile and Passport are kept).')) { localStorage.removeItem(C.saveKey); location.search = '?new=1'; } }
    else if (a === 'back') { save('leave'); } }; });
}
function renderHist() {
  var H2 = S.history.slice().reverse().filter(function (h) { return ui.histAll || (h.type !== 'scout_sighting'); });
  $('histCard').innerHTML = '<h2>City history</h2><div class="small">Everything that happened in the district, whether or not Mella was there. ' + S.history.length + ' entries.</div><div class="btns" style="margin:6px 0"><button class="mb" data-h="close">Close</button><button class="mb" data-h="all">' + (ui.histAll ? 'Hide' : 'Show') + ' quiet scout sightings</button></div>' +
    (H2.length ? H2.slice(0, 120).map(function (h) { return '<div class="hist ' + h.outcome + '">' + esc(h.text) + (h.cause ? '<div class="small">Cause: ' + esc(h.cause) + '</div>' : '') + (h.consequences && h.consequences.length ? '<div class="small">Consequences: ' + esc(h.consequences.join(' · ')) + '</div>' : '') + '</div>'; }).join('') : '<div class="small">Nothing yet — it is an ordinary day. For now.</div>');
  Array.prototype.forEach.call(document.querySelectorAll('#histCard [data-h]'), function (b) { b.onclick = function () { if (b.getAttribute('data-h') === 'close') openHist(false); else { ui.histAll = !ui.histAll; renderHist(); } }; });
}
function menuNav(inp) { var it = menuItems(), P = inp.pressed; if (P.menu && ui.menu) return openMenu(false); if ((P.hist || P.back) && ui.hist) return openHist(false); if (P.back && ui.menu) return openMenu(false);
  if (P.down || P.right) { ui.focus = (ui.focus + 1) % it.length; focusItem(); } if (P.up || P.left) { ui.focus = (ui.focus - 1 + it.length) % it.length; focusItem(); }
  if ((P.confirm || P.jump) && it[ui.focus]) it[ui.focus].click(); }

/* ---------------------------------------------------------------- main loop */
var last = 0, timeScale = +(Q.get('ts') || 1), paused = false;
function frame(now) {
  var dt = last ? Math.min(.1, (now - last) / 1000) : 0; last = now;
  try {
    var inp = readInput();
    if (ui.menu || ui.hist) menuNav(inp);
    else { if (inp.pressed.menu) openMenu(true); else if (inp.pressed.hist) openHist(true); }
    if (!(ui.menu || ui.hist) && !paused) { heroStep(dt, inp); shotsStep(dt); veyruStep(dt); sim.tick(dt, timeScale); }
    fx.pops.forEach(function (o) { o.t -= dt; }); fx.pops = fx.pops.filter(function (o) { return o.t > 0; }); flash = Math.max(0, flash - dt);
    if (hs.talkT <= 0) $('talk').classList.remove('on');
    draw(); hudT -= dt; if (hudT <= 0) { hudT = .2; hud(); drawMini(); }
    saveT += dt; if (saveT > 20 || pendingSave) { saveT = 0; pendingSave = false; save('auto'); }
  } catch (e) { L.error = String(e && e.stack || e); console.error(e); }
  requestAnimationFrame(frame);
}
function init() {
  cv = $('cv'); cx = cv.getContext('2d'); mini = $('mini'); mx = mini.getContext('2d');
  boot(); NPCV = []; [IMG.npc0, IMG.npc1].forEach(function (im) { if (im) TINTS.forEach(function (d) { NPCV.push(tinted(im, d)); }); });
  prerender(); resize(); addEventListener('resize', resize); setupTouch();
  cam.x = S.player.x * T; cam.y = S.player.y * T;
  $('bMenu').onclick = function () { openMenu(!ui.menu); }; $('bHist').onclick = function () { openHist(!ui.hist); };
  addEventListener('pagehide', function () { save('pagehide'); }); document.addEventListener('visibilitychange', function () { if (document.hidden) save('hidden'); });
  $('boot').style.display = 'none'; L.ready = true; requestAnimationFrame(frame);
}
/* ---------------------------------------------------------------- QA hooks (used by qa/run_v24_qa.js; harmless in play) */
L.qa = {
  advance: function (sec, step) { return sim.advance(sec, step); },
  kaw: { ask: function () { return veyruAsk(); }, step: function (sec) { var acts = {}; for (var t = 0; t < sec; t += .05) { veyruStep(.05); acts[S.game.veyru.brain.activity] = 1; } return Object.keys(acts); }, put: function (x, y) { var k = S.game.veyru; k.x = x; k.y = y; }, home: KHOME, force: function (on) { var b = S.game.veyru.brain; b.accompanied = !!on; b.currentMap = on ? 'DISTRICT' : 'HOME'; } },
  place: function (x, y) { S.player.x = x; S.player.y = y; S.player.mode = 'walk'; var k = S.game.veyru; if (k.brain.accompanied && !k.inCar) { k.x = x - .8; k.y = y + .4; } cam.x = x * T; cam.y = y * T; },
  spawn: function (type, tier) { var i = sim.spawnIncident(type, tier, 'qa'); return i && i.id; },
  div: function () { return { st: sim.dividerStatus(), rep: JSON.parse(JSON.stringify(S.rep || {})), mods: S.divider && S.divider.mods, learn: S.divider && S.divider.learn,
    evidence: S.items.filter(function (i) { return i.kind === 'evidence'; }).map(function (i) { return { x: i.x, y: i.y, inc: i.inc, prog: i.prog }; }),
    incs: S.incidents.filter(function (i) { return i.div; }).map(function (i) { return { id: i.id, type: i.type, x: i.x, y: i.y, div: i.div, objectives: i.objectives }; }),
    feud: S.supers.filter(function (s) { return s.state === 'feud'; }).map(function (s) { return { id: s.id, x: s.x, y: s.y, feud: s.feud }; }) }; },
  morrow: { open: function (lead) { return openMorrow(lead || 'hero'); }, close: function (s) { closeMorrow(s); }, near: function () { return morrowNear(); }, gate: function () { return { x: MORROW.x, y: MORROW.y }; }, state: function () { return { open: !!MORROW.overlay, visits: MORROW.visits, last: MORROW.last, paused: paused }; } },
  setTimeScale: function (k) { timeScale = k; }, pause: function (on) { paused = on; },
  save: function () { return save('qa'); }, menu: openMenu, hist: openHist, hud: hud,
  state: function () { var p = S.player; return { t: +S.t.toFixed(2), clock: sim.clock(), mode: S.director.mode, player: { x: +p.x.toFixed(2), y: +p.y.toFixed(2), hp: p.hp, ko: p.ko, mode: p.mode, dir: p.dir, z: +(p.z || 0).toFixed(2) },
    incidents: sim.activeObjectives(), history: S.history.length, lastHistory: S.history[S.history.length - 1], stats: L.stats, nimbus: L.lastNimbus, buildings: S.buildings, zones: S.zones, skate: S.skate, hs: { air: hs.air, grind: !!hs.grind, comboPts: hs.comboPts },
    robots: S.robots.map(function (r) { return { id: r.id, cls: r.cls, x: +r.x.toFixed(2), y: +r.y.toFixed(2), hp: +r.hp.toFixed(1), st: r.st, inc: r.inc, hostile: r.hostile, riding: !!r.riding, patrol: !!r.patrol }; }),
    civs: S.civs.map(function (c) { return { id: c.id, x: +c.x.toFixed(2), y: +c.y.toFixed(2), action: c.action, inside: c.inside, injured: c.injured, mem: c.mem.length, opinion: c.opinion }; }),
    supers: S.supers.map(function (s) { return { id: s.id, state: s.state, x: +s.x.toFixed(2), y: +s.y.toFixed(2), hp: Math.round(s.hp), obj: s.obj }; }),
    veyru: (function (k) { var b = k.brain; return { action: b.activity, reason: b.reason, mood: KB.mood(b), accompanied: b.accompanied, staying: b.stayUntil != null, lock: !!k.lock, bond: +b.bond.toFixed(1), needs: b.needs, x: +k.x.toFixed(2), y: +k.y.toFixed(2), inCar: !!k.inCar, maxStep: k.maxStep || 0, home: KHOME, valid: KB.valid(b), events: b.events.slice(-6).map(function (e) { return e.type; }) }; }(S.game.veyru)), outbox: S.outbox.length, minSpawnDistPx: Math.round(S.stats.minSpawnDist * T), spawns: S.stats.spawns, saveId: S.saveId, boot: S.game.bootCount, lastTalk: L.lastTalk, touchUI: !!L.touchUI }; }
};
loadAll(function () { try { init(); } catch (e) { L.error = String(e && e.stack || e); console.error(e); $('boot').innerHTML = '<div class="t">Living District failed to start</div><div class="small">' + esc(L.error) + '</div>'; } });
})();
