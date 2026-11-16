/* Y.O.U.R. v2.4 · PROPOSAL / PUBLISH HOLD — the KAW Living Brain drives Veyru.
 * Loads after v2.3. Uses guarded hooks in your_v22.js (V22.brainStep / brainPlace / brainMap / brainEnv).
 * If this file is removed, the hooks are skipped and v2.2 Veyru behaves as before.
 * Module: wir_kaw_living_brain.js (unchanged copy of KAW_LIVING_BRAIN_v0.1). Decisions: your/v24/README.md.
 *
 * Relay 003:
 *  1. Reachability: every move goes through a bounded BFS route (findRoute). An unreachable target is
 *     reported as motor 'unreachable' and dropped; nothing walks into a wall toward it.
 *  2. Intent is preserved: state.activity is the brain's own choice and is never rewritten here.
 *     The movement layer reports what it is doing in state.motor ('route', 'search', 'approach', 'hold',
 *     'return', 'unreachable'). forage with no food stays forage while the motor searches.
 *  3. Affordances come from the live map (G.map): water = tile 8 next to walkable ground, rest = the
 *     HOME bed or couch, food = the HOME kitchen (fridge). Nothing new is drawn.
 *  4. The VEYRU / STAY buttons sit on the left, clear of the overlay stick and buttons (checked in a browser).
 *  5. The hero ID is validated on every tick. Until it resolves, Veyru does not tick, save or respond.
 *     A hero change resets the brain only.
 */
