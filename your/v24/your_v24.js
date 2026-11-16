/* Y.O.U.R. v2.4 · PROPOSAL / PUBLISH HOLD — the KAW Living Brain drives Veyru.
 * Loads after v2.3. Uses guarded hooks in your_v22.js (V22.brainStep / brainPlace / brainMap / brainEnv).
 * If this file is removed, the hooks are skipped and v2.2 Veyru behaves as before.
 * Module: wir_kaw_living_brain.js (unchanged copy of KAW_LIVING_BRAIN_v0.1). Decisions: your/v24/README.md.
 *
 * Relay 002 fixes:
 *  1. Placement is split: a real map change places Veyru beside the hero; ordinary frames never teleport.
 *  2. explore roams to reachable points; socialize approaches the hero; forage and investigate have no
 *     targets yet, so they hold position and are marked incomplete.
 *  3. Movement uses walk checks with axis-slide fallback; mobile gets on-screen VEYRU / STAY buttons.
 *  4. The brain store is keyed to the hero and KAW ids. A mismatch resets the brain only, never the hero profile.
 *  5. hazard comes from YOUR_V23 foes and boss within range.
 */
(function () {
  'use strict';
  var V22 = window.YOUR_V22, B = window.WIRKAWLivingBrain;
  if (!V22 || !B) return;

  var KEY = 'wir-kaw-brain-v24', SAVE_V = 2, HOME = 'HOME';
  var KC = (window.YOUR_V22_CONFIG && window.YOUR_V22_CONFIG.kaw) || { id: 'kaw-veyru-001' };
  var CFG = {
    speed: 2.6, sprint: 3.6, gap: 1.25,        // tiles/s, stop distance from the hero (PROPOSED)
    refuseCooldown: 20, safeBond: 30,           // owner decision 2
    saveEvery: 2, roamRadius: 6, roamPause: [2, 5],
    hazardNear: 4, hazardFar: 8                 // tiles, from v2.3 foes and boss (PROPOSED)
  };

  function heroId() { try { var h = window.WIR_HERO && window.WIR_HERO.get(); return (h && h.id) || null; } catch (e) { return null; } }
  var HERO = heroId();

  function load() {
    try {
      var raw = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (!raw || raw.v !== SAVE_V || raw.hero !== HERO || raw.kaw !== KC.id) return null; // mismatch: brain resets, hero profile untouched
      return B.hydrate(raw.state);
    } catch (e) { return null; }
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify({ v: SAVE_V, hero: HERO, kaw: KC.id, state: state })); } catch (e) {} }

  var state = load() || B.makeState({ name: 'Veyru', bond: 20 });
  state.cooldownUntil = state.cooldownUntil || 0;
  var lastSave = 0, lastMap = null, kawRef = null;

  function bondNow() { try { var k = V22.kawState && V22.kawState(); if (k && typeof k.bond === 'number') return k.bond; } catch (e) {} return state.bond; }
  function syncBond() { var b = bondNow(); if (b !== state.bond) state.bond = Math.max(0, Math.min(100, b)); }
  function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
  function markIncomplete(name, why) { state.incomplete = state.incomplete || {}; state.incomplete[name] = why; }

  /* ---- perception: hazard from v2.3 foes and boss (fix 5) ---- */
  function hazardNear(env) {
    var best = Infinity, V23 = window.YOUR_V23, me = { x: env.kaw.x, y: env.kaw.y };
    var foes = (V23 && V23.foes) || [];
    for (var i = 0; i < foes.length; i++) { var m = foes[i]; if (m && m.st !== 'down') best = Math.min(best, dist(m, me)); }
    var bs = V23 && V23.boss; if (bs && !bs.done) best = Math.min(best, dist(bs, me));
    if (best <= CFG.hazardNear) return 80;
    if (best <= CFG.hazardFar) return 35;
    return 0;
  }

  function ctxFrom(env) {
    var mid = env.map && env.map.id;
    if (mid) state.currentMap = mid;
    var h = hazardNear(env);
    state.lastHazard = h;
    return {
      position: { x: env.kaw.x, y: env.kaw.y },
      player: { x: env.px, y: env.py },
      inHome: mid === HOME,
      mapId: mid || state.currentMap,
      walk: env.walk,
      hazard: h,
      distance: Math.hypot(env.kaw.x - env.px, env.kaw.y - env.py),
      trust: state.bond
    };
  }

  /* ---- placement (fix 1) ---- */
  function beside(env) {
    var opts = [[-1, 0], [1, 0], [0, 1], [0, -1], [-1, 1], [1, 1]], k = env.kaw;
    for (var i = 0; i < opts.length; i++) {
      var x = Math.floor(env.px) + opts[i][0] + .5, y = Math.floor(env.py) + opts[i][1] + .5;
      if (env.walk(x, y)) { k.x = x; k.y = y; return; }
    }
    k.x = env.px - .6; k.y = env.py;
  }
  function placeAtHome(env) {
    var h = state.places && state.places.home;
    if (h && h.remembered && env.walk(h.x, h.y)) { env.kaw.x = h.x; env.kaw.y = h.y; return true; }
    return false;
  }
  function applyOffMap(env) { env.kaw.off = !(state.accompanied || (env.map && env.map.id) === HOME); }

  // Transition placement runs only when the map actually changes.
  function transitionPlace(env, mid) {
    lastMap = mid; if (mid) state.currentMap = mid;
    if (state.accompanied) beside(env);
    else if (mid === HOME && !placeAtHome(env)) beside(env);
    env.kaw.trail = []; state.target = null; state.roamWait = null;
    applyOffMap(env);
  }

  /* ---- targets and movement (fixes 2, 3) ---- */
  // The module's decide() rewrites state.destination on every tick, so movement uses its own target.
  function roamPoint(env) {
    var k = env.kaw;
    // Accompanied: roam around the hero so the companion stays in range. Otherwise roam around Veyru.
    var cx = state.accompanied ? env.px : k.x, cy = state.accompanied ? env.py : k.y;
    for (var t = 0; t < 20; t++) {
      var a = Math.random() * Math.PI * 2, r = 1 + Math.random() * (CFG.roamRadius - 1);
      var x = Math.floor(cx + Math.cos(a) * r) + .5, y = Math.floor(cy + Math.sin(a) * r) + .5;
      if (env.walk(x, y)) return { x: x, y: y };
    }
    return { x: k.x, y: k.y };
  }

  function chooseTarget(env, dt) {
    var k = env.kaw, here = { x: k.x, y: k.y };
    // No world object exists yet for these needs, so the brain's pick would stall forever.
    // Fall back to roaming (fix 2) and record why, so the gap stays visible.
    if (state.activity === 'forage') { markIncomplete('forage', 'no food objects in the world yet; roaming instead'); state.activity = 'explore'; }
    if (state.activity === 'investigate') { markIncomplete('investigate', 'no investigable objects in the world yet; roaming instead'); state.activity = 'explore'; }
    var act = state.activity;
    if (act === 'follow' || act === 'come' || act === 'socialize') { state.target = { x: env.px, y: env.py }; return; }
    if (act === 'explore') {
      if (state.target && dist(k, state.target) > 0.3) return;               // still walking to the roam point
      if (state.roamWait == null) state.roamWait = CFG.roamPause[0] + Math.random() * (CFG.roamPause[1] - CFG.roamPause[0]);
      state.roamWait -= dt;
      if (state.roamWait > 0) { state.target = here; return; }              // pause at arrival
      state.roamWait = null; state.target = roamPoint(env); return;
    }
    if (act === 'stay' || act === 'rest' || act === 'hide' || act === 'guard') { state.target = here; return; }
    state.target = state.destination ? { x: state.destination.x, y: state.destination.y } : here;   // other activities: the module's own target
  }

  function moveToward(env, dt) {
    var k = env.kaw, act = state.activity, dest = state.target;
    k.moving = false;
    if (!dest) return;
    var stopAt = (act === 'follow' || act === 'come' || act === 'socialize') ? CFG.gap : 0.3;
    var dx = dest.x - k.x, dy = dest.y - k.y, d = Math.hypot(dx, dy);
    if (d <= stopAt) return;
    var sp = (d > 6 ? CFG.sprint : CFG.speed) * dt;
    var nx = k.x + dx / d * sp, ny = k.y + dy / d * sp, moved = false;
    if (env.walk(nx, ny)) { k.x = nx; k.y = ny; moved = true; }
    else if (env.walk(nx, k.y)) { k.x = nx; moved = true; }
    else if (env.walk(k.x, ny)) { k.y = ny; moved = true; }
    if (moved) {
      k.moving = true; k.ph = (k.ph || 0) + dt * 11;
      k.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
      if (k.dir === 'left' || k.dir === 'right') k.face = k.dir;
    } else {
      state.target = null; state.roamWait = null;                             // blocked: drop this target, choose again
    }
  }

  /* ---- hooks called by your_v22.js ---- */
  function brainPlace(env) {
    kawRef = env.kaw; syncBond();
    var mid = env.map && env.map.id;
    if (mid !== lastMap) { transitionPlace(env, mid); return; }             // real map change only
    applyOffMap(env);                                                        // otherwise keep the autonomous position
  }
  function brainMap(id, env) { kawRef = env.kaw; syncBond(); transitionPlace(env, id); }

  function brainStep(dt, env) {
    kawRef = env.kaw; syncBond();
    var mid = env.map && env.map.id;
    if (mid !== lastMap) transitionPlace(env, mid);
    applyOffMap(env);
    B.tick(state, ctxFrom(env), Math.min(dt, 0.25));
    if (env.kaw.off) { env.kaw.moving = false; maybeSave(); return; }
    chooseTarget(env, dt);
    moveToward(env, dt);
    maybeSave();
  }
  function maybeSave() { if (state.clock - lastSave >= CFG.saveEvery) { lastSave = state.clock; save(); } }

  /* ---- player commands ---- */
  var toastEl = null, toastT = 0;
  function toast(text) {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.id = 'kaw-v24-toast';
      toastEl.style.cssText = 'position:fixed;left:50%;bottom:86px;transform:translateX(-50%);background:rgba(10,12,20,.86);color:#f3ead7;padding:8px 14px;border-radius:6px;font:14px system-ui;z-index:9999;pointer-events:none;opacity:0;transition:opacity .25s';
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = text; toastEl.style.opacity = '1';
    clearTimeout(toastT); toastT = setTimeout(function () { toastEl.style.opacity = '0'; }, 2200);
  }

  function refuseAware(name, c) {
    var r = B.command(state, name, c);
    if (r.accepted) return r;
    if (state.bond < CFG.safeBond) {
      // Owner decision 2: below the safe bond, Veyru never refuses.
      B.emit(state, 'BOND_SAFE_ACCEPT', { command: name, bond: state.bond });
      if (name === 'LEAVE_HOUSE') { state.accompanied = true; state.stayUntil = null; state.activity = 'follow'; state.reason = 'Came out with you'; }
      if (name === 'COME') { state.stayUntil = null; state.activity = 'come'; state.reason = 'Coming to you'; }
      return { ok: true, accepted: true, code: name + '_SAFE' };
    }
    state.cooldownUntil = state.clock + CFG.refuseCooldown;
    return r;
  }

  function call(env) {
    if (!env || !env.kaw) return;
    kawRef = env.kaw; syncBond();
    if (state.clock < state.cooldownUntil) { toast('Veyru needs a moment. Try again shortly.'); return; }
    var c = ctxFrom(env), atHome = (env.map && env.map.id === HOME) || state.currentMap === HOME, r;
    if (!state.accompanied && atHome) { r = refuseAware('LEAVE_HOUSE', c); toast(r.accepted ? 'Veyru comes out with you today.' : 'Veyru stays home for now.'); }
    else if (state.accompanied) { r = refuseAware('COME', c); toast(r.accepted ? 'Veyru is coming to you.' : 'Veyru did not come this time.'); }
    else { toast('Veyru is at home. Come back to the house to ask.'); }
    applyOffMap(env); save();
  }

  function stayToggle(env) {
    if (!env || !env.kaw) return;
    kawRef = env.kaw; syncBond();
    if (state.clock < state.cooldownUntil) { toast('Veyru needs a moment. Try again shortly.'); return; }
    var c = ctxFrom(env), r;
    if (state.stayUntil != null) { B.command(state, 'AT_EASE', c); toast('Veyru is free to roam.'); }
    else if (state.accompanied) { r = refuseAware('STAY', c); toast(r.accepted ? 'Veyru stays here for a while.' : 'Veyru keeps going.'); }
    else { toast('Veyru is already at home.'); }
    save();
  }

  /* ---- keys (desktop) and on-screen buttons (mobile, fix 3) ---- */
  function envGetter() { return V22.brainEnv ? V22.brainEnv() : null; }
  window.addEventListener('keydown', function (e) {
    if (e.repeat) return;
    var t = e.target && e.target.tagName;
    if (t === 'INPUT' || t === 'TEXTAREA' || t === 'SELECT') return;
    if (e.code === 'KeyH') call(envGetter());
    if (e.code === 'KeyZ') stayToggle(envGetter());
  });

  function mountTouch() {
    if (document.getElementById('kawTouch')) return;
    var box = document.createElement('div');
    box.id = 'kawTouch';
    box.style.cssText = 'position:fixed;right:8px;bottom:132px;display:flex;flex-direction:column;gap:6px;z-index:9998';
    [['VEYRU', 'Call Veyru', call], ['STAY', 'Stay or at ease', stayToggle]].forEach(function (def) {
      var b = document.createElement('button');
      b.type = 'button'; b.id = 'kaw-touch-' + def[0].toLowerCase(); b.textContent = def[0]; b.setAttribute('aria-label', def[1]);
      b.style.cssText = 'font:800 11px system-ui;padding:8px 10px;border-radius:10px;border:1px solid rgba(124,240,224,.45);background:rgba(14,12,29,.82);color:#7cf0e0;touch-action:manipulation';
      b.addEventListener('pointerdown', function (e) { e.preventDefault(); def[2](envGetter()); });
      box.appendChild(b);
    });
    document.body.appendChild(box);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mountTouch); else mountTouch();

  V22.brainStep = brainStep;
  V22.brainPlace = brainPlace;
  V22.brainMap = brainMap;
  window.YOUR_V24 = { state: function () { return state; }, CFG: CFG, call: call, stayToggle: stayToggle, save: save, hero: HERO, kaw: KC.id };
})();
