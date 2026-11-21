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
  var keys = Object.keys(SRC), left = keys.length + 1;
  function one() { if (--left === 0) done(); }
  keys.forEach(function (k) { var im = new Image(); im.onload = function () { IMG[k] = im; one(); }; im.onerror = function () { L.missing = (L.missing || []).concat([SRC[k]]); one(); }; im.src = SRC[k]; });
  fetch('your/assets/villains/metal_machines/frames.json').then(function (r) { return r.json(); }).then(function (j) { MFR = j; one(); }).catch(function () { MFR = null; one(); });
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
