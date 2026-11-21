/* Y.O.U.R. controls · SteelSeries Nimbus-safe gamepad layer. PROPOSAL_HOLD (PUBLISH HOLD).
   Owner (pt97u): "I'm playing on my Steel Series Nimbus controller no r3 make sure button functions map well and non over lap".
   How it works (additive, no older file is edited):
     - wraps navigator.getGamepads once. Every older reader (index.html pollPad / overlayPad / mgPad / labTick, v20, v22)
       keeps reading the pad as before, but gets a remapped "virtual" pad for the current context:
       world · menu · fight · lab · football · minigame · activity (see controls_map.js).
     - nothing needs R3 (11), Home (16) or Back (8). Transform moved R3 → R1, fly R1 → L3 (or L1 + B).
     - L1 is a hold modifier in the world: L1 + X = ★4, L1 + Y = ★5, L1 + B = fly, L1 + Menu = Do tab, L1 + A = controller map.
       Any button pressed while L1 is held never fires its plain action, and a button still held when a menu opens or closes
       is ignored until you let go (no double fires across a context switch).
     - SIKEE street fight gets real pad controls and nothing else leaks in (no phone, powers, rides or interact mid-fight).
     - pads without the "standard" mapping: a one-time "Set up buttons" screen (press each button when asked) saved in the
       root save as S.controls (no new storage key). Until then the raw order is used as-is and a toast says so.
     - football frame: L3 also sends R3 (its "ask for a play"); hold Menu 1.2 s = Leave (the Nimbus has no Back).
   Legends: the MELLA box rows, the powers list, the ★ slot line, SIKEE fight buttons, and a Controller map sheet. Text only. */
