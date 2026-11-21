/* Y.O.U.R. v2.4m · PROPOSAL_HOLD (PUBLISH HOLD) — MORROW CITY CO-OP LAYER for the METAL: IN DA RIFFT v17 engine (owner t84u:
   "be in Metal's city with our Mella and fight alongside him for Morrow City missions").
   Loaded AFTER the untouched v17 engine script in your/morrow/district/morrow_v17.html. It only wraps public engine hooks
   (Render.drawRider, Siege.addDrawList / target / damage, Machines.damage, MorrowClashV16.attack, Game.update, pollGamepad):
   the v17 simulation, physics, map, missions, Lil Heavy, build tools and saves stay the engine's own.
   LEAD 'hero' (default): YOU (the owner hero, the MELLA, Y.O.U.R. hero sheet) ride the v17 body; METAL is an AI ally drawn with his own v17 sprites.
   LEAD 'metal' (swap): you play METAL exactly as v17; the hero is the AI ally.
   Every new number below is PROPOSED (game tuning), not from canon. Progress → shared hero profile games.your_morrow (wir.hero/1). */
(function () {
  'use strict';
  var M = window.METAL; if (!M) { console.warn('YOUR Morrow: METAL engine missing'); return; }
  var H = window.WIR_HERO || null, E = window.__YOUR_MORROW_ENGINE || {};
  var elev = E.elev, surf = E.surf, collidersNear = E.collidersNear, WORLD_W = E.WORLD_W, WORLD_H = E.WORLD_H, Audio_ = E.Audio_, MorrowClashV16 = E.MorrowClashV16 || M.MorrowClashV16,
    METALCampaign17 = E.METALCampaign17 || M.CampaignV17, GuestVisitor = E.GuestVisitor || M.GuestVisitorV15, Input = E.Input || M.Input;
  if (!elev || !surf) { console.warn('YOUR Morrow: engine helper export missing'); return; }
  var Y = window.YOUR_MORROW = { version: '2.4m', lead: 'hero', installed: false, stats: {}, log: [], ally: null, energy: 100, combo: 0, cmd: 'follow', errors: [] };
  var TUNE_P = { allyHP: 6, allySpeed: 560, catchUp: 1250, followGap: 95, engageR: 560, holdR: 260, chargeR: 900, atkCd: .62, reachFoe: 110, reachMachine: 95, reachFrame: 175,
    pulseEvery: 4, pulseR: 160, comboWin: 1.4, comboMax: 100, comboPerHit: 12, novaR: 250, reviveHold: 1.2, allyDown: 7, shareBelow: .12, shareAmt: .2, shareCd: 45,
    blastCost: 25, blastRange: 430, calmCost: 30, calmR: 210, calmT: 2, energyRegen: 8, stuckStep: 2.5, farStep: 1600 }; // all PROPOSED
  Y.TUNE = TUNE_P;
  function count(k, n) { Y.stats[k] = (Y.stats[k] || 0) + (n || 1); }
  function hy(a, b) { return Math.sqrt(a * a + b * b); }
  function cl(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function now() { return (M.Game && M.Game.time) || performance.now() / 1000; } Y.now = now;
  function say(x, y, z, t, c) { try { M.FX.text(x, y, z, t, c || '#bff7ff'); } catch (e) { } }
  function sfx(n) { try { Audio_.sfxPlay(n); } catch (e) { } }
  function toast(t, s) { try { M.UI.toast(t, s || 1.6); } catch (e) { } }
  var qs = new URLSearchParams(location.search);
  if (qs.get('lead') === 'metal') Y.lead = 'metal';
  try { var sv = JSON.parse(localStorage.getItem('your_morrow_coop_v1') || 'null'); if (sv && !qs.get('lead')) { if (sv.lead === 'metal' || sv.lead === 'hero') Y.lead = sv.lead; if (sv.cmd) Y.cmd = sv.cmd; } } catch (e) { }
  function saveLocal() { try { localStorage.setItem('your_morrow_coop_v1', JSON.stringify({ lead: Y.lead, cmd: Y.cmd })); } catch (e) { } }

  /* ---------------------------------------------------------------- art */
  var HERO = new Image(); HERO.src = '../assets/hero/hero_sheet_96.png'; // Y.O.U.R. v1.2.1 owner hero sheet (16×11 cells of 96 px)
  var CELL = 96;
  function heroFrame(o, moving, t) { // o: {state, vx, vy, face, anim, act, actT}
    var right = Math.cos(o.face || 0) >= 0;
    if (o.act === 'blast' && o.actT > 0) return { c: 12 + Math.min(3, Math.floor((1 - o.actT / .45) * 4)), r: 0, flip: false };
    if (o.act === 'calm' && o.actT > 0) return { c: 12 + (Math.floor(t * 8) % 2), r: right ? 9 : 10, flip: false };
    if (o.act === 'hit' && o.actT > 0) return { c: 2 + Math.min(2, Math.floor((1 - o.actT / .3) * 3)), r: right ? 4 : 5, flip: false };
    var st = o.state;
    if (st === 'bail' || o.down > 0) return { c: 5, r: 6, flip: !right };
    if (st === 'strike' || (o.anim && o.anim.name === 'strike')) return { c: 3, r: right ? 4 : 5, flip: false };
    if (st === 'dodge') return { c: 8 + (Math.floor(t * 12) % 2), r: right ? 7 : 8, flip: false };
    if (st === 'swing' || st === 'zip' || st === 'fly' || st === 'jet' || st === 'hang' || st === 'rstep') return { c: 6 + (Math.floor(t * 6) % 2), r: right ? 9 : 10, flip: false };
    if (st === 'air' || st === 'wall') return { c: (o.vz || 0) > 40 ? 3 : 4, r: 6, flip: !right };
    if (st === 'grind') return { c: 2, r: 6, flip: !right };
    if (o.landT != null && o.landT < .18) return { c: 7, r: 6, flip: !right };
    if (moving) { var seq = [0, 1, 0, 6]; return { c: seq[Math.floor(t * 5) % 4], r: 6, flip: !right }; }
    return { c: 0, r: 6, flip: !right };
  }
  function drawHeroAt(ctx, o, sx, sy, label, col) {
    if (!(HERO.complete && HERO.naturalWidth)) { ctx.fillStyle = '#7cf0e0'; ctx.fillRect(sx - 12, sy - 70, 24, 66); count('hero_fallback'); return; }
    var t = now(), sp = hy(o.vx || 0, o.vy || 0), f = heroFrame(o, sp > 18, t), S = 104, blink = (o.inv > 0 && Math.floor(t * 12) % 2);
    if (Y.drawHeroArt) { var drawn = false; try { drawn = Y.drawHeroArt(ctx, o, sx, sy, sp > 18, t, blink); } catch (e) { if (Y.errors.length < 5) Y.errors.push('hero art: ' + e.message); }
      if (drawn) { if (Y.transformT > 0 && o === M.Rider.p) count('hero_refraction_drawn'); tag(ctx, sx, sy - 112, label, col); count('hero_drawn_' + (o === M.Rider.p ? 'lead' : 'ally')); return; } }
    ctx.save(); ctx.translate(sx, sy); if (blink) ctx.globalAlpha = .55; if (o.down > 0) ctx.globalAlpha = .6;
    if (f.flip) ctx.scale(-1, 1); ctx.imageSmoothingEnabled = true;
    ctx.drawImage(HERO, f.c * CELL, f.r * CELL, CELL, CELL, -S / 2, -S * .96, S, S); ctx.restore();
    if (Y.transformT > 0 && o === M.Rider.p) { ctx.save(); ctx.strokeStyle = 'rgba(160,255,230,.7)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(sx, sy - 48, 34, 56, 0, 0, 7); ctx.stroke(); ctx.restore(); }
    tag(ctx, sx, sy - 112, label, col); count('hero_drawn_' + (o === M.Rider.p ? 'lead' : 'ally'));
  }
  function tag(ctx, x, y, s, col) { ctx.save(); ctx.font = 'bold 10px system-ui'; ctx.textAlign = 'center'; var w = ctx.measureText(s).width + 8; ctx.fillStyle = 'rgba(8,10,24,.72)'; ctx.fillRect(x - w / 2, y - 10, w, 13); ctx.fillStyle = col || '#bff7ff'; ctx.fillText(s, x, y); ctx.restore(); }
  function heroName() { try { return (H && H.get().name) || 'Hero'; } catch (e) { return 'Hero'; } }

  /* ---------------------------------------------------------------- lead rendering */
  var R = M.Render, _drawRider = R.drawRider;
  R.drawRider = function (ctx, p) {
    if (Y.lead === 'hero' && p === M.Rider.p) { var K = M.Cam.K, sx = p.x, sy = p.y - elev(p.z) * K; drawHeroAt(ctx, p, sx, sy, heroName().toUpperCase() + ' · THE MELLA', '#7cf0e0'); return; }
    return _drawRider.apply(this, arguments);
  };
  function drawMetalAlly(ctx, A) {
    var P = M.Rider.p; if (!P) return;
    var fake = Object.assign({}, P, { x: A.x, y: A.y, z: A.z, vx: A.vx, vy: A.vy, vz: 0, face: A.face, heading: A.face, state: A.down > 0 ? 'bail' : A.state, anim: A.anim,
      trail: [], air: null, grind: null, wall: null, manual: null, swing: null, zip: null, fly: null, dodge: null, jet: null, hang: null, rstep: null, slide: null, foot: false,
      bail: A.down > 0 ? { rot: .9, t: .2 } : null, brace: 0, seam: 0, pushAnim: hy(A.vx, A.vy) > 40 ? .2 : 0, wobble: 0, hits: A.hits, boardFx: null, inv: A.inv });
    try { R.drawShadow(ctx, fake); _drawRider.call(R, ctx, fake); count('metal_ally_drawn'); }
    catch (e) { count('metal_ally_draw_error'); if (Y.errors.length < 5) Y.errors.push('metal draw: ' + e.message); ctx.fillStyle = '#b07aff'; ctx.fillRect(A.x - 12, A.y - elev(A.z) * M.Cam.K - 70, 24, 66); }
    var sy = A.y - elev(A.z) * M.Cam.K;
    tag(ctx, A.x, sy - 112, 'METAL · AI ALLY · ' + Y.cmd.toUpperCase() + (A.down > 0 ? ' · DOWN' : ''), '#d8c2ff');
    hpBar(ctx, A.x, sy - 98, A.hp, A.maxHP, '#c9a6ff');
  }
  function hpBar(ctx, x, y, hp, max, col) { ctx.save(); ctx.fillStyle = '#050914b3'; ctx.fillRect(x - 22, y - 3, 44, 6); ctx.fillStyle = col; ctx.fillRect(x - 21, y - 2, 42 * cl(hp / max, 0, 1), 4); ctx.restore(); }
  function drawAlly(ctx, A) {
    if (Y.lead === 'hero') return drawMetalAlly(ctx, A);
    var sy = A.y - elev(A.z) * M.Cam.K; drawHeroAt(ctx, A, A.x, sy, heroName().toUpperCase() + ' · MELLA · AI ALLY · ' + Y.cmd.toUpperCase(), '#7cf0e0'); hpBar(ctx, A.x, sy - 98, A.hp, A.maxHP, '#7cf0e0');
  }
  var S = M.Siege, _adl = S.addDrawList;
  S.addDrawList = function (list, v) { var r = _adl.apply(this, arguments); var A = Y.ally; if (A && A.x > v.x0 - 120 && A.x < v.x1 + 120 && A.y > v.y0 - 120 && A.y < v.y1 + 200) list.push({ key: A.y - elev(A.z) * M.Cam.K + .55, draw: function (c) { drawAlly(c, A); } });
    if (Y.drawFx) list.push({ key: 1e9, draw: function (c) { try { Y.drawFx(c); } catch (e) { if (Y.errors.length < 5) Y.errors.push('fx: ' + e.message); } } });
    Y.shots.forEach(function (b) { if (Y.drawFx) return; list.push({ key: b.y + 1, draw: function (c) { c.save(); c.strokeStyle = b.col; c.lineWidth = 5; c.globalAlpha = cl(b.life * 3, 0, 1); c.beginPath(); c.moveTo(b.x0, b.y0 - 50); c.lineTo(b.x, b.y - 50); c.stroke(); c.restore(); } }); });
    return r; };
  Y.shots = [];

  /* ---------------------------------------------------------------- ally */
  function spawnAlly() { var P = M.Rider.p; if (!P) return null; var o = M.findOpen(P.x - 90, P.y + 40, 240);
    Y.ally = { x: o.x, y: o.y, z: surf(o.x, o.y).z, vx: 0, vy: 0, face: P.face, hp: TUNE_P.allyHP, maxHP: TUNE_P.allyHP, inv: 1, down: 0, cd: .5, anim: null, state: 'ground', hits: 0, stuck: 0, lastHitT: -9, lastTarget: null, reviveT: 0, shareCd: 0, coverFor: null, act: null, actT: 0, landT: 9 };
    count('ally_spawn'); return Y.ally; }
  function threats(cx, cy, R0) {
    var out = [];
    try { if (S.mode !== 'off') S.foes.forEach(function (e) { if (e.hp > 0) { var d = hy(e.x - cx, e.y - cy); if (d < R0) out.push({ k: 'foe', ref: e, x: e.x, y: e.y, z: e.z, d: d }); } }); } catch (e) { }
    try { M.Machines.list.forEach(function (m) { if (m.st !== 'down' && m.st !== 'wake') { var d = hy(m.x - cx, m.y - cy); if (d < R0) out.push({ k: 'machine', ref: m, x: m.x, y: m.y, z: m.z, d: d }); } }); } catch (e) { }
    try { var b = MorrowClashV16.active; if (MorrowClashV16.enabled && b && b.hp > 0 && b._summoned) { var d = hy(b.x - cx, b.y - cy); if (d < R0 + 120) out.push({ k: 'frame', ref: b, x: b.x, y: b.y, z: surf(b.x, b.y).z, d: d }); } } catch (e) { }
    out.sort(function (a, b) { return a.d - b.d; }); return out;
  }
  Y.threats = threats;
  /* FIX (v2.4m QA, mission 09): the v17 Clash Lab auto-places a HAULFRAME at game start. The ally used to fight it on sight, which banked a hauler win
     and made mission 09 complete itself the moment it began. Allies and MELLA powers now only engage a frame the player summoned (mission button,
     Clash Lab, F6 or VILLAIN); the player's own F2/F3 still work on any frame exactly as in v17. */
  (function () { var _pick = MorrowClashV16.pick, _cst = MorrowClashV16.start, starting = false;
    MorrowClashV16.start = function () { starting = true; try { return _cst.apply(this, arguments); } finally { starting = false; } };
    MorrowClashV16.pick = function () { var r = _pick.apply(this, arguments); if (r && this.active && !starting) { this.active._summoned = true; count('clash_summoned'); } return r; }; })();
  function hitThreat(t, n, from, label) { // from: 'ally' | 'combo' | 'nova' | 'blast'
    var A = Y.ally, sx = A ? A.x : t.x, sy = A ? A.y : t.y, dx = t.x - sx, dy = t.y - sy, d = hy(dx, dy) || 1, kx = dx / d * 190, ky = dy / d * 190, done = false;
    try {
      if (t.k === 'foe') done = S.damage(t.ref, n, kx, ky, from === 'ally' ? 'ALLY' : 'COMBO') !== false;
      else if (t.k === 'machine') { var hp0 = t.ref.hp; M.Machines.damage(t.ref, n, kx, ky, from === 'nova' ? 'aoe' : 'ally'); done = t.ref.hp < hp0; }
      else if (t.k === 'frame') { var b = t.ref; if (b.hp > 0) { b.hp = Math.max(0, b.hp - n); b.hitT = .5; b.staggerT = .45; b.mode = 'stagger'; b.timer = 0; b.attackDone = false; MorrowClashV16.addFx(b.x, b.y, '#b28cff', 1.2); done = true;
          if (b.hp <= 0) { b.mode = 'down'; MorrowClashV16.win(); count('frame_finished_by_' + from); } MorrowClashV16.refresh(); } }
    } catch (e) { if (Y.errors.length < 5) Y.errors.push('hit: ' + e.message); }
    if (done) { count('hit_' + from); count('hit_' + from + '_' + t.k); if (label) say(t.x, t.y, (t.z || 0) + 62, label, from === 'ally' ? '#d8c2ff' : '#fff0a9'); }
    return done;
  }
  Y.hitThreat = hitThreat;
  function addCombo(n) { Y.combo = cl(Y.combo + n, 0, TUNE_P.comboMax); }
  var MOVES_METAL = ['SLASH', 'COMPRESS', 'SLASH', 'PULSE'], MOVES_HERO = ['HIT', 'HIT', 'BLAST', 'CALM'];
  function allyAttack(A, t) {
    var mv = (Y.lead === 'hero' ? MOVES_METAL : MOVES_HERO)[A.hits % 4]; A.hits++; A.cd = TUNE_P.atkCd; A.face = Math.atan2(t.y - A.y, t.x - A.x);
    A.anim = { name: 'strike', n: 4, t: 0, dur: .27, from: 0, single: true }; A.state = 'strike'; A.act = Y.lead === 'hero' ? null : (mv === 'BLAST' ? 'blast' : mv === 'CALM' ? 'calm' : 'hit'); A.actT = .4;
    var who = Y.lead === 'hero' ? 'METAL' : heroName().toUpperCase();
    if (mv === 'PULSE' || mv === 'CALM') { var near = threats(A.x, A.y, TUNE_P.pulseR); near.forEach(function (q) { hitThreat(q, 1, 'ally', null); if (mv === 'CALM') calmOne(q); }); say(A.x, A.y, A.z + 80, who + ' · ' + mv + ' ×' + near.length, '#d8c2ff'); count('ally_' + mv.toLowerCase()); }
    else if (mv === 'BLAST') { Y.shots.push({ x0: A.x, y0: A.y, x: t.x, y: t.y, life: .35, col: 'rgba(124,240,224,.9)' }); hitThreat(t, 2, 'ally', who + ' · BLAST'); }
    else hitThreat(t, 1, 'ally', who + ' · ' + mv);
    A.lastHitT = now(); A.lastTarget = t.ref; addCombo(TUNE_P.comboPerHit); sfx('hit');
  }
  function calmOne(q) { try { if (q.k === 'foe') { q.ref.stun = Math.max(q.ref.stun, TUNE_P.calmT); q.ref.wind = 0; } else if (q.k === 'machine') { q.ref.st = 'stun'; q.ref.stun = Math.max(q.ref.stun || 0, TUNE_P.calmT); } else if (q.k === 'frame') { q.ref.staggerT = Math.max(q.ref.staggerT || 0, 1.2); q.ref.mode = 'stagger'; } count('calmed_' + q.k); } catch (e) { } }
  function stepTo(A, tx, ty, spd, dt) {
    var dx = tx - A.x, dy = ty - A.y, d = hy(dx, dy); if (d < 4) { A.vx *= .8; A.vy *= .8; return d; }
    var bl = 1 - Math.exp(-6 * dt); A.vx += ((dx / d) * spd - A.vx) * bl; A.vy += ((dy / d) * spd - A.vy) * bl;
    var nx = A.x + A.vx * dt, ny = A.y + A.vy * dt, z0 = A.z, moved = false;
    var okp = function (x, y) { return S.safe(x, y) || Math.abs(surf(x, y).z - z0) < 70 && x > 40 && y > 40 && x < WORLD_W - 40 && y < WORLD_H - 40 && !collidersNear(x, y).some(function (c) { return !c.gone && hy(c.x - x, c.y - y) < (c.col || 20) + 16; }); };
    if (okp(nx, ny)) { A.x = nx; A.y = ny; moved = true; } else if (okp(nx, A.y)) { A.x = nx; A.vy *= .3; moved = true; } else if (okp(A.x, ny)) { A.y = ny; A.vx *= .3; moved = true; }
    if (!moved) { A.stuck += dt; A.vx *= -.2; A.vy *= -.2; } else A.stuck = Math.max(0, A.stuck - dt * .5);
    A.z = surf(A.x, A.y).z; if (hy(A.vx, A.vy) > 25) A.face = Math.atan2(A.vy, A.vx); return d;
  }
  function riftStep(A, P, why) { var o = M.findOpen(P.x - Math.cos(P.face) * 90, P.y - Math.sin(P.face) * 90, 300); A.x = o.x; A.y = o.y; A.z = surf(o.x, o.y).z; A.vx = A.vy = 0; A.stuck = 0;
    say(A.x, A.y, A.z + 70, (Y.lead === 'hero' ? 'METAL' : heroName().toUpperCase()) + ' · RIFFT STEP', '#c9a6ff'); count('ally_riftstep_' + why); }
  function allyUpdate(dt) {
    var P = M.Rider.p; if (!P || M.Game.state !== 'play') return; var A = Y.ally || spawnAlly(); if (!A) return;
    A.inv = Math.max(0, A.inv - dt); A.cd = Math.max(0, A.cd - dt); A.actT = Math.max(0, A.actT - dt); A.shareCd = Math.max(0, A.shareCd - dt);
    if (A.anim) { A.anim.t += dt; if (A.anim.t > A.anim.dur) { A.anim = null; if (A.state === 'strike') A.state = 'ground'; } }
    var dl = hy(P.x - A.x, P.y - A.y);
    // downed ally: you revive by staying close; otherwise he gets back up by himself
    if (A.down > 0 || A.hp <= 0) { if (!(A.down > 0)) A.down = TUNE_P.allyDown; if (A.down < 2.5 && A.hp <= 0 && !A._dset) { A.down = TUNE_P.allyDown; } A._dset = true;
      if (dl < 95) { A.reviveT += dt; if (A.reviveT >= TUNE_P.reviveHold) { A.down = 0; A.hp = Math.ceil(A.maxHP * .67); A.inv = 1.5; A.reviveT = 0; A._dset = false; count('revive_ally'); say(A.x, A.y, A.z + 80, 'REVIVED · ' + (Y.lead === 'hero' ? 'METAL' : heroName().toUpperCase()) + ' IS BACK UP', '#afffd8'); sfx('win'); } }
      else { A.reviveT = 0; A.down -= dt; if (A.down <= 0) { A.down = 0; A.hp = A.maxHP; A.inv = 1.2; A._dset = false; count('ally_self_recover'); } }
      A.vx *= .9; A.vy *= .9; return; }
    // leader knocked down → ally covers (Gallium WARD + invulnerability while you recover)
    if (P.state === 'bail' && P.bail && !A.coverFor) { A.coverFor = P.bail; }
    if (A.coverFor && P.state !== 'bail') A.coverFor = null;
    if (A.coverFor && dl < 150 && !A.coverFor._covered) { A.coverFor._covered = true; P.inv = Math.max(P.inv || 0, 2.2); try { MorrowClashV16.shield = Math.max(MorrowClashV16.shield || 0, 2.2); } catch (e) { }
      count('revive_cover_lead'); say(P.x, P.y, P.z + 90, (Y.lead === 'hero' ? 'METAL' : heroName().toUpperCase()) + ' COVERS YOU · GALLIUM WARD', '#e6dcff'); }
    // Gallium share (finite Galaxy Gallium; PROPOSED co-op rule)
    if (P.gallium < TUNE_P.shareBelow && A.shareCd <= 0 && dl < 230) { P.gallium = Math.min(1, P.gallium + TUNE_P.shareAmt); A.shareCd = TUNE_P.shareCd; count('gallium_share'); say(P.x, P.y, P.z + 90, 'ALLY SHARES GALAXY GALLIUM +' + Math.round(TUNE_P.shareAmt * 100) + '%', '#c9a6ff'); }
    if (dl > TUNE_P.farStep || A.stuck > TUNE_P.stuckStep) { riftStep(A, P, dl > TUNE_P.farStep ? 'far' : 'stuck'); return; }
    var home = Y.cmd === 'hold' ? (A.holdAt || (A.holdAt = { x: A.x, y: A.y })) : null; if (Y.cmd !== 'hold') A.holdAt = null;
    var cx = home ? home.x : P.x, cy = home ? home.y : P.y, R0 = Y.cmd === 'charge' ? TUNE_P.chargeR : Y.cmd === 'hold' ? TUNE_P.holdR : TUNE_P.engageR;
    if (A.coverFor) { stepTo(A, P.x, P.y, TUNE_P.catchUp, dt); A.mode = 'cover'; return; }
    var T = threats(cx, cy, R0)[0];
    if (T) { A.mode = 'fight'; var reach = T.k === 'frame' ? TUNE_P.reachFrame : T.k === 'machine' ? TUNE_P.reachMachine + ((T.ref.D && T.ref.D.r) || 0) : TUNE_P.reachFoe;
      var d = hy(T.x - A.x, T.y - A.y);
      if (d > reach * .85) stepTo(A, T.x - (T.x - A.x) / (d || 1) * reach * .6, T.y - (T.y - A.y) / (d || 1) * reach * .6, TUNE_P.allySpeed * 1.1, dt);
      else { A.vx *= .85; A.vy *= .85; A.face = Math.atan2(T.y - A.y, T.x - A.x); if (A.cd <= 0) allyAttack(A, T); }
      // machine attacks can land on the ally too (machine 'atk' window in reach)
      if (T.k === 'machine' && T.ref.st === 'atk' && d < (T.ref.D.reach || 40) + 34 && A.inv <= 0) { A.hp--; A.inv = 1; count('ally_hit_by_machine'); say(A.x, A.y, A.z + 60, '-1', '#ffafad'); }
    } else if (home) { A.mode = 'hold'; stepTo(A, home.x, home.y, TUNE_P.allySpeed * .6, dt); }
    else { A.mode = 'follow'; var sp = hy(P.vx, P.vy), bx = P.x - Math.cos(P.face) * TUNE_P.followGap + Math.sin(P.face) * 40, by = P.y - Math.sin(P.face) * TUNE_P.followGap - Math.cos(P.face) * 40;
      var spd = dl > 420 ? TUNE_P.catchUp : Math.max(TUNE_P.allySpeed * .5, Math.min(TUNE_P.catchUp, sp * 1.12 + 60)); stepTo(A, bx, by, spd, dt); }
    if (A.hp <= 0 && !(A.down > 0)) { A.down = TUNE_P.allyDown; count('ally_downed'); say(A.x, A.y, A.z + 60, 'ALLY DOWN · STAND CLOSE TO REVIVE', '#ffe1b2'); }
  }
  // foes may target the ally (v17 already supports a partner target: hp / inv / down fields)
  var _target = S.target; S.target = function (e) { var A = Y.ally, p = M.Rider.p; if (A && !(A.down > 0) && A.hp > 0 && p && hy(A.x - e.x, A.y - e.y) < hy(p.x - e.x, p.y - e.y)) return A; return _target.apply(this, arguments); };
  // TEAM COMBOS: your hit lands within the combo window on the target your ally just hit → bonus damage
  var pendingCombo = [];
  function leaderHit(kind, ref) { var A = Y.ally; addCombo(TUNE_P.comboPerHit * .5); if (!A || !(now() - A.lastHitT < TUNE_P.comboWin) || A.lastTarget !== ref) return; pendingCombo.push({ k: kind, ref: ref, t: .2 }); }
  var _sd = S.damage; S.damage = function (e, n, kx, ky, from) { var r = _sd.apply(this, arguments); if (r && from !== 'ALLY' && from !== 'COMBO') leaderHit('foe', e); return r; };
  var MC = M.Machines, _md = MC.damage; MC.damage = function (m, n, kx, ky, src) { var hp0 = m && m.hp, r = _md.apply(this, arguments); if (m && m.hp < hp0 && src !== 'ally' && src !== 'combo' && src !== 'aoe') leaderHit('machine', m); return r; };
  try { var _va = MorrowClashV16.attack; MorrowClashV16.attack = function () { var r = _va.apply(this, arguments); if (r && this.active) leaderHit('frame', this.active); return r; }; } catch (e) { }
  function stepCombos(dt) { for (var i = pendingCombo.length - 1; i >= 0; i--) { var c = pendingCombo[i]; c.t -= dt; if (c.t > 0) continue; pendingCombo.splice(i, 1);
      var ref = c.ref, t = { k: c.k, ref: ref, x: ref.x, y: ref.y, z: ref.z || 0 }; if ((c.k === 'foe' && ref.hp > 0) || (c.k === 'machine' && ref.st !== 'down') || (c.k === 'frame' && ref.hp > 0)) {
        if (hitThreat(t, 1, 'combo', (Y.lead === 'hero' ? 'MELLA × METAL' : 'METAL × MELLA') + ' · RIFFT COMBO')) { count('team_combo'); M.Cam.kick && M.Cam.kick(3); } } } }
  function nova() { var P = M.Rider.p, A = Y.ally; if (!P || !A || A.down > 0) return false; if (Y.combo < TUNE_P.comboMax) { toast('TEAM COMBO CHARGING · ' + Math.round(Y.combo) + '%'); count('nova_not_ready'); return false; }
    var T = threats(P.x, P.y, 700)[0], cx = T ? T.x : P.x, cy = T ? T.y : P.y; A.x = cx - 60; A.y = cy + 30; A.z = surf(A.x, A.y).z; Y.combo = 0;
    var L = threats(cx, cy, TUNE_P.novaR); L.forEach(function (q) { hitThreat(q, q.k === 'frame' ? 3 : 2, 'nova', null); });
    try { M.FX.galliumBurst(cx, cy, surf(cx, cy).z); } catch (e) { } M.Cam.kick && M.Cam.kick(8); sfx('win');
    try { M.UI.bigText('TEAM COMBO', (Y.lead === 'hero' ? heroName().toUpperCase() + ' + METAL' : 'METAL + ' + heroName().toUpperCase()) + ' · RIFFT SUPERNOVA ×' + L.length, '#fff0a9', 1.6); } catch (e) { }
    count('team_nova'); count('team_nova_hits', L.length); if (Y.onPower) Y.onPower('nova', P, cx, cy, L.length > 0); return true; }
  Y.nova = nova;

  /* ---------------------------------------------------------------- the hero's own MELLA powers (lead 'hero'; V7 names, PROPOSED Morrow numbers) */
  function blast() { var P = M.Rider.p; if (!P || Y.lead !== 'hero' || M.Game.state !== 'play') return false; var bc = Y.transformT > 0 ? TUNE_P.blastCost / 2 : TUNE_P.blastCost; if (Y.energy < bc) { toast('MELLA ENERGY LOW'); return false; }
    Y.energy -= bc; var hx = Math.cos(P.face), hy2 = Math.sin(P.face), best = null, bd = 1e9;
    threats(P.x, P.y, TUNE_P.blastRange).forEach(function (q) { var dx = q.x - P.x, dy = q.y - P.y, along = dx * hx + dy * hy2, off = Math.abs(dx * hy2 - dy * hx); if (along > 0 && off < 70 && along < bd) { bd = along; best = q; } });
    var ex = best ? best.x : P.x + hx * TUNE_P.blastRange, ey = best ? best.y : P.y + hy2 * TUNE_P.blastRange; Y.shots.push({ x0: P.x, y0: P.y, x: ex, y: ey, life: .4, col: 'rgba(124,240,224,.95)' });
    P.act = 'blast'; P.actT = .45; Y.heroAct = { act: 'blast', t: .45 };
    if (best) { var ok = best.k === 'foe' ? _sd.call(S, best.ref, 2, hx * 200, hy2 * 200, 'METAL') !== false : (best.k === 'machine' ? (MC.damage(best.ref, 2, hx * 200, hy2 * 200), true) : hitThreat(best, 2, 'blast', null)); if (best.k === 'foe') leaderHit('foe', best.ref); say(best.x, best.y, (best.z || 0) + 70, 'MELLA · BLAST', '#7cf0e0'); count('hero_blast_hit'); }
    count('hero_blast'); sfx('gallium'); if (Y.onPower) Y.onPower('blast', P, ex, ey, !!best); return true; }
  function calm() { var P = M.Rider.p; if (!P || Y.lead !== 'hero' || M.Game.state !== 'play') return false; if (Y.energy < TUNE_P.calmCost) { toast('MELLA ENERGY LOW'); return false; }
    Y.energy -= TUNE_P.calmCost; var L = threats(P.x, P.y, TUNE_P.calmR); L.forEach(calmOne); Y.heroAct = { act: 'calm', t: .6 }; P.inv = Math.max(P.inv || 0, .5);
    say(P.x, P.y, P.z + 90, 'MELLA · CALM ×' + L.length, '#b3ff84'); if (Y.onPower) Y.onPower('calm', P, P.x, P.y, L.length > 0); count('hero_calm'); count('hero_calm_targets', L.length); return true; }
  Y.blast = blast; Y.calm = calm;
  function setCmd(c) { var order = ['follow', 'hold', 'charge']; Y.cmd = c || order[(order.indexOf(Y.cmd) + 1) % 3]; if (Y.ally) Y.ally.holdAt = null; saveLocal(); toast('ALLY · ' + Y.cmd.toUpperCase() + (Y.cmd === 'follow' ? ' (fights threats near you)' : Y.cmd === 'hold' ? ' (guards this spot)' : ' (hunts threats across the district)')); count('cmd_' + Y.cmd); refreshPanel(); }
  function setLead(l) { Y.lead = l || (Y.lead === 'hero' ? 'metal' : 'hero'); saveLocal(); toast(Y.lead === 'hero' ? 'YOU PLAY ' + heroName().toUpperCase() + ' · METAL FIGHTS BESIDE YOU' : 'YOU PLAY METAL · ' + heroName().toUpperCase() + ' FIGHTS BESIDE YOU', 2.2); count('lead_' + Y.lead); refreshPanel(); }
  Y.setCmd = setCmd; Y.setLead = setLead;
  function exitToYour() { syncProfile(true); count('exit'); try { M.Save.capture(); M.Save.write(); } catch (e) { }
    if (window.parent && window.parent !== window) window.parent.postMessage({ type: 'your-morrow-exit', summary: summary() }, '*'); else location.href = '../../../index.html'; }
  Y.exit = exitToYour;

  /* ---------------------------------------------------------------- input: keyboard ([ ] \ ; ` Home — freed by the removed crossover visitor) · touch panel · gamepad View-chord */
  window.addEventListener('keydown', function (e) { if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
    var a = { BracketLeft: function () { setCmd(); }, BracketRight: nova, Backslash: blast, Semicolon: calm, Backquote: function () { setLead(); }, Home: exitToYour }[e.code];
    if (a) { e.preventDefault(); e.stopImmediatePropagation(); count('key_' + e.code); a(); } }, true);
  try { ['open', 'web', 'hack', 'stitch'].forEach(function (k) { GuestVisitor[k] = function () { count('guest_disabled'); return false; }; }); GuestVisitor.update = function () { }; GuestVisitor.draw = function () { }; } catch (e) { }
  var padPrev = {}, viewHeld = false, chordUsed = false, viewRelease = false;
  if (E.getPoll && E.setPoll) { var _pg = E.getPoll(); E.setPoll(function () { var h = _pg.apply(this, arguments) || {};
      try { var pad = Input.pad; if (pad && pad.buttons) { var b = function (i) { return !!(pad.buttons[i] && pad.buttons[i].pressed); }, v = b(8);
          if (v) { if (!viewHeld) { viewHeld = true; chordUsed = false; } h.map = false; var acts = [[0, nova], [1, blast], [2, calm], [3, function () { setCmd(); }], [12, function () { setLead(); }], [13, exitToYour]];
            acts.forEach(function (q) { var p2 = b(q[0]); if (p2 && !padPrev[q[0]]) { chordUsed = true; count('pad_chord_' + q[0]); q[1](); } padPrev[q[0]] = p2; if (p2) { h.ollie = h.trick = h.pump = h.dodge = h.up = h.down = h.gallium = h.skyrail = false; } }); }
          else { if (viewHeld && !chordUsed) { h.map = true; count('pad_view_map'); } viewHeld = false; padPrev = {}; } } } catch (e) { }
      return h; }); Y.padWrapped = true; }

  /* ---------------------------------------------------------------- HUD panel */
  var css = document.createElement('style'); css.textContent =
    '#ym-panel{position:fixed;left:50%;bottom:56px;transform:translateX(-50%);z-index:60;background:linear-gradient(140deg,rgba(9,22,30,.9),rgba(30,16,46,.88));border:1px solid rgba(124,240,224,.6);border-radius:12px;padding:5px 8px;color:#eafffb;font:700 10px system-ui;max-width:min(560px,96vw);box-shadow:0 6px 22px #0008}' +
    '#ym-panel .t{font:900 10px system-ui;letter-spacing:1px;color:#7cf0e0}#ym-panel .t b{color:#d8c2ff}#ym-stat{margin:2px 0;color:#dff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
    '#ym-bar{height:4px;border-radius:3px;background:#2a3344;overflow:hidden;margin:2px 0}#ym-bar i{display:block;height:100%;background:linear-gradient(90deg,#7cf0e0,#fff0a9);width:0}' +
    '#ym-btns{display:flex;flex-wrap:wrap;gap:4px}#ym-btns button{flex:1;min-width:58px;padding:5px 4px;border-radius:7px;border:1px solid #4d8f99;background:#163246;color:#eafffb;font:800 9px system-ui;touch-action:manipulation;cursor:pointer}' +
    '#ym-btns button:active{filter:brightness(1.5)}#ym-btns #ym-exit{background:#3a2a52;border-color:#b9a1ff}' +
    '@media(max-width:700px){#ym-panel{bottom:auto;top:404px;padding:3px 5px;max-width:94vw}#ym-panel .t{font-size:9px}#ym-btns button{min-width:44px;padding:5px 2px;font-size:8px}}@media(max-height:480px){#ym-stat{display:none}#ym-panel{bottom:auto;top:211px;max-width:60vw}#ym-panel .t{display:none}}';
  document.head.appendChild(css);
  var panel = document.createElement('div'); panel.id = 'ym-panel'; panel.setAttribute('role', 'region'); panel.setAttribute('aria-label', 'Y.O.U.R. Morrow City co-op');
  panel.innerHTML = '<div class="t">Y.O.U.R. × <b>MORROW CITY</b> · CO-OP · PROPOSAL_HOLD</div><div id="ym-stat">…</div><div id="ym-bar"><i></i></div><div id="ym-btns">' +
    '<button id="ym-cmd" title="[ · View+Y">ALLY: FOLLOW</button><button id="ym-nova" title="] · View+A">TEAM COMBO</button><button id="ym-blast" title="\\ · View+B">BLAST</button><button id="ym-calm" title="; · View+X">CALM</button><button id="ym-swap" title="` · View+D-pad ↑">SWAP</button><button id="ym-exit" title="Home · View+D-pad ↓">↩ Y.O.U.R.</button></div>';
  document.body.appendChild(panel);
  function on(id, f) { var el = document.getElementById(id); el.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); count('btn_' + id); f(); }); el.addEventListener('touchstart', function (e) { e.stopPropagation(); }, { passive: true }); }
  on('ym-cmd', function () { setCmd(); }); on('ym-nova', nova); on('ym-blast', blast); on('ym-calm', calm); on('ym-swap', function () { setLead(); }); on('ym-exit', exitToYour);
  function refreshPanel() { var P = M.Rider.p, A = Y.ally, d = null; try { d = METALCampaign17.data(); } catch (e) { }
    var lead = Y.lead === 'hero' ? heroName() + ' (you, the MELLA)' : 'METAL (you)', mate = Y.lead === 'hero' ? 'METAL' : heroName();
    document.getElementById('ym-stat').textContent = 'YOU: ' + lead + ' ♥' + (P ? P.hp : '–') + (Y.lead === 'hero' ? ' · ENERGY ' + Math.round(Y.energy) : '') + ' · ALLY ' + mate + ' ♥' + (A ? Math.max(0, A.hp) + '/' + A.maxHP : '–') + (A && A.down > 0 ? ' DOWN' : '') + ' · ' + (A ? (A.mode || '').toUpperCase() : '') + ' · MISSION ' + (d ? (d.finished ? '10/10 ✓' : (d.step + 1) + '/10') : '–');
    document.getElementById('ym-bar').firstChild.style.width = Math.round(Y.combo) + '%'; document.getElementById('ym-cmd').textContent = 'ALLY: ' + Y.cmd.toUpperCase();
    document.getElementById('ym-blast').disabled = document.getElementById('ym-calm').disabled = Y.lead !== 'hero'; document.getElementById('ym-swap').textContent = Y.lead === 'hero' ? 'PLAY METAL' : 'PLAY ' + heroName().toUpperCase(); }
  Y.refreshPanel = refreshPanel;

  /* ---------------------------------------------------------------- shared hero profile: games.your_morrow (wir.hero/1) + passport-style event ids */
  var lastStep = -1, syncT = 0;
  function summary() { var d = null; try { d = METALCampaign17.data(); } catch (e) { } return { lead: Y.lead, cmd: Y.cmd, step: d ? d.step : 0, finished: !!(d && d.finished), stats: { combos: Y.stats.team_combo | 0, novas: Y.stats.team_nova | 0, allyHits: (Y.stats.hit_ally | 0), revives: (Y.stats.revive_ally | 0) + (Y.stats.revive_cover_lead | 0), riftSteps: (Y.stats.ally_riftstep_far | 0) + (Y.stats.ally_riftstep_stuck | 0), galliumShares: Y.stats.gallium_share | 0 } }; }
  Y.summary = summary;
  function syncProfile(force) { if (!H) return; try { var s = summary(), g = H.gameData('your_morrow') || {}, data = g.data || {}, ev = Array.isArray(data.events) ? data.events : [];
      var add = function (id, kind) { if (!ev.some(function (x) { return x.id === id; })) { ev.push({ id: id, kind: kind, at: new Date().toISOString() }); if (ev.length > 24) ev.shift(); } };
      add('your_morrow:visit:' + (data.visits | 0), 'visit');
      for (var i = 1; i <= s.step; i++) { add('your_morrow:mission:' + (i < 10 ? '0' : '') + i, 'mission_complete'); H.unlock('your_morrow:mission_' + (i < 10 ? '0' : '') + i); }
      var tot = data.totals || {}; Object.keys(s.stats).forEach(function (k) { tot[k] = Math.max(tot[k] | 0, s.stats[k]); });
      H.gameData('your_morrow', { level: 1 + s.step, data: { v: 1, district: 'morrow', engine: 'METAL v17 (Drive 1CJy__25KfIpMJGI9AR7gqTbZYWxt-p1Y)', visits: data.visits | 0, lead: s.lead, cmd: s.cmd, missionStep: s.step, missionsDone: s.step, chapterClear: s.finished, totals: tot, events: ev, lastAt: new Date().toISOString() } });
      if (s.finished) H.unlock('your_morrow:chapter_clear'); count('profile_sync'); } catch (e) { if (Y.errors.length < 5) Y.errors.push('profile: ' + e.message); } }
  Y.syncProfile = syncProfile;
  function firstVisit() { if (!H) return; try { var g = H.gameData('your_morrow') || {}, data = g.data || {}; data.visits = (data.visits | 0) + 1; H.gameData('your_morrow', { level: g.level || 1, data: data }); H.unlock('your_morrow:entered'); } catch (e) { } }

  /* ---------------------------------------------------------------- main hook */
  var _gu = M.Game.update;
  M.Game.update = function (dt) { var r = _gu.apply(this, arguments);
    try { var d2 = Math.min(.05, Math.max(0, +dt || 0)); if (M.Game.state === 'play' && M.Rider.p) {
        allyUpdate(d2); stepCombos(d2); if (Y.transformT > 0) Y.transformT = Math.max(0, Y.transformT - d2); if (Y.artUpdate) Y.artUpdate(d2); Y.energy = Math.min(100, Y.energy + TUNE_P.energyRegen * d2); if (Y.heroAct) { Y.heroAct.t -= d2; if (Y.heroAct.t <= 0) Y.heroAct = null; }
        var P = M.Rider.p; P.act = Y.heroAct ? Y.heroAct.act : null; P.actT = Y.heroAct ? Y.heroAct.t : 0;
        for (var i = Y.shots.length - 1; i >= 0; i--) { Y.shots[i].life -= d2; if (Y.shots[i].life <= 0) Y.shots.splice(i, 1); }
        var st = -1; try { st = METALCampaign17.data().step; } catch (e) { } if (st !== lastStep) { if (lastStep >= 0 && st > lastStep) { count('mission_advanced'); Y.log.push({ mission: st, at: Date.now() }); } lastStep = st; syncProfile(); }
        syncT += d2; if (syncT > .3) { syncT = 0; refreshPanel(); } } } catch (e) { if (Y.errors.length < 5) Y.errors.push('update: ' + e.message); }
    return r; };
  window.addEventListener('pagehide', function () { syncProfile(true); });
  firstVisit(); refreshPanel(); Y.installed = true;
  console.log('[YOUR Morrow] co-op layer ' + Y.version + ' installed · lead=' + Y.lead);
})();
