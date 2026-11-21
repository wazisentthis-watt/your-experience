/* Y.O.U.R. v2.4 · KAW Living Brain adapter · PROPOSAL_HOLD (PUBLISH HOLD)
   Wraps the KAW Living Brain v0.1 prototype (vendor/wir_kaw_living_brain.js, byte-identical copy of
   /workspace/game-recovery/kaw-living-brain/src/) so Veyru moves on its own in the Valence day (index.html) and in the Living District (living.html).
   DEFAULTS, NOT OWNER DECISIONS (the owner has not answered the KAW questions yet; every rule below is labelled DEFAULT):
     D1 ask to leave the house on every departure (LEAVE_HOUSE). Coming home ends the outing; next time you go out you ask again.
     D2 a refusal means the hero leaves alone and must come back home to ask again (one ask per home visit).
     D3 needs in the city = rest / fear / curiosity / social / comfort. Hunger and thirst are held at 0 (no feeding loop in the city).
     D4 traits = the prototype's PROPOSED Veyru traits (curiosity 62, courage 48, patience 70, sociability 55, autonomy 72).
     D5 no teleport snap: Veyru walks / runs everywhere. It only changes map with you when it is with you (shouldEnterMap).
   Movement speeds and hazard numbers are PROPOSED tuning values. Brain randomness uses the brain's own seed (never the city RNG). */
(function (root) {
  'use strict';
  var B = root.WIRKAWLivingBrain;
  var DEFAULTS = { label: 'DEFAULTS — owner has not decided', askEachDeparture: true, refusalNeedsReturnHome: true,
    cityNeeds: ['restNeed', 'fear', 'curiosityCharge', 'socialNeed', 'comfort'], hungerThirstInCity: false, traits: B ? B.VEYRU_TRAITS : null, teleportSnap: false,
    thinkSec: 0.5, speeds: { amble: 2.4, walk: 4.6, run: 8.2, sprint: 9.5 }, stopNear: 1.25 };
  function city(s) { s.needs.hunger = 0; s.needs.thirst = 0; return s; }
  function create(seed, saved) { var s = saved ? B.hydrate(saved) : B.makeState({ seed: (seed >>> 0) || 97111, bond: 20 }); return city(s); }
  function think(s, ctx, dt) { var st = Math.max(0.05, Math.min(5, dt)), r = B.tick(s, ctx, st); city(s);
    /* ADAPTER (PROPOSED): the v0.1 prototype never lowers socialNeed while socializing, so Veyru got stuck there. Company now satisfies it
       (same rate as follow, 0.5/s) when Veyru is within 2 tiles of the hero (with you) or of a passer-by (at home). */
    var o = s.accompanied ? ctx.player : ctx.friend; if (s.activity === 'socialize' && o && ctx.position && Math.hypot(o.x - ctx.position.x, o.y - ctx.position.y) < 2) s.needs.socialNeed = Math.max(0, s.needs.socialNeed - st * 0.5);
    return r; }
  function ask(s, cmd, ctx) { var r = B.command(s, cmd, ctx || {}); city(s); return r; }
  function hazard(dist) { return dist < 2 ? 85 : dist < 4 ? 60 : dist < 7 ? 32 : 0; }   // PROPOSED: nearest hostile machine → fear input
  function hash(s, k) { var x = Math.sin((s.clock + 1) * 12.9898 + (s.sequence + k) * 78.233) * 43758.5453; return x - Math.floor(x); }
  /* Where does this activity want to go?  pos/player/home/threat are {x,y} in tiles. Returns {x,y,speed,stop} or null (stand still). */
  function goal(s, a) {
    var act = s.activity, p = a.player, me = a.pos, d = Math.hypot(me.x - p.x, me.y - p.y), sp = DEFAULTS.speeds;
    var anchor = s.accompanied ? p : (a.home || me);
    if (act === 'come') return { x: p.x, y: p.y, speed: sp.sprint, stop: 1.1 };
    if (act === 'follow') return { x: p.x - 0.8, y: p.y + 0.45, speed: d > 4 ? sp.run : sp.walk, stop: DEFAULTS.stopNear };
    if (act === 'guard' && a.threat) return { x: (p.x + a.threat.x) / 2, y: (p.y + a.threat.y) / 2, speed: sp.run, stop: 0.6 };
    if (act === 'hide') { var c = a.cover || anchor; return { x: c.x, y: c.y, speed: sp.run, stop: 0.6 }; }
    if (act === 'home' && a.home) return { x: a.home.x, y: a.home.y, speed: sp.walk, stop: 0.5 };
    if (act === 'socialize') { var o = s.accompanied ? p : (a.friend || null); return o ? { x: o.x + 0.7, y: o.y + 0.3, speed: sp.walk, stop: 1 } : null; }
    if (act === 'explore' || act === 'forage' || act === 'drink' || act === 'investigate') {
      if (!s.wander || s.wander.until < s.clock || Math.hypot(me.x - s.wander.x, me.y - s.wander.y) < 0.4) {
        var r = s.accompanied ? 4 : 2.6, ang = hash(s, 1) * 6.283, rad = 1 + hash(s, 2) * r;
        s.wander = { x: anchor.x + Math.cos(ang) * rad, y: anchor.y + Math.sin(ang) * rad * 0.8, until: s.clock + 6 };
      }
      return { x: s.wander.x, y: s.wander.y, speed: sp.amble, stop: 0.3 };
    }
    return null;   // watch / stay / rest / home (already home): stand
  }
  var MOODFACE = { playful: 'happy', content: 'calm', tired: 'calm', anxious: 'alert', restless: 'curious', watchful: 'curious', hungry: 'curious' };
  function face(s) { return MOODFACE[B.moodOf(s)] || 'curious'; }
  var LINES = {   // KAW narration (Veyru never speaks words) — PROPOSED text
    LEAVE_HOUSE_ACCEPTED: 'Veyru stretches, flicks its leaf-ruff and pads out the door beside you.',
    LEAVE_HOUSE_DECLINED: 'Veyru settles back down and watches you. Not today. (Come back home to ask again.)',
    NOT_AT_HOME: 'Veyru is at home. Go home and ask it to come out with you.',
    RECALL_ACCEPTED: 'Veyru\'s ears snap toward your voice and it bounds over.',
    RECALL_DECLINED: 'Veyru hears you… and keeps doing its own thing for now.',
    STAY_ACCEPTED: 'Veyru sits, tail curled, and stays put.',
    STAY_DECLINED: 'Veyru shakes its head and stays close to you instead.',
    AT_EASE: 'Veyru relaxes and goes back to doing whatever it likes.',
    LOCKED: 'Veyru already said no this time. Leave, then come back home to ask again.',
    HOME: 'You\'re home. Veyru trots inside to its spot. Next time you go out, ask again.' };
  function line(code) { return LINES[code] || ''; }
  root.YOUR_KAW_BRAIN = { DEFAULTS: DEFAULTS, B: B, create: create, think: think, ask: ask, hazard: hazard, goal: goal, face: face, line: line, mood: function (s) { return B.moodOf(s); }, valid: function (s) { return B.assertInvariants(s); } };
}(typeof self !== 'undefined' ? self : this));