(function () {
  'use strict';
  var MAP = window.YOUR_CONTROLS_MAP;
  var C = window.YOUR_CONTROLS = { version: 1, installed: false, ctx: 'menu', stats: { frames: 0, chords: {}, fight: {}, ctxSwitch: 0, setupSaved: 0, frameWrapped: 0 }, needsSetup: null };
  var inst = window.YOUR_V20_INSTALL;
  window.YOUR_V20_INSTALL = function (X) { inst(X); try { install(X); } catch (e) { console.warn('YOUR controls install', e); C.error = String(e && e.stack || e); } };

  var N = 17;
  function blank() { var b = []; for (var i = 0; i < N; i++) b.push({ pressed: false, touched: false, value: 0 }); return b; }
  function btnOf(gp, i) { var b = gp && gp.buttons && gp.buttons[i]; if (!b) return { pressed: false, touched: false, value: 0 }; if (typeof b === 'number') return { pressed: b > .5, touched: b > .5, value: b }; return { pressed: !!b.pressed, touched: !!(b.touched || b.pressed), value: +b.value || (b.pressed ? 1 : 0) }; }

  function install(X) {
    var G = X.G, F = X.fn, $ = X.$, esc = X.esc;
    if (!MAP) throw new Error('controls map missing');
    var nav = navigator; if (!nav.getGamepads) { C.installed = true; C.noApi = true; return; }
    var rawGet = nav.getGamepads.bind(nav);
    C.rawPads = function () { try { return [].slice.call(rawGet() || []); } catch (e) { return []; } };
    function S() { return X.S; }
    function toast(t, k) { try { F.toast()(t, k || 'dim'); } catch (e) {} }

    /* ---------------- non-standard pads: saved button profile */
    function profiles() { var s = S(); return s && s.controls && s.controls.v === 1 && s.controls.profiles ? s.controls.profiles : {}; }
    function normalize(gp) {
      var out = { id: gp.id, index: gp.index, connected: true, mapping: 'standard', timestamp: gp.timestamp || 0, axes: [].slice.call(gp.axes || []), buttons: blank(), _your: true };
      if (gp.mapping === 'standard') { for (var i = 0; i < N; i++) out.buttons[i] = btnOf(gp, i); return out; }
      var pr = profiles()[gp.id];
      if (!pr || !pr.map) { if (C.needsSetup !== gp.id) { C.needsSetup = gp.id; toast('Controller layout not recognised. Phone · Y.O.U.R. · Controller · Set up buttons (or L1 + A).', 'dim'); } for (var j = 0; j < N; j++) out.buttons[j] = btnOf(gp, j); out.mapping = gp.mapping || ''; return out; }
      Object.keys(pr.map).forEach(function (k) { var m = pr.map[k], on = false, v = 0;
        if (m && m.b != null) { var b = btnOf(gp, m.b); on = b.pressed; v = b.value; }
        else if (m && m.a != null) { var a = (gp.axes || [])[m.a]; on = typeof a === 'number' && Math.abs(a - m.v) < .15; v = on ? 1 : 0; }
        out.buttons[+k] = { pressed: on, touched: on, value: v }; });
      return out;
    }

    /* ---------------- context */
    function context() {
      if (C.setup) return 'setup';
      var s = S(); if (!s || !$('#start').hidden) return 'menu';
      if (G.yourAct) return 'activity'; if (G.lab) return 'lab'; if (G.fb) return 'football'; if (X.MG && X.MG.cur) return 'minigame';
      if (G.phone || G.sheet) return 'menu';
      if (window.SIKEE && SIKEE.fighting && SIKEE.fighting()) return 'fight';
      return 'world';
    }
    C.context = context;
    var TABLE = {}; ['world', 'menu', 'lab'].forEach(function (c) { TABLE[c] = MAP.table(c); });
    var WORLD = MAP.CONTEXTS.world.actions, FIGHT = MAP.CONTEXTS.fight.actions;
    var prev = [], latch = {}, chordOn = {}, hold = { t: 0, fired: false }, lastT = -1, cache = null, cacheRaw = null;

    function doCall(name) {
      var RT = window.YOUR_POWER_RUNTIME;
      if (name === 'slot0' || name === 'slot1') { if (RT && RT.castSlot) RT.castSlot(name === 'slot0' ? 0 : 1, 'pad'); }
      else if (name === 'help') openHelp();
      else if (name === 'fbLeave') { var b = $('#fbLeave'); if (b) b.click(); }
      else if (name.indexOf('sk') === 0) { var id = name === 'skMella' ? 'skMella2' : name, el = document.getElementById(id) || (name === 'skMella' ? document.getElementById('skMellaBtn') : null); if (el && !el.disabled) el.click(); }
      C.stats.chords[name] = (C.stats.chords[name] || 0) + 1;
    }

    function step(raw) {
      var gp = raw.find(function (p) { return p && p.connected; });
      if (!gp) { prev = []; latch = {}; chordOn = {}; return raw; }
      var P = normalize(gp), phys = P.buttons.map(function (b) { return b.pressed; }), ctx = context();
      if (ctx !== C.ctx) { C.stats.ctxSwitch++; for (var i = 0; i < N; i++) if (phys[i]) latch[i] = true; chordOn = {}; hold = { t: 0, fired: false }; C.ctx = ctx; }
      for (var k = 0; k < N; k++) if (!phys[k]) { latch[k] = false; chordOn[k] = false; }
      var edge = function (b) { return phys[b] && !prev[b] && !latch[b]; };
      var out = blank();
      var pass = function (from, to) { if (phys[from] && !latch[from]) out[to] = P.buttons[from]; };
      if (ctx === 'world') {
        if (phys[MAP.MOD]) {
          WORLD.forEach(function (a) { if (!a.chord) return; var b = a.chord[1]; if (edge(b)) { chordOn[b] = a; if (a.call) doCall(a.call); else C.stats.chords[a.id] = (C.stats.chords[a.id] || 0) + 1; } });
          for (var m = 0; m < N; m++) if (m !== MAP.MOD && phys[m]) latch[m] = true;   // nothing pressed under L1 fires its plain action
        }
        Object.keys(chordOn).forEach(function (b) { var a = chordOn[b]; if (a && phys[b] && a.legacy != null) out[a.legacy] = { pressed: true, touched: true, value: 1 }; });
        var t = TABLE.world; Object.keys(t).forEach(function (b) { pass(+b, t[b]); });
      } else if (ctx === 'menu') { var tm = TABLE.menu; Object.keys(tm).forEach(function (b) { pass(+b, tm[b]); }); }
      else if (ctx === 'fight') { FIGHT.forEach(function (a) { if (edge(a.btn)) { doCall(a.call); C.stats.fight[a.id] = (C.stats.fight[a.id] || 0) + 1; } }); fightLegend(); }
      else if (ctx === 'lab') { for (var l = 0; l < N; l++) if (l !== 8 && l !== 9) pass(l, l); if ((phys[9] || phys[8]) && !latch[9] && !latch[8]) out[8] = { pressed: true, touched: true, value: 1 }; }
      else if (ctx === 'football') {
        for (var f = 0; f < N; f++) if (f !== 8 && f !== 9) pass(f, f);       // Back tap / Menu tap stay inside the football engine
        var h = (phys[9] && !latch[9]) || (phys[8] && !latch[8]);
        if (h) { if (!hold.t) hold.t = performance.now(); if (!hold.fired && performance.now() - hold.t > 1200) { hold.fired = true; doCall('fbLeave'); } } else hold = { t: 0, fired: false };
        wrapFrame();
      } else if (ctx === 'minigame' || ctx === 'activity') { for (var g = 0; g < N; g++) pass(g, g); }
      // 'setup': everything blank while the setup screen listens
      prev = phys; C.stats.frames++;
      var V = { id: P.id, index: P.index, connected: true, mapping: 'standard', timestamp: P.timestamp, axes: P.axes, buttons: out, _your: true };
      if (ctx === 'setup') V.axes = P.axes.map(function () { return 0; });
      C.last = { ctx: ctx, phys: phys.map(function (x, i) { return x ? i : -1; }).filter(function (i) { return i >= 0; }), out: out.map(function (b, i) { return b.pressed ? i : -1; }).filter(function (i) { return i >= 0; }) };
      return raw.map(function (p) { return p === gp ? V : p; });
    }
    nav.getGamepads = function () {
      var raw = C.rawPads(), now = performance.now();
      if (cache && now - lastT < 4 && raw.length === cacheRaw) return cache.slice();   // one step per frame, every reader sees the same pad
      lastT = now; cacheRaw = raw.length; cache = step(raw); return cache.slice();
    };
    C.reset = function () { prev = []; latch = {}; chordOn = {}; cache = null; };

    /* ---------------- football frame: L3 doubles as R3 ("ask for a play"); standard-ises a non-standard pad */
    function wrapFrame() {
      var fr = X.FB && X.FB.frame, w; try { w = fr && fr.contentWindow; } catch (e) { return; }
      if (!w || w.__yourPad || !w.navigator || !w.navigator.getGamepads) return;
      try { if (!/football\.html/.test(w.location.href) || w.document.readyState === 'loading') return; } catch (e) { return; }
      var g = w.navigator.getGamepads.bind(w.navigator);
      w.navigator.getGamepads = function () { var l = [].slice.call(g() || []); return l.map(function (p) { if (!p || !p.connected) return p; var v = normalize(p), b = v.buttons; if (b[10].pressed && !b[11].pressed) b[11] = b[10]; return v; }); };
      w.__yourPad = true; C.stats.frameWrapped++;
    }

    /* ---------------- legends */
    var ROWS = { 'Jump': 'jump', 'Dash': 'dash', 'Hit': 'hit', 'Blast': 'blast', 'Calm Veyru': 'calm', 'Transform': 'transform', 'ROOT': 'root', 'CORE': 'core', 'CROWN': 'crown' };
    function fixLegends() {
      var box = $('#v22mella'); if (box && !box.dataset.pad) { box.dataset.pad = '1';
        box.querySelectorAll('.kv').forEach(function (r) { var s = r.querySelector('span'), b = r.querySelector('b'); if (!s || !b || !ROWS[s.textContent]) return; var key = b.textContent.split(' · pad ')[0]; b.textContent = key + ' · pad ' + MAP.padFor('world', ROWS[s.textContent]); });
        var p = document.createElement('p'); p.className = 'dim'; p.id = 'yourPadLegend'; p.textContent = 'Controller (Nimbus-safe, no R3): L1 + X ★4 · L1 + Y ★5 · L1 + B or L3 fly · D-pad ↓ next ride · L1 + Menu Do tab · L1 + A controller map.'; box.appendChild(p); }
      var list = $('#yourPowerList'); if (list && !list.dataset.pad) { list.dataset.pad = '1'; var R = window.YOUR_POWERS;
        list.querySelectorAll('.pw[data-power]').forEach(function (row) { var p = R && R.get(row.dataset.power), k = row.querySelector('.k'); if (!p || !k) return; var e = String(p.engine || '').split(':')[1]; var pad = e ? MAP.padFor('world', e) : ''; if (pad) k.textContent = k.textContent + ' · ' + pad; }); }
      var sl = $('#yourSlotsTxt'); if (sl && sl.textContent.indexOf('L1 + X') < 0) sl.textContent = sl.textContent + ' · pad: ★4 L1 + X, ★5 L1 + Y';
      var pb = $('#pbody'); if (pb && list && !$('#yourPadBtn')) { var d = document.createElement('div'); d.className = 'acts'; d.innerHTML = '<button type="button" class="btn" id="yourPadBtn">Controller map</button><button type="button" class="btn" id="yourPadSetup">Set up buttons</button>'; list.appendChild(d); $('#yourPadBtn').onclick = openHelp; $('#yourPadSetup').onclick = openSetup; }
      try { var MC = window.YOUR_V22_CONFIG && window.YOUR_V22_CONFIG.mella; if (MC) MC.padNote = 'Nimbus-safe pad (your/controls): A interact, B dash/sprint, X hit, Y jump, R1 transform, R2 blast, L2 calm Veyru, D-pad ← ROOT, ↑ CORE, → CROWN, ↓ next ride, L3 fly, Menu phone; L1 + X ★4, L1 + Y ★5, L1 + B fly, L1 + Menu Do tab. No R3 / Home / Back needed.'; } catch (e) {}
    }
    var FB_LBL = { skStrike: 'X', skDodge: 'B', skBlast: 'R2', skMella2: 'L2', skRun: 'Y' };
    function fightLegend() { Object.keys(FB_LBL).forEach(function (id) { var el = document.getElementById(id); if (el && !el.dataset.pad) el.dataset.pad = FB_LBL[id]; }); }
    var css = document.createElement('style'); css.id = 'yourControlsCss';
    css.textContent = 'body.pad .sk-btns button[data-pad]::after{content:attr(data-pad);display:block;font:700 9px JetBrains Mono,monospace;color:#7cf0e0}' +
      '#sheet .pad-map{width:100%;border-collapse:collapse;font-size:12px}#sheet .pad-map td{padding:3px 4px;border-bottom:1px solid rgba(124,240,224,.12)}#sheet .pad-map td:last-child{text-align:right;font:700 11px JetBrains Mono,monospace;color:#7cf0e0}' +
      '#sheet .pad-setup b.big{display:block;font-size:22px;margin:10px 0;color:#7cf0e0}';
    document.head.appendChild(css);
    var _rp = F.renderPhone(); X.set('renderPhone', function (live) { _rp(live); if (G.tab !== 'your' || live) return; try { fixLegends(); } catch (e) { console.warn('controls legend', e); } });

    /* ---------------- controller map sheet (text only) */
    function padInfo() { var gp = C.rawPads().find(function (p) { return p && p.connected; }); if (!gp) return 'No controller seen yet: press any button.'; var pr = profiles()[gp.id];
      return 'Connected: ' + gp.id + ' · mapping "' + (gp.mapping || 'none') + '"' + (gp.mapping === 'standard' ? ' (standard: works as-is)' : pr ? ' · your saved button setup is used' : ' · not standard: press "Set up buttons"'); }
    function openHelp() {
      var order = ['world', 'menu', 'fight', 'football', 'lab', 'minigame', 'activity'];
      var html = '<h3>Controller map · Nimbus-safe</h3><p class="dim">No R3, Home or Back needed. Hold L1 for the ★ powers and extras; while L1 is held, the other button never does its normal job.</p><p class="dim" id="yourPadInfo"></p>' +
        order.map(function (c) { var K = MAP.CONTEXTS[c]; return '<h4>' + esc(K.title) + '</h4>' + (K.actions.length ? '<table class="pad-map">' + MAP.legend(c).map(function (r) { return '<tr><td>' + esc(r.label) + '</td><td>' + esc(r.pad) + '</td></tr>'; }).join('') + '</table>' : '') + '<p class="dim">' + esc(K.stick) + '</p>'; }).join('') +
        '<div class="acts"><button type="button" class="btn" id="yourPadSetup2">Set up buttons</button></div>';
      if (G.phone) F.closePhone()();
      F.openSheet()(html, function (sh) { sh.querySelector('#yourPadInfo').textContent = padInfo(); sh.querySelector('#yourPadSetup2').onclick = openSetup; });
      C.stats.help = (C.stats.help || 0) + 1;
    }
    C.openHelp = openHelp;

    /* ---------------- "Set up buttons": press each button when asked (for pads without the standard mapping) */
    function openSetup() {
      var seq = MAP.SETUP.slice(), map = {}, idx = 0, base = null, wait = true, gpId = null, raf = 0;
      if (G.phone) F.closePhone()();
      F.openSheet()('<div class="pad-setup"><h3>Set up buttons</h3><p class="dim">Press the button shown. Optional ones: press A to skip. Nothing else happens while this is open.</p><b class="big" id="padAsk"></b><p class="dim" id="padGot"></p><div class="acts"><button type="button" class="btn" id="padCancel">Cancel</button></div></div>', function (sh) {
        sh.querySelector('#padCancel').onclick = function () { stop(); F.closeSheet()(); }; });
      C.setup = true; C.reset();
      function ask() { var a = $('#padAsk'); if (a) a.textContent = idx < seq.length ? 'Press ' + MAP.label(seq[idx]) + (MAP.OPTIONAL.indexOf(seq[idx]) >= 0 ? ' (or A to skip)' : '') : 'Saved'; }
      function stop() { C.setup = false; cancelAnimationFrame(raf); C.reset(); }
      function finish() { var s = S(); if (s && gpId) { s.controls = s.controls && s.controls.v === 1 ? s.controls : { v: 1, profiles: {} }; s.controls.profiles[gpId] = { map: map, at: new Date().toISOString() }; try { F.save()(); } catch (e) {} C.stats.setupSaved++; C.needsSetup = null; toast('Controller set up. L1 + A shows the map.', 'gold'); }
        stop(); setTimeout(function () { if (G.sheet) F.closeSheet()(); }, 400); }
      function loop() {
        if (!C.setup || !G.sheet) { stop(); return; }
        var gp = C.rawPads().find(function (p) { return p && p.connected; }); if (!gp) { raf = requestAnimationFrame(loop); return; } gpId = gp.id;
        var bs = (gp.buttons || []).map(function (b, i) { return btnOf(gp, i).pressed; }), ax = [].slice.call(gp.axes || []);
        var any = bs.some(Boolean) || (base && ax.some(function (v, i) { return Math.abs(v - base[i]) > .5; }));
        if (wait) { if (!any) { wait = false; base = ax; } raf = requestAnimationFrame(loop); return; }
        var hit = null; bs.forEach(function (on, i) { if (on && hit == null) hit = { b: i }; });
        if (hit == null) ax.forEach(function (v, i) { if (hit == null && Math.abs(v - base[i]) > .5 && i > 1) hit = { a: i, v: Math.round(v * 100) / 100 }; });
        if (hit) { var want = seq[idx];
          if (MAP.OPTIONAL.indexOf(want) >= 0 && map[0] && hit.b === map[0].b) { /* skipped */ } else map[want] = hit;
          var got = $('#padGot'); if (got) got.textContent = Object.keys(map).length + ' set'; idx++; wait = true;
          if (idx >= seq.length) { ask(); finish(); return; } ask(); }
        raf = requestAnimationFrame(loop);
      }
      ask(); raf = requestAnimationFrame(loop);
    }
    C.openSetup = openSetup;
    C.installed = true;
  }
})();
