/* Y.O.U.R. v2.2 · PROPOSAL_HOLD (PUBLISH HOLD) — "you are the MELLA with powers; your sidekick is a KAW" (owner t70u; KAW pick: Veyru).
   Installs after the v2.0 merge layer and the v2.1 layer (wraps window.YOUR_V20_INSTALL). Nothing in Valence's model is copied.
   1. The Mella follower NPC is switched off (YOUR_V20.mella.vis = false). The v2.0 code that drew her stays in the file, unused.
   2. The hero gets the First Wish · Mella V7 kit: jump, dash, hit, blast, calm, transform, ROOT / CORE / CROWN and the ROOT → CORE → CROWN
      circuit (12 s). Numbers are V7's (your_v22_config.js); the scale onto the top-down Valence city and the key mapping are PROPOSED.
   3. Veyru (KAW, Rainroot Lynx, kaw-veyru-001) follows the hero on every map with temporary 64 px side-view frames (left = mirror;
      up/down = side-view PLACEHOLDER until a 4-direction ChatGPT sheet exists). E / tap talks to Veyru (offline/LLM narration), C calms.
   4. The KAW choice and bond are saved in the shared hero profile (wir_hero_profile kaw:{id,…}, v1.2 module, still wir.hero/1). */
(function () {
  'use strict';
  var C = window.YOUR_V22_CONFIG, MC = C.mella, KC = C.kaw, H = window.WIR_HERO, Y = window.YOUR;
  var V22 = window.YOUR_V22 = { version: C.version, installed: false, stats: {}, log: [], pops: [] };
  var tpp = C.scale.valenceWalkTiles / C.scale.v7RunPx;   // tiles per V7 px (PROPOSED scale)
  V22.tpp = tpp;
  var IM = {}; function img(src) { var i = IM[src]; if (!i) { i = IM[src] = new Image(); i.src = src; } return i.complete && i.naturalWidth ? i : null; }
  [KC.art.idle].concat(KC.art.walkR).forEach(img);
  function count(k) { V22.stats[k] = (V22.stats[k] || 0) + 1; }
  var inst = window.YOUR_V20_INSTALL;
  window.YOUR_V20_INSTALL = function (X) {
    inst(X);
    try { install(X); } catch (e) { console.warn('YOUR v2.2 install', e); V22.error = String(e && e.stack || e); }
  };

  function install(X) {
    var G = X.G, F = X.fn, $ = X.$, esc = X.esc, T = X.T, S = function () { return X.S; }, V = window.YOUR_V20, mv = G.your;
    var toast = function (m, c) { F.toast()(m, c); };
    V22.X = X;
    /* ------------------------------------------------ 1. no Mella follower */
    V.mella.vis = false; V.mella.disabled = 'v2.2: the hero is the MELLA (owner t70u)';

    /* ------------------------------------------------ state */
    var P = V22.P = { energy: MC.energy.max, stamina: MC.stamina.max, transformed: false, act: null, actT: 0, actDur: 0, jz: 0, jvz: 0, dashT: 0, dashDir: null,
      stab: 100, chain: [], cells: [], shots: [], reaction: 0, guardian: 0, uses: {} };
    var kaw = V22.kaw = { x: 0, y: 0, dir: 'right', face: 'right', ph: 0, moving: false, trail: [] };
    /* v2.4 hook: the KAW Living Brain reads the hero and the map through this (your_v24.js). */
    function brainEnv() { return { px: G.px, py: G.py, kaw: kaw, map: G.map, walk: function (x, y) { return !!G.map && F.walkable()(G.map, x, y); } }; }
    V22.brainEnv = brainEnv;
    function Ys() { return V.state(); }
    function kawState() { var y = Ys(); if (!y) return null; if (!y.kaw || y.kaw.id !== KC.id) { var pk = null; try { pk = H.get().kaw; } catch (e) {} y.kaw = { id: KC.id, bond: pk && pk.id === KC.id && pk.bond != null ? pk.bond : KC.bondStart, calms: 0, since: (pk && pk.since) || new Date().toISOString() }; } return y.kaw; }
    function kawProfile() { var k = kawState(); if (!k) return; try { H.update({ kaw: { id: KC.id, name: KC.name, species: KC.species, elements: KC.elements, bond: Math.round(k.bond), since: k.since } }); H.unlock('your:kaw_veyru'); } catch (e) { console.warn('kaw profile', e); } }
    V22.kawProfile = kawProfile;
    V22.kawState = kawState;
    var saveT = 0; function bondUp(n, why) { var k = kawState(); if (!k) return; var b0 = k.bond; k.bond = Math.max(0, Math.min(100, k.bond + n)); if (k.bond >= MC.calm.bondDone && b0 < MC.calm.bondDone) { try { H.unlock('your:kaw_bonded'); } catch (e) {} toast('Veyru trusts you completely (bond ' + Math.round(k.bond) + ').', 'gold'); }
      V22.log.push({ bond: n, why: why }); clearTimeout(saveT); saveT = setTimeout(kawProfile, 300); }
    V22.bondUp = bondUp;
    function pop(t) { V22.pops.push({ t: t, life: 1.8 }); if (V22.pops.length > 3) V22.pops.shift(); V22.lastPop = t; }

    /* ------------------------------------------------ blocking checks */
    function layer() { return !S() || !$('#start').hidden || G.sheet || G.phone || G.yourAct || G.fb || G.lab || (X.MG && X.MG.cur) || F.paused()(); }
    function onFoot() { return !F.outdoors()() || G.ride === 'walk'; }
    function side() { return G.dir === 'left' || G.dir === 'right' ? G.dir : (mv.lastH || 'right'); }
    function dvec() { var d = G.dir; return d === 'left' ? [-1, 0] : d === 'right' ? [1, 0] : d === 'up' ? [0, -1] : [0, 1]; }
    function walk(x, y) { return G.map && F.walkable()(G.map, Math.floor(x), Math.floor(y)); }
    function act(kind, dur) { P.act = kind; P.actT = dur; P.actDur = dur; P.uses[kind] = (P.uses[kind] || 0) + 1; }
    function kawDist() { return Math.hypot(kaw.x - G.px, kaw.y - G.py); }

    /* ------------------------------------------------ 2. the MELLA kit (V7) */
    var POW = V22.power = {
      jump: function () { if (P.jz > 0.01 || mv.fly) return false; P.jvz = MC.jump.vz; P.jz = 2; act('jump', 2 * MC.jump.vz / MC.jump.gravity); return true; },
      dash: function () { if (P.stamina < MC.dash.staminaCost || mv.fly) return false; P.stamina -= MC.dash.staminaCost; P.dashT = MC.dash.time; P.dashDir = dvec(); P.uses.dash = (P.uses.dash || 0) + 1; return true; },
      hit: function () { if (P.act === 'hit' && P.actT > 0) return false; act('hit', MC.hit.time); return true; },
      blast: function () { if (P.energy < MC.blast.energyCost) return false; P.energy -= MC.blast.energyCost; act('blast', MC.blast.time);
        var d = dvec(), sp = (P.transformed ? MC.blast.speedTransformedPx : MC.blast.speedPx) * tpp;
        P.shots.push({ x: G.px + d[0] * .5, y: G.py + d[1] * .5, vx: d[0] * sp, vy: d[1] * sp, r: (P.transformed ? MC.blast.rTransformedPx : MC.blast.rPx) * .55, life: MC.blast.life }); return true; },
      transform: function () { if (P.transformed) { P.transformed = false; P.energy = Math.min(P.energy, MC.transform.exitCap); pop(MC.text.transformOff); return true; }
        if (P.energy < MC.transform.minEnergy) { pop(MC.text.transformNeed); return false; } P.transformed = true; act('transform', MC.transform.time); pop(MC.text.transformOn); return true; },
      calm: function () { if (kawDist() > MC.calm.rangePx * tpp) { pop('GET CLOSER TO VEYRU'); return false; } if (P.act === 'hit' && P.actT > 0) { pop('WAIT FOR THE FIGHT TO SETTLE'); return false; }
        bondUp(MC.calm.bond, 'calm'); P.energy = Math.min(MC.energy.max, P.energy + MC.calm.energy); var k = kawState(); k.calms = (k.calms || 0) + 1; V22.calmFx = 1; pop('VEYRU SENSES YOUR SHARED ENERGY'); P.uses.calm = (P.uses.calm || 0) + 1; return true; },
      root: function () { return ccr('root'); }, core: function () { return ccr('core'); }, crown: function () { return ccr('crown'); }
    };
    function ccr(kind) { var cc = MC.ccr, cost = cc.cost[kind];
      if (kind === 'root' && mv.fly) { pop('LAND FIRST · ROOT NEEDS GROUND'); return false; }
      if (P.energy < cost) { pop(MC.text.lowEnergy); return false; } if (P.stab < cc.stabilityMin) { pop(MC.text.lowStab); return false; }
      P.energy -= cost; P.stab = Math.max(0, P.stab - cc.stabilityCost[kind]); act(kind, .28); var d = dvec();
      if (kind === 'root') { P.cells.push({ kind: 'root', x: G.px + d[0] * cc.root.offsetPx * tpp, y: G.py + d[1] * cc.root.offsetPx * tpp, r: cc.root.sizePx * tpp / 2, life: cc.root.life, t: 0 }); pop('ROOT: LIVING COVER GROWS · VEYRU ANSWERS'); }
      else if (kind === 'core') { P.cells.push({ kind: 'core', x: G.px + d[0] * cc.core.offsetPx * tpp, y: G.py + d[1] * cc.core.offsetPx * tpp, r: cc.core.sizePx * tpp / 2, life: cc.core.life, t: 0 });
        if (kawDist() < cc.core.kawRangePx * tpp) bondUp(cc.core.kawBond, 'core'); pop(F.outdoors()() ? 'CORE: ENERGY CONDUCTS THROUGH THE FLOOR' : 'CORE: ENERGY CONDUCTS THROUGH THE FLOOR'); }
      else { P.reaction = cc.crown.reaction; bondUp(cc.crown.kawBond, 'crown'); var k = kawState(); pop('CROWN: VEYRU · BOND ' + Math.round(k.bond) + '/100'); V22.crownRead = crownRead(); }
      P.chain.push({ kind: kind, at: V22.clock }); P.chain = P.chain.filter(function (c) { return V22.clock - c.at < cc.chainWindow; }); if (P.chain.length > 3) P.chain.shift();
      if (P.chain.map(function (c) { return c.kind; }).join(',') === cc.chain.join(',')) circuit();
      return true; }
    function crownRead() { var best = null, bd = 9; G.npcs.forEach(function (n) { if (!n.vis) return; var d = Math.hypot(n.x - G.px, n.y - G.py); if (d < bd) { bd = d; best = n; } });
      var k = kawState(); return { kaw: 'Veyru · bond ' + Math.round(k.bond) + '/100 · ' + (k.bond >= MC.calm.bondDone ? 'fully trusting' : k.bond >= 50 ? 'relaxed' : 'watchful'), near: best ? best.name : null }; }
    function circuit() { var cc = MC.ccr.circuit, y = Ys(), first = !(y && y.today.flags.circuit); P.chain = []; P.stab = 100; P.guardian = cc.guardianTime; var d = dvec();
      for (var i = 0; i < cc.gardenCells; i++) P.cells.push({ kind: 'garden', x: G.px + d[0] * (1.9 + i * cc.gardenSpacingPx * tpp) + (d[1] ? (i % 2 ? .35 : -.35) : 0), y: G.py + d[1] * (1.9 + i * cc.gardenSpacingPx * tpp) + (d[0] ? (i % 2) * .25 : 0), r: .45, life: cc.gardenLife, t: 0 });
      if (!cc.oncePerDay || first) { P.energy = Math.min(MC.energy.max, P.energy + cc.energy); var k = kawState(); if (k.bond < cc.kawBondFloor) bondUp(cc.kawBondFloor - k.bond, 'circuit'); if (y) y.today.flags.circuit = true; }
      P.uses.circuit = (P.uses.circuit || 0) + 1; pop(MC.text.circuit); toast(MC.text.circuit + (first ? ' · +' + cc.energy + ' energy, Veyru bond ≥ ' + cc.kawBondFloor : ' (bonus already earned today)'), 'gold');
      try { if (H.unlock('your:mella_circuit')) toast('Hero unlock: MELLA living circuit', 'gold'); } catch (e) {} }
    function usePower(k, src) { if (layer() || !onFoot()) return false; var r = POW[k](); count('pw_' + k + (r ? '' : '_no')); V22.lastPower = { k: k, ok: r, src: src || 'key' }; return r; }
    V22.use = usePower;

    /* ------------------------------------------------ hero frames + jump lift (hooks added to your_v20.js by tools/build_v22.py) */
    V.frameHook = function (dir, ph, moving) {
      var sd = side(), sr = sd === 'left' ? 8 : 7, fr = sd === 'left' ? 10 : 9, DR = { down: 0, up: 1, left: 2, right: 3 };
      if (P.jz > 0.01) { var asc = P.jvz > 0, rel = P.jz / (MC.jump.vz * MC.jump.vz / (2 * MC.jump.gravity)); return { col: asc ? (rel < .35 ? 4 : 5) : (rel > .35 ? 6 : 7), row: sr }; }
      if (P.act && P.actT > 0) { var k = 1 - P.actT / P.actDur;
        if (P.act === 'hit') return { col: 2 + Math.min(2, Math.floor(k * 3)), row: sd === 'left' ? 5 : 4 };
        if (P.act === 'blast' || P.act === 'core') return { col: 12 + Math.min(3, Math.floor(k * 4)), row: DR[dir] == null ? 0 : DR[dir] };
        if (P.act === 'transform' || P.act === 'crown') return { col: 12 + (Math.floor(k * 6) % 2), row: fr };
        if (P.act === 'root') return { col: 14, row: fr }; }
      if (P.dashT > 0 && !mv.fly) return { col: 8 + (Math.floor(performance.now() / 80) % 2), row: sr };
      return null; };
    V.jumpLift = function () { return P.jz > 0 ? P.jz * tpp * T * C.scale.jumpLiftK : 0; };

    /* ------------------------------------------------ movement: speed, dash, timers */
    var _sp = F.speedNow();
    X.set('speedNow', function () { var v = _sp(); if (!onFoot() || mv.fly) return v;
      if (P.dashT > 0) return v / (mv.sprint ? V.C.move.sprint : 1) * (MC.dash.impulsePx / C.scale.v7RunPx);
      return P.transformed ? v * (MC.transform.runPxTransformed / C.scale.v7RunPx) : v; });
    V22.clock = 0;
    var _mp = F.movePlayer();
    X.set('movePlayer', function (dt) {
      _mp(dt); V22.clock += dt; var cc = MC.ccr;
      if (P.dashT > 0 && !G.moving && P.dashDir) { var sp = F.speedNow()() * dt, nx = G.px + P.dashDir[0] * sp, ny = G.py + P.dashDir[1] * sp; if (walk(nx + P.dashDir[0] * .3, ny + P.dashDir[1] * .3)) { G.px = nx; G.py = ny; } }
      P.dashT = Math.max(0, P.dashT - dt); P.actT = Math.max(0, P.actT - dt); if (!P.actT) P.act = null;
      if (P.jz > 0) { P.jz += P.jvz * dt; P.jvz -= MC.jump.gravity * dt; if (P.jz <= 0) { P.jz = 0; P.jvz = 0; } }
      P.energy = Math.max(0, Math.min(MC.energy.max, P.energy + (P.transformed ? -MC.energy.transformedDrain : MC.energy.regen) * dt));
      if (P.transformed && P.energy <= 0) { P.transformed = false; pop(MC.text.transformOut); }
      P.stamina = Math.min(MC.stamina.max, P.stamina + MC.stamina.regen * dt);
      P.stab = Math.min(100, P.stab + dt * (P.guardian > 0 ? cc.stabilityRegenGuardian : cc.stabilityRegen)); P.guardian = Math.max(0, P.guardian - dt); P.reaction = Math.max(0, P.reaction - dt);
      P.cells.forEach(function (c) { c.t += dt; c.life -= dt; var near = Math.hypot(c.x - G.px, c.y - G.py) < c.r + .5 && P.jz < 10;
        if (near && c.kind === 'root') { P.stamina = Math.min(100, P.stamina + cc.root.nearStamina * dt); P.energy = Math.min(100, P.energy + cc.root.nearEnergy * dt); }
        if (near && c.kind === 'core') { P.energy = Math.min(100, P.energy + cc.core.nearEnergy * dt); P.stab = Math.max(0, P.stab - cc.core.nearStabilityDrain * dt); } });
      P.cells = P.cells.filter(function (c) { return c.life > 0; });
      P.shots.forEach(function (s) { s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt; if (!walk(s.x, s.y)) { s.life = 0; s.hit = true; count('blast_wall'); } });
      P.shots = P.shots.filter(function (s) { return s.life > 0; });
      V22.pops.forEach(function (p) { p.life -= dt; }); V22.pops = V22.pops.filter(function (p) { return p.life > 0; });
      if (V22.calmFx) V22.calmFx = Math.max(0, V22.calmFx - dt);
      stepKaw(dt);
    });
    // dash on the sprint press (V7 dash = Shift; v2.0 sprint = hold Shift/K, so a press dashes and holding keeps sprinting)
    /* ------------------------------------------------ 3. Veyru follows */
    function stepKaw(dt) { if (V22.brainStep) { V22.brainStep(dt, brainEnv()); return; } var tr = kaw.trail, last = tr[tr.length - 1];
      if (!last || Math.hypot(last[0] - G.px, last[1] - G.py) > .08) { tr.push([G.px, G.py]); if (tr.length > 80) tr.shift(); }
      var gap = KC.follow.gap, tgt = null, acc = 0;
      for (var i = tr.length - 1; i > 0; i--) { acc += Math.hypot(tr[i][0] - tr[i - 1][0], tr[i][1] - tr[i - 1][1]); if (acc >= gap) { tgt = tr[i - 1]; break; } }
      var d0 = kawDist(); if (d0 > KC.follow.snap) { placeKaw(); return; }
      kaw.moving = false; if (!tgt) return;
      var dx = tgt[0] - kaw.x, dy = tgt[1] - kaw.y, d = Math.hypot(dx, dy); if (d < .04) return;
      var sp = Math.max(3.2, F.speedNow()() * 1.8) * dt; if (d0 > gap * 1.8) sp *= 1.6;
      var k = Math.min(1, sp / d); kaw.x += dx * k; kaw.y += dy * k; kaw.moving = true; kaw.ph += dt * 11; kaw.dir = F.dirOf()(dx, dy);
      if (Math.abs(dx) > .01 && (kaw.dir === 'left' || kaw.dir === 'right')) kaw.face = kaw.dir; else if (Math.abs(dx) > Math.abs(dy) * .35) kaw.face = dx < 0 ? 'left' : 'right'; }
    function placeKaw() { if (V22.brainPlace) { V22.brainPlace(brainEnv()); return; } var opts = [[-1, 0], [1, 0], [0, 1], [0, -1], [-1, 1], [1, 1]]; kaw.x = 0;
      for (var i = 0; i < opts.length; i++) { var x = Math.floor(G.px) + opts[i][0], y = Math.floor(G.py) + opts[i][1]; if (G.map && F.walkable()(G.map, x, y)) { kaw.x = x + .5; kaw.y = y + .5; break; } }
      if (!kaw.x) { kaw.x = G.px - .6; kaw.y = G.py; } kaw.trail = [[kaw.x, kaw.y], [G.px, G.py]]; kaw.dir = 'right'; kaw.face = kaw.x > G.px ? 'left' : 'right'; }
    V22.placeKaw = placeKaw;
    var _em = F.enterMap(); X.set('enterMap', function (id, at) { var r = _em(id, at); if (V22.brainMap) V22.brainMap(id, brainEnv()); else placeKaw(); P.cells = []; P.shots = []; return r; });

    /* ------------------------------------------------ drawing */
    function drawKaw() { var cx = X.cx, idle = img(KC.art.idle), size = KC.size; if (!idle || kaw.off) return; var vertical = kaw.moving && (kaw.dir === 'up' || kaw.dir === 'down');
      var im = kaw.moving ? (img(KC.art.walkR[Math.floor(kaw.ph * .6) % 4]) || idle) : idle, bob = kaw.moving ? 0 : Math.sin(performance.now() / 420) * .8;
      var X0 = kaw.x * T, Y0 = kaw.y * T + 8;
      cx.save(); cx.translate(X0, Y0); cx.fillStyle = 'rgba(0,0,0,.28)'; cx.beginPath(); cx.ellipse(0, 0, 14, 5, 0, 0, 7); cx.fill();
      if (V22.calmFx) { cx.strokeStyle = 'rgba(173,255,154,' + V22.calmFx + ')'; cx.lineWidth = 2; cx.beginPath(); cx.arc(0, -size * .45, 18 + (1 - V22.calmFx) * 16, 0, 7); cx.stroke(); }
      if (kaw.face === 'left') cx.scale(-1, 1); cx.imageSmoothingEnabled = false; cx.drawImage(im, -size / 2, -size * .97 + bob, size, size); cx.restore();
      count(vertical ? 'kaw_ud_placeholder' : kaw.moving ? 'kaw_walk' : 'kaw_idle'); count('kaw_' + ((G.map && G.map.id === 'HOME') ? 'home' : 'city'));
      var tag = 'Veyru · KAW' + (vertical ? ' (temp side-view art)' : '');
      cx.save(); cx.font = '700 9px JetBrains Mono, monospace'; cx.textAlign = 'center'; cx.fillStyle = '#000'; cx.fillText(tag, X0 + .5, kaw.y * T - 33.5); cx.fillStyle = '#9dffb0'; cx.fillText(tag, X0, kaw.y * T - 34); cx.restore(); }
    function drawCells() { var cx = X.cx, t = performance.now() / 1000;
      P.cells.forEach(function (c) { var x = c.x * T, y = c.y * T + 6, r = c.r * T, a = Math.min(1, c.life / 1.2, c.t / .25); cx.save(); cx.globalAlpha = a;
        if (c.kind === 'root') { cx.fillStyle = 'rgba(60,150,70,.35)'; cx.beginPath(); cx.ellipse(x, y, r, r * .45, 0, 0, 7); cx.fill(); cx.strokeStyle = '#7bd35a'; cx.lineWidth = 3;
          for (var i = 0; i < 5; i++) { var ang = i / 5 * 6.28 + .3, l = r * (.55 + .2 * Math.sin(t * 2 + i)); cx.beginPath(); cx.moveTo(x, y); cx.quadraticCurveTo(x + Math.cos(ang) * l * .5, y - 18, x + Math.cos(ang) * l, y + Math.sin(ang) * l * .4 - 22); cx.stroke(); } }
        else if (c.kind === 'core') { var k = (t * 1.4) % 1; cx.strokeStyle = 'rgba(21,255,230,.8)'; cx.lineWidth = 3; cx.beginPath(); cx.ellipse(x, y, r * k, r * k * .45, 0, 0, 7); cx.stroke(); cx.fillStyle = 'rgba(21,255,230,.15)'; cx.beginPath(); cx.ellipse(x, y, r, r * .45, 0, 0, 7); cx.fill(); }
        else { cx.fillStyle = '#5fcf5a'; for (var j = 0; j < 3; j++) { cx.beginPath(); cx.ellipse(x - 6 + j * 6, y - 6 - (j % 2) * 4, 3, 7, (j - 1) * .5, 0, 7); cx.fill(); } cx.fillStyle = '#ffd6f0'; cx.beginPath(); cx.arc(x, y - 14, 2.5, 0, 7); cx.fill(); }
        cx.restore(); }); }
    function drawFx() { var cx = X.cx, t = performance.now() / 1000, hx = G.px * T, hy = G.py * T;
      P.shots.forEach(function (s) { var x = s.x * T, y = s.y * T - 24; cx.save(); cx.fillStyle = 'rgba(27,255,231,.25)'; cx.beginPath(); cx.arc(x, y, s.r * 1.8, 0, 7); cx.fill(); cx.fillStyle = '#dbffff'; cx.beginPath(); cx.arc(x, y, s.r * .7, 0, 7); cx.fill(); cx.restore(); count('blast_drawn'); });
      if (P.transformed) { cx.save(); cx.strokeStyle = 'rgba(21,255,232,' + (.45 + .25 * Math.sin(t * 8)) + ')'; cx.lineWidth = 2.5; cx.beginPath(); cx.ellipse(hx, hy - 26 - V.jumpLift(), 22, 34, 0, 0, 7); cx.stroke(); cx.restore(); count('aura'); }
      if (P.act === 'hit' && P.actT > 0) { var d = dvec(), k = 1 - P.actT / P.actDur; cx.save(); cx.strokeStyle = 'rgba(21,255,226,' + (1 - k) + ')'; cx.lineWidth = 3; cx.beginPath(); cx.arc(hx + d[0] * 22, hy - 28 + d[1] * 14 - V.jumpLift(), 10 + k * 14, 0, 7); cx.stroke(); cx.restore(); }
      if (P.reaction > 0) { cx.save(); cx.strokeStyle = 'rgba(255,230,120,' + Math.min(.8, P.reaction / 2) + ')'; cx.setLineDash([4, 4]); cx.beginPath(); cx.arc(kaw.x * T, kaw.y * T - 18, 26, 0, 7); cx.stroke(); cx.setLineDash([]); cx.font = '700 9px JetBrains Mono, monospace'; cx.textAlign = 'center'; cx.fillStyle = '#ffe680'; cx.fillText('♥ ' + Math.round((kawState() || {}).bond || 0), kaw.x * T, kaw.y * T - 46); cx.restore(); }
      V22.pops.forEach(function (p, i) { cx.save(); cx.globalAlpha = Math.min(1, p.life * 1.5); cx.font = '800 6px JetBrains Mono, monospace'; cx.textAlign = 'center'; var w = cx.measureText(p.t).width + 6, yy = hy - 66 - V.jumpLift() - (V22.pops.length - 1 - i) * 9;
        cx.fillStyle = 'rgba(8,10,24,.78)'; cx.fillRect(hx - w / 2, yy - 6.5, w, 8.5); cx.fillStyle = '#7cf0e0'; cx.fillText(p.t, hx, yy); cx.restore(); }); }
    var _dp = F.drawPlayer();
    X.set('drawPlayer', function (t) { var ride = F.outdoors()() ? G.ride : 'walk', show = ride !== 'car';
      drawCells(); var before = show && kaw.y <= G.py; if (before) drawKaw(); _dp(t); if (show && !before) drawKaw(); drawFx(); });

    /* ------------------------------------------------ Veyru: talk (E / tap), calm (C) */
    var VEYRU = { id: 'veyru', name: 'Veyru', your: 'veyru', role: 'KAW · Rainroot Lynx', get x() { return kaw.x; }, get y() { return kaw.y; }, vis: true };
    var _hit = F.hitObj(); X.set('hitObj', function (wx, wy) { if (G.ride !== 'car' && Math.abs(kaw.x - wx) < .6 && wy > kaw.y - 1.1 && wy < kaw.y + .5) return { npc: VEYRU }; return _hit(wx, wy); });
    var _in = F.interactNear(); X.set('interactNear', function () { var s = S(); if (!s || s.busy) return _in();
      var near = false; G.npcs.forEach(function (n) { if (n.vis && Math.hypot(n.x - G.px, n.y - G.py) < 1.6) near = true; });
      G.map.objs.forEach(function (o) { if (o.decor || !F.furnOn()(o)) return; var u = F.useSpot()(o); if (u && Math.hypot(u[0] - G.px, u[1] - G.py) < 1.6) near = true; });
      if (!near && G.ride !== 'car' && kawDist() < 2.4) return openKaw(); return _in(); });
    var _on = F.openNpc(); X.set('openNpc', function (n) { if (n && n.your === 'veyru') return openKaw(); return _on(n); });
    function openKaw() { var k = kawState(); F.openSheet()('<h3>Veyru</h3><div class="sh-sub">KAW · ' + esc(KC.species) + ' · ' + KC.elements.join(' + ') + ' · your bonded companion (not property). Bond ' + Math.round(k.bond) + '/100.</div>' +
        '<div class="sh-sub dim">' + esc(KC.lore.join(' · ')) + '. Temporary side-view art; 4-direction sheet still to come.</div><div class="ydlg" id="ydlg"></div>' +
        '<div class="acts"><button type="button" class="btn" id="v22Calm">Calm Veyru (C) · +' + MC.calm.bond + ' bond</button></div>');
      var b = $('#v22Calm'); if (b) b.onclick = function () { var ok = POW.calm(); count('pw_calm_sheet'); b.textContent = ok ? 'Veyru is calm · bond ' + Math.round(kawState().bond) : 'Get closer to Veyru'; };
      talk(); count('kaw_talk'); }
    V22.openKaw = openKaw;
    function talk() { var y = Ys(), s = S(), box = $('#ydlg'); if (!box) return; y.met.veyru = 1;
      box.innerHTML = '<img alt="" src="' + KC.art.face + '" style="image-rendering:pixelated;object-fit:contain"><div style="flex:1;min-width:0"><div class="yl" id="ydlgLine">…</div><div class="ysrc" id="ydlgSrc">thinking…</div><div class="ych" id="ydlgCh"></div></div>';
      V.lastTalk = { npc: 'veyru', pending: true };
      Y.llm.converse('veyru', {}).then(function (turn) { if (!$('#ydlg')) return; V.lastTalk = { npc: 'veyru', turn: turn }; $('#ydlgLine').textContent = turn.line;
        $('#ydlgSrc').textContent = turn.source === 'llm' ? 'AI · ' + (turn.provider || '') : turn.source === 'offline-fallback' ? 'offline narration (AI unavailable: fell back)' : 'offline narration';
        var ch = $('#ydlgCh'); ch.innerHTML = (turn.choices || []).map(function (c, i) { return '<button type="button" data-ych="' + i + '">' + esc(c.label) + '</button>'; }).join('');
        ch.querySelectorAll('[data-ych]').forEach(function (bt) { bt.onclick = function () { choose(turn, turn.choices[+bt.dataset.ych]); }; }); }); }
    function choose(turn, c) { var y = Ys(), ef = V.applyEffect('veyru', c.effect || { type: 'none' }); if (ef.type === 'rel_up') bondUp(2, 'talk');   // PROPOSED +2 bond for a kind word
      Y.llm.remember('veyru', { d: y.today.day, line: turn.line, chose: c.label }); F.save()();
      $('#ydlgCh').innerHTML = ''; $('#ydlgLine').textContent = '…';
      Y.llm.converse('veyru', { mode: 'reply', choice: c.label, effect: ef }).then(function (r) { if (!$('#ydlg')) return; V.lastTalk = { npc: 'veyru', turn: r, chose: c.label, effect: ef }; $('#ydlgLine').textContent = r.line; $('#ydlgSrc').textContent = r.source === 'llm' ? 'AI · ' + (r.provider || '') : 'offline narration'; }); }

    /* ------------------------------------------------ input: keys, pad, touch */
    var KEYMAP = {}; Object.keys(MC.keys).forEach(function (k) { if (k !== 'dash') KEYMAP[MC.keys[k]] = k; });
    addEventListener('keydown', function (e) { if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return; var k = (e.key || '').toLowerCase(); if (e.repeat) return;
      if ((k === 'shift' || k === 'k') && !layer() && onFoot()) { if (POW.dash()) count('pw_dash'); return; }
      var p = KEYMAP[k]; if (p && !layer()) { usePower(p, 'key'); e.preventDefault(); } });
    var padPrev = {};
    var _pp = F.pollPad(); X.set('pollPad', function () { _pp(); try { var gp = [].slice.call(navigator.getGamepads ? navigator.getGamepads() : []).find(function (p) { return p && p.connected; }); if (!gp) return;
      Object.keys(MC.pad).forEach(function (k) { var i = MC.pad[k], on = !!(gp.buttons[i] && gp.buttons[i].pressed); if (on && !padPrev[i] && !layer() && onFoot()) { if (k === 'dash') POW.dash(); else usePower(k, 'pad'); } padPrev[i] = on; }); } catch (e) {} });
    var moves = $('#yourMoves'), pw = document.createElement('div'); pw.id = 'yourPowers'; pw.hidden = true;
    var LBL = { jump: 'JUMP', hit: 'HIT', blast: 'BLAST', calm: 'CALM', transform: '⚡SHIFT', root: '🌱ROOT', core: '⚡CORE', crown: '✧CROWN' };
    pw.innerHTML = Object.keys(LBL).map(function (k) { return '<button type="button" data-pw="' + k + '" aria-label="' + k + '">' + LBL[k] + '</button>'; }).join('');
    ($('#stage') || document.body).appendChild(pw);
    var mb = document.createElement('button'); mb.type = 'button'; mb.id = 'yourMella'; mb.textContent = 'MELLA'; mb.setAttribute('aria-label', 'MELLA powers'); if (moves) moves.insertBefore(mb, moves.firstChild);
    mb.addEventListener('click', function () { pw.hidden = !pw.hidden; mb.classList.toggle('on', !pw.hidden); });
    pw.addEventListener('pointerdown', function (e) { var b = e.target.closest('[data-pw]'); if (!b) return; e.preventDefault(); usePower(b.dataset.pw, 'touch'); });
    var sb = $('#yourSprint'); if (sb) sb.addEventListener('pointerdown', function () { if (!layer() && onFoot()) POW.dash(); });
    var hud = document.createElement('div'); hud.id = 'yourMellaHud'; ($('#stage') || document.body).appendChild(hud);
    var st = document.createElement('style'); st.textContent =
      '#yourPowers{position:absolute;right:96px;bottom:64px;display:grid;grid-template-columns:repeat(2,auto);gap:5px;z-index:6}#yourPowers[hidden]{display:none}#yourPowers button{font:800 10px var(--display,system-ui);padding:8px 8px;border-radius:10px;border:1px solid rgba(124,240,224,.45);background:rgba(14,12,29,.82);color:#7cf0e0;touch-action:none;min-width:64px}' +
      '#yourMoves #yourMella{color:#7cf0e0}#yourMoves #yourMella.on{background:#7cf0e0;color:#062}' +
      '#yourMellaHud{position:absolute;left:6px;top:6px;z-index:6;pointer-events:none;font:700 9px JetBrains Mono,monospace;color:#dff;background:rgba(8,10,24,.72);border:1px solid rgba(124,240,224,.3);border-radius:8px;padding:4px 6px;line-height:1.5;max-width:58vw}' +
      '#yourMellaHud i{display:inline-block;height:5px;border-radius:3px;vertical-align:middle;margin:0 4px 0 2px;background:#7cf0e0}#yourMellaHud i.s{background:#ffcf6a}#yourMellaHud i.c{background:#b3ff84}#yourMellaHud .on{color:#15ffe8}';
    document.head.appendChild(st);
    function bar(v, c) { return '<i class="' + (c || '') + '" style="width:' + Math.round(Math.max(0, Math.min(100, v)) * .32) + 'px"></i>'; }
    function updHud() { var s = S(), show = !!s && $('#start').hidden && !G.yourAct; hud.style.display = show ? '' : 'none'; if (!show) { pw.hidden = true; mb.classList.remove('on'); return; } var k = kawState() || { bond: 0 };
      var ch = P.chain.map(function (c) { return c.kind[0].toUpperCase(); }).join('→');
      hud.innerHTML = '<span class="' + (P.transformed ? 'on' : '') + '">MELLA' + (P.transformed ? ' · REFRACTION' : '') + '</span> ⚡' + bar(P.energy) + Math.round(P.energy) + ' ⟳' + bar(P.stamina, 's') + ' CCR' + bar(P.stab, 'c') + (ch ? ' ' + ch : '') + '<br>Veyru (KAW) ♥ ' + Math.round(k.bond) + '/100'; }
    setInterval(updHud, 150); V22.updHud = updHud;

    /* ------------------------------------------------ text: Mella → the hero is the MELLA, Veyru is the sidekick */
    function swapText(h) { return String(h).replace('Mella spots the shelf', 'Veyru spots the shelf').replace('Mella calls the next ring', 'Veyru marks the next ring')
      .replace('you are the hero, Mella rides with you', 'you are the MELLA, Veyru (KAW) rides with you').replace('Sidekick: Mella', 'You are the MELLA · sidekick: Veyru (KAW, Rainroot Lynx)'); }
    ['your_job', 'your_skate'].forEach(function (id) { var f = X.SPECIAL[id]; if (f) X.SPECIAL[id] = function () { return swapText(f.apply(this, arguments)); }; });
    var _rs = F.renderStart(); X.set('renderStart', function () { _rs(); var su = document.querySelector('#start .ysub'); if (su) su.textContent = swapText(su.textContent).replace(/v2\.1 · PROPOSAL_HOLD/, 'v2.2 · PROPOSAL_HOLD'); });
    var _ng = F.newGame(); X.set('newGame', function () { _ng(); kawState(); kawProfile(); placeKaw(); Object.assign(P, { energy: 100, stamina: 100, transformed: false, stab: 100, chain: [], cells: [], shots: [] }); });
    var _re = F.resume(); X.set('resume', function (sv) { _re(sv); kawState(); kawProfile(); placeKaw(); });
    var _rp = F.renderPhone(); X.set('renderPhone', function (live) { _rp(live); if (G.tab !== 'your' || live) return; var pb = $('#pbody'); if (!pb) return;
      pb.querySelectorAll('.ydlg .dim').forEach(function (d) { d.innerHTML = swapText(d.innerHTML); });
      if (!$('#v22mella')) { var k = kawState() || { bond: 0 }, box = document.createElement('div'); box.id = 'v22mella';
        var rows = [['Jump', MC.keys.jump, 'D-pad ↓'], ['Dash', 'Shift / K press', 'B'], ['Hit', MC.keys.hit, 'D-pad ←'], ['Blast', MC.keys.blast, 'RT'], ['Calm Veyru', MC.keys.calm, 'D-pad ↑'], ['Transform', MC.keys.transform, 'R3'], ['ROOT', '1', 'LB'], ['CORE', '2', 'LT'], ['CROWN', '3', 'D-pad →']];
        box.innerHTML = '<h4>You are the MELLA</h4><p class="dim">' + esc(MC.text.root + ' ' + MC.text.core + ' ' + MC.text.crown) + ' Chain ROOT → CORE → CROWN within ' + MC.ccr.chainWindow + ' s for the living circuit. Kit: The First Wish · Mella V7. Touch: MELLA button.</p>' +
          rows.map(function (r) { return '<div class="kv"><span>' + r[0] + '</span><b>' + esc(String(r[1]).toUpperCase()) + ' · pad ' + r[2] + '</b></div>'; }).join('') +
          '<p class="dim">Energy ' + Math.round(P.energy) + ' · circuits today ' + (Ys().today.flags.circuit ? 'done' : 'not yet') + '. ' + esc(MC.hitNote) + '</p>' +
          '<h4>Your KAW: Veyru</h4><div class="ydlg"><img alt="" src="' + KC.art.face + '" style="image-rendering:pixelated;object-fit:contain"><div><b>Veyru</b> · ' + esc(KC.species) + ' · ' + KC.elements.join(' + ') + '<br>Bond ' + Math.round(k.bond) + '/100 · saved to your hero profile (' + esc(KC.id) + ')<br><span class="dim">' + esc(KC.art.note) + '</span></div></div>';
        var anchor = pb.querySelector('h4'); if (anchor) pb.insertBefore(box, anchor); else pb.appendChild(box); } });
    /* ------------------------------------------------ boot */
    kawState(); if (S()) { kawProfile(); placeKaw(); }
    V22.installed = true;
  }
})();
