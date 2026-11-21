/* Y.O.U.R. · player power runtime (U2: the power creator). PROPOSAL_HOLD (PUBLISH HOLD).
   Owner (21 Nov 2026 4:09 PM ET): "Custom powers ARE allowed in raids and boss fights (balance them with sane caps/validation, so no infinite damage)."
   Installs after your_powers.js (wraps window.YOUR_V20_INSTALL). Additive: the MELLA V7 kit, its keys, pad and HUD are unchanged.
   - Your powers live in the root save as S.powers = { v:1, mine:[wir.power/1 records], slots:[id|null, id|null] } (no new storage key).
     Every record is re-validated on load; one that no longer passes is kept (never deleted) but switched off.
   - Two custom slots: keys 4 and 5, and two ★ buttons on the MELLA touch pad. Pad buttons: none yet (all are taken; owner/maintainer pick).
   - Casting spends the record's energy / stamina / stability, starts its cooldown and plays existing hero frames (hit / cast / calm).
   - DAMAGE ONLY THROUGH NIMBUS: for each target, YOUR_V23.nimbus(base lane, foe) rolls the hit, × the record's scale (0.3–1.25), capped at
     WIR_POWER_SCHEMA.CAPS.hitCap, then YOUR_V23.damage(...) applies it (shields, stun, isolation and rewards stay v2.3's).
   - Bosses keep their lessons (PROPOSED mirror of v2.3): BALLAST only takes ROOT / CORE ground powers between shifts; GLASSJAW only cracks from
     ROOT / CORE ground powers under him (torsion). Direct powers bounce off both.
   - Effects art = frames of the existing mella_vfx_96.webp sheet (no drawn shapes). */
