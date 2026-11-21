/* Y.O.U.R. v2.4 · Veyru on the KAW Living Brain in the Valence day (index.html) · PROPOSAL_HOLD (PUBLISH HOLD)
   Replaces the v2.2 trail-follow + 7-tile teleport snap. Hooks: build_v24.py makes your/v24/your_v22_brain.js from your/v22/your_v22.js with
   five guarded one-line patches (step, enterMap, draw, placeKaw, sheet). Uses your/v24/kaw_brain_adapter.js. DEFAULT rules (owner has not decided):
   D1 ask on every departure from HOME (Veyru's sheet: "Ask Veyru to come out"); coming back HOME ends the outing.
   D2 a refusal = you leave alone; you can ask again only after you leave and come back HOME.
   D3 needs rest/fear/curiosity/social/comfort (hunger/thirst held at 0).  D4 PROPOSED traits.  D5 no teleport snap inside a map.
   Changing maps: Veyru goes with you only if it is with you (brain.shouldEnterMap) and arrives beside you at the door you used (that is travel, not a snap).
   Keys: V = call Veyru (COME) when it is with you. Phone: use Veyru's sheet (tap Veyru). QA hook: YOUR_V22.placeKaw() counts as "Veyru is with you". */
(function () {
  'use strict';
  var K = window.YOUR_KAW_BRAIN, V24K = window.YOUR_V24_KAW = { stats: {}, last: null };
  function count(k) { V24K.stats[k] = (V24K.stats[k] || 0) + 1; }
  function v22() { return window.YOUR_V22; }
  function X() { return v22() && v22().X; }
  function y() { var V = window.YOUR_V20; return V && V.state ? V.state() : null; }
  function brain() { var Y = y(); if (!Y) return null; if (!Y.kawBrain || !Y.kawBrain.schema) { Y.kawBrain = K.create(0x5eed ^ 2026, null); Y.kawBrain.currentMap = 'HOME'; }
    else if (!Y.kawBrain._h) { Y.kawBrain = K.create(0, Y.kawBrain); Y.kawBrain._h = 1; }
    if (Y.kaw && Y.kaw.bond != null) Y.kawBrain.bond = Math.max(0, Math.min(100, Y.kaw.bond)); return Y.kawBrain; }
  function mapId() { var x = X(); return x && x.G.map ? x.G.map.id : null; }
  function walk(px, py) { var x = X(); return x && x.G.map && x.fn.walkable()(x.G.map, Math.floor(px), Math.floor(py)); }
  V24K.brain = brain;
  V24K.hidden = function () { var b = brain(); if (!b) return false; return mapId() !== 'HOME' && !b.accompanied; };
  V24K.joined = function (why) { var b = brain(); if (!b) return; b.accompanied = true; b.currentMap = mapId() === 'HOME' ? 'HOME' : 'AWAY'; b.stayUntil = null; count('joined_' + why); };
  V24K.enterMap = function (id) {   // return true = handled (do not run the v2.2 placeKaw snap)
    var b = brain(), k = v22() && v22().kaw; if (!b || !k) return false; var from = V24K.lastMap; V24K.lastMap = id;
    if (id === 'HOME') { V24K.lock = false; if (b.accompanied && from && from !== 'HOME') { b.accompanied = false; b.activity = 'home'; b.reason = 'Back home'; K.B.emit(b, 'RETURNED_HOME', {}); say('HOME'); }
      b.currentMap = 'HOME'; if (!b.den) { v22().placeKawRaw(); b.den = { x: k.x, y: k.y }; } else if (from && from !== 'HOME' && V24K.wasWith) { v22().placeKawRaw(); } else { k.x = b.den.x; k.y = b.den.y; } V24K.wasWith = false; return true; }
    var goes = K.B.shouldEnterMap(b, from === 'HOME' ? 'HOME' : (from || 'HOME'), id);
    if (goes && b.accompanied) { v22().placeKawRaw(); b.currentMap = 'AWAY'; V24K.wasWith = true; count('travel_with'); } else { k.x = -999; k.y = -999; V24K.wasWith = false; count('left_home_alone'); }
    return true; };
  function say(code, extra) { var b = brain(); V24K.last = { code: code, mood: K.mood(b), accompanied: b.accompanied, text: K.line(code) + (extra ? ' ' + extra : '') }; count(code.toLowerCase());
    try { X().fn.toast()('Veyru: ' + V24K.last.text, code.indexOf('DECLINED') >= 0 || code === 'LOCKED' ? '' : 'gold'); } catch (e) {} }
  function ctx() { var x = X(), k = v22().kaw, b = brain(); return { mapId: mapId() === 'HOME' ? 'HOME' : 'AWAY', position: { x: k.x, y: k.y }, player: { x: x.G.px, y: x.G.py }, home: b.den,
    hazard: threat().h, threat: threat().p, cover: b.den || { x: x.G.px, y: x.G.py }, inHome: mapId() === 'HOME' && !b.accompanied, distance: Math.hypot(k.x - x.G.px, k.y - x.G.py), running: x.G.ride && x.G.ride !== 'walk' }; }
  function threat() { var v23 = window.YOUR_V23, k = v22().kaw, best = 99, p = null; try { ((v23 && v23.foes) || []).forEach(function (m) { if (m.st === 'down' || m.st === 'gone') return; var d = Math.hypot(m.x - k.x, m.y - k.y); if (d < best) { best = d; p = { x: m.x, y: m.y }; } }); } catch (e) {} return { h: K.hazard(best), p: p }; }
  V24K.ask = function (cmd) { var b = brain(); if (!b) return null; var c = ctx(), r;
    if (cmd === 'LEAVE_HOUSE') { if (mapId() !== 'HOME') { say('NOT_AT_HOME'); return { code: 'NOT_AT_HOME' }; } if (b.accompanied) return { code: 'ALREADY_WITH_YOU' }; if (V24K.lock) { say('LOCKED'); return { code: 'LOCKED' }; }
      r = K.ask(b, 'LEAVE_HOUSE', Object.assign(c, { exitingHome: true })); if (!r.accepted) V24K.lock = true; say(r.code, '(' + Math.round(r.willingness * 100) + '% willing)'); return r; }
    if (!b.accompanied && mapId() !== 'HOME') { say('NOT_AT_HOME'); return { code: 'NOT_AT_HOME' }; }
    r = K.ask(b, cmd, Object.assign(c, { duration: 45 })); say(r.code, r.willingness != null && cmd === 'COME' ? '(' + Math.round(r.willingness * 100) + '% willing)' : ''); return r; };
  V24K.sheet = function ($) { var acts = document.querySelector('.acts'); if (!acts || document.getElementById('v24Ask')) return; var b = brain(); if (!b) return;
    var home = mapId() === 'HOME', html = '<div class="sh-sub" id="v24KawInfo">Living Brain (DEFAULT rules) · ' + (b.accompanied ? 'with you' : 'at home') + ' · mood ' + K.mood(b) + ' · doing: ' + b.activity + ' (' + b.reason + ')</div>';
    var btns = home && !b.accompanied ? [['LEAVE_HOUSE', V24K.lock ? 'Veyru said no — leave and come back to ask again' : 'Ask Veyru to come out with you']] : b.accompanied ? [[b.stayUntil != null ? 'AT_EASE' : 'STAY', b.stayUntil != null ? 'At ease (do your own thing)' : 'Ask Veyru to stay here'], ['COME', 'Ask Veyru to come to you (V)']] : [];
    acts.insertAdjacentHTML('beforebegin', html); btns.forEach(function (bt, i) { acts.insertAdjacentHTML('afterbegin', '<button type="button" class="btn" id="' + (i ? 'v24Ask' + i : 'v24Ask') + '" data-cmd="' + bt[0] + '">' + bt[1] + '</button>'); });
    Array.prototype.forEach.call(document.querySelectorAll('[data-cmd]'), function (el) { el.onclick = function () { var r = V24K.ask(el.getAttribute('data-cmd')); el.textContent = V24K.last ? V24K.last.text : String(r && r.code); }; }); };
  addEventListener('keydown', function (e) { if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName) || e.repeat) return; if ((e.key || '').toLowerCase() === 'v' && brain() && brain().accompanied) V24K.ask('COME'); });
  var thinkT = 0;
  V24K.step = function (dt) {   // true = handled (the v2.2 trail follow and its 7-tile snap never run)
    var x = X(), k = v22() && v22().kaw, b = brain(); if (!x || !k || !b || !x.G.map) return false; if (!V24K.lastMap) V24K.lastMap = mapId();
    if (V24K.hidden()) { k.x = -999; k.y = -999; k.moving = false; return true; }
    if (k.x < -100) { v22().placeKawRaw(); }
    if (x.fn.outdoors()() && x.G.ride === 'car') { k.moving = false; if (Math.hypot(k.x - x.G.px, k.y - x.G.py) < 3) { k.x = x.G.px; k.y = x.G.py; } return true; }
    thinkT -= dt; if (thinkT <= 0) { var c = ctx(); V24K.ctx = c; K.think(b, c, K.DEFAULTS.thinkSec - thinkT); thinkT = K.DEFAULTS.thinkSec; count('think_' + b.activity); }
    var c2 = V24K.ctx || ctx(), g = K.goal(b, { pos: { x: k.x, y: k.y }, player: c2.player, home: b.den, threat: c2.threat, cover: c2.cover }); k.moving = false; if (!g) return true;
    var dx = g.x - k.x, dy = g.y - k.y, d = Math.hypot(dx, dy); if (d <= g.stop) return true; var st = Math.min(d - g.stop * .5, g.speed * dt), nx = k.x + dx / d * st, ny = k.y + dy / d * st, ox = k.x, oy = k.y;
    if (walk(nx, k.y)) k.x = nx; if (walk(k.x, ny)) k.y = ny; k.moving = Math.hypot(k.x - ox, k.y - oy) > 1e-4; if (!k.moving && b.activity === 'explore') b.wander = null;
    V24K.maxStep = Math.max(V24K.maxStep || 0, Math.hypot(k.x - ox, k.y - oy)); k.ph += dt * (g.speed > 6 ? 13 : 9);
    if (Math.abs(dx) > Math.abs(dy) * .35) { k.face = dx < 0 ? 'left' : 'right'; k.dir = k.face; } else k.dir = dy < 0 ? 'up' : 'down'; count('step_' + b.activity); return true; };
}());
