/* Y.O.U.R. v2.2 activity-runner overlay · PROPOSAL_HOLD. Loaded only by your/game/v20_runner.html (after your_v20_runner.js).
   The hero is the MELLA (owner t70u), so the v1.1 companion assists no longer belong to a Mella NPC. PROPOSED: they move to the KAW
   sidekick Veyru with the SAME FaFiFi-fair rules (job spotter, skate line caller, one protect_bond per run). your_v11.js is unchanged:
   this file swaps the drawn companion (Y.v11.msheet → Veyru temp frames) and the on-screen name (canvas text + HUD toast) only. */
(function () {
  'use strict';
  var Y = window.YOUR; if (!Y || !Y.v11) return;
  var A = '../assets/kaw/veyru/', SRC = { idle: A + 'veyru_idle_64.png', walk: [0, 1, 2, 3].map(function (i) { return A + 'veyru_walk_r_' + i + '_64.png'; }) };
  var IM = {}; function img(s) { var i = IM[s]; if (!i) { i = IM[s] = new Image(); i.src = s; } return i.complete && i.naturalWidth ? i : null; }
  img(SRC.idle); SRC.walk.forEach(img);
  var R = window.YOUR_V22_RUNNER = { drawn: 0, relabeled: 0 };
  var sheet = { draw: function (g, anim, t, x, y) { var walk = /^walk/.test(anim || ''), im = walk ? img(SRC.walk[Math.floor((t || 0) * 8) % 4]) : img(SRC.idle); if (!im) return;
    var left = /_left$/.test(anim || ''), sz = 58; g.save(); g.translate(x, y); if (left) g.scale(-1, 1); g.imageSmoothingEnabled = false; g.drawImage(im, -sz / 2, -sz * .97, sz, sz); g.restore(); R.drawn++; } };
  Y.v11.msheet = function () { return sheet; };
  function swap(s) { if (typeof s !== 'string' || s.indexOf('Mella') < 0) return s; R.relabeled++; return s.replace(/Mella: shake it off!/g, 'Veyru steadies you!').replace(/Mella/g, 'Veyru'); }
  var ft = CanvasRenderingContext2D.prototype.fillText;
  CanvasRenderingContext2D.prototype.fillText = function (t) { var a = [].slice.call(arguments); a[0] = swap(t); return ft.apply(this, a); };
  if (Y.hud && Y.hud.toast) { var to = Y.hud.toast; Y.hud.toast = function (m) { var a = [].slice.call(arguments); a[0] = swap(m); return to.apply(this, a); }; }
  R.installed = true;
})();