(function () {
  'use strict';
  var SC = window.WIR_POWER_SCHEMA, R = window.YOUR_POWERS;
  var RT = window.YOUR_POWER_RUNTIME = { version: 'u2', installed: false, stats: {}, fx: [], shots: [], cd: {}, clock: 0, log: [] };
  function count(k, n) { RT.stats[k] = (RT.stats[k] || 0) + (n || 1); }
  function hyp(a, b) { return Math.sqrt(a * a + b * b); }
  function angDiff(a, b) { var d = b - a; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d; }
  var inst = window.YOUR_V20_INSTALL;
  window.YOUR_V20_INSTALL = function (X) { inst(X); try { install(X); } catch (e) { console.warn('YOUR power runtime install', e); RT.error = String(e && e.stack || e); } };

  function install(X) {
    var G = X.G, F = X.fn, $ = X.$, esc = X.esc, T = X.T, S = function () { return X.S; };
    var V22 = window.YOUR_V22, V23 = window.YOUR_V23, C23 = window.YOUR_V23_CONFIG, MC = window.YOUR_V22_CONFIG.mella;
    if (!R || !R.installed) throw new Error('power registry missing');
    if (!V22 || !V23 || !V23.nimbus || !V23.damage) throw new Error('v2.2 / v2.3 missing');
    var P = V22.P, PX = 1 / C23.scale.metalTilePx, CAP = SC.CAPS;
    function layer() { return !S() || !$('#start').hidden || G.sheet || G.phone || G.yourAct || G.fb || G.lab || (X.MG && X.MG.cur) || F.paused()(); }
    function onFoot() { return !F.outdoors()() || G.ride === 'walk'; }
    function dvec() { var d = G.dir; return d === 'left' ? [-1, 0] : d === 'right' ? [1, 0] : d === 'up' ? [0, -1] : [0, 1]; }
    function toast(m, c) { try { F.toast()(m, c); } catch (e) {} }
    function say(x, y, s, col) { V23.fx.push({ x: x, y: y, s: s, col: col || '#ffd27a', life: 1.2 }); if (V23.fx.length > 24) V23.fx.shift(); }

    /* ---------------- save: S.powers */
    function st() { var s = S(); if (!s) return null; if (!s.powers || s.powers.v !== 1 || !Array.isArray(s.powers.mine)) s.powers = { v: 1, mine: [], slots: [null, null] };
      if (!Array.isArray(s.powers.slots) || s.powers.slots.length !== 2) s.powers.slots = [null, null]; return s.powers; }
    RT.state = st;
    function load() { var p = st(); if (!p) return; RT.off = {};
      R.list('user').forEach(function (r) { R.unregister(r.id); });
      p.mine.forEach(function (rec) { var v = R.register(rec, { tier: 'user', replace: true }); if (!v.ok) { RT.off[rec && rec.id] = v.errors; count('load_off'); } });
      p.slots = p.slots.map(function (id) { return id && R.get(id) ? id : null; }); RT.cd = {}; RT.shots = []; RT.fx = []; refreshPad(); }
    RT.load = load;
    function save() { try { F.save()(); } catch (e) {} }
    /* save(record) → validation result. Ids are unique per save; at most CAPS.saved powers. */
    RT.saveMine = function (rec) {
      var p = st(); if (!p) return { ok: false, errors: ['start a game first'] };
      var v = SC.validate(rec, { tier: 'user' }); if (!v.ok) return v;
      var i = p.mine.findIndex(function (r) { return r.id === rec.id; });
      if (i < 0 && p.mine.length >= CAP.saved) return { ok: false, errors: ['you can keep ' + CAP.saved + ' powers: delete one first'], budget: v.budget };
      var copy = JSON.parse(JSON.stringify(rec)); if (i < 0) p.mine.push(copy); else p.mine[i] = copy;
      R.register(copy, { tier: 'user', replace: true }); delete (RT.off || {})[rec.id]; count('saved'); save(); refreshPad(); return v; };
    RT.remove = function (id) { var p = st(); if (!p) return false; var n = p.mine.length; p.mine = p.mine.filter(function (r) { return r.id !== id; });
      p.slots = p.slots.map(function (s) { return s === id ? null : s; }); R.unregister(id); save(); refreshPad(); return p.mine.length < n; };
    RT.equip = function (slot, id) { var p = st(); if (!p || (slot !== 0 && slot !== 1)) return false; if (id && (!R.get(id) || R.get(id).tier === 'core')) return false;
      p.slots[slot] = id || null; if (id && p.slots[1 - slot] === id) p.slots[1 - slot] = null; save(); refreshPad(); return true; };
    RT.slots = function () { var p = st(); return p ? p.slots.slice() : [null, null]; };

    /* ---------------- targets */
    function foes() { return V23.foes.filter(function (m) { return m.st !== 'down' && m.st !== 'wake'; }); }
    function mr(m) { return (m.D && m.D.r ? m.D.r : 16) * PX; }
    function inZone(t, x, y, r, dv, c) {               // is a body at (x,y) with radius r inside the target shape?
      var dx = x - G.px, dy = y - G.py, d = hyp(dx, dy);
      if (t.shape === 'front_arc') return d <= t.range + r && (d < .6 || Math.abs(angDiff(Math.atan2(dv[1], dv[0]), Math.atan2(dy, dx))) <= t.arc / 2);
      if (t.shape === 'circle') return d <= t.radius + r;
      if (t.shape === 'line') { var along = dx * dv[0] + dy * dv[1], perp = Math.abs(dx * dv[1] - dy * dv[0]); return along >= -r && along <= t.range + r && perp <= t.width / 2 + r; }
      if (t.shape === 'cell') return hyp(x - c[0], y - c[1]) <= t.radius + r;
      return false; }
    function hitList(p, dv, c) { var t = p.target; return foes().filter(function (m) { return inZone(t, m.x, m.y, mr(m), dv, c); })
      .sort(function (a, b) { return hyp(a.x - G.px, a.y - G.py) - hyp(b.x - G.px, b.y - G.py); }).slice(0, t.maxTargets || 1); }
    function eff(p, ty) { return p.effects.find(function (x) { return x.type === ty; }) || null; }
    function shortName(p) { return p.name.toUpperCase().slice(0, 16); }
    /* one foe: Nimbus roll × scale (capped) → v2.3 damage; then knockback / pull / stun on the foe's existing fields */
    function land(p, m, dv, i, ox, oy) {
      var d = eff(p, 'damage'), kb = eff(p, 'knockback'), pl = eff(p, 'pull'), sn = eff(p, 'stun'), ux = m.x - ox, uy = m.y - oy, ul = hyp(ux, uy) || 1;
      ux /= ul; uy /= ul; var kx = 0, ky = 0;
      if (kb) { kx += ux * kb.tiles; ky += uy * kb.tiles; } if (pl) { kx -= ux * pl.tiles; ky -= uy * pl.tiles; }
      var hit = false;
      if (d) { var o = V23.nimbus(p.base, m.kind, dv, i > 0), n = Math.min(CAP.hitCap, Math.max(0, o.dmg * d.scale)); hit = V23.damage(m, n, kx, ky, 'power', shortName(p));
        RT.lastHit = { id: p.id, foe: m.kind, nimbus: o.dmg, scale: d.scale, dmg: +n.toFixed(2), landed: hit }; count('hits'); }
      else if (kb || pl || sn) { m.vx += kx; m.vy += ky; hit = true; }
      if (sn && m.st !== 'down') { m.stun = Math.max(m.stun || 0, sn.seconds); m.st = 'stun'; }
      return hit; }
    /* bosses keep their lessons (mirror of v2.3 bossCell / torsion) */
    function bossTry(p, dv, c) {
      var B = V23.boss; if (!B || B.done || B.intro > 0) return; var t = p.target, inside = t.shape === 'projectile' ? false : inZone(t, B.x, B.y, .9, dv, c); if (!inside) return;
      var ground = (p.base === 'root' || p.base === 'core') && (t.shape === 'cell' || t.shape === 'circle'), d = eff(p, 'damage');
      if (!ground || !d) { say(B.x, B.y - 2.4, B.id === 'ballast' ? 'CAN’T MOVE HIM' : 'TINK — direct hits fail', '#cfe6ff'); count('boss_bounce'); return; }
      if (B.id === 'ballast' && (B.st === 'braced' || B.st === 'tele')) { say(B.x, B.y - 2.4, 'SNAP — HE’S BRACED', '#ffb38a'); count('boss_braced'); return; }
      var o = V23.nimbus(p.base, B.id, dv, B.id !== 'ballast'), raw = B.id === 'glassjaw' ? (B.def.torsionDmg || 0) : o.dmg, amt = Math.min(CAP.hitCap, raw * d.scale);
      B.stab = Math.max(0, B.stab - amt); B.hitT = .35; say(B.x, B.y - 2.4, shortName(p) + ' −' + Math.round(amt), '#ffd27a'); count('boss_dmg');
      RT.lastBoss = { id: p.id, boss: B.id, dmg: +amt.toFixed(2) }; }
    /* hero-side effects */
    function selfFx(p, dv) {
      var H = V23.hero, x;
      if ((x = eff(p, 'shield'))) H.inv = Math.max(H.inv, x.seconds);
      if ((x = eff(p, 'heal_self')) && H.hp < H.max && H.ko <= 0) H.hp = Math.min(H.max, H.hp + x.hp);
      if ((x = eff(p, 'energy_self'))) P.energy = Math.min(MC.energy.max, P.energy + x.amount);
      if ((x = eff(p, 'bond_kaw')) && V22.bondUp) V22.bondUp(x.amount, 'power');
      if ((x = eff(p, 'move'))) { P.dashT = x.tiles / (MC.dash.impulsePx * V22.tpp); P.dashDir = dv; } }
    function vfx(p, x, y, life, rot, size) { var v = p.visual || {}; if (v.sheet !== 'hero.vfx') return;
      RT.fx.push({ x: x, y: y, row: v.row, frames: v.frames, t: 0, life: life, rot: rot || 0, size: size || 64, tint: v.tint || null }); if (RT.fx.length > 30) RT.fx.shift(); }
    var ANIM = { hit: 'hit', cast_down: 'blast', cast_up: 'blast' };

    /* ---------------- cast(id) → true when the power went off */
    RT.cast = function (id, src) {
      var p = R.get(id); if (!p || p.tier === 'core') return false;
      if (layer() || !onFoot()) return false;
      if (V23.hero.ko > 0) { count('ko_block'); return false; }
      var L = p.limits || {}; if ((L.inRaid === false && V23.raid) || (L.inBoss === false && V23.boss) || (L.inCity === false && !V23.raid && !V23.boss)) { say(G.px, G.py - 1.6, 'NOT HERE', '#cfe6ff'); return false; }
      var left = (RT.cd[id] || 0) - RT.clock; if (left > 0) { say(G.px, G.py - 1.6, 'COOLING · ' + left.toFixed(1) + ' s', '#cfe6ff'); count('cooling'); return false; }
      var c = p.cost || {};
      if ((c.energy || 0) > P.energy) { say(G.px, G.py - 1.6, MC.text.lowEnergy, '#cfe6ff'); return false; }
      if ((c.stamina || 0) > P.stamina) { say(G.px, G.py - 1.6, 'NOT ENOUGH STAMINA', '#cfe6ff'); return false; }
      if ((c.stability || 0) > P.stab) { say(G.px, G.py - 1.6, MC.text.lowStab, '#cfe6ff'); return false; }
      P.energy -= c.energy || 0; P.stamina -= c.stamina || 0; P.stab = Math.max(0, P.stab - (c.stability || 0)); RT.cd[id] = RT.clock + p.cooldown;
      var a = ANIM[p.cast.anim]; if (a) { P.act = a; P.actT = p.cast.time; P.actDur = p.cast.time; } else if (p.cast.anim === 'calm') V22.calmFx = 1;
      var dv = dvec(), t = p.target, cpos = [G.px + dv[0] * (t.range || 0), G.py + dv[1] * (t.range || 0)], n = 0;
      if (t.shape === 'projectile') { RT.shots.push({ id: id, x: G.px + dv[0] * .5, y: G.py + dv[1] * .5, vx: dv[0] * t.speed, vy: dv[1] * t.speed, r: t.radius, life: t.life, left: t.maxTargets || 1, hit: [] }); }
      else if (t.shape !== 'self') { var ox = t.shape === 'cell' ? cpos[0] : G.px, oy = t.shape === 'cell' ? cpos[1] : G.py;
        hitList(p, dv, cpos).forEach(function (m, i) { if (land(p, m, dv, i, ox, oy)) n++; }); bossTry(p, dv, cpos);
        var fx = t.shape === 'cell' ? [cpos[0], cpos[1], Math.min(3, t.life), 0, t.radius * 2 * T] : t.shape === 'circle' ? [G.px, G.py, .6, 0, t.radius * 2 * T] : [G.px + dv[0] * (t.range || 1) / 2, G.py + dv[1] * (t.range || 1) / 2, .45, Math.atan2(dv[1], dv[0]), (t.range || 1) * T];
        vfx(p, fx[0], fx[1], fx[2], fx[3], fx[4]); }
      else vfx(p, G.px, G.py, .6, 0, 64);
      selfFx(p, dv);
      count('cast'); count('cast_' + (src || 'key')); RT.last = { id: id, src: src || 'key', targets: n, at: RT.clock }; return true; };
    RT.castSlot = function (i, src) { var s = RT.slots()[i]; if (!s) { toast('Custom slot ' + (i + 1) + ' is empty: make a power in the Power Forge (phone · Y.O.U.R.).', 'dim'); return false; } return RT.cast(s, src); };

    /* ---------------- tick + draw (world module slot) */
    function tick(dt) {
      RT.clock += dt;
      RT.shots.forEach(function (s) { if (s.life <= 0) return; s.life -= dt; s.x += s.vx * dt; s.y += s.vy * dt; var p = R.get(s.id); if (!p) { s.life = 0; return; }
        var dv = [Math.sign(s.vx), Math.sign(s.vy)];
        foes().forEach(function (m) { if (s.life <= 0 || s.hit.indexOf(m) >= 0) return; if (hyp(m.x - s.x, m.y - s.y) < s.r + mr(m)) { s.hit.push(m); land(p, m, dv, s.hit.length - 1, s.x - dv[0], s.y - dv[1]); vfx(p, s.x, s.y, .3, 0, 56); if (--s.left <= 0) s.life = 0; } });
        var B = V23.boss; if (s.life > 0 && B && !B.done && B.intro <= 0 && hyp(B.x - s.x, B.y - s.y) < .9) { s.life = 0; say(B.x, B.y - 2.4, B.id === 'ballast' ? 'CAN’T MOVE HIM' : 'TINK — direct hits fail', '#cfe6ff'); }
        if (G.map && !F.walkable()(G.map, s.x, s.y)) s.life = 0; });
      RT.shots = RT.shots.filter(function (s) { return s.life > 0; });
      RT.fx.forEach(function (f) { f.t += dt; }); RT.fx = RT.fx.filter(function (f) { return f.t < f.life; });
    }
    var HUE0 = 168;   // the sheet's own teal; a tint only rotates hue (no new art)
    function hueOf(hex) { var r = parseInt(hex.substr(1, 2), 16) / 255, g = parseInt(hex.substr(3, 2), 16) / 255, b = parseInt(hex.substr(5, 2), 16) / 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn, h = 0;
      if (!d) return HUE0; if (mx === r) h = ((g - b) / d) % 6; else if (mx === g) h = (b - r) / d + 2; else h = (r - g) / d + 4; return (h * 60 + 360) % 360; }
    function sprite(cx, f, x, y, w, rot) { var A = window.YOUR_HERO_ART, sh = A && A.sheets && A.sheets.vfx; if (!sh || !sh.img || !A.ready.vfx) return false;
      var col = f.frames[Math.min(f.frames.length - 1, Math.floor(f.t * 12) % f.frames.length)];
      cx.save(); cx.translate(x, y); if (rot) cx.rotate(rot); if (f.tint) cx.filter = 'hue-rotate(' + Math.round(hueOf(f.tint) - HUE0) + 'deg)';
      cx.globalAlpha *= Math.max(0, Math.min(1, (f.life - f.t) * 3)); cx.drawImage(sh.img, col * sh.cell, f.row * sh.cell, sh.cell, sh.cell, -w / 2, -w / 2, w, w); cx.restore(); count('vfx'); return true; }
    function drawList() { var out = [], cx = X.cx || (window.WIR_GAME && WIR_GAME.cx);
      RT.fx.forEach(function (f) { out.push({ y: f.y + .5, f: function () { sprite(cx, f, f.x * T, f.y * T - 16, f.size, f.rot); } }); });
      RT.shots.forEach(function (s) { var p = R.get(s.id); if (!p || !p.visual || p.visual.sheet !== 'hero.vfx') return; var f = { frames: p.visual.frames, row: p.visual.row, t: RT.clock, life: 9, tint: p.visual.tint };
        out.push({ y: s.y + .5, f: function () { sprite(cx, f, s.x * T, s.y * T - 24, Math.max(28, s.r * 2 * T + 24), Math.atan2(s.vy, s.vx)); } }); });
      return out; }
    window.WIR_WORLD_MODULES = Array.isArray(window.WIR_WORLD_MODULES) ? window.WIR_WORLD_MODULES : [];
    window.WIR_WORLD_MODULES.push({ id: 'your-powers', tick: tick, drawList: drawList, enterMap: function () { RT.shots = []; RT.fx = []; } });

    /* ---------------- input: keys 4 / 5, two ★ buttons on the MELLA pad (icons from power_icons_96.webp) */
    addEventListener('keydown', function (e) { if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return; if (e.repeat) return;
      var k = e.key; if ((k === '4' || k === '5') && !layer()) { RT.castSlot(k === '4' ? 0 : 1, 'key'); e.preventDefault(); } });
    var pad = $('#yourPowers'), SZ = 20, ICONS = 'your/assets/hero/power_art/power_icons_96.webp', btns = [];
    if (pad) [0, 1].forEach(function (i) { var b = document.createElement('button'); b.type = 'button'; b.className = 'yourSlot'; b.dataset.slot = String(i); b.setAttribute('aria-label', 'custom power ' + (i + 1)); pad.appendChild(b); btns.push(b);
      b.addEventListener('pointerdown', function (e) { e.preventDefault(); e.stopPropagation(); RT.castSlot(i, 'touch'); }); });
    var css = document.createElement('style'); css.textContent = '#yourPowers .yourSlot{color:#ffe59a}#yourPowers .yourSlot .ic{display:inline-block;width:' + SZ + 'px;height:' + SZ + 'px;margin:-6px 4px -6px -2px;vertical-align:middle;background:url(' + ICONS + ') 0 0/' + (7 * SZ) + 'px ' + (2 * SZ) + 'px no-repeat}#yourPowers .yourSlot.cd{opacity:.55}';
    document.head.appendChild(css);
    function refreshPad() { var sl = RT.slots(); btns.forEach(function (b, i) { var p = sl[i] && R.get(sl[i]), ic = p && p.visual && p.visual.icon ? p.visual.icon : [2, 1], left = p ? (RT.cd[p.id] || 0) - RT.clock : 0;
      b.innerHTML = '<span class="ic" style="background-position:-' + ic[0] * SZ + 'px -' + ic[1] * SZ + 'px"></span>' + esc(p ? p.name.toUpperCase().slice(0, 9) : '★' + (i + 4)) + (left > 0 ? ' ' + left.toFixed(1) : '');
      b.classList.toggle('cd', left > 0); }); }
    RT.refreshPad = refreshPad; setInterval(refreshPad, 200);

    var _ng = F.newGame(); X.set('newGame', function () { _ng(); load(); });
    var _re = F.resume(); X.set('resume', function (sv) { _re(sv); load(); });
    if (S()) load();
    RT.installed = true;
  }
})();
