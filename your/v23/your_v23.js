/* Y.O.U.R. v2.3 · PROPOSAL_HOLD (PUBLISH HOLD) — "Y.O.U.R. Experience — Experience Wonders": the MELLA fights villains and survives raids (owner t74u).
   Installs after v2.0 → v2.1 → v2.2 (wraps window.YOUR_V20_INSTALL). Valence's model is not copied or changed.
   1. Branding on the title, the phone YOUR tab and the activity bar (Y.O.U.R. acronym kept).
   2. Villain combat in the Savannah city map: METAL ghosted machines (MACHINE_DEFS verbatim: HP, telegraph, attack, stun, isolate) with their
      real METAL sprite frames, and the two CANON S1 villains BALLAST and GLASSJAW (names / lines canon; fight design = METAL PROPOSAL; placeholder art).
      The V7 kit (hit, blast, dash, calm, transform, ROOT/CORE/CROWN, living circuit) lands on them; damage is computed by the Nimbus combat module
      (wir_mella_combat.js executeMellaCombatFrame: lanes, Valence Stars, Divine-12, CCR triangle). Hero HP / knock-down / recovery = METAL rules.
   3. Raid: wave survival on the Starter Flat block (METAL site compositions + escalation), boss wave, rewards, recoverable failure.
   4. Progress is saved in the Valence save AND in the shared hero profile as games.your_combat (a wir.hero/1 field every profile module already keeps).
   Every number is tagged in your_v23_config.js (METAL / NIMBUS / V7 / PROPOSED). */
