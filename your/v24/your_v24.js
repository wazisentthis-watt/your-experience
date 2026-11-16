/* Y.O.U.R. v2.4 · PROPOSAL / PUBLISH HOLD — the KAW Living Brain drives Veyru.
 * Loads after v2.3. Uses three guarded hooks in your_v22.js (V22.brainStep / brainPlace / brainMap).
 * If this file is removed, the hooks are skipped and v2.2 Veyru behaves as before.
 * Module: wir_kaw_living_brain.js (unchanged copy of KAW_LIVING_BRAIN_v0.1). Decisions: your/v24/README.md (PROPOSED).
 */
(function () {
  'use strict';
  var V22 = window.YOUR_V22, B = window.WIRKAWLivingBrain;
  if (!V22 || !B) return;

  var KEY = 'wir-kaw-brain-v24', HOME = 'HOME';
  var CFG = {
    speed: 2.6,            // tiles per second, walking (PROPOSED)
    sprint: 3.6,           // when far behind (PROPOSED)
    gap: 1.25,             // stop distance from the hero (v2.2 follow gap)
    refuseCooldown: 20,    // seconds before re-asking after a refusal (owner decision 2)
    safeBond: 30,          // at or above this, a refusal can happen; below it, never (owner decision 2)
    saveEvery: 2           // seconds of brain clock between saves
  };

  function load() { try { var raw = JSON.parse(localStorage.getItem(KEY) || 'null'); return raw ? B.hydrate(raw) : null; } catch (e) { return null; } }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} }

  var state = load() || B.makeState({ name: 'Veyru', bond: 20 });
  state.cooldownUntil = state.cooldownUntil || 0;
  var lastSave = 0;
  var kawRef = null;

  function bondNow() { try { var k = V22.kawState && V22.kawState(); if (k && typeof k.bond === 'number') return k.bond; } catch (e) {} return state.bond; }
  function syncBond() { var b = bondNow(); if (b !== state.bond) state.bond = Math.max(0, Math.min(100, b)); }

  function ctxFrom(env) {
    var mid = env.map && env.map.id;
    if (mid) state.currentMap = mid;
    return {
      position: { x: env.kaw.x, y: env.kaw.y },
      player: { x: env.px, y: env.py },
      inHome: mid === HOME,
      mapId: mid || state.currentMap,
      walk: env.walk,
      hazard: 0,
      distance: Math.hypot(env.kaw.x - env.px, env.kaw.y - env.py),
      trust: state.bond
    };
  }

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

  function applyOffMap(env) {
    // Veyru stays home unless accompanied. Off-map means not drawn and not moved.
    var mid = env.map && env.map.id;
    env.kaw.off = !(state.accompanied || mid === HOME);
  }

  /* ---- hooks called by your_v22.js ---- */
  function brainPlace(env) {
    kawRef = env.kaw; syncBond();
    var mid = env.map && env.map.id;
    if (mid) state.currentMap = mid;
    if (state.accompanied) beside(env);
    else if (state.currentMap === HOME) { if (!placeAtHome(env)) beside(env); }
    applyOffMap(env);
  }

  function brainMap(id, env) {
    kawRef = env.kaw; syncBond();
    state.currentMap = id;
    if (state.accompanied) beside(env);
    else if (id === HOME) { if (!placeAtHome(env)) beside(env); }
    applyOffMap(env);
    env.kaw.trail = [];
  }

  function brainStep(dt, env) {
    kawRef = env.kaw; syncBond();
    applyOffMap(env);
    var c = ctxFrom(env);
    var res = B.tick(state, c, Math.min(dt, 0.25));
    if (env.kaw.off) { env.kaw.moving = false; maybeSave(); return; }
    var k = env.kaw, act = state.activity;
    var still = act === 'stay' || act === 'rest' || act === 'home' || act === 'hide';
    var dest = state.destination;
    k.moving = false;
    if (!still && dest) {
      var dx = dest.x - k.x, dy = dest.y - k.y, d = Math.hypot(dx, dy);
      var stopAt = (act === 'follow' || act === 'come') ? CFG.gap : 0.3;
      if (d > stopAt) {
        var sp = (d > 6 ? CFG.sprint : CFG.speed) * dt;
        var nx = k.x + dx / d * sp, ny = k.y + dy / d * sp;
        var moved = false;
        if (env.walk(nx, ny)) { k.x = nx; k.y = ny; moved = true; }
        else if (env.walk(nx, k.y)) { k.x = nx; moved = true; }
        else if (env.walk(k.x, ny)) { k.y = ny; moved = true; }
        if (moved) {
          k.moving = true; k.ph = (k.ph || 0) + dt * 11;
          k.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
          if (k.dir === 'left' || k.dir === 'right') k.face = k.dir;
        }
      }
    }
    if (!res || !res.ok) { /* keep the brain state; needs still integrate */ }
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
      // Owner decision 2: below the safe bond, Veyru never refuses. Accept and log it.
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
    var c = ctxFrom(env);
    var atHome = (env.map && env.map.id === HOME) || state.currentMap === HOME;
    var r;
    if (!state.accompanied && atHome) { r = refuseAware('LEAVE_HOUSE', c); toast(r.accepted ? 'Veyru comes out with you today.' : 'Veyru stays home for now.'); }
    else if (state.accompanied) { r = refuseAware('COME', c); toast(r.accepted ? 'Veyru is coming to you.' : 'Veyru did not come this time.'); }
    else { toast('Veyru is at home. Come back to the house to ask.'); }
    applyOffMap(env);
    save();
  }

  function stayToggle(env) {
    if (!env || !env.kaw) return;
    kawRef = env.kaw; syncBond();
    if (state.clock < state.cooldownUntil) { toast('Veyru needs a moment. Try again shortly.'); return; }
    var c = ctxFrom(env);
    var r;
    if (state.stayUntil != null) { r = B.command(state, 'AT_EASE', c); toast('Veyru is free to roam.'); }
    else if (state.accompanied) { r = refuseAware('STAY', c); toast(r.accepted ? 'Veyru stays here for a while.' : 'Veyru keeps going.'); }
    else { toast('Veyru is already at home.'); }
    save();
  }

  /* ---- keys: H = call Veyru, Z = stay / at ease (Q is jump in v2.2, so it is not used) ---- */
  function envGetter() { return V22.brainEnv ? V22.brainEnv() : null; }
  window.addEventListener('keydown', function (e) {
    if (e.repeat) return;
    var t = e.target && e.target.tagName;
    if (t === 'INPUT' || t === 'TEXTAREA' || t === 'SELECT') return;
    if (e.code === 'KeyH') call(envGetter());
    if (e.code === 'KeyZ') stayToggle(envGetter());
  });

  V22.brainStep = brainStep;
  V22.brainPlace = brainPlace;
  V22.brainMap = brainMap;
  window.YOUR_V24 = { state: function () { return state; }, CFG: CFG, call: call, stayToggle: stayToggle, save: save };
})();