(function () {
  'use strict';
  var V22 = window.YOUR_V22, B = window.WIRKAWLivingBrain;
  if (!V22 || !B) return;

  var KEY = 'wir-kaw-brain-v24', SAVE_V = 4, HOME = 'HOME', WATER = 8;
  var KC = (window.YOUR_V22_CONFIG && window.YOUR_V22_CONFIG.kaw) || { id: 'kaw-veyru-001' };
  var CFG = {
    speed: 2.6, sprint: 3.6, gap: 1.25, social: 2.5,   // tiles/s; stop distances (PROPOSED)
    preferred: 6,                                       // owner: preferred social distance, not a leash
    refuseCooldown: 20, safeBond: 30,                   // owner decision 2
    saveEvery: 2, roamRadius: 6, roamPause: [2, 5],
    hazardNear: 4, hazardFar: 8,                        // tiles, from v2.3 foes and boss (PROPOSED)
    navWindow: 20, navBudget: 2000, routeRetry: 2, affRetry: 3, stuckFrames: 90
  };
  var AFF_KIND = { drink: 'water', forage: 'food', rest: 'rest' };
  var AFF_OBJ = { fridge: 'food', bed: 'rest', couch: 'rest' };     // live HOME object ids
  var DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

  /* ---- hero binding (fix 5) ---- */
  function freshState() { var s = B.makeState({ name: 'Veyru', bond: 20 }); s.cooldownUntil = 0; return s; }
  function readHero() {
    try { var h = window.WIR_HERO && window.WIR_HERO.get(); var id = h && h.id; return (typeof id === 'string' && /^[\w-]{3,40}$/.test(id)) ? id : null; }
    catch (e) { return null; }
  }
  // One store, one record per hero (relay 004 item 6): switching heroes keeps each hero's own brain.
  function readAll() {
    try {
      var raw = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (!raw || raw.v !== SAVE_V || raw.kaw !== KC.id || !raw.heroes || typeof raw.heroes !== 'object') return {};
      return raw.heroes;
    } catch (e) { return {}; }
  }
  function loadStore(id) {
    try { var rec = readAll()[id]; return rec && rec.state ? B.hydrate(rec.state) : null; }
    catch (e) { return null; }
  }
  function persist(id, s) {
    try {
      var all = readAll(); all[id] = { state: s, at: s.clock };
      localStorage.setItem(KEY, JSON.stringify({ v: SAVE_V, kaw: KC.id, heroes: all }));
    } catch (e) {}
  }
  var state = freshState(), boundHero = null, lastSave = 0, lastMap = null, kawRef = null;
  // Returns the bound hero id, or null while the profile is not ready. A change of hero resets the brain only.
  function bindHero() {
    var id = readHero();
    if (!id) return null;
    if (id !== boundHero) {
      if (boundHero) persist(boundHero, state);                 // keep the outgoing hero's brain
      state = loadStore(id) || freshState();
      state.cooldownUntil = state.cooldownUntil || 0;
      boundHero = id; lastSave = 0; lastMap = null;
    }
    return id;
  }
  function save() { var id = bindHero(); if (id) persist(id, state); }

  function bondNow() { try { var k = V22.kawState && V22.kawState(); if (k && typeof k.bond === 'number') return k.bond; } catch (e) {} return state.bond; }
  function syncBond() { var b = bondNow(); if (b !== state.bond) state.bond = Math.max(0, Math.min(100, b)); }
  function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
  function markIncomplete(name, why) { state.incomplete = state.incomplete || {}; state.incomplete[name] = why; }
  function clearIncomplete(name) { if (state.incomplete) delete state.incomplete[name]; }
  function setTarget(p, stop, motor) { state.target = { x: p.x, y: p.y }; state.stopAt = stop; state.motor = motor; }

  /* ---- perception: hazard from v2.3 foes and boss ---- */
  function hazardNear(env) {
    var best = Infinity, V23 = window.YOUR_V23, me = { x: env.kaw.x, y: env.kaw.y };
    var foes = (V23 && V23.foes) || [];
    for (var i = 0; i < foes.length; i++) { var m = foes[i]; if (m && m.st !== 'down') best = Math.min(best, dist(m, me)); }
    var bs = V23 && V23.boss; if (bs && !bs.done) best = Math.min(best, dist(bs, me));
    if (best <= CFG.hazardNear) return 80;
    if (best <= CFG.hazardFar) return 35;
    return 0;
  }

  /* ---- affordances from the live map (fix 3) ---- */
  var affCache = {};
  function affordances(env) {
    var m = env.map; if (!m || !m.t || !m.w) return { water: [], food: [], rest: [] };
    if (affCache[m.id]) return affCache[m.id];
    var out = { water: [], food: [], rest: [] }, x, y, i, j, d;
    for (y = 0; y < m.h; y++) for (x = 0; x < m.w; x++) {
      if (m.t[y * m.w + x] !== WATER) continue;
      for (d = 0; d < 4; d++) { var nx = x + DIRS[d][0], ny = y + DIRS[d][1]; if (env.walk(nx + .5, ny + .5)) out.water.push({ x: nx + .5, y: ny + .5 }); }
    }
    (m.objs || []).forEach(function (o) {
      var kind = AFF_OBJ[o.id]; if (!kind) return;
      for (j = o.y - 1; j <= o.y + o.h; j++) for (i = o.x - 1; i <= o.x + o.w; i++) {
        if (i >= o.x && i < o.x + o.w && j >= o.y && j < o.y + o.h) continue;      // ring around the object only
        if (env.walk(i + .5, j + .5)) out[kind].push({ x: i + .5, y: j + .5 });
      }
    });
    affCache[m.id] = out;
    return out;
  }
  function affordanceSpot(env, kind) {
    var list = affordances(env)[kind] || [], k = env.kaw;
    if (!list.length) return null;
    var sorted = list.slice().sort(function (a, b) { return dist(k, a) - dist(k, b); });
    for (var i = 0; i < sorted.length && i < 6; i++) if (findRoute(env, k, sorted[i]) !== null) return sorted[i];
    return null;
  }
  function nearAffordance(env, kind, r) {
    var list = affordances(env)[kind] || [];
    for (var i = 0; i < list.length; i++) if (dist(env.kaw, list[i]) <= r) return true;
    return false;
  }

  /* ---- reachability (fix 1): bounded BFS over tiles, budgeted ---- */
  function findRoute(env, from, to) {
    var W = CFG.navWindow, sx = Math.floor(from.x), sy = Math.floor(from.y), tx = Math.floor(to.x), ty = Math.floor(to.y);
    if (sx === tx && sy === ty) return [];
    if (Math.abs(tx - sx) > W || Math.abs(ty - sy) > W) return null;
    if (!env.walk(tx + .5, ty + .5) || !env.walk(sx + .5, sy + .5)) return null;
    var start = sx + ',' + sy, goal = tx + ',' + ty, prev = new Map(), q = [[sx, sy]], qi = 0, work = 0;
    prev.set(start, null);
    while (qi < q.length) {
      if (++work > CFG.navBudget) return null;                                 // budget spent: treat as unreachable
      var c = q[qi++], cx = c[0], cy = c[1];
      if (cx === tx && cy === ty) break;
      for (var d = 0; d < 4; d++) {
        var nx = cx + DIRS[d][0], ny = cy + DIRS[d][1], key = nx + ',' + ny;
        if (prev.has(key) || Math.abs(nx - sx) > W || Math.abs(ny - sy) > W) continue;
        if (!env.walk(nx + .5, ny + .5)) continue;
        prev.set(key, cx + ',' + cy); q.push([nx, ny]);
      }
    }
    if (!prev.has(goal)) return null;
    var out = [], k = goal;
    while (k !== start) { var p = k.split(',').map(Number); out.push({ x: p[0] + .5, y: p[1] + .5 }); k = prev.get(k); }
    return out.reverse();
  }
  // Route cache: reuse while the goal tile is the same and the next step is still walkable.
  function routeTo(env, t) {
    var g = { x: Math.floor(t.x), y: Math.floor(t.y) };
    var same = state.routeGoal && state.routeGoal.x === g.x && state.routeGoal.y === g.y;
    if (same && state.route && !(state.route.length && !env.walk(state.route[0].x, state.route[0].y))) return state.route;
    if (same && !state.route && state.routeFailAt && state.clock - state.routeFailAt < CFG.routeRetry) return null;
    var r = findRoute(env, env.kaw, g);
    state.routeGoal = g; state.route = r; state.routeFailAt = r === null ? state.clock : 0;
    return r;
  }

  /* ---- motor layer: moves toward state.target; never changes state.activity ---- */
  function moveAlong(env, dt) {
    var k = env.kaw, t = state.target; k.moving = false;
    if (!t) return;
    var stop = state.stopAt || 0.3, r = null;
    if (dist(k, t) > stop) {
      r = routeTo(env, t);
      if (r === null) {
        state.motor = 'unreachable'; state.target = null; state.roamWait = null;
        state.affCooldown = state.clock + CFG.affRetry; state.routeFails = (state.routeFails || 0) + 1;
        return;
      }
    }
    var wp = (r && r.length) ? r[0] : t, dx = wp.x - k.x, dy = wp.y - k.y, d = Math.hypot(dx, dy);
    if (r && r.length) { if (d <= 0.12) { r.shift(); state.route = r; state.stuck = 0; return; } }
    else if (d <= stop) return;
    var sp = (d > 6 ? CFG.sprint : CFG.speed) * dt;
    var nx = k.x + dx / d * sp, ny = k.y + dy / d * sp, moved = false;
    if (env.walk(nx, ny)) { k.x = nx; k.y = ny; moved = true; }
    else if (env.walk(nx, k.y)) { k.x = nx; moved = true; }
    else if (env.walk(k.x, ny)) { k.y = ny; moved = true; }
    if (moved) {
      state.stuck = 0; k.moving = true; k.ph = (k.ph || 0) + dt * 11;
      k.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
      if (k.dir === 'left' || k.dir === 'right') k.face = k.dir;
    } else {
      state.stuck = (state.stuck || 0) + 1; state.route = null; state.routeGoal = null;   // re-route next frame
      if (state.stuck > CFG.stuckFrames) { state.target = null; state.stuck = 0; state.motor = 'unreachable'; }
    }
  }

  /* ---- intent (the brain's activity) to motor target ---- */
  function roamPoint(env) {
    var k = env.kaw, acc = state.accompanied;
    var cx = acc ? env.px : k.x, cy = acc ? env.py : k.y;
    for (var t = 0; t < 20; t++) {
      var a = Math.random() * Math.PI * 2, r = 1 + Math.random() * (CFG.roamRadius - 1);
      var x = Math.floor(cx + Math.cos(a) * r) + .5, y = Math.floor(cy + Math.sin(a) * r) + .5;
      if (env.walk(x, y)) return { x: x, y: y };
    }
    return { x: k.x, y: k.y };
  }
  function searchStep(env, dt, hero) {
    var k = env.kaw, here = { x: k.x, y: k.y };
    if (state.accompanied && dist(k, hero) > CFG.preferred) { setTarget(hero, CFG.gap + 1, 'return'); return; }
    if (state.target && state.motor === 'search' && dist(k, state.target) > 0.3) return;   // still walking the search route
    if (state.roamWait == null) state.roamWait = CFG.roamPause[0] + Math.random() * (CFG.roamPause[1] - CFG.roamPause[0]);
    state.roamWait -= dt;
    if (state.roamWait > 0) { setTarget(here, 0.3, 'search'); return; }
    state.roamWait = null; setTarget(roamPoint(env), 0.3, 'search');
  }

  function chooseTarget(env, dt) {
    var k = env.kaw, hero = { x: env.px, y: env.py }, here = { x: k.x, y: k.y }, act = state.activity;
    state.intent = act;                                                     // the brain's choice, kept as-is
    if (act !== state.targetKind) { state.target = null; state.targetKind = act; state.roamWait = null; state.affCooldown = 0; }
    // Preferred social distance (owner): within ~6 tiles of the hero Veyru may do anything; beyond that it comes back.
    // Not a leash: a stay command is respected, and needs may still send Veyru farther out while the hero is near.
    if (state.accompanied && state.stayUntil == null && act !== 'follow' && act !== 'come' && act !== 'socialize' && dist(here, hero) > CFG.preferred) {
      setTarget(hero, CFG.gap + 1, 'return'); return;
    }
    if (act === 'follow' || act === 'come') { setTarget(hero, CFG.gap, 'approach'); return; }
    if (act === 'socialize') { setTarget(hero, CFG.social, 'approach'); return; }
    if (act === 'stay' || act === 'hide' || act === 'guard') { setTarget(here, 0.3, 'hold'); return; }
    var kind = AFF_KIND[act];
    if (kind) {
      if (state.target && state.motor === 'route') return;                  // following a route to the spot; motor clears it if unreachable
      if (!(state.affCooldown > state.clock)) {
        var spot = affordanceSpot(env, kind);
        if (spot) { setTarget(spot, 0.3, 'route'); clearIncomplete(act); return; }
        state.affCooldown = state.clock + CFG.affRetry;
        markIncomplete(act, 'no reachable ' + kind + ' spot on this map; searching instead');
      }
      if (act === 'rest') { setTarget(here, 0.3, 'hold'); return; }        // resting in place is still a rest
    }
    if (act === 'investigate') markIncomplete(act, 'no investigable objects in the world yet; searching instead');
    searchStep(env, dt, hero);
  }

  /* ---- ctx for the module ---- */
  function ctxFrom(env) {
    var mid = env.map && env.map.id;
    if (mid) state.currentMap = mid;
    var h = hazardNear(env);
    state.lastHazard = h;
    // Stand-in: standing at the kitchen spot counts as eating. There is no food item in the world yet.
    var hasFood = state.activity === 'forage' && nearAffordance(env, 'food', 1.2);
    return {
      position: { x: env.kaw.x, y: env.kaw.y },
      player: { x: env.px, y: env.py },
      inHome: mid === HOME,
      mapId: mid || state.currentMap,
      walk: env.walk,
      hazard: h,
      hasFood: hasFood,
      distance: Math.hypot(env.kaw.x - env.px, env.kaw.y - env.py),
      trust: state.bond
    };
  }

  /* ---- placement: transitions only ---- */
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
  function transitionPlace(env, mid) {
    lastMap = mid; if (mid) state.currentMap = mid;
    if (state.accompanied) beside(env);
    else if (mid === HOME && !placeAtHome(env)) beside(env);
    env.kaw.trail = []; state.target = null; state.route = null; state.roamWait = null;
    applyOffMap(env);
  }

  /* ---- hooks called by your_v22.js ---- */
  function brainPlace(env) {
    kawRef = env.kaw;
    if (!bindHero()) { env.kaw.off = true; return; }
    syncBond();
    var mid = env.map && env.map.id;
    if (mid !== lastMap) { transitionPlace(env, mid); return; }             // real map change only
    applyOffMap(env);                                                        // otherwise keep the autonomous position
  }
  function brainMap(id, env) {
    kawRef = env.kaw;
    if (!bindHero()) { env.kaw.off = true; return; }
    syncBond(); transitionPlace(env, id);
  }
  function brainStep(dt, env) {
    kawRef = env.kaw;
    if (!bindHero()) { env.kaw.off = true; env.kaw.moving = false; return; } // hero not ready: no tick, no save
    syncBond();
    var mid = env.map && env.map.id;
    if (mid !== lastMap) transitionPlace(env, mid);
    applyOffMap(env);
    var step = Math.min(dt, 0.25), ctx = ctxFrom(env);
    var thBefore = state.needs ? state.needs.thirst : null;
    B.tick(state, ctx, step);
    // The module lowers thirst whenever activity is 'drink', even far from water. Drink counts only at the water spot.
    // Away from water, thirst takes only its natural rise for this step (module rate 0.20/s), so it is not cancelled.
    if (thBefore != null && state.activity === 'drink' && !nearAffordance(env, 'water', 1.2)) {
      state.needs.thirst = Math.max(0, Math.min(100, thBefore + step * 0.20));
    }
    recordOutcome(env, ctx);
    if (env.kaw.off) { env.kaw.moving = false; maybeSave(); return; }
    chooseTarget(env, dt);
    moveAlong(env, dt);
    maybeSave();
  }
  // Outcome (relay 004 item 4): what the intent achieved this step. Kept apart from intent (activity) and motor.
  // satisfied: true only when the need was actually met at the resource; false while still pending; null when no need applies.
  function recordOutcome(env, ctx) {
    var act = state.activity, need = null, satisfied = null, place = null;
    if (act === 'drink') { need = 'thirst'; satisfied = nearAffordance(env, 'water', 1.2); }
    else if (act === 'forage') { need = 'hunger'; satisfied = !!ctx.hasFood; }
    else if (act === 'rest') { need = 'restNeed'; place = nearAffordance(env, 'rest', 1.2) ? 'bed' : 'in place'; satisfied = place === 'bed'; }
    state.outcome = { intent: act, motor: state.motor || null, need: need, satisfied: satisfied, place: place, at: state.clock };
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
    kawRef = env.kaw;
    if (!bindHero()) { toast('Veyru is not ready yet.'); return; }
    syncBond();
    if (state.clock < state.cooldownUntil) { toast('Veyru needs a moment. Try again shortly.'); return; }
    var c = ctxFrom(env), atHome = (env.map && env.map.id === HOME) || state.currentMap === HOME, r;
    if (!state.accompanied && atHome) { r = refuseAware('LEAVE_HOUSE', c); toast(r.accepted ? 'Veyru comes out with you today.' : 'Veyru stays home for now.'); }
    else if (state.accompanied) { r = refuseAware('COME', c); toast(r.accepted ? 'Veyru is coming to you.' : 'Veyru did not come this time.'); }
    else { toast('Veyru is at home. Come back to the house to ask.'); }
    applyOffMap(env); save();
  }
  function stayToggle(env) {
    if (!env || !env.kaw) return;
    kawRef = env.kaw;
    if (!bindHero()) { toast('Veyru is not ready yet.'); return; }
    syncBond();
    if (state.clock < state.cooldownUntil) { toast('Veyru needs a moment. Try again shortly.'); return; }
    var c = ctxFrom(env), r;
    if (state.stayUntil != null) { B.command(state, 'AT_EASE', c); toast('Veyru is free to roam.'); }
    else if (state.accompanied) { r = refuseAware('STAY', c); toast(r.accepted ? 'Veyru stays here for a while.' : 'Veyru keeps going.'); }
    else { toast('Veyru is already at home.'); }
    save();
  }

  /* ---- keys (desktop) and on-screen buttons (mobile) ---- */
  function envGetter() { return V22.brainEnv ? V22.brainEnv() : null; }
  window.addEventListener('keydown', function (e) {
    if (e.repeat) return;
    var t = e.target && e.target.tagName;
    if (t === 'INPUT' || t === 'TEXTAREA' || t === 'SELECT') return;
    if (e.code === 'KeyH') call(envGetter());
    if (e.code === 'KeyZ') stayToggle(envGetter());
  });
  // Relay 003: put VEYRU / STAY inside the existing v2.0 touch column (#yourMoves) instead of floating new buttons.
  // That column already lays out the MELLA and sprint buttons for phones, so nothing new is laid over the controls.
  // Fallback (column absent): a small box on the left above the stick, checked in a browser.
  function makeBtn(def) {
    var b = document.createElement('button');
    b.type = 'button'; b.id = 'kaw-touch-' + def[0].toLowerCase(); b.textContent = def[0]; b.setAttribute('aria-label', def[1]);
    b.addEventListener('pointerdown', function (e) { e.preventDefault(); def[2](envGetter()); });
    return b;
  }
  var TOUCH = [['VEYRU', 'Call Veyru', call], ['STAY', 'Stay or at ease', stayToggle]];
  // Relay 004 item 5: the touch overlay's X, Y, A, B buttons sit in the bottom band of the screen (r = min(w,h)).
  // While the overlay is shown, lift the whole #yourMoves column above that band. Desktop (no overlay) is unchanged.
  // The rule is injected here, in v24, so the v2.0 source is not edited.
  (function touchClearance() {
    try {
      var st = document.createElement('style'); st.id = 'kaw-v24-touch-clear';
      st.textContent = 'body:has(#your-touch[style*="display: block"]) #yourMoves{bottom:calc(min(100vw,100vh) * .3 + 10px) !important}';
      (document.head || document.documentElement).appendChild(st);
    } catch (e) { /* no document head (e.g. a test stub): nothing to style */ }
  })();
  function mountTouch(tries) {
    if (document.getElementById('kaw-touch-veyru')) return;
    var moves = document.getElementById('yourMoves');
    if (moves) {
      // Top of the column: the column is bottom-anchored, so these sit above the overlay's X and A buttons.
      moves.insertBefore(makeBtn(TOUCH[1]), moves.firstChild);
      moves.insertBefore(makeBtn(TOUCH[0]), moves.firstChild);
      return;
    }
    if (tries < 40) { setTimeout(function () { mountTouch(tries + 1); }, 500); return; }   // the column may load late
    var box = document.createElement('div');
    box.id = 'kawTouch';
    box.style.cssText = 'position:fixed;left:8px;bottom:200px;display:flex;flex-direction:column;gap:6px;z-index:9998';
    TOUCH.forEach(function (def) {
      var b = makeBtn(def);
      b.style.cssText = 'font:800 11px system-ui;padding:8px 10px;border-radius:10px;border:1px solid rgba(124,240,224,.45);background:rgba(14,12,29,.82);color:#7cf0e0;touch-action:manipulation';
      box.appendChild(b);
    });
    document.body.appendChild(box);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { mountTouch(0); }); else mountTouch(0);

  V22.brainStep = brainStep;
  V22.brainPlace = brainPlace;
  V22.brainMap = brainMap;
  window.YOUR_V24 = {
    state: function () { return state; }, outcome: function () { return state.outcome || null; },
    hero: function () { return boundHero; }, ready: bindHero, CFG: CFG,
    call: call, stayToggle: stayToggle, save: save, affordances: affordances, findRoute: findRoute, kaw: KC.id
  };
})();
