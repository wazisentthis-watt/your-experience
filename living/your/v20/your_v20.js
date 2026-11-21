/* Y.O.U.R. v2.0 · PROPOSAL_HOLD (PUBLISH HOLD) — merge layer inside a COPY of WIR Valence Life v3.
   Installed from a hook at the end of the Valence IIFE (see tools/build_v20.py). It adds, without touching Valence's model:
     · the owner hero (ChatGPT 18–27 sheet, v1.2.1 hero_sheet_96) as the player body in city, home, board ride and the Rifft skate mini-game
     · Mella (v1.2.1 sheet) following the hero; Mara, Dex and SIKEE as Savannah NPCs with the v1.2.1 LLM/offline dialogue (+ Valence bonds)
     · the Y.O.U.R. activities (Corner Store crate shift, Training Drone arena, SIKEE boss, FaFiFi skate run) run by the v1.2.1 code in
       your/game/v20_runner.html, paid through Valence payroll; Y.O.U.R. day log; story beats; sprint (B/K/Shift) and fly (F/RB)
     · ChatGPT title/cover/menu/store/sleep art; shared WIR hero profile (wir.hero/1); Y.O.U.R. phone tab with settings.
   Numbers: your_v20_config.js (PROPOSED vs V121 vs VALENCE). */
