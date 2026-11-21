/* Y.O.U.R. · hero power art: hit / hurt / cast up-down / calm frames, Living Refraction body, power VFX and power icons. PROPOSAL_HOLD.
   Drafted by WIR Recovery for owner review. Art: original WIR frames cut from the owner's ChatGPT sheets 39 (CG-02 hit/hurt), 40 (CG-03 cast up/down),
   41 (CG-04 calm), 42 (CG-05 Living Refraction), 43 (CG-07 power icons) and 44 (CG-06 MELLA power VFX).
   Additive layer: loads after your/v22/your_v22.js and installs right after it (wraps window.YOUR_V20_INSTALL). It does not edit v20/v22/v23 and
   changes no power rules, costs or timings. Anything it doesn't cover (side-view hit/cast, jump, dash, fly, skate, transform burst) keeps the
   existing hero_sheet_96 frames. If a sheet fails to load, that part simply falls back to what main draws today. */
(function () {
  'use strict';
  var BASE = 'your/assets/hero/power_art/';
  var SH = {
    hitHurt: { src: 'hero_hit_hurt_128.webp', cell: 128 },    // 4×2: row 0 front, row 1 back; cols 0-2 hit, col 3 hurt
    cast: { src: 'hero_cast_updown_128.webp', cell: 128 },    // 4×1: cols 0-1 down (front), cols 2-3 up (back)
    calm: { src: 'hero_calm_128.webp', cell: 128 },           // 4×1: front
    refr: { src: 'hero_refraction_128.webp', cell: 128 },     // 4×3: rows front / side (faces left) / back; 4-frame walk
    vfx: { src: 'mella_vfx_96.webp', cell: 96 }               // 6×5: blast bolt 0-3 + impact 4-5 / ROOT / CORE / calm ring / circuit
  };
  var FOOT = 122 / 128;          // feet line in the 128 px hero cells (same body height as hero_sheet_96's 88/96 at the same draw size)
  var A = window.YOUR_HERO_ART = { sheets: SH, ready: {}, stats: {}, last: null, pick: pick, icons: BASE + 'power_icons_96.webp' };
  function count(k) { A.stats[k] = (A.stats[k] || 0) + 1; }
  Object.keys(SH).forEach(function (k) { var im = new Image(); im.onload = function () { A.ready[k] = true; }; im.onerror = function () { A.ready[k] = false; }; im.src = BASE + SH[k].src; SH[k].img = im; });

  /* ------------------------------------------------ which art frame (or null = keep the existing hero_sheet_96 frame) */
  function pick(st) {   // st: { dir, moving, ph, t, P, hurt, calmFx }
    var P = st.P || {}, dir = st.dir || 'down', back = dir === 'up', side = dir === 'left' || dir === 'right';
    if (st.hurt) return { sh: 'hitHurt', col: 3, row: back ? 1 : 0, why: 'hurt' };
    if (P.act && P.actT > 0) { var k = 1 - P.actT / (P.actDur || 1);
      if (P.act === 'hit') return side ? null : { sh: 'hitHurt', col: Math.min(2, Math.floor(k * 3)), row: back ? 1 : 0, why: 'hit' };
      if (P.act === 'blast' || P.act === 'core') return side ? null : { sh: 'cast', col: (back ? 2 : 0) + (k < .45 ? 0 : 1), row: 0, why: 'cast_' + (back ? 'up' : 'down') };
      return null; }                                                     // transform / crown / root / jump bursts: existing frames
    if (st.calmFx > 0 && !st.moving) return { sh: 'calm', col: Math.min(3, Math.floor((1 - st.calmFx) * 4)), row: 0, why: 'calm' };
    if (P.transformed) { var row = back ? 2 : side ? 1 : 0, col = st.moving ? Math.floor((st.ph || 0) * .55) % 4 : (Math.floor(st.t * 1.6) % 2) * 2;
      return { sh: 'refr', col: col, row: row, flip: dir === 'right', why: 'refraction' }; }   // side row faces left → mirror for right
    return null;
  }

  /* ------------------------------------------------ hero body: wraps the v20 owner draw for the main city/home canvas only */
  /* ------------------------------------------------ power VFX sprites over/under v22's vector effects */
  var impacts = [], seen = [];
  function vfx(cx, row, col, x, y, w, rot, alpha) { var S = SH.vfx; cx.save(); cx.translate(x, y); if (rot) cx.rotate(rot); if (alpha != null) cx.globalAlpha *= alpha;
    cx.drawImage(S.img, col * S.cell, row * S.cell, S.cell, S.cell, -w / 2, -w / 2, w, w); cx.restore(); }
  /* ------------------------------------------------ hero body: wraps the v20 owner draw for the main city/home canvas only */
  function wrapPeople() {   // v20 wraps WIRPeople.draw inside its own install, so this runs from install() to sit outside it
    var PD = window.WIRPeople && window.WIRPeople.draw;
    if (PD) window.WIRPeople.draw = function (c, X0, Y0, L, dir, ph, moving) {
      try {
        var X = A.X, V22 = window.YOUR_V22, G = X && X.G, mv = G && G.your;
        if (X && L && L.your === 'owner' && c === X.cx && !L.__board && V22 && V22.P && !(mv && mv.fly) && !(V22.P.jz > 0.01) && !(V22.P.dashT > 0)) {
          var V23 = window.YOUR_V23, H = V23 && V23.hero;
          var f = pick({ dir: dir, moving: moving, ph: ph, t: performance.now() / 1000, P: V22.P, hurt: !!(H && (H.hurtT > 0 || H.ko > 0)), calmFx: V22.calmFx || 0 });
          if (f && A.ready[f.sh]) { var S = SH[f.sh], sz = (window.YOUR_V20_CONFIG && YOUR_V20_CONFIG.sprite && YOUR_V20_CONFIG.sprite.hero) || 60;
            c.save(); c.translate(X0, Y0); c.fillStyle = 'rgba(0,0,0,.3)'; c.beginPath(); c.ellipse(0, 0, 10, 4, 0, 0, 7); c.fill();
            if (f.flip) c.scale(-1, 1); c.imageSmoothingEnabled = true;
            c.drawImage(S.img, f.col * S.cell, f.row * S.cell, S.cell, S.cell, -sz / 2, -sz * FOOT, sz, sz); c.restore();
            count('hero_' + f.why); A.last = f; return; }
        }
      } catch (e) { count('hero_err'); }
      return PD.apply(this, arguments);
    };
  }

  function install(X) {
    A.X = X; wrapPeople(); var G = X.G, T = X.T, V22 = window.YOUR_V22; if (!V22 || !V22.P) return; var P = V22.P;
    var _dp = X.fn.drawPlayer();
    X.set('drawPlayer', function (t) {
      if (!A.ready.vfx) return _dp(t);
      var cx = X.cx, now = performance.now() / 1000, cells = P.cells, shots = P.shots, hx = G.px * T, hy = G.py * T;
      // ground layer: ROOT / CORE / circuit garden cells and the calm ring, drawn as art (v22's vector shapes are skipped for this frame only)
      cells.forEach(function (c) { var a = Math.min(1, c.life / 1.2, c.t / .25), w = Math.max(40, c.r * T * 2.4), x = c.x * T, y = c.y * T + 6 - w * .3;
        var row = c.kind === 'root' ? 1 : c.kind === 'core' ? 2 : 4, col = Math.min(5, Math.floor(c.t * 8)); if (c.t > .75) col = 3 + Math.floor(now * 4) % 3;
        vfx(cx, row, col, x, y, w, 0, a); count('vfx_' + c.kind); });
      if (V22.calmFx > 0) { vfx(cx, 3, Math.min(5, Math.floor((1 - V22.calmFx) * 6)), hx, hy - 2, 64, 0, Math.min(1, V22.calmFx * 1.5)); count('vfx_calm'); }
      P.cells = []; P.shots = [];
      try { _dp(t); } finally { P.cells = cells; P.shots = shots; }
      // blast bolts (sheet faces right → rotate to the travel direction) and impacts where a bolt ended
      shots.forEach(function (s) { var age = (s.age = (s.age || 0) + 1 / 60), col = Math.min(3, Math.floor(age * 10)), w = Math.max(30, s.r * 4.2);   // s.r is in px (v22 draws its glow at s.r * 1.8)
        vfx(cx, 0, col, s.x * T, s.y * T - 24, w, Math.atan2(s.vy, s.vx)); count('vfx_blast'); });
      seen.forEach(function (s) { if (shots.indexOf(s) < 0) impacts.push({ x: s.x, y: s.y, t: 0, w: Math.max(34, s.r * 4) }); }); seen = shots.slice();
      impacts.forEach(function (m) { m.t += 1 / 60; vfx(cx, 0, m.t < .12 ? 4 : 5, m.x * T, m.y * T - 24, m.w, 0, 1 - m.t / .3); count('vfx_impact'); });
      impacts = impacts.filter(function (m) { return m.t < .3; });
    });
    // power icons on the MELLA pad + the Living Refraction chip on the HUD (CSS only; button labels and handlers unchanged)
    var ICON = { jump: [0, 0], hit: [2, 0], blast: [3, 0], calm: [4, 0], transform: [5, 0], root: [6, 0], core: [0, 1], crown: [1, 1] }, sz = 20, css = '';
    Object.keys(ICON).forEach(function (k) { css += '#yourPowers button[data-pw="' + k + '"]::before{background-position:' + (-ICON[k][0] * sz) + 'px ' + (-ICON[k][1] * sz) + 'px}'; });
    var st = document.createElement('style'); st.id = 'yourHeroArtCss'; st.textContent =
      '#yourPowers button::before{content:"";display:inline-block;width:' + sz + 'px;height:' + sz + 'px;margin:-6px 4px -6px -2px;vertical-align:middle;background:url(' + A.icons + ') 0 0/' + (7 * sz) + 'px ' + (2 * sz) + 'px no-repeat}' + css +
      '#yourMellaHud .on::before{content:"";display:inline-block;width:32px;height:32px;margin:-4px 4px -2px -2px;vertical-align:middle;border-radius:6px;background:rgba(21,255,232,.12) url(' + BASE + SH.refr.src + ') 0 0/128px 96px no-repeat;box-shadow:0 0 6px rgba(21,255,232,.6)}';
    document.head.appendChild(st);
  }
  var inst = window.YOUR_V20_INSTALL;
  window.YOUR_V20_INSTALL = function (X) { if (inst) inst(X); try { install(X); } catch (e) { console.warn('YOUR hero art install', e); A.error = String(e && e.stack || e); } };
})();
