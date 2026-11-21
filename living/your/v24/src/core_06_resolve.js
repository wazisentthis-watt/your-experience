  function resolve(inc, how) {
    var v = inc.vehicle && S.vehicles.filter(function (q) { return q.id === inc.vehicle; })[0];
    if (inc.div) divBeforeResolve(inc);
    var anyone = inc.mellaNearSec > 3 || inc.mellaActs > 0 || inc.heroes.some(function (h) { var s = S.supers.filter(function (x) { return x.id === h; })[0]; return s && s.state !== 'alerted'; });
    if (inc.objectives.some(function (o) { return o.id === 'protect_civilians'; })) { if (inc.civInjured === 0 && anyone) objDone(inc, 'protect_civilians', inc.mellaNearSec > 10 ? 'mella' : inc.heroes[0]); else objFail(inc, 'protect_civilians'); }
    if (inc.objectives.some(function (o) { return o.id === 'prevent_damage'; })) { if (inc.dmg <= 8 && anyone) objDone(inc, 'prevent_damage', inc.mellaNearSec > 10 ? 'mella' : inc.heroes[0] || null); else objFail(inc, 'prevent_damage'); }
    ['stop_commander', 'disable_drones', 'track_signal', 'capture_prototype', 'stop_vehicle', 'recover_loot', 'save_hero'].forEach(function (id) { objFail(inc, id); });
    S.supers.forEach(function (s) { if (s.state === 'injured' && s.injInc === inc.id) { var robotsStand = S.robots.some(function (r) { return r.inc === inc.id && r.st !== 'down' && !r.riding && D(r, s) < 6; });
      if (robotsStand && rnd() < .5) { s.state = 'captured'; s.capturedUntil = absMin() + 1440; S.iteron.captured.push(s.id); inc.notes.push(sdef(s.id).codename + ' was captured by Iteron.'); }
      else { s.state = 'recover'; var cl = doorPt('clinic'); setPath(s, cl.x, cl.y); inc.notes.push(sdef(s.id).codename + ' was carried to the clinic.'); } } });
    S.robots.forEach(function (r) { if (r.inc === inc.id && r.st !== 'down') { if (!r.fleeing && r.tracked == null) r.trackInc = null; r.fleeing = true; r.riding = null; r.inc = null; } });
    var done = inc.objectives.filter(function (o) { return o.state === 'done'; }).length, failed = inc.objectives.filter(function (o) { return o.state === 'failed'; }).length, score = done / Math.max(1, done + failed);
    var outcome = inc.type === 'scout_sighting' ? (done ? 'tracked' : 'unnoticed') : score >= .7 ? 'contained' : score >= .35 ? 'partial' : 'failed';
    var mella = inc.mellaActs > 0 || inc.mellaNearSec > 10;
    var Z = S.zones[inc.zone], cons = [];
    inc.objectives.forEach(function (o) { var c = C.objectives[o.id][o.state === 'done' ? 'done' : 'failed'] || {}; for (var k in c) applyCons(Z, k, c[k], o, inc, cons); });
    if (inc.type === 'bank_robbery' && outcome !== 'contained') { Z.security = Math.min(3, Z.security + 1); cons.push('city security robots will patrol Ledger Row from tomorrow'); }
    if (inc.type !== 'scout_sighting') { if (outcome === 'failed') { Z.faction.iteron = clamp(Z.faction.iteron + 6, 0, 100); Z.faction.city = clamp(Z.faction.city - 6, 0, 100); } else { Z.faction.iteron = clamp(Z.faction.iteron - 3, 0, 100); Z.faction.city = clamp(Z.faction.city + 3, 0, 100); } if (inc.type === 'bank_robbery') Z.faction.vesper = clamp(Z.faction.vesper + (outcome === 'contained' ? -5 : 8), 0, 100); }
    if (mella) S.iteron.encounters++;
    var heroNames = inc.heroes.map(function (h) { return sdef(h).codename; });
    var byWho = {}; inc.objectives.forEach(function (o) { if (o.state === 'done' && o.by) byWho[o.by] = (byWho[o.by] || []).concat([o.label.toLowerCase()]); });
    var parts = Object.keys(byWho).map(function (w) { return nameOf(w) + ': ' + byWho[w].join(', '); });
    var H = { id: inc.id, type: inc.type, label: inc.label, tier: inc.tier, zone: inc.zone, zoneName: C.zones[inc.zone].name, when: inc.startClock, day: clock().day, end: stamp(), outcome: outcome, how: how, mella: mella,
      heroes: inc.heroes.slice(), heroNames: heroNames, cause: inc.cause, origin: inc.origin.name, objectives: inc.objectives.map(function (o) { return { id: o.id, label: o.label, state: o.state, by: o.by }; }),
      civInjured: inc.civInjured, damage: Math.round(inc.dmg), notes: inc.notes.slice(), consequences: cons, payload: inc.payload || null };
    H.text = inc.startClock + ' – ' + stamp().slice(4) + ' · ' + C.zones[inc.zone].name + ' · ' + inc.label + ' — ' + outcome.toUpperCase() + '. ' + (parts.length ? parts.join('; ') + '. ' : 'Nobody completed an objective. ') + (mella ? '' : 'Mella was not there. ') + (inc.civInjured ? inc.civInjured + ' civilian(s) hurt. ' : '') + inc.notes.join(' ');
    S.history.push(H); if (S.history.length > 250) S.history.shift();
    S.civs.forEach(function (c) { var w = inc.witnesses[c.id], local = G.bmap[c.home].zone === inc.zone || (G.bmap[c.job] && G.bmap[c.job].zone === inc.zone);
      if (!w && !local) return; if (inc.type === 'scout_sighting') return;
      if (c.mem.some(function (m) { return m.inc === inc.id && (m.k === 'rescued' || m.k === 'hurt'); })) return;
      var k = w ? (mella ? 'saw_help' : 'absent') : 'heard', vv = mella ? (outcome === 'failed' ? .1 : .6) : (local ? -.3 : 0); if (!w && mella) vv = .4;
      Brain.remember(c, { t: Math.floor(absMin()), k: k, inc: inc.id, v: vv, txt: 'the ' + inc.label.toLowerCase() + ' in ' + C.zones[inc.zone].name }); c.opinion = clamp(c.opinion + vv * 10, -100, 100); });
    S.supers.forEach(function (s) { if (inc.heroes.indexOf(s.id) >= 0) { Brain.remember(s, { t: Math.floor(absMin()), k: 'fought', inc: inc.id, v: outcome === 'contained' ? .5 : -.2, mella: mella }); if (mella) s.mellaRel += outcome === 'failed' ? 1 : 3; s.fatigue += .15; } });
    if (mella && inc.type !== 'scout_sighting') { var eff = [{ layer: 'knowledge', key: 'city.' + inc.zone + '.incidents', kind: 'record', op: 'delta', amount: 1, text: H.text.slice(0, 180) }];
      inc.objectives.forEach(function (o) { if (o.state === 'done' && o.by === 'mella' && o.id === 'save_hero') inc.injuredHeroes.forEach(function (h) { eff.push({ layer: 'relationships', key: 'rel.npc.' + h, kind: 'upgrade', op: 'delta', amount: 2, text: 'Mella saved ' + sdef(h).codename }); }); });
      S.outbox.push({ eventId: 'your:living:' + S.saveId + ':' + inc.id, summary: inc.label + ' — ' + outcome + ' (' + C.zones[inc.zone].name + ')', effects: eff }); }
    S.incidents = S.incidents.filter(function (i) { return i !== inc; });
    if (v) { v.inc = null; v.loot = false; if (v.stopped) v.towT = 60; }
    S.supers.forEach(function (s) { if (s.inc === inc.id && (s.state === 'alerted' || s.state === 'respond' || s.state === 'engage')) { s.inc = null; s.obj = null; s.state = 'patrol'; s.wp = null; } });
    feed(H.text, 'history'); emit('resolved', H); return H;
  }
  function applyCons(Z, k, val, o, inc, cons) {
    if (k === 'confidence' || k === 'crime' || k === 'infrastructure' || k === 'economy') { Z[k] = clamp(Z[k] + val, 0, 100); cons.push((val > 0 ? '+' : '') + val + ' ' + k + ' (' + o.label.toLowerCase() + ' ' + o.state + ')'); }
    else if (k === 'security') { Z.security += val; cons.push('security +' + val); }
    else if (k === 'research') cons.push('technology research +' + val + ' (Metal hook)');
    else if (k === 'heroRel') { if (o.by === 'mella' || o.state === 'failed') inc.injuredHeroes.forEach(function (h) { var s = S.supers.filter(function (x) { return x.id === h; })[0]; if (s) s.mellaRel += val; }); cons.push('hero relationship ' + (val > 0 ? '+' : '') + val); }
    else if (k === 'labReveal') { S.labRevealed = true; cons.push("Iteron's next laboratory revealed"); }
  }
  sim.note = function (text) { histNote(String(text).slice(0, 200)); };
  function histNote(text) { S.history.push({ id: nid('note'), type: 'note', label: 'City note', zone: null, when: stamp(), day: clock().day, outcome: 'note', mella: false, text: stamp() + ' · ' + text, heroes: [], heroNames: [], objectives: [] }); if (S.history.length > 250) S.history.shift(); }

  /* =============================================================== World Director: tunable event director + story calendar */
  function directorStep(dt) {
    var Dr = S.director, M = C.director.modes[Dr.mode], DC = C.director;
    function act(tier) { return S.incidents.filter(function (i) { return i.tier === tier; }).length; }
    if (S.t >= Dr.nextMinor) { if (act('minor') < DC.maxActive.minor && tryDirector('minor')) Dr.nextMinor = S.t + rr(M.minorMin[0], M.minorMin[1]) * 60; else { Dr.nextMinor = S.t + DC.deferSec; Dr.deferred = (Dr.deferred || 0) + 1; } }
    if (S.t >= Dr.nextMajor) { if (act('major') < DC.maxActive.major && tryDirector('major')) Dr.nextMajor = S.t + rr(M.majorMin[0], M.majorMin[1]) * 60; else { Dr.nextMajor = S.t + DC.deferSec; Dr.deferred = (Dr.deferred || 0) + 1; } }
    Dr.nextPatrolCheck -= dt;
    if (Dr.nextPatrolCheck <= 0) { Dr.nextPatrolCheck = 20; var pats = S.robots.filter(function (r) { return r.patrol && !r.gone; }).length;
      if (rnd() < .05) Dr.patrolTarget = ri(M.patrols[0], M.patrols[1]);
      if (pats < Dr.patrolTarget) { var o = validOrigins('robot'); if (o.length) { var p = pick(o); spawnRobot('scout', p.x, p.y, null, { patrol: true, hostile: false, st: 'patrol', life: rr(180, 420), disguised: rnd() < S.iteron.mods.disguise + .3, home: { x: p.x, y: p.y } }); logSpawn(p.x, p.y, 'patrol'); } } }
  }
  function tryDirector(tier) {
    var DC = C.director, w = clone(tier === 'minor' ? DC.minorTypes : DC.majorTypes), Dr = S.director;
    for (var k in w) { var cd = (DC.cooldownMin[k] || 0) * 60; if (Dr.last[k] != null && S.t - Dr.last[k] < cd) w[k] = 0; if (Dr.recent[0] === k) w[k] *= DC.repeatPenalty[0]; else if (Dr.recent[1] === k) w[k] *= DC.repeatPenalty[1];
      if (k === 'bank_robbery' && S.vesper.stage === 'idle') w[k] *= .25; if (S.incidents.some(function (i) { return i.type === k; })) w[k] = 0; }
    var type = wpick(w); if (!type) return false; return !!startIncident(type, tier, 'director');
  }
  sim.setMode = function (m) { if (!C.director.modes[m]) return false; var Dr = S.director, M = C.director.modes[m]; Dr.mode = m; Dr.patrolTarget = ri(M.patrols[0], M.patrols[1]);
    Dr.nextMinor = Math.min(Dr.nextMinor, S.t + rr(M.minorMin[0], M.minorMin[1]) * 60); Dr.nextMajor = Math.min(Dr.nextMajor, S.t + rr(M.majorMin[0], M.majorMin[1]) * 60); feed('Director set to ' + M.label + '.', 'info'); return true; };
  function calendarStep() {
    var c = clock(), Cal = C.calendar, cal = S.cal;
    if (c.day > 1 && (c.day - 1) % Cal.iteronGenerationEveryDays === 0 && c.minute >= Cal.iteronDeployMinute && !cal.genDone[c.day]) { cal.genDone[c.day] = 1; newGeneration(); }
    Cal.vesperPlan.forEach(function (p) { var week = Math.floor((c.day - 1) / 7), key = p.stage + ':' + week; if (((c.day - 1) % 7) + 1 === p.day && c.minute >= (p.minute || 9 * 60) && !cal.vesperDone[key]) {
        if (p.stage === 'strike') { var cur = S.incidents.filter(function (x) { return x.type === 'bank_robbery'; })[0];
          if (cur) { cur.why = 'calendar'; S.director.log.forEach(function (l) { if (l.id === cur.id) l.why = 'calendar'; }); } else if (!startIncident('bank_robbery', 'major', 'calendar')) return;   // retry next step until a far-enough origin exists
          cal.vesperDone[key] = 1; S.vesper.stage = 'idle'; return; }
        cal.vesperDone[key] = 1; S.vesper.stage = p.stage;
        { histNote('Clue: ' + p.text); feed('Rumor: ' + p.text, 'clue'); S.civs.filter(function (k) { return k.tr.curious > .6; }).forEach(function (k) { Brain.remember(k, { t: Math.floor(absMin()), k: 'clue', v: 0, txt: p.text }); }); } } });
    if (cal.lastDay !== c.day) { cal.lastDay = c.day; dailyCity(); }
  }
  function newGeneration() {
    var I = S.iteron, L = I.learn, tot = 0, k; for (k in L) tot += L[k];
    var hit = tot ? L.hit / tot : 0, blast = tot ? L.blast / tot : 0, cap = C.iteron.adaptCap;
    I.gen++; I.resources += C.iteron.perGenResources; I.mods = { meleeGuard: +(Math.min(cap, hit * .6)).toFixed(3), blastDodge: +(Math.min(cap, blast * .6)).toFixed(3), extraScouts: I.observedSec < 120 ? 1 : 0, disguise: +Math.min(.6, C.iteron.disguiseBase + C.iteron.disguisePerGen * (I.gen - 1)).toFixed(3) };
    var txt = 'Dr. Iteron deployed robot generation ' + I.gen + '. He studied ' + tot + ' of Mella\'s observed moves: commanders now resist melee by ' + Math.round(I.mods.meleeGuard * 100) + '%, interceptors dodge blasts ' + Math.round(I.mods.blastDodge * 100) + '% of the time' + (I.mods.extraScouts ? ', and he is sending extra scouts because he has not seen enough of Mella' : '') + '.';
    histNote(txt); feed(txt, 'villain'); I.learnAtGen = clone(L); for (k in L) L[k] = Math.round(L[k] * .5); I.observedSec = 0;
    startIncident('robot_ambush', 'major', 'calendar');
  }
  sim.newGeneration = newGeneration;
  function dailyCity() {
    Object.keys(S.zones).forEach(function (z) { var Z = S.zones[z]; var have = S.robots.filter(function (r) { return r.security && r.zone === z; }).length, want = Math.min(Z.security, 3);
      for (var i = have; i < want; i++) { var b = C.buildings.filter(function (x) { return x.zone === z; })[0], p = doorPt(b.id); S.robots.push({ id: nid('sec'), cls: 'security', security: true, zone: z, x: p.x, y: p.y, hp: 60, max: 60, st: 'patrol', hostile: false, cyc: 0 }); }
      if (want > have) feed('New city security robots now patrol ' + C.zones[z].name + '.', 'city');
      if (want < have) { var extra = have - want; S.robots = S.robots.filter(function (r) { if (r.security && r.zone === z && extra > 0) { extra--; return false; } return true; }); }
      Z.security = Math.max(0, Z.security - 1); });   // PROPOSED: extra security winds down one level per quiet day
  }
  function cityStep(dt) {   // City AI: repairs, reopenings, drifts, road closures, repair crew
    var c = clock(), gm = dt * C.clock.gameMinPerSec, dayTime = c.minute >= C.damage.repairStart && c.minute < C.damage.repairEnd;
    var crew = S.vehicles.filter(function (v) { return v.kind === 'repair'; })[0];
    if (dayTime && !crew) { var worst = C.buildings.map(function (b) { var B = S.buildings[b.id]; return { id: b.id, d: B.dmg, p: B.dmg + (B.closed ? 30 : 0) + (/shop|food|bank|clinic|infra/.test(b.kind) ? 20 : 0) + (S.city && S.city.repairGoal === b.id ? 100 : 0) }; }).filter(function (x) { return x.d > 0; }).sort(function (a, b) { return b.p - a.p || (a.id < b.id ? -1 : 1); })[0];   // unfinished job first, then closed essential buildings
      if (worst) { var dep = nearestNode(doorPt('repair').x, doorPt('repair').y), tgt = nearestNode(doorPt(worst.id).x, doorPt(worst.id).y), r = dep === tgt ? null : route(dep, tgt, false);
        var n0 = G.nodes[dep]; S.vehicles.push({ id: nid('v'), kind: 'repair', route: r || [dep], ri: 1, x: n0.x, y: n0.y, ang: 0, speed: 0, max: 4, hp: 99, repairGoal: worst.id, color: '#f59f00', parked: !r }); feed('A repair crew is heading to ' + G.bmap[worst.id].name + '.', 'city'); } }
    if (crew && crew.parked) { var B = S.buildings[crew.repairGoal]; if (dayTime) B.dmg = Math.max(0, B.dmg - C.damage.repairPerGameHour / 60 * gm); if (B.dmg <= 0 || !dayTime) { crew.exited = true; S.city = S.city || {}; S.city.repairGoal = B.dmg > 0 ? crew.repairGoal : null; if (B.dmg <= 0) feed(G.bmap[crew.repairGoal].name + ' is fully repaired.', 'city'); updateRoadClosures(); } }
    C.buildings.forEach(function (b) { var B = S.buildings[b.id]; if (B.closed && B.dmg <= C.damage.reopenAt) { B.closed = false; feed(b.name + ' has reopened.', 'city'); updateRoadClosures(); } });
    Object.keys(S.zones).forEach(function (z) { var Z = S.zones[z], bs = C.buildings.filter(function (b) { return b.zone === z; }), dm = bs.reduce(function (a, b) { return a + S.buildings[b.id].dmg; }, 0) / Math.max(1, bs.length);
      Z.damage = +dm.toFixed(2); Z.infrastructure = clamp(Z.infrastructure + ((100 - dm) - Z.infrastructure) * Math.min(1, gm / 240), 0, 100);
      Z.confidence = clamp(Z.confidence + (65 - Z.confidence) * gm / 720 - dm * gm / 6000, 0, 100); Z.crime = clamp(Z.crime + (20 - Z.crime) * gm / 720, 0, 100); Z.faction.iteron = clamp(Z.faction.iteron - gm / 288, 0, 100); Z.faction.vesper = clamp(Z.faction.vesper - gm / 288, 0, 100); Z.faction.city = clamp(100 - Math.max(Z.faction.iteron, Z.faction.vesper), 0, 100);
      var shut = bs.filter(function (b) { return (b.kind === 'shop' || b.kind === 'food' || b.kind === 'bank') && S.buildings[b.id].closed; }).length; Z.economy = clamp(Z.economy + ((70 - shut * 20) - Z.economy) * gm / 600, 0, 100); });
  }
  sim.hooks = function () {   // cross-world hooks (data only in this slice; nothing is written to other games)
    return { valenceLife: { cornerMarketOpen: !S.buildings.store.closed, steamlineCafeOpen: !S.buildings.cafe.closed, note: 'A damaged business could affect Valence Life (owner §6) — PROPOSED hook, not wired' },
      metal: { iteronPrototypeCores: S.research, note: 'Captured robot components could become usable technology in Metal (owner §6) — PROPOSED hook, not wired' },
      creatures: { note: 'Biological escapes (Dr. Sprawl) are not built in this slice' }, passportEventsQueued: S.outbox.length };
  };