(function () {
'use strict';
var C = window.YOUR_V20_CONFIG, Y = window.YOUR, H = window.WIR_HERO;
var A = 'your/assets/';
var SRC = {
  hero: A + 'hero/hero_sheet_96.png', heroFace: A + 'hero/hero_portrait_256.png',
  mella: A + 'mella/mella_sheet_96.png', mellaFace: A + 'mella/mella_portrait.png',
  sikee: A + 'chatgpt/sikee_walk_96.png', sikeeFace: A + 'chatgpt/14_cut.png',
  mara: A + 'npc0_livingwir.png', maraFace: A + 'chatgpt/08_cut.png', dex: A + 'npc1_livingwir.png', dexFace: A + 'chatgpt/09_cut.png',
  cover: A + 'chatgpt/21_OFFICIAL_COVER.png', title: A + 'chatgpt/01_TITLE_SCREEN.png', menu: A + 'chatgpt/02_MAIN_MENU_BG.png',
  store: A + 'chatgpt/06_STORE_INTERIOR.png', drone: A + 'chatgpt/10_TRAINING_DRONE.png', rivals: A + 'chatgpt/11_ARENA_RIVALS.png',
  hub: A + 'chatgpt/12_HUB_BG.png', sleep: A + 'chatgpt/13_SLEEP_DAY_END_BG.png', boss: A + 'chatgpt/17_SIKEE_BOSS_INTRO.png'
};
var IM = {};
function img(k) { var i = IM[k]; if (!i) { i = IM[k] = new Image(); i.src = SRC[k]; } return i.complete && i.naturalWidth ? i : null; }
['hero', 'heroFace', 'mella', 'sikee', 'mara', 'dex'].forEach(img);
var SET_KEY = 'your-v20-settings';
function settings() { try { return Object.assign({ titleArt: 'cover' }, JSON.parse(localStorage.getItem(SET_KEY) || '{}')); } catch (e) { return { titleArt: 'cover' }; } }
function saveSettings(s) { try { localStorage.setItem(SET_KEY, JSON.stringify(s)); } catch (e) {} }
var INTRO = {   // verbatim Y.O.U.R. slice first lines (v1.2.1 your_npc.js DIALOG), shown the first time you meet them
  mara: "Hey {name}! Welcome to the neighborhood. Dex needs help at the Corner Store, the skate park is open, coaches run practice at the Training Facility, and the Arena has a drone that needs a lesson.",
  dex: "Need a hand. Grab the 5 crates on the floor and stock the shelf on the left. $45 for the shift."
};
var HINT_PLACE = { job: "Sahelatrix Market · Dex's Corner Store shift", skate: 'Savannah skate park · Y.O.U.R. run', football: 'Gridiron Bolt Field', arena: 'Sahelatrix Corner Gym · Arena', sleep: 'Home · sleep' };

window.YOUR_V20_INSTALL = function (X) {
  var G = X.G, M = X.M, F = X.fn, T = X.T, $ = X.$, esc = X.esc, money = X.money;
  var S = function () { return X.S; };
  var V = window.YOUR_V20 = { X: X, C: C, img: img, SRC: SRC, log: [], runner: null };
  var orig = {}; Object.keys(F).forEach(function (k) { orig[k] = F[k](); });
  function toast(m, c) { orig.toast(m, c); }
  var mv = G.your = { fly: false, flyT: 0, landT: 0, dashT: 0, sprint: false, alt: 0, lastH: 'right', keySprint: false, padSprint: false, touchSprint: false, toggles: 0 };
  var mella = V.mella = { x: 0, y: 0, dir: 'down', ph: 0, moving: false, vis: true, trail: [] };

  /* ------------------------------------------------------------ Y.O.U.R. state inside the Valence save */
  function Ys() { var s = S(); if (!s) return null; var y = s.your = s.your || {};
    y.v = 1; y.story = y.story || {}; y.rel = y.rel || {}; y.memory = y.memory || {}; y.met = y.met || {}; y.days = y.days || [];
    var d = M.day(s) + 1; if (!y.today || y.today.day !== d) { if (y.today && y.today.acts.length) { y.days.unshift(y.today); y.days.length = Math.min(y.days.length, 14); dayRecap(y.today); } y.today = { day: d, earned: 0, gross: 0, acts: [], flags: {} }; }
    return y; }
  function dayRecap(t) { toast('Y.O.U.R. Day ' + t.day + ' recap · ' + t.acts.length + ' activit' + (t.acts.length === 1 ? 'y' : 'ies') + ' · ' + money(t.earned) + ' after FICA', 'gold'); }
  V.state = Ys;
  // YOUR.llm view of the Valence save
  Y.__v20view.data = function () { var s = S(), y = Ys(); if (!s || !y) return null;
    var f = y.today.flags; return { name: s.name, day: y.today.day, energy: Math.round(100 * Math.min(s.slots.Rest == null ? 1 : s.slots.Rest, s.slots.Fuel == null ? 1 : s.slots.Fuel)),
      money: Math.round(s.money), lvl: H.get().level, flags: f, rel: y.rel, story: y.story, memory: y.memory }; };
  Y.__v20view.save = function () { orig.save(); };
  Y.__v20view.clock = function () { var s = S(); if (!s) return '12:00'; var h = M.hour(s), hh = Math.floor(h), mm = Math.floor((h - hh) * 60); return (hh < 10 ? '0' : '') + hh + ':' + (mm < 10 ? '0' : '') + mm; };

  /* ------------------------------------------------------------ hero profile sync */
  function heroSync(extra) { var s = S(), y = Ys(); if (!s || !y) return; try {
    if (s.name && s.name !== H.get().name) H.setName(s.name);
    if (extra && extra.lvl) H.syncLevel(extra.lvl, extra.xp || 0);
    H.gameData('your', { level: H.get().level, data: { day: y.today.day, money: Math.round(s.money), story: y.story, base: 'valence_v3' } });
  } catch (e) { console.warn('hero sync', e); } }
  V.heroSync = heroSync;

  /* ------------------------------------------------------------ sprites */
  var CELL = 96, DIRROW = { down: 0, up: 1, left: 2, right: 3 };
  function cell(c, im, col, row, size, flip, anchor) { c.save(); if (flip) c.scale(-1, 1); c.imageSmoothingEnabled = true;
    c.drawImage(im, col * CELL, row * CELL, CELL, CELL, -size / 2, -size * (anchor || .96), size, size); c.restore(); }
  function shadow(c, r, a) { c.fillStyle = 'rgba(0,0,0,' + (a || .3) + ')'; c.beginPath(); c.ellipse(0, 0, r, r * .4, 0, 0, 7); c.fill(); }
  function heroFrame(dir, ph, moving, ctxKind) {
    if (V.frameHook && !ctxKind) { var hk = V.frameHook(dir, ph, moving); if (hk) return hk; }   // v2.2 MELLA kit frames
    var t = performance.now() / 1000, side = dir === 'left' || dir === 'right' ? dir : mv.lastH, sr = side === 'left' ? 8 : 7, fr = side === 'left' ? 10 : 9;
    if (ctxKind === 'mg') return { col: 0, row: 6, flip: false };
    if (ctxKind === 'board') { var seq = moving ? [0, 1, 0, 6] : [0]; return { col: seq[Math.floor((ph || 0) * .35) % seq.length], row: 6, flip: side === 'left' }; }
    if (mv.fly) { if (mv.flyT < C.move.crouchT) return { col: 4, row: sr }; if (mv.flyT < C.move.takeoffT) return { col: 0, row: fr };
      if (!moving) return { col: 1, row: fr }; if (dir === 'up') return { col: 4, row: 9 }; if (dir === 'down') return { col: 5, row: 9 }; return { col: 6 + (Math.floor(t * 6) % 2), row: fr }; }
    if (mv.landT > 0) return { col: 7, row: sr };
    if (mv.sprint && moving && (dir === 'left' || dir === 'right')) { if (mv.dashT > 0) return { col: 8 + (Math.floor(t * 12) % 2), row: sr }; return { col: Math.floor((ph || 0) * .5) % 4, row: sr }; }
    var r = DIRROW[dir] || 0; if (moving) return { col: 4 + Math.floor((ph || 0) * (mv.sprint ? .8 : .55)) % 8, row: r };
    return { col: Math.floor(t * 1.6) % 4, row: r };
  }
  var stats = V.stats = {};
  function count(k) { stats[k] = (stats[k] || 0) + 1; }
  function drawYour(c, X0, Y0, L, dir, ph, moving) {
    var k = L.your, sz = C.sprite;

    if (k === 'owner') { var im = img('hero'); if (!im) return false;
      var kind = (c.canvas && c.canvas.id === 'mgcv') ? 'mg' : (c === X.cx && L.__board ? 'board' : null), f = heroFrame(dir || 'down', ph, moving, kind), lift = (kind || c !== X.cx) ? 0 : C.move.hoverPx * mv.alt + (V.jumpLift ? V.jumpLift() : 0);
      c.save(); c.translate(X0, Y0); shadow(c, lift ? 8 : 10, lift ? .18 : .3); if (lift) c.translate(0, -lift - Math.sin(performance.now() / 260) * 1.5 * mv.alt);
      cell(c, im, f.col, f.row, kind === 'mg' ? 64 : sz.hero, f.flip); c.restore(); return true; }
    if (k === 'mella') { var mi = img('mella'); if (!mi) return false; var r = DIRROW[dir] || 0, t = performance.now() / 1000;
      c.save(); c.translate(X0, Y0); shadow(c, 9); cell(c, mi, moving ? 4 + Math.floor((ph || 0) * .6) % 8 : Math.floor(t * 1.6) % 4, r, sz.mella, false); c.restore(); return true; }
    if (k === 'sikee') { var si = img('sikee'); if (!si) return false; var rr = DIRROW[dir] || 0;
      c.save(); c.translate(X0, Y0); shadow(c, 12, .35); c.drawImage(si, (moving ? Math.floor((ph || 0) * .5) % 4 : 0) * CELL, rr * CELL, CELL, CELL, -sz.sikee / 2, -sz.sikee * .97, sz.sikee, sz.sikee); c.restore(); return true; }
    if (k === 'mara' || k === 'dex') { var ni = img(k); if (!ni) return false; var b = moving ? Math.abs(Math.sin((ph || 0) * .8)) * 2 : 0;
      c.save(); c.translate(X0, Y0); shadow(c, 9); if (dir === 'left') c.scale(-1, 1); c.drawImage(ni, -sz.npc / 2, -sz.npc * .97 - b, sz.npc, sz.npc); c.restore(); return true; }
    return false;
  }
  var P = window.WIRPeople, PD = P.draw;
  P.draw = function (c, X0, Y0, L, dir, ph, moving) { if (L && L.your) { try { if (drawYour(c, X0, Y0, L, dir, ph, moving)) { count(L.your + '_' + ((c.canvas && c.canvas.id === 'mgcv') ? 'mg' : c !== X.cx ? 'other' : L.__board ? 'board' : (G.map && G.map.id === 'HOME') ? 'home' : 'city')); return; } } catch (e) { console.warn(e); } L = Object.assign({}, L); delete L.your; return PD.call(this, c, X0, Y0, L, dir, ph, moving); } return PD.apply(this, arguments); };
  V.drawYour = drawYour;

  /* ------------------------------------------------------------ player: owner body always */
  function ownerLook(L) { L = L || {}; delete L.leg; L.your = 'owner'; return L; }
  X.set('drawPlayer', function (t) {
    var s = S(); if (s) { ownerLook(s.look); }
    var ride = F.outdoors()() ? G.ride : 'walk'; if (s && s.look) s.look.__board = ride === 'board';
    var my = G.py, before = mella.vis && mella.y <= my && ride !== 'car';
    if (before) drawMella(t);
    orig.drawPlayer(t);
    if (s && s.look) delete s.look.__board;
    if (mella.vis && !before && ride !== 'car') drawMella(t);
    if (mv.fly && mv.flyT > .5 && mv.flyT < 3.5) { var cx = X.cx; cx.save(); cx.font = '700 9px JetBrains Mono, monospace'; cx.textAlign = 'center'; cx.fillStyle = 'rgba(14,12,29,.8)';
      var lbl = 'FLYING · ' + C.move.flightLabel.replace('Flight art: ', ''), w = cx.measureText(lbl).width + 10; cx.fillRect(G.px * T - w / 2, G.py * T - 86, w, 13); cx.fillStyle = '#7cf0e0'; cx.fillText(lbl, G.px * T, G.py * T - 76); cx.restore(); }
  });
  function drawMella(t) { var cx = X.cx; P.draw(cx, mella.x * T, mella.y * T + 8, { your: 'mella' }, mella.dir, mella.ph, mella.moving);
    cx.save(); cx.font = '700 9px JetBrains Mono, monospace'; cx.textAlign = 'center'; cx.fillStyle = '#000'; cx.fillText('Mella', mella.x * T + .5, mella.y * T - 47.5); cx.fillStyle = '#ff9ad5'; cx.fillText('Mella', mella.x * T, mella.y * T - 48); cx.restore(); }

  /* ------------------------------------------------------------ sprint + fly (v1.2.1 moves, PROPOSED numbers) */
  X.set('speedNow', function () { var v = orig.speedNow(); var walking = !F.outdoors()() || G.ride === 'walk';
    if (!walking) return v; if (mv.fly) return mv.flyT < C.move.crouchT ? 0 : v * C.move.fly; if (mv.sprint) return v * C.move.sprint; return v; });
  function wantSprint() { return mv.keySprint || mv.padSprint || mv.touchSprint; }
  function toggleFly(src) { var s = S(); if (!s || !$('#start').hidden || orig.paused()) return false;
    if (!mv.fly) { if (C.move.flyOutdoorsOnly && !F.outdoors()()) { toast('Fly outside. Your place has a ceiling.', 'dim'); return false; }
      if (G.ride !== 'walk') { toast('Walk first (R) to take off.', 'dim'); return false; }
      mv.fly = true; mv.flyT = 0; mv.landT = 0; } else { mv.fly = false; mv.landT = C.move.landT; }
    mv.toggles++; mv.lastSrc = src; updateTouch(); return true; }
  V.toggleFly = toggleFly;
  X.set('movePlayer', function (dt) {
    var px = G.px, py = G.py;
    mv.sprint = !mv.fly && wantSprint();
    var wasMoving = G.moving; orig.movePlayer(dt);
    if (mv.sprint && G.moving && !mv._sprinting) mv.dashT = C.move.dashT; mv._sprinting = mv.sprint && G.moving;
    mv.dashT = Math.max(0, mv.dashT - dt); mv.landT = Math.max(0, mv.landT - dt); if (mv.fly) mv.flyT += dt;
    mv.alt = mv.fly ? Math.max(0, Math.min(1, (mv.flyT - C.move.crouchT) / (C.move.takeoffT - C.move.crouchT))) : (mv.landT > 0 ? mv.landT / C.move.landT : 0);
    if (G.dir === 'left' || G.dir === 'right') mv.lastH = G.dir;
    if (Math.hypot(G.px - px, G.py - py) > 0) mv.dist = (mv.dist || 0) + Math.hypot(G.px - px, G.py - py);
    stepMella(dt); Ys();
  });
  function stepMella(dt) { var tr = mella.trail, last = tr[tr.length - 1];
    if (!last || Math.hypot(last[0] - G.px, last[1] - G.py) > .08) { tr.push([G.px, G.py]); if (tr.length > 80) tr.shift(); }
    var gap = C.mella.gap, tgt = null, acc = 0;
    for (var i = tr.length - 1; i > 0; i--) { acc += Math.hypot(tr[i][0] - tr[i - 1][0], tr[i][1] - tr[i - 1][1]); if (acc >= gap) { tgt = tr[i - 1]; break; } }
    var d0 = Math.hypot(mella.x - G.px, mella.y - G.py);
    if (d0 > C.mella.snap) { placeMella(); return; }
    mella.moving = false; if (!tgt) return;
    var dx = tgt[0] - mella.x, dy = tgt[1] - mella.y, d = Math.hypot(dx, dy); if (d < .04) return;
    var sp = Math.max(3.2, orig.speedNow() * 1.8) * dt; if (d0 > gap * 1.8) sp *= 1.6;
    var k = Math.min(1, sp / d); mella.x += dx * k; mella.y += dy * k; mella.moving = true; mella.ph += dt * 11; mella.dir = F.dirOf()(dx, dy); }
  function placeMella() { var opts = [[0, 1], [-1, 0], [1, 0], [0, -1], [-1, 1], [1, 1]];
    for (var i = 0; i < opts.length; i++) { var x = Math.floor(G.px) + opts[i][0], y = Math.floor(G.py) + opts[i][1]; if (G.map && orig.walkable(G.map, x, y)) { mella.x = x + .5; mella.y = y + .5; break; } }
    if (!mella.x) { mella.x = G.px; mella.y = G.py + .6; } mella.trail = [[mella.x, mella.y], [G.px, G.py]]; mella.dir = 'down'; }
  V.placeMella = placeMella;
  X.set('enterMap', function (id, at) { var r = orig.enterMap(id, at); if (mv.fly && id === 'HOME') { mv.fly = false; mv.alt = 0; } placeMella(); updateTouch(); return r; });
  // keys (ignored while typing or with sheets/phone open)
  function typing(e) { return e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName); }
  addEventListener('keydown', function (e) { if (typing(e) || !S() || !$('#start').hidden || G.yourAct) return; var k = (e.key || '').toLowerCase();
    if (k === 'k' || k === 'shift') mv.keySprint = true;
    if (k === 'f' && !e.repeat) { toggleFly('key'); } });
  addEventListener('keyup', function (e) { var k = (e.key || '').toLowerCase(); if (k === 'k' || k === 'shift') mv.keySprint = false; });
  addEventListener('blur', function () { mv.keySprint = false; mv.touchSprint = false; });
  // gamepad: hold B = sprint, RB = fly toggle (only in the open world: no sheet, phone or overlay)
  var padRB = false;
  X.set('pollPad', function () { if (G.yourAct) return; orig.pollPad(); try { var gp = [].slice.call(navigator.getGamepads ? navigator.getGamepads() : []).find(function (p) { return p && p.connected; });
    if (!gp) { mv.padSprint = false; return; } var free = S() && !orig.paused();
    mv.padSprint = !!(free && gp.buttons[1] && gp.buttons[1].pressed); var rb = !!(gp.buttons[5] && gp.buttons[5].pressed); if (free && rb && !padRB) toggleFly('pad'); padRB = rb; } catch (e) {} });
  // touch buttons
  var tb = document.createElement('div'); tb.id = 'yourMoves';
  tb.innerHTML = '<button type="button" id="yourSprint" aria-label="Sprint (hold)">SPRINT</button><button type="button" id="yourFly" aria-label="Fly (toggle)">FLY</button><button type="button" id="yourBtn" aria-label="Y.O.U.R. tab">Y.O.U.R.</button>';
  ($('#stage') || document.body).appendChild(tb);
  var st = document.createElement('style'); st.textContent =
    '#yourMoves{position:absolute;right:10px;bottom:64px;display:flex;flex-direction:column;gap:6px;z-index:6}#yourMoves button{font:800 11px var(--display,system-ui);letter-spacing:.05em;padding:9px 11px;border-radius:12px;border:1px solid rgba(255,255,255,.25);background:rgba(14,12,29,.78);color:#ffcf6a;touch-action:none}' +
    '#yourMoves button.on{background:#7cf0e0;color:#062}body.pad #yourMoves #yourSprint,body.pad #yourMoves #yourFly{display:none}' +
    '#yourAct{position:absolute;inset:0;z-index:30;background:#000;display:flex;flex-direction:column}#yourAct[hidden]{display:none}#yourAct iframe{flex:1;border:0;width:100%;background:#000}' +
    '#yourAct .fbbar img,#mg .fbbar img.yface,#fb .fbbar img.yface,#lab .fbbar img.yface{width:26px;height:26px;border-radius:50%;object-fit:cover;background:#1b1830;margin-right:6px}' +
    '.ydlg{display:flex;gap:10px;align-items:flex-start;margin:6px 0 10px;padding:8px;border-radius:12px;background:rgba(124,240,224,.07);border:1px solid rgba(124,240,224,.25)}.ydlg img{width:84px;height:110px;object-fit:contain;flex:none}' +
    '.ydlg .yl{font-size:14px;line-height:1.35}.ydlg .ysrc{font-size:10px;opacity:.65;margin-top:4px}.ydlg .ych{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}.ydlg .ych button{padding:7px 10px;border-radius:9px;border:1px solid #7cf0e0;background:#0f2a2a;color:#e8fffb;font-weight:700}' +
    '.ybanner{width:100%;max-height:150px;object-fit:cover;border-radius:12px;margin:4px 0 8px;display:block}' +
    '#start.ytitle{background-size:cover;background-position:center}#start.ytitle::before{content:"";position:fixed;inset:0;background:linear-gradient(180deg,rgba(6,5,14,.25),rgba(6,5,14,.82) 55%,rgba(6,5,14,.95));pointer-events:none;z-index:-1}' +
    '#start .ybrand{font:800 clamp(30px,7vw,56px) var(--display,system-ui);letter-spacing:.08em;color:#ffcf6a;text-shadow:0 3px 0 #000}#start .ysub{font-size:12px;opacity:.8;letter-spacing:.06em;margin-bottom:6px}' +
    '.yform label{display:block;margin:6px 0}.yform input,.yform select,.yform textarea{width:100%;padding:7px;border-radius:8px;border:1px solid #444;background:#0e0c1d;color:#fff;box-sizing:border-box}.yform .btnrow{display:flex;gap:6px;flex-wrap:wrap;margin-top:6px}';
  document.head.appendChild(st);
  var sb = $('#yourSprint'), fb = $('#yourFly');
  sb.addEventListener('pointerdown', function (e) { e.preventDefault(); mv.touchSprint = true; sb.classList.add('on'); });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (n) { sb.addEventListener(n, function () { mv.touchSprint = false; sb.classList.remove('on'); }); });
  fb.addEventListener('click', function () { toggleFly('touch'); });
  $('#yourBtn').addEventListener('click', function () { if (S()) orig.openPhone('your'); });
  function updateTouch() { var s = S(), show = !!s && $('#start').hidden; tb.style.display = show ? '' : 'none'; fb.classList.toggle('on', mv.fly); fb.textContent = mv.fly ? 'LAND' : 'FLY'; fb.style.display = show && F.outdoors()() ? '' : 'none'; }
  setInterval(updateTouch, 500);
  // faces on the overlay bars
  ['#mg .fbbar', '#fb .fbbar', '#lab .fbbar'].forEach(function (q) { var bar = $(q); if (bar && !bar.querySelector('.yface')) { var f = document.createElement('img'); f.className = 'yface'; f.alt = ''; f.src = SRC.heroFace; bar.insertBefore(f, bar.firstChild); } });

  /* ------------------------------------------------------------ doors need landing; Y.O.U.R. buttons + art on Valence sheets */
  X.set('openObj', function (o) {
    if (mv.fly && o && !o.decor) { toast('Land first (F) to go inside or use ' + (o.name || 'it') + '.', 'dim'); return; }
    var r = orig.openObj(o); decorateSheet(o); return r; });
  function decorateSheet(o) { var sh = $('#sheet'); if (!o || !sh || sh.hidden) return; var s = S(), h3 = sh.querySelector('h3'); if (!h3) return;
    var art = o.id === 'bed' ? 'sleep' : (s && s.city === 'SAV' && o.id === C.places.job) ? 'store' : (s && s.city === 'SAV' && o.id === C.places.arena) ? 'drone' : null;
    if (art && !sh.querySelector('.ybanner')) { var b = document.createElement('img'); b.className = 'ybanner'; b.alt = ''; b.src = SRC[art]; b.dataset.yart = art; h3.after(b); } }
  function actRow(id, label, fx, side, dis) { return orig.bigBtn('data-yourgo="' + id + '"', label, fx, side, dis, dis ? '' : 'real'); }
  X.SPECIAL.your_job = function () { var y = Ys(), done = y.today.flags.job; return actRow('job', "Dex's Corner Store shift · Y.O.U.R.", done ? '<span class="dn">Done today. Dex: "Come back tomorrow."</span>' : '<span class="up">' + C.job.crates + ' crates · ' + C.job.seconds + ' s · FaFiFi fair rules · Mella spots the shelf</span><span>$' + C.pay.job + ' gross, FICA withheld</span>', '1h', !!done || !!S().busy); };
  X.SPECIAL.your_arena = function () { var y = Ys(), s = y.story; return actRow('arena', 'Arena · Training Drone · Y.O.U.R.', '<span class="up">FaFiFi arena rules · dodge, then hit it while it recovers</span><span>$' + C.pay.arena + ' gross on a win</span>', '1h', !!S().busy) +
      actRow('boss', 'Face SIKEE · Authority Form', s.droneBeaten ? '<span class="up">Boss fight · ' + (s.sikeeDefeated ? 'rematch' : 'he is waiting') + '</span>' : '<span class="dn">Beat the Training Drone first</span>', '1h', !s.droneBeaten || !!S().busy); };
  X.SPECIAL.your_skate = function () { return actRow('skate', 'Y.O.U.R. skate park run', '<span class="up">FaFiFi skate rules · ride the revealed line · Mella calls the next ring</span><span>$' + C.pay.skate + ' gross on a complete run</span>', '1h', !!S().busy); };
  function addActs() { var m = X.MAPS.SAV; if (!m) return; [['job', 'your_job'], ['arena', 'your_arena'], ['skate', 'your_skate']].forEach(function (p) {
      var o = m.objs.find(function (b) { return b.id === C.places[p[0]]; }); if (o) { o.acts = o.acts || []; if (o.acts.indexOf(p[1]) < 0) o.acts.unshift(p[1]); } else V.log.push('no SAV building for ' + p[0]); }); }
  addActs();
  // Valence activity entries so a Y.O.U.R. activity spends Valence hours and needs (PROPOSED values in config)
  Object.keys(C.acts).forEach(function (id) { var a = C.acts[id]; M.ACTS[id] = { name: a.name, place: 'your', h: C.activityHours, gain: a.gain, drain: a.drain, xp: C.xp[id] }; });

  /* ------------------------------------------------------------ NPCs: Mara, Dex, SIKEE (+ Mella via tap/E) */
  Object.keys(C.npcs).forEach(function (id) { var n = C.npcs[id]; if (X.NPCS.some(function (q) { return q.id === id; })) return;
    X.NPCS.push({ id: id, name: n.name, el: n.name, EN: n.EN, city: 'SAV', day: n.day, eve: n.eve, col: n.col, role: n.role, your: id, look: { your: id } }); });
  X.set('npcSpot', function (n) { if (n && n.id === 'sikee') { var y = Ys(); if (!y || !y.story.sighted) return null; } return orig.npcSpot(n); });
  var MELLA = { id: 'mella', name: 'Mella', your: 'mella', el: '—', EN: 2.2, role: C.mella.label, get x() { return mella.x; }, get y() { return mella.y; }, vis: true };
  X.set('hitObj', function (wx, wy) { if (mella.vis && G.ride !== 'car' && Math.abs(mella.x - wx) < .6 && wy > mella.y - 1.5 && wy < mella.y + .5) return { npc: MELLA }; return orig.hitObj(wx, wy); });
  X.set('interactNear', function () { var s = S(); if (!s || s.busy) return orig.interactNear();
    var near = false; G.npcs.forEach(function (n) { if (n.vis && Math.hypot(n.x - G.px, n.y - G.py) < 1.6) near = true; });
    G.map.objs.forEach(function (o) { if (o.decor || !orig.furnOn(o)) return; var u = orig.useSpot(o); if (u && Math.hypot(u[0] - G.px, u[1] - G.py) < 1.6) near = true; });
    if (!near && mella.vis && G.ride !== 'car' && Math.hypot(mella.x - G.px, mella.y - G.py) < 2.4) return X.fn.openNpc()(MELLA);
    return orig.interactNear(); });
  X.set('openNpc', function (n) {
    if (!n || !n.your) return orig.openNpc(n);
    var y = Ys(); y.rel[n.your] = y.rel[n.your] || 0;
    if (n.your === 'mella' || n.your === 'sikee') {
      var extra = n.your === 'sikee' ? '<div class="sh-sub">SIKEE · Authority Form · main villain. ' + (y.story.droneBeaten ? 'The Arena (Sahelatrix Corner Gym) can open his fight.' : 'Beat the Training Drone at the Arena first.') + '</div>' :
        '<div class="sh-sub">' + esc(C.mella.label) + '. She follows you everywhere, spots the right shelf on the Corner Store shift and calls the next ring at the skate park.</div>';
      orig.openSheet('<h3>' + esc(n.name) + '</h3>' + extra + '<div class="ydlg" id="ydlg"></div>' + (n.your === 'sikee' && y.story.droneBeaten ? '<div class="acts">' + actRow('boss', 'Face SIKEE now', '<span class="up">Boss intro + fight (v1.2.1)</span>', '1h', !!S().busy) + '</div>' : ''));
    } else { orig.openNpc(n); var sh = $('#sheet'), h3 = sh.querySelector('h3'), sub0 = sh.querySelector('.sh-sub'); if (sub0) sub0.textContent = sub0.textContent.replace(' · element ' + n.el, '').replace(/EN ([\d.]+)/, 'EN $1 (PROPOSED)'); var box = document.createElement('div'); box.className = 'ydlg'; box.id = 'ydlg'; (sh.querySelector('.sh-sub') || h3).after(box); }
    talk(n.your);
  });
  var FACE = { mella: 'mellaFace', sikee: 'sikeeFace', mara: 'maraFace', dex: 'dexFace' };
  function talk(id) { var y = Ys(), s = S(), box = $('#ydlg'); if (!box) return;
    var first = !y.met[id] && INTRO[id]; y.met[id] = 1;
    box.innerHTML = '<img alt="" src="' + SRC[FACE[id]] + '"><div style="flex:1;min-width:0"><div class="yl" id="ydlgLine">' + (first ? esc(INTRO[id].replace('{name}', s.name)) : '…') + '</div><div class="ysrc" id="ydlgSrc">' + (first ? 'Y.O.U.R. line' : 'thinking…') + '</div><div class="ych" id="ydlgCh"></div></div>';
    V.lastTalk = { npc: id, pending: true };
    Y.llm.converse(id, {}).then(function (turn) { if (!$('#ydlg')) return; V.lastTalk = { npc: id, turn: turn };
      var line = $('#ydlgLine'); if (first) line.innerHTML = esc(INTRO[id].replace('{name}', s.name)) + '<br><br>' + esc(turn.line); else line.textContent = turn.line;
      $('#ydlgSrc').textContent = turn.source === 'llm' ? 'AI · ' + (turn.provider || '') : turn.source === 'offline-fallback' ? 'offline dialogue (AI unavailable: fell back)' : 'offline dialogue';
      var ch = $('#ydlgCh'); ch.innerHTML = (turn.choices || []).map(function (c, i) { return '<button type="button" data-ych="' + i + '">' + esc(c.label) + '</button>'; }).join('');
      ch.querySelectorAll('[data-ych]').forEach(function (b) { b.onclick = function () { choose(id, turn, turn.choices[+b.dataset.ych]); }; });
    }); }
  function choose(id, turn, c) { var y = Ys(), s = S(), ef = applyEffect(id, c.effect || { type: 'none' });
    Y.llm.remember(id, { d: y.today.day, line: turn.line, chose: c.label, note: ef.type === 'remember' ? ef.value : undefined }); orig.save();
    $('#ydlgCh').innerHTML = ''; $('#ydlgLine').textContent = '…'; $('#ydlgSrc').textContent = 'thinking…';
    Y.llm.converse(id, { mode: 'reply', choice: c.label, effect: ef }).then(function (r) { if (!$('#ydlg')) return; V.lastTalk = { npc: id, turn: r, chose: c.label, effect: ef };
      $('#ydlgLine').textContent = r.line; $('#ydlgSrc').textContent = r.source === 'llm' ? 'AI · ' + (r.provider || '') : 'offline dialogue'; }); }
  function applyEffect(id, ef) { var y = Ys(); ef = ef || { type: 'none' };
    switch (ef.type) {
      case 'rel_up': y.rel[id] = Math.min(10, (y.rel[id] || 0) + 1); break;
      case 'rel_down': y.rel[id] = Math.max(-5, (y.rel[id] || 0) - 1); break;
      case 'hint': y.hint = ef.value; toast('Hint: ' + (HINT_PLACE[ef.value] || ef.value), 'good'); break;
      case 'remember': break;
      case 'challenge': if (id === 'sikee' && y.story.droneBeaten) { y.story.challenge = true; toast('SIKEE accepts. Go to the Arena (Sahelatrix Corner Gym).', 'gold'); } else ef = { type: 'none' }; break;
      default: ef = { type: 'none' }; }
    return ef; }
  V.talk = talk; V.applyEffect = applyEffect; V.MELLA = MELLA;

  /* ------------------------------------------------------------ the v1.2.1 activity runner (iframe) */
  var ov = document.createElement('div'); ov.id = 'yourAct'; ov.hidden = true;
  ov.innerHTML = '<div class="fbbar"><img alt="" src="' + SRC.heroFace + '"><b id="yourActTitle">Y.O.U.R.</b><span id="yourActSub"></span><button type="button" id="yourActLeave">Leave</button></div>';
  ($('#app') || document.body).appendChild(ov);
  var TITLES = { job: "DEX'S CORNER STORE SHIFT", arena: 'ARENA · TRAINING DRONE', boss: 'ARENA · SIKEE', skate: 'Y.O.U.R. SKATE PARK' };
  function openAct(act) { var s = S(), y = Ys(); if (!s) return; if (s.busy) return toast('Busy.', 'bad');
    if (act === 'job' && y.today.flags.job) return toast('Dex: "Thanks again! Come back tomorrow."', 'dim');
    if (act === 'boss' && !y.story.droneBeaten) return toast('Beat the Training Drone first.', 'bad');
    orig.closeSheet(); orig.closePhone(); mv.fly = false; mv.alt = 0;
    var q = 'act=' + (act === 'boss' ? 'boss' : act) + '&day=' + y.today.day + '&min=' + Math.round(M.hour(s) * 60) + '&story=' + encodeURIComponent(JSON.stringify(y.story)) + (window.YOUR_V20_QA_MANUAL ? '&manual' : '');
    G.yourAct = { act: act, t0: performance.now(), results: [] };
    $('#yourActTitle').textContent = TITLES[act] || 'Y.O.U.R.'; $('#yourActSub').textContent = ' · v1.2.1 rules · Leave or finish to return';
    var f = document.createElement('iframe'); f.title = TITLES[act]; f.src = 'your/game/v20_runner.html?' + q; f.setAttribute('allow', 'gamepad; autoplay');
    var old = ov.querySelector('iframe'); if (old) old.remove(); ov.appendChild(f); ov.hidden = false; G.yourAct.frame = f;
    f.addEventListener('load', function () { try { f.focus(); f.contentWindow.focus(); } catch (e) {} });
  }
  V.openAct = openAct;
  function closeAct(msg) { var A0 = G.yourAct; if (!A0) return; G.yourAct = null; ov.hidden = true; var f = ov.querySelector('iframe'); if (f) f.remove();
    applyResults(A0, msg || {}); orig.updateUI(); orig.save(); }
  $('#yourActLeave').onclick = function () { var f = G.yourAct && G.yourAct.frame; try { f.contentWindow.postMessage({ yourV20Cmd: 'leave' }, '*'); } catch (e) {} setTimeout(function () { if (G.yourAct) closeAct({ type: 'exit', results: G.yourAct.results, left: true }); }, 400); };
  addEventListener('message', function (e) { var d = e.data; if (!d || !d.yourV20 || !G.yourAct) return;
    if (d.type === 'ready') { G.yourAct.ready = d.scene; return; }
    if (d.type === 'result') { G.yourAct.results.push(d.res); G.yourAct.story = d.story; G.yourAct.lvl = d.lvl; G.yourAct.xp = d.xp; return; }
    if (d.type === 'exit') { if (d.story) G.yourAct.story = d.story; if (d.lvl) { G.yourAct.lvl = d.lvl; G.yourAct.xp = d.xp; } closeAct(d); } });
  function applyResults(A0, msg) { var s = S(), y = Ys(), res = (A0.results.length ? A0.results : (msg.results || [])).filter(function (r) { return r && r.result !== 'refused'; });
    var st = A0.story || msg.story; if (st) ['droneBeaten', 'sikeeDefeated', 'sikeeLosses', 'sikeeWins', 'challenge'].forEach(function (k) { if (st[k] !== undefined) y.story[k] = st[k]; });
    res.forEach(function (r) { var act = r.act === 'arena' ? (r.boss ? 'boss' : 'arena') : r.act, id = 'your_' + act;
      if (M.ACTS[id]) orig.fastAct(id);
      var gross = Math.max(0, Math.round(r.paid || 0)), net = gross ? M.payroll(s, gross) : 0;
      y.today.gross += gross; y.today.earned += net; y.today.acts.push({ act: act, result: r.result, gross: gross, net: net, fair: r.fair ? r.fair.equity : null });
      if (act === 'job') y.today.flags.job = true; if (act === 'skate') y.today.flags.skate = true; if (act === 'arena' || act === 'boss') y.today.flags.combat = true;
      try { if (act === 'job' && r.result === 'done') H.unlock('your:first_shift'); if (act === 'skate' && r.result === 'complete') H.unlock('your:skate_clear');
        if (act === 'arena' && r.result === 'win') H.unlock('your:drone_beaten'); if (act === 'boss' && r.result === 'win') H.unlock('your:sikee_defeated'); } catch (e) {}
      toast(TITLES[act] + ': ' + r.result + (gross ? ' · $' + gross + ' gross → ' + money(net) + ' after FICA' : ''), gross ? 'gold' : 'dim');
      V.log.unshift({ act: act, result: r.result, gross: gross, net: net, day: y.today.day });
    });
    if (res.length && !y.story.sighted) { y.story.sighted = true; y.story.sightedDay = y.today.day; setTimeout(function () { toast('Someone is waiting by the Arena… (Sahelatrix Corner Gym)', 'gold'); }, 1200); }
    heroSync({ lvl: A0.lvl, xp: A0.xp }); }
  X.set('paused', function () { return orig.paused() || !!G.yourAct; });
  document.addEventListener('click', function (e) { var b = e.target.closest && e.target.closest('[data-yourgo]'); if (b && !b.disabled) { e.preventDefault(); openAct(b.dataset.yourgo); }
    var t = e.target.closest && e.target.closest('[data-yourtab]'); if (t) { e.preventDefault(); yourAction(t.dataset.yourtab, t); } });

  /* ------------------------------------------------------------ start screen: ChatGPT title/cover + owner body maker */
  X.set('renderStart', function () {
    var B = X.B; if (!B.look) B.look = {}; ownerLook(B.look); if (!B.name) B.name = H.get().name;
    orig.renderStart(); var st = $('#start'), set = settings();
    st.classList.add('ytitle'); st.style.backgroundImage = 'url("' + (B.step === 'mode' ? (set.titleArt === 'classic' ? SRC.title : SRC.cover) : SRC.menu) + '")'; st.dataset.yart = B.step === 'mode' ? set.titleArt : 'menu';
    var br = st.querySelector('.brand'); if (br && !st.querySelector('.ybrand')) { var d = document.createElement('div'); d.innerHTML = '<div class="ybrand">Y.O.U.R.</div><div class="ysub">v2.1 · PROPOSAL_HOLD · built on WIR Valence Life v3 · you are the hero, Mella rides with you, SIKEE (Authority Form) waits at the Arena</div>'; br.before(d); br.style.fontSize = '14px'; br.style.opacity = '.8'; }
    var mk = st.querySelector('.mk');
    if (mk) { var body = mk.querySelector('[data-body]'); if (body) body.closest('.chips').previousElementSibling.remove(), body.closest('.chips').remove();
      if (!mk.querySelector('.ybody')) { var nb = document.createElement('div'); nb.className = 'ybody sh-sub'; nb.innerHTML = '<b>Body: you, the owner hero</b> (ChatGPT 18–27 sprite sheets). Skin, hair, cloth, beard and earrings below are cosmetic: they go to the football engine\'s player card; in the city, at home and in every Y.O.U.R. activity you are always the owner hero. Name defaults to the placeholder "Hero"; change it any time in Y.O.U.R. → Settings.'; mk.insertBefore(nb, mk.firstChild); }
      var nm = $('#nm'); if (nm && !nm.value) nm.value = B.name || ''; }
  });
  X.set('newGame', function () { var B = X.B; if (!B.name || !String(B.name).trim()) B.name = H.get().name; ownerLook(B.look);
    orig.newGame(); var s = S(); ownerLook(s.look); ownerLook(s.baseLook); try { H.setName(s.name); } catch (e) {} Ys(); placeMella(); heroSync(); updateTouch(); orig.save(); });
  X.set('resume', function (sv) { orig.resume(sv); var s = S(); ownerLook(s.look); if (s.baseLook) ownerLook(s.baseLook);
    try { var hn = H.get().name; if (hn && hn !== s.name) s.name = hn; } catch (e) {} Ys(); placeMella(); heroSync(); updateTouch(); });

  /* ------------------------------------------------------------ phone: Y.O.U.R. tab + Do-tab shortcuts */
  X.TABS.unshift(['your', 'Y.O.U.R.']);
  X.set('renderPhone', function (live) {
    if (G.tab !== 'your') return orig.renderPhone(live); if (live) return;
    var keep = G.tab; G.tab = 'shell'; orig.renderPhone(false); G.tab = keep;
    $('#tabs').querySelectorAll('button').forEach(function (b) { b.classList.toggle('on', b.dataset.tab === 'your'); });
    $('#pbody').innerHTML = yourTab(); });
  function yourTab() { var s = S(), y = Ys(), h = H.get(), st = y.story, set = settings(), lv = Y.llm.settings();
    var out = '<img class="ybanner" alt="" src="' + SRC.hub + '" data-yart="hub">';
    out += '<div class="ydlg"><img alt="" src="' + SRC.heroFace + '"><div><b>' + esc(s.name) + '</b> · owner hero (' + esc(h.lookId) + ')<br>Shared WIR hero level ' + h.level + ' · ' + h.unlocks.length + ' unlocks<br><span class="dim">Sidekick: Mella · Villain: SIKEE (Authority Form)</span></div></div>';
    out += '<h4>Story</h4>' + ['sighted|SIKEE sighted by the Arena', 'droneBeaten|Training Drone beaten', 'challenge|SIKEE challenge accepted', 'sikeeDefeated|SIKEE defeated'].map(function (r) { var p = r.split('|'); return '<div class="kv"><span>' + p[1] + '</span><b>' + (st[p[0]] ? 'yes' : 'not yet') + '</b></div>'; }).join('') + (st.sikeeLosses ? '<p class="dim">Losses to SIKEE: ' + st.sikeeLosses + '</p>' : '');
    out += '<h4>Today · Y.O.U.R. Day ' + y.today.day + '</h4>' + (y.today.acts.length ? y.today.acts.map(function (a) { return '<div class="kv"><span>' + esc(TITLES[a.act] || a.act) + ' · ' + esc(a.result) + '</span><b>' + money(a.net) + '</b></div>'; }).join('') : '<p class="dim">No Y.O.U.R. activity yet today.</p>') + '<p class="dim">Gross $' + y.today.gross + ' · after FICA ' + money(y.today.earned) + ' · Valence taxes, rent and bills apply as usual.</p>';
    out += '<h4>Y.O.U.R. activities</h4><div class="acts">' + actRow('job', "Dex's Corner Store shift", 'Sahelatrix Market, Savannah · once a day', '1h', !!y.today.flags.job || !!s.busy) + actRow('arena', 'Arena · Training Drone', 'Sahelatrix Corner Gym', '1h', !!s.busy) + actRow('boss', 'Face SIKEE', st.droneBeaten ? 'Boss fight' : 'Beat the drone first', '1h', !st.droneBeaten || !!s.busy) + actRow('skate', 'Skate park run', 'Savannah skate park', '1h', !!s.busy) + '</div>';
    out += '<h4>Settings</h4><div class="yform" id="yform">' +
      '<label>Hero name (shared across WIR games)<input id="yHeroName" maxlength="16" value="' + esc(s.name) + '"></label><div class="btnrow"><button type="button" class="btn" data-yourtab="name">Save name</button><button type="button" class="btn" data-yourtab="export">Export hero</button><button type="button" class="btn" data-yourtab="import">Import hero</button></div>' +
      '<label>Hero JSON (export shows here; paste here to import)<textarea id="yHeroJson" rows="3"></textarea></label><div class="dim" id="yHeroMsg"></div>' +
      '<label>Dialogue AI provider (you pick; offline is built in)<select id="yLlmProv">' + ['offline'].concat(Object.keys(Y.llm.providers).filter(function (k) { return k !== 'mock' || lv.provider === 'mock'; })).map(function (k) { return '<option value="' + k + '"' + (k === lv.provider ? ' selected' : '') + '>' + (k === 'offline' ? 'Offline (built-in, no network)' : (Y.llm.providers[k].label || k)) + '</option>'; }).join('') + '</select></label>' +
      '<label>Base URL (optional)<input id="yLlmBase" value="' + esc(lv.baseUrl) + '" placeholder="e.g. https://api.openai.com/v1 · http://localhost:11434"></label><label>Model<input id="yLlmModel" value="' + esc(lv.model) + '"></label>' +
      '<label>API key (stays in this browser\'s localStorage only)<input id="yLlmKey" type="password" autocomplete="off" value="' + esc(lv.apiKey) + '"></label>' +
      '<div class="btnrow"><button type="button" class="btn" data-yourtab="llmsave">Save AI</button><button type="button" class="btn" data-yourtab="llmtest">Test AI</button><button type="button" class="btn" data-yourtab="llmclear">Clear key</button></div><div class="dim" id="yLlmMsg"></div>' +
      '<label>Title art<select id="yTitleArt"><option value="cover"' + (set.titleArt !== 'classic' ? ' selected' : '') + '>Official cover (ChatGPT 21)</option><option value="classic"' + (set.titleArt === 'classic' ? ' selected' : '') + '>Classic title (ChatGPT 01)</option></select></label><div class="btnrow"><button type="button" class="btn" data-yourtab="titleart">Save title art</button></div>' +
      '<p class="dim">Controls: hold K / Shift / gamepad B (or SPRINT) to sprint · F / gamepad RB (or FLY) to fly and land. ' + esc(C.move.flightLabel) + '.</p></div>';
    return out; }
  function yourAction(k) { var s = S(), msg = function (id, t) { var e = $(id); if (e) e.textContent = t; };
    if (k === 'name') { var n = String($('#yHeroName').value || '').trim().slice(0, 16); if (!n) return msg('#yHeroMsg', 'Name can\'t be empty.'); s.name = H.setName(n); heroSync(); orig.save(); msg('#yHeroMsg', 'Hero name saved: ' + s.name); orig.updateUI(); }
    else if (k === 'export') { $('#yHeroJson').value = H.export(); msg('#yHeroMsg', 'Exported (copy the JSON above).'); }
    else if (k === 'import') { var r = H.import($('#yHeroJson').value); if (r.ok) { s.name = r.profile.name.slice(0, 16); orig.save(); msg('#yHeroMsg', 'Imported hero: ' + r.profile.name); } else msg('#yHeroMsg', 'Import failed: ' + r.error); }
    else if (k === 'llmsave' || k === 'llmtest') { Y.llm.save({ provider: $('#yLlmProv').value, baseUrl: $('#yLlmBase').value, model: $('#yLlmModel').value, apiKey: $('#yLlmKey').value }); msg('#yLlmMsg', 'Saved.');
      if (k === 'llmtest') { msg('#yLlmMsg', 'Testing…'); Y.llm.test().then(function (r) { msg('#yLlmMsg', r.ok ? 'OK: provider replied within the dialogue rules.' : 'Not working: ' + (r.error || 'invalid reply') + ' (offline dialogue will be used).'); }); } }
    else if (k === 'llmclear') { Y.llm.clearKey(); $('#yLlmKey').value = ''; msg('#yLlmMsg', 'Key removed from this browser.'); }
    else if (k === 'titleart') { var st2 = settings(); st2.titleArt = $('#yTitleArt').value === 'classic' ? 'classic' : 'cover'; saveSettings(st2); msg('#yLlmMsg', 'Title art: ' + st2.titleArt); } }
  V.yourAction = yourAction;
  document.addEventListener('keydown', function (e) { if (e.target && e.target.closest && e.target.closest('#yform')) e.stopPropagation(); }, true);
  X.set('doTab', function () { var y = Ys(), s = S(); return '<h4>Y.O.U.R. · today</h4><div class="acts">' + actRow('job', "Dex's Corner Store shift", y.today.flags.job ? 'Done today' : 'Sahelatrix Market · $' + C.pay.job + ' gross', '1h', !!y.today.flags.job || !!s.busy) + actRow('arena', 'Arena · Training Drone', '$' + C.pay.arena + ' gross on a win', '1h', !!s.busy) + (y.story.droneBeaten ? actRow('boss', 'Face SIKEE', 'Authority Form', '1h', !!s.busy) : '') + '</div>' + orig.doTab(); });
  V.version = C.version; V.installed = true;
};
})();
