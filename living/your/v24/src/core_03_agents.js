
  /* =============================================================== civilians (Character AI: needs, routines, memory) */
  var SHIFT = { barista: [7, 15], baker: [6, 14], 'bus driver': [7, 16], 'hot-dog vendor': [11, 19], 'skate coach': [15, 20], 'mural painter': [10, 17], 'retired teacher': [9, 12], 'bank guard': [8, 18], nurse: [8, 18], doctor: [10, 20] };
  var RATES = { energy: 1 / 960, hunger: 1 / 360, social: 1 / 480, fun: 1 / 600 };   // PROPOSED: per game minute
  var WEEKEND_WORK = { 'hot-dog vendor': 1, nurse: 1, doctor: 1, barista: 1, 'skate coach': 1, 'mural painter': 1 };
  function shift(c) { return SHIFT[c.role] || [9, 17]; }
  function nearestThreat(c) { var best = null, bd = 1e9; S.robots.forEach(function (r) { if (r.st === 'down' || !r.hostile || r.riding || r.security) return; var d = D(c, r); if (d < bd) { bd = d; best = r; } }); return { r: best, d: bd }; }
  var CIV_ACTIONS = [
    { id: 'work', score: function (c, x) { var s = shift(c); if (x.h < s[0] || x.h >= s[1] || (x.weekend && !WEEKEND_WORK[c.role])) return 0; if (G.bmap[c.job] && !bOpen(c.job)) return .05; return .75; } },
    { id: 'home', score: function (c, x) { var night = x.h >= 22 || x.h < 6 ? .95 : 0; return Math.max(night, (1 - c.needs.energy) * 1.1, .12); } },
    { id: 'eat', score: function (c) { return Math.pow(1 - c.needs.hunger, 1.5) * 1.25; } },
    { id: 'social', score: function (c, x) { return x.h >= 22 || x.h < 7 ? 0 : (1 - c.needs.social) * .85 * c.tr.social; } },
    { id: 'fun', score: function (c, x) { return x.h >= 22 || x.h < 7 ? 0 : (1 - c.needs.fun) * .75; } },
    { id: 'flee', score: function (c) { return (1 - c.needs.safety) * 1.7 * (1 - c.tr.brave * .5); } },
    { id: 'watch', score: function (c, x) { return x.incNear && c.needs.safety > .45 && c.tr.curious > .55 ? .55 * c.tr.curious : 0; } },
    { id: 'clinic', score: function (c) { return c.injured > 0 ? 2.5 : 0; } },
    { id: 'protest', score: function (c, x) { var z = S.zones[G.bmap[c.home].zone]; return z.confidence < C.damage.protestBelow && x.h >= 10 && x.h < 18 ? .7 * (.5 + c.tr.brave * .5) : 0; } }
  ];
  function civDest(c, a, x) {
    switch (a) {
      case 'work': return G.bmap[c.job] ? { b: c.job } : { p: placePt(c.job === 'plaza' ? 'plaza' : c.job === 'mural' ? 'muralSpot' : 'park'), place: c.job };
      case 'home': return { b: c.home };
      case 'eat': return bOpen('cafe') && x.h >= 6 && x.h < 21 ? { b: 'cafe' } : { b: c.home };
      case 'social': var o = ['cafe', 'park', 'plaza'].filter(function (k) { return !G.bmap[k] || bOpen(k); }); var s = o[(c.id.charCodeAt(2) + x.day) % o.length]; return G.bmap[s] ? { b: s } : { p: placePt(s), place: s };
      case 'fun': var f = ['park', 'plaza', 'store'].filter(function (k) { return !G.bmap[k] || bOpen(k); }); var s2 = f[(c.id.charCodeAt(1) + c.id.charCodeAt(2) + x.h) % f.length]; return G.bmap[s2] ? { b: s2 } : { p: placePt(s2), place: s2 };
      case 'flee': var th = nearestThreat(c), cand = C.buildings.filter(function (b) { return bOpen(b.id) && b.kind !== 'villain'; }).map(function (b) { var p = doorPt(b.id); return { b: b.id, s: D(p, c) - (th.r ? D(p, th.r) * 1.4 : 0) }; }).sort(function (a, b) { return a.s - b.s; }); return cand.length ? { b: cand[0].b } : { b: c.home };
      case 'watch': var inc = x.incNear, ang = Math.atan2(c.y - inc.y, c.x - inc.x); return { p: { x: clamp(inc.x + Math.cos(ang) * 8, 1, G.W - 1), y: clamp(inc.y + Math.sin(ang) * 8, 1, G.H - 1) }, place: 'watch' };
      case 'clinic': return { b: 'clinic' };
      case 'protest': return { p: { x: C.places.civicSquare[0] + rr(-2, 2), y: C.places.civicSquare[1] + rr(-.5, .5) }, place: 'protest' };
    }
  }
  function stepCiv(c, dt, x) {
    var gm = dt * C.clock.gameMinPerSec; Brain.decayNeeds(c.needs, RATES, gm);
    if (c.grabbed) { var gr = S.robots.filter(function (r) { return r.id === c.grabbed; })[0]; if (!gr || gr.st === 'down') { c.grabbed = null; } else { c.x = gr.x + .4; c.y = gr.y; return; } }
    var th = c.inside ? { d: 1e9 } : nearestThreat(c); if (th.d < 6) c.needs.safety = Math.min(c.needs.safety, clamp(th.d / 6, 0, 1) * .6); else c.needs.safety = clamp(c.needs.safety + gm / 20, 0, 1);
    if (x.incNear && !c.inside && D(c, x.incNear) < 12) { c.witnessed[x.incNear.id] = 1; x.incNear.witnesses[c.id] = 1; }
    if (c.inside && G.bmap[c.inside] && S.buildings[c.inside].closed && c.inside !== c.home) { var dp = doorPt(c.inside); c.x = dp.x; c.y = dp.y; Brain.remember(c, { t: Math.floor(absMin()), k: 'closed', subj: c.inside, v: -.3 }); c.inside = null; c.think = 0; }
    if (c.inside) { if (c.inside === c.home && c.action === 'home') c.needs.energy = clamp(c.needs.energy + gm / 420, 0, 1);
      if (c.inside === 'cafe') { c.needs.hunger = clamp(c.needs.hunger + gm / 25, 0, 1); c.needs.social = clamp(c.needs.social + gm / 90, 0, 1); }
      if (c.inside === 'store') c.needs.fun = clamp(c.needs.fun + gm / 60, 0, 1); if (c.inside === c.home) c.needs.hunger = clamp(c.needs.hunger + gm / 120, 0, 1);
      if (c.inside === 'mural' && c.role === 'mural painter' && c.action === 'work') S.mural = Math.min(100, S.mural + gm / 30);
      if (c.inside === 'clinic' && c.injured > 0) { c.injured = Math.max(0, c.injured - gm); if (c.injured <= 0) Brain.remember(c, { t: Math.floor(absMin()), k: 'recovered', v: .2 }); } }
    else if (c.place && !c.dest) { if (c.place === 'park' || c.place === 'plaza') { c.needs.fun = clamp(c.needs.fun + gm / 45, 0, 1); c.needs.social = clamp(c.needs.social + gm / 120, 0, 1); }
      if (c.role === 'mural painter' && c.action === 'work') S.mural = Math.min(100, S.mural + gm / 30); }
    c.think -= dt;
    if (c.think <= 0) { c.think = 2 + rnd() * .5;
      var r = Brain.decide(c, CIV_ACTIONS, x); c.lastScores = r.scores;
      if (r.action.id !== c.action || (!c.inside && !c.dest && !c.place)) { c.action = r.action.id; var d = civDest(c, c.action, x);
        if (d.b && c.inside === d.b) { c.dest = null; } else { if (c.inside) { var dp2 = doorPt(c.inside); c.x = dp2.x; c.y = dp2.y; c.inside = null; } c.goalB = d.b || null; c.place = d.place || null; var tp = d.b ? doorPt(d.b) : d.p; setPath(c, tp.x, tp.y); } }
      if (!c.inside && (c.action === 'social' || c.action === 'fun') && !c.dest) { var o = S.civs.filter(function (k) { return k !== c && !k.inside && D(k, c) < 1.8; })[0]; if (o) chat(c, o); }
    }
    if (!c.inside && c.dest) { var sp = (c.action === 'flee' ? 3.2 : 1.6) * (c.injured > 0 ? .5 : 1), arrived = followPath(c, sp, dt);
      if (arrived) { c.dest = null; c.path = []; if (c.goalB) { c.inside = c.goalB; c.goalB = null; } } }
    if (c.chat > 0) c.chat -= dt;
  }
  function chat(a, b) {   // gossip: civilians share incident memories, so opinions of Mella spread
    a.chat = b.chat = 3; a.needs.social = clamp(a.needs.social + .25, 0, 1); b.needs.social = clamp(b.needs.social + .25, 0, 1);
    var m = a.mem.filter(function (m) { return m.k !== 'heard' && m.inc && !b.mem.some(function (n) { return n.inc === m.inc; }); }).pop();
    if (m) { Brain.remember(b, { t: Math.floor(absMin()), k: 'heard', inc: m.inc, from: a.id, v: (m.v || 0) * .5, txt: m.txt }); b.opinion = clamp(b.opinion + (m.v || 0) * 6, -100, 100); a.said = 'Did you hear about ' + (m.txt || 'what happened') + '?'; }
    else a.said = pick(['Nice day for it.', 'Have you tried the new pastry at Steamline?', 'The mural is coming along.', 'Traffic on the avenue is a mess again.', 'My kid wants to learn to skate.']);
  }

  /* =============================================================== supers (Character AI + independent incident response) */
  function sdef(id) { return C.supers.filter(function (d) { return d.id === id; })[0]; }
  function incById(id) { return S.incidents.filter(function (i) { return i.id === id; })[0]; }
  function stepSuper(s, dt, x) {
    var d = sdef(s.id); s.cd = Math.max(0, s.cd - dt);
    if (s.state === 'captured') { if (absMin() >= s.capturedUntil) { s.state = 'recover'; var b0 = doorPt('clinic'); s.x = b0.x; s.y = b0.y; s.hp = s.max * .4; s.path = []; s.dest = null; feed(d.codename + ' turned up outside the Civic Clinic, released by Iteron after his "study".', 'info'); histNote(d.codename + ' was released by Dr. Iteron.'); } return; }
    if (s.state === 'injured') { s.injuredT += dt; return; }
    if (s.state === 'recover') { if (followPath(s, 3, dt)) { s.hp = Math.min(s.max, s.hp + dt * s.max / 180); if (s.hp >= s.max * .95) { s.state = 'patrol'; s.wp = null; } } return; }
    var inc = s.inc && incById(s.inc);
    if (s.inc && !inc) { s.inc = null; s.obj = null; s.state = 'patrol'; s.wp = null; s.fatigue += .2; }
    if (s.state === 'alerted') { s.alertT -= dt; if (s.alertT <= 0) { s.state = 'respond'; feed(d.codename + ' is responding to the ' + C.incidents[inc.type].label.toLowerCase() + ' in ' + C.zones[inc.zone].name + '.', 'hero'); } return; }
    if (s.state === 'feud') { stepFeud(s, dt); return; }
    if (s.state === 'respond' || s.state === 'engage') { engage(s, d, inc, dt); return; }
    s.fatigue = Math.max(0, s.fatigue - dt / 300); s.hp = Math.min(s.max, s.hp + dt * s.max / 240);
    s.think -= dt; if (s.think <= 0 || !s.wp) { s.think = rr(20, 40); var night = x.h >= 23 || x.h < 7; var pts = night ? [doorPt(d.home)] : [placePt(d.base), placePt('plaza'), placePt('park'), placePt('store'), placePt('bank'), placePt('depot'), placePt('aptA')];
      s.wp = pick(pts); setPath(s, s.wp.x, s.wp.y); }
    followPath(s, d.power.speed * .35, dt);
  }
  function considerResponse(inc) {   // each super decides on its own (utility), so some come, some don't, at different speeds
    S.supers.forEach(function (s) { var d = sdef(s.id); if (s.state !== 'patrol') return;
      var dist = hyp(s.x - inc.x, s.y - inc.y), hr = clock().hour, night = hr >= 23 || hr < 7;
      var u = .55 + (d.temperament === 'reckless' || d.temperament === 'destructive' ? .25 : 0) + (inc.tier === 'major' ? .2 : 0) - dist / 120 - s.fatigue - (night ? .25 : 0) + (s.hp / s.max - 1) + rr(-.25, .2);
      if (Object.keys(s.rel).some(function (k) { return s.rel[k] < -15 && inc.heroes.indexOf(k) >= 0; })) u += .1;
      if (u > .4) { s.inc = inc.id; s.state = 'alerted'; s.alertT = rr(4, 14) * (d.temperament === 'cautious' ? 1.5 : 1); inc.heroes.push(s.id); s.obj = null; } });
  }
  function chooseObjective(s, d, inc) {
    if (inc.div) { var dob = divObjective(s, d, inc); if (dob) return dob; }
    var open = inc.objectives.filter(function (o) { return o.state === 'open'; }).map(function (o) { return o.id; });
    var veh = inc.vehicle && S.vehicles.filter(function (v) { return v.id === inc.vehicle; })[0];
    if (veh && !veh.stopped && !veh.exited) { open.push('destroy_vehicle'); if (inc.type === 'vehicle_chase') open.push('protect_vehicle'); }   // nobody protects a getaway van
    for (var i = 0; i < d.prefs.length; i++) if (open.indexOf(d.prefs[i]) >= 0) return d.prefs[i];
    return 'fight';
  }
  function engage(s, d, inc, dt) {
    if (!inc) return;
    if (!s.obj || s.cd <= 0) { var o = chooseObjective(s, d, inc); if (o !== s.obj) { s.obj = o; conflictCheck(s, inc); } s.cd = 6; }
    if (inc.div && divEngage(s, d, inc, dt)) return;
    var tgt = null, veh = inc.vehicle && S.vehicles.filter(function (v) { return v.id === inc.vehicle; })[0];
    var hostile = S.robots.filter(function (r) { return r.inc === inc.id && r.st !== 'down' && !r.riding; });
    switch (s.obj) {
      case 'save_hero': tgt = S.supers.filter(function (o) { return o.state === 'injured'; })[0] || S.civs.filter(function (c) { return c.injured > 0 && !c.inside && D(c, s) < 15; })[0]; break;
      case 'stop_commander': case 'prevent_damage': tgt = hostile.filter(function (r) { return r.cls === 'commander'; })[0]; break;
      case 'disable_drones': tgt = hostile.filter(function (r) { return r.cls === 'scout'; })[0]; break;
      case 'track_signal': tgt = hostile.filter(function (r) { return r.fleeing; })[0]; break;
      case 'capture_prototype': tgt = S.items.filter(function (it) { return it.inc === inc.id && it.kind === 'core'; })[0]; break;
      case 'protect_civilians': tgt = hostile.filter(function (r) { return r.grab; })[0] || hostile.slice().sort(function (a, b) { return civNear(a) - civNear(b); })[0]; break;
      case 'stop_vehicle': case 'protect_vehicle': case 'destroy_vehicle': case 'recover_loot': tgt = veh && !veh.exited ? veh : null; break;
    }
    if (!tgt) tgt = hostile.slice().sort(function (a, b) { return D(a, s) - D(b, s); })[0] || (veh && !veh.exited && (!veh.stopped || veh.loot) ? veh : null) || inc;
    if (s.obj === 'track_signal' && tgt.cls) { var dd = seek(s, tgt.x, tgt.y, d.power.speed * .9, dt); s.state = 'engage'; if (dd < d.power.range && tgt.hp > tgt.max * .3) hitRobot(tgt, 0, s.id); return; }
    var dist = seek(s, tgt.x, tgt.y, d.power.speed, dt); s.state = dist < 8 ? 'engage' : 'respond';
    if (dist > Math.max(d.power.range, 1.2) + .4) return;
    if (tgt.cls) { hitRobot(tgt, d.power.dps * dt, s.id); if (d.power.collateral && rnd() < d.power.collateral * dt) collateral(tgt.x, tgt.y, 4, d.codename); }
    else if (tgt.kind === 'core') { takeCore(tgt, s.id); }
    else if (tgt.state === 'injured') { tgt.reviveT = (tgt.reviveT || 0) + dt * (d.power.heal ? 3 : 1); if (tgt.reviveT > 4) reviveSuper(tgt, s.id); }
    else if (tgt.injured > 0 && d.power.heal) { tgt.injured = Math.max(0, tgt.injured - dt * 30); }
    else if (tgt.kind === 'truck' || tgt.kind === 'van') {
      if (s.obj === 'destroy_vehicle') { damageVehicle(tgt, d.power.dps * dt / C.hpUnit, s.id); if (rnd() < .4 * dt) collateral(tgt.x, tgt.y, 5, d.codename); }
      else if (s.obj === 'protect_vehicle') { tgt.protectedBy = s.id; tgt.protT = 1; }
      else if (s.obj === 'stop_vehicle') { tgt.slow = true; if (!tgt.stopped) { if (d.power.speed > 7) { tgt.slowT = (tgt.slowT || 0) + dt; if (tgt.slowT > 5) stopVehicle(tgt, s.id); } else damageVehicle(tgt, d.power.dps * dt / C.hpUnit * .6, s.id); } }
      else if (tgt.stopped && tgt.loot) { tgt.lootT = (tgt.lootT || 0) + dt; if (tgt.lootT > 4) recoverLoot(inc, s.id); }
      else if (tgt.stopped && tgt.payload && !tgt.payloadSeen) { revealPayload(tgt, s.id); }
    }
  }
  function civNear(r) { var b = 1e9; S.civs.forEach(function (c) { if (!c.inside) b = Math.min(b, D(c, r)); }); return b; }
  function conflictCheck(s, inc) {
    if (s.obj !== 'destroy_vehicle' && s.obj !== 'protect_vehicle') return;
    var other = S.supers.filter(function (o) { return o !== s && o.inc === inc.id && (o.obj === 'destroy_vehicle' || o.obj === 'protect_vehicle') && o.obj !== s.obj; })[0];
    if (!other || inc.conflicts.indexOf(s.id + '|' + other.id) >= 0) return;
    inc.conflicts.push(s.id + '|' + other.id, other.id + '|' + s.id); s.rel[other.id] = (s.rel[other.id] || 0) - 12; other.rel[s.id] = (other.rel[s.id] || 0) - 12;
    var a = sdef(s.id).codename, b = sdef(other.id).codename, pro = s.obj === 'protect_vehicle' ? a : b, des = s.obj === 'protect_vehicle' ? b : a;
    inc.notes.push(pro + ' tried to protect the ' + inc.vehicleKind + ' while ' + des + ' tried to destroy it.'); feed(pro + ' is shielding the ' + inc.vehicleKind + ' — ' + des + ' is trying to wreck it!', 'alert');
  }
  function reviveSuper(t, by) { t.state = 'recover'; t.hp = t.max * .35; t.reviveT = 0; var cl = doorPt('clinic'); setPath(t, cl.x, cl.y); var inc = incById(t.injInc);
    if (inc) objDone(inc, 'save_hero', by); if (by === 'mella') { t.mellaRel += 15; Brain.remember(t, { t: Math.floor(absMin()), k: 'rescued', v: 1, inc: t.injInc }); } else if (sdef(by)) t.rel[by] = (t.rel[by] || 0) + 10;
    feed(sdef(t.id).codename + ' is back on their feet' + (by === 'mella' ? ' thanks to Mella.' : by ? ', helped by ' + nameOf(by) + '.' : '.'), 'hero'); }
  function nameOf(id) { if (id === 'mella') return 'Mella'; var d = sdef(id); if (d) return d.codename; if (id === 'security') return 'city security robots'; return id || 'nobody'; }
