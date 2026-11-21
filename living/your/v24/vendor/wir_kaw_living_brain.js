/* KAW Living Brain v0.1 · PROPOSAL / not wired into Y.O.U.R.
 * ORIGINAL-WIR working copy. Does not modify your-build-v23 or any original.
 * Grounded in WishBorn Living Behavior v1.2 (wishborn_behavior_engine.js / BEHAVIOR_SPEC.md)
 * plus Veyru intake temperament and the owner's ask-to-come / ask-to-leave-house brief.
 * Numeric thresholds are gameplay PROPOSALS unless inherited from v1.2 and so labeled.
 * Personhood firewall: identity names on the owner's hold list are rejected (v1.2 rule; compared by hash in the Y.O.U.R. public build).
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.WIRKAWLivingBrain = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const SCHEMA = 'wir.kaw.brain/0.1';
  const STATUS = 'PROPOSAL';
  const PUBLISH = 'HOLD';
  const KIND = 'FICTIONAL-GAMEPLAY';
  const DEFAULT_UID = 'kaw-veyru-001';
  const MAX_EVENTS = 240;
  const MAX_MEMORY = 24;

  /* Inherited from WishBorn Living Behavior v1.2 TYPES, plus Y.O.U.R. house/command states. */
  const ACTIVITIES = Object.freeze([
    'watch', 'follow', 'stay', 'explore', 'rest', 'home', 'forage', 'drink',
    'come', 'hide', 'guard', 'investigate', 'socialize'
  ]);
  const COMMANDS = Object.freeze(['COME', 'STAY', 'LEAVE_HOUSE', 'AT_EASE', 'FEED']);

  /* PROPOSED Veyru flavor, from intake temperament: "watchful, territorial around
   * fresh water but bonds through consistent care" and lore "loves clean water,
   * canopy cover, and regular player interaction". Not a v1.2 hash default. */
  const VEYRU_TRAITS = Object.freeze({
    curiosity: 62, courage: 48, patience: 70, sociability: 55, autonomy: 72
  });

  const ID = /^[A-Za-z0-9_-]{1,70}$/;
  const finite = (x, f = 0) => typeof x === 'number' && Number.isFinite(x) ? x : f;
  const clamp = (x, a, b, f = a) => Math.max(a, Math.min(b, finite(x, f)));
  const int = (x, a, b, f = a) => Math.floor(clamp(x, a, b, f));
  const obj = (x) => x !== null && typeof x === 'object' && !Array.isArray(x);
  const dist = (a, b) => Math.hypot(finite(a && a.x) - finite(b && b.x), finite(a && a.y) - finite(b && b.y));

  const HOLD_IDS = { 'a6aaad49': 1 };
  function holdHash(s) { let h = 0x811c9dc5; s = 'kaw:' + s; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h.toString(16); }
  function safeId(x) {
    return typeof x === 'string' && ID.test(x)
      && !['__proto__', 'prototype', 'constructor'].includes(x)
      && !HOLD_IDS[holdHash(x.toLowerCase())];
  }

  function rand(s) {
    let x = s.seed >>> 0;
    x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
    s.seed = x >>> 0 || 0x9e3779b9;
    return s.seed / 4294967296;
  }

  function defaultNeeds() {
    return { hunger: 30, thirst: 24, fear: 6, restNeed: 12, curiosityCharge: 46, socialNeed: 32, comfort: 55 };
  }

  function defaultPlaces() {
    return {
      home: { mapId: 'HOME', x: null, y: null, remembered: false },
      lastWater: null,
      lastRest: null,
      lastSeenPlayer: null
    };
  }

  function makeState(opts) {
    const o = obj(opts) ? opts : {};
    if (o.uid != null && !safeId(o.uid)) throw Error('Invalid creature identity or personhood firewall');
    const uid = o.uid || DEFAULT_UID;
    const traits = Object.assign({}, VEYRU_TRAITS, obj(o.traits) ? o.traits : {});
    const needs = Object.assign(defaultNeeds(), obj(o.needs) ? o.needs : {});
    for (const k of Object.keys(traits)) traits[k] = clamp(traits[k], 0, 100);
    for (const k of Object.keys(needs)) needs[k] = clamp(needs[k], 0, 100);
    return {
      schema: SCHEMA, status: STATUS, publish: PUBLISH, kind: KIND,
      seed: int(o.seed, 1, 4294967295, 97111),
      clock: 0, sequence: 0,
      uid,
      name: typeof o.name === 'string' ? o.name.slice(0, 40) : 'Veyru',
      species: typeof o.species === 'string' ? o.species.slice(0, 60) : 'Rainroot Lynx',
      traits, needs,
      bond: clamp(o.bond, 0, 100, 20), /* Y.O.U.R. v2.2 bondStart is a PROPOSED 20 */
      activity: 'watch',
      reason: 'Attentive to surroundings',
      destination: null,
      accompanied: false, /* false until LEAVE_HOUSE is accepted */
      stayUntil: null,
      currentMap: typeof o.currentMap === 'string' ? o.currentMap : 'HOME',
      places: defaultPlaces(),
      memories: [],
      events: []
    };
  }

  function emit(s, type, detail) {
    if (!/^[A-Z_]{3,42}$/.test(type)) return null;
    s.sequence = int(s.sequence + 1, 0, 2147483647);
    const row = {
      id: 'KB-' + s.sequence,
      tick: Math.round(s.clock * 10) / 10,
      uid: s.uid, type,
      detail: obj(detail) ? JSON.parse(JSON.stringify(detail)) : {},
      kind: KIND
    };
    s.events.push(row);
    if (s.events.length > MAX_EVENTS) s.events.splice(0, s.events.length - MAX_EVENTS);
    s.memories.push({ id: row.id, tick: row.tick, type, detail: row.detail });
    if (s.memories.length > MAX_MEMORY) s.memories.splice(0, s.memories.length - MAX_MEMORY);
    return row;
  }

  /* Derived mood. Not named in v1.2; proposed composite of inherited needs. */
  function moodOf(s) {
    const n = s.needs;
    if (n.fear >= 70) return 'anxious';
    if (n.hunger >= 72 || n.thirst >= 72) return 'hungry';
    if (n.restNeed >= 72) return 'tired';
    if (n.curiosityCharge >= 70 && n.restNeed < 40) return 'playful';
    if (n.socialNeed >= 70) return 'restless';
    if (n.comfort >= 55 && n.fear < 25 && n.restNeed < 40) return 'content';
    return 'watchful';
  }

  /* v1.2 recall willingness (BEHAVIOR_SPEC / wishborn_behavior_engine.js recall()):
   * clamp(.20 + trust*.006 + sociability*.0025 - fatigue*.003 - stress*.0025 - fear*.003 - distance*.004, .04, .96)
   * LEAVE_HOUSE adds proposed modifiers on top; numbers marked PROPOSED. */
  function willingness(s, command, context) {
    const c = obj(context) ? context : {};
    const trust = clamp(c.trust != null ? c.trust : s.bond, 0, 100);
    const distance = clamp(c.distance, 0, 150, 0);
    const fatigue = clamp(c.fatigue != null ? c.fatigue : s.needs.restNeed, 0, 100);
    const stress = clamp(c.stress, 0, 100, 0);
    let w = 0.20 + trust * 0.006 + s.traits.sociability * 0.0025
      - fatigue * 0.003 - stress * 0.0025 - s.needs.fear * 0.003 - distance * 0.004;
    if (command === 'LEAVE_HOUSE') {
      /* PROPOSED: leaving the den is a bigger ask than a short recall. */
      w -= 0.12;
      if (s.currentMap === 'HOME' || c.exitingHome) w += 0.04; /* already at the door */
      if (s.needs.socialNeed > 60) w += 0.08; /* wants company */
      if (s.needs.restNeed > 70) w -= 0.10;
      if (s.bond >= 80) w += 0.10;
      if (moodOf(s) === 'anxious') w -= 0.08;
      if (moodOf(s) === 'playful' || moodOf(s) === 'restless') w += 0.06;
    } else if (command === 'STAY') {
      /* PROPOSED: staying is usually accepted; high social need may refuse. */
      w = 0.72 + s.traits.autonomy * 0.002 - s.needs.socialNeed * 0.003 + trust * 0.001;
    } else if (command === 'FEED') {
      w = 0.85 + s.needs.hunger * 0.001 - s.needs.fear * 0.004;
    } else if (command === 'AT_EASE') {
      w = 0.95;
    }
    return clamp(w, 0.04, 0.96);
  }

  function integrateNeeds(s, dt, context) {
    const c = obj(context) ? context : {};
    const n = s.needs;
    const exposure = clamp(c.hazard, 0, 100, 0);
    const fatigue = clamp(c.fatigue, 0, 100, 0);
    /* Rates inherited from v1.2 integrateNeeds (companion hunger 0.15/s, thirst 0.2/s). */
    n.hunger = clamp(n.hunger + dt * 0.15, 0, 100);
    n.thirst = clamp(n.thirst + dt * 0.20, 0, 100);
    n.restNeed = clamp(n.restNeed + dt * (c.running ? 0.28 : 0.13) + fatigue * 0.002 * dt, 0, 100);
    n.curiosityCharge = clamp(n.curiosityCharge + dt * 0.10, 0, 100);
    n.socialNeed = clamp(n.socialNeed + dt * 0.14, 0, 100);
    n.fear = clamp(n.fear + (exposure * 0.09 - (exposure < 10 ? 0.42 : 0)) * dt, 0, 100);
    if (s.activity === 'rest' || s.activity === 'home') {
      n.restNeed = clamp(n.restNeed - dt * 2.2, 0, 100);
      n.fear = clamp(n.fear - dt * 0.6, 0, 100);
      n.comfort = clamp(n.comfort + dt * 0.4, 0, 100);
    }
    if (s.activity === 'forage') n.curiosityCharge = clamp(n.curiosityCharge - dt * 0.3, 0, 100);
    if (s.activity === 'explore' || s.activity === 'investigate') n.curiosityCharge = clamp(n.curiosityCharge - dt * 0.7, 0, 100);
    if (s.activity === 'follow' || s.activity === 'come') n.socialNeed = clamp(n.socialNeed - dt * 0.5, 0, 100);
    if (s.activity === 'drink') n.thirst = clamp(n.thirst - dt * 6, 0, 100);
    if (s.activity === 'forage' && c.hasFood) n.hunger = clamp(n.hunger - dt * 5, 0, 100);
  }

  function rememberPlaces(s, context) {
    const c = obj(context) ? context : {};
    if (typeof c.mapId === 'string') s.currentMap = c.mapId;
    const pos = obj(c.position) ? c.position : null;
    const player = obj(c.player) ? c.player : null;
    if (s.currentMap === 'HOME' && pos) {
      s.places.home = { mapId: 'HOME', x: pos.x, y: pos.y, remembered: true };
    }
    if (obj(c.water)) s.places.lastWater = { mapId: s.currentMap, x: c.water.x, y: c.water.y };
    if (s.activity === 'rest' && pos) s.places.lastRest = { mapId: s.currentMap, x: pos.x, y: pos.y };
    if (player) s.places.lastSeenPlayer = { mapId: s.currentMap, x: player.x, y: player.y, tick: s.clock };
  }

  function choose(s, context) {
    const c = obj(context) ? context : {};
    const pos = obj(c.position) ? c.position : { x: 0, y: 0 };
    const player = obj(c.player) ? c.player : pos;
    const d = dist(pos, player);
    const n = s.needs;
    const jitter = () => rand(s) * 1.5;
    const inHome = s.currentMap === 'HOME' || !!c.inHome;
    const scores = {
      rest: n.restNeed * 1.2 + jitter(),
      forage: n.hunger * 1.28 + jitter(),
      drink: n.thirst * 1.3 + jitter(),
      explore: n.curiosityCharge * (s.traits.curiosity / 100) * 0.95 + jitter(),
      watch: 25 + s.traits.patience * 0.10 + jitter(),
      socialize: n.socialNeed * (s.traits.sociability / 100) * 1.4 + jitter()
    };
    /* Follow / return utilities inherited from v1.2 companion branch, used only
     * when the KAW is already accompanied or already on the same map as the hero
     * and not under a stay order. */
    const canFollow = !inHome || s.accompanied;
    if (canFollow && s.stayUntil == null) {
      scores.follow = 24 + s.bond * 0.35 + Math.min(d, 15) * 1.7 + jitter();
      scores.come = d > 8 ? 42 + s.bond * 0.3 + Math.min(d, 20) * 1.6 : 0;
    } else {
      scores.follow = 0;
      scores.come = 0;
      /* At home and not invited: wander, rest, drink, watch. */
      if (inHome) scores.home = 30 + s.traits.autonomy * 0.2 + (n.comfort * 0.15) + jitter();
    }
    if (n.fear > 70) scores.hide = (scores.hide || 0) + n.fear + jitter();
    if (c.hazard > 25) scores.guard = c.hazard * 0.55 + s.traits.courage * 0.24 + jitter();
    const choice = Object.entries(scores).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0][0];
    let target = null;
    if (choice === 'follow' || choice === 'come') target = { x: player.x, y: player.y };
    else if (choice === 'drink' && obj(c.water)) target = { x: c.water.x, y: c.water.y };
    else if (choice === 'home' && s.places.home.remembered) target = { x: s.places.home.x, y: s.places.home.y };
    else if (choice === 'hide' && obj(c.cover)) target = { x: c.cover.x, y: c.cover.y };
    const reasons = {
      follow: 'Wants to stay close',
      come: 'Chose to find their familiar companion',
      hide: 'Seeking safety',
      forage: 'Needs nourishment',
      drink: 'Seeking water',
      rest: 'Recovering energy',
      explore: 'Independent roaming',
      home: 'Settling at home',
      watch: 'Attentive to surroundings',
      socialize: 'Seeking company',
      guard: 'Watching a threat',
      investigate: 'Investigating a signal'
    };
    return { activity: choice, target, score: scores[choice], reason: reasons[choice] || 'Independent behavior' };
  }

  function decide(s, context, dt) {
    const step = dt == null ? 1 : dt;
    if (typeof step !== 'number' || !Number.isFinite(step) || step <= 0 || step > 10) {
      return { ok: false, code: 'INVALID_DT' };
    }
    integrateNeeds(s, step, context);
    rememberPlaces(s, context);
    if (s.stayUntil != null && s.clock < s.stayUntil) {
      return { ok: true, code: 'STAYING', activity: s.activity, reason: s.reason, mood: moodOf(s), accompanied: s.accompanied };
    }
    if (s.stayUntil != null && s.clock >= s.stayUntil) {
      s.stayUntil = null;
      emit(s, 'STAY_EXPIRED', {});
    }
    const decision = choose(s, context);
    const previous = s.activity;
    s.activity = decision.activity;
    s.reason = decision.reason;
    s.destination = decision.target;
    if (previous !== s.activity) emit(s, 'BEHAVIOR_CHANGED', { from: previous, to: s.activity, reason: s.reason });
    return { ok: true, code: 'DECIDED', activity: s.activity, reason: s.reason, destination: s.destination, mood: moodOf(s), bond: s.bond, accompanied: s.accompanied, needs: Object.assign({}, s.needs) };
  }

  function tick(s, context, dt) {
    const step = dt == null ? 1 : dt;
    if (typeof step !== 'number' || !Number.isFinite(step) || step < 0 || step > 5) {
      return { ok: false, code: 'INVALID_DT' };
    }
    s.clock = clamp(s.clock + step, 0, 1e9);
    return decide(s, context, step || 1e-6);
  }

  function command(s, name, context) {
    if (!COMMANDS.includes(name)) return { ok: false, code: 'INVALID_COMMAND' };
    const c = obj(context) ? context : {};
    if (name === 'AT_EASE') {
      s.stayUntil = null;
      emit(s, 'COMMAND_ACCEPTED', { command: name, reason: 'Resumed autonomy' });
      const d = decide(s, c, 0.2);
      return { ok: true, code: 'AT_EASE', accepted: true, willingness: 0.95, activity: d.activity, reason: d.reason, mood: moodOf(s), accompanied: s.accompanied };
    }
    const will = willingness(s, name, c);
    const accepted = rand(s) < will;
    if (name === 'LEAVE_HOUSE') {
      const inHome = s.currentMap === 'HOME' || !!c.inHome || !!c.exitingHome;
      if (!inHome && !s.accompanied) {
        emit(s, 'COMMAND_DECLINED', { command: name, reason: 'Not at the house door' });
        return { ok: false, code: 'NOT_AT_HOME', accepted: false, willingness: will, accompanied: s.accompanied, mood: moodOf(s) };
      }
      if (accepted) {
        s.accompanied = true;
        s.stayUntil = null;
        s.activity = 'follow';
        s.reason = 'Agreed to leave the house with you';
        emit(s, 'LEAVE_HOUSE_ACCEPTED', { probability: Math.round(will * 100) / 100 });
        return { ok: true, code: 'LEAVE_HOUSE_ACCEPTED', accepted: true, willingness: will, activity: s.activity, reason: s.reason, mood: moodOf(s), accompanied: true };
      }
      s.accompanied = false;
      s.activity = s.needs.restNeed > 60 ? 'rest' : 'stay';
      s.reason = 'Chose to stay home';
      emit(s, 'LEAVE_HOUSE_DECLINED', { probability: Math.round(will * 100) / 100 });
      return { ok: false, code: 'LEAVE_HOUSE_DECLINED', accepted: false, willingness: will, activity: s.activity, reason: s.reason, mood: moodOf(s), accompanied: false };
    }
    if (name === 'COME') {
      if (accepted) {
        s.stayUntil = null;
        s.activity = 'come';
        s.reason = 'Coming to you';
        if (obj(c.player)) s.destination = { x: c.player.x, y: c.player.y };
        emit(s, 'RECALL_ACCEPTED', { probability: Math.round(will * 100) / 100, distance: Math.round(clamp(c.distance, 0, 150, 0)) });
        return { ok: true, code: 'RECALL_ACCEPTED', accepted: true, willingness: will, activity: s.activity, reason: s.reason, mood: moodOf(s), accompanied: s.accompanied };
      }
      emit(s, 'RECALL_DECLINED', { probability: Math.round(will * 100) / 100, reason: 'Independent choice' });
      return { ok: false, code: 'RECALL_DECLINED', accepted: false, willingness: will, activity: s.activity, reason: 'Independent choice', mood: moodOf(s), accompanied: s.accompanied };
    }
    if (name === 'STAY') {
      if (accepted) {
        /* PROPOSED default stay window: 45 in-game seconds. */
        const hold = clamp(c.duration, 5, 300, 45);
        s.stayUntil = s.clock + hold;
        s.activity = 'stay';
        s.reason = 'Staying put as asked';
        s.destination = obj(c.position) ? { x: c.position.x, y: c.position.y } : s.destination;
        emit(s, 'STAY_ACCEPTED', { until: s.stayUntil, probability: Math.round(will * 100) / 100 });
        return { ok: true, code: 'STAY_ACCEPTED', accepted: true, willingness: will, activity: s.activity, reason: s.reason, stayUntil: s.stayUntil, mood: moodOf(s), accompanied: s.accompanied };
      }
      emit(s, 'STAY_DECLINED', { probability: Math.round(will * 100) / 100 });
      return { ok: false, code: 'STAY_DECLINED', accepted: false, willingness: will, activity: s.activity, mood: moodOf(s), accompanied: s.accompanied };
    }
    if (name === 'FEED') {
      if (accepted) {
        s.needs.hunger = clamp(s.needs.hunger - 18, 0, 100);
        s.needs.thirst = clamp(s.needs.thirst - 6, 0, 100);
        s.needs.comfort = clamp(s.needs.comfort + 8, 0, 100);
        s.bond = clamp(s.bond + 1.5, 0, 100); /* PROPOSED small care bonus */
        emit(s, 'FEED_ACCEPTED', {});
        return { ok: true, code: 'FEED_ACCEPTED', accepted: true, willingness: will, mood: moodOf(s), bond: s.bond, needs: Object.assign({}, s.needs) };
      }
      emit(s, 'FEED_DECLINED', { probability: Math.round(will * 100) / 100 });
      return { ok: false, code: 'FEED_DECLINED', accepted: false, willingness: will, mood: moodOf(s) };
    }
    return { ok: false, code: 'INVALID_COMMAND' };
  }

  /* Y.O.U.R. map hook helper: should Veyru be placed on the destination map? */
  function shouldEnterMap(s, fromMapId, toMapId) {
    const leavingHome = fromMapId === 'HOME' && toMapId !== 'HOME';
    if (leavingHome) return !!s.accompanied;
    const enteringHome = toMapId === 'HOME';
    if (enteringHome) return true; /* always allowed back into the house if already in the world; if left at home, they are already there */
    return !!s.accompanied || fromMapId === toMapId;
  }

  function hydrate(raw) {
    if (!obj(raw)) return makeState();
    if (raw.uid != null && !safeId(raw.uid)) throw Error('Invalid creature identity or personhood firewall');
    const s = makeState({
      uid: raw.uid, name: raw.name, species: raw.species,
      seed: raw.seed, traits: raw.traits, needs: raw.needs, bond: raw.bond,
      currentMap: raw.currentMap
    });
    s.clock = clamp(raw.clock, 0, 1e9, 0);
    s.sequence = int(raw.sequence, 0, 2147483647, 0);
    s.activity = ACTIVITIES.includes(raw.activity) ? raw.activity : 'watch';
    s.reason = typeof raw.reason === 'string' ? raw.reason.slice(0, 160) : s.reason;
    s.destination = obj(raw.destination) ? { x: finite(raw.destination.x), y: finite(raw.destination.y) } : null;
    s.accompanied = !!raw.accompanied;
    s.stayUntil = raw.stayUntil == null ? null : clamp(raw.stayUntil, 0, 1e9);
    if (obj(raw.places)) {
      if (obj(raw.places.home)) s.places.home = {
        mapId: 'HOME',
        x: raw.places.home.x == null ? null : finite(raw.places.home.x),
        y: raw.places.home.y == null ? null : finite(raw.places.home.y),
        remembered: !!raw.places.home.remembered
      };
      s.places.lastWater = obj(raw.places.lastWater) ? raw.places.lastWater : null;
      s.places.lastRest = obj(raw.places.lastRest) ? raw.places.lastRest : null;
      s.places.lastSeenPlayer = obj(raw.places.lastSeenPlayer) ? raw.places.lastSeenPlayer : null;
    }
    s.events = (Array.isArray(raw.events) ? raw.events : []).filter((e) => obj(e) && typeof e.type === 'string').slice(-MAX_EVENTS);
    s.memories = (Array.isArray(raw.memories) ? raw.memories : []).slice(-MAX_MEMORY);
    if (s.schema !== SCHEMA) { /* keep schema at 0.1; unknown future schemas still hydrate defensively */ }
    return s;
  }

  function assertInvariants(s) {
    if (!obj(s) || s.schema !== SCHEMA || s.publish !== 'HOLD' || !safeId(s.uid)) return false;
    if (!Number.isFinite(s.clock) || !Number.isInteger(s.seed) || s.seed < 1) return false;
    if (!ACTIVITIES.includes(s.activity) || s.memories.length > MAX_MEMORY || s.events.length > MAX_EVENTS) return false;
    if (s.bond < 0 || s.bond > 100) return false;
    for (const p of ['hunger', 'thirst', 'fear', 'restNeed', 'curiosityCharge', 'socialNeed', 'comfort']) {
      if (!Number.isFinite(s.needs[p]) || s.needs[p] < 0 || s.needs[p] > 100) return false;
    }
    for (const p of ['curiosity', 'courage', 'patience', 'sociability', 'autonomy']) {
      if (!Number.isFinite(s.traits[p]) || s.traits[p] < 0 || s.traits[p] > 100) return false;
    }
    return true;
  }

  return Object.freeze({
    SCHEMA, STATUS, PUBLISH, KIND, DEFAULT_UID, ACTIVITIES, COMMANDS, VEYRU_TRAITS,
    makeState, hydrate, tick, decide, command, willingness, moodOf, shouldEnterMap,
    assertInvariants, emit
  });
});