(function () {
  'use strict';
  var C = window.YOUR_V23_CONFIG, H = window.WIR_HERO, NB = window.WIRMellaCombat;
  var V23 = window.YOUR_V23 = { version: C.version, installed: false, stats: {}, log: [], foes: [], boss: null, raid: null, site: null, fx: [] };
  var FR = {"breacher_0":[48,62,32.4,60.0],"breacher_1":[49,63,37.9,61.0],"breacher_2":[48,62,16.8,58.1],"breacher_3":[50,67,27.8,63.4],"lifter_0":[46,89,27.7,87.0],"lifter_1":[43,89,17.3,87.0],"lifter_2":[68,104,29.3,103.0],"lifter_3":[74,97,23.6,95.8],"loader_0":[54,86,26.6,83.6],"loader_1":[87,84,58.1,82.8],"loader_2":[89,94,54.3,92.7],"loader_3":[88,82,52.4,80.2],"scout_0":[34,40,18.7,37.9],"scout_1":[32,44,13.4,41.3],"scout_2":[37,53,12.5,46.6],"scout_3":[38,57,17.0,54.2],"walker_0":[42,56,21.1,53.3],"walker_1":[37,57,13.0,54.2],"walker_2":[38,59,9.6,56.2],"walker_3":[47,67,12.0,62.4]}; // METAL m4 atlas rects [w,h,anchorX,anchorY]
  var ART = 'your/assets/villains/metal_machines/';
  var IM = {}; function img(n) { var i = IM[n]; if (!i) { i = IM[n] = new Image(); i.src = ART + n + '.png'; } return i.complete && i.naturalWidth ? i : null; }
  Object.keys(FR).forEach(img);
  function count(k, n) { V23.stats[k] = (V23.stats[k] || 0) + (n || 1); }
  var inst = window.YOUR_V20_INSTALL;
  window.YOUR_V20_INSTALL = function (X) { inst(X); try { install(X); } catch (e) { console.warn('YOUR v2.3 install', e); V23.error = String(e && e.stack || e); } };
  function hyp(a, b) { return Math.sqrt(a * a + b * b); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function angDiff(a, b) { var d = b - a; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d; }

  function install(X) {
    var G = X.G, F = X.fn, $ = X.$, esc = X.esc, T = X.T, S = function () { return X.S; }, V = window.YOUR_V20, V22 = window.YOUR_V22;
    if (!V22 || !V22.P) throw new Error('v2.2 layer missing');
    if (!NB) throw new Error('Nimbus combat module (wir_mella_combat.js) missing');
    var P = V22.P, MC = window.YOUR_V22_CONFIG.mella, tpp = V22.tpp, kaw = V22.kaw, PX = 1 / C.scale.metalTilePx, R = C.machineRules;
    var toast = function (m, c) { F.toast()(m, c); };
    V23.X = X;
    function Ys() { return V.state(); }
    function layer() { return !S() || !$('#start').hidden || G.sheet || G.phone || G.yourAct || G.fb || G.lab || (X.MG && X.MG.cur) || F.paused()(); }
    function onCity() { return !!(G.map && G.map.id === 'SAV'); }
    function walk(x, y) { return G.map && F.walkable()(G.map, Math.floor(x), Math.floor(y)); }
    function dvec() { var d = G.dir; return d === 'left' ? [-1, 0] : d === 'right' ? [1, 0] : d === 'up' ? [0, -1] : [0, 1]; }
    function text(x, y, s, col) { V23.fx.push({ x: x, y: y, s: s, col: col || '#ffd27a', life: 1.2 }); if (V23.fx.length > 24) V23.fx.shift(); V23.lastText = s; }
    var bannerT = 0; function banner(title, sub, col, t) { V23.lastBanner = { title: title, sub: sub || '' }; var b = $('#yourCombatBanner'); if (b) { b.innerHTML = '<b style="color:' + (col || '#ffd27a') + '">' + esc(title) + '</b>' + (sub ? '<span>' + esc(sub) + '</span>' : ''); b.hidden = false; } bannerT = t || 1.8; V23.log.push({ banner: title }); }

    /* ------------------------------------------------ records + saves (Valence save + hero profile games.your_combat) */
    function rec() { var y = Ys(); if (!y) return null;
      if (!y.combat || y.combat.v !== 1) { var pd = null; try { var g = H.get().games.your_combat; pd = g && g.data && g.data.v === 1 ? g.data : null; } catch (e) {}
        y.combat = pd ? JSON.parse(JSON.stringify(pd)) : { v: 1, raids: { started: 0, cleared: 0, failed: 0, bestWave: 0, lastPaidDay: -1 }, villains: {}, isolated: {}, sites: { cleared: 0 }, kos: 0, hitsTaken: 0, events: 0 }; }
      return y.combat; }
    var saveT = 0; function saveRec(now) { var r = rec(); if (!r) return; clearTimeout(saveT);
      var go = function () { try { H.gameData('your_combat', { data: r }); V23.savedAt = Date.now(); count('profile_save'); } catch (e) { console.warn('combat profile', e); } try { F.save()(); } catch (e) {} };
      if (now) go(); else saveT = setTimeout(go, 250); }
    function unlock(id, msg) { try { if (H.unlock(id) && msg) toast('Hero unlock: ' + msg, 'gold'); } catch (e) {} }
    V23.rec = rec; V23.saveRec = saveRec;

    /* ------------------------------------------------ Nimbus: every hero hit is a Nimbus combat frame */
    var shell = V23.shell = NB.createValenceShell();
    function nimbus(kind, def, dv, dry) {
      var lane = C.nimbus[kind], ci = { rx: dv[0], ry: -dv[1] };   // Nimbus: +Y is north
      if (lane !== 'melee') { ci.buttons = {}; ci.buttons[lane] = true; }
      var sh = dry ? JSON.parse(JSON.stringify(shell)) : shell;
      var r = NB.executeMellaCombatFrame({ controllerInput: ci, valenceShell: sh, defenderMove: C.defender[def] || 'Guard' });
      var dmg = r.finalDamage * (kind === 'hit' && P.transformed ? C.nimbus.transformHitK : 1);
      var o = { kind: kind, lane: r.chosenLane ? r.chosenLane.id : null, strike: r.intent.meleeStrike ? r.intent.meleeStrike.strikeName : null, dmg: +dmg.toFixed(2), valence: r.valenceState, stars: r.valenceStars, ccr: r.ccrResolution.outcome, d12: r.divine12Summary.activeCount + '/' + r.divine12Summary.totalNodes };
      if (!dry) { V23.lastNimbus = o; count('nimbus_' + kind); } return o; }
    V23.nimbus = nimbus;

    /* ------------------------------------------------ hero HP / knock-down / recovery (METAL) */
    var HP = V23.hero = { hp: C.hero.hp, max: C.hero.hp, inv: 0, ko: 0, kb: [0, 0], hurtT: 0 };
    function hurtHero(src, why) {
      if (HP.ko > 0 || HP.inv > 0) { if (HP.ko <= 0) count('hero_inv'); return false; }
      if (P.guardian > 0) { HP.inv = .6; text(G.px, G.py - 1.6, 'GUARDIAN', '#b3ff84'); count('hero_guardian'); return false; }
      if (C.hero.transformAbsorbs && P.transformed) { HP.inv = .6; text(G.px, G.py - 1.6, 'ABSORBED', '#e6dcff'); count('hero_absorbed'); return false; }
      HP.hp--; V23.lastHurt = why || 'HIT'; HP.inv = C.hero.invHit; HP.hurtT = .3; var r = rec(); r.hitsTaken++; count('hero_hit');
      var dx = G.px - src.x, dy = G.py - src.y, d = hyp(dx, dy) || 1; HP.kb = [dx / d * C.hero.knockPx * PX, dy / d * C.hero.knockPx * PX];
      text(G.px, G.py - 1.6, '-1 ' + (why || 'HIT'), '#ffafad');
      if (HP.hp <= 0) knockout(why); return true; }
    V23.hurtHero = hurtHero;
    function knockout(why) { HP.hp = 0; HP.ko = C.hero.koTime; HP.kb = [0, 0]; G.path = []; var r = rec(); r.kos++; count('ko');
      banner('KNOCKED DOWN', (why ? why + ' · ' : '') + 'Veyru stays with you · recovering…', '#ff9a7a', C.hero.koTime);
      if (V23.raid) failRaid('knocked down'); else if (V23.site && V23.site.state === 'live') powerDownSite('You went down — the machines powered down (nothing lost).'); saveRec(); }
    function recover() { HP.hp = HP.max; HP.ko = 0; HP.inv = C.hero.koGrace; count('recovered'); text(G.px, G.py - 1.6, 'BACK UP', '#93f6cf'); toast('Back on your feet — full health. Nothing was lost.', 'gold'); }

    /* ------------------------------------------------ machines (METAL MACHINE_DEFS) */
    var uid = 0;
    function mk(kind, x, y, i, src) { var D = C.machines[kind]; return { kind: kind, D: D, x: x, y: y, vx: 0, vy: 0, hp: D.hp * C.hpUnit, max: D.hp * C.hpUnit, st: 'wake', t: R.wake + i * R.wakeStep, face: Math.atan2(G.py - y, G.px - x), stun: 0, flash: 0, cyc: Math.random() * 6.28, id: ++uid, src: src }; }
    function spot(cx, cy, rMin, rMax, i, n) { for (var a = 0; a < 60; a++) { var ang = (i / Math.max(1, n)) * 6.283 + a * .61, rr = rMin + ((a * 7 + i * 3) % 10) / 10 * (rMax - rMin), x = cx + Math.cos(ang) * rr, y = cy + Math.sin(ang) * rr;
        if (walk(x, y) && hyp(x - G.px, y - G.py) >= Math.min(rMin, 3)) return [Math.floor(x) + .5, Math.floor(y) + .5]; } return null; }
    function compKinds(n, lvl) { var nl = n[0], nf = n[1], nw = n[2] || 0, ns = n[3] || 0, nb = n[4] || 0, out = [], i;   // METAL spawnSite escalation
      for (i = 0; i < nl + (lvl > 1 ? 1 : 0); i++) out.push('loader'); for (i = 0; i < nf + (lvl > 2 ? 1 : 0); i++) out.push('lifter');
      for (i = 0; i < nw; i++) out.push('walker'); for (i = 0; i < ns; i++) out.push('scout'); for (i = 0; i < nb; i++) out.push('breacher'); return out; }
    function spawnGroup(kinds, cx, cy, rMin, rMax, src) { var made = []; kinds.forEach(function (k, i) { var s = spot(cx, cy, rMin, rMax, i, kinds.length); if (!s) return; var m = mk(k, s[0], s[1], i, src); V23.foes.push(m); made.push(m); count('spawn_' + k); }); return made; }
    V23.spawn = function (kind, x, y) { var m = mk(kind, x, y, 0, 'qa'); m.t = 0; m.st = 'chase'; V23.foes.push(m); return m; };
    function live(src) { return V23.foes.filter(function (m) { return m.st !== 'down' && (!src || m.src === src); }); }
    function damage(m, n, kx, ky, src, label) {
      if (!m || m.st === 'down') return false;
      if (m.D.shield && src !== 'aoe' && m.st !== 'stun' && m.st !== 'tele') {   // METAL breacher: shield faces its target
        if (Math.cos(angDiff(m.face, Math.atan2(G.py - m.y, G.px - m.x))) > R.shieldDot) { text(m.x, m.y - 1.4, 'SHIELDED', '#d6b8ff'); m.vx += kx * .3; m.vy += ky * .3; count('shielded'); return false; } }
      m.hp -= n; m.flash = .15; m.vx += kx; m.vy += ky; m.stun = Math.max(m.stun, R.stun); m.st = 'stun'; count('dmg_' + (src || 'x'));
      text(m.x, m.y - 1.5, '-' + Math.round(n) + (label ? ' ' + label : ''), '#f2d28c');
      if (m.hp <= 0) { m.hp = 0; m.st = 'down'; m.t = R.downFade; m.vx *= .5; m.vy *= .5; text(m.x, m.y - 1.9, 'ISOLATED', '#ffd27a'); count('isolated'); count('isolated_' + m.kind);
        var r = rec(); r.isolated[m.kind] = (r.isolated[m.kind] || 0) + 1; if (C.nimbus.starOnIsolate) NB.modifyValenceStars(shell, C.nimbus.starOnIsolate, 'ISOLATED_' + m.kind.toUpperCase());
        unlock('your:first_isolate', 'first ghosted machine isolated'); saveRec(); }
      return true; }
    V23.damage = damage;
    function step(m, dt) {
      var D = m.D; m.t -= dt; m.flash = Math.max(0, m.flash - dt); m.cyc += dt;
      var dx = G.px - m.x, dy = G.py - m.y, d = hyp(dx, dy) || 1e-6, dp = d / PX, fr = Math.exp(-(m.st === 'stun' ? 3 : 6) * dt);
      switch (m.st) {
        case 'wake': if (m.t <= 0) { m.st = 'chase'; m.t = 0; } break;
        case 'stun': m.stun -= dt; if (m.stun <= 0) { m.st = 'chase'; m.t = 0; } break;
        case 'down': m.vx *= fr; m.vy *= fr; break;
        case 'chase': {
          if (HP.ko > 0) { m.vx *= fr; m.vy *= fr; break; }
          var want = Math.atan2(dy, dx); m.face += clamp(angDiff(m.face, want), -R.turn * dt, R.turn * dt);
          var close = dp < D.reach + 20 && P.jz < C.hero.airDodgeZ;
          if (close && m.t <= 0) { m.st = 'tele'; m.t = D.tele; m.face = want; count('tele_' + m.kind); }
          else if (dp > D.reach * .7) { m.vx += Math.cos(m.face) * D.speed * PX * R.accel * dt; m.vy += Math.sin(m.face) * D.speed * PX * R.accel * dt; var s = hyp(m.vx, m.vy), cap = D.speed * PX; if (s > cap) { m.vx *= cap / s; m.vy *= cap / s; } }
          break; }
        case 'tele': m.vx *= fr; m.vy *= fr; if (m.t <= 0) { m.st = 'atk'; m.t = D.atk; if (D.dash) { m.vx = Math.cos(m.face) * D.dash * PX; m.vy = Math.sin(m.face) * D.dash * PX; } m.hitDone = false; count('atk_' + m.kind); } break;
        case 'atk': {
          if (!m.hitDone && P.jz < C.hero.airDodgeZ) { var hit = D.dash ? dp < D.r + 16 : (dp < D.sweep && Math.abs(angDiff(m.face, Math.atan2(dy, dx))) < 1.4); if (hit) { m.hitDone = true; hurtHero(m, D.name); } }
          else if (!m.hitDone && P.jz >= C.hero.airDodgeZ && dp < (D.dash ? D.r + 16 : D.sweep)) { m.hitDone = true; count('air_dodged'); text(G.px, G.py - 1.6, 'JUMPED IT', '#93f6cf'); }
          if (!D.dash) { m.vx *= fr; m.vy *= fr; }
          if (m.t <= 0) { m.st = 'chase'; m.t = R.recover[0] + Math.random() * R.recover[1]; m.vx *= .3; m.vy *= .3; }
          break; }
      }
      V23.foes.forEach(function (o) { if (o === m || o.st === 'down') return; var ox = m.x - o.x, oy = m.y - o.y, od = hyp(ox, oy); if (od < (m.D.r + o.D.r) * PX && od > .01) { m.vx += ox / od * 60 * PX * dt * 10; m.vy += oy / od * 60 * PX * dt * 10; } });
      var nx = m.x + m.vx * dt, ny = m.y + m.vy * dt;
      if (walk(nx, ny)) { m.x = nx; m.y = ny; } else if (walk(nx, m.y)) { m.x = nx; m.vy *= -.4; } else if (walk(m.x, ny)) { m.y = ny; m.vx *= -.4; } else { m.vx *= -.4; m.vy *= -.4; }
      if (P.dashT > 0 && m.st !== 'down' && hyp(G.px - m.x, G.py - m.y) < (m.D.r + 18) * PX && !m.rammed) { m.rammed = .4; damage(m, C.nimbus.dashRamDmgHits * C.hpUnit, P.dashDir ? P.dashDir[0] * 2 : 0, P.dashDir ? P.dashDir[1] * 2 : 0, 'ram', 'BOOST RAM'); }
      if (m.rammed > 0) m.rammed -= dt; else m.rammed = 0;
    }

    /* ------------------------------------------------ bosses (METAL CANON S1 ladder; fight design = METAL PROPOSAL; placeholder art) */
    function startBoss(id, x, y, src) { var def = C.bosses[id], s = spot(x, y, 4, 6, 0, 1) || [x, y];
      var B = V23.boss = { id: id, def: def, stab: 100, phase: 1, t: 0, intro: 3.2, done: false, doneT: 0, x: s[0], y: s[1], st: 'free', stT: def.cycle ? def.cycle.firstFree : 0, waves: [], stress: 0, torsion: 0, charge: null, chargeT: def.charge ? def.charge.first : 0, src: src, hitT: 0 };
      banner(def.name + (def.ep ? ' · ' + def.ep : ''), def.tier + ' · S1 villain ladder (CANON) · ' + def.intro, '#ff9a6a', 3.2); toast(def.name + ': ' + def.how, 'gold');
      var r = rec(); r.villains[id] = r.villains[id] || { met: 0, stopped: 0 }; r.villains[id].met++; count('boss_' + id); saveRec(); return B; }
    V23.startBoss = startBoss;
    function bossHit(B, amt, label) { if (B.done) return; B.stab = Math.max(0, B.stab - amt); B.hitT = .35; text(B.x, B.y - 2.4, label + ' −' + Math.round(amt), '#ffd27a'); count('boss_dmg_' + B.id); count('boss_dmg'); }
    function bossDirect(kind) { var B = V23.boss; if (!B || B.done || B.intro > 0) return false; var dv = dvec(), dx = B.x - G.px, dy = B.y - G.py, d = hyp(dx, dy);
      var reach = kind === 'hit' ? C.nimbus.hitRangePx * PX + .4 : 99; if (d > reach) return false;
      if (B.id === 'ballast') { if (!B.saidPair) { B.saidPair = 1; banner('BALLAST: "You can’t move me."', 'METAL: "Didn’t plan to." — move what he’s standing on (ROOT / CORE)', '#ffb38a', 2.6); } text(B.x, B.y - 2.4, 'CAN’T MOVE HIM', '#ffcf7a'); count('ballast_unmoved'); }
      else { text(B.x, B.y - 2.4, 'TINK — direct hits fail', '#cfe6ff'); count('glassjaw_tink'); } return true; }
    function bossCell(kind, c) { var B = V23.boss; if (!B || B.done || B.intro > 0) return false; if (hyp(c.x - B.x, c.y - B.y) > c.r + .9) return false;
      if (B.id === 'ballast') { if (kind === 'crown') return false;
        if (B.st === 'braced' || B.st === 'tele') { text(B.x, B.y - 2.4, 'SNAP — HE’S BRACED', '#ffb38a'); toast("SNAP — HE'S BRACED. WAIT FOR THE SHIFT TO SETTLE", 'dim'); count('ballast_braced_block'); return true; }
        var o = nimbus(kind, 'ballast', dvec()); bossHit(B, o.dmg, kind === 'root' ? 'ROOT LIFTS THE GROUND' : 'CORE SHIFTS THE FLOOR'); return true; }
      return false; }   // Glassjaw: cells are handled as torsion in stepBoss
    function stepBoss(B, dt) {
      if (B.intro > 0) { B.intro -= dt; return; }
      if (B.done) { B.doneT -= dt; if (B.doneT <= 0) endBoss(); return; }
      B.t += dt; if (B.hitT > 0) B.hitT -= dt; var def = B.def, dx = G.px - B.x, dy = G.py - B.y, d = hyp(dx, dy) || 1e-6, dp = d / PX;
      if (B.id === 'ballast') { var cy = def.cycle; B.stT -= dt;
        if (B.st === 'free' && B.stT <= 0) { B.st = 'tele'; B.stT = cy.tele; count('ballast_tele'); }
        else if (B.st === 'tele') { if (B.stT <= 0) { B.st = 'braced'; B.stT = cy.braced[B.phase - 1]; B.waves.push({ x: B.x, y: B.y, r: 30 * PX }); count('kachunk'); banner('KA CHUNK', 'mass shifted · harness braced — JUMP the shockwave', '#ffb24a', .9); } }
        else if (B.st === 'braced' && B.stT <= 0) { B.st = 'free'; B.stT = cy.free[B.phase - 1]; }
        B.waves.forEach(function (w) { var pr = w.r; w.r += dt * def.wave.speed * PX; var wd = hyp(G.px - w.x, G.py - w.y), inBand = wd > pr - def.wave.band * PX && wd < w.r + def.wave.band * PX;
          if (!w.hit && inBand) { w.hit = true; if (P.jz < def.wave.groundZ && HP.ko <= 0) hurtHero(w, 'KA CHUNK SHOCKWAVE'); else { count('wave_jumped'); text(G.px, G.py - 1.6, 'CLEARED THE WAVE', '#93f6cf'); } } });
        B.waves = B.waves.filter(function (w) { return w.r < def.wave.max * PX; });
        if (d < .75) { G.px = B.x + dx / d * .75; G.py = B.y + dy / d * .75; if (!B.said) { B.said = 1; toast('BALLAST: "You can\'t move me."', 'gold'); } } }
      else {   // GLASSJAW
        var ch = def.charge;
        if (B.phase >= 3) {
          if (!B.charge) { B.chargeT -= dt; if (B.chargeT <= 0) { B.charge = { a: Math.atan2(dy, dx), tele: ch.tele, t: 0 }; count('glassjaw_charge'); } }
          else if (B.charge.tele > 0) B.charge.tele -= dt;
          else { B.charge.t += dt; var nx = B.x + Math.cos(B.charge.a) * ch.speed * PX * dt, ny = B.y + Math.sin(B.charge.a) * ch.speed * PX * dt;
            if (B.charge.t > ch.max || !walk(nx, ny)) { B.charge = null; B.chargeT = ch.cool; } else { B.x = nx; B.y = ny; } } }
        else { var dr = def.drift, mx = B.x + Math.cos(B.t * dr[2]) * dr[0] * PX * dt, my = B.y + Math.sin(B.t * dr[3]) * dr[1] * PX * dt; if (walk(mx, my)) { B.x = mx; B.y = my; } }
        if (dp < ch.contact && HP.ko <= 0) { if (B.charge && B.charge.tele <= 0) hurtHero(B, 'GLASSJAW CHARGE'); else { G.px = B.x + dx / d * ch.contact * PX * 1.05; G.py = B.y + dy / d * ch.contact * PX * 1.05; } }
        var inCell = P.cells.some(function (c) { return (c.kind === 'root' || c.kind === 'core') && hyp(c.x - B.x, c.y - B.y) < c.r + .6; });
        if (inCell && dp < def.torsionR) { B.torsion += dt; if (B.torsion > def.torsionT) { B.torsion = 0; var o = nimbus('core', 'glassjaw', dvec(), true); bossHit(B, def.torsionDmg, 'TORSION CRACK'); V23.lastTorsionNimbus = o; } } }
      var ph = B.stab > def.phases[0] ? 1 : B.stab > def.phases[1] ? 2 : 3;
      if (ph !== B.phase) { B.phase = ph; banner('PHASE ' + ph, B.id === 'ballast' ? (ph === 2 ? 'He braces longer' : 'KA CHUNK on repeat') : (ph === 2 ? 'Reinforced coating cracking' : 'He’s charging'), '#ffb38a', 1.2); }
      if (B.stab <= 0 && !B.done) winBoss(B); }
    function landed() { var B = V23.boss; if (!B || B.done || B.intro > 0 || B.id !== 'glassjaw') return; if (hyp(G.px - B.x, G.py - B.y) < B.def.landR * PX) { B.stress++; count('glassjaw_stress'); text(B.x, B.y - 2.4, 'STRESS ' + B.stress + '/' + B.def.stressN, '#cfe6ff');
        if (B.stress >= B.def.stressN) { B.stress = 0; bossHit(B, B.def.stressDmg, 'REPEATED LOADING'); } } }
    function winBoss(B) { B.done = true; B.doneT = 3.6; var r = rec(); r.villains[B.id].stopped++; r.events++; count('boss_win_' + B.id);
      banner(B.def.name + ' · STOPPED', C.winCard + ' ' + B.def.outro.join(' '), '#8ae6c8', 3.6); unlock('your:villain_' + B.id, B.def.name + ' stopped'); saveRec(); }
    function endBoss() { V23.boss = null; }

    /* ------------------------------------------------ the city work site (free roam) */
    var site = V23.site = { id: C.citySite.id, x: C.citySite.x, y: C.citySite.y, state: 'idle', cool: 0, cleared: 0 };
    function spawnSite() { var r = rec(); site.state = 'live'; site.cleared = r.sites.cleared; var comp = C.sites[C.citySite.comp];
      spawnGroup(compKinds(comp.n, Math.min(3, site.cleared)), site.x, site.y + 2, 2.5, 5, 'site');
      banner('LABOR GHOSTING', comp.name + ' pattern · machines replaying old work cycles — isolate every machine, dodge the amber tells', '#ffb24a', 2.4); count('site_start'); }
    function powerDownSite(msg) { V23.foes.forEach(function (m) { if (m.src === 'site' && m.st !== 'down') { m.st = 'down'; m.t = .01; } }); site.state = 'idle'; site.cool = 20; if (msg) toast(msg, 'dim'); count('site_powerdown'); }
    function stepSite(dt) { if (site.cool > 0) site.cool -= dt;
      if (site.state === 'idle' && site.cool <= 0 && !V23.raid && !V23.boss && HP.ko <= 0 && hyp(G.px - site.x, G.py - site.y) < C.citySite.startTiles) spawnSite();
      if (site.state === 'live') { if (!live('site').length) { site.state = 'idle'; site.cool = C.siteCool; var r = rec(); r.sites.cleared++; r.events++; count('site_cleared');
          banner('SITE ISOLATED', 'Plaza work site · work cycle stopped', '#ffd27a', 1.6); unlock('your:site_isolated', 'work site isolated'); saveRec(); }
        else if (hyp(G.px - site.x, G.py - site.y) > C.siteAbandonPx * PX) powerDownSite('You walked away — the machines powered down where they stood.'); } }
    V23.startSite = function () { if (site.state !== 'live') spawnSite(); return site; };

    /* ------------------------------------------------ raid */
    function chooseBoss() { var r = rec(), bs = r.villains, gj = C.bosses.glassjaw.unlock, bStop = bs.ballast && bs.ballast.stopped, gStop = bs.glassjaw && bs.glassjaw.stopped;
      if (!bStop) return 'ballast'; if (!gStop && r.events >= gj.eventsDone) return 'glassjaw'; if (gStop) return r.raids.cleared % 2 ? 'glassjaw' : 'ballast'; return 'ballast'; }
    V23.chooseBoss = chooseBoss;
    function startRaid(src) { if (V23.raid) return false; if (!onCity()) { toast('Raids happen in the city (Savannah). Go outside first.', 'dim'); return false; }
      if (HP.ko > 0) return false; if (site.state === 'live') powerDownSite();
      var r = rec(), lvl = Math.min(3, r.raids.cleared);
      V23.raid = { wave: 0, total: C.raid.waves.length + 1, state: 'rest', t: 2.2, lvl: lvl, boss: chooseBoss(), ox: G.px, oy: G.py, src: src || 'beacon', started: Date.now() };
      r.raids.started++; HP.hp = HP.max; count('raid_start'); banner(C.raid.name, 'Survive ' + C.raid.waves.length + ' waves of ghosted machines, then the boss · escalation level ' + lvl, '#ff8a6a', 2.2); saveRec(); return true; }
    V23.startRaid = startRaid;
    function stepRaid(dt) { var R0 = V23.raid; if (!R0) return;
      if (!onCity()) return failRaid('left the city', true);
      if (hyp(G.px - R0.ox, G.py - R0.oy) > C.raid.abandonTiles) return failRaid('walked away', true);
      if (R0.state === 'rest') { R0.t -= dt; if (R0.t <= 0) { R0.wave++; var r = rec(); r.raids.bestWave = Math.max(r.raids.bestWave, R0.wave);
          if (R0.wave <= C.raid.waves.length) { var key = C.raid.waves[R0.wave - 1], comp = C.sites[key]; spawnGroup(compKinds(comp.n, R0.lvl), G.px, G.py, C.raid.spawnMin, C.raid.spawnMax, 'raid'); R0.state = 'fight'; count('raid_wave');
            banner('WAVE ' + R0.wave + '/' + R0.total, comp.name + ' pattern · ' + live('raid').length + ' machines', '#ffb24a', 1.6); }
          else { startBoss(R0.boss, G.px, G.py, 'raid'); R0.state = 'boss'; count('raid_boss'); } } }
      else if (R0.state === 'fight') { if (!live('raid').length) { R0.state = 'rest'; R0.t = C.raid.rest; banner('WAVE ' + R0.wave + ' CLEARED', 'Next wave in ' + C.raid.rest + ' s · Calm with Veyru to steady your Valence Stars', '#93f6cf', 1.6); count('raid_wave_clear'); saveRec(); } }
      else if (R0.state === 'boss') { if (!V23.boss || (V23.boss.done && V23.boss.doneT <= 0.05)) winRaid(); } }
    function winRaid() { var R0 = V23.raid, r = rec(), y = Ys(), s = S(), day = y && y.today ? y.today.day : 0; V23.raid = null; r.raids.cleared++; r.events++; count('raid_win');
      var paid = 0, net = 0; if (!C.raid.reward.oncePerDay || r.raids.lastPaidDay !== day) { paid = C.raid.reward.gross; net = X.M.payroll(s, paid); r.raids.lastPaidDay = day; if (y && y.today) { y.today.gross += paid; y.today.earned += net; y.today.acts.push({ act: 'raid', result: 'survived', gross: paid, net: net }); } }
      V22.bondUp(C.raid.reward.bond, 'raid'); NB.stepValenceControllerActions(shell, { valenceRegulationActive: true });
      V23.lastRaid = { result: 'survived', paid: paid, net: net, boss: R0.boss, waves: R0.wave };
      banner('RAID SURVIVED', 'Starter Flat block is safe · ' + (paid ? '$' + paid + ' gross → ' + X.money(net) + ' after FICA' : 'bonus already paid today') + ' · Veyru bond +' + C.raid.reward.bond, '#fff0a9', 3.2);
      unlock('your:raid_survived', 'first raid survived'); saveRec(true); }
    function failRaid(why, retreat) { var R0 = V23.raid; if (!R0) return; V23.raid = null; var r = rec(); r.raids.failed++; count(retreat ? 'raid_retreat' : 'raid_fail');
      V23.foes.forEach(function (m) { if (m.src === 'raid' && m.st !== 'down') { m.st = 'down'; m.t = .01; } }); if (V23.boss && V23.boss.src === 'raid') V23.boss = null;
      V23.lastRaid = { result: retreat ? 'retreated' : 'failed', why: why, waves: R0.wave, boss: R0.boss };
      banner(C.retreatLine.replace('{name}', 'the raid'), 'Raid ' + (retreat ? 'abandoned' : 'failed') + ' (' + why + ') at wave ' + R0.wave + '. No money, items or progress lost — try again any time.', '#ffb38a', 3);
      saveRec(true); }
    V23.failRaid = failRaid;

    /* ------------------------------------------------ the V7 kit lands on enemies */
    var POW = V22.power, base = {};
    ['hit', 'blast', 'root', 'core', 'crown', 'calm', 'dash', 'jump', 'transform'].forEach(function (k) { base[k] = POW[k]; POW[k] = function () { if (HP.ko > 0) { count('ko_block'); return false; } var r = base[k].apply(this, arguments); if (r) after(k); return r; }; });
    function targetsInFront(range, arc, close) { var dv = dvec(), a0 = Math.atan2(dv[1], dv[0]); return live().filter(function (m) { if (m.st === 'wake') return false; var dx = m.x - G.px, dy = m.y - G.py, d = hyp(dx, dy); return d <= range && (d < close || Math.abs(angDiff(a0, Math.atan2(dy, dx))) < arc); })
      .sort(function (a, b) { return hyp(a.x - G.px, a.y - G.py) - hyp(b.x - G.px, b.y - G.py); }); }
    function after(k) { var dv = dvec(), N = C.nimbus;
      if (k === 'hit') { var t = targetsInFront(N.hitRangePx * PX, N.hitArc, N.hitClosePx * PX)[0]; if (t) { var o = nimbus('hit', t.kind, dv); damage(t, o.dmg, dv[0] * 160 * PX, dv[1] * 160 * PX, 'melee', o.strike ? o.strike.split(' /')[0].toUpperCase() : 'HIT'); } else bossDirect('hit'); }
      else if (k === 'root' || k === 'core') { var c = P.cells[P.cells.length - 1]; if (!c) return; var hitL = live().filter(function (m) { return m.st !== 'wake' && hyp(m.x - c.x, m.y - c.y) < c.r + m.D.r * PX + .3; });
        hitL.forEach(function (m, i) { var o = nimbus(k, m.kind, dv, i > 0); damage(m, o.dmg, (m.x - c.x) * 2, (m.y - c.y) * 2, 'aoe', k.toUpperCase()); }); bossCell(k, c); }
      else if (k === 'crown') { var near = live().filter(function (m) { return m.st !== 'wake' && hyp(m.x - G.px, m.y - G.py) < N.crownRangeTiles; }).sort(function (a, b) { return hyp(a.x - G.px, a.y - G.py) - hyp(b.x - G.px, b.y - G.py); })[0];
        if (near) { var o2 = nimbus('crown', near.kind, dv); damage(near, o2.dmg, 0, 0, 'aoe', 'CROWN'); } }
      else if (k === 'calm') { if (!combatLive()) return; var n = 0; live().forEach(function (m) { if (hyp(m.x - kaw.x, m.y - kaw.y) < C.veyru.snareRangePx * tpp) { m.st = 'stun'; m.stun = C.veyru.calmStun; n++; } });
        if (N.calmRegulates) NB.stepValenceControllerActions(shell, { valenceRegulationActive: true }); if (HP.hp < HP.max && HP.ko <= 0) HP.hp = Math.min(HP.max, HP.hp + C.veyru.calmHeal);
        count('veyru_calm_pulse'); V23.lastCalm = { stunned: n, stars: shell.stars, hp: HP.hp }; text(kaw.x, kaw.y - 1.6, 'VEYRU · CALM PULSE' + (n ? ' ×' + n : ''), '#adff9a'); }
      else if (k === 'dash') { HP.inv = Math.max(HP.inv, C.hero.dodgeInv); count('dash_iframes'); }
    }
    function combatLive() { return !!(live().length || V23.boss); }
    V23.combatLive = combatLive;

    /* ------------------------------------------------ main step (rides on movePlayer like the v2.2 kit) */
    var lastCircuit = 0, lastJz = 0, snareT = 0;
    var _mp = F.movePlayer();
    X.set('movePlayer', function (dt) { var x0 = G.px, y0 = G.py; _mp(dt); if (!S()) return;
      if (HP.ko > 0) { G.px = x0; G.py = y0; G.path = []; HP.ko -= dt; if (HP.ko <= 0) recover(); }
      HP.inv = Math.max(0, HP.inv - dt); HP.hurtT = Math.max(0, HP.hurtT - dt);
      if (hyp(HP.kb[0], HP.kb[1]) > .05) { var nx = G.px + HP.kb[0] * dt, ny = G.py + HP.kb[1] * dt; if (walk(nx, ny)) { G.px = nx; G.py = ny; } var f = Math.exp(-6 * dt); HP.kb[0] *= f; HP.kb[1] *= f; } else HP.kb = [0, 0];
      if (bannerT > 0) { bannerT -= dt; if (bannerT <= 0) { var bb = $('#yourCombatBanner'); if (bb) bb.hidden = true; } }
      V23.fx.forEach(function (t) { t.life -= dt; t.y -= dt * .6; }); V23.fx = V23.fx.filter(function (t) { return t.life > 0; });
      if (!onCity()) return;
      stepSite(dt); stepRaid(dt);
      V23.foes.forEach(function (m) { step(m, dt); }); V23.foes = V23.foes.filter(function (m) { return !(m.st === 'down' && m.t <= 0); });
      if (V23.boss) stepBoss(V23.boss, dt);
      P.shots.forEach(function (s) { if (s.life <= 0) return; var hitM = live().find(function (m) { return m.st !== 'wake' && hyp(m.x - s.x, m.y - s.y) < s.r / T + m.D.r * PX + .15; });
        if (hitM) { s.life = 0; var o = nimbus('blast', hitM.kind, [Math.sign(s.vx), Math.sign(s.vy)]); damage(hitM, o.dmg, s.vx * .15, s.vy * .15, 'blast', 'BLAST'); count('blast_hit'); return; }
        var B = V23.boss; if (B && !B.done && B.intro <= 0 && hyp(B.x - s.x, B.y - s.y) < .9) { s.life = 0; bossDirect('blast'); } });
      if ((P.uses.circuit || 0) > lastCircuit) { lastCircuit = P.uses.circuit; if (combatLive()) { NB.stepValenceControllerActions(shell, { gravitationalChargeActive: true, gravitationalChargeIntensity: C.nimbus.circuitChargeIntensity });
          HP.hp = Math.min(HP.max, HP.hp + 1); live().forEach(function (m) { if (hyp(m.x - G.px, m.y - G.py) < 4) { m.st = 'stun'; m.stun = C.veyru.calmStun; } }); count('circuit_in_combat'); text(G.px, G.py - 2, 'LIVING CIRCUIT · GUARDIAN', '#b3ff84'); } }
      if (lastJz > 0 && P.jz <= 0) landed(); lastJz = P.jz;
      if (live().length && HP.ko <= 0) { snareT += dt; if (snareT >= C.veyru.snareEvery) { snareT = 0; var tgt = live().filter(function (m) { return m.st !== 'wake' && m.st !== 'down' && hyp(m.x - kaw.x, m.y - kaw.y) < C.veyru.snareRangePx * tpp; })[0];
          if (tgt) { tgt.st = 'stun'; tgt.stun = Math.max(tgt.stun, C.veyru.snareStun); count('veyru_snare'); text(tgt.x, tgt.y - 1.6, 'VEYRU · RAINROOT SNARE', '#adff9a'); } } } else snareT = 0;
    });
    var _em = F.enterMap(); X.set('enterMap', function (id, at) { var r = _em(id, at); if (id !== 'SAV') { if (V23.raid) failRaid('left the city', true); if (site.state === 'live') powerDownSite(); V23.foes = []; V23.boss = null; } return r; });

    /* ------------------------------------------------ drawing */
    function drawMachine(m) { var cx = X.cx, D = m.D, down = m.st === 'down', i = down || m.st === 'stun' ? 3 : m.st === 'tele' ? 1 : m.st === 'atk' ? 2 : 0, name = m.kind + '_' + i, r = FR[name], im = img(name);
      var x = m.x * T, y = m.y * T + 8 - (D.hover && !down ? (D.hover + Math.sin(m.cyc * 3) * 5 - (m.st === 'atk' ? 30 : 0)) * .35 : 0), sc = (D.spr || (m.kind === 'loader' ? .8 : .85)) * C.scale.drawK * (m.flash > 0 ? 1.06 : 1);
      cx.save(); cx.globalAlpha = down ? clamp(m.t / 1.2, 0, 1) : 1;
      cx.fillStyle = 'rgba(6,2,12,.45)'; cx.beginPath(); cx.ellipse(m.x * T, m.y * T + 8, D.r * .62, D.r * .26, 0, 0, 7); cx.fill();
      if (m.st === 'tele') { var k = 1 - m.t / D.tele; cx.fillStyle = 'rgba(255,170,60,' + (.15 + k * .35) + ')'; cx.strokeStyle = 'rgba(255,190,80,' + (.5 + k * .5) + ')'; cx.lineWidth = 2;
        if (D.dash) { cx.save(); cx.translate(m.x * T, m.y * T + 6); cx.rotate(m.face); var L = D.dash * D.atk * .9 * PX * T, W = D.r * PX * T; cx.fillRect(0, -W, L, W * 2); cx.strokeRect(0, -W, L, W * 2); cx.restore(); }
        else { cx.beginPath(); cx.moveTo(m.x * T, m.y * T + 6); cx.arc(m.x * T, m.y * T + 6, D.sweep * PX * T, m.face - 1.4, m.face + 1.4); cx.closePath(); cx.fill(); cx.stroke(); } count('tele_drawn'); }
      if (!down) { cx.strokeStyle = 'rgba(255,200,120,.22)'; cx.lineWidth = 1; cx.beginPath(); cx.arc(x, y - 10, D.r * .55 + 4 + Math.sin(m.cyc * 3) * 2, 0, 7); cx.stroke(); }
      if (im && r) { cx.imageSmoothingEnabled = true; var fx = Math.cos(m.face);
        if (m.kind === 'loader' && i === 0) { cx.translate(x, y - r[3] * sc * .35); cx.rotate(m.face + Math.PI / 2); cx.drawImage(im, -r[2] * sc / 2, -r[3] * sc / 2, r[2] * sc, r[3] * sc); }
        else { cx.translate(x, y); if (fx > .2) cx.scale(-1, 1); cx.drawImage(im, -r[2] * sc / 2, -r[3] * sc, r[2] * sc, r[3] * sc); }
        if (m.flash > 0) { cx.globalCompositeOperation = 'lighter'; cx.globalAlpha = .5; cx.drawImage(im, -r[2] * sc / 2, -r[3] * sc, r[2] * sc, r[3] * sc); }
        count('machine_sprite'); count('machine_sprite_' + m.kind); }
      else { cx.translate(x, y); cx.fillStyle = m.flash > 0 ? '#fff' : '#555a63'; cx.fillRect(-10, -22, 20, 18); count('machine_shape'); }
      cx.restore();
      if (!down) { var top = m.y * T + 8 - (r ? r[3] * sc : 30) - 6, n = D.hp, f = Math.ceil(m.hp / C.hpUnit); cx.save(); for (var j = 0; j < n; j++) { cx.fillStyle = j < f ? '#ffcf7a' : 'rgba(255,255,255,.18)'; cx.fillRect(m.x * T - n * 3 + j * 6, top, 4.5, 2.5); }
        if (m.st === 'stun') { cx.fillStyle = '#fff'; cx.font = '900 9px JetBrains Mono, monospace'; cx.textAlign = 'center'; cx.fillText('✶', m.x * T + Math.sin(m.cyc * 9) * 5, top - 3); } cx.restore(); } }
    function drawBoss(B) { var cx = X.cx, x = B.x * T, y = B.y * T + 8, t = performance.now() / 1000, g = B.id === 'glassjaw';
      cx.save(); cx.globalAlpha = B.done ? clamp(B.doneT / 1.2, .25, 1) : 1;
      B.waves.forEach(function (w) { cx.strokeStyle = 'rgba(255,178,74,.85)'; cx.lineWidth = 4; cx.beginPath(); cx.ellipse(w.x * T, w.y * T + 8, w.r * T, w.r * T * .5, 0, 0, 7); cx.stroke(); count('wave_drawn'); });
      if (B.st === 'tele') { cx.strokeStyle = 'rgba(255,170,60,' + (.4 + .5 * Math.sin(t * 20)) + ')'; cx.lineWidth = 3; cx.beginPath(); cx.ellipse(x, y, 28 + (1 - B.stT / B.def.cycle.tele) * 18, 12, 0, 0, 7); cx.stroke(); count('boss_tele_drawn'); }
      if (B.charge && B.charge.tele > 0) { cx.strokeStyle = 'rgba(255,120,90,.8)'; cx.setLineDash([6, 4]); cx.lineWidth = 3; cx.beginPath(); cx.moveTo(x, y - 20); cx.lineTo(x + Math.cos(B.charge.a) * 140, y - 20 + Math.sin(B.charge.a) * 140); cx.stroke(); cx.setLineDash([]); count('boss_tele_drawn'); }
      cx.fillStyle = 'rgba(0,0,0,.35)'; cx.beginPath(); cx.ellipse(x, y, 26, 9, 0, 0, 7); cx.fill();
      var fl = B.hitT > 0;
      if (!g) { cx.fillStyle = fl ? '#fff' : '#3d4048'; cx.fillRect(x - 20, y - 64, 40, 58); cx.fillStyle = '#6b6f79'; cx.beginPath(); cx.arc(x, y - 72, 12, 0, 7); cx.fill();
        cx.strokeStyle = B.st === 'braced' ? '#ffb24a' : '#a86a20'; cx.lineWidth = 4; cx.strokeRect(x - 23, y - 52, 46, 26); cx.beginPath(); cx.moveTo(x - 20, y - 60); cx.lineTo(x + 20, y - 30); cx.moveTo(x + 20, y - 60); cx.lineTo(x - 20, y - 30); cx.stroke();
        cx.fillStyle = '#23252a'; cx.fillRect(x - 28, y - 8, 56, 10); }
      else { cx.translate(x, y - 40); cx.fillStyle = fl ? '#fff' : 'rgba(190,225,255,.85)'; cx.strokeStyle = '#e8f6ff'; cx.lineWidth = 2; cx.beginPath(); cx.moveTo(0, -36); cx.lineTo(18, -6); cx.lineTo(10, 34); cx.lineTo(-10, 34); cx.lineTo(-18, -6); cx.closePath(); cx.fill(); cx.stroke();
        cx.strokeStyle = 'rgba(120,160,200,.9)'; cx.lineWidth = 1; for (var c = 0; c < Math.floor((100 - B.stab) / 12); c++) { cx.beginPath(); cx.moveTo(-12 + c * 4, -20 + c * 6); cx.lineTo(8 - c * 3, -4 + c * 7); cx.stroke(); } cx.translate(-x, -(y - 40)); }
      cx.restore(); count('boss_drawn_' + B.id);
      cx.save(); cx.font = '800 8px JetBrains Mono, monospace'; cx.textAlign = 'center'; var lab = B.def.name + ' · placeholder art', w = cx.measureText(lab).width + 8;
      cx.fillStyle = 'rgba(8,10,24,.8)'; cx.fillRect(x - w / 2, y - 104, w, 11); cx.fillStyle = '#ff9a6a'; cx.fillText(lab, x, y - 95.5);
      cx.fillStyle = '#0009'; cx.fillRect(x - 30, y - 90, 60, 5); cx.fillStyle = B.st === 'braced' || B.st === 'tele' ? '#f99662' : '#92e9c8'; cx.fillRect(x - 30, y - 90, 60 * B.stab / 100, 5); cx.restore(); }
    function drawMarker(x, y, col, glyph, label) { var cx = X.cx, t = performance.now() / 1000, X0 = x * T, Y0 = y * T + 6;
      cx.save(); cx.strokeStyle = col; cx.globalAlpha = .55 + .35 * Math.sin(t * 3); cx.lineWidth = 2; cx.beginPath(); cx.ellipse(X0, Y0, 14, 6, 0, 0, 7); cx.stroke(); cx.globalAlpha = 1;
      cx.font = '900 14px system-ui'; cx.textAlign = 'center'; cx.fillStyle = col; cx.fillText(glyph, X0, Y0 - 10 - Math.sin(t * 3) * 2);
      cx.font = '700 7px JetBrains Mono, monospace'; var w = cx.measureText(label).width + 6; cx.fillStyle = 'rgba(8,10,24,.75)'; cx.fillRect(X0 - w / 2, Y0 - 36, w, 10); cx.fillStyle = col; cx.fillText(label, X0, Y0 - 28.5); cx.restore(); }
    function drawTexts() { var cx = X.cx; V23.fx.forEach(function (t) { cx.save(); cx.globalAlpha = Math.min(1, t.life * 1.6); cx.font = '800 8px JetBrains Mono, monospace'; cx.textAlign = 'center'; cx.fillStyle = '#000'; cx.fillText(t.s, t.x * T + .6, t.y * T - 20 + .6); cx.fillStyle = t.col; cx.fillText(t.s, t.x * T, t.y * T - 20); cx.restore(); }); }
    var _dp = F.drawPlayer();
    X.set('drawPlayer', function (tm) { if (!onCity()) return _dp(tm);
      if (!V23.raid && !V23.boss) drawMarker(C.raid.beacon.x, C.raid.beacon.y, '#ff8a6a', '♦', 'RAID · E / tap');
      if (site.state === 'idle' && site.cool <= 0 && !V23.raid) drawMarker(site.x, site.y, '#ffb24a', '⚙', 'LABOR GHOSTING');
      var ents = V23.foes.slice(); if (V23.boss) ents.push(V23.boss);
      ents.filter(function (e) { return e.y <= G.py; }).sort(function (a, b) { return a.y - b.y; }).forEach(function (e) { e.def ? drawBoss(e) : drawMachine(e); });
      var blink = HP.inv > 0 && HP.ko <= 0 && Math.floor(performance.now() / 90) % 2; X.cx.save(); if (HP.ko > 0) { X.cx.globalAlpha = .55; count('hero_ko_drawn'); } else if (blink) { X.cx.globalAlpha = .45; count('hero_blink'); } _dp(tm); X.cx.restore();
      ents.filter(function (e) { return e.y > G.py; }).sort(function (a, b) { return a.y - b.y; }).forEach(function (e) { e.def ? drawBoss(e) : drawMachine(e); });
      drawTexts(); });

    /* ------------------------------------------------ raid beacon: E / tap / phone */
    var BEACON = { id: 'raidBeacon', name: 'Raid beacon', your: 'v23raid', role: C.raid.name, x: C.raid.beacon.x, y: C.raid.beacon.y, vis: true };
    var _hit = F.hitObj(); X.set('hitObj', function (wx, wy) { if (onCity() && !V23.raid && Math.abs(BEACON.x - wx) < .6 && wy > BEACON.y - 1.2 && wy < BEACON.y + .5) return { npc: BEACON }; return _hit(wx, wy); });
    var _on = F.openNpc(); X.set('openNpc', function (n) { if (n && n.your === 'v23raid') return openRaid(); return _on(n); });
    var _in = F.interactNear(); X.set('interactNear', function () { if (onCity() && !V23.raid && !layer() && hyp(G.px - BEACON.x, G.py - BEACON.y) < 1.2) return openRaid(); return _in(); });
    function recordHtml() { var r = rec() || { raids: {}, villains: {}, isolated: {}, sites: {} }, vb = function (id) { var v = r.villains[id]; return v ? (v.stopped ? 'stopped ×' + v.stopped : 'met, not stopped') : 'not met'; };
      return '<div class="kv"><span>Raids survived / failed</span><b>' + (r.raids.cleared | 0) + ' / ' + (r.raids.failed | 0) + ' · best wave ' + (r.raids.bestWave | 0) + '</b></div>' +
        '<div class="kv"><span>BALLAST (S1E1)</span><b>' + vb('ballast') + '</b></div><div class="kv"><span>GLASSJAW</span><b>' + vb('glassjaw') + (r.villains.ballast && r.villains.ballast.stopped ? '' : ' · appears after Ballast') + '</b></div>' +
        '<div class="kv"><span>Machines isolated</span><b>' + Object.keys(C.machines).map(function (k) { return C.machines[k].name.replace('GHOSTED ', '') + ' ' + (r.isolated[k] | 0); }).join(' · ') + '</b></div>' +
        '<div class="kv"><span>Knocked down</span><b>' + (r.kos | 0) + ' (always recoverable)</b></div>'; }
    function openRaid() { F.openSheet()('<h3>' + esc(C.raid.name) + '</h3><div class="sh-sub">' + esc(C.brand.full) + ' · ' + C.raid.waves.length + ' waves of ghosted machines (METAL: IN DA RIFFT), then a boss: <b>' + esc(C.bosses[chooseBoss()].name) + '</b>. Knocked down = the raid fails, you recover, nothing is lost.</div>' +
        '<div class="sh-sub dim">Powers: HIT J · BLAST L · DASH Shift · JUMP Q (jump shockwaves) · ROOT 1 · CORE 2 · CROWN 3 · CALM C (Veyru stuns machines, steadies Valence Stars, +1 ♥) · SHIFT T (absorbs hits). Touch: MELLA button.</div>' +
        recordHtml() + '<div class="acts"><button type="button" class="btn" id="v23RaidGo">Start the raid</button></div>');
      var b = $('#v23RaidGo'); if (b) b.onclick = function () { F.closeSheet()(); startRaid('beacon'); }; count('raid_sheet'); }
    V23.openRaid = openRaid;

    /* ------------------------------------------------ HUD: hearts, Valence Stars, raid / boss status, banner */
    var hud = document.createElement('div'); hud.id = 'yourCombatHud'; ($('#stage') || document.body).appendChild(hud);
    var ban = document.createElement('div'); ban.id = 'yourCombatBanner'; ban.hidden = true; ($('#stage') || document.body).appendChild(ban);
    var st = document.createElement('style'); st.textContent =
      '#yourCombatHud{position:absolute;left:6px;top:44px;z-index:6;pointer-events:none;font:700 9px JetBrains Mono,monospace;color:#ffe;background:rgba(8,10,24,.72);border:1px solid rgba(255,138,106,.35);border-radius:8px;padding:3px 6px;line-height:1.45;max-width:58vw}' +
      '#yourCombatHud .h{color:#ff6f7d;letter-spacing:1px}#yourCombatHud .h i{color:#3a2a33;font-style:normal}#yourCombatHud .s{color:#ffe680}#yourCombatHud .b{color:#ff9a6a}#yourCombatHud u{display:inline-block;height:5px;background:#92e9c8;border-radius:3px;vertical-align:middle;text-decoration:none}' +
      '#yourCombatBanner{position:absolute;left:50%;top:22%;transform:translateX(-50%);z-index:7;pointer-events:none;text-align:center;background:rgba(8,10,24,.84);border:1px solid rgba(255,178,74,.5);border-radius:12px;padding:7px 12px;max-width:min(86vw,520px);font:800 13px var(--display,system-ui);color:#fff}' +
      '#yourCombatBanner[hidden]{display:none}#yourCombatBanner span{display:block;font:600 10px system-ui;color:#dfe;margin-top:3px}' +
      '.ybrand2{font:800 12px var(--display,system-ui);letter-spacing:1px;color:#ffcf6a;margin-top:2px}.ybrand2 b{color:#7cf0e0}';
    document.head.appendChild(st);
    function updHud() { var show = !!S() && $('#start').hidden && !G.yourAct; hud.style.display = show ? '' : 'none'; if (!show) return;
      var top = $('#yourMellaHud'); if (top && top.offsetHeight) hud.style.top = (top.offsetTop + top.offsetHeight + 4) + 'px';
      var h = ''; for (var i = 0; i < HP.max; i++) h += i < HP.hp ? '♥' : '<i>♥</i>';
      var s = '<span class="h">' + h + '</span>' + (HP.ko > 0 ? ' <b class="b">DOWN · ' + HP.ko.toFixed(1) + 's</b>' : '') + ' <span class="s">★' + shell.stars + ' ' + shell.state + '</span>';
      var R0 = V23.raid, B = V23.boss; if (R0) s += '<br><span class="b">RAID · wave ' + Math.max(1, R0.wave) + '/' + R0.total + (R0.state === 'fight' ? ' · ' + live('raid').length + ' left' : R0.state === 'rest' ? ' · next in ' + Math.max(0, R0.t).toFixed(0) + 's' : '') + '</span>';
      else if (site.state === 'live') s += '<br><span class="b">LABOR GHOSTING · ' + live('site').length + ' left</span>';
      if (B) s += '<br><span class="b">' + esc(B.def.name) + ' </span><u style="width:' + Math.round(B.stab * .5) + 'px"></u> ' + (B.intro > 0 ? 'arriving' : B.done ? 'STOPPED' : B.id === 'ballast' ? B.st.toUpperCase() : 'phase ' + B.phase + (B.stress ? ' · stress ' + B.stress : ''));
      hud.innerHTML = s; }
    setInterval(updHud, 150); V23.updHud = updHud;

    /* ------------------------------------------------ branding: title, start screen, activity bar, phone YOUR tab */
    var brandHtml = '<div class="ybrand2" id="v23brand"><b>' + esc(C.brand.name) + '</b> — ' + esc(C.brand.tagline) + '</div>';
    function brandStart() { var yb = document.querySelector('#start .ybrand'); if (yb && !$('#v23brand')) yb.insertAdjacentHTML('afterend', brandHtml);
      var su = document.querySelector('#start .ysub'); if (su && !/v2\.3/.test(su.textContent)) su.textContent = su.textContent.replace(/v2\.2 · PROPOSAL_HOLD/, 'v2.3').replace(/ · PROPOSAL_HOLD/g, '').replace(/SIKEE \(Authority Form\) waits at the Arena/, 'SIKEE (Authority Form) waits at the Arena, BALLAST and GLASSJAW raid the city'); }
    var _rs = F.renderStart(); X.set('renderStart', function () { _rs(); brandStart(); }); brandStart();
    var at = $('#yourActTitle'); if (at) at.textContent = C.brand.name;
    new MutationObserver(function () { var a = $('#yourActTitle'); if (a && a.textContent === 'Y.O.U.R.') a.textContent = C.brand.name; }).observe(document.body, { childList: true, subtree: true });
    var _rp = F.renderPhone(); X.set('renderPhone', function (liveR) { _rp(liveR); if (G.tab !== 'your' || liveR) return; var pb = $('#pbody'); if (!pb || $('#v23box')) return;
      var box = document.createElement('div'); box.id = 'v23box';
      box.innerHTML = '<h4>' + esc(C.brand.full) + '</h4><p class="dim">Fight villains and survive raids as the MELLA. Villains: ghosted machines (METAL: IN DA RIFFT) and the S1 villain ladder — BALLAST, GLASSJAW (placeholder art).</p>' + recordHtml() +
        '<div class="acts"><button type="button" class="btn" id="v23PhoneRaid">' + (onCity() ? 'Start a raid here' : 'Raids: go to the city first') + '</button></div>';
      pb.insertBefore(box, pb.firstChild);
      var b = $('#v23PhoneRaid'); if (b) b.onclick = function () { if (!onCity()) { toast('Raids happen in the city (Savannah).', 'dim'); return; } F.closePhone()(); setTimeout(function () { startRaid('phone'); }, 50); }; });

    /* ------------------------------------------------ new game / resume */
    var _ng = F.newGame(); X.set('newGame', function () { _ng(); resetCombat(); rec(); });
    var _re = F.resume(); X.set('resume', function (sv) { _re(sv); resetCombat(); rec(); });
    function resetCombat() { V23.foes = []; V23.boss = null; V23.raid = null; site.state = 'idle'; site.cool = 0; Object.assign(HP, { hp: HP.max, inv: 0, ko: 0, kb: [0, 0] }); var s0 = NB.createValenceShell(); Object.keys(s0).forEach(function (k) { shell[k] = s0[k]; }); lastCircuit = P.uses.circuit || 0; }
    V23.resetCombat = resetCombat;
    document.title = document.title.replace(/^Y\.O\.U\.R\. v2\.\d · PROPOSAL_HOLD/, C.brand.full + ' · v2.3');
    V23.installed = true;
  }
})();
