
  /* =============================================================== THE DIVIDER — the hero manipulator (owner spec t83u §2; owner picked him next, t88s472)
     PROPOSED ORIGINAL villain. He never fights. He plans with a resource budget, plants forged evidence, rents Iteron drones to broadcast doctored
     footage, turns the five supers against each other (or against Mella), drags public opinion down through zone confidence and hero reputation,
     and recruits a rival team. He adapts to how he was beaten. All numbers PROPOSED (config: divider). */
  function divInit() {
    S.divider = { resources: C.divider.baseResources, exposure: 0, dormantUntil: 0, planDay: 0, plannedOp: null, plannedAt: 0, ops: 0, rival: null,
      learn: { exposedByMella: 0, exposedByHeroes: 0, deescalated: 0, repProtected: 0, succeeded: 0, failedBy: {} },
      mods: { forgery: 1, targetMella: C.divider.targetMellaBase, drones: 1 }, history: [] };
    S.rep = { mella: C.divider.repStart }; C.supers.forEach(function (d) { S.rep[d.id] = C.divider.repStart; });
  }
  function repName(id) { return id === 'mella' ? 'Mella' : sdef(id).codename; }
  function divAdapt() {   // learning: how was he beaten? (PROPOSED rules)
    var V = S.divider, L = V.learn, DV = C.divider;
    V.mods.forgery = +Math.min(DV.forgeryMax, 1 + .5 * (L.exposedByMella + L.exposedByHeroes * .5)).toFixed(2);   // better forgeries the more he is exposed
    V.mods.targetMella = +Math.min(.85, DV.targetMellaBase + .15 * L.exposedByMella).toFixed(2);                   // Mella keeps exposing him -> he frames Mella
    V.mods.drones = Math.min(3, 1 + Math.floor((L.exposedByHeroes + L.repProtected) / 2));                         // heroes keep protecting reputations -> more broadcast drones
  }
  function divPlan() {
    var V = S.divider, DV = C.divider, L = V.learn, M = S.director.mode;
    V.resources = Math.min(DV.maxResources, V.resources + DV.dailyResources);
    if (rnd() > DV.opsPerDay[M]) { V.history.push({ day: clock().day, plan: 'lie low' }); return; }
    var w = { frame_up: V.resources >= DV.cost.frame_up ? 1 + L.deescalated * .35 : 0,          // de-escalations keep ending his fights -> forge more
              staged_fight: V.resources >= DV.cost.staged_fight ? 1 + L.repProtected * .35 + L.succeeded * .1 : 0,   // reputations keep being protected -> stage fights
              recruit: !V.rival && V.resources >= DV.cost.recruit ? .7 : 0 };
    var op = wpick(w); if (!op) { V.history.push({ day: clock().day, plan: 'saving resources' }); return; }
    if (op === 'recruit') { divRecruit(); return; }
    V.plannedOp = op; V.plannedAt = absMin() + rr(DV.delayMin[0], DV.delayMin[1]); V.history.push({ day: clock().day, plan: op, at: Math.round(V.plannedAt) });
  }
  function divRecruit() {
    var V = S.divider; V.resources -= C.divider.cost.recruit;
    var cand = S.supers.filter(function (s) { return s.state !== 'captured'; }).map(function (s) { var r = 0; for (var k in s.rel) r += s.rel[k]; return { s: s, r: r + s.mellaRel + (sdef(s.id).temperament === 'destructive' ? -20 : 0) }; }).sort(function (a, b) { return a.r - b.r || (a.s.id < b.s.id ? -1 : 1); })[0];
    if (!cand) return; V.rival = { id: cand.s.id, name: C.divider.rivalTeamName, until: absMin() + C.divider.rivalDays * 1440 };
    var t = 'Clue: ' + sdef(cand.s.id).codename + ' has been seen with an anonymous sponsor and now calls a crew "' + C.divider.rivalTeamName + '". Someone is recruiting a rival team.';
    histNote(t); feed(t, 'clue'); V.history.push({ day: clock().day, plan: 'recruit', who: cand.s.id });
  }
  function dividerStep(dt) {
    if (!S.divider) divInit(); var V = S.divider, c = clock(), am = absMin();
    if (V.rival && am >= V.rival.until) { feed(C.divider.rivalTeamName + ' quietly broke up.', 'city'); V.rival = null; }
    if (V.dormantUntil && am < V.dormantUntil) return;
    if (V.planDay !== c.day && c.minute >= C.divider.planMinute) { V.planDay = c.day; divPlan(); }
    if (V.plannedOp && am >= V.plannedAt && !S.incidents.some(function (i) { return i.div; })) {
      if (startIncident(V.plannedOp, C.incidents[V.plannedOp].tier, 'divider')) V.plannedOp = null; else V.plannedAt = am + 5; }
    S.incidents.forEach(function (i) { if (i.div) divTick(i, dt); });
    for (var k in S.rep) S.rep[k] = clamp(S.rep[k] + (C.divider.repStart - S.rep[k]) * dt * C.clock.gameMinPerSec / 4320, 0, 100);   // reputations heal slowly (3 game days)
  }
  function siteFar() {   // a plausible location (building door) that is not near Mella
    var bs = C.buildings.filter(function (b) { if (b.kind === 'villain') return false; var p = doorPt(b.id); return spawnOK(p.x, p.y); });
    if (!bs.length) return null; var b = pick(bs), p = doorPt(b.id); return { x: p.x, y: p.y + .4, b: b.id, name: b.name };
  }
  function rentDrones(inc, n, cls, extra) {   // Iteron <-> Divider: he rents Iteron hardware; Iteron gets resources and watches the heroes fight
    var o = validOrigins('robot', inc.target); if (!o.length) return 0; var org = o[0];
    for (var i = 0; i < n; i++) { spawnRobot(cls, org.x + rr(-.3, .3), org.y + rr(-.3, .3), inc.id, Object.assign({ disguised: true, rented: true }, extra || {})); logSpawn(org.x, org.y, cls); }
    S.iteron.resources += C.divider.iteronFee * n; inc.notes.push('The Divider rented ' + n + ' Iteron ' + (cls === 'scout' ? 'drone' : 'interceptor') + (n > 1 ? 's' : '') + ' (out of ' + org.name + ').'); return n;
  }
  function startDivider(type, why) {
    var V = S.divider || (divInit(), S.divider), DV = C.divider, site = siteFar(); if (!site) return null;
    if (type === 'frame_up') {
      var tgt = rnd() < V.mods.targetMella ? 'mella' : S.supers.filter(function (s) { return s.state !== 'captured'; }).sort(function (a, b) { return S.rep[b.id] - S.rep[a.id] || (a.id < b.id ? -1 : 1); })[0].id;
      var inc = newInc('frame_up', 'minor', G.bmap[site.b].zone, site, { x: site.x, y: site.y, name: site.name }, why); inc.div = { op: type, target: tgt, rep0: S.rep[tgt], exposed: null, forgery: V.mods.forgery, turned: {} };
      inc.cause = 'Doctored footage "shows" ' + repName(tgt) + ' wrecking ' + site.name + '. Forged evidence was planted at the door, and drones are broadcasting the clip. Somebody wants the city to turn on ' + repName(tgt) + '.';
      S.items.push({ id: nid('it'), kind: 'evidence', x: site.x + .6, y: site.y + .3, inc: inc.id, t: 1e9, prog: 0, label: 'forged evidence' }); logSpawn(site.x, site.y, 'evidence');
      rentDrones(inc, V.mods.drones + (S.director.mode === 'chaos' ? 1 : 0), 'scout', { broadcast: true });
      ['expose_evidence', 'protect_reputation', 'disable_drones'].forEach(function (id) { addObj(inc, id); });
      damageBuilding(site.b, 6, inc);   // the "evidence" is a real, small act of vandalism
      V.resources -= DV.cost.frame_up; feed('Something is wrong: clips of ' + repName(tgt) + ' "wrecking" ' + site.name + ' are all over the district.', 'alert');
      return inc; }
    // staged_fight: pick two supers with the worst mutual relationship (or a super against Mella when he is targeting her)
    var avail = S.supers.filter(function (s) { return s.state === 'patrol' && s.hp > s.max * .5; }); if (avail.length < 1) return null;
    var pair = null;
    if (rnd() < V.mods.targetMella * .6) { var sm = avail.slice().sort(function (a, b) { return a.mellaRel - b.mellaRel || (a.id < b.id ? -1 : 1); })[0]; if (sm.mellaRel < 6) pair = [sm.id, 'mella']; }
    if (!pair && avail.length === 1) pair = [avail[0].id, 'mella'];
    if (!pair) { if (avail.length < 2) return null; var best = null; avail.forEach(function (a) { avail.forEach(function (b) { if (a.id >= b.id) return; var r = (a.rel[b.id] || 0) + (b.rel[a.id] || 0) + rr(-6, 6); if (!best || r < best.r) best = { r: r, a: a.id, b: b.id }; }); }); pair = [best.a, best.b]; }
    var inc2 = newInc('staged_fight', 'major', G.bmap[site.b].zone, site, { x: site.x, y: site.y, name: site.name }, why);
    inc2.div = { op: type, fighters: pair.slice(), calm: {}, exposed: null, forgery: V.mods.forgery, ended: null };
    inc2.cause = 'A forged message convinced ' + repName(pair[0]) + ' that ' + repName(pair[1]) + ' sold them out to Iteron. They are squaring off at ' + site.name + '. Somebody staged this.';
    S.items.push({ id: nid('it'), kind: 'evidence', x: site.x - .7, y: site.y + .4, inc: inc2.id, t: 1e9, prog: 0, label: 'holo-projector (the forged message)' }); logSpawn(site.x, site.y, 'evidence');
    pair.forEach(function (id, i) { if (id === 'mella') return; var s = S.supers.filter(function (x) { return x.id === id; })[0], other = pair[1 - i];
      s.state = 'feud'; s.inc = inc2.id; s.obj = 'feud'; s.feud = other; s.path = []; if (other !== 'mella') s.rel[other] = (s.rel[other] || 0) - DV.feudRelHit; else s.mellaRel -= 6; inc2.heroes.push(id); inc2.div.calm[id] = 0; });
    rentDrones(inc2, 1 + (S.director.mode === 'chaos' ? 1 : 0), 'interceptor', { keepFight: true }); S.iteron.observedSec += 60;
    ['deescalate_heroes', 'expose_evidence', 'protect_civilians', 'prevent_damage'].forEach(function (id) { addObj(inc2, id); });
    V.resources -= DV.cost.staged_fight; feed('A hero fight is breaking out at ' + site.name + ': ' + repName(pair[0]) + ' vs ' + repName(pair[1]) + '!', 'alert');
    return inc2;
  }
  function feuding(inc) { return inc.div.fighters.filter(function (id) { if (id === 'mella') return inc.div.fighters.some(function (o) { return o !== 'mella' && feuding1(o, inc); }); return feuding1(id, inc); }); }
  function feuding1(id, inc) { var s = S.supers.filter(function (x) { return x.id === id; })[0]; return s && s.state === 'feud' && s.inc === inc.id; }
  function stepFeud(s, dt) {   // a duped super fights the hero they were told betrayed them
    var d = sdef(s.id), inc = incById(s.inc); if (!inc) { s.state = 'patrol'; s.feud = null; s.inc = null; s.obj = null; return; }
    if (s.feud === 'mella') { var dm = seek(s, S.player.x, S.player.y, d.power.speed * .8, dt); s.hitT = (s.hitT || 0) - dt;
      if (dm < Math.max(1.3, d.power.range) && s.hitT <= 0) { s.hitT = 2.2; hurtPlayer(d.codename + ' (duped by The Divider)'); } return; }
    var o = S.supers.filter(function (x) { return x.id === s.feud; })[0]; if (!o || o.state === 'injured' || o.state === 'captured') { s.state = 'patrol'; s.feud = null; s.inc = null; s.obj = null; return; }
    var dist = seek(s, o.x, o.y, d.power.speed * .7, dt);
    if (dist < Math.max(d.power.range, 1.3) + .3) { o.hp -= d.power.dps * C.divider.feudDps * dt * (1 - (sdef(o.id).power.shield || 0)); if (rnd() < C.divider.feudCollateral * dt) collateral(o.x, o.y, 3, d.codename);
      if (o.hp <= 0) { injureSuper(o, inc); inc.notes.push(d.codename + ' put ' + sdef(o.id).codename + ' in the clinic. The Divider got his headline.'); } }
  }
  function calmFighter(inc, id, amt, by) { if (inc.div.calm[id] == null || !feuding1(id, inc)) return false; inc.div.calm[id] = Math.min(1, inc.div.calm[id] + amt); inc.div.calmBy = inc.div.calmBy || {}; inc.div.calmBy[by] = (inc.div.calmBy[by] || 0) + amt;
    if (inc.div.calm[id] >= 1) { var s = S.supers.filter(function (x) { return x.id === id; })[0]; s.state = 'engage'; s.obj = 'expose_evidence'; s.feud = null; s.cd = 6; feed(sdef(id).codename + ' stands down' + (by === 'mella' ? ' after Mella talks them out of it.' : by ? ' (' + nameOf(by) + ' got through to them).' : '.'), 'hero'); }
    return true; }
  function divTick(inc, dt) {   // per-step pressure: reputation drain, opinion, turning heroes
    var D0 = inc.div, gm = dt * C.clock.gameMinPerSec, DV = C.divider;
    if (D0.op === 'frame_up' && !D0.exposed) { var dr = S.robots.filter(function (r) { return r.inc === inc.id && r.broadcast && r.st !== 'down'; }).length;
      if (dr) { S.rep[D0.target] = clamp(S.rep[D0.target] - DV.repDrainPerGameMin * dr * gm, 0, 100); S.zones[inc.zone].confidence = clamp(S.zones[inc.zone].confidence - DV.confDrainPerGameMin * dr * gm, 0, 100);
        S.supers.forEach(function (s) { if (s.id === D0.target) return; if (D0.target === 'mella') s.mellaRel -= DV.turnPerGameMin * gm; else s.rel[D0.target] = (s.rel[D0.target] || 0) - DV.turnPerGameMin * gm; });
        S.civs.forEach(function (c) { if (c.inside || D0.turned[c.id]) return; if (S.robots.some(function (r) { return r.inc === inc.id && r.broadcast && r.st !== 'down' && D(r, c) < 6; })) { D0.turned[c.id] = 1; if (D0.target === 'mella') c.opinion = clamp(c.opinion - 6, -100, 100);
          Brain.remember(c, { t: Math.floor(absMin()), k: 'heard', v: -.4, inc: inc.id, txt: 'the clip of ' + repName(D0.target) + ' wrecking ' + (G.bmap[inc.targetB] ? G.bmap[inc.targetB].name : 'a building') }); } }); } }
  }
  function divExamine(it, by) {   // Mella (E) or a super examines the planted evidence
    var inc = incById(it.inc); if (!inc || !inc.div) return null; var q = inc.div.forgery;
    it.prog = Math.min(1, it.prog + (by === 'mella' ? 1 / Math.max(1, Math.round(q)) + 1e-9 : 0)); if (it.prog < 1) return { kind: 'evidence', who: 'Evidence', line: 'It looks real at first glance… look closer (press again). Forgery quality ' + q.toFixed(1) + '.' };
    divExpose(inc, it, by); return { kind: 'evidence', who: 'Evidence', line: inc.div.op === 'frame_up' ? 'Forged. The timestamps are spliced and the "hero" in the clip is a hologram. ' + repName(inc.div.target) + ' is cleared.' : 'A holo-projector loaded with a forged message. Whoever planted this wanted the heroes to fight.' };
  }
  function divExpose(inc, it, by) {
    var D0 = inc.div; if (D0.exposed) return; D0.exposed = by; S.items = S.items.filter(function (x) { return x !== it; }); objDone(inc, 'expose_evidence', by);
    var V = S.divider; V.exposure = clamp(V.exposure + C.divider.exposeGain, 0, 100); if (by === 'mella') V.learn.exposedByMella++; else V.learn.exposedByHeroes++;
    if (D0.op === 'frame_up') { S.rep[D0.target] = clamp(Math.min(S.rep[D0.target] + C.divider.repRestore, Math.max(D0.rep0, S.rep[D0.target])), 0, 100); S.supers.forEach(function (s) { if (D0.target === 'mella') s.mellaRel += 4; else if (s.id !== D0.target) s.rel[D0.target] = (s.rel[D0.target] || 0) + 4; }); }
    else { D0.fighters.forEach(function (id) { if (id !== 'mella' && feuding1(id, inc)) calmFighter(inc, id, 1, by); }); var a = D0.fighters[0], b = D0.fighters[1]; if (a !== 'mella' && b !== 'mella') { S.supers.forEach(function (s) { if (s.id === a) s.rel[b] = (s.rel[b] || 0) + C.divider.feudRelHit * .75; if (s.id === b) s.rel[a] = (s.rel[a] || 0) + C.divider.feudRelHit * .75; }); } }
    feed(nameOf(by) + ' exposed the forged evidence: The Divider staged this.', 'hero'); inc.notes.push(nameOf(by) + ' exposed The Divider\'s forged evidence.');
    if (V.exposure >= 100) { V.exposure = C.divider.exposureAfterBust; V.dormantUntil = absMin() + C.divider.dormantDays * 1440; V.plannedOp = null;
      Object.keys(S.zones).forEach(function (z) { S.zones[z].confidence = clamp(S.zones[z].confidence + 5, 0, 100); });
      var t = 'The Divider has been publicly exposed. His sponsor network goes quiet for ' + C.divider.dormantDays + ' days, and the city breathes again.'; histNote(t); feed(t, 'history'); }
  }
  function divEngage(s, d, inc, dt) {   // supers pursuing Divider objectives; returns true if handled
    if (!inc.div) return false;
    var ev = S.items.filter(function (it) { return it.inc === inc.id && it.kind === 'evidence'; })[0];
    if (s.obj === 'expose_evidence' && ev) { var dd = seek(s, ev.x, ev.y, d.power.speed, dt); s.state = dd < 8 ? 'engage' : 'respond'; if (dd < 1.4) { ev.prog = Math.min(1, ev.prog + dt / (C.divider.heroExamineSec * inc.div.forgery)); if (ev.prog >= 1) divExpose(inc, ev, s.id); } return true; }
    if (s.obj === 'deescalate_heroes') { var f = S.supers.filter(function (x) { return x.state === 'feud' && x.inc === inc.id; }).sort(function (a, b) { return D(a, s) - D(b, s); })[0]; if (!f) return false;
      var d2 = seek(s, f.x, f.y, d.power.speed, dt); s.state = d2 < 8 ? 'engage' : 'respond'; if (d2 < 2) calmFighter(inc, f.id, dt * (d.temperament === 'cautious' ? .1 : .06), s.id); return true; }
    if (s.obj === 'join_fight') { var foe = S.supers.filter(function (x) { return x.state === 'feud' && x.inc === inc.id && x.id !== s.id; }).sort(function (a, b) { return (s.rel[a.id] || 0) - (s.rel[b.id] || 0); })[0]; if (!foe) return false;
      var d3 = seek(s, foe.x, foe.y, d.power.speed, dt); s.state = 'engage'; if (d3 < d.power.range + .4) { foe.hp -= d.power.dps * C.divider.feudDps * dt; if (d.power.collateral && rnd() < d.power.collateral * dt) collateral(foe.x, foe.y, 4, d.codename); if (foe.hp <= 0) injureSuper(foe, inc); }
      if (!inc.div.joined) { inc.div.joined = s.id; inc.notes.push(d.codename + (S.divider.rival && S.divider.rival.id === s.id ? ' (' + S.divider.rival.name + ')' : '') + ' joined the fight instead of stopping it.'); feed(d.codename + ' is making the hero fight worse!', 'alert'); } return true; }
    return false;
  }
  function divObjective(s, d, inc) {   // objective preferences for Divider incidents (temperament-driven, PROPOSED)
    var open = inc.objectives.filter(function (o) { return o.state === 'open'; }).map(function (o) { return o.id; });
    var rival = S.divider && S.divider.rival && S.divider.rival.id === s.id;
    if (inc.div.op === 'staged_fight' && (rival || d.temperament === 'destructive') && feuding(inc).length && rnd() < (rival ? .8 : .45)) return 'join_fight';
    if (inc.div.op === 'frame_up' && inc.div.target === s.id && open.indexOf('expose_evidence') >= 0) return 'expose_evidence';
    var order = d.temperament === 'cautious' || d.temperament === 'protective' ? ['deescalate_heroes', 'protect_civilians', 'expose_evidence'] : d.temperament === 'analytical' ? ['expose_evidence', 'disable_drones', 'deescalate_heroes'] : ['disable_drones', 'deescalate_heroes', 'expose_evidence'];
    for (var i = 0; i < order.length; i++) if (open.indexOf(order[i]) >= 0 && (order[i] !== 'deescalate_heroes' || feuding(inc).length)) return order[i];
    return null;
  }
  function divStepIncident(inc, dt) {   // resolution rules for Divider incidents
    var D0 = inc.div; if (distPlayer(inc.x, inc.y) < 10) inc.mellaNearSec += dt;
    var drones = S.robots.filter(function (r) { return r.inc === inc.id && r.st !== 'down' && !r.gone; });
    if (D0.op === 'frame_up') { if (D0.exposed && !drones.some(function (r) { return r.broadcast; })) return resolve(inc, 'cleared'); }
    else { var f = feuding(inc); if (!f.length && !D0.ended) D0.ended = S.t; if (D0.ended && S.t - D0.ended > 20 && !drones.length && !S.supers.some(function (s) { return s.state === 'injured' && s.injInc === inc.id; })) return resolve(inc, 'cleared'); }
    if (S.t >= inc.deadline) return resolve(inc, 'deadline');
  }
  function divBeforeResolve(inc) {   // settle the Divider objectives before the generic resolution
    var D0 = inc.div, V = S.divider;
    if (D0.op === 'frame_up') { var lost = D0.rep0 - S.rep[D0.target]; if (lost <= C.divider.repLossOK && (inc.mellaNearSec > 3 || inc.heroes.length || D0.exposed)) objDone(inc, 'protect_reputation', D0.exposed || (inc.mellaNearSec > 10 ? 'mella' : inc.heroes[0])); else objFail(inc, 'protect_reputation'); if (!D0.exposed) objFail(inc, 'expose_evidence'); }
    else { var calmAll = D0.fighters.filter(function (id) { return id !== 'mella'; }).every(function (id) { return D0.calm[id] >= 1; });
      if (calmAll) { var by = D0.exposed || Object.keys(D0.calmBy || {}).sort(function (a, b) { return D0.calmBy[b] - D0.calmBy[a]; })[0] || null; objDone(inc, 'deescalate_heroes', by); } else objFail(inc, 'deescalate_heroes');
      if (!D0.exposed) objFail(inc, 'expose_evidence');
      S.supers.forEach(function (s) { if (s.state === 'feud' && s.inc === inc.id) { s.state = 'patrol'; s.feud = null; s.inc = null; s.obj = null; } }); }
    S.items = S.items.filter(function (it) { return !(it.inc === inc.id && it.kind === 'evidence'); });
    var done = function (id) { return inc.objectives.some(function (o) { return o.id === id && o.state === 'done'; }); };
    if (done('deescalate_heroes')) V.learn.deescalated++; if (done('protect_reputation')) V.learn.repProtected++;
    if (!D0.exposed && !done('deescalate_heroes') && !done('protect_reputation')) { V.learn.succeeded++; V.resources += C.divider.winBonus; S.zones[inc.zone].confidence = clamp(S.zones[inc.zone].confidence - 6, 0, 100);
      if (D0.op === 'staged_fight') D0.fighters.forEach(function (id) { if (id !== 'mella') S.rep[id] = clamp(S.rep[id] - 12, 0, 100); }); }
    divAdapt();
  }
  sim.divider = function () { return S.divider; };
  sim.dividerStatus = function () { var V = S.divider || {}, zs = Object.keys(S.zones); return { dormant: !!(V.dormantUntil && absMin() < V.dormantUntil), planned: V.plannedOp || null, exposure: V.exposure || 0, rival: V.rival || null,
    confidence: zs.reduce(function (a, z) { return a + S.zones[z].confidence; }, 0) / zs.length }; };
  sim.calmFighters = function (radius) {   // Mella's CALM near feuding heroes
    var n = 0; S.incidents.forEach(function (i) { if (!i.div || i.div.op !== 'staged_fight') return; S.supers.forEach(function (s) { if (s.state === 'feud' && s.inc === i.id && distPlayer(s.x, s.y) < radius) { if (calmFighter(i, s.id, C.divider.mellaCalm, 'mella')) { n++; i.mellaActs++; } } }); }); return n; };
