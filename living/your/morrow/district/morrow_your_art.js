/* Y.O.U.R. v2.4m · PROPOSAL_HOLD (PUBLISH HOLD) — MORROW CITY · Y.O.U.R. ART + VILLAIN CLASH layer.
   Loaded after morrow_coop.js. Wires the owner-requested ChatGPT art sheets (your-art/chatgpt 33–45, PROPOSAL art, sliced by
   tools/slice_art.py into your/morrow/assets/your_art/*.png, flat white keyed out) into the district:
   · hero (lead 'hero' or AI ally): hit / hurt (front + back), cast up / down for BLAST, CALM, LIVING REFRACTION transform (front / side / back)
   · MELLA power VFX: blast bolt + impact, calm ring, team-combo circuit; power-system icons on the co-op buttons
   · VILLAIN CLASH: THE FOREMAN, BALLAST, GLASSJAW, SLIPLINE, NYAXI, RATTLE join the v17 Clash Lab catalog (MorrowClashV16), so the
     engine's own attack / telegraph / win / save code runs them and METAL (AI ally) fights them through the existing 'frame' path.
   Names, powers and body facts are canon; costumes/colours, every number and the non-CANON lines below are PROPOSED. Contained, never killed. */
(function () {
  'use strict';
  var M = window.METAL, Y = window.YOUR_MORROW, E = window.__YOUR_MORROW_ENGINE || {}, H = window.WIR_HERO || null;
  if (!M || !Y || !Y.installed) { console.warn('YOUR Morrow art: co-op layer missing'); return; }
  var C = E.MorrowClashV16 || M.MorrowClashV16, surf = E.surf, elev = E.elev;
  var A = window.YOUR_MORROW_ART = { version: '2.4m-art', installed: false, img: {}, stats: {}, fx: [], villainIdx: -1 };
  function count(k, n) { A.stats[k] = (A.stats[k] || 0) + (n || 1); }
  var BASE = '../assets/your_art/', SHEETS = { hit: ['hero_hit_hurt', 4, 2, 128], cast: ['hero_cast_up_down', 4, 1, 128], calm: ['hero_calm', 4, 1, 128], refr: ['hero_living_refraction', 4, 3, 128],
    icons: ['power_icons', 7, 2, 96], vfx: ['mella_power_vfx', 6, 5, 96] };
  var VILLAINS = [ // canon: name, power, episode, body. PROPOSED: max HP / range / speed (game tuning), costume art.
    { id: 'ballast', name: 'BALLAST', short: 'BALLAST', kind: '202 cm / 268 kg synthetic biped', max: 10, range: 150, speed: 28, color: '#b47cff', intro: '“You can’t move me.”', introSrc: 'CANON', outro: 'Contained — not killed.', outroSrc: 'v2.3' },
    { id: 'glassjaw', name: 'GLASSJAW', short: 'GLASSJAW', kind: '191 cm / 82 kg', max: 8, range: 150, speed: 72, color: '#bfe6ff', intro: '191 cm / 82 kg', introSrc: 'canon body', outro: '“Strong ain’t the same thing as tough.”', outroSrc: 'CANON' },
    { id: 'slipline', name: 'SLIPLINE', short: 'SLIPLINE', kind: '185 cm / 74 kg · Somebody Pays', max: 8, range: 160, speed: 80, color: '#ffc94a', intro: '“Same lane, same way. Again.”', introSrc: 'PROPOSED (Claude draft)', outro: '“Vary it next time.”', outroSrc: 'PROPOSED (Claude draft)' },
    { id: 'nyaxi', name: 'NYAXI', short: 'NYAXI', kind: '180 cm / 81 kg · Bent Compass', max: 9, range: 180, speed: 55, color: '#ff6a6a', intro: '“Your line is not your own.”', introSrc: 'PROPOSED (Claude draft)', outro: '“East is down. Keep going.”', outroSrc: 'PROPOSED (Claude draft)' },
    { id: 'rattle', name: 'RATTLE', short: 'RATTLE', kind: '175 cm / 90 kg · Underfoot', max: 9, range: 150, speed: 45, color: '#f2b640', intro: '“Step on me. See what holds.”', introSrc: 'PROPOSED (Claude draft)', outro: '“The floor was lying to you.”', outroSrc: 'PROPOSED (Claude draft)' },
    { id: 'foreman', name: 'THE FOREMAN', short: 'FOREMAN', kind: '204 cm / 148 kg · Labor Ghost One', max: 12, range: 190, speed: 40, color: '#e8b070', intro: '“Every hit you throw, I keep.”', introSrc: 'PROPOSED (Claude draft)', outro: '“Make only the contacts you need.”', outroSrc: 'PROPOSED (Claude draft)' }];
  A.VILLAINS = VILLAINS;
  function load(key, file) { var i = new Image(); i.onload = function () { count('loaded'); }; i.onerror = function () { count('load_error'); if (Y.errors.length < 5) Y.errors.push('art missing: ' + file); }; i.src = BASE + file + '.png'; A.img[key] = i; }
  Object.keys(SHEETS).forEach(function (k) { load(k, SHEETS[k][0]); });
  VILLAINS.forEach(function (v) { load('v_' + v.id, 'villain_' + v.id); });
  function ok(i) { return i && i.complete && i.naturalWidth > 0; }
  function cellDraw(ctx, key, c, r, x, y, size, flip, anchor) { var im = A.img[key], sh = SHEETS[key], cell = sh ? sh[3] : 160; if (!ok(im)) return false;
    ctx.save(); ctx.translate(x, y); if (flip) ctx.scale(-1, 1); ctx.imageSmoothingEnabled = true;
    if (anchor === 'center') ctx.drawImage(im, c * cell, r * cell, cell, cell, -size / 2, -size / 2, size, size); else ctx.drawImage(im, c * cell, r * cell, cell, cell, -size / 2, -size, size, size);
    ctx.restore(); return true; }

  /* ------------------------------------------------ hero frames */
  Y.drawHeroArt = function (ctx, o, sx, sy, moving, t, blink) {
    if (o === M.Rider.p && A.fx.length) drawAttachedFx(ctx, sx, sy);
    var up = Math.sin(o.face || 0) < -0.45, right = Math.cos(o.face || 0) >= 0, key = null, c = 0, r = 0, flip = false, S = 112;
    var hurt = (o.hurtT > 0) || o.down > 0 || o.state === 'bail';
    if (hurt) { key = 'hit'; c = 3; r = up ? 1 : 0; count('f_hurt'); }
    else if (o.act === 'blast' && o.actT > 0) { key = 'cast'; c = (up ? 2 : 0) + ((o.actT < .25) ? 1 : 0); count('f_cast_' + (up ? 'up' : 'down')); }
    else if (o.act === 'calm' && o.actT > 0) { key = 'calm'; c = Math.min(3, Math.floor((1 - o.actT / .6) * 4)); count('f_calm'); }
    else if (o.act === 'hit' && o.actT > 0 || o.state === 'strike' || (o.anim && o.anim.name === 'strike')) { key = 'hit'; c = Math.min(2, Math.floor(t * 10) % 3); r = up ? 1 : 0; count('f_hit'); }
    else if (Y.transformT > 0 && (o === M.Rider.p ? Y.lead === 'hero' : Y.lead === 'metal')) { key = 'refr'; r = up ? 2 : (Math.abs(Math.cos(o.face || 0)) > .7 ? 1 : 0); c = moving ? Math.floor(t * 8) % 4 : 0; flip = r === 1 && !right; count('f_refraction'); }
    if (!key) return false;
    ctx.save(); if (blink) ctx.globalAlpha = .55; var drawn = cellDraw(ctx, key, c, r, sx, sy + 4, S, flip); ctx.restore();
    if (drawn && key === 'refr') { ctx.save(); ctx.globalAlpha = .35 + .15 * Math.sin(t * 9); cellDraw(ctx, 'vfx', 3, 3, sx, sy - 4, 120, false, 'center'); ctx.restore(); }
    return drawn; };

  /* ------------------------------------------------ power VFX (vfx rows: 0 blast bolt→impact · 1 ROOT ground · 2 CORE burst · 3 ring · 4 circuit) */
  // FX are stored relative to the hero's feet and drawn in the hero's own draw pass, so they line up with the sprite in every camera / elevation.
  function rel(P, x, y) { var K = M.Cam.K || 1, z = surf ? surf(x, y).z : 0; return { dx: x - P.x, dy: (y - elev(z) * K) - (P.y - elev(P.z) * K) }; }
  Y.onPower = function (kind, P, x, y, hit) { var r = rel(P, x, y);
    if (kind === 'blast') { A.fx.push({ k: 'bolt', dx: r.dx, dy: r.dy, t: 0, life: .42 }); count('vfx_blast'); }
    if (kind === 'calm') { A.fx.push({ k: 'ring', dx: 0, dy: 0, t: 0, life: .7 }); count('vfx_calm'); }
    if (kind === 'nova') { A.fx.push({ k: 'circuit', dx: r.dx, dy: r.dy - 30, t: 0, life: .9 }); A.fx.push({ k: 'burst', dx: r.dx, dy: r.dy - 40, t: 0, life: .7 }); count('vfx_nova'); } };
  Y.artUpdate = function (dt) { for (var i = A.fx.length - 1; i >= 0; i--) { A.fx[i].t += dt; if (A.fx[i].t >= A.fx[i].life) A.fx.splice(i, 1); } };
  function drawAttachedFx(ctx, sx, sy) { A.fx.forEach(function (f) { var p = f.t / f.life, col = Math.min(5, Math.floor(p * 6)), x = sx + f.dx, y = sy + f.dy;
      if (f.k === 'bolt') { var q = Math.min(1, p * 1.6), bx = sx + f.dx * q, by = sy - 50 + (f.dy) * q, ang = Math.atan2(f.dy, f.dx);
        if (q < 1) { ctx.save(); ctx.translate(bx, by); ctx.rotate(ang); cellDraw(ctx, 'vfx', Math.min(3, Math.floor(q * 4)), 0, 0, 0, 90, false, 'center'); ctx.restore(); }
        else cellDraw(ctx, 'vfx', 4 + (p > .8 ? 1 : 0), 0, x, y - 50, 100, false, 'center'); }
      else if (f.k === 'ring') cellDraw(ctx, 'vfx', col, 3, x, y - 6, 150, false, 'center');
      else if (f.k === 'circuit') cellDraw(ctx, 'vfx', col, 4, x, y, 170, false, 'center');
      else if (f.k === 'burst') cellDraw(ctx, 'vfx', col, 2, x, y, 150, false, 'center'); count('vfx_drawn'); }); }
  A.drawAttachedFx = drawAttachedFx;

  /* ------------------------------------------------ LIVING REFRACTION (V7 power name; Morrow numbers PROPOSED: 40 energy, 6 s, blast costs half) */
  function refract() { var P = M.Rider.p; if (!P || Y.lead !== 'hero' || M.Game.state !== 'play') return false; if (Y.transformT > 0) return false;
    if (Y.energy < 40) { try { M.UI.toast('MELLA ENERGY LOW', 1.4); } catch (e) { } return false; }
    Y.energy -= 40; Y.transformT = 6; count('refract'); try { M.UI.bigText('LIVING REFRACTION', 'MELLA · 6 s · BLAST COSTS HALF', '#a8ffe8', 1.4); } catch (e) { } return true; }
  A.refract = refract; Y.refract = refract;

  /* ------------------------------------------------ VILLAIN CLASH: join the v17 Clash Lab catalog */
  VILLAINS.forEach(function (v) { if (!C.catalog.some(function (x) { return x.id === v.id; })) C.catalog.push({ id: v.id, name: v.name, short: v.short, kind: v.kind, max: v.max, range: v.range, color: v.color, art: 'v_' + v.id, speed: v.speed, villain: true }); });
  var _sprite = C.sprite;
  C.sprite = function (ctx, b, x, y, size) { if (!b.villain) return _sprite.apply(this, arguments); var im = A.img[b.art]; if (!ok(im)) return false;
    var t = this.time, moving = b.mode === 'idle' && b.speed > 0 && b._lx != null && Math.hypot(b.x - b._lx, b.y - b._ly) > .2, col, row;
    b._lx = b.x; b._ly = b.y;
    if (b.mode === 'down') { col = 3; row = 1; } else if (b.hitT > 0 || b.mode === 'stagger') { col = 2; row = 1; } else if (b.mode === 'windup') { col = 0; row = 1; }
    else if (b.mode === 'strike') { col = 1; row = 1; } else if (moving) { col = 2 + (Math.floor(t * 6) % 2); row = 0; } else { col = Math.floor(t * 2) % 2; row = 0; }
    var flip = Math.cos(b.face || 0) < 0, S = size * 1.25; ctx.save(); ctx.translate(x, y); if (flip) ctx.scale(-1, 1); ctx.drawImage(im, col * 160, row * 160, 160, 160, -S / 2, -S * .97, S, S); ctx.restore();
    count('villain_drawn_' + b.id); return true; };
  var _win = C.win;
  C.win = function () { var b = this.active, r = _win.apply(this, arguments);
    if (b && b.villain) { var v = VILLAINS.find(function (q) { return q.id === b.id; }); count('villain_win_' + b.id);
      try { M.UI.bigText(v.name + ' · CONTAINED', v.outro + '  [' + v.outroSrc + ']', v.color, 2.6); } catch (e) { }
      try { if (H) H.unlock('your_morrow:villain_' + b.id); } catch (e) { } }
    return r; };
  function summonVillain(id) { var i = id ? VILLAINS.findIndex(function (q) { return q.id === id; }) : (A.villainIdx + 1) % VILLAINS.length; if (i < 0) return false;
    A.villainIdx = i; var v = VILLAINS[i]; C.enabled = true; if (!C.pick(v.id)) return false; count('villain_summon_' + v.id);
    try { C.announce(v.name + ' · ' + v.intro); M.UI.bigText(v.name, v.intro + '  [' + v.introSrc + ']', v.color, 2.2); } catch (e) { } return true; }
  A.summon = summonVillain;

  /* ------------------------------------------------ input + panel (keys freed by the disabled visitor: ' = REFRACT, . = VILLAIN) */
  window.addEventListener('keydown', function (e) { if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
    var f = { Quote: refract, Period: function () { summonVillain(); } }[e.code]; if (f) { e.preventDefault(); e.stopImmediatePropagation(); count('key_' + e.code); f(); } }, true);
  var btns = document.getElementById('ym-btns');
  if (btns) { var mk = function (id, label, title, fn) { var b = document.createElement('button'); b.id = id; b.textContent = label; b.title = title; btns.insertBefore(b, document.getElementById('ym-swap'));
      b.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); count('btn_' + id); fn(); }); b.addEventListener('touchstart', function (e) { e.stopPropagation(); }, { passive: true }); };
    mk('ym-refract', 'REFRACT', "' · Living Refraction", refract); mk('ym-villain', 'VILLAIN ▸', '. · summon the next Y.O.U.R. villain', function () { summonVillain(); });
    var ICON = { 'ym-blast': [3, 0], 'ym-calm': [4, 0], 'ym-refract': [5, 0], 'ym-nova': [2, 1] }, st = document.createElement('style');
    st.textContent = '#ym-btns .ymi{display:inline-block;width:16px;height:16px;vertical-align:-4px;margin-right:3px;background-image:url(' + BASE + 'power_icons.png);background-repeat:no-repeat;background-size:' + (7 * 16) + 'px ' + (2 * 16) + 'px}';
    document.head.appendChild(st);
    Object.keys(ICON).forEach(function (id) { var el = document.getElementById(id); if (!el) return; var i = document.createElement('span'); i.className = 'ymi'; i.setAttribute('aria-hidden', 'true');
      i.style.backgroundPosition = (-ICON[id][0] * 16) + 'px ' + (-ICON[id][1] * 16) + 'px'; el.insertBefore(i, el.firstChild); count('icon_' + id); }); }
  A.installed = true; console.log('[YOUR Morrow] art + villain layer ' + A.version + ' installed · villains ' + VILLAINS.length);
})();
