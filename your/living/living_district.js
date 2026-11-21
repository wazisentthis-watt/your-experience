/* Y.O.U.R. Living District in root · native district map entered from the host city · PROPOSAL (draft PR for owner review).
   Drafted by WIR Recovery for owner review. Not merged, not published.

   What this file does (no iframe, no second engine, no new localStorage key):
   - builds root map MAPS.LIV (64 × 44 tiles at T = 32) from the CCE 2.0 district geometry (your/living/vendor/cce_config.js);
   - adds a walk-in gate to the host city (YOUR_LIVING_CONFIG.hostCity, Savannah by default) and a west gate back;
   - routes both trips through PR #18's arrival checkpoint (your/integration/section_handoff.js, WIRSectionHandoff);
   - runs the vendored CCE 2.0 core (your/living/vendor/cce_core.js, unchanged) and draws its civilians, supers and traffic
     with root's people renderer and the map-art pack;
   - keeps the district state inside the root save as S.living (like S.sikee).
   Characters: the 20 civilians, the five supers (Kestrel Ray, Anvil Mae, Mendwell, Quillshot, Riotgale), Iteron, Vault Vesper and
   The Divider are PROPOSED ORIGINAL characters awaiting owner confirmation, not existing canon.
   Veyru: this file never creates, moves or commands Veyru. Root's your/v24/ KAW Living Brain stays the only brain.
   Combat: nothing here deals damage. Sikee, your/v24/ and the Nimbus module are not touched.
   Plugs in through window.WIR_WORLD_MODULES (PR #19) and the YOUR_V20_INSTALL chain (for MAPS, M and the goDo hook). */
