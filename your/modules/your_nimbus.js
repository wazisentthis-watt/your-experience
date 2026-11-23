/* Y.O.U.R. Nimbus layout: ONE controller layout for the whole game.
   The SteelSeries Nimbus has A B X Y, L1 R1, analog L2 R2, two sticks, D-pad and Menu.
   It has NO stick clicks (L3 / R3) and NO Select / View. Older layers used both, so those moves were unreachable.
   This layer wraps navigator.getGamepads() and hands every module a "virtual" standard pad:
     - menus, minigames, overlays: physical buttons pass straight through (Menu also stands in for View / Back)
     - city (on foot): the layout below, translated into the buttons each layer already reads
     - fight (SIKEE street / house): fight actions go straight to SIKEE.act(); the other layers see a quiet pad
   Nothing here edits the other layers' logic. The old index map in your_v22_config is replaced at load.
   Layout numbers are guesses to tune by feel (TAP_MS, FLICK, DEAD). */
(function () {
  'use strict';
  if (window.NIMBUS) return;

  var DEAD = .22, FLICK = .6, TAP_MS = 220, PULSE_MS = 70, TRIG = .5, FLEE_MS = 500;

  /* virtual button indices past the standard 17: one per Y.O.U.R. power, read by v22 */
  var VB = { jump: 20, hit: 21, blast: 22, calm: 23, transform: 24, root: 25, core: 26, crown: 27, dash: 28 };

  var LAYOUT = {
    city: {
      'Left stick': 'Move',
      'A': 'Act: talk / use what is close, otherwise Jump',
      'B': 'Tap Dash · hold Sprint',
      'X': 'Hit',
      'Y': 'Ride',
      'Right stick flick': 'Hit',
      'RT': 'Blast',
      'RB': 'Fly / land',
      'Hold LT + A / X / Y / B': 'Root / Core / Crown / Calm',
      'Hold LB + Y': 'Transform',
      'LT + RT': 'Gravitational charge (read by the combat module)',
      'D-pad up': 'Do tab',
      'D-pad down': 'Show / hide this guide',
      'Menu': 'Phone'
    },
    fight: {
      'Left stick': 'Move',
      'X': 'Punch (3-hit combo)',
      'Right stick flick': 'Punch that way',
      'RT': 'Blast (costs charge)',
      'B': 'Dodge (a dodge into an attack is a SLIP: slow-mo and a crit)',
      'Y': 'Call your KAW (they decide if they help)',
      'Hold Menu': 'Run, once you are clear of the foe'
    },
    menu: {
      'D-pad / left stick': 'Move between items',
      'A': 'Pick', 'B': 'Back', 'LB / RB': 'Previous / next tab',
      'Menu': 'Phone · hold to end practice'
    }
  };

  var N = window.NIMBUS = {
    layout: LAYOUT, VB: VB, version: 1,
    ctx: 'menu', pad: null, connected: false,
    intent: { rx: 0, ry: 0, LT: 0, RT: 0, LB: false, RB: false, dpadDown: false, gravitationalChargeActive: false },
    log: []
  };

  var realGet = navigator.getGamepads ? navigator.getGamepads.bind(navigator) : function () { return []; };
  function physical() { try { var l = realGet(); for (var i = 0; i < l.length; i++) if (l[i] && l[i].connected) return l[i]; } catch (e) {} return null; }
  function btn(gp, i) { var b = gp.buttons[i]; return b ? !!b.pressed || (b.value || 0) > TRIG : false; }
  function val(gp, i) { var b = gp.buttons[i]; return !b ? 0 : (typeof b.value === 'number' && b.value > 0 ? b.value : (b.pressed ? 1 : 0)); }
  function dz(v) { return Math.abs(v) < DEAD ? 0 : v; }
  function now() { return performance.now(); }

  var prev = {}, pulses = {}, held = {}, tapB = null, bHeld = false, fleeT = 0, lastCtx = '', rsLatch = false, strikeCd = 0, ltRtOn = false;

  function edge(key, on) { var e = on && !prev[key]; prev[key] = on; return e; }
  function pulse(i) { pulses[i] = now() + PULSE_MS; }
  function reset() { pulses = {}; held = {}; tapB = null; bHeld = false; fleeT = 0; rsLatch = false; }

  function context() {
    var W = window.WIR_GAME; if (!W || !W.S) return 'menu';
    var G = W.G, MG = W.MG, st = document.getElementById('start');
    if (G.phone || G.sheet || G.fb || G.lab || G.fade || (MG && MG.cur) || (st && !st.hidden)) return 'menu';
    if (window.SIKEE && SIKEE.fighting && SIKEE.fighting()) return 'fight';
    return 'city';
  }

  function build() {
    var gp = physical(); N.connected = !!gp;
    if (!gp) { N.pad = null; reset(); return; }
    var t = now(), c = context(); if (c !== lastCtx) { reset(); lastCtx = c; } N.ctx = c;
    var lx = dz(gp.axes[0] || 0), ly = dz(gp.axes[1] || 0), rx = dz(gp.axes[2] || 0), ry = dz(gp.axes[3] || 0);
    var rmag = Math.hypot(rx, ry);
    var A = btn(gp, 0), B = btn(gp, 1), X = btn(gp, 2), Y = btn(gp, 3), LB = btn(gp, 4), RB = btn(gp, 5);
    var LT = val(gp, 6), RT = val(gp, 7), MENU = btn(gp, 9) || btn(gp, 8), DU = btn(gp, 12), DD = btn(gp, 13);
    var ltOn = LT > TRIG, rtOn = RT > TRIG;
    N.intent = { rx: rx, ry: -ry, LT: LT, RT: RT, LB: LB, RB: RB, dpadDown: DD, gravitationalChargeActive: ltOn && rtOn };

    var out = []; for (var i = 0; i < 29; i++) out[i] = { pressed: false, value: 0 };
    function set(i, on, v) { out[i] = { pressed: !!on, value: on ? (v == null ? 1 : v) : 0 }; }
    var aim = rmag > FLICK ? [rx / rmag, ry / rmag] : null;

    if (c === 'menu') {
      /* menus: everything passes through; Menu doubles as View so overlays can end practice without a Select button */
      for (i = 0; i < 17; i++) { var b = gp.buttons[i]; if (b) set(i, b.pressed, b.value); }
      set(8, btn(gp, 8) || btn(gp, 9)); set(9, btn(gp, 9));
      reset();
    } else if (c === 'fight') {
      var S = window.SIKEE;
      if (edge('fx', X)) S.act('strike', aim ? aim[0] : 0, aim ? aim[1] : 0);
      if (aim) { if (!rsLatch && t > strikeCd) { rsLatch = true; strikeCd = t + 260; S.act('strike', aim[0], aim[1]); } } else rsLatch = false;
      if (edge('fr', rtOn)) S.act('blast', aim ? aim[0] : 0, aim ? aim[1] : 0);
      if (edge('fb', B)) S.act('dodge');
      if (edge('fy', Y)) S.act('kaw');
      if (MENU) { if (!fleeT) fleeT = t; else if (t - fleeT > FLEE_MS) { fleeT = 0; S.act('run'); } } else fleeT = 0;
      /* the other layers see only the left stick */
    } else {
      /* ---- city ---- */
      var shiftL = ltOn && !rtOn, formL = LB;
      /* A: act on what is close, else jump. Under LT it is ROOT. */
      if (edge('a', A)) {
        if (shiftL) pulse(VB.root);
        else { var near = window.WIR_GAME && WIR_GAME.nearestUse && WIR_GAME.nearestUse(); pulse(near ? 0 : VB.jump); }
      }
      /* B: tap = dash, hold = sprint. Under LT it is CALM. */
      if (shiftL) { if (edge('bl', B)) pulse(VB.calm); tapB = null; bHeld = false; prev.b = B; }
      else {
        if (B && !prev.b) tapB = t;
        if (B && tapB && t - tapB > TAP_MS) bHeld = true;
        if (!B && prev.b) { if (tapB && !bHeld) pulse(VB.dash); tapB = null; bHeld = false; }
        prev.b = B;
      }
      if (bHeld) set(1, true);
      /* X: hit, under LT it is CORE */
      if (edge('x', X)) pulse(shiftL ? VB.core : VB.hit);
      /* Y: ride, under LT it is CROWN, under LB it is TRANSFORM */
      if (edge('y', Y)) { if (shiftL) pulse(VB.crown); else if (formL) pulse(VB.transform); else pulse(3); }
      /* right stick flick = hit */
      if (aim) { if (!rsLatch && t > strikeCd) { rsLatch = true; strikeCd = t + 260; pulse(VB.hit); } } else rsLatch = false;
      /* RT = blast, unless LT is also down (that pair is the gravitational charge) */
      if (edge('rt', rtOn) && !ltOn) pulse(VB.blast);
      /* RB = fly, unless LB is down (LB + RB + D-down is Valence regulation, not flight) */
      if (!LB) set(5, RB);
      /* D-pad up = Do tab, down = guide */
      if (edge('du', DU)) pulse(2);
      if (edge('dd', DD) && !LB) toggleLegend();
      set(9, MENU);
    }

    /* timed pulses */
    for (var k in pulses) { if (t < pulses[k]) set(+k, true); else delete pulses[k]; }

    N.pad = {
      id: gp.id, index: gp.index, connected: true, mapping: 'standard', timestamp: gp.timestamp,
      axes: [lx, ly, c === 'menu' ? rx : 0, c === 'menu' ? ry : 0],
      buttons: out, vibrationActuator: gp.vibrationActuator
    };
  }

  /* poll once a frame so fight actions and taps resolve even if no other layer asked this frame */
  (function loop() { try { build(); } catch (e) {} requestAnimationFrame(loop); })();

  /* every layer's getGamepads() now reads the virtual pad */
  navigator.getGamepads = function () { build(); return N.pad ? [N.pad] : []; };

  /* ---- on-screen guide: shows once when the pad first wakes, D-pad down toggles it ---- */
  var box = null, shownOnce = false;
  function legendHtml(which) {
    var L = LAYOUT[which], h = '<b>Nimbus · ' + which + '</b>';
    Object.keys(L).forEach(function (k) { h += '<div><span>' + k + '</span><i>' + L[k] + '</i></div>'; });
    return h;
  }
  function ensureBox() {
    if (box) return box;
    var st = document.createElement('style');
    st.textContent = '#nimbusGuide{position:fixed;left:10px;bottom:10px;z-index:9000;max-width:min(92vw,360px);background:rgba(18,14,34,.92);color:#f4eadb;border:1px solid #55ddff;border-radius:12px;padding:8px 10px;font:600 11px/1.45 system-ui,sans-serif;pointer-events:none}' +
      '#nimbusGuide b{color:#ffe066;display:block;margin-bottom:3px;letter-spacing:.06em;text-transform:uppercase}#nimbusGuide div{display:flex;gap:8px;justify-content:space-between}#nimbusGuide span{color:#55ddff;white-space:nowrap}#nimbusGuide i{font-style:normal;text-align:right;opacity:.92}';
    document.head.appendChild(st);
    box = document.createElement('div'); box.id = 'nimbusGuide'; box.hidden = true; document.body.appendChild(box); return box;
  }
  var hideT = 0;
  function showLegend(ms) { var b = ensureBox(); b.innerHTML = legendHtml(N.ctx === 'fight' ? 'fight' : 'city'); b.hidden = false; clearTimeout(hideT); if (ms) hideT = setTimeout(function () { b.hidden = true; }, ms); }
  function toggleLegend() { var b = ensureBox(); if (b.hidden) showLegend(0); else b.hidden = true; }
  N.showGuide = showLegend; N.toggleGuide = toggleLegend;

  /* keep the guide in step with the context while it is open, and show it once per page load when a pad first moves */
  setInterval(function () {
    var gp = physical();
    if (gp && !shownOnce && (gp.buttons.some(function (b) { return b && b.pressed; }) || gp.axes.some(function (a) { return Math.abs(a) > .4; }))) { shownOnce = true; if (N.ctx === 'city' || N.ctx === 'fight') showLegend(7000); }
    if (box && !box.hidden && ((N.ctx === 'fight') !== (box.firstChild.textContent.indexOf('fight') > -1))) showLegend(0);
    if (box && !box.hidden && N.ctx === 'menu') box.hidden = true;
  }, 250);

  /* v22 reads MC.pad each poll: replace the old index map (it used R3 and the D-pad) with the virtual power buttons */
  try { var C = window.YOUR_V22_CONFIG; if (C && C.mella) { C.mella.padOld = C.mella.pad; C.mella.pad = VB; C.mella.padNote = 'Nimbus layout (your_nimbus.js): see NIMBUS.layout. No R3, no Select.'; } } catch (e) {}
})();
