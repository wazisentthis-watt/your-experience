
  /* =============================================================== Dr. Iteron's robots (Villain AI field units) */
  function spawnRobot(cls, x, y, incId, extra) {
    var R = C.robots[cls], hp = R.hp * C.hpUnit;
    var r = Object.assign({ id: nid('r'), cls: cls, x: x, y: y, hp: hp, max: hp, st: 'travel', t: 0, inc: incId, vx: 0, vy: 0, face: 0, hostile: true, gen: S.iteron.gen, cyc: rnd() * 4, art: 2 }, extra || {});
    S.robots.push(r); return r;
  }
  function hitRobot(r, dmg, by) {
    if (r.st === 'down' || r.security) return false;
    var k = 1; if (shieldedBy(r)) k *= C.robots.commander.shieldK; if (r.cls === 'commander' && by === 'mella-hit') k *= 1 - S.iteron.mods.meleeGuard;
    if (r.cls === 'interceptor' && by === 'mella-blast' && rnd() < S.iteron.mods.blastDodge) { r.dodged = (r.dodged || 0) + 1; return 'dodged'; }
    r.hp -= dmg * k; if (dmg > 0) { r.flash = .15; r.lastBy = by; }
    if (!r.hostile && dmg > 0) { r.hostile = true; r.fleeing = true; r.disguised = false; }
    if (r.disguised && dmg > 0) r.disguised = false;
    if (r.grab && dmg > 0) freeGrab(r, by);
    if (r.cls === 'scout' && r.hp < r.max * .5 && !r.fleeing && r.inc) startFlee(r);
    if (r.hp <= 0) { r.hp = 0; r.st = 'down'; r.t = 2.2; robotDown(r, by); }
    return true;
  }
  sim.hitRobot = hitRobot;
  function shieldedBy(r) { if (r.cls === 'commander' || !r.inc) return false; return S.robots.some(function (c) { return c.cls === 'commander' && c.st !== 'down' && !c.riding && c.inc === r.inc && D(c, r) < C.robots.commander.shieldR; }); }
  sim.shielded = shieldedBy;
  function startFlee(r) { var inc = incById(r.inc); r.fleeing = true; r.trackT = 0; if (inc) { addObj(inc, 'track_signal'); feed('A damaged Iteron scout is fleeing — follow its signal!', 'alert'); } }
  function freeGrab(r, by) { var c = S.civs.filter(function (k) { return k.id === r.grab; })[0], m = by && by.indexOf('mella') === 0; r.grab = null; r.grabT = 0;
    if (c) { c.grabbed = null; Brain.remember(c, { t: Math.floor(absMin()), k: m ? 'rescued' : 'saved', by: m ? 'mella' : by, v: m ? 1 : .3, inc: r.inc, txt: 'the robot that grabbed me' }); if (m) { c.opinion = clamp(c.opinion + 20, -100, 100); feed('Mella freed ' + c.name + '.', 'hero'); } } }
  function robotDown(r, by) {
    var who = by && by.indexOf('mella') === 0 ? 'mella' : by, inc = incById(r.inc);
    if (inc) { inc.downs[who] = (inc.downs[who] || 0) + 1; if (who === 'mella') inc.mellaActs++; }
    if (r.cls === 'commander' && inc) { objDone(inc, 'stop_commander', who); S.items.push({ id: nid('it'), kind: 'core', x: r.x, y: r.y, inc: inc.id, t: 20 }); addObj(inc, 'capture_prototype'); feed('The shield commander is down. Its prototype core self-destructs in 20 seconds — capture it!', 'alert'); }
    if (inc && r.cls === 'scout' && inc.objectives.some(function (o) { return o.id === 'disable_drones'; }) && !S.robots.some(function (o) { return o.inc === inc.id && o.cls === 'scout' && o.st !== 'down'; })) objDone(inc, 'disable_drones', who);
  }
  function takeCore(it, by) { S.items = S.items.filter(function (i) { return i !== it; }); var inc = incById(it.inc); if (inc) objDone(inc, 'capture_prototype', by); S.research++; feed(nameOf(by) + ' captured an Iteron prototype core (research ' + S.research + ').', 'hero'); }
  function foundryDoor() { var f = G.bmap.foundry; return { x: f.door[0] + .5, y: f.door[1] + .5 }; }
  function stepRobot(r, dt) {
    var R = C.robots[r.cls]; r.flash = Math.max(0, (r.flash || 0) - dt); r.cyc += dt;
    if (r.st === 'down') { r.t -= dt; if (r.t <= 0) r.gone = true; return; }
    if (r.riding) { var v = S.vehicles.filter(function (q) { return q.id === r.riding; })[0]; if (!v || v.exited) { r.gone = true; r.escaped = true; return; } r.x = v.x; r.y = v.y; return; }
    var inc = r.inc && incById(r.inc), coord = !!(inc && S.robots.some(function (c) { return c.cls === 'commander' && c.inc === r.inc && c.st !== 'down' && !c.riding; }));
    var sp = R.speed * (coord && r.cls !== 'commander' ? C.robots.commander.coordSpeedK : 1) * (inc && inc.commanderDown && r.cls !== 'commander' ? .7 : 1);
    if (r.fleeing) { var home = r.home || foundryDoor(); var d0 = seek(r, home.x, home.y, R.speed * 1.1, dt);
      var tinc = inc || (r.trackInc && incById(r.trackInc));
      if (tinc && !r.tracked) { var trackers = []; if (distPlayer(r.x, r.y) < 5) trackers.push('mella'); S.supers.forEach(function (s) { if (s.inc === tinc.id && s.obj === 'track_signal' && D(s, r) < 5) trackers.push(s.id); });
        if (trackers.length) { r.trackT = (r.trackT || 0) + dt; if (r.trackT >= 6) { r.tracked = true; objDone(tinc, 'track_signal', trackers[0]); S.labRevealed = true; feed(nameOf(trackers[0]) + ' tracked the scout\'s signal: Iteron\'s next lab is under the Old Foundry.', 'hero'); } } }
      if (d0 < .6 || r.x < .4 || r.x > G.W - .4 || r.y < .4 || r.y > G.H - .4) { r.gone = true; r.escaped = true; } return; }
    if (!r.hostile) {   // patrol drones: observe Mella, wander where she spends time, go home
      r.life -= dt; if (r.life <= 0) { r.fleeing = true; return; }
      if (distPlayer(r.x, r.y) < R.observe) { S.iteron.observedSec += dt; r.watching = true; } else r.watching = false;
      if (!r.wp || D(r, r.wp) < .6) { var z = wpick(S.heat) || 'plaza'; var zb = C.buildings.filter(function (b) { return b.zone === z && b.kind !== 'villain'; }); var b = zb.length ? pick(zb) : C.buildings[0]; r.wp = { x: b.door[0] + .5 + rr(-2, 2), y: b.door[1] + .5 + rr(-.4, .4) }; }
      seek(r, r.wp.x, r.wp.y, R.speed * .45, dt); return; }
    if (r.st === 'travel') { var tg = inc ? inc.target : r; var dd = seek(r, tg.x, tg.y, sp, dt); if (dd < 3 || distPlayer(r.x, r.y) < 5) { r.st = 'engage'; r.t = rr(0, .5); } return; }
    r.t -= dt;
    if (r.cls === 'scout') { var pd = distPlayer(r.x, r.y); if (pd < R.observe) S.iteron.observedSec += dt;
      if (inc && inc.type === 'vehicle_chase') { var v2 = S.vehicles.filter(function (q) { return q.id === inc.vehicle; })[0]; if (v2 && !v2.exited && !v2.stopped) { var bx = v2.x - Math.cos(v2.ang) * 1.6 + Math.cos(r.cyc * 2) * .6, by = v2.y - Math.sin(v2.ang) * 1.6 + Math.sin(r.cyc * 2) * .6; var dv = hyp(bx - r.x, by - r.y), stp = Math.min(dv, Math.max(sp, v2.speed * 1.15) * dt); if (dv > 1e-3) { r.x += (bx - r.x) / dv * stp; r.y += (by - r.y) / dv * stp; } if (D(r, v2) < 2.2 && !(v2.protT > 0)) v2.hp -= dt * .04; return; } }
      var want = pd < R.keep[0] ? -1 : pd > R.keep[1] ? 1 : 0; if (pd > 12) want = 0;
      if (want) { var ax = (S.player.x - r.x) / (pd || 1) * want, ay = (S.player.y - r.y) / (pd || 1) * want; slide(r, ax * sp * dt, ay * sp * dt); } else { slide(r, Math.cos(r.cyc) * dt * .6, Math.sin(r.cyc * 1.3) * dt * .6); }
      return; }
    if (r.cls === 'commander') {
      var tb = inc && inc.targetB ? doorPt(inc.targetB) : (inc ? inc.target : r); if (D(r, tb) > 2.5) seek(r, tb.x, tb.y, sp, dt);
      r.art -= dt; if (r.art <= 0) { r.art = R.artilleryEvery; var bl = nearestBuilding(r.x, r.y, 7); if (bl) { var bp = doorPt(bl.id); shell(bp.x, bp.y, bl.id, R.artilleryDmg, inc); } }
      return; }
    // interceptor (grappler): pick a target; coordinated focus while the commander stands
    if (r.grab) { r.grabT += dt; var gc = S.civs.filter(function (k) { return k.id === r.grab; })[0]; if (!gc) { r.grab = null; } else if (r.grabT >= R.grabT) { injureCiv(gc, inc, 'grabbed by an Iteron interceptor'); gc.grabbed = null; r.grab = null; r.grabT = 0; r.t = 1.5; } else { var away = inc ? inc.origin : r; seek(r, away.x, away.y, sp * .35, dt); } return; }
    if (!r.tgt || r.t < -3 || !tpos(r.tgt)) { r.tgt = pickTarget(r, coord, inc); r.t = 0; }
    var T = tpos(r.tgt); if (!T) { if (inc) seek(r, inc.target.x, inc.target.y, sp * .5, dt); return; }
    var dx = T.x - r.x, dy = T.y - r.y, d3 = hyp(dx, dy) || 1e-6;
    if (r.st === 'engage' || r.st === 'travel') { if (d3 < R.reach + .8 && r.t <= 0) { r.st = 'tele'; r.t = R.tele; r.face = Math.atan2(dy, dx); } else seek(r, T.x, T.y, sp, dt); }
    else if (r.st === 'tele') { if (r.t <= 0) { r.st = 'atk'; r.t = .3; r.vx = Math.cos(r.face) * R.dash; r.vy = Math.sin(r.face) * R.dash; r.hitDone = false; } }
    else if (r.st === 'atk') { slide(r, r.vx * dt, r.vy * dt); r.vx *= Math.exp(-6 * dt); r.vy *= Math.exp(-6 * dt);
      if (!r.hitDone && d3 < R.reach) { r.hitDone = true; landHit(r, r.tgt, inc); }
      if (r.t <= 0) { r.st = 'engage'; r.t = rr(.6, 1.2); } }
  }
  function civById(id) { var c = S.civs.filter(function (k) { return k.id === id; })[0]; return c && !c.inside && !(c.injured > 0) && !c.grabbed ? c : null; }
  function pickTarget(r, coord, inc) {
    var opts = [], pd = distPlayer(r.x, r.y);
    if (pd < 9 && S.player.ko <= 0 && S.player.mode !== 'car') opts.push({ k: 'p', s: 10 - pd + (S.iteron.gen > 1 ? 1 : 0) });
    S.supers.forEach(function (s) { if (s.inc === r.inc && s.state === 'engage' && D(s, r) < 9) opts.push({ k: 's', id: s.id, s: 9 - D(s, r) }); });
    S.civs.forEach(function (c) { if (!c.inside && !(c.injured > 0) && !c.grabbed && D(c, r) < 9) opts.push({ k: 'c', id: c.id, s: 8.5 - D(c, r) + (coord ? 1.5 : 0) }); });
    if (coord && inc && inc.focus) opts.forEach(function (o) { if (o.k === inc.focus.k && o.id === inc.focus.id) o.s += 3; });
    opts.sort(function (a, b) { return b.s - a.s; }); var t = opts[0] || null; if (coord && inc && t) inc.focus = t; return t;
  }
  function tpos(t) { if (!t) return null; if (t.k === 'p') return S.player.ko > 0 || S.player.mode === 'car' ? null : S.player; if (t.k === 's') { var s = S.supers.filter(function (x) { return x.id === t.id; })[0]; return s && s.state !== 'injured' && s.state !== 'captured' && s.state !== 'recover' ? s : null; } return civById(t.id); }
  function landHit(r, t, inc) {
    if (t.k === 'p') hurtPlayer(C.robots[r.cls].name);
    else if (t.k === 's') { var s = S.supers.filter(function (x) { return x.id === t.id; })[0]; if (!s) return; var d = sdef(s.id); s.hp -= 14 * (1 - (d.power.shield || 0)); if (s.hp <= 0) injureSuper(s, inc); }
    else { var c = civById(t.id); if (c) { c.grabbed = r.id; r.grab = c.id; r.grabT = 0; c.needs.safety = 0; feed(c.name + ' has been grabbed by an Iteron interceptor!', 'alert'); } }
  }
  function injureSuper(s, inc) { s.hp = 0; s.state = 'injured'; s.injuredT = 0; s.injInc = inc ? inc.id : null; if (inc) { addObj(inc, 'save_hero'); if (inc.injuredHeroes.indexOf(s.id) < 0) inc.injuredHeroes.push(s.id); } feed(sdef(s.id).codename + ' is down and hurt!', 'alert'); }
  function injureCiv(c, inc, why) { if (c.injured > 0) return; c.injured = 240; c.needs.safety = 0; c.think = 0; S.stats.injured++; if (inc) inc.civInjured++; Brain.remember(c, { t: Math.floor(absMin()), k: 'hurt', v: -.6, inc: inc && inc.id, txt: why }); feed(c.name + ' was hurt (' + why + ').', 'alert'); }
  function nearestBuilding(x, y, maxD) { var best = null, bd = maxD; C.buildings.forEach(function (b) { if (b.kind === 'villain') return; var p = doorPt(b.id), d = hyp(p.x - x, p.y - y); if (d < bd) { bd = d; best = b; } }); return best; }
  function shell(x, y, bid, dmg, inc) { damageBuilding(bid, dmg, inc); S.fx = (S.fx || []).concat([{ k: 'boom', x: x, y: y, t: .8 }]).slice(-20); S.civs.forEach(function (c) { if (!c.inside && hyp(c.x - x, c.y - y) < 1.6 && rnd() < .5) injureCiv(c, inc, 'caught in a blast'); }); }
  function collateral(x, y, dmg, who) { var b = nearestBuilding(x, y, 6); var inc = S.incidents.filter(function (i) { return hyp(i.x - x, i.y - y) < 20; })[0]; if (b) { damageBuilding(b.id, dmg, inc); if (inc && who) inc.collateral[who] = (inc.collateral[who] || 0) + dmg; } }
  function damageBuilding(id, dmg, inc) { var B = S.buildings[id]; B.dmg = clamp(B.dmg + dmg, 0, 100); var z = G.bmap[id].zone; if (inc) inc.dmg += dmg;
    if (!B.closed && B.dmg >= C.damage.closeAt) { B.closed = true; S.zones[z].closures++; feed(G.bmap[id].name + ' has closed temporarily (damage ' + Math.round(B.dmg) + '%).', 'city'); }
    updateRoadClosures(); }
  sim.damageBuilding = function (id, dmg) { damageBuilding(id, dmg, null); };
  function updateRoadClosures() { S.roadClosures = []; C.buildings.forEach(function (b) { if (S.buildings[b.id].dmg >= C.damage.roadCloseAt) { var p = doorPt(b.id), m = nearestRoadMid(p.x, p.y); if (m) S.roadClosures.push({ x: m.x, y: m.y, b: b.id }); } }); }
  function nearestRoadMid(x, y) { var best = null, bd = 1e9; G.nodes.forEach(function (n) { n.nb.forEach(function (mi) { var o = G.nodes[mi]; if (n.edge || o.edge) return; var mx = (n.x + o.x) / 2, my = (n.y + o.y) / 2, d = hyp(mx - x, my - y); if (d < bd) { bd = d; best = { x: mx, y: my }; } }); }); return best; }

  /* =============================================================== hero (Mella): HP lives in the save; movement + combat input in living.js */
  function hurtPlayer(why) { var p = S.player; if (p.ko > 0 || p.inv > 0 || p.mode === 'car' || p.z > .4) return false; p.hp--; p.inv = C.hero.invHit; p.lastHurt = why; emit('hurt', why); if (p.hp <= 0) { p.hp = 0; p.ko = C.hero.koTime; feed('Mella is knocked down — recovering.', 'alert'); } return true; }
  sim.hurtPlayer = hurtPlayer;
  function stepPlayerTimers(dt) { var p = S.player; p.inv = Math.max(0, p.inv - dt); if (p.ko > 0) { p.ko -= dt; if (p.ko <= 0) { p.ko = 0; p.hp = C.hero.hp; p.inv = C.hero.koGrace; } } var z = zoneAt(p.x, p.y); S.heat[z] = (S.heat[z] || 0) + dt; var f = Math.exp(-dt / 3600); for (var k in S.heat) S.heat[k] *= f; }
  sim.reportAction = function (kind) { S.uses[kind] = (S.uses[kind] || 0) + 1; if (kind === 'calm') sim.calmFighters(C.hero.calmRadius + 1); var watched = S.robots.some(function (r) { return r.st !== 'down' && !r.security && (r.cls === 'scout' || r.inc) && distPlayer(r.x, r.y) < C.robots.scout.observe; }); if (watched && S.iteron.learn[kind] != null) S.iteron.learn[kind]++; S.incidents.forEach(function (i) { if (hyp(i.x - S.player.x, i.y - S.player.y) < 14 && (kind === 'hit' || kind === 'blast' || kind === 'calm')) i.mellaActs++; }); return watched; };
  sim.interact = function () {   // E / Y: capture cores, revive heroes, recover loot, open the truck, heal + talk to civilians, talk to heroes
    var p = S.player, R = C.hero.actRange;
    var it = S.items.filter(function (i) { return hyp(i.x - p.x, i.y - p.y) < R; })[0]; if (it && it.kind === 'evidence') return divExamine(it, 'mella'); if (it) { takeCore(it, 'mella'); return { kind: 'capture', line: 'Prototype core captured.' }; }
    var hs = S.supers.filter(function (s) { return s.state === 'injured' && hyp(s.x - p.x, s.y - p.y) < R; })[0]; if (hs) { reviveSuper(hs, 'mella'); return { kind: 'revive', who: sdef(hs.id).codename, line: sdef(hs.id).codename + ': "I owe you one, Mella."' }; }
    var v = S.vehicles.filter(function (v) { return v.stopped && v.loot && hyp(v.x - p.x, v.y - p.y) < R + .6; })[0]; if (v) { var inc = incById(v.inc); if (inc) recoverLoot(inc, 'mella'); return { kind: 'loot', line: 'You pull the money bags out of the van.' }; }
    var pv = S.vehicles.filter(function (v) { return v.stopped && v.payload && !v.payloadSeen && hyp(v.x - p.x, v.y - p.y) < R + .6; })[0]; if (pv) { revealPayload(pv, 'mella'); return { kind: 'payload', line: pv.payloadText }; }
    var c = S.civs.filter(function (c) { return !c.inside && hyp(c.x - p.x, c.y - p.y) < R; }).sort(function (a, b) { return D(a, p) - D(b, p); })[0];
    if (c) { if (c.injured > 0) { c.injured = Math.max(0, c.injured - 120); c.opinion = clamp(c.opinion + 8, -100, 100); Brain.remember(c, { t: Math.floor(absMin()), k: 'helped', by: 'mella', v: .8 }); return { kind: 'heal', who: c.name, line: 'Thank you… I can make it to the clinic now.' }; } c.talkedT = S.t; return { kind: 'talk', who: c.name, role: c.role, line: talk(c) }; }
    var fs = S.supers.filter(function (s) { return s.state === 'feud' && hyp(s.x - p.x, s.y - p.y) < R + 1; })[0];
    if (fs) { var fi = incById(fs.inc); if (fi) { calmFighter(fi, fs.id, C.divider.mellaTalk, 'mella'); fi.mellaActs++; } return { kind: 'deescalate', who: sdef(fs.id).codename, role: 'duped by The Divider', line: fs.state === 'feud' ? '"' + (fs.feud === 'mella' ? 'You sold us out to Iteron!' : nameOf(fs.feud) + ' sold us out!') + '" (You keep talking. They are listening a little more.)' : '"…Wait. Who sent me that message?" They stand down.' }; }
    var rv = S.divider && S.divider.rival && S.supers.filter(function (s) { return s.id === S.divider.rival.id && s.state !== 'captured' && s.state !== 'injured' && hyp(s.x - p.x, s.y - p.y) < R + .5; })[0];
    if (rv && (rv.mellaRel >= 0 || S.divider.exposure >= 50)) { var rn = S.divider.rival.name; S.divider.rival = null; rv.mellaRel += 3; feed(sdef(rv.id).codename + ' quit ' + rn + ' after talking with Mella.', 'hero'); histNote(sdef(rv.id).codename + ' left The Divider\'s rival team ' + rn + '.'); return { kind: 'talk', who: sdef(rv.id).codename, role: 'ex-' + rn, line: '"An anonymous sponsor, a crew, free gear… yeah. I got played. I\'m out."' }; }
    var s = S.supers.filter(function (s) { return s.state !== 'captured' && s.state !== 'injured' && hyp(s.x - p.x, s.y - p.y) < R + .5; })[0]; if (s) return { kind: 'talk', who: sdef(s.id).codename, role: 'superhero · proposed original', line: superTalk(s) };
    return null;
  };
  sim.discover = function (id) { if (S.discovered[id]) return false; S.discovered[id] = Math.floor(absMin()); var d = C.discoveries.filter(function (x) { return x.id === id; })[0]; feed('Discovery: ' + d.text, 'discovery'); return true; };
  function talk(c) {
    var m = c.mem[c.mem.length - 1], op = c.opinion, inc;
    if (c.grabbed) return 'Get this thing off me!';
    if (m && absMin() - m.t < 1440 * 2) {
      inc = m.inc && S.history.filter(function (h) { return h.id === m.inc; })[0];
      if (m.k === 'rescued') return 'You pulled me out of that mess' + (inc ? ' on ' + inc.when : '') + '. I won\'t forget it.';
      if (m.k === 'saw_help') return 'I saw you at the ' + (inc ? inc.label.toLowerCase() : 'fight') + '. ' + (inc && inc.outcome === 'contained' ? 'The whole block is talking about it.' : 'Rough one, but you showed up.');
      if (m.k === 'absent') return 'Where were you when the ' + (inc ? inc.label.toLowerCase() + ' hit ' + inc.zoneName : 'trouble hit') + '? ' + (inc && inc.heroNames.length ? inc.heroNames[0] + ' showed up, at least.' : 'Nobody came.');
      if (m.k === 'heard') return 'Did you hear about ' + (m.txt || 'what happened') + '? ' + (m.v > 0 ? 'People say you were great.' : 'People are worried.');
      if (m.k === 'closed') return (G.bmap[m.subj] ? G.bmap[m.subj].name : 'My work') + ' is closed after the damage. I can\'t work today.';
      if (m.k === 'clue') return 'I heard something: ' + m.txt;
      if (m.k === 'hurt') return 'Still sore from ' + (m.txt || 'that attack') + '.';
    }
    var act = { work: 'On my way to work — ' + (G.bmap[c.job] ? G.bmap[c.job].name : 'the ' + c.job) + '.', home: 'Heading home. Long day.', eat: 'Starving. Steamline Café, here I come.', social: 'Looking for someone to talk to, honestly.', fun: 'Just taking it slow today.', flee: 'Run! It isn\'t safe here!', watch: 'I just want to see what happens.', clinic: 'I need the clinic.', protest: 'We want the city fixed! Nobody listens!' }[c.action] || 'Hey.';
    return (op > 30 ? 'Mella! ' : op < -20 ? 'Oh. It\'s you. ' : '') + act;
  }
  function superTalk(s) { var d = sdef(s.id), r = s.mellaRel; return '"' + (r > 10 ? 'Glad you\'ve got my back. ' : r < -5 ? 'Stay out of my way next time. ' : '') + d.motivation + '"'; }
  sim.talk = talk;