(function (W) {
  'use strict';
  var CFG = W.YOUR_LIVING_CONFIG || {}, ART = W.YOUR_LIVING_ART, LIV = CFG.mapId || 'LIV', T = 32;
  var L = W.YOUR_LIVING = { version: 'living-root 0.1.0 (PROPOSAL)', installed: false, error: null, sim: null, simS: null, host: null, gate: null, armed: false, base: null,
    stats: { enter: 0, leave: 0, ticks: 0, steps: 0, handoffs: [], drawn: { civ: 0, super: 0, car: 0, bldg: 0 }, bakes: 0 } };
  var X = null, MAPS = null, M = null, looks = {}, lastPos = {};
  function GM() { return W.WIR_GAME; }
  function host() { return L.host; }

  /* ---------------- map from the CCE geometry (root tile codes: 0 grass, 1 wall, 2 road, 3 sidewalk, 7 plaza) */
  function buildMap(C) {
    var geo = W.CCE.buildGeo(C), w = geo.W, h = geo.H, t = new Uint8Array(w * h).fill(3), i, x, y;
    for (i = 0; i < w * h; i++) if (geo.g[i] === 0) t[i] = 2;
    function rect(x0, y0, ww, hh, v) { for (var yy = y0; yy < y0 + hh; yy++) for (var xx = x0; xx < x0 + ww; xx++) if (xx >= 0 && yy >= 0 && xx < w && yy < h && t[yy * w + xx] !== 2) t[yy * w + xx] = v; }
    rect(1, 1, 10, 8, 0); rect(14, 24, 18, 10, 7); rect(14, 36, 18, 5, 7);      // Civic Park grass, Skate Plaza, mural forecourt (same rects the v2.4 renderer uses)
    for (x = 0; x < w; x++) { t[x] = 1; t[(h - 1) * w + x] = 1; } for (y = 0; y < h; y++) { t[y * w] = 1; t[y * w + w - 1] = 1; }   // the district edge is a wall: no root road exit fires here
    var m = { id: LIV, w: w, h: h, t: t, objs: [], props: [], block: null, name: CFG.name || 'Living District', living: true };
    C.buildings.forEach(function (b) {
      m.objs.push({ id: 'liv_' + b.id, cce: b.id, name: b.name, sub: (CFG.name || 'Living District') + ' · proposed original building', x: b.r[0], y: b.r[1], w: b.r[2], h: b.r[3], decor: 1, draw: 'living' });
    });
    m.block = new Uint8Array(w * h);
    for (i = 0; i < w * h; i++) if (t[i] === 1) m.block[i] = 1;
    m.objs.forEach(function (o) { for (var yy = o.y; yy < o.y + o.h; yy++) for (var xx = o.x; xx < o.x + o.w; xx++) m.block[yy * w + xx] = 1; });
    m.spawn = CFG.entry.slice();
    m.geo = geo;
    return m;
  }
  L.buildMap = buildMap;
  function walkableAt(m, p) { var x = Math.floor(p[0]), y = Math.floor(p[1]); return !!m && x >= 0 && y >= 0 && x < m.w && y < m.h && !m.block[y * m.w + x]; }
  L.walkableAt = walkableAt;

  /* ---------------- gate in the host city */
  function findGate(m) {
    var want = (CFG.hostGates || {})[L.host];
    function free(g) { for (var y = g[1]; y < g[1] + g[3] + 2; y++) for (var x = g[0]; x < g[0] + g[2]; x++) if (!walkableAt(m, [x, y]) || m.t[y * m.w + x] === 2) return false; return true; }
    if (want && free(want)) return want.slice();
    for (var y = m.h - 6; y > 1; y--) for (var x = m.w - 5; x > 1; x--) { var g = [x, y, 3, 2]; if (free(g)) return g; }   // auto spot for a host city without an entry
    return null;
  }
  L.findGate = findGate;
  function hostSpawn() { var g = L.gate; return [g[0] + g[2] / 2, g[1] + g[3] + .7]; }
  function inRect(px, py, r) { return px >= r[0] && px < r[0] + r[2] && py >= r[1] && py < r[1] + r[3]; }

  /* ---------------- sim (vendored CCE 2.0, unchanged) */
  function simConfig(start) {
    var C = JSON.parse(JSON.stringify(W.CCE_CONFIG));
    C.clock.startDay = 1; C.clock.startMinute = start; C.clock.startWeekday = 0;   // district clock starts at the root clock (root weekday 0 = Monday)
    if (CFG.quiet) {   // first playable: civilians, supers and traffic only
      C.director.modes.quiet = { label: 'Quiet (first playable)', minorMin: [1e9, 1e9], majorMin: [1e9, 1e9], patrols: [0, 0], intensity: 0, tag: 'PROPOSED' };
      C.director.defaultMode = 'quiet'; C.director.firstMinorSec = [1e9, 1e9]; C.director.firstMajorSec = [1e9, 1e9];
      C.calendar.vesperPlan = []; C.calendar.iteronGenerationEveryDays = 1e9; C.divider.planMinute = 1e9;
    }
    return C;
  }
  L.simConfig = simConfig;
  function ensureSim() {
    var S = GM().S; if (!S) return null;
    if (L.sim && L.simS === S) return L.sim;
    var st = S.living, sim = null;
    if (st && st.v === 1 && st.sim) { try { sim = W.CCE.create({ config: simConfig(st.clockStart), save: st.sim }); } catch (e) { sim = null; } }
    if (!sim) { st = S.living = { v: 1, host: L.host, clockStart: Math.floor(S.t * 60), visits: 0, sim: null }; sim = W.CCE.create({ config: simConfig(st.clockStart), seed: 20261116 }); }
    st.sim = sim.S; L.sim = sim; L.simS = S; return sim;
  }
  L.ensureSim = ensureSim;
  function alignClock(sim, S) {   // the district keeps the v2.4 pace while you are in it, and catches up to the root clock each time you enter
    var root = S.t * 60, c = sim.clock().abs; if (root > c + 1) sim.S.t += (root - c) / sim.C.clock.gameMinPerSec;
  }

  /* ---------------- travel (PR #18 arrival checkpoint) */
  function handoff() { try { return W.WIRSectionHandoff && W.WIR_HERO ? W.WIRSectionHandoff.create(W.WIR_HERO) : null; } catch (e) { return null; } }
  function travel(toLiv) {
    var g = GM(), S = g.S, G = g.G, H = handoff(), hc = CFG.handoff, ticket = null, why = null;
    var dest = toLiv ? CFG.entry.slice() : hostSpawn(), destId = toLiv ? LIV : L.host;
    if (!walkableAt(MAPS[destId], dest)) { g.toast('The way into ' + (toLiv ? CFG.name : M.CITIES[L.host].name) + ' is blocked.', 'bad'); return false; }
    try { if (H) ticket = H.prepare({ from: toLiv ? hc.worldSection : hc.districtSection, to: toLiv ? hc.districtSection : hc.worldSection,
      exitId: toLiv ? hc.hostExitId : hc.districtEntryId, entryId: toLiv ? hc.districtEntryId : hc.hostExitId }); } catch (e) { why = String(e.message || e); }
    g.enterMap(destId, dest); L.armed = false;
    var rec = { to: destId, checkpoint: false };
    if (ticket) { try { H.confirmArrival(ticket, { arrived: true, section: ticket.to, entryId: ticket.entryId, x: G.px, y: G.py }); rec.checkpoint = true; } catch (e) { why = String(e.message || e); } }
    if (why) rec.why = why; else if (!H) rec.why = 'handoff module not loaded';
    if (S.living) S.living.lastTrip = rec; L.stats.handoffs.push(rec); if (L.stats.handoffs.length > 20) L.stats.handoffs.shift();
    g.toast(toLiv ? CFG.name + ' · a district of ' + M.CITIES[L.host].name + '.' : 'Back in ' + M.CITIES[L.host].name + '.', 'gold');
    g.save(); return true;
  }
  L.travel = travel;

  /* ---------------- drawing */
  var baked = null;
  function bake() {
    var m = MAPS[LIV], C = W.CCE_CONFIG; if (!m || typeof document === 'undefined' || !ART || !ART.ok('tileset')) return null;
    var c = document.createElement('canvas'); c.width = m.w * T; c.height = m.h * T; var x = c.getContext('2d'); x.imageSmoothingEnabled = false;
    var i, j, v;
    for (j = 0; j < m.h; j++) for (i = 0; i < m.w; i++) {
      v = m.t[j * m.w + i];
      ART.tile(x, v === 2 ? (((i * 13 + j * 7) % 11) === 0 ? 'asphalt_worn' : 'asphalt') : v === 0 ? 'grass' : v === 7 ? 'plaza' : v === 1 ? 'curb' : 'sidewalk', i * T, j * T);
      if (v === 1) { x.fillStyle = 'rgba(20,18,36,.55)'; x.fillRect(i * T, j * T, T, T); }
    }
    C.map.roadsY.forEach(function (ry) { for (var tx = 1; tx < m.w - 1; tx++) if (m.geo.g[ry * m.w + tx] === 0 && m.geo.g[(ry + 1) * m.w + tx] === 0 && !C.map.roadsX.some(function (rx) { return tx === rx || tx === rx + 1; })) ART.tile(x, 'dash_h', tx * T, (ry + 1) * T - 16); });
    C.map.roadsX.forEach(function (rx) { for (var ty = 1; ty < m.h - 1; ty++) if (!C.map.roadsY.some(function (ry) { return ty === ry || ty === ry + 1; })) ART.tile(x, 'dash_v', (rx + 1) * T - 16, ty * T); });
    C.map.roadsX.forEach(function (rx) { C.map.roadsY.forEach(function (ry) { [rx - 1, rx + 2].forEach(function (cx) { ART.tile(x, 'crosswalk', cx * T, ry * T); ART.tile(x, 'crosswalk', cx * T, (ry + 1) * T); }); }); });
    for (i = 0; i < 14; i++) ART.blitSouth(x, 'tree', (1.6 + (i * 3.7) % 9) * T, (1.5 + (i * 2.3) % 7) * T + 10, 36, 48);
    ART.blitSouth(x, 'bench', 2 * T, 2.6 * T, 28, 22); if (C.places.parkBench) ART.blitSouth(x, 'bench', C.places.parkBench[0] * T, C.places.parkBench[1] * T + 6, 28, 22);
    C.grates.forEach(function (g3) { ART.blitCenter(x, 'grate', (g3[0] + .5) * T, (g3[1] + .5) * T, T, T); });
    C.plaza.rails.forEach(function (r) { if (r[3] === 'h') ART.blitSouth(x, 'rail_long', (r[0] + r[2] / 2) * T, (r[1] + 1) * T, r[2] * T, 44); else ART.blitSouth(x, 'rail_short', (r[0] + .5) * T, (r[1] + r[2]) * T, 64, 46); });   // art keeps its aspect (no squashed strips)
    m.objs.forEach(function (o) { x.fillStyle = 'rgba(40,36,32,.28)'; x.fillRect(o.x * T + 2, o.y * T + o.h * T * .45, o.w * T - 4, o.h * T * .55); });
    L.stats.bakes++; return c;
  }
  function label(cx, s, x, y, bg) {
    cx.font = '700 9px Unbounded, Arial Black, sans-serif'; cx.textAlign = 'center'; var w = cx.measureText(s).width + 10;
    cx.fillStyle = bg || 'rgba(14,12,29,.82)'; cx.fillRect(x - w / 2, y - 11, w, 14); cx.fillStyle = '#eeeaff'; cx.fillText(s, x, y);
  }
  function lookFor(id) {
    if (looks[id]) return looks[id]; var h = 7; for (var i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 99991;
    return (looks[id] = W.WIRPeople ? W.WIRPeople.randomLook(h * 13 + 5) : {});
  }
  function facing(id, x, y) {
    var p = lastPos[id] || { x: x, y: y, dir: 'down', ph: 0, mv: false }, dx = x - p.x, dy = y - p.y, d = Math.hypot(dx, dy);
    if (d > .002) { p.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'); p.ph += d * 6; p.mv = true; } else p.mv = false;
    p.x = x; p.y = y; lastPos[id] = p; return p;
  }
  function districtDraws(t) {
    var g = GM(), cx = g.cx, G = g.G, out = [], sim = L.sim, C = W.CCE_CONFIG;
    if (!baked && ART && ART.ready) baked = bake();
    if (baked) out.push({ y: -1e6, f: function () { cx.drawImage(baked, 0, 0); } });
    MAPS[LIV].objs.forEach(function (o) {
      out.push({ y: o.y + o.h, f: function () {
        // facades stay inside their lot (+6 px), so nobody walking on the road north of a building is hidden behind its roof
        var key = ART && ART.BUILDING[o.cce]; if (o.cce === 'mural' && sim) { var p = sim.S.mural || 0; key = p >= 90 ? 'mural_wall_finished' : p >= 40 ? 'mural_wall_half' : key; }
        if (!(ART && ART.blitSouth(cx, key, (o.x + o.w / 2) * T, (o.y + o.h) * T, o.w * T, o.h * T + 6))) { cx.fillStyle = 'rgba(60,52,80,.9)'; cx.fillRect(o.x * T, o.y * T, o.w * T, o.h * T); }
        L.stats.drawn.bldg++;
        cx.font = 'bold 10px system-ui, sans-serif'; cx.textAlign = 'center'; cx.lineWidth = 3; cx.strokeStyle = 'rgba(0,0,0,.75)'; cx.fillStyle = '#fff';
        var lx = (o.x + o.w / 2) * T, ly = (o.y + o.h) * T + 12; cx.strokeText(o.name, lx, ly); cx.fillText(o.name, lx, ly);
      } });
    });
    out.push({ y: 29.5, f: function () { if (ART) ART.blitSouth(cx, 'fountain', 23 * T, 29.5 * T, 40, 48); } });
    C.plaza.ramps.forEach(function (r) { out.push({ y: r[1] + r[3], f: function () { if (ART) ART.blitSouth(cx, 'skate_ramp', (r[0] + r[2] / 2) * T, (r[1] + r[3]) * T, r[2] * T, r[3] * T * 1.4); } }); });
    C.map.roadsX.forEach(function (rx) { C.map.roadsY.forEach(function (ry) { var nx = rx + 1, ny = ry + 1;
      out.push({ y: ny - 1.3, f: function () { if (ART) ART.blitSouth(cx, 'traffic_light', nx * T - 26, ny * T - 10, 18, 36); } });
      out.push({ y: ny + 1.3, f: function () { if (ART) ART.blitSouth(cx, 'traffic_light', nx * T + 26, ny * T + 42, 18, 36); } }); }); });
    var wg = CFG.westGate; out.push({ y: wg[1], f: function () { var near = Math.hypot(G.px - wg[0], G.py - wg[1]) < 3.2;
      if (ART) ART.blitSouth(cx, near ? 'gate_open' : 'gate_idle', wg[0] * T + 14, wg[1] * T + 10, 56, 72); label(cx, '← ' + M.CITIES[L.host].name.toUpperCase(), wg[0] * T + 22, wg[1] * T - 62, 'rgba(31,111,176,.9)'); } });
    if (!sim) return out;
    sim.S.vehicles.forEach(function (v) { out.push({ y: v.y + .3, f: function () { if (!(ART && ART.drawVehicle(cx, v, v.x * T, v.y * T, T))) { cx.fillStyle = v.color || '#ccc'; cx.fillRect(v.x * T - 14, v.y * T - 9, 28, 18); } L.stats.drawn.car++; } }); });
    sim.S.civs.forEach(function (c) { if (c.inside) return; var p = facing(c.id, c.x, c.y);
      out.push({ y: c.y + .2, f: function () {
        if (W.WIRPeople) W.WIRPeople.draw(cx, c.x * T, c.y * T + 8, lookFor(c.id), p.dir, p.ph, p.mv); L.stats.drawn.civ++;
        if (Math.hypot(c.x - G.px, c.y - G.py) < 2.4) { cx.font = '700 7px JetBrains Mono, monospace'; cx.textAlign = 'center'; var w = cx.measureText(c.name).width + 6; cx.fillStyle = 'rgba(14,12,29,.85)'; cx.fillRect(c.x * T - w / 2, c.y * T - 40, w, 10); cx.fillStyle = '#eeeaff'; cx.fillText(c.name, c.x * T, c.y * T - 32); }
      } }); });
    sim.S.supers.forEach(function (s) { var d = sim.sdef(s.id);
      out.push({ y: s.y + .2, f: function () {
        if (!(ART && ART.drawSuper(cx, s.id, s.state === 'injured', s.x * T, s.y * T + 8))) { cx.fillStyle = d.color; cx.beginPath(); cx.arc(s.x * T, s.y * T - 8, 9, 0, 7); cx.fill(); }
        L.stats.drawn.super++;
        cx.font = '700 7px JetBrains Mono, monospace'; cx.textAlign = 'center'; var w = cx.measureText(d.codename).width + 6; cx.fillStyle = 'rgba(14,12,29,.85)'; cx.fillRect(s.x * T - w / 2, s.y * T - 50, w, 10); cx.fillStyle = d.color; cx.fillText(d.codename, s.x * T, s.y * T - 42);
      } }); });
    return out;
  }
  function hostDraws() {
    var g = GM(), cx = g.cx, G = g.G, gt = L.gate; if (!gt) return [];
    return [{ y: gt[1] + gt[3], f: function () {
      var near = Math.hypot(G.px - (gt[0] + gt[2] / 2), G.py - (gt[1] + gt[3])) < 3.2, x = (gt[0] + gt[2] / 2) * T, y = (gt[1] + gt[3]) * T;
      if (ART) for (var i = 0; i < gt[2]; i++) for (var j = 0; j < gt[3] + 1; j++) ART.tile(cx, 'plaza', (gt[0] + i) * T, (gt[1] + j) * T);
      if (!(ART && ART.blitSouth(cx, near ? 'gate_open' : 'gate_idle', x, y + 6, 70, 90))) { cx.strokeStyle = '#7cf0e0'; cx.lineWidth = 3; cx.strokeRect(gt[0] * T, gt[1] * T, gt[2] * T, gt[3] * T); }
      label(cx, (CFG.name || 'Living District').toUpperCase() + ' →', x, gt[1] * T - 34, 'rgba(31,111,176,.9)');
    } }];
  }

  /* ---------------- install (YOUR_V20_INSTALL chain: MAPS, M and the goDo hook) */
  function install(x) {
    X = x; MAPS = x.MAPS; M = x.M;
    if (!W.CCE || !W.CCE_CONFIG) throw new Error('CCE core not loaded');
    L.host = CFG.hostCity; if (!MAPS[L.host] || L.host === 'HOME') throw new Error('host city ' + L.host + ' has no map');
    MAPS[LIV] = buildMap(W.CCE_CONFIG);
    // The district reuses its host's city record under a non-enumerable key, so root HUD lines that read M.CITIES[G.map.id] work,
    // while city lists, rides, treasuries and the "all five cities" goal still see exactly the five cities.
    Object.defineProperty(M.CITIES, LIV, { value: Object.assign({}, M.CITIES[L.host], { name: (CFG.name || 'Living District') + ' · ' + M.CITIES[L.host].name }), enumerable: false, configurable: true });
    var hm = MAPS[L.host]; L.gate = findGate(hm);
    if (!L.gate) throw new Error('no free gate spot in ' + L.host);
    hm.objs.push({ id: 'living_gate', name: CFG.name || 'Living District', sub: 'Walk in to enter the district', x: L.gate[0], y: L.gate[1], w: L.gate[2], h: L.gate[3], walk: 1, decor: 1, draw: 'living_gate' });
    var goDo = x.fn.goDo();   // phone shortcuts from inside the district: walk back out to the host city first, then do the thing
    x.set('goDo', function (city, bid, then) { var G = GM().G; if (G && G.map && G.map.id === LIV && !GM().S.busy) travel(false); return goDo(city, bid, then); });
    L.base = CFG.art || 'your/living/assets/'; if (ART) ART.load(L.base).then(function () { baked = null; });
    L.installed = true;
  }
  L.install = install;
  var inst = W.YOUR_V20_INSTALL;
  W.YOUR_V20_INSTALL = function (x) { if (inst) inst(x); try { install(x); } catch (e) { L.error = String(e && e.message || e); console.warn('YOUR living district install', e); } };

  /* ---------------- world-module slot (PR #19) */
  var mod = {
    id: 'living-district',
    enterMap: function (id) {
      if (!L.installed) return; var g = GM(), S = g.S, G = g.G;
      if (id === LIV) {
        S.city = L.host;                                    // root's city stays the host city (rides, jobs and the model read S.city)
        if (S.visited && S.visited[LIV]) delete S.visited[LIV];
        G.cars = []; G.peds = [];                           // the district's own traffic and people come from the sim
        var sim = ensureSim(); if (sim) { alignClock(sim, S); S.living.visits = (S.living.visits || 0) + 1; }
        L.stats.enter++;
      } else if (L.inside) L.stats.leave++;
      L.inside = id === LIV; L.armed = false;
    },
    tick: function (dt) {
      if (!L.installed) return; var g = GM(), S = g.S, G = g.G; if (!S || !G || !G.map) return;
      if (L.simS && L.simS !== S) { L.sim = null; L.simS = null; }   // a different life was loaded
      var paused = X && X.fn.paused()(); if (paused) return;
      L.stats.ticks++;
      if (G.map.id === LIV) {
        var sim = ensureSim(); if (sim) { sim.S.player.x = G.px; sim.S.player.y = G.py; L.stats.steps += sim.tick(dt); }
        var inExit = inRect(G.px, G.py, CFG.exitZone);
        if (!inExit) L.armed = true; else if (L.armed && !S.busy) travel(false);
      } else if (G.map.id === L.host && L.gate) {
        var gz = [L.gate[0], L.gate[1], L.gate[2], L.gate[3] - .1], inGate = inRect(G.px, G.py, gz);
        if (!inGate) L.armed = true; else if (L.armed && !S.busy) travel(true);
      }
    },
    drawList: function (m, t) { if (!L.installed) return []; if (m.id === LIV) return districtDraws(t); if (m.id === L.host) return hostDraws(); return []; },
    blocking: function () { return false; },
    wreckSlow: function () { return 1; }
  };
  L.module = mod;
  (W.WIR_WORLD_MODULES = W.WIR_WORLD_MODULES || []).push(mod);
})(typeof window !== 'undefined' ? window : globalThis);
