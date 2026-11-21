/* Y.O.U.R. · Veyru (KAW) art: 4-direction walk, mood idles, mood portraits, Rainroot snare and calm effects. PROPOSAL_HOLD.
   Drafted by WIR Recovery for owner review. Art: original WIR frames cut from the owner's ChatGPT sheets 32 (VEYRU 4-DIR WALK, 4×5 cells of 96 px),
   46 (CG-08 snare + calm, 4×2 cells of 128 px) and 47 (CG-09 portraits: happy / curious / alert / calm).
   Draw only. Veyru's brain stays your/v24/ (WIRKAWLivingBrain); this file reads its mood and never writes brain state.
   v22 drawKaw calls YOUR_KAW_ART.draw(cx, kaw, X0, Y0, size) and keeps its old side-view body (and the "temp side-view art" tag) if this returns false. */
(function () {
  'use strict';
  var BASE = 'your/assets/kaw/veyru/';
  var WALK = { src: BASE + 'veyru_walk4_96.webp', cell: 96, foot: 90 / 96 };   // rows: 0 down, 1 right, 2 right (2nd cycle, mirrored for left), 3 up, 4 idles
  var FX = { src: BASE + 'veyru_snare_calm_128.webp', cell: 128 };            // row 0: snare (vines + water) 4 frames · row 1: calm ring 3 frames + mist
  var FACE = { happy: BASE + 'portraits/veyru_happy.webp', curious: BASE + 'portraits/veyru_curious.webp', alert: BASE + 'portraits/veyru_alert.webp', calm: BASE + 'portraits/veyru_calm.webp' };
  // brain mood → portrait (same table as the v2.4 Living District build)
  var MOODFACE = { playful: 'happy', content: 'calm', tired: 'calm', anxious: 'alert', restless: 'curious', watchful: 'curious', hungry: 'curious' };
  // brain mood → standing idle in row 4 (0 front sit · 1 alert stand · 2 eyes-closed sit · 3 playful pounce)
  var MOODIDLE = { content: 2, tired: 2, anxious: 1, watchful: 1, playful: 3, restless: 0, hungry: 0 };
  var SNARE_TEXT = 'VEYRU · RAINROOT SNARE';
  var A = window.YOUR_KAW_ART = { ready: {}, stats: {}, mood: null, face: null, last: null, draw: draw, frameFor: frameFor, moodNow: moodNow, faceFor: faceFor };
  function count(k) { A.stats[k] = (A.stats[k] || 0) + 1; }
  function load(key, src) { var im = new Image(); im.onload = function () { A.ready[key] = true; }; im.onerror = function () { A.ready[key] = false; }; im.src = src; return im; }
  WALK.img = load('walk', WALK.src); FX.img = load('fx', FX.src);
  Object.keys(FACE).forEach(function (m) { load('face_' + m, FACE[m]); });

  var moodT = -1;
  function moodNow() {
    var now = Date.now(); if (now - moodT < 500) return A.mood; moodT = now;
    try { var B = window.WIRKAWLivingBrain, V24 = window.YOUR_V24; A.mood = (B && B.moodOf && V24 && V24.state && V24.state()) ? B.moodOf(V24.state()) : null; } catch (e) { A.mood = null; }
    return A.mood;
  }
  function faceFor(mood) { var f = MOODFACE[mood]; return f && A.ready['face_' + f] ? FACE[f] : null; }

  function frameFor(kaw, mood, t) {
    if (kaw.moving) { var col = Math.floor((kaw.ph || 0) * .6) % 4, d = kaw.dir;
      if (d === 'up') return { row: 3, col: col, flip: false, why: 'walk_up' };
      if (d === 'down') return { row: 0, col: col, flip: false, why: 'walk_down' };
      var left = d === 'left' || (d !== 'right' && kaw.face === 'left');
      return { row: left ? 2 : 1, col: col, flip: left, why: left ? 'walk_left' : 'walk_right' }; }
    var c = MOODIDLE[mood]; if (c == null) c = 0;
    if (c === 3 && Math.floor(t / 1.5) % 2) c = 0;                  // playful: pounce, sit, pounce…
    return { row: 4, col: c, flip: c !== 0 && kaw.face === 'left', why: 'idle_' + (mood || 'default') };
  }

  function draw(cx, kaw, X0, Y0, size) {
    try {
      if (!A.ready.walk || !kaw) return false;
      var t = performance.now() / 1000, mood = moodNow(), f = frameFor(kaw, mood, t), D = size || 48, V22 = window.YOUR_V22, calm = V22 && V22.calmFx;
      cx.save(); cx.translate(X0, Y0);
      cx.fillStyle = 'rgba(0,0,0,.28)'; cx.beginPath(); cx.ellipse(0, 0, 14, 5, 0, 0, 7); cx.fill();
      if (calm && A.ready.fx) { var k = 1 - calm, w = 58 + k * 18; cx.save(); cx.globalAlpha = Math.min(1, calm * 1.6);   // PROPOSED calm ring size
        cx.drawImage(FX.img, Math.min(3, Math.floor(k * 4)) * FX.cell, FX.cell, FX.cell, FX.cell, -w / 2, -w * .5, w, w); cx.restore(); count('calm'); }
      if (f.flip) cx.scale(-1, 1); cx.imageSmoothingEnabled = true;
      cx.drawImage(WALK.img, f.col * WALK.cell, f.row * WALK.cell, WALK.cell, WALK.cell, -D / 2, -D * WALK.foot, D, D);
      cx.restore(); count(f.why); A.last = f; return true;
    } catch (e) { count('err'); return false; }
  }

  // Rainroot snare: v23 writes a "VEYRU · RAINROOT SNARE" text over the snared machine; draw the vines + water there for the text's life (1.2 s)
  function drawSnares(X) {
    var V23 = window.YOUR_V23; if (!V23 || !V23.fx || !A.ready.fx) return; var cx = X.cx, T = X.T;
    V23.fx.forEach(function (e) { if (e.s !== SNARE_TEXT) return; var k = 1 - Math.max(0, Math.min(1, e.life / 1.2)), w = 64;   // PROPOSED snare size (px)
      cx.save(); cx.globalAlpha = Math.min(1, e.life * 2);
      cx.drawImage(FX.img, Math.min(3, Math.floor(k * 5)) * FX.cell, 0, FX.cell, FX.cell, e.x * T - w / 2, (e.y + 1.6) * T - w * .62, w, w); cx.restore(); count('snare'); });
  }
  function install(X) {
    var _dp = X.fn.drawPlayer(); X.set('drawPlayer', function (t) { _dp(t); try { drawSnares(X); } catch (e) { count('err'); } });
    // mood portrait: v22 reads KC.art.face whenever it opens Veyru's sheet, the dialogue box or the phone card
    var KC = window.YOUR_V22_CONFIG && window.YOUR_V22_CONFIG.kaw, art = KC && KC.art;
    if (art) { var orig = art.face; try { Object.defineProperty(art, 'face', { configurable: true, enumerable: true,
      get: function () { var f = faceFor(moodNow()); A.face = f || orig; return A.face; }, set: function (v) { orig = v; } }); } catch (e) { } }
  }
  var inst = window.YOUR_V20_INSTALL;
  window.YOUR_V20_INSTALL = function (X) { if (inst) inst(X); try { install(X); } catch (e) { console.warn('YOUR kaw art install', e); A.error = String(e && e.stack || e); } };
})();
