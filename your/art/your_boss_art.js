/* Y.O.U.R. · BALLAST + GLASSJAW boss sprites. PROPOSAL_HOLD. Drafted by WIR Recovery for owner review.
   Art: original WIR frames cut from the owner's ChatGPT sheets 34 (BALLAST, CG-10) and 35 (GLASSJAW, CG-11); 4×2 cells of 160 px, feet at y=154,
   facing right. Row 0: idle 0-1, walk 2-3. Row 1: windup 0, strike 1, hit 2, down/stunned 3.
   your/v23/your_v23.js drawBoss calls YOUR_BOSS_ART.draw(cx, B, x, y, t); when it returns true the labelled placeholder body is skipped.
   If a sheet fails to load, draw() returns false and v23 keeps its placeholder (and its "placeholder art" label). Fight logic is not touched. */
(function () {
  'use strict';
  var CELL = 160, FOOT = 154;
  var SHEETS = {
    ballast: { src: 'your/assets/villains/bosses/ballast_160.webp', size: 96 },   // PROPOSED on-map size (px): about the height of the old 86 px placeholder
    glassjaw: { src: 'your/assets/villains/bosses/glassjaw_160.webp', size: 84 }  // PROPOSED on-map size (px): about the old 76 px placeholder
  };
  var A = window.YOUR_BOSS_ART = { sheets: SHEETS, ready: {}, drawn: {}, last: null, draw: draw, frameFor: frameFor };
  Object.keys(SHEETS).forEach(function (id) { var im = new Image(); im.onload = function () { A.ready[id] = true; }; im.onerror = function () { A.ready[id] = false; }; im.src = SHEETS[id].src; SHEETS[id].img = im; });
  function moving(B, t) { var m = B._artX != null && Math.hypot(B.x - B._artX, B.y - B._artY) > .002; B._artX = B.x; B._artY = B.y; if (m) B._artMv = t; return B._artMv && t - B._artMv < .2; }
  // state → [row, col]
  function frameFor(B, t) {
    if (B.done || B.st === 'down' || B.st === 'stun') return [1, 3];
    if (B.hitT > 0) return [1, 2];
    if (B.st === 'atk' || (B.charge && !(B.charge.tele > 0))) return [1, 1];
    if (B.st === 'braced') return B.waves && B.waves.length ? [1, 1] : [1, 0];
    if (B.st === 'tele' || (B.charge && B.charge.tele > 0)) return [1, 0];
    return moving(B, t) ? [0, 2 + (Math.floor(t * 6) % 2)] : [0, Math.floor(t * 2) % 2];
  }
  function draw(cx, B, x, y, t) {
    try {
      var S = B && SHEETS[B.id]; if (!S || !A.ready[B.id]) return false;
      var f = frameFor(B, t), D = S.size, G = window.WIR_GAME && window.WIR_GAME.G;
      var face = B.charge && B.charge.a != null ? (Math.cos(B.charge.a) < 0 ? -1 : 1) : (G && G.px < B.x ? -1 : 1);
      cx.save(); cx.translate(Math.round(x), Math.round(y + 2)); if (face < 0) cx.scale(-1, 1);
      cx.drawImage(S.img, f[1] * CELL, f[0] * CELL, CELL, CELL, -D / 2, -D * FOOT / CELL, D, D);
      cx.restore(); A.drawn[B.id] = (A.drawn[B.id] || 0) + 1; A.last = { id: B.id, st: B.st, frame: f, face: face };
      return true;
    } catch (e) { return false; }
  }
})();
