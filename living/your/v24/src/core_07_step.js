
  /* =============================================================== init + main step */
  function init() {
    C.civilians.forEach(function (c) { var at = G.bmap[c[2]].door;
      S.civs.push({ id: c[0], name: c[1], home: c[2], job: c[3], role: c[4], tr: clone(c[5]), x: at[0] + .5, y: at[1] + .5, inside: c[2], action: 'home', dest: null, path: [], pi: 0, place: null, goalB: null,
        needs: { energy: rr(.5, .9), hunger: rr(.4, .9), social: rr(.3, .9), fun: rr(.3, .9), safety: 1 }, mem: [], opinion: 0, injured: 0, grabbed: null, think: rr(0, 2), chat: 0, said: '', witnessed: {} }); });
    C.supers.forEach(function (d) { var b = G.bmap[d.base] ? doorPt(d.base) : placePt(d.base); S.supers.push({ id: d.id, x: b.x, y: b.y, hp: d.hp, max: d.hp, state: 'patrol', inc: null, obj: null, path: [], pi: 0, dest: null, wp: null, mem: [], rel: clone(d.rel || {}), mellaRel: 0, fatigue: 0, cd: 0, think: rr(0, 1), injuredT: 0, capturedUntil: 0, alertT: 0 }); });
    var M = C.director.modes[C.director.defaultMode];
    S.director = { mode: C.director.defaultMode, nextMinor: rr(C.director.firstMinorSec[0], C.director.firstMinorSec[1]), nextMajor: rr(C.director.firstMajorSec[0], C.director.firstMajorSec[1]),
      last: {}, recent: [], recentZones: [], patrolTarget: ri(M.patrols[0], M.patrols[1]), nextPatrolCheck: 5, log: [], deferred: 0 };
    S.iteron = { gen: 1, resources: C.iteron.baseResources, learn: { hit: 0, blast: 0, dash: 0, calm: 0, skate: 0, drive: 0 }, mods: { meleeGuard: 0, blastDodge: 0, extraScouts: 0, disguise: C.iteron.disguiseBase }, observedSec: 0, encounters: 0, captured: [] };
    S.vesper = { stage: 'idle', dronesBought: 0 };
    divInit();
    for (var i = 0; i < C.traffic.cars; i++) spawnCar(true);
    var c0 = clock(); feed('Day ' + c0.day + ' · ' + c0.weekday + ' ' + c0.hhmm + ' · a normal afternoon in the district.', 'info');
  }
  function stepSecurity(r, dt) { r.cyc += dt; var foe = S.robots.filter(function (o) { return o.inc && o.hostile && o.st !== 'down' && !o.riding && !o.security && D(o, r) < 6; })[0];
    if (foe) { seek(r, foe.x, foe.y, 3, dt); if (D(foe, r) < 1.5) hitRobot(foe, 8 * dt, 'security'); return; }
    if (!r.wp || D(r, r.wp) < .5) { var bs = C.buildings.filter(function (b) { return b.zone === r.zone; }), b = pick(bs), p = doorPt(b.id); r.wp = { x: p.x + rr(-1.5, 1.5), y: p.y + .3 }; } seek(r, r.wp.x, r.wp.y, 1.6, dt); }
  function step(dt) {
    S.t += dt; var c = clock(), weekend = c.weekday === 'Saturday' || c.weekday === 'Sunday';
    var incNear = S.incidents.filter(function (i) { return i.type !== 'scout_sighting'; })[0] || null;
    var ctx = { h: c.hour, day: c.day, weekend: weekend, incNear: incNear };
    stepPlayerTimers(dt);
    var i; for (i = 0; i < S.civs.length; i++) stepCiv(S.civs[i], dt, ctx);
    for (i = 0; i < S.supers.length; i++) stepSuper(S.supers[i], dt, ctx);
    for (i = 0; i < S.robots.length; i++) { var r = S.robots[i]; if (r.security) stepSecurity(r, dt); else stepRobot(r, dt); }
    for (i = 0; i < S.vehicles.length; i++) stepVehicle(S.vehicles[i], dt);
    S.incidents.slice().forEach(function (inc) { stepIncident(inc, dt); });
    S.robots = S.robots.filter(function (r) { return !r.gone; });
    S.vehicles = S.vehicles.filter(function (v) { if (v.towT != null) { v.towT -= dt; if (v.towT <= 0) return false; } return !v.exited; });
    var cars = 0; S.vehicles.forEach(function (v) { if (v.kind === 'car') cars++; }); if (cars < C.traffic.cars && rnd() < dt * .5) spawnCar(false);
    if (S.fx) { S.fx.forEach(function (f) { f.t -= dt; }); S.fx = S.fx.filter(function (f) { return f.t > 0; }); }
    directorStep(dt); calendarStep(); dividerStep(dt); cityStep(dt);
  }
  var acc = 0;
  sim.step = step;
  sim.tick = function (realDt, timeScale) { acc += Math.min(realDt, .25) * (timeScale == null ? 1 : timeScale); var n = 0, st = C.clock.stepSec; while (acc >= st && n < 2000) { step(st); acc -= st; n++; } if (n >= 2000) acc = 0; return n; };
  sim.advance = function (seconds, stepSec) { var st = stepSec || C.clock.stepSec, n = Math.round(seconds / st); for (var i = 0; i < n; i++) step(st); return n; };
  sim.serialize = function () { return clone(S); };
  sim.digest = function () {   // compact, comparable snapshot for determinism tests
    return JSON.stringify({ t: +S.t.toFixed(2), rng: S.rng, log: S.director.log, hist: S.history.map(function (h) { return [h.id, h.type, h.zone, h.outcome, (h.heroes || []).join('+')]; }),
      civ: S.civs.map(function (c) { return [c.id, +c.x.toFixed(3), +c.y.toFixed(3), c.action, c.inside]; }), sup: S.supers.map(function (s) { return [s.id, +s.x.toFixed(3), +s.y.toFixed(3), s.state]; }),
      zones: S.zones, iteron: S.iteron, bld: S.buildings, divider: S.divider, rep: S.rep });
  };
  sim.activeObjectives = function () { return S.incidents.map(function (i) { return { id: i.id, type: i.type, label: i.label, zone: C.zones[i.zone].name, phase: i.phase, objectives: i.objectives, heroes: i.heroes.map(function (h) { return sdef(h).codename + (S.supers.filter(function (s) { return s.id === h; })[0].obj ? ' → ' + S.supers.filter(function (s) { return s.id === h; })[0].obj.replace(/_/g, ' ') : ''); }), x: i.x, y: i.y, cause: i.cause, left: Math.max(0, Math.round(i.deadline - S.t)) }; }); };
  sim.sdef = sdef; sim.Brain = Brain; sim.doorPt = doorPt;
  if (!opts.save) init();
  return sim;
}

return { VERSION: VERSION, create: create, Brain: Brain, buildGeo: buildGeo, config: CFG };
}));
