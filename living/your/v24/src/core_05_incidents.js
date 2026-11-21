
  /* =============================================================== vehicles in incidents */
  function damageVehicle(v, dmg, by) { if (v.stopped || v.exited) return; v.hp -= dmg; v.lastBy = by; if (v.hp <= 0) stopVehicle(v, by, by === 'riotgale'); }
  sim.damageVehicle = function (id, dmg, by) { var v = S.vehicles.filter(function (q) { return q.id === id; })[0]; if (!v || !v.inc) return false; if (v.protT > 0 && by && by.indexOf('mella') === 0) dmg *= .6; damageVehicle(v, dmg, by); var inc = incById(v.inc); if (inc && by && by.indexOf('mella') === 0) inc.mellaActs++; return true; };
  function stopVehicle(v, by, wrecked) { v.stopped = true; v.speed = 0; v.hp = Math.max(0, v.hp); var inc = incById(v.inc); var who = by && by.indexOf('mella') === 0 ? 'mella' : by;
    if (!inc) return;
    objDone(inc, 'stop_vehicle', who);
    if (wrecked) { inc.notes.push('The ' + inc.vehicleKind + ' was wrecked.'); collateral(v.x, v.y, 10, nameOf(by)); S.civs.forEach(function (c) { if (!c.inside && hyp(c.x - v.x, c.y - v.y) < 2 && rnd() < .5) injureCiv(c, inc, 'hit by wreckage'); }); }
    S.robots.forEach(function (r) { if (r.riding === v.id) { r.riding = null; r.st = 'engage'; r.x = v.x + rr(-1, 1); r.y = v.y + rr(-1, 1); } });
    feed('The ' + inc.vehicleKind + ' has been stopped' + (who ? ' by ' + nameOf(who) : '') + (wrecked ? ' — wrecked.' : '.'), 'hero'); }
  function revealPayload(v, by) { v.payloadSeen = true; var inc = incById(v.inc);
    v.payloadText = { escape: 'The driver is a courier who stole one of Iteron\'s prototypes and was running from his drones.', robbery: 'The truck was stolen from the Tinker Workshop; the drones were its escort.', decoy: 'The truck is empty — a decoy while Iteron\'s scouts mapped which heroes responded.' }[v.payload];
    if (inc) { inc.payload = v.payload; inc.notes.push(v.payloadText); if (v.payload !== 'decoy') { S.items.push({ id: nid('it'), kind: 'core', x: v.x + .8, y: v.y, inc: inc.id, t: 30 }); addObj(inc, 'capture_prototype'); } else S.iteron.observedSec += 60; }
    feed((by ? nameOf(by) + ' opened the truck: ' : '') + v.payloadText, 'info'); }
  function recoverLoot(inc, by) { var v = S.vehicles.filter(function (q) { return q.id === inc.vehicle; })[0]; if (v) v.loot = false; objDone(inc, 'recover_loot', by); feed(nameOf(by) + ' recovered the stolen money.', 'hero'); }

  /* =============================================================== incidents (Incident AI) */
  function addObj(inc, id) { if (!inc.objectives.some(function (o) { return o.id === id; })) inc.objectives.push({ id: id, label: C.objectives[id].label, state: 'open', by: null }); }
  function objDone(inc, id, by) { addObj(inc, id); var o = inc.objectives.filter(function (o) { return o.id === id; })[0]; if (o.state !== 'open') return; o.state = 'done'; o.by = by || null; o.t = +S.t.toFixed(1); if (by === 'mella') inc.mellaActs++; }
  function objFail(inc, id) { var o = inc.objectives.filter(function (o) { return o.id === id; })[0]; if (o && o.state === 'open') { o.state = 'failed'; o.t = +S.t.toFixed(1); } }
  function origins(kind) {   // plausible entry points: road ends for vehicles; the Old Foundry door and sewer grates for robots
    if (kind === 'road') return edgeNodes().map(function (i) { var n = G.nodes[i]; return { x: clamp(n.x, .3, G.W - .3), y: clamp(n.y, .3, G.H - .3), node: i, name: { W: 'the west road', E: 'the east road', N: 'the north road', S: 'the south road' }[n.edge] }; });
    return [Object.assign(foundryDoor(), { name: 'the Old Foundry' })].concat(C.grates.map(function (g) { return { x: g[0] + .5, y: g[1] + .5, name: 'a sewer grate in ' + C.zones[zoneAt(g[0], g[1])].name }; }));
  }
  function validOrigins(kind, near) { var o = origins(kind).filter(function (p) { return spawnOK(p.x, p.y); }); if (near) o.sort(function (a, b) { return D(a, near) - D(b, near); }); return o; }
  sim.spawnIncident = function (type, tier, why) { return startIncident(type, tier || C.incidents[type].tier, why || 'qa'); };
  function newInc(type, tier, zone, target, origin, why) {
    var inc = { id: nid('inc'), type: type, tier: tier, label: C.incidents[type].label, zone: zone, x: target.x, y: target.y, target: { x: target.x, y: target.y }, targetB: target.b || null, origin: { x: origin.x, y: origin.y, name: origin.name },
      start: +S.t.toFixed(2), startClock: stamp(), deadline: S.t + C.incidents[type].deadlineSec, phase: 'active', objectives: [], heroes: [], downs: {}, mellaActs: 0, mellaNearSec: 0, civInjured: 0, dmg: 0,
      notes: [], conflicts: [], collateral: {}, injuredHeroes: [], witnesses: {}, why: why, cause: '' };
    S.incidents.push(inc); S.stats.incidents++; return inc;
  }
  function nearestNode(x, y) { var b = 0, bd = 1e9; G.nodes.forEach(function (n, i) { if (n.edge) return; var d = hyp(n.x - x, n.y - y); if (d < bd) { bd = d; b = i; } }); return b; }
  function startIncident(type, tier, why) {
    if (tier === 'any') tier = 'minor';
    var I = C.incidents[type], M = C.director.modes[S.director.mode], k = .6 + .8 * M.intensity, inc = null, o, v, i;
    if (type === 'frame_up' || type === 'staged_fight') { inc = startDivider(type, why); }
    else if (type === 'vehicle_chase') {
      var V = validOrigins('road'); if (!V.length) return null; o = pick(V);
      var exits = edgeNodes().filter(function (e) { return G.nodes[e].edge !== G.nodes[o.node].edge; }), ex = pick(exits), r = route(o.node, ex, true); if (!r) return null;
      var mid = G.nodes[r[Math.floor(r.length / 2)]];
      inc = newInc(type, tier, zoneAt(mid.x, mid.y), { x: mid.x, y: mid.y }, o, why); inc.cause = 'A delivery truck entered from ' + o.name + ' with Iteron drones on its tail. Robbery, escape, or something else?';
      v = { id: nid('v'), kind: 'truck', route: r, ri: 1, x: o.x, y: o.y, ang: 0, speed: I.truckSpeed, max: I.truckSpeed * (tier === 'major' ? 1.2 : 1), hp: I.truckHp, maxHp: I.truckHp, inc: inc.id, reckless: true, payload: pick(['escape', 'robbery', 'decoy']), color: '#f1f3f5' };
      S.vehicles.push(v); inc.vehicle = v.id; inc.vehicleKind = 'truck'; logSpawn(o.x, o.y, 'truck');
      var n = clamp(Math.round(ri(I.drones[0], I.drones[1]) * k * (tier === 'major' ? 1.5 : 1)) + S.iteron.mods.extraScouts, 1, 8);
      for (i = 0; i < n; i++) { spawnRobot('scout', o.x, o.y, inc.id, { st: 'engage' }); logSpawn(o.x, o.y, 'scout'); }
      ['stop_vehicle', 'disable_drones', 'protect_civilians', 'prevent_damage'].forEach(function (id) { addObj(inc, id); });
    } else if (type === 'bank_robbery') {
      var bank = doorPt('bank'), park = { x: bank.x, y: C.map.roadsY[1] + 1 };
      var Vb = validOrigins('road'); if (!Vb.length) return null; o = pick(Vb);
      var pnode = nearestNode(park.x, park.y), r3 = route(o.node, pnode, true); if (!r3) return null;
      inc = newInc(type, 'major', 'ledger', { x: bank.x, y: bank.y, b: 'bank' }, o, why); inc.cause = (why === 'calendar' ? 'Vault Vesper\'s seven-day heist plan reached its strike day.' : 'A crew using Iteron-built robots (bought by Vault Vesper) targets the bank.') + ' Their van entered from ' + o.name + '.';
      v = { id: nid('v'), kind: 'van', route: r3, ri: 1, x: o.x, y: o.y, ang: 0, speed: I.vanSpeed, max: I.vanSpeed, hp: I.vanHp, maxHp: I.vanHp, inc: inc.id, loot: false, color: '#343a40', phaseGoal: 'bank', reckless: true };
      S.vehicles.push(v); inc.vehicle = v.id; inc.vehicleKind = 'getaway van'; inc.phase = 'approach'; logSpawn(o.x, o.y, 'van');
      var nI = clamp(Math.round(ri(I.crew.interceptor[0], I.crew.interceptor[1]) * k), 1, 5); for (i = 0; i < nI; i++) spawnRobot('interceptor', o.x, o.y, inc.id, { riding: v.id, st: 'engage' });
      spawnRobot('commander', o.x, o.y, inc.id, { riding: v.id, st: 'engage' }); S.vesper.dronesBought += nI + 1; S.iteron.resources += 10 * (nI + 1);
      ['protect_civilians', 'stop_commander', 'stop_vehicle', 'recover_loot', 'prevent_damage'].forEach(function (id) { addObj(inc, id); });
    } else if (type === 'robot_ambush') {
      var hw = {}; Object.keys(S.heat).forEach(function (z) { hw[z] = z === 'foundry' ? 0 : 5 + S.heat[z]; });   // Iteron studies Mella's habits: he targets where she spends time
      var tz = wpick(hw) || 'plaza', tb = C.buildings.filter(function (b) { return b.zone === tz && b.kind !== 'villain'; });
      var tbb = tb.length ? (tb.filter(function (b) { return b.kind === 'infra' || b.kind === 'hq' || b.kind === 'shop' || b.kind === 'bank'; })[0] || pick(tb)) : null;
      var tgt = tbb ? Object.assign(doorPt(tbb.id), { b: tbb.id }) : { x: C.places.plaza[0], y: C.places.plaza[1] };
      var Vr = validOrigins('robot', tgt); if (!Vr.length) return null; o = Vr[0];
      inc = newInc(type, tier, zoneAt(tgt.x, tgt.y), tgt, o, why); inc.cause = 'Dr. Iteron sent generation ' + S.iteron.gen + ' robots out of ' + o.name + ' toward ' + (tbb ? tbb.name : 'Skate Plaza') + (S.heat[tz] > 60 ? ', a place Mella spends a lot of time.' : '.');
      var comp = tier === 'major' ? I.major : I.minor;
      Object.keys(comp).forEach(function (cls) { var n2 = clamp(Math.round(ri(comp[cls][0], comp[cls][1]) * (cls === 'commander' ? 1 : k)) + (cls === 'scout' ? S.iteron.mods.extraScouts : 0), 0, 8); if (comp[cls][1] === 0) n2 = 0;
        for (var j = 0; j < n2; j++) { spawnRobot(cls, o.x + rr(-.3, .3), o.y + rr(-.3, .3), inc.id, cls === 'scout' && rnd() < S.iteron.mods.disguise ? { disguised: true } : null); logSpawn(o.x, o.y, cls); } });
      ['protect_civilians', 'prevent_damage'].forEach(function (id) { addObj(inc, id); }); if (comp.commander[1] > 0) addObj(inc, 'stop_commander');
    } else if (type === 'scout_sighting') {
      var Vs = validOrigins('robot'); if (!Vs.length) return null; o = pick(Vs); var z2 = wpick(Object.assign({}, S.heat, { foundry: 0 })) || 'plaza', zb = C.buildings.filter(function (b) { return b.zone === z2 && b.kind !== 'villain'; }), b2 = zb.length ? pick(zb) : C.buildings[0], tp = doorPt(b2.id);
      inc = newInc(type, 'minor', z2, tp, o, why); inc.cause = 'A drone that looks like a delivery drone left ' + o.name + ' and is watching ' + b2.name + '.';
      spawnRobot('scout', o.x, o.y, inc.id, { disguised: true, st: 'travel', watcher: true }); logSpawn(o.x, o.y, 'scout');
    }
    if (!inc) return null;
    var Dr = S.director; Dr.last[type] = S.t; Dr.recent.unshift(type); Dr.recent = Dr.recent.slice(0, 4); Dr.recentZones.unshift(inc.zone); Dr.recentZones = Dr.recentZones.slice(0, 4);
    Dr.log.push({ t: +S.t.toFixed(2), clock: inc.startClock, id: inc.id, type: type, tier: tier, zone: inc.zone, origin: inc.origin.name, originDistTiles: +distPlayer(inc.origin.x, inc.origin.y).toFixed(2), why: why }); if (Dr.log.length > 300) Dr.log.shift();
    if (type !== 'scout_sighting' && !inc.div) feed((type === 'vehicle_chase' ? 'Something is wrong: a truck is speeding toward ' + C.zones[inc.zone].name + ' with drones behind it.' : type === 'bank_robbery' ? 'A dark van is heading for First Ledger Bank.' : 'Iteron robots are moving toward ' + C.zones[inc.zone].name + '.'), 'alert');
    if (type !== 'scout_sighting') considerResponse(inc);
    emit('incident', inc); return inc;
  }
  function stepIncident(inc, dt) {
    if (inc.div) return divStepIncident(inc, dt);
    var v = inc.vehicle && S.vehicles.filter(function (q) { return q.id === inc.vehicle; })[0];
    if (distPlayer(inc.x, inc.y) < 10) inc.mellaNearSec += dt;
    if (v && !v.exited && !v.stopped) { inc.x = v.x; inc.y = v.y; if (v.protT > 0) v.protT -= dt; }
    if (inc.type === 'bank_robbery') {
      if (inc.phase === 'approach' && v && v.stopped) inc.phase = 'escape';
      else if (inc.phase === 'approach' && v && v.parked) { inc.phase = 'robbing'; inc.robT = C.incidents.bank_robbery.robTime;
        S.robots.forEach(function (r) { if (r.riding === v.id) { r.riding = null; r.st = 'engage'; r.x = v.x + rr(-1, 1); r.y = v.y - rr(.8, 1.6); } });
        feed('Robbery in progress at First Ledger Bank!', 'alert'); S.zones.ledger.crime = clamp(S.zones.ledger.crime + 5, 0, 100);
        S.civs.forEach(function (c) { if (c.inside === 'bank') { var dp = doorPt('bank'); c.inside = null; c.x = dp.x; c.y = dp.y; c.needs.safety = .1; c.think = 0; inc.witnesses[c.id] = 1; } }); }
      if (inc.phase === 'robbing') { inc.robT -= dt; if (inc.robT <= 0 || (v && v.stopped)) { inc.phase = 'escape';
          if (v && !v.stopped) { v.loot = true; v.phaseGoal = 'exit'; var here = nearestNode(v.x, v.y), ex = pick(edgeNodes().filter(function (e) { return hyp(G.nodes[e].x - inc.origin.x, G.nodes[e].y - inc.origin.y) > 10; })); var r = route(here, ex, true);
            if (r) { v.route = r; v.ri = 1; } v.parked = false; v.max = C.incidents.bank_robbery.vanSpeed * 1.25; v.ranRed = false;
            S.robots.forEach(function (rb) { if (rb.inc === inc.id && rb.st !== 'down' && rb.cls === 'commander' && D(rb, v) < 6) rb.riding = v.id; }); feed('The getaway van is fleeing with the money!', 'alert'); } } }
    }
    S.items.forEach(function (it) { if (it.inc === inc.id) { it.t -= dt; if (it.t <= 0) { it.gone = true; objFail(inc, 'capture_prototype'); damageBuilding((nearestBuilding(it.x, it.y, 8) || G.bmap.office).id, 4, inc); feed('The prototype core self-destructed.', 'city'); } } });
    S.items = S.items.filter(function (it) { return !it.gone; });
    var live = S.robots.filter(function (r) { return r.inc === inc.id && r.st !== 'down' && !r.gone; });
    if (inc.type === 'scout_sighting') { var sc = live[0]; if (sc && !sc.fleeing && S.t > inc.start + 45) { sc.fleeing = true; sc.trackT = 0; addObj(inc, 'track_signal'); } }
    inc.commanderDown = inc.objectives.some(function (o) { return o.id === 'stop_commander' && o.state === 'done'; });
    if (inc.commanderDown && !inc.fledAfterCmd) { inc.fledAfterCmd = true; live.filter(function (r) { return r.cls === 'scout' && !r.fleeing; }).slice(0, 1).forEach(startFlee); }
    if (v && v.exited) { objFail(inc, 'stop_vehicle'); objFail(inc, 'recover_loot'); }
    var vDone = !v || v.exited || (v.stopped && !v.loot && !(v.payload && !v.payloadSeen));
    var itemsLeft = S.items.some(function (it) { return it.inc === inc.id; });
    var hostilesLeft = live.length, injuredLeft = S.supers.some(function (s) { return s.state === 'injured' && s.injInc === inc.id; });
    if (inc.phase !== 'approach' && inc.phase !== 'robbing' && hostilesLeft === 0 && vDone && !itemsLeft && !injuredLeft) return resolve(inc, 'cleared');
    if (S.t >= inc.deadline && inc.phase !== 'robbing') return resolve(inc, 'deadline');
  }
