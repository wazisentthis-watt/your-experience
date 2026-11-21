/* Y.O.U.R. · native football poses for the hero on the Elemental Gridiron field. PROPOSAL_HOLD. Drafted by WIR Recovery for owner review.
   Art: original WIR frames cut from the owner's ChatGPT sheets 48-56 (CG-FB1 pass, FB2 carry, FB3 stance, FB4 catch, FB5 tackle, FB6 dive,
   FB7 celebrate, FB8 kneel, FB9 helmet) into your/assets/hero/hero_football_poses_96.webp: one row per sheet, 96 px cells, all facing right
   (the engine mirrors for left), body height matched to hero_sheet_96.
   Loaded after your/v21/eg_hero.js. It wraps the engine's hdFrame once more: when eg_hero has picked a side-view hero pose that has native art here,
   only the image is swapped (same team recolour); pose choice, timing, views and every rule stay eg_hero's. Front/back views keep hero_sheet_96.
   If the sheet fails to load nothing changes, and the stand-in labels stay. */
(function () {
  'use strict';
  var V = window.__V21; if (!V || !V.POSE || typeof hdFrame !== 'function') return;
  var C = (window.YOUR_V21_CONFIG || {}).football || {};
  var ROW = { pass: 0, carry: 1, stance: 2, catch: 3, tackle: 4, dive: 5, celebrate: 6, kneel: 7, helmet: 8 };
  function R(sheet, cols) { return cols.map(function (c) { return [ROW[sheet], c]; }); }
  // eg_hero pose name → native frames [row, col]. Poses without native art (backflip, moonwalk, worm) keep their stand-in label.
  var FB = {
    ready: R('stance', [0]),                      // 3-point stance
    carry: R('carry', [0, 1, 2, 3]), carryIdle: R('carry', [4, 5]),
    hit: R('tackle', [0, 1, 2]), dive: R('dive', [0, 1]),
    catchHigh: R('catch', [1]), catchLow: R('catch', [3]),
    throwWind: R('pass', [1]), throwRel: R('pass', [2]), throwFollow: R('pass', [3]),
    td1: R('celebrate', [0]), td2: R('celebrate', [3]), dunk: R('celebrate', [0]), hype: R('celebrate', [2]),
    kneel: R('kneel', [0]), helmetoff: R('helmet', [0, 1])
  };
  var FBV = V.fb = { src: 'your/assets/hero/hero_football_poses_96.webp', ready: false, map: FB, drawn: {}, standinCleared: [] };
  var img = new Image();
  img.onload = function () { FBV.ready = true;   // native art is in: these poses are no longer stand-ins
    Object.keys(FB).forEach(function (nm) { var P = V.POSE[nm]; if (P && P.si) { delete P.si; FBV.standinCleared.push(nm); } }); };
  img.src = FBV.src; FBV.img = img;
  var cache = {};
  function hx(c) { c = String(c || '#2de2c4').replace('#', ''); if (c.length === 3) c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2]; var n = parseInt(c, 16); return isNaN(n) ? [45, 226, 196] : [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  function cell(r, c, tm) {   // same crop + teal→team recolour as eg_hero.js cell()
    var key = r + ',' + c + ',' + (C.teamRecolor === false ? '' : (tm.c1 + tm.c2)); if (cache[key]) return cache[key];
    var cv = document.createElement('canvas'); cv.width = cv.height = 96; var g = cv.getContext('2d');
    g.drawImage(img, c * 96, r * 96, 96, 96, 0, 0, 96, 96);
    if (C.teamRecolor !== false) try {
      var d = g.getImageData(0, 0, 96, 96), p = d.data, J = hx(tm.c1), T2 = hx(tm.c2);
      for (var i = 0; i < p.length; i += 4) { if (!p[i + 3]) continue; var R0 = p[i], G0 = p[i + 1], B0 = p[i + 2], mx = Math.max(R0, G0, B0), mn = Math.min(R0, G0, B0); if (!mx) continue;
        var sat = (mx - mn) / mx, v = mx / 255; if (sat < .35 || v < .22) continue; var dd = mx - mn, h;
        if (mx === R0) h = ((G0 - B0) / dd + 6) % 6; else if (mx === G0) h = (B0 - R0) / dd + 2; else h = (R0 - G0) / dd + 4; h *= 60;
        if (h < 150 || h > 200) continue; var Tc = v < .38 ? T2 : J, k = Math.min(1.15, v / .82);
        p[i] = Math.min(255, Tc[0] * k); p[i + 1] = Math.min(255, Tc[1] * k); p[i + 2] = Math.min(255, Tc[2] * k); }
      g.putImageData(d, 0, 0);
    } catch (e) { }
    return cache[key] = cv;
  }
  var _hd = hdFrame;
  hdFrame = function (e, sp, down) {
    var f = _hd.apply(this, arguments);
    try {
      var list = f && f.hero && !f.nf && FBV.ready && FB[f.nm], tm = list && TEAMS[e.team];
      if (tm) { var t = f.nm === 'carry' ? e.anim * 1.6 : f.nm === 'carryIdle' ? G.t * 3 : G.t * 6;   // same clocks as eg_hero heroFrame
        var rc = list[((Math.floor(t) % list.length) + list.length) % list.length]; f.img = cell(rc[0], rc[1], tm); f.native = true;
        FBV.drawn[f.nm] = (FBV.drawn[f.nm] || 0) + 1; }
    } catch (err) { }
    return f;
  };
})();
