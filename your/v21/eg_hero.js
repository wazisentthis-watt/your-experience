/* Y.O.U.R. v2.1 · the owner hero on the Elemental Gridiron field. PROPOSAL_HOLD (PUBLISH HOLD).
   Owner approved changing EG game logic for this (2026-11-15: "Yes, make you playable on the field").
   Loaded at the end of football.html, after the engine and the Testimony bridge. The hero IS the engine's own "my player" card
   (id 'myplayer' in games/scrimmages/Testimony, id 'rookie' in combine drills), so every rule, stat, position slot and control path
   is the engine's; this file only changes how that card looks, adds the name tag + HUD chip, locks control to the hero's slot,
   and writes standalone progress to wir_hero_profile. */
(function () {
  'use strict';
  var C = (window.YOUR_V21_CONFIG || {}).football || {};
  var EMBED = window.parent !== window;
  var V = window.__V21 = { drawn: {}, standin: {}, hero: null, frames: 0, lastPose: '', recolor: 0 };
  var HERO = { on: false, name: 'Hero', pos: C.defaultPos || 'QB', src: '' };
  V.hero = HERO;
  function fromProfile() {
    try { if (!window.WIR_HERO || !WIR_HERO.exists()) return false; var p = WIR_HERO.get(); if (p.lookId !== 'owner_starter_v1') return false;
      HERO.name = p.name; HERO.pos = window.YOUR_V21_FB ? YOUR_V21_FB.pos() : HERO.pos; return true; } catch (e) { return false; } }
  if (!EMBED && C.standaloneHero !== false && fromProfile()) { HERO.on = true; HERO.src = 'profile'; }
  // the Valence bridge sends the hero with every command (d.player.hero); this listener runs after the bridge's own
  function fromCmd(d) { if (!d || !d.wirCmd || !d.player) return;
    var h = d.player.hero; if (h && h.lookId === 'owner_starter_v1') { HERO.on = true; HERO.src = 'valence'; HERO.name = String(h.name || 'Hero').slice(0, 22); HERO.pos = d.player.pos || HERO.pos; }
    else { HERO.on = false; HERO.src = ''; } }
  window.addEventListener('message', function (e) { fromCmd(e.data); });
  // a command that arrived while this file was still loading was caught by the early catcher in <head>
  if (EMBED && window.__V21LAST) fromCmd(window.__V21LAST);

  /* ---------------- sprite sheet + football poses from the existing owner art ---------------- */
  var img = new Image(); img.src = C.sheet || 'your/assets/hero/hero_sheet_96.png'; V.img = img;
  function R(r, a, b) { var o = []; for (var c = a; c <= b; c++) o.push([r, c]); return o; }
  // side = right-facing frames (the engine mirrors for left); front/back = toward / away from the camera (not mirrored)
  // si = stand-in: no native football art yet, prompt in FOOTBALL_HERO_ART_PROMPTS.md
  var POSE = {
    idle: { side: R(3, 0, 3), front: R(0, 0, 3), back: R(1, 0, 3) },
    ready: { side: [[4, 1]], front: [[0, 0]], back: [[1, 0]], note: 'stance = fight-sheet step (20); 3-point stance prompt', si: 'stance' },
    run: { side: R(7, 0, 3), front: R(0, 4, 11), back: R(1, 4, 11) },
    carry: { side: R(7, 0, 3), front: R(0, 4, 11), back: R(1, 4, 11), si: 'carry' },
    carryIdle: { side: R(3, 0, 3), front: R(0, 0, 3), back: R(1, 0, 3), si: 'carry' },
    juke: { side: [[7, 8], [7, 9]] }, spin: { side: [[7, 11]] },
    truck: { side: [[4, 3]] }, stiff: { side: [[4, 3]] }, block: { side: [[4, 5]] },
    hit: { side: [[7, 9]], si: 'tackle' }, dive: { side: [[7, 10]], si: 'dive' }, hurdle: { side: [[7, 5], [7, 6]] },
    fall: { side: [[4, 14]] }, getup: { side: [[4, 12]] },
    catchHigh: { side: [[7, 6]], si: 'catch' }, catchLow: { side: [[4, 5]], si: 'catch' },
    throwWind: { side: [[4, 2]], si: 'throw' }, throwRel: { side: [[4, 3]], si: 'throw' }, throwFollow: { side: [[4, 1]], si: 'throw' },
    td1: { side: [[9, 12]], si: 'celebrate' }, td2: { side: [[9, 13]], si: 'celebrate' }, power: { side: [[9, 12], [9, 13]] },
    dunk: { side: [[9, 12]], si: 'celebrate' }, backflip: { side: [[7, 11]], si: 'celebrate' }, hype: { side: [[9, 13]], si: 'celebrate' },
    moonwalk: { side: R(7, 0, 3), si: 'celebrate' }, worm: { side: [[4, 15]], si: 'celebrate' },
    kneel: { side: [[4, 15]], si: 'kneel' }, helmetoff: { side: R(3, 0, 3), si: 'helmet' }, kick: { side: [[4, 4]] }
  };
  V.POSE = POSE;
  function isHero(e) { return HERO.on && e && e.pl && (e.pl.id === 'myplayer' || e.pl.id === 'rookie'); }
  V.isHero = isHero;
  var cache = {};
  function hx(c) { c = String(c || '#2de2c4').replace('#', ''); if (c.length === 3) c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2]; var n = parseInt(c, 16); return isNaN(n) ? [45, 226, 196] : [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  function cell(r, c, tm) {
    var key = r + ',' + c + ',' + (C.teamRecolor === false ? '' : (tm.c1 + tm.c2)); if (cache[key]) return cache[key];
    var cv = document.createElement('canvas'); cv.width = cv.height = 96; var g = cv.getContext('2d');
    g.drawImage(img, c * 96, r * 96, 96, 96, 0, 0, 96, 96);
    if (C.teamRecolor !== false) try {   // the hero's teal kit becomes the team jersey colour (c1); the darkest teal trim takes c2
      var d = g.getImageData(0, 0, 96, 96), p = d.data, J = hx(tm.c1), T2 = hx(tm.c2);
      for (var i = 0; i < p.length; i += 4) { if (!p[i + 3]) continue; var R0 = p[i], G0 = p[i + 1], B0 = p[i + 2], mx = Math.max(R0, G0, B0), mn = Math.min(R0, G0, B0); if (!mx) continue;
        var sat = (mx - mn) / mx, v = mx / 255; if (sat < .35 || v < .22) continue; var dd = mx - mn, h;
        if (mx === R0) h = ((G0 - B0) / dd + 6) % 6; else if (mx === G0) h = (B0 - R0) / dd + 2; else h = (R0 - G0) / dd + 4; h *= 60;
        if (h < 150 || h > 200) continue; var Tc = v < .38 ? T2 : J, k = Math.min(1.15, v / .82);
        p[i] = Math.min(255, Tc[0] * k); p[i + 1] = Math.min(255, Tc[1] * k); p[i + 2] = Math.min(255, Tc[2] * k); }
      g.putImageData(d, 0, 0); V.recolor++;
    } catch (e) { }
    return cache[key] = cv;
  }
  function heroFrame(e, sp, down) {
    if (!(img.complete && img.naturalWidth)) return null; var tm = TEAMS[e.team]; if (!tm) return null;
    var nm = hdName(e, sp, down);
    // pocket drill: the engine animates no throw for the drill QB; show the hero's throw poses while aiming / just after release
    if (G.mode === 'drill' && D && D.type === 'pocket' && e === D.e && !down) { if (IN.sling) nm = 'throwWind'; else if (D.ball && D.t - D.ball.t0 < .25) nm = 'throwRel'; else if (D.ball && D.t - D.ball.t0 < .5) nm = 'throwFollow'; }
    var P = POSE[nm] || POSE.idle, stat = nm === 'idle' || nm === 'ready' || nm === 'run' || nm === 'carry' || nm === 'carryIdle';
    var v = stat ? hdView(e, sp) : 'side', list = (v !== 'side' && P[v]) || P.side, nf = v !== 'side' && !!P[v];
    var t = (nm === 'run' || nm === 'carry' || nm === 'moonwalk') ? e.anim * 1.6 : nm === 'idle' || nm === 'carryIdle' ? G.t * 3 : G.t * 6;
    var rc = list[((Math.floor(t) % list.length) + list.length) % list.length];
    V.frames++; V.drawn[nm] = (V.drawn[nm] || 0) + 1; V.lastPose = nm; if (P.si) V.standin[P.si] = (V.standin[P.si] || 0) + 1; V.lastSI = P.si || '';
    return { img: cell(rc[0], rc[1], tm), sx: 0, sy: 0, s: C.spriteSize || 31, nm: nm, nf: nf, hero: true, rot: nm === 'fall' && down ? 0 : 0 };
  }
  var _hd = hdFrame;
  hdFrame = function (e, sp, down) { if (isHero(e)) { var f = heroFrame(e, sp, down); if (f) return f; } return _hd.apply(this, arguments); };
  // name tag over the hero, same transform as the body
  var _body = drawPlayerBody;
  drawPlayerBody = function (e, ghost) {
    _body.apply(this, arguments);
    if (!isHero(e) || ghost || C.nameTag === false) return;
    var px = Math.round(gx(e.y)), py = Math.round(gy(e.x)); if (py < FY0 - 20 || py > FY1 + 30 || px < -30 || px > 400) return;
    ctx.save(); ctx.translate(px, py); if (LAND) ctx.rotate(UPR);
    var s = C.spriteSize || 31, label = HERO.name.toUpperCase() + ' · ' + String(e.role || HERO.pos).replace(/\d+$/, '');
    ctx.font = '700 6px "Press Start 2P", monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    var w = ctx.measureText(label).width + 4; ctx.fillStyle = 'rgba(11,10,31,.78)'; ctx.fillRect(-w / 2, -s - 9, w, 8);
    ctx.fillStyle = '#ffcf3f'; ctx.fillText(label, 0, -s - 1.5); ctx.restore(); V.tags = (V.tags || 0) + 1;
  };
  /* ---------------- control: you play the hero's slot (outside Testimony too) ---------------- */
  function heroEnt() { return G.ents && G.ents.find(function (x) { return isHero(x) && !x.inactive; }); }
  V.heroEnt = heroEnt;
  var _pre = prePlay;
  prePlay = function () {
    var r = _pre.apply(this, arguments);
    try { if (HERO.on && C.lockControlToHero !== false && G.mode === 'game' && !G.tml && !G.spectate && TEAMS[0] && TEAMS[0].human) { var me = heroEnt();
      if (me && me.team === 0) { if (G.off === 0) G.ctlOff = me.role !== 'QB' ? me.role : null; else { G.dctrl = me; G.ctlRole = me.role; } V.locked = (V.locked || 0) + 1; } } } catch (e) { }
    return r;
  };
  /* ---------------- HUD chip: portrait, name, position, pose (stand-in art is labelled) ---------------- */
  var hud = document.createElement('div'); hud.id = 'heroHud';
  hud.innerHTML = '<img alt="" src="' + (C.portrait || 'your/assets/hero/hero_portrait_256.png') + '"><div><b id="heroHudName">HERO</b><small id="heroHudSub"></small></div>';
  var st = document.createElement('style');
  st.textContent = '#heroHud{position:fixed;left:8px;top:calc(env(safe-area-inset-top,0px) + 46px);z-index:40;display:none;align-items:center;gap:6px;padding:4px 8px 4px 4px;border-radius:8px;background:rgba(11,10,31,.82);border:1px solid #ffcf3f;color:#f4efe0;font:600 10px/1.25 "JetBrains Mono",monospace;pointer-events:none;max-width:46vw}' +
    '#heroHud img{width:28px;height:28px;border-radius:6px;object-fit:cover;background:#1b1838}#heroHud b{display:block;color:#ffcf3f;font:700 11px "Press Start 2P",monospace;letter-spacing:.04em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}#heroHud small{display:block;opacity:.85;white-space:nowrap}#heroHud .si{color:#ff9ad5}';
  document.head.appendChild(st); document.body.appendChild(hud);
  setInterval(function () {
    var me = (G.mode === 'game' || G.mode === 'drill') && heroEnt();
    if (!me) { hud.style.display = 'none'; return; }
    hud.style.display = 'flex'; var role = String(me.role || HERO.pos).replace(/\d+$/, '');
    document.getElementById('heroHudName').textContent = HERO.name.toUpperCase();
    var ctl = G.mode === 'drill' ? 'YOU' : (G.spectate ? 'SIDELINE' : (G.off === me.team ? (role === 'QB' || G.ctlOff === me.role ? 'YOU' : 'TEAMMATE') : (G.dctrl === me ? 'YOU' : 'DEF')));
    document.getElementById('heroHudSub').innerHTML = role + ' · ' + ctl + (V.lastSI ? ' · <span class="si">pose ' + V.lastSI + ': stand-in art</span>' : '');
    V.hud = (V.hud || 0) + 1;
  }, 250);
  /* ---------------- standalone EG: write progress to the hero profile (inside Valence, Valence writes it) ---------------- */
  if (!EMBED && window.YOUR_V21_FB) {
    var _dd = drillDone; drillDone = function () { try { if (HERO.on && D) { var avg = D.scores.reduce(function (a, b) { return a + b; }, 0) / Math.max(1, D.scores.length); YOUR_V21_FB.record({ kind: 'drill', drill: D.type, score: avg }, HERO.pos); } } catch (e) { } return _dd.apply(this, arguments); };
    var _fin = showFinal; showFinal = function () { try { if (HERO.on && G.mode === 'game') { var s = G.stats || {}; YOUR_V21_FB.record({ kind: 'game', us: TEAMS[0].score, them: TEAMS[1].score, yds: (s.yds || [0])[0], tds: (s.tds || [0])[0], comp: (s.comp || [0])[0], pass: (s.pass || [0])[0], myAct: G.myAct || 0 }, HERO.pos); } } catch (e) { } return _fin.apply(this, arguments); };
  }
  // a game that ends during a TD celebration left the celebration pad over the final screen (BACK TO YOUR DAY could not be tapped)
  var _sf = showFinal; showFinal = function () { var r = _sf.apply(this, arguments); try { var cp = document.getElementById('celpad'); if (cp && cp.classList.contains('on')) { cp.classList.remove('on'); V.celpadFix = (V.celpadFix || 0) + 1; } } catch (e) { } return r; };
  V.ready = true;
})();
