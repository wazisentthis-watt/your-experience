/* Y.O.U.R. v2.4-living · CCE 2.0 core: World Director + Character AI + Villain AI + Incident AI + City AI + Persistent World State
   PROPOSAL_HOLD (PUBLISH HOLD). Owner spec t83u. Pure + deterministic: all randomness comes from a seeded mulberry32 stored in the save,
   the sim advances in fixed steps, and nothing here reads wall-clock time, Math.random, the DOM or storage.
   Browser: window.CCE  ·  Node: require('./cce_core.js'). Positions are in tiles (1 tile = 32 px).
   Built by concatenating your/v24/src/core_*.js (tools/build_v24.py). */
(function (root, factory) {
  var CFG = (typeof module === 'object' && module.exports) ? require('./cce_config.js') : root.CCE_CONFIG;
  var API = factory(CFG);
  if (typeof module === 'object' && module.exports) module.exports = API; else root.CCE = API;
}(typeof self !== 'undefined' ? self : this, function (CFG) {
'use strict';
var VERSION = 'cce-core 0.1.0 (v2.4-living)';
function clone(o) { return JSON.parse(JSON.stringify(o)); }
function hyp(x, y) { return Math.sqrt(x * x + y * y); }
function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
function D(a, b) { return hyp(a.x - b.x, a.y - b.y); }

/* =============================================================== Brain: utility action selection (shared by civilians, supers and
   — later — the KAW Living Brain). An agent is any object; an action is {id, score(agent, ctx) -> number}.
   Brain.decide returns the best action with every score, applying a commitment bonus to the current action (hysteresis).
   KAW plug-in contract (proposal): put needs on agent.needs (0..1, 1 = satisfied), keep agent.action / agent.mem, pass its own action list. */
var Brain = {
  decide: function (agent, actions, ctx, commitBonus) {
    var best = null, bestS = -1e9, scores = {};
    for (var i = 0; i < actions.length; i++) { var a = actions[i], s = a.score(agent, ctx); if (agent.action === a.id) s += (commitBonus == null ? .15 : commitBonus); scores[a.id] = +s.toFixed(3); if (s > bestS) { bestS = s; best = a; } }
    return { action: best, score: bestS, scores: scores };
  },
  decayNeeds: function (needs, rates, minutes) { for (var k in rates) if (needs[k] != null) needs[k] = clamp(needs[k] - rates[k] * minutes, 0, 1); },
  remember: function (agent, m, cap) { agent.mem.push(m); if (agent.mem.length > (cap || 12)) agent.mem.shift(); }
};

/* =============================================================== static district geometry (derived from config, never saved) */
function buildGeo(C) {
  var W = C.map.W, H = C.map.H, g = new Uint8Array(W * H), bid = new Int16Array(W * H).fill(-1);
  function isRoadX(x) { return C.map.roadsX.some(function (r) { return x === r || x === r + 1; }); }
  function isRoadY(y) { return C.map.roadsY.some(function (r) { return y === r || y === r + 1; }); }
  for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) g[y * W + x] = (isRoadX(x) || isRoadY(y)) ? 0 : 1;   // 0 road, 1 open, 2 building
  C.buildings.forEach(function (b, i) { for (var yy = b.r[1]; yy < b.r[1] + b.r[3]; yy++) for (var xx = b.r[0]; xx < b.r[0] + b.r[2]; xx++) { g[yy * W + xx] = 2; bid[yy * W + xx] = i; } });
  var xs = C.map.roadsX.map(function (r) { return r + 1; }), ys = C.map.roadsY.map(function (r) { return r + 1; });
  var nodes = [], idx = {};
  function add(id, x, y, edge) { idx[id] = nodes.length; nodes.push({ id: id, x: x, y: y, edge: edge || null, nb: [] }); }
  xs.forEach(function (x, i) { ys.forEach(function (y, j) { add('i' + i + j, x, y); }); });
  ys.forEach(function (y, j) { add('W' + j, 0, y, 'W'); add('E' + j, W, y, 'E'); });
  xs.forEach(function (x, i) { add('N' + i, x, 0, 'N'); add('S' + i, x, H, 'S'); });
  function link(a, b) { nodes[idx[a]].nb.push(idx[b]); nodes[idx[b]].nb.push(idx[a]); }
  xs.forEach(function (x, i) { ys.forEach(function (y, j) { if (i + 1 < xs.length) link('i' + i + j, 'i' + (i + 1) + j); if (j + 1 < ys.length) link('i' + i + j, 'i' + i + (j + 1)); }); });
  ys.forEach(function (y, j) { link('W' + j, 'i0' + j); link('E' + j, 'i' + (xs.length - 1) + j); });
  xs.forEach(function (x, i) { link('N' + i, 'i' + i + '0'); link('S' + i, 'i' + i + (ys.length - 1)); });
  var bmap = {}; C.buildings.forEach(function (b, i) { bmap[b.id] = b; b._i = i; });
  var bx = [0, 14, 34, 54], by = [0, 12, 24, 36];
  function zoneAt(x, y) { var i = 0, j = 0; for (var k = 0; k < 4; k++) { if (x >= bx[k]) i = k; if (y >= by[k]) j = k; } return C.zoneGrid[j][i]; }
  return { W: W, H: H, g: g, bid: bid, nodes: nodes, idx: idx, xs: xs, ys: ys, bmap: bmap, zoneAt: zoneAt };
}

/* =============================================================== A* on the tile grid (pedestrians prefer sidewalks) */
function makePather(G) {
  var cache = {}, cacheN = 0;
  function walk(x, y) { return x >= 0 && y >= 0 && x < G.W && y < G.H && G.g[y * G.W + x] !== 2; }
  function find(sx, sy, tx, ty) {
    sx = clamp(Math.floor(sx), 0, G.W - 1); sy = clamp(Math.floor(sy), 0, G.H - 1); tx = clamp(Math.floor(tx), 0, G.W - 1); ty = clamp(Math.floor(ty), 0, G.H - 1);
    var key = sx + ',' + sy + '>' + tx + ',' + ty; if (cache[key]) return cache[key];
    if (!walk(tx, ty)) { var nt = nearestWalk(tx, ty); tx = nt[0]; ty = nt[1]; }
    var W = G.W, N = W * G.H, gs = new Float32Array(N).fill(1e9), from = new Int32Array(N).fill(-1), closed = new Uint8Array(N), heap = [];
    function push(i, f) { heap.push([f, i]); var c = heap.length - 1; while (c > 0) { var p = (c - 1) >> 1; if (heap[p][0] <= heap[c][0]) break; var t = heap[p]; heap[p] = heap[c]; heap[c] = t; c = p; } }
    function pop() { var top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; var c = 0; for (;;) { var l = 2 * c + 1, r = l + 1, m = c; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === c) break; var t = heap[m]; heap[m] = heap[c]; heap[c] = t; c = m; } } return top; }
    var s = sy * W + sx, goal = ty * W + tx; gs[s] = 0; push(s, 0); var found = false, steps = 0;
    while (heap.length && steps++ < 6000) { var cur = pop()[1]; if (closed[cur]) continue; closed[cur] = 1; if (cur === goal) { found = true; break; }
      var cx = cur % W, cy = (cur / W) | 0, dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
      for (var d = 0; d < 4; d++) { var nx = cx + dirs[d][0], ny = cy + dirs[d][1]; if (!walk(nx, ny)) continue; var ni = ny * W + nx; if (closed[ni]) continue;
        var cost = G.g[ni] === 0 ? 2.2 : 1, ng = gs[cur] + cost; if (ng < gs[ni]) { gs[ni] = ng; from[ni] = cur; push(ni, ng + Math.abs(nx - tx) + Math.abs(ny - ty)); } } }
    var path = []; if (found) { for (var c2 = goal; c2 !== -1 && c2 !== s; c2 = from[c2]) path.push([c2 % W + .5, ((c2 / W) | 0) + .5]); path.reverse(); }
    if (cacheN > 3000) { cache = {}; cacheN = 0; } cache[key] = path; cacheN++; return path;
  }
  function nearestWalk(x, y) { for (var r = 0; r < 8; r++) for (var dy = -r; dy <= r; dy++) for (var dx = -r; dx <= r; dx++) if (walk(x + dx, y + dy)) return [x + dx, y + dy]; return [x, y]; }
  return { find: find, walk: walk, nearestWalk: nearestWalk };
}

/* =============================================================== create a simulation */
function create(opts) {
  opts = opts || {};
  var C = opts.config || CFG, G = buildGeo(C), P = makePather(G), listeners = [];
  var S = opts.save ? migrate(clone(opts.save)) : fresh(opts.seed == null ? 20261116 : opts.seed);
  var sim = { S: S, C: C, G: G, version: VERSION };

  /* ---------------- rng (mulberry32, state in the save) */
  function rnd() { var t = (S.rng = (S.rng + 0x6D2B79F5) | 0); t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
  function rr(a, b) { return a + (b - a) * rnd(); }
  function ri(a, b) { return Math.floor(rr(a, b + 1)); }
  function pick(arr) { return arr[Math.floor(rnd() * arr.length)]; }
  function wpick(w) { var tot = 0, k; for (k in w) tot += Math.max(0, w[k]); if (tot <= 0) return null; var x = rnd() * tot; for (k in w) { if (w[k] <= 0) continue; x -= w[k]; if (x <= 0) return k; } return null; }
  function nid(p) { S.nextId++; return p + S.nextId; }
  function emit(type, data) { listeners.forEach(function (f) { try { f(type, data); } catch (e) {} }); }
  sim.on = function (f) { listeners.push(f); };

  function fresh(seed) {
    var s = { schema: C.saveSchema, version: C.version, seed: seed >>> 0, rng: seed >>> 0, t: 0, nextId: 0, saveId: 'L' + (seed >>> 0).toString(36),
      player: { x: C.playerStart[0], y: C.playerStart[1], dir: 'down', mode: 'walk', hp: C.hero.hp, inv: 0, ko: 0, z: 0, vx: 0, vy: 0 },
      civs: [], supers: [], robots: [], vehicles: [], items: [], incidents: [], history: [], feed: [], outbox: [], roadClosures: [],
      zones: {}, buildings: {}, director: null, iteron: null, vesper: null, cal: { lastDay: C.clock.startDay, genDone: {}, vesperDone: {} },
      heat: {}, discovered: {}, skate: { best: 0, total: 0 }, mural: 0, research: 0, labRevealed: false, stats: { spawns: 0, minSpawnDist: 1e9, injured: 0, incidents: 0 },
      spawnLog: [], uses: {} };
    Object.keys(C.zones).forEach(function (z) { s.zones[z] = { infrastructure: 100, confidence: 65, crime: 20, damage: 0, economy: 70, security: 0, faction: { city: 100, iteron: 0, vesper: 0 }, closures: 0 }; s.heat[z] = 0; });
    C.buildings.forEach(function (b) { s.buildings[b.id] = { dmg: 0, closed: false }; });
    return s;
  }
  function migrate(s) { if (!s || s.schema !== C.saveSchema) throw new Error('unknown save schema'); return s; }

  /* ---------------- clock */
  function absMin() { return (C.clock.startDay - 1) * 1440 + C.clock.startMinute + S.t * C.clock.gameMinPerSec; }
  function clock() { var A = absMin(), day = Math.floor(A / 1440) + 1, m = A - (day - 1) * 1440, h = Math.floor(m / 60), mm = Math.floor(m % 60), h12 = ((h + 11) % 12) + 1;
    return { day: day, minute: m, hour: h, weekday: C.clock.weekdays[(C.clock.startWeekday + day - 1) % 7], hhmm: h12 + ':' + (mm < 10 ? '0' : '') + mm + ' ' + (h < 12 ? 'AM' : 'PM'), abs: A }; }
  sim.clock = clock;
  function stamp() { var c = clock(); return c.weekday.slice(0, 3) + ' ' + c.hhmm; }
  function feed(text, kind) { var f = { t: +S.t.toFixed(2), at: stamp(), day: clock().day, text: text, kind: kind || 'info' }; S.feed.push(f); if (S.feed.length > 40) S.feed.shift(); emit('feed', f); }
  sim.feed = feed;

  /* ---------------- helpers */
  function zoneAt(x, y) { return G.zoneAt(x, y); }
  sim.zoneAt = zoneAt; sim.walkable = function (x, y) { return P.walk(Math.floor(x), Math.floor(y)); };
  function bOpen(id) { return !S.buildings[id].closed; }
  function doorPt(id) { var b = G.bmap[id]; return { x: b.door[0] + .5, y: b.door[1] + .5 }; }
  function placePt(id) { if (G.bmap[id]) return doorPt(id); var p = C.places[id] || C.places.park; return { x: p[0] + .5, y: p[1] + .5 }; }
  function distPlayer(x, y) { return hyp(x - S.player.x, y - S.player.y); }
  function setPath(e, tx, ty) { e.path = P.find(e.x, e.y, tx, ty).slice(); e.pi = 0; e.dest = { x: tx, y: ty }; }
  function followPath(e, speed, dt) {
    if (!e.path || e.pi >= e.path.length) { if (e.dest) { var dx = e.dest.x - e.x, dy = e.dest.y - e.y, d = hyp(dx, dy); if (d < .08) return true; var st = Math.min(d, speed * dt); slide(e, dx / d * st, dy / d * st); return d < .3; } return true; }
    var p = e.path[e.pi], ddx = p[0] - e.x, ddy = p[1] - e.y, dd = hyp(ddx, ddy);
    if (dd < .15) { e.pi++; return false; } var s2 = Math.min(dd, speed * dt); e.x += ddx / dd * s2; e.y += ddy / dd * s2; return false;
  }
  function slide(e, mx, my) { if (P.walk(Math.floor(e.x + mx), Math.floor(e.y))) e.x += mx; if (P.walk(Math.floor(e.x), Math.floor(e.y + my))) e.y += my; e.x = clamp(e.x, .2, G.W - .2); e.y = clamp(e.y, .2, G.H - .2); }
  function seek(e, tx, ty, speed, dt) {   // direct steering, falls back to A* when blocked
    var dx = tx - e.x, dy = ty - e.y, d = hyp(dx, dy); if (d < .05) return d;
    if (e.path && e.pi < e.path.length && (e.repath || 0) > 0) { e.repath -= dt; followPath(e, speed, dt); return d; }
    var ox = e.x, oy = e.y, st = Math.min(d, speed * dt); slide(e, dx / d * st, dy / d * st);
    if (hyp(e.x - ox, e.y - oy) < st * .3 && d > 1) { setPath(e, tx, ty); e.repath = 2; }
    return d;
  }
  function spawnOK(x, y) { return distPlayer(x, y) >= C.director.minSpawnDistTiles; }
  function logSpawn(x, y, what) { var d = distPlayer(x, y); S.stats.spawns++; S.stats.minSpawnDist = Math.min(S.stats.minSpawnDist, d); S.spawnLog.push({ t: +S.t.toFixed(2), what: what, x: +x.toFixed(2), y: +y.toFixed(2), distTiles: +d.toFixed(2), distPx: Math.round(d * C.map.tile) }); if (S.spawnLog.length > 400) S.spawnLog.shift(); }
  sim.spawnLog = function () { return S.spawnLog; };

  /* =============================================================== road traffic (City AI) */
  function edgeNodes() { var r = []; G.nodes.forEach(function (n, i) { if (n.edge) r.push(i); }); return r; }
  function closedEdge(a, b) { var na = G.nodes[a], nb = G.nodes[b], mx = (na.x + nb.x) / 2, my = (na.y + nb.y) / 2;
    return (S.roadClosures || []).some(function (rc) { return Math.abs(rc.x - mx) < 1 && Math.abs(rc.y - my) < 1; }); }
  function route(a, b, avoidClosed) {   // BFS over the road graph, deterministic rng tie-break
    var prev = {}, q = [a], seen = {}; seen[a] = 1;
    while (q.length) { var c = q.shift(); if (c === b) break; var nb = G.nodes[c].nb.slice(); for (var i = nb.length - 1; i > 0; i--) { var j = Math.floor(rnd() * (i + 1)), t = nb[i]; nb[i] = nb[j]; nb[j] = t; }
      nb.forEach(function (n) { if (seen[n]) return; if (G.nodes[n].edge && n !== b) return; if (avoidClosed && closedEdge(c, n)) return; seen[n] = 1; prev[n] = c; q.push(n); }); }
    if (!seen[b]) return null; var r = [b]; while (r[0] !== a) r.unshift(prev[r[0]]); return r;
  }
  function spawnCar(initial) {
    var E = edgeNodes(), a = pick(E), b = pick(E.filter(function (e) { return e !== a && G.nodes[e].edge !== G.nodes[a].edge; })), r = route(a, b, true); if (!r) return null;
    var v = { id: nid('v'), kind: 'car', route: r, ri: 1, x: G.nodes[a].x, y: G.nodes[a].y, ang: 0, speed: 4.5, max: rr(3.8, 5.2), hp: 99, color: pick(['#d9d9d9', '#4c6ef5', '#e03131', '#2b8a3e', '#f08c00', '#212529']) };
    if (initial) { var k = ri(1, r.length - 1); v.ri = k; var n0 = G.nodes[r[k - 1]], n1 = G.nodes[r[k]], f = rnd(); v.x = n0.x + (n1.x - n0.x) * f; v.y = n0.y + (n1.y - n0.y) * f; }
    S.vehicles.push(v); return v;
  }
  function laneTarget(v) { var a = G.nodes[v.route[v.ri - 1]], b = G.nodes[v.route[v.ri]], dx = b.x - a.x, dy = b.y - a.y, d = hyp(dx, dy) || 1; return { x: b.x - dy / d * .5, y: b.y + dx / d * .5, dx: dx / d, dy: dy / d, node: b }; }
  function light() { return Math.floor(S.t / C.traffic.lightCycleSec) % 2 === 0 ? 'h' : 'v'; }
  sim.light = light;
  function stepVehicle(v, dt) {
    if (v.kind === 'player') return;
    if (v.stopped || v.parked) { v.speed = 0; return; }
    if (v.ri >= v.route.length) { if (v.kind === 'repair') { v.parked = true; return; } if (v.kind === 'van' && v.phaseGoal === 'bank') { v.parked = true; return; } v.exited = true; return; }
    var lt = laneTarget(v), dx = lt.x - v.x, dy = lt.y - v.y, d = hyp(dx, dy), want = v.max * (v.slow ? .45 : 1);
    var node = lt.node; if (!node.edge && d < 2.4 && d > 1.1) { var axis = Math.abs(lt.dx) > .5 ? 'h' : 'v'; if (light() !== axis) { if (v.reckless) { if (!v.ranRed) { v.ranRed = true; if (v.kind === 'truck') feed('A delivery truck blows through a red light. Drones are pursuing it.', 'alert'); else if (v.kind === 'van') feed('A dark van runs a red light.', 'alert'); } } else want = 0; } }
    var lightWant = want, blockedByCar = false;
    if (!(v.ghostT > 0)) for (var i = 0; i < S.vehicles.length; i++) { var o = S.vehicles[i]; if (o === v || o.exited) continue; var ox = o.x - v.x, oy = o.y - v.y, od = hyp(ox, oy); if (od < 1.5 && (ox * lt.dx + oy * lt.dy) > .3 && !v.reckless) { want = Math.min(want, o.kind === 'player' ? 0 : o.speed * .9); blockedByCar = o.kind !== 'player'; } }
    // gridlock breaker: a car held only by other cars (not by a red light) for 4 s squeezes through for 2 s
    if (v.ghostT > 0) v.ghostT -= dt; else if (blockedByCar && lightWant > 0 && v.speed < .1) { v.waitT = (v.waitT || 0) + dt; if (v.waitT > 4) { v.waitT = 0; v.ghostT = 2; } } else v.waitT = 0;
    v.speed += clamp(want - v.speed, -8 * dt, 3 * dt); if (v.speed < 0) v.speed = 0; var st = Math.min(d, v.speed * dt);
    if (d > 1e-3) { v.x += dx / d * st; v.y += dy / d * st; v.ang = Math.atan2(lt.dy, lt.dx); }
    if (d < .25) v.ri++;
  }

  /* =============================================================== civilians (Character AI: needs, routines, memory) */
  var SHIFT = { barista: [7, 15], baker: [6, 14], 'bus driver': [7, 16], 'hot-dog vendor': [11, 19], 'skate coach': [15, 20], 'mural painter': [10, 17], 'retired teacher': [9, 12], 'bank guard': [8, 18], nurse: [8, 18], doctor: [10, 20] };
  var RATES = { energy: 1 / 960, hunger: 1 / 360, social: 1 / 480, fun: 1 / 600 };   // PROPOSED: per game minute
  var WEEKEND_WORK = { 'hot-dog vendor': 1, nurse: 1, doctor: 1, barista: 1, 'skate coach': 1, 'mural painter': 1 };
  function shift(c) { return SHIFT[c.role] || [9, 17]; }
  function nearestThreat(c) { var best = null, bd = 1e9; S.robots.forEach(function (r) { if (r.st === 'down' || !r.hostile || r.riding || r.security) return; var d = D(c, r); if (d < bd) { bd = d; best = r; } }); return { r: best, d: bd }; }
  var CIV_ACTIONS = [
    { id: 'work', score: function (c, x) { var s = shift(c); if (x.h < s[0] || x.h >= s[1] || (x.weekend && !WEEKEND_WORK[c.role])) return 0; if (G.bmap[c.job] && !bOpen(c.job)) return .05; return .75; } },
    { id: 'home', score: function (c, x) { var night = x.h >= 22 || x.h < 6 ? .95 : 0; return Math.max(night, (1 - c.needs.energy) * 1.1, .12); } },
    { id: 'eat', score: function (c) { return Math.pow(1 - c.needs.hunger, 1.5) * 1.25; } },
    { id: 'social', score: function (c, x) { return x.h >= 22 || x.h < 7 ? 0 : (1 - c.needs.social) * .85 * c.tr.social; } },
    { id: 'fun', score: function (c, x) { return x.h >= 22 || x.h < 7 ? 0 : (1 - c.needs.fun) * .75; } },
    { id: 'flee', score: function (c) { return (1 - c.needs.safety) * 1.7 * (1 - c.tr.brave * .5); } },
    { id: 'watch', score: function (c, x) { return x.incNear && c.needs.safety > .45 && c.tr.curious > .55 ? .55 * c.tr.curious : 0; } },
    { id: 'clinic', score: function (c) { return c.injured > 0 ? 2.5 : 0; } },
    { id: 'protest', score: function (c, x) { var z = S.zones[G.bmap[c.home].zone]; return z.confidence < C.damage.protestBelow && x.h >= 10 && x.h < 18 ? .7 * (.5 + c.tr.brave * .5) : 0; } }
  ];
  function civDest(c, a, x) {
    switch (a) {
      case 'work': return G.bmap[c.job] ? { b: c.job } : { p: placePt(c.job === 'plaza' ? 'plaza' : c.job === 'mural' ? 'muralSpot' : 'park'), place: c.job };
      case 'home': return { b: c.home };
      case 'eat': return bOpen('cafe') && x.h >= 6 && x.h < 21 ? { b: 'cafe' } : { b: c.home };
      case 'social': var o = ['cafe', 'park', 'plaza'].filter(function (k) { return !G.bmap[k] || bOpen(k); }); var s = o[(c.id.charCodeAt(2) + x.day) % o.length]; return G.bmap[s] ? { b: s } : { p: placePt(s), place: s };
      case 'fun': var f = ['park', 'plaza', 'store'].filter(function (k) { return !G.bmap[k] || bOpen(k); }); var s2 = f[(c.id.charCodeAt(1) + c.id.charCodeAt(2) + x.h) % f.length]; return G.bmap[s2] ? { b: s2 } : { p: placePt(s2), place: s2 };
      case 'flee': var th = nearestThreat(c), cand = C.buildings.filter(function (b) { return bOpen(b.id) && b.kind !== 'villain'; }).map(function (b) { var p = doorPt(b.id); return { b: b.id, s: D(p, c) - (th.r ? D(p, th.r) * 1.4 : 0) }; }).sort(function (a, b) { return a.s - b.s; }); return cand.length ? { b: cand[0].b } : { b: c.home };
      case 'watch': var inc = x.incNear, ang = Math.atan2(c.y - inc.y, c.x - inc.x); return { p: { x: clamp(inc.x + Math.cos(ang) * 8, 1, G.W - 1), y: clamp(inc.y + Math.sin(ang) * 8, 1, G.H - 1) }, place: 'watch' };
      case 'clinic': return { b: 'clinic' };
      case 'protest': return { p: { x: C.places.civicSquare[0] + rr(-2, 2), y: C.places.civicSquare[1] + rr(-.5, .5) }, place: 'protest' };
    }
  }
  function stepCiv(c, dt, x) {
    var gm = dt * C.clock.gameMinPerSec; Brain.decayNeeds(c.needs, RATES, gm);
    if (c.grabbed) { var gr = S.robots.filter(function (r) { return r.id === c.grabbed; })[0]; if (!gr || gr.st === 'down') { c.grabbed = null; } else { c.x = gr.x + .4; c.y = gr.y; return; } }
    var th = c.inside ? { d: 1e9 } : nearestThreat(c); if (th.d < 6) c.needs.safety = Math.min(c.needs.safety, clamp(th.d / 6, 0, 1) * .6); else c.needs.safety = clamp(c.needs.safety + gm / 20, 0, 1);
    if (x.incNear && !c.inside && D(c, x.incNear) < 12) { c.witnessed[x.incNear.id] = 1; x.incNear.witnesses[c.id] = 1; }
    if (c.inside && G.bmap[c.inside] && S.buildings[c.inside].closed && c.inside !== c.home) { var dp = doorPt(c.inside); c.x = dp.x; c.y = dp.y; Brain.remember(c, { t: Math.floor(absMin()), k: 'closed', subj: c.inside, v: -.3 }); c.inside = null; c.think = 0; }
    if (c.inside) { if (c.inside === c.home && c.action === 'home') c.needs.energy = clamp(c.needs.energy + gm / 420, 0, 1);
      if (c.inside === 'cafe') { c.needs.hunger = clamp(c.needs.hunger + gm / 25, 0, 1); c.needs.social = clamp(c.needs.social + gm / 90, 0, 1); }
      if (c.inside === 'store') c.needs.fun = clamp(c.needs.fun + gm / 60, 0, 1); if (c.inside === c.home) c.needs.hunger = clamp(c.needs.hunger + gm / 120, 0, 1);
      if (c.inside === 'mural' && c.role === 'mural painter' && c.action === 'work') S.mural = Math.min(100, S.mural + gm / 30);
      if (c.inside === 'clinic' && c.injured > 0) { c.injured = Math.max(0, c.injured - gm); if (c.injured <= 0) Brain.remember(c, { t: Math.floor(absMin()), k: 'recovered', v: .2 }); } }
    else if (c.place && !c.dest) { if (c.place === 'park' || c.place === 'plaza') { c.needs.fun = clamp(c.needs.fun + gm / 45, 0, 1); c.needs.social = clamp(c.needs.social + gm / 120, 0, 1); }
      if (c.role === 'mural painter' && c.action === 'work') S.mural = Math.min(100, S.mural + gm / 30); }
    c.think -= dt;
    if (c.think <= 0) { c.think = 2 + rnd() * .5;
      var r = Brain.decide(c, CIV_ACTIONS, x); c.lastScores = r.scores;
      if (r.action.id !== c.action || (!c.inside && !c.dest && !c.place)) { c.action = r.action.id; var d = civDest(c, c.action, x);
        if (d.b && c.inside === d.b) { c.dest = null; } else { if (c.inside) { var dp2 = doorPt(c.inside); c.x = dp2.x; c.y = dp2.y; c.inside = null; } c.goalB = d.b || null; c.place = d.place || null; var tp = d.b ? doorPt(d.b) : d.p; setPath(c, tp.x, tp.y); } }
      if (!c.inside && (c.action === 'social' || c.action === 'fun') && !c.dest) { var o = S.civs.filter(function (k) { return k !== c && !k.inside && D(k, c) < 1.8; })[0]; if (o) chat(c, o); }
    }
    if (!c.inside && c.dest) { var sp = (c.action === 'flee' ? 3.2 : 1.6) * (c.injured > 0 ? .5 : 1), arrived = followPath(c, sp, dt);
      if (arrived) { c.dest = null; c.path = []; if (c.goalB) { c.inside = c.goalB; c.goalB = null; } } }
    if (c.chat > 0) c.chat -= dt;
  }
  function chat(a, b) {   // gossip: civilians share incident memories, so opinions of Mella spread
    a.chat = b.chat = 3; a.needs.social = clamp(a.needs.social + .25, 0, 1); b.needs.social = clamp(b.needs.social + .25, 0, 1);
    var m = a.mem.filter(function (m) { return m.k !== 'heard' && m.inc && !b.mem.some(function (n) { return n.inc === m.inc; }); }).pop();
    if (m) { Brain.remember(b, { t: Math.floor(absMin()), k: 'heard', inc: m.inc, from: a.id, v: (m.v || 0) * .5, txt: m.txt }); b.opinion = clamp(b.opinion + (m.v || 0) * 6, -100, 100); a.said = 'Did you hear about ' + (m.txt || 'what happened') + '?'; }
    else a.said = pick(['Nice day for it.', 'Have you tried the new pastry at Steamline?', 'The mural is coming along.', 'Traffic on the avenue is a mess again.', 'My kid wants to learn to skate.']);
  }

  /* =============================================================== supers (Character AI + independent incident response) */
  function sdef(id) { return C.supers.filter(function (d) { return d.id === id; })[0]; }
  function incById(id) { return S.incidents.filter(function (i) { return i.id === id; })[0]; }
  function stepSuper(s, dt, x) {
    var d = sdef(s.id); s.cd = Math.max(0, s.cd - dt);
    if (s.state === 'captured') { if (absMin() >= s.capturedUntil) { s.state = 'recover'; var b0 = doorPt('clinic'); s.x = b0.x; s.y = b0.y; s.hp = s.max * .4; s.path = []; s.dest = null; feed(d.codename + ' turned up outside the Civic Clinic, released by Iteron after his "study".', 'info'); histNote(d.codename + ' was released by Dr. Iteron.'); } return; }
    if (s.state === 'injured') { s.injuredT += dt; return; }
    if (s.state === 'recover') { if (followPath(s, 3, dt)) { s.hp = Math.min(s.max, s.hp + dt * s.max / 180); if (s.hp >= s.max * .95) { s.state = 'patrol'; s.wp = null; } } return; }
    var inc = s.inc && incById(s.inc);
    if (s.inc && !inc) { s.inc = null; s.obj = null; s.state = 'patrol'; s.wp = null; s.fatigue += .2; }
    if (s.state === 'alerted') { s.alertT -= dt; if (s.alertT <= 0) { s.state = 'respond'; feed(d.codename + ' is responding to the ' + C.incidents[inc.type].label.toLowerCase() + ' in ' + C.zones[inc.zone].name + '.', 'hero'); } return; }
    if (s.state === 'feud') { stepFeud(s, dt); return; }
    if (s.state === 'respond' || s.state === 'engage') { engage(s, d, inc, dt); return; }
    s.fatigue = Math.max(0, s.fatigue - dt / 300); s.hp = Math.min(s.max, s.hp + dt * s.max / 240);
    s.think -= dt; if (s.think <= 0 || !s.wp) { s.think = rr(20, 40); var night = x.h >= 23 || x.h < 7; var pts = night ? [doorPt(d.home)] : [placePt(d.base), placePt('plaza'), placePt('park'), placePt('store'), placePt('bank'), placePt('depot'), placePt('aptA')];
      s.wp = pick(pts); setPath(s, s.wp.x, s.wp.y); }
    followPath(s, d.power.speed * .35, dt);
  }
  function considerResponse(inc) {   // each super decides on its own (utility), so some come, some don't, at different speeds
    S.supers.forEach(function (s) { var d = sdef(s.id); if (s.state !== 'patrol') return;
      var dist = hyp(s.x - inc.x, s.y - inc.y), hr = clock().hour, night = hr >= 23 || hr < 7;
      var u = .55 + (d.temperament === 'reckless' || d.temperament === 'destructive' ? .25 : 0) + (inc.tier === 'major' ? .2 : 0) - dist / 120 - s.fatigue - (night ? .25 : 0) + (s.hp / s.max - 1) + rr(-.25, .2);
      if (Object.keys(s.rel).some(function (k) { return s.rel[k] < -15 && inc.heroes.indexOf(k) >= 0; })) u += .1;
      if (u > .4) { s.inc = inc.id; s.state = 'alerted'; s.alertT = rr(4, 14) * (d.temperament === 'cautious' ? 1.5 : 1); inc.heroes.push(s.id); s.obj = null; } });
  }
  function chooseObjective(s, d, inc) {
    if (inc.div) { var dob = divObjective(s, d, inc); if (dob) return dob; }
    var open = inc.objectives.filter(function (o) { return o.state === 'open'; }).map(function (o) { return o.id; });
    var veh = inc.vehicle && S.vehicles.filter(function (v) { return v.id === inc.vehicle; })[0];
    if (veh && !veh.stopped && !veh.exited) { open.push('destroy_vehicle'); if (inc.type === 'vehicle_chase') open.push('protect_vehicle'); }   // nobody protects a getaway van
    for (var i = 0; i < d.prefs.length; i++) if (open.indexOf(d.prefs[i]) >= 0) return d.prefs[i];
    return 'fight';
  }
  function engage(s, d, inc, dt) {
    if (!inc) return;
    if (!s.obj || s.cd <= 0) { var o = chooseObjective(s, d, inc); if (o !== s.obj) { s.obj = o; conflictCheck(s, inc); } s.cd = 6; }
    if (inc.div && divEngage(s, d, inc, dt)) return;
    var tgt = null, veh = inc.vehicle && S.vehicles.filter(function (v) { return v.id === inc.vehicle; })[0];
    var hostile = S.robots.filter(function (r) { return r.inc === inc.id && r.st !== 'down' && !r.riding; });
    switch (s.obj) {
      case 'save_hero': tgt = S.supers.filter(function (o) { return o.state === 'injured'; })[0] || S.civs.filter(function (c) { return c.injured > 0 && !c.inside && D(c, s) < 15; })[0]; break;
      case 'stop_commander': case 'prevent_damage': tgt = hostile.filter(function (r) { return r.cls === 'commander'; })[0]; break;
      case 'disable_drones': tgt = hostile.filter(function (r) { return r.cls === 'scout'; })[0]; break;
      case 'track_signal': tgt = hostile.filter(function (r) { return r.fleeing; })[0]; break;
      case 'capture_prototype': tgt = S.items.filter(function (it) { return it.inc === inc.id && it.kind === 'core'; })[0]; break;
      case 'protect_civilians': tgt = hostile.filter(function (r) { return r.grab; })[0] || hostile.slice().sort(function (a, b) { return civNear(a) - civNear(b); })[0]; break;
      case 'stop_vehicle': case 'protect_vehicle': case 'destroy_vehicle': case 'recover_loot': tgt = veh && !veh.exited ? veh : null; break;
    }
    if (!tgt) tgt = hostile.slice().sort(function (a, b) { return D(a, s) - D(b, s); })[0] || (veh && !veh.exited && (!veh.stopped || veh.loot) ? veh : null) || inc;
    if (s.obj === 'track_signal' && tgt.cls) { var dd = seek(s, tgt.x, tgt.y, d.power.speed * .9, dt); s.state = 'engage'; if (dd < d.power.range && tgt.hp > tgt.max * .3) hitRobot(tgt, 0, s.id); return; }
    var dist = seek(s, tgt.x, tgt.y, d.power.speed, dt); s.state = dist < 8 ? 'engage' : 'respond';
    if (dist > Math.max(d.power.range, 1.2) + .4) return;
    if (tgt.cls) { hitRobot(tgt, d.power.dps * dt, s.id); if (d.power.collateral && rnd() < d.power.collateral * dt) collateral(tgt.x, tgt.y, 4, d.codename); }
    else if (tgt.kind === 'core') { takeCore(tgt, s.id); }
    else if (tgt.state === 'injured') { tgt.reviveT = (tgt.reviveT || 0) + dt * (d.power.heal ? 3 : 1); if (tgt.reviveT > 4) reviveSuper(tgt, s.id); }
    else if (tgt.injured > 0 && d.power.heal) { tgt.injured = Math.max(0, tgt.injured - dt * 30); }
    else if (tgt.kind === 'truck' || tgt.kind === 'van') {
      if (s.obj === 'destroy_vehicle') { damageVehicle(tgt, d.power.dps * dt / C.hpUnit, s.id); if (rnd() < .4 * dt) collateral(tgt.x, tgt.y, 5, d.codename); }
      else if (s.obj === 'protect_vehicle') { tgt.protectedBy = s.id; tgt.protT = 1; }
      else if (s.obj === 'stop_vehicle') { tgt.slow = true; if (!tgt.stopped) { if (d.power.speed > 7) { tgt.slowT = (tgt.slowT || 0) + dt; if (tgt.slowT > 5) stopVehicle(tgt, s.id); } else damageVehicle(tgt, d.power.dps * dt / C.hpUnit * .6, s.id); } }
      else if (tgt.stopped && tgt.loot) { tgt.lootT = (tgt.lootT || 0) + dt; if (tgt.lootT > 4) recoverLoot(inc, s.id); }
      else if (tgt.stopped && tgt.payload && !tgt.payloadSeen) { revealPayload(tgt, s.id); }
    }
  }
  function civNear(r) { var b = 1e9; S.civs.forEach(function (c) { if (!c.inside) b = Math.min(b, D(c, r)); }); return b; }
  function conflictCheck(s, inc) {
    if (s.obj !== 'destroy_vehicle' && s.obj !== 'protect_vehicle') return;
    var other = S.supers.filter(function (o) { return o !== s && o.inc === inc.id && (o.obj === 'destroy_vehicle' || o.obj === 'protect_vehicle') && o.obj !== s.obj; })[0];
    if (!other || inc.conflicts.indexOf(s.id + '|' + other.id) >= 0) return;
    inc.conflicts.push(s.id + '|' + other.id, other.id + '|' + s.id); s.rel[other.id] = (s.rel[other.id] || 0) - 12; other.rel[s.id] = (other.rel[s.id] || 0) - 12;
    var a = sdef(s.id).codename, b = sdef(other.id).codename, pro = s.obj === 'protect_vehicle' ? a : b, des = s.obj === 'protect_vehicle' ? b : a;
    inc.notes.push(pro + ' tried to protect the ' + inc.vehicleKind + ' while ' + des + ' tried to destroy it.'); feed(pro + ' is shielding the ' + inc.vehicleKind + ' — ' + des + ' is trying to wreck it!', 'alert');
  }
  function reviveSuper(t, by) { t.state = 'recover'; t.hp = t.max * .35; t.reviveT = 0; var cl = doorPt('clinic'); setPath(t, cl.x, cl.y); var inc = incById(t.injInc);
    if (inc) objDone(inc, 'save_hero', by); if (by === 'mella') { t.mellaRel += 15; Brain.remember(t, { t: Math.floor(absMin()), k: 'rescued', v: 1, inc: t.injInc }); } else if (sdef(by)) t.rel[by] = (t.rel[by] || 0) + 10;
    feed(sdef(t.id).codename + ' is back on their feet' + (by === 'mella' ? ' thanks to Mella.' : by ? ', helped by ' + nameOf(by) + '.' : '.'), 'hero'); }
  function nameOf(id) { if (id === 'mella') return 'Mella'; var d = sdef(id); if (d) return d.codename; if (id === 'security') return 'city security robots'; return id || 'nobody'; }

  /* =============================================================== Dr. Iteron's robots (Villain AI field units) */
  function spawnRobot(cls, x, y, incId, extra) {
    var R = C.robots[cls], hp = R.hp * C.hpUnit;
    var r = Object.assign({ id: nid('r'), cls: cls, x: x, y: y, hp: hp, max: hp, st: 'travel', t: 0, inc: incId, vx: 0, vy: 0, face: 0, hostile: true, gen: S.iteron.gen, cyc: rnd() * 4, art: 2 }, extra || {});
    S.robots.push(r); return r;
  }
  function hitRobot(r, dmg, by) {
    if (r.st === 'down' || r.security) return false;
    var k = 1; if (shieldedBy(r)) k *= C.robots.commander.shieldK; if (r.cls === 'commander' && by === 'mella-hit') k *= 1 - S.iteron.mods.meleeGuard;
    if (r.cls === 'interceptor' && by === 'mella-blast' && rnd() < S.iteron.mods.blastDodge) { r.dodged = (r.dodged || 0) + 1; return 'dodged'; }
    r.hp -= dmg * k; if (dmg > 0) { r.flash = .15; r.lastBy = by; }
    if (!r.hostile && dmg > 0) { r.hostile = true; r.fleeing = true; r.disguised = false; }
    if (r.disguised && dmg > 0) r.disguised = false;
    if (r.grab && dmg > 0) freeGrab(r, by);
    if (r.cls === 'scout' && r.hp < r.max * .5 && !r.fleeing && r.inc) startFlee(r);
    if (r.hp <= 0) { r.hp = 0; r.st = 'down'; r.t = 2.2; robotDown(r, by); }
    return true;
  }
  sim.hitRobot = hitRobot;
  function shieldedBy(r) { if (r.cls === 'commander' || !r.inc) return false; return S.robots.some(function (c) { return c.cls === 'commander' && c.st !== 'down' && !c.riding && c.inc === r.inc && D(c, r) < C.robots.commander.shieldR; }); }
  sim.shielded = shieldedBy;
  function startFlee(r) { var inc = incById(r.inc); r.fleeing = true; r.trackT = 0; if (inc) { addObj(inc, 'track_signal'); feed('A damaged Iteron scout is fleeing — follow its signal!', 'alert'); } }
  function freeGrab(r, by) { var c = S.civs.filter(function (k) { return k.id === r.grab; })[0], m = by && by.indexOf('mella') === 0; r.grab = null; r.grabT = 0;
    if (c) { c.grabbed = null; Brain.remember(c, { t: Math.floor(absMin()), k: m ? 'rescued' : 'saved', by: m ? 'mella' : by, v: m ? 1 : .3, inc: r.inc, txt: 'the robot that grabbed me' }); if (m) { c.opinion = clamp(c.opinion + 20, -100, 100); feed('Mella freed ' + c.name + '.', 'hero'); } } }
  function robotDown(r, by) {
    var who = by && by.indexOf('mella') === 0 ? 'mella' : by, inc = incById(r.inc);
    if (inc) { inc.downs[who] = (inc.downs[who] || 0) + 1; if (who === 'mella') inc.mellaActs++; }
    if (r.cls === 'commander' && inc) { objDone(inc, 'stop_commander', who); S.items.push({ id: nid('it'), kind: 'core', x: r.x, y: r.y, inc: inc.id, t: 20 }); addObj(inc, 'capture_prototype'); feed('The shield commander is down. Its prototype core self-destructs in 20 seconds — capture it!', 'alert'); }
    if (inc && r.cls === 'scout' && inc.objectives.some(function (o) { return o.id === 'disable_drones'; }) && !S.robots.some(function (o) { return o.inc === inc.id && o.cls === 'scout' && o.st !== 'down'; })) objDone(inc, 'disable_drones', who);
  }
  function takeCore(it, by) { S.items = S.items.filter(function (i) { return i !== it; }); var inc = incById(it.inc); if (inc) objDone(inc, 'capture_prototype', by); S.research++; feed(nameOf(by) + ' captured an Iteron prototype core (research ' + S.research + ').', 'hero'); }
  function foundryDoor() { var f = G.bmap.foundry; return { x: f.door[0] + .5, y: f.door[1] + .5 }; }
  function stepRobot(r, dt) {
    var R = C.robots[r.cls]; r.flash = Math.max(0, (r.flash || 0) - dt); r.cyc += dt;
    if (r.st === 'down') { r.t -= dt; if (r.t <= 0) r.gone = true; return; }
    if (r.riding) { var v = S.vehicles.filter(function (q) { return q.id === r.riding; })[0]; if (!v || v.exited) { r.gone = true; r.escaped = true; return; } r.x = v.x; r.y = v.y; return; }
    var inc = r.inc && incById(r.inc), coord = !!(inc && S.robots.some(function (c) { return c.cls === 'commander' && c.inc === r.inc && c.st !== 'down' && !c.riding; }));
    var sp = R.speed * (coord && r.cls !== 'commander' ? C.robots.commander.coordSpeedK : 1) * (inc && inc.commanderDown && r.cls !== 'commander' ? .7 : 1);
    if (r.fleeing) { var home = r.home || foundryDoor(); var d0 = seek(r, home.x, home.y, R.speed * 1.1, dt);
      var tinc = inc || (r.trackInc && incById(r.trackInc));
      if (tinc && !r.tracked) { var trackers = []; if (distPlayer(r.x, r.y) < 5) trackers.push('mella'); S.supers.forEach(function (s) { if (s.inc === tinc.id && s.obj === 'track_signal' && D(s, r) < 5) trackers.push(s.id); });
        if (trackers.length) { r.trackT = (r.trackT || 0) + dt; if (r.trackT >= 6) { r.tracked = true; objDone(tinc, 'track_signal', trackers[0]); S.labRevealed = true; feed(nameOf(trackers[0]) + ' tracked the scout\'s signal: Iteron\'s next lab is under the Old Foundry.', 'hero'); } } }
      if (d0 < .6 || r.x < .4 || r.x > G.W - .4 || r.y < .4 || r.y > G.H - .4) { r.gone = true; r.escaped = true; } return; }
    if (!r.hostile) {   // patrol drones: observe Mella, wander where she spends time, go home
      r.life -= dt; if (r.life <= 0) { r.fleeing = true; return; }
      if (distPlayer(r.x, r.y) < R.observe) { S.iteron.observedSec += dt; r.watching = true; } else r.watching = false;
      if (!r.wp || D(r, r.wp) < .6) { var z = wpick(S.heat) || 'plaza'; var zb = C.buildings.filter(function (b) { return b.zone === z && b.kind !== 'villain'; }); var b = zb.length ? pick(zb) : C.buildings[0]; r.wp = { x: b.door[0] + .5 + rr(-2, 2), y: b.door[1] + .5 + rr(-.4, .4) }; }
      seek(r, r.wp.x, r.wp.y, R.speed * .45, dt); return; }
    if (r.st === 'travel') { var tg = inc ? inc.target : r; var dd = seek(r, tg.x, tg.y, sp, dt); if (dd < 3 || distPlayer(r.x, r.y) < 5) { r.st = 'engage'; r.t = rr(0, .5); } return; }
    r.t -= dt;
    if (r.cls === 'scout') { var pd = distPlayer(r.x, r.y); if (pd < R.observe) S.iteron.observedSec += dt;
      if (inc && inc.type === 'vehicle_chase') { var v2 = S.vehicles.filter(function (q) { return q.id === inc.vehicle; })[0]; if (v2 && !v2.exited && !v2.stopped) { var bx = v2.x - Math.cos(v2.ang) * 1.6 + Math.cos(r.cyc * 2) * .6, by = v2.y - Math.sin(v2.ang) * 1.6 + Math.sin(r.cyc * 2) * .6; var dv = hyp(bx - r.x, by - r.y), stp = Math.min(dv, Math.max(sp, v2.speed * 1.15) * dt); if (dv > 1e-3) { r.x += (bx - r.x) / dv * stp; r.y += (by - r.y) / dv * stp; } if (D(r, v2) < 2.2 && !(v2.protT > 0)) v2.hp -= dt * .04; return; } }
      var want = pd < R.keep[0] ? -1 : pd > R.keep[1] ? 1 : 0; if (pd > 12) want = 0;
      if (want) { var ax = (S.player.x - r.x) / (pd || 1) * want, ay = (S.player.y - r.y) / (pd || 1) * want; slide(r, ax * sp * dt, ay * sp * dt); } else { slide(r, Math.cos(r.cyc) * dt * .6, Math.sin(r.cyc * 1.3) * dt * .6); }
      return; }
    if (r.cls === 'commander') {
      var tb = inc && inc.targetB ? doorPt(inc.targetB) : (inc ? inc.target : r); if (D(r, tb) > 2.5) seek(r, tb.x, tb.y, sp, dt);
      r.art -= dt; if (r.art <= 0) { r.art = R.artilleryEvery; var bl = nearestBuilding(r.x, r.y, 7); if (bl) { var bp = doorPt(bl.id); shell(bp.x, bp.y, bl.id, R.artilleryDmg, inc); } }
      return; }
    // interceptor (grappler): pick a target; coordinated focus while the commander stands
    if (r.grab) { r.grabT += dt; var gc = S.civs.filter(function (k) { return k.id === r.grab; })[0]; if (!gc) { r.grab = null; } else if (r.grabT >= R.grabT) { injureCiv(gc, inc, 'grabbed by an Iteron interceptor'); gc.grabbed = null; r.grab = null; r.grabT = 0; r.t = 1.5; } else { var away = inc ? inc.origin : r; seek(r, away.x, away.y, sp * .35, dt); } return; }
    if (!r.tgt || r.t < -3 || !tpos(r.tgt)) { r.tgt = pickTarget(r, coord, inc); r.t = 0; }
    var T = tpos(r.tgt); if (!T) { if (inc) seek(r, inc.target.x, inc.target.y, sp * .5, dt); return; }
    var dx = T.x - r.x, dy = T.y - r.y, d3 = hyp(dx, dy) || 1e-6;
    if (r.st === 'engage' || r.st === 'travel') { if (d3 < R.reach + .8 && r.t <= 0) { r.st = 'tele'; r.t = R.tele; r.face = Math.atan2(dy, dx); } else seek(r, T.x, T.y, sp, dt); }
    else if (r.st === 'tele') { if (r.t <= 0) { r.st = 'atk'; r.t = .3; r.vx = Math.cos(r.face) * R.dash; r.vy = Math.sin(r.face) * R.dash; r.hitDone = false; } }
    else if (r.st === 'atk') { slide(r, r.vx * dt, r.vy * dt); r.vx *= Math.exp(-6 * dt); r.vy *= Math.exp(-6 * dt);
      if (!r.hitDone && d3 < R.reach) { r.hitDone = true; landHit(r, r.tgt, inc); }
      if (r.t <= 0) { r.st = 'engage'; r.t = rr(.6, 1.2); } }
  }
  function civById(id) { var c = S.civs.filter(function (k) { return k.id === id; })[0]; return c && !c.inside && !(c.injured > 0) && !c.grabbed ? c : null; }
  function pickTarget(r, coord, inc) {
    var opts = [], pd = distPlayer(r.x, r.y);
    if (pd < 9 && S.player.ko <= 0 && S.player.mode !== 'car') opts.push({ k: 'p', s: 10 - pd + (S.iteron.gen > 1 ? 1 : 0) });
    S.supers.forEach(function (s) { if (s.inc === r.inc && s.state === 'engage' && D(s, r) < 9) opts.push({ k: 's', id: s.id, s: 9 - D(s, r) }); });
    S.civs.forEach(function (c) { if (!c.inside && !(c.injured > 0) && !c.grabbed && D(c, r) < 9) opts.push({ k: 'c', id: c.id, s: 8.5 - D(c, r) + (coord ? 1.5 : 0) }); });
    if (coord && inc && inc.focus) opts.forEach(function (o) { if (o.k === inc.focus.k && o.id === inc.focus.id) o.s += 3; });
    opts.sort(function (a, b) { return b.s - a.s; }); var t = opts[0] || null; if (coord && inc && t) inc.focus = t; return t;
  }
  function tpos(t) { if (!t) return null; if (t.k === 'p') return S.player.ko > 0 || S.player.mode === 'car' ? null : S.player; if (t.k === 's') { var s = S.supers.filter(function (x) { return x.id === t.id; })[0]; return s && s.state !== 'injured' && s.state !== 'captured' && s.state !== 'recover' ? s : null; } return civById(t.id); }
  function landHit(r, t, inc) {
    if (t.k === 'p') hurtPlayer(C.robots[r.cls].name);
    else if (t.k === 's') { var s = S.supers.filter(function (x) { return x.id === t.id; })[0]; if (!s) return; var d = sdef(s.id); s.hp -= 14 * (1 - (d.power.shield || 0)); if (s.hp <= 0) injureSuper(s, inc); }
    else { var c = civById(t.id); if (c) { c.grabbed = r.id; r.grab = c.id; r.grabT = 0; c.needs.safety = 0; feed(c.name + ' has been grabbed by an Iteron interceptor!', 'alert'); } }
  }
  function injureSuper(s, inc) { s.hp = 0; s.state = 'injured'; s.injuredT = 0; s.injInc = inc ? inc.id : null; if (inc) { addObj(inc, 'save_hero'); if (inc.injuredHeroes.indexOf(s.id) < 0) inc.injuredHeroes.push(s.id); } feed(sdef(s.id).codename + ' is down and hurt!', 'alert'); }
  function injureCiv(c, inc, why) { if (c.injured > 0) return; c.injured = 240; c.needs.safety = 0; c.think = 0; S.stats.injured++; if (inc) inc.civInjured++; Brain.remember(c, { t: Math.floor(absMin()), k: 'hurt', v: -.6, inc: inc && inc.id, txt: why }); feed(c.name + ' was hurt (' + why + ').', 'alert'); }
  function nearestBuilding(x, y, maxD) { var best = null, bd = maxD; C.buildings.forEach(function (b) { if (b.kind === 'villain') return; var p = doorPt(b.id), d = hyp(p.x - x, p.y - y); if (d < bd) { bd = d; best = b; } }); return best; }
  function shell(x, y, bid, dmg, inc) { damageBuilding(bid, dmg, inc); S.fx = (S.fx || []).concat([{ k: 'boom', x: x, y: y, t: .8 }]).slice(-20); S.civs.forEach(function (c) { if (!c.inside && hyp(c.x - x, c.y - y) < 1.6 && rnd() < .5) injureCiv(c, inc, 'caught in a blast'); }); }
  function collateral(x, y, dmg, who) { var b = nearestBuilding(x, y, 6); var inc = S.incidents.filter(function (i) { return hyp(i.x - x, i.y - y) < 20; })[0]; if (b) { damageBuilding(b.id, dmg, inc); if (inc && who) inc.collateral[who] = (inc.collateral[who] || 0) + dmg; } }
  function damageBuilding(id, dmg, inc) { var B = S.buildings[id]; B.dmg = clamp(B.dmg + dmg, 0, 100); var z = G.bmap[id].zone; if (inc) inc.dmg += dmg;
    if (!B.closed && B.dmg >= C.damage.closeAt) { B.closed = true; S.zones[z].closures++; feed(G.bmap[id].name + ' has closed temporarily (damage ' + Math.round(B.dmg) + '%).', 'city'); }
    updateRoadClosures(); }
  sim.damageBuilding = function (id, dmg) { damageBuilding(id, dmg, null); };
  function updateRoadClosures() { S.roadClosures = []; C.buildings.forEach(function (b) { if (S.buildings[b.id].dmg >= C.damage.roadCloseAt) { var p = doorPt(b.id), m = nearestRoadMid(p.x, p.y); if (m) S.roadClosures.push({ x: m.x, y: m.y, b: b.id }); } }); }
  function nearestRoadMid(x, y) { var best = null, bd = 1e9; G.nodes.forEach(function (n) { n.nb.forEach(function (mi) { var o = G.nodes[mi]; if (n.edge || o.edge) return; var mx = (n.x + o.x) / 2, my = (n.y + o.y) / 2, d = hyp(mx - x, my - y); if (d < bd) { bd = d; best = { x: mx, y: my }; } }); }); return best; }

  /* =============================================================== hero (Mella): HP lives in the save; movement + combat input in living.js */
  function hurtPlayer(why) { var p = S.player; if (p.ko > 0 || p.inv > 0 || p.mode === 'car' || p.z > .4) return false; p.hp--; p.inv = C.hero.invHit; p.lastHurt = why; emit('hurt', why); if (p.hp <= 0) { p.hp = 0; p.ko = C.hero.koTime; feed('Mella is knocked down — recovering.', 'alert'); } return true; }
  sim.hurtPlayer = hurtPlayer;
  function stepPlayerTimers(dt) { var p = S.player; p.inv = Math.max(0, p.inv - dt); if (p.ko > 0) { p.ko -= dt; if (p.ko <= 0) { p.ko = 0; p.hp = C.hero.hp; p.inv = C.hero.koGrace; } } var z = zoneAt(p.x, p.y); S.heat[z] = (S.heat[z] || 0) + dt; var f = Math.exp(-dt / 3600); for (var k in S.heat) S.heat[k] *= f; }
  sim.reportAction = function (kind) { S.uses[kind] = (S.uses[kind] || 0) + 1; if (kind === 'calm') sim.calmFighters(C.hero.calmRadius + 1); var watched = S.robots.some(function (r) { return r.st !== 'down' && !r.security && (r.cls === 'scout' || r.inc) && distPlayer(r.x, r.y) < C.robots.scout.observe; }); if (watched && S.iteron.learn[kind] != null) S.iteron.learn[kind]++; S.incidents.forEach(function (i) { if (hyp(i.x - S.player.x, i.y - S.player.y) < 14 && (kind === 'hit' || kind === 'blast' || kind === 'calm')) i.mellaActs++; }); return watched; };
  sim.interact = function () {   // E / Y: capture cores, revive heroes, recover loot, open the truck, heal + talk to civilians, talk to heroes
    var p = S.player, R = C.hero.actRange;
    var it = S.items.filter(function (i) { return hyp(i.x - p.x, i.y - p.y) < R; })[0]; if (it && it.kind === 'evidence') return divExamine(it, 'mella'); if (it) { takeCore(it, 'mella'); return { kind: 'capture', line: 'Prototype core captured.' }; }
    var hs = S.supers.filter(function (s) { return s.state === 'injured' && hyp(s.x - p.x, s.y - p.y) < R; })[0]; if (hs) { reviveSuper(hs, 'mella'); return { kind: 'revive', who: sdef(hs.id).codename, line: sdef(hs.id).codename + ': "I owe you one, Mella."' }; }
    var v = S.vehicles.filter(function (v) { return v.stopped && v.loot && hyp(v.x - p.x, v.y - p.y) < R + .6; })[0]; if (v) { var inc = incById(v.inc); if (inc) recoverLoot(inc, 'mella'); return { kind: 'loot', line: 'You pull the money bags out of the van.' }; }
    var pv = S.vehicles.filter(function (v) { return v.stopped && v.payload && !v.payloadSeen && hyp(v.x - p.x, v.y - p.y) < R + .6; })[0]; if (pv) { revealPayload(pv, 'mella'); return { kind: 'payload', line: pv.payloadText }; }
    var c = S.civs.filter(function (c) { return !c.inside && hyp(c.x - p.x, c.y - p.y) < R; }).sort(function (a, b) { return D(a, p) - D(b, p); })[0];
    if (c) { if (c.injured > 0) { c.injured = Math.max(0, c.injured - 120); c.opinion = clamp(c.opinion + 8, -100, 100); Brain.remember(c, { t: Math.floor(absMin()), k: 'helped', by: 'mella', v: .8 }); return { kind: 'heal', who: c.name, line: 'Thank you… I can make it to the clinic now.' }; } c.talkedT = S.t; return { kind: 'talk', who: c.name, role: c.role, line: talk(c) }; }
    var fs = S.supers.filter(function (s) { return s.state === 'feud' && hyp(s.x - p.x, s.y - p.y) < R + 1; })[0];
    if (fs) { var fi = incById(fs.inc); if (fi) { calmFighter(fi, fs.id, C.divider.mellaTalk, 'mella'); fi.mellaActs++; } return { kind: 'deescalate', who: sdef(fs.id).codename, role: 'duped by The Divider', line: fs.state === 'feud' ? '"' + (fs.feud === 'mella' ? 'You sold us out to Iteron!' : nameOf(fs.feud) + ' sold us out!') + '" (You keep talking. They are listening a little more.)' : '"…Wait. Who sent me that message?" They stand down.' }; }
    var rv = S.divider && S.divider.rival && S.supers.filter(function (s) { return s.id === S.divider.rival.id && s.state !== 'captured' && s.state !== 'injured' && hyp(s.x - p.x, s.y - p.y) < R + .5; })[0];
    if (rv && (rv.mellaRel >= 0 || S.divider.exposure >= 50)) { var rn = S.divider.rival.name; S.divider.rival = null; rv.mellaRel += 3; feed(sdef(rv.id).codename + ' quit ' + rn + ' after talking with Mella.', 'hero'); histNote(sdef(rv.id).codename + ' left The Divider\'s rival team ' + rn + '.'); return { kind: 'talk', who: sdef(rv.id).codename, role: 'ex-' + rn, line: '"An anonymous sponsor, a crew, free gear… yeah. I got played. I\'m out."' }; }
    var s = S.supers.filter(function (s) { return s.state !== 'captured' && s.state !== 'injured' && hyp(s.x - p.x, s.y - p.y) < R + .5; })[0]; if (s) return { kind: 'talk', who: sdef(s.id).codename, role: 'superhero · proposed original', line: superTalk(s) };
    return null;
  };
  sim.discover = function (id) { if (S.discovered[id]) return false; S.discovered[id] = Math.floor(absMin()); var d = C.discoveries.filter(function (x) { return x.id === id; })[0]; feed('Discovery: ' + d.text, 'discovery'); return true; };
  function talk(c) {
    var m = c.mem[c.mem.length - 1], op = c.opinion, inc;
    if (c.grabbed) return 'Get this thing off me!';
    if (m && absMin() - m.t < 1440 * 2) {
      inc = m.inc && S.history.filter(function (h) { return h.id === m.inc; })[0];
      if (m.k === 'rescued') return 'You pulled me out of that mess' + (inc ? ' on ' + inc.when : '') + '. I won\'t forget it.';
      if (m.k === 'saw_help') return 'I saw you at the ' + (inc ? inc.label.toLowerCase() : 'fight') + '. ' + (inc && inc.outcome === 'contained' ? 'The whole block is talking about it.' : 'Rough one, but you showed up.');
      if (m.k === 'absent') return 'Where were you when the ' + (inc ? inc.label.toLowerCase() + ' hit ' + inc.zoneName : 'trouble hit') + '? ' + (inc && inc.heroNames.length ? inc.heroNames[0] + ' showed up, at least.' : 'Nobody came.');
      if (m.k === 'heard') return 'Did you hear about ' + (m.txt || 'what happened') + '? ' + (m.v > 0 ? 'People say you were great.' : 'People are worried.');
      if (m.k === 'closed') return (G.bmap[m.subj] ? G.bmap[m.subj].name : 'My work') + ' is closed after the damage. I can\'t work today.';
      if (m.k === 'clue') return 'I heard something: ' + m.txt;
      if (m.k === 'hurt') return 'Still sore from ' + (m.txt || 'that attack') + '.';
    }
    var act = { work: 'On my way to work — ' + (G.bmap[c.job] ? G.bmap[c.job].name : 'the ' + c.job) + '.', home: 'Heading home. Long day.', eat: 'Starving. Steamline Café, here I come.', social: 'Looking for someone to talk to, honestly.', fun: 'Just taking it slow today.', flee: 'Run! It isn\'t safe here!', watch: 'I just want to see what happens.', clinic: 'I need the clinic.', protest: 'We want the city fixed! Nobody listens!' }[c.action] || 'Hey.';
    return (op > 30 ? 'Mella! ' : op < -20 ? 'Oh. It\'s you. ' : '') + act;
  }
  function superTalk(s) { var d = sdef(s.id), r = s.mellaRel; return '"' + (r > 10 ? 'Glad you\'ve got my back. ' : r < -5 ? 'Stay out of my way next time. ' : '') + d.motivation + '"'; }
  sim.talk = talk;

  /* =============================================================== vehicles in incidents */
  function damageVehicle(v, dmg, by) { if (v.stopped || v.exited) return; v.hp -= dmg; v.lastBy = by; if (v.hp <= 0) stopVehicle(v, by, by === 'riotgale'); }
  sim.damageVehicle = function (id, dmg, by) { var v = S.vehicles.filter(function (q) { return q.id === id; })[0]; if (!v || !v.inc) return false; if (v.protT > 0 && by && by.indexOf('mella') === 0) dmg *= .6; damageVehicle(v, dmg, by); var inc = incById(v.inc); if (inc && by && by.indexOf('mella') === 0) inc.mellaActs++; return true; };
  function stopVehicle(v, by, wrecked) { v.stopped = true; v.speed = 0; v.hp = Math.max(0, v.hp); var inc = incById(v.inc); var who = by && by.indexOf('mella') === 0 ? 'mella' : by;
    if (!inc) return;
    objDone(inc, 'stop_vehicle', who);
    if (wrecked) { inc.notes.push('The ' + inc.vehicleKind + ' was wrecked.'); collateral(v.x, v.y, 10, nameOf(by)); S.civs.forEach(function (c) { if (!c.inside && hyp(c.x - v.x, c.y - v.y) < 2 && rnd() < .5) injureCiv(c, inc, 'hit by wreckage'); }); }
    S.robots.forEach(function (r) { if (r.riding === v.id) { r.riding = null; r.st = 'engage'; r.x = v.x + rr(-1, 1); r.y = v.y + rr(-1, 1); } });
    feed('The ' + inc.vehicleKind + ' has been stopped' + (who ? ' by ' + nameOf(who) : '') + (wrecked ? ' — wrecked.' : '.'), 'hero'); }
  function revealPayload(v, by) { v.payloadSeen = true; var inc = incById(v.inc);
    v.payloadText = { escape: 'The driver is a courier who stole one of Iteron\'s prototypes and was running from his drones.', robbery: 'The truck was stolen from the Tinker Workshop; the drones were its escort.', decoy: 'The truck is empty — a decoy while Iteron\'s scouts mapped which heroes responded.' }[v.payload];
    if (inc) { inc.payload = v.payload; inc.notes.push(v.payloadText); if (v.payload !== 'decoy') { S.items.push({ id: nid('it'), kind: 'core', x: v.x + .8, y: v.y, inc: inc.id, t: 30 }); addObj(inc, 'capture_prototype'); } else S.iteron.observedSec += 60; }
    feed((by ? nameOf(by) + ' opened the truck: ' : '') + v.payloadText, 'info'); }
  function recoverLoot(inc, by) { var v = S.vehicles.filter(function (q) { return q.id === inc.vehicle; })[0]; if (v) v.loot = false; objDone(inc, 'recover_loot', by); feed(nameOf(by) + ' recovered the stolen money.', 'hero'); }

  /* =============================================================== incidents (Incident AI) */
  function addObj(inc, id) { if (!inc.objectives.some(function (o) { return o.id === id; })) inc.objectives.push({ id: id, label: C.objectives[id].label, state: 'open', by: null }); }
  function objDone(inc, id, by) { addObj(inc, id); var o = inc.objectives.filter(function (o) { return o.id === id; })[0]; if (o.state !== 'open') return; o.state = 'done'; o.by = by || null; o.t = +S.t.toFixed(1); if (by === 'mella') inc.mellaActs++; }
  function objFail(inc, id) { var o = inc.objectives.filter(function (o) { return o.id === id; })[0]; if (o && o.state === 'open') { o.state = 'failed'; o.t = +S.t.toFixed(1); } }
  function origins(kind) {   // plausible entry points: road ends for vehicles; the Old Foundry door and sewer grates for robots
    if (kind === 'road') return edgeNodes().map(function (i) { var n = G.nodes[i]; return { x: clamp(n.x, .3, G.W - .3), y: clamp(n.y, .3, G.H - .3), node: i, name: { W: 'the west road', E: 'the east road', N: 'the north road', S: 'the south road' }[n.edge] }; });
    return [Object.assign(foundryDoor(), { name: 'the Old Foundry' })].concat(C.grates.map(function (g) { return { x: g[0] + .5, y: g[1] + .5, name: 'a sewer grate in ' + C.zones[zoneAt(g[0], g[1])].name }; }));
  }
  function validOrigins(kind, near) { var o = origins(kind).filter(function (p) { return spawnOK(p.x, p.y); }); if (near) o.sort(function (a, b) { return D(a, near) - D(b, near); }); return o; }
  sim.spawnIncident = function (type, tier, why) { return startIncident(type, tier || C.incidents[type].tier, why || 'qa'); };
  function newInc(type, tier, zone, target, origin, why) {
    var inc = { id: nid('inc'), type: type, tier: tier, label: C.incidents[type].label, zone: zone, x: target.x, y: target.y, target: { x: target.x, y: target.y }, targetB: target.b || null, origin: { x: origin.x, y: origin.y, name: origin.name },
      start: +S.t.toFixed(2), startClock: stamp(), deadline: S.t + C.incidents[type].deadlineSec, phase: 'active', objectives: [], heroes: [], downs: {}, mellaActs: 0, mellaNearSec: 0, civInjured: 0, dmg: 0,
      notes: [], conflicts: [], collateral: {}, injuredHeroes: [], witnesses: {}, why: why, cause: '' };
    S.incidents.push(inc); S.stats.incidents++; return inc;
  }
  function nearestNode(x, y) { var b = 0, bd = 1e9; G.nodes.forEach(function (n, i) { if (n.edge) return; var d = hyp(n.x - x, n.y - y); if (d < bd) { bd = d; b = i; } }); return b; }
  function startIncident(type, tier, why) {
    if (tier === 'any') tier = 'minor';
    var I = C.incidents[type], M = C.director.modes[S.director.mode], k = .6 + .8 * M.intensity, inc = null, o, v, i;
    if (type === 'frame_up' || type === 'staged_fight') { inc = startDivider(type, why); }
    else if (type === 'vehicle_chase') {
      var V = validOrigins('road'); if (!V.length) return null; o = pick(V);
      var exits = edgeNodes().filter(function (e) { return G.nodes[e].edge !== G.nodes[o.node].edge; }), ex = pick(exits), r = route(o.node, ex, true); if (!r) return null;
      var mid = G.nodes[r[Math.floor(r.length / 2)]];
      inc = newInc(type, tier, zoneAt(mid.x, mid.y), { x: mid.x, y: mid.y }, o, why); inc.cause = 'A delivery truck entered from ' + o.name + ' with Iteron drones on its tail. Robbery, escape, or something else?';
      v = { id: nid('v'), kind: 'truck', route: r, ri: 1, x: o.x, y: o.y, ang: 0, speed: I.truckSpeed, max: I.truckSpeed * (tier === 'major' ? 1.2 : 1), hp: I.truckHp, maxHp: I.truckHp, inc: inc.id, reckless: true, payload: pick(['escape', 'robbery', 'decoy']), color: '#f1f3f5' };
      S.vehicles.push(v); inc.vehicle = v.id; inc.vehicleKind = 'truck'; logSpawn(o.x, o.y, 'truck');
      var n = clamp(Math.round(ri(I.drones[0], I.drones[1]) * k * (tier === 'major' ? 1.5 : 1)) + S.iteron.mods.extraScouts, 1, 8);
      for (i = 0; i < n; i++) { spawnRobot('scout', o.x, o.y, inc.id, { st: 'engage' }); logSpawn(o.x, o.y, 'scout'); }
      ['stop_vehicle', 'disable_drones', 'protect_civilians', 'prevent_damage'].forEach(function (id) { addObj(inc, id); });
    } else if (type === 'bank_robbery') {
      var bank = doorPt('bank'), park = { x: bank.x, y: C.map.roadsY[1] + 1 };
      var Vb = validOrigins('road'); if (!Vb.length) return null; o = pick(Vb);
      var pnode = nearestNode(park.x, park.y), r3 = route(o.node, pnode, true); if (!r3) return null;
      inc = newInc(type, 'major', 'ledger', { x: bank.x, y: bank.y, b: 'bank' }, o, why); inc.cause = (why === 'calendar' ? 'Vault Vesper\'s seven-day heist plan reached its strike day.' : 'A crew using Iteron-built robots (bought by Vault Vesper) targets the bank.') + ' Their van entered from ' + o.name + '.';
      v = { id: nid('v'), kind: 'van', route: r3, ri: 1, x: o.x, y: o.y, ang: 0, speed: I.vanSpeed, max: I.vanSpeed, hp: I.vanHp, maxHp: I.vanHp, inc: inc.id, loot: false, color: '#343a40', phaseGoal: 'bank', reckless: true };
      S.vehicles.push(v); inc.vehicle = v.id; inc.vehicleKind = 'getaway van'; inc.phase = 'approach'; logSpawn(o.x, o.y, 'van');
      var nI = clamp(Math.round(ri(I.crew.interceptor[0], I.crew.interceptor[1]) * k), 1, 5); for (i = 0; i < nI; i++) spawnRobot('interceptor', o.x, o.y, inc.id, { riding: v.id, st: 'engage' });
      spawnRobot('commander', o.x, o.y, inc.id, { riding: v.id, st: 'engage' }); S.vesper.dronesBought += nI + 1; S.iteron.resources += 10 * (nI + 1);
      ['protect_civilians', 'stop_commander', 'stop_vehicle', 'recover_loot', 'prevent_damage'].forEach(function (id) { addObj(inc, id); });
    } else if (type === 'robot_ambush') {
      var hw = {}; Object.keys(S.heat).forEach(function (z) { hw[z] = z === 'foundry' ? 0 : 5 + S.heat[z]; });   // Iteron studies Mella's habits: he targets where she spends time
      var tz = wpick(hw) || 'plaza', tb = C.buildings.filter(function (b) { return b.zone === tz && b.kind !== 'villain'; });
      var tbb = tb.length ? (tb.filter(function (b) { return b.kind === 'infra' || b.kind === 'hq' || b.kind === 'shop' || b.kind === 'bank'; })[0] || pick(tb)) : null;
      var tgt = tbb ? Object.assign(doorPt(tbb.id), { b: tbb.id }) : { x: C.places.plaza[0], y: C.places.plaza[1] };
      var Vr = validOrigins('robot', tgt); if (!Vr.length) return null; o = Vr[0];
      inc = newInc(type, tier, zoneAt(tgt.x, tgt.y), tgt, o, why); inc.cause = 'Dr. Iteron sent generation ' + S.iteron.gen + ' robots out of ' + o.name + ' toward ' + (tbb ? tbb.name : 'Skate Plaza') + (S.heat[tz] > 60 ? ', a place Mella spends a lot of time.' : '.');
      var comp = tier === 'major' ? I.major : I.minor;
      Object.keys(comp).forEach(function (cls) { var n2 = clamp(Math.round(ri(comp[cls][0], comp[cls][1]) * (cls === 'commander' ? 1 : k)) + (cls === 'scout' ? S.iteron.mods.extraScouts : 0), 0, 8); if (comp[cls][1] === 0) n2 = 0;
        for (var j = 0; j < n2; j++) { spawnRobot(cls, o.x + rr(-.3, .3), o.y + rr(-.3, .3), inc.id, cls === 'scout' && rnd() < S.iteron.mods.disguise ? { disguised: true } : null); logSpawn(o.x, o.y, cls); } });
      ['protect_civilians', 'prevent_damage'].forEach(function (id) { addObj(inc, id); }); if (comp.commander[1] > 0) addObj(inc, 'stop_commander');
    } else if (type === 'scout_sighting') {
      var Vs = validOrigins('robot'); if (!Vs.length) return null; o = pick(Vs); var z2 = wpick(Object.assign({}, S.heat, { foundry: 0 })) || 'plaza', zb = C.buildings.filter(function (b) { return b.zone === z2 && b.kind !== 'villain'; }), b2 = zb.length ? pick(zb) : C.buildings[0], tp = doorPt(b2.id);
      inc = newInc(type, 'minor', z2, tp, o, why); inc.cause = 'A drone that looks like a delivery drone left ' + o.name + ' and is watching ' + b2.name + '.';
      spawnRobot('scout', o.x, o.y, inc.id, { disguised: true, st: 'travel', watcher: true }); logSpawn(o.x, o.y, 'scout');
    }
    if (!inc) return null;
    var Dr = S.director; Dr.last[type] = S.t; Dr.recent.unshift(type); Dr.recent = Dr.recent.slice(0, 4); Dr.recentZones.unshift(inc.zone); Dr.recentZones = Dr.recentZones.slice(0, 4);
    Dr.log.push({ t: +S.t.toFixed(2), clock: inc.startClock, id: inc.id, type: type, tier: tier, zone: inc.zone, origin: inc.origin.name, originDistTiles: +distPlayer(inc.origin.x, inc.origin.y).toFixed(2), why: why }); if (Dr.log.length > 300) Dr.log.shift();
    if (type !== 'scout_sighting' && !inc.div) feed((type === 'vehicle_chase' ? 'Something is wrong: a truck is speeding toward ' + C.zones[inc.zone].name + ' with drones behind it.' : type === 'bank_robbery' ? 'A dark van is heading for First Ledger Bank.' : 'Iteron robots are moving toward ' + C.zones[inc.zone].name + '.'), 'alert');
    if (type !== 'scout_sighting') considerResponse(inc);
    emit('incident', inc); return inc;
  }
  function stepIncident(inc, dt) {
    if (inc.div) return divStepIncident(inc, dt);
    var v = inc.vehicle && S.vehicles.filter(function (q) { return q.id === inc.vehicle; })[0];
    if (distPlayer(inc.x, inc.y) < 10) inc.mellaNearSec += dt;
    if (v && !v.exited && !v.stopped) { inc.x = v.x; inc.y = v.y; if (v.protT > 0) v.protT -= dt; }
    if (inc.type === 'bank_robbery') {
      if (inc.phase === 'approach' && v && v.stopped) inc.phase = 'escape';
      else if (inc.phase === 'approach' && v && v.parked) { inc.phase = 'robbing'; inc.robT = C.incidents.bank_robbery.robTime;
        S.robots.forEach(function (r) { if (r.riding === v.id) { r.riding = null; r.st = 'engage'; r.x = v.x + rr(-1, 1); r.y = v.y - rr(.8, 1.6); } });
        feed('Robbery in progress at First Ledger Bank!', 'alert'); S.zones.ledger.crime = clamp(S.zones.ledger.crime + 5, 0, 100);
        S.civs.forEach(function (c) { if (c.inside === 'bank') { var dp = doorPt('bank'); c.inside = null; c.x = dp.x; c.y = dp.y; c.needs.safety = .1; c.think = 0; inc.witnesses[c.id] = 1; } }); }
      if (inc.phase === 'robbing') { inc.robT -= dt; if (inc.robT <= 0 || (v && v.stopped)) { inc.phase = 'escape';
          if (v && !v.stopped) { v.loot = true; v.phaseGoal = 'exit'; var here = nearestNode(v.x, v.y), ex = pick(edgeNodes().filter(function (e) { return hyp(G.nodes[e].x - inc.origin.x, G.nodes[e].y - inc.origin.y) > 10; })); var r = route(here, ex, true);
            if (r) { v.route = r; v.ri = 1; } v.parked = false; v.max = C.incidents.bank_robbery.vanSpeed * 1.25; v.ranRed = false;
            S.robots.forEach(function (rb) { if (rb.inc === inc.id && rb.st !== 'down' && rb.cls === 'commander' && D(rb, v) < 6) rb.riding = v.id; }); feed('The getaway van is fleeing with the money!', 'alert'); } } }
    }
    S.items.forEach(function (it) { if (it.inc === inc.id) { it.t -= dt; if (it.t <= 0) { it.gone = true; objFail(inc, 'capture_prototype'); damageBuilding((nearestBuilding(it.x, it.y, 8) || G.bmap.office).id, 4, inc); feed('The prototype core self-destructed.', 'city'); } } });
    S.items = S.items.filter(function (it) { return !it.gone; });
    var live = S.robots.filter(function (r) { return r.inc === inc.id && r.st !== 'down' && !r.gone; });
    if (inc.type === 'scout_sighting') { var sc = live[0]; if (sc && !sc.fleeing && S.t > inc.start + 45) { sc.fleeing = true; sc.trackT = 0; addObj(inc, 'track_signal'); } }
    inc.commanderDown = inc.objectives.some(function (o) { return o.id === 'stop_commander' && o.state === 'done'; });
    if (inc.commanderDown && !inc.fledAfterCmd) { inc.fledAfterCmd = true; live.filter(function (r) { return r.cls === 'scout' && !r.fleeing; }).slice(0, 1).forEach(startFlee); }
    if (v && v.exited) { objFail(inc, 'stop_vehicle'); objFail(inc, 'recover_loot'); }
    var vDone = !v || v.exited || (v.stopped && !v.loot && !(v.payload && !v.payloadSeen));
    var itemsLeft = S.items.some(function (it) { return it.inc === inc.id; });
    var hostilesLeft = live.length, injuredLeft = S.supers.some(function (s) { return s.state === 'injured' && s.injInc === inc.id; });
    if (inc.phase !== 'approach' && inc.phase !== 'robbing' && hostilesLeft === 0 && vDone && !itemsLeft && !injuredLeft) return resolve(inc, 'cleared');
    if (S.t >= inc.deadline && inc.phase !== 'robbing') return resolve(inc, 'deadline');
  }
  function resolve(inc, how) {
    var v = inc.vehicle && S.vehicles.filter(function (q) { return q.id === inc.vehicle; })[0];
    if (inc.div) divBeforeResolve(inc);
    var anyone = inc.mellaNearSec > 3 || inc.mellaActs > 0 || inc.heroes.some(function (h) { var s = S.supers.filter(function (x) { return x.id === h; })[0]; return s && s.state !== 'alerted'; });
    if (inc.objectives.some(function (o) { return o.id === 'protect_civilians'; })) { if (inc.civInjured === 0 && anyone) objDone(inc, 'protect_civilians', inc.mellaNearSec > 10 ? 'mella' : inc.heroes[0]); else objFail(inc, 'protect_civilians'); }
    if (inc.objectives.some(function (o) { return o.id === 'prevent_damage'; })) { if (inc.dmg <= 8 && anyone) objDone(inc, 'prevent_damage', inc.mellaNearSec > 10 ? 'mella' : inc.heroes[0] || null); else objFail(inc, 'prevent_damage'); }
    ['stop_commander', 'disable_drones', 'track_signal', 'capture_prototype', 'stop_vehicle', 'recover_loot', 'save_hero'].forEach(function (id) { objFail(inc, id); });
    S.supers.forEach(function (s) { if (s.state === 'injured' && s.injInc === inc.id) { var robotsStand = S.robots.some(function (r) { return r.inc === inc.id && r.st !== 'down' && !r.riding && D(r, s) < 6; });
      if (robotsStand && rnd() < .5) { s.state = 'captured'; s.capturedUntil = absMin() + 1440; S.iteron.captured.push(s.id); inc.notes.push(sdef(s.id).codename + ' was captured by Iteron.'); }
      else { s.state = 'recover'; var cl = doorPt('clinic'); setPath(s, cl.x, cl.y); inc.notes.push(sdef(s.id).codename + ' was carried to the clinic.'); } } });
    S.robots.forEach(function (r) { if (r.inc === inc.id && r.st !== 'down') { if (!r.fleeing && r.tracked == null) r.trackInc = null; r.fleeing = true; r.riding = null; r.inc = null; } });
    var done = inc.objectives.filter(function (o) { return o.state === 'done'; }).length, failed = inc.objectives.filter(function (o) { return o.state === 'failed'; }).length, score = done / Math.max(1, done + failed);
    var outcome = inc.type === 'scout_sighting' ? (done ? 'tracked' : 'unnoticed') : score >= .7 ? 'contained' : score >= .35 ? 'partial' : 'failed';
    var mella = inc.mellaActs > 0 || inc.mellaNearSec > 10;
    var Z = S.zones[inc.zone], cons = [];
    inc.objectives.forEach(function (o) { var c = C.objectives[o.id][o.state === 'done' ? 'done' : 'failed'] || {}; for (var k in c) applyCons(Z, k, c[k], o, inc, cons); });
    if (inc.type === 'bank_robbery' && outcome !== 'contained') { Z.security = Math.min(3, Z.security + 1); cons.push('city security robots will patrol Ledger Row from tomorrow'); }
    if (inc.type !== 'scout_sighting') { if (outcome === 'failed') { Z.faction.iteron = clamp(Z.faction.iteron + 6, 0, 100); Z.faction.city = clamp(Z.faction.city - 6, 0, 100); } else { Z.faction.iteron = clamp(Z.faction.iteron - 3, 0, 100); Z.faction.city = clamp(Z.faction.city + 3, 0, 100); } if (inc.type === 'bank_robbery') Z.faction.vesper = clamp(Z.faction.vesper + (outcome === 'contained' ? -5 : 8), 0, 100); }
    if (mella) S.iteron.encounters++;
    var heroNames = inc.heroes.map(function (h) { return sdef(h).codename; });
    var byWho = {}; inc.objectives.forEach(function (o) { if (o.state === 'done' && o.by) byWho[o.by] = (byWho[o.by] || []).concat([o.label.toLowerCase()]); });
    var parts = Object.keys(byWho).map(function (w) { return nameOf(w) + ': ' + byWho[w].join(', '); });
    var H = { id: inc.id, type: inc.type, label: inc.label, tier: inc.tier, zone: inc.zone, zoneName: C.zones[inc.zone].name, when: inc.startClock, day: clock().day, end: stamp(), outcome: outcome, how: how, mella: mella,
      heroes: inc.heroes.slice(), heroNames: heroNames, cause: inc.cause, origin: inc.origin.name, objectives: inc.objectives.map(function (o) { return { id: o.id, label: o.label, state: o.state, by: o.by }; }),
      civInjured: inc.civInjured, damage: Math.round(inc.dmg), notes: inc.notes.slice(), consequences: cons, payload: inc.payload || null };
    H.text = inc.startClock + ' – ' + stamp().slice(4) + ' · ' + C.zones[inc.zone].name + ' · ' + inc.label + ' — ' + outcome.toUpperCase() + '. ' + (parts.length ? parts.join('; ') + '. ' : 'Nobody completed an objective. ') + (mella ? '' : 'Mella was not there. ') + (inc.civInjured ? inc.civInjured + ' civilian(s) hurt. ' : '') + inc.notes.join(' ');
    S.history.push(H); if (S.history.length > 250) S.history.shift();
    S.civs.forEach(function (c) { var w = inc.witnesses[c.id], local = G.bmap[c.home].zone === inc.zone || (G.bmap[c.job] && G.bmap[c.job].zone === inc.zone);
      if (!w && !local) return; if (inc.type === 'scout_sighting') return;
      if (c.mem.some(function (m) { return m.inc === inc.id && (m.k === 'rescued' || m.k === 'hurt'); })) return;
      var k = w ? (mella ? 'saw_help' : 'absent') : 'heard', vv = mella ? (outcome === 'failed' ? .1 : .6) : (local ? -.3 : 0); if (!w && mella) vv = .4;
      Brain.remember(c, { t: Math.floor(absMin()), k: k, inc: inc.id, v: vv, txt: 'the ' + inc.label.toLowerCase() + ' in ' + C.zones[inc.zone].name }); c.opinion = clamp(c.opinion + vv * 10, -100, 100); });
    S.supers.forEach(function (s) { if (inc.heroes.indexOf(s.id) >= 0) { Brain.remember(s, { t: Math.floor(absMin()), k: 'fought', inc: inc.id, v: outcome === 'contained' ? .5 : -.2, mella: mella }); if (mella) s.mellaRel += outcome === 'failed' ? 1 : 3; s.fatigue += .15; } });
    if (mella && inc.type !== 'scout_sighting') { var eff = [{ layer: 'knowledge', key: 'city.' + inc.zone + '.incidents', kind: 'record', op: 'delta', amount: 1, text: H.text.slice(0, 180) }];
      inc.objectives.forEach(function (o) { if (o.state === 'done' && o.by === 'mella' && o.id === 'save_hero') inc.injuredHeroes.forEach(function (h) { eff.push({ layer: 'relationships', key: 'rel.npc.' + h, kind: 'upgrade', op: 'delta', amount: 2, text: 'Mella saved ' + sdef(h).codename }); }); });
      S.outbox.push({ eventId: 'your:living:' + S.saveId + ':' + inc.id, summary: inc.label + ' — ' + outcome + ' (' + C.zones[inc.zone].name + ')', effects: eff }); }
    S.incidents = S.incidents.filter(function (i) { return i !== inc; });
    if (v) { v.inc = null; v.loot = false; if (v.stopped) v.towT = 60; }
    S.supers.forEach(function (s) { if (s.inc === inc.id && (s.state === 'alerted' || s.state === 'respond' || s.state === 'engage')) { s.inc = null; s.obj = null; s.state = 'patrol'; s.wp = null; } });
    feed(H.text, 'history'); emit('resolved', H); return H;
  }
  function applyCons(Z, k, val, o, inc, cons) {
    if (k === 'confidence' || k === 'crime' || k === 'infrastructure' || k === 'economy') { Z[k] = clamp(Z[k] + val, 0, 100); cons.push((val > 0 ? '+' : '') + val + ' ' + k + ' (' + o.label.toLowerCase() + ' ' + o.state + ')'); }
    else if (k === 'security') { Z.security += val; cons.push('security +' + val); }
    else if (k === 'research') cons.push('technology research +' + val + ' (Metal hook)');
    else if (k === 'heroRel') { if (o.by === 'mella' || o.state === 'failed') inc.injuredHeroes.forEach(function (h) { var s = S.supers.filter(function (x) { return x.id === h; })[0]; if (s) s.mellaRel += val; }); cons.push('hero relationship ' + (val > 0 ? '+' : '') + val); }
    else if (k === 'labReveal') { S.labRevealed = true; cons.push("Iteron's next laboratory revealed"); }
  }
  sim.note = function (text) { histNote(String(text).slice(0, 200)); };
  function histNote(text) { S.history.push({ id: nid('note'), type: 'note', label: 'City note', zone: null, when: stamp(), day: clock().day, outcome: 'note', mella: false, text: stamp() + ' · ' + text, heroes: [], heroNames: [], objectives: [] }); if (S.history.length > 250) S.history.shift(); }

  /* =============================================================== World Director: tunable event director + story calendar */
  function directorStep(dt) {
    var Dr = S.director, M = C.director.modes[Dr.mode], DC = C.director;
    function act(tier) { return S.incidents.filter(function (i) { return i.tier === tier; }).length; }
    if (S.t >= Dr.nextMinor) { if (act('minor') < DC.maxActive.minor && tryDirector('minor')) Dr.nextMinor = S.t + rr(M.minorMin[0], M.minorMin[1]) * 60; else { Dr.nextMinor = S.t + DC.deferSec; Dr.deferred = (Dr.deferred || 0) + 1; } }
    if (S.t >= Dr.nextMajor) { if (act('major') < DC.maxActive.major && tryDirector('major')) Dr.nextMajor = S.t + rr(M.majorMin[0], M.majorMin[1]) * 60; else { Dr.nextMajor = S.t + DC.deferSec; Dr.deferred = (Dr.deferred || 0) + 1; } }
    Dr.nextPatrolCheck -= dt;
    if (Dr.nextPatrolCheck <= 0) { Dr.nextPatrolCheck = 20; var pats = S.robots.filter(function (r) { return r.patrol && !r.gone; }).length;
      if (rnd() < .05) Dr.patrolTarget = ri(M.patrols[0], M.patrols[1]);
      if (pats < Dr.patrolTarget) { var o = validOrigins('robot'); if (o.length) { var p = pick(o); spawnRobot('scout', p.x, p.y, null, { patrol: true, hostile: false, st: 'patrol', life: rr(180, 420), disguised: rnd() < S.iteron.mods.disguise + .3, home: { x: p.x, y: p.y } }); logSpawn(p.x, p.y, 'patrol'); } } }
  }
  function tryDirector(tier) {
    var DC = C.director, w = clone(tier === 'minor' ? DC.minorTypes : DC.majorTypes), Dr = S.director;
    for (var k in w) { var cd = (DC.cooldownMin[k] || 0) * 60; if (Dr.last[k] != null && S.t - Dr.last[k] < cd) w[k] = 0; if (Dr.recent[0] === k) w[k] *= DC.repeatPenalty[0]; else if (Dr.recent[1] === k) w[k] *= DC.repeatPenalty[1];
      if (k === 'bank_robbery' && S.vesper.stage === 'idle') w[k] *= .25; if (S.incidents.some(function (i) { return i.type === k; })) w[k] = 0; }
    var type = wpick(w); if (!type) return false; return !!startIncident(type, tier, 'director');
  }
  sim.setMode = function (m) { if (!C.director.modes[m]) return false; var Dr = S.director, M = C.director.modes[m]; Dr.mode = m; Dr.patrolTarget = ri(M.patrols[0], M.patrols[1]);
    Dr.nextMinor = Math.min(Dr.nextMinor, S.t + rr(M.minorMin[0], M.minorMin[1]) * 60); Dr.nextMajor = Math.min(Dr.nextMajor, S.t + rr(M.majorMin[0], M.majorMin[1]) * 60); feed('Director set to ' + M.label + '.', 'info'); return true; };
  function calendarStep() {
    var c = clock(), Cal = C.calendar, cal = S.cal;
    if (c.day > 1 && (c.day - 1) % Cal.iteronGenerationEveryDays === 0 && c.minute >= Cal.iteronDeployMinute && !cal.genDone[c.day]) { cal.genDone[c.day] = 1; newGeneration(); }
    Cal.vesperPlan.forEach(function (p) { var week = Math.floor((c.day - 1) / 7), key = p.stage + ':' + week; if (((c.day - 1) % 7) + 1 === p.day && c.minute >= (p.minute || 9 * 60) && !cal.vesperDone[key]) {
        if (p.stage === 'strike') { var cur = S.incidents.filter(function (x) { return x.type === 'bank_robbery'; })[0];
          if (cur) { cur.why = 'calendar'; S.director.log.forEach(function (l) { if (l.id === cur.id) l.why = 'calendar'; }); } else if (!startIncident('bank_robbery', 'major', 'calendar')) return;   // retry next step until a far-enough origin exists
          cal.vesperDone[key] = 1; S.vesper.stage = 'idle'; return; }
        cal.vesperDone[key] = 1; S.vesper.stage = p.stage;
        { histNote('Clue: ' + p.text); feed('Rumor: ' + p.text, 'clue'); S.civs.filter(function (k) { return k.tr.curious > .6; }).forEach(function (k) { Brain.remember(k, { t: Math.floor(absMin()), k: 'clue', v: 0, txt: p.text }); }); } } });
    if (cal.lastDay !== c.day) { cal.lastDay = c.day; dailyCity(); }
  }
  function newGeneration() {
    var I = S.iteron, L = I.learn, tot = 0, k; for (k in L) tot += L[k];
    var hit = tot ? L.hit / tot : 0, blast = tot ? L.blast / tot : 0, cap = C.iteron.adaptCap;
    I.gen++; I.resources += C.iteron.perGenResources; I.mods = { meleeGuard: +(Math.min(cap, hit * .6)).toFixed(3), blastDodge: +(Math.min(cap, blast * .6)).toFixed(3), extraScouts: I.observedSec < 120 ? 1 : 0, disguise: +Math.min(.6, C.iteron.disguiseBase + C.iteron.disguisePerGen * (I.gen - 1)).toFixed(3) };
    var txt = 'Dr. Iteron deployed robot generation ' + I.gen + '. He studied ' + tot + ' of Mella\'s observed moves: commanders now resist melee by ' + Math.round(I.mods.meleeGuard * 100) + '%, interceptors dodge blasts ' + Math.round(I.mods.blastDodge * 100) + '% of the time' + (I.mods.extraScouts ? ', and he is sending extra scouts because he has not seen enough of Mella' : '') + '.';
    histNote(txt); feed(txt, 'villain'); I.learnAtGen = clone(L); for (k in L) L[k] = Math.round(L[k] * .5); I.observedSec = 0;
    startIncident('robot_ambush', 'major', 'calendar');
  }
  sim.newGeneration = newGeneration;
  function dailyCity() {
    Object.keys(S.zones).forEach(function (z) { var Z = S.zones[z]; var have = S.robots.filter(function (r) { return r.security && r.zone === z; }).length, want = Math.min(Z.security, 3);
      for (var i = have; i < want; i++) { var b = C.buildings.filter(function (x) { return x.zone === z; })[0], p = doorPt(b.id); S.robots.push({ id: nid('sec'), cls: 'security', security: true, zone: z, x: p.x, y: p.y, hp: 60, max: 60, st: 'patrol', hostile: false, cyc: 0 }); }
      if (want > have) feed('New city security robots now patrol ' + C.zones[z].name + '.', 'city');
      if (want < have) { var extra = have - want; S.robots = S.robots.filter(function (r) { if (r.security && r.zone === z && extra > 0) { extra--; return false; } return true; }); }
      Z.security = Math.max(0, Z.security - 1); });   // PROPOSED: extra security winds down one level per quiet day
  }
  function cityStep(dt) {   // City AI: repairs, reopenings, drifts, road closures, repair crew
    var c = clock(), gm = dt * C.clock.gameMinPerSec, dayTime = c.minute >= C.damage.repairStart && c.minute < C.damage.repairEnd;
    var crew = S.vehicles.filter(function (v) { return v.kind === 'repair'; })[0];
    if (dayTime && !crew) { var worst = C.buildings.map(function (b) { var B = S.buildings[b.id]; return { id: b.id, d: B.dmg, p: B.dmg + (B.closed ? 30 : 0) + (/shop|food|bank|clinic|infra/.test(b.kind) ? 20 : 0) + (S.city && S.city.repairGoal === b.id ? 100 : 0) }; }).filter(function (x) { return x.d > 0; }).sort(function (a, b) { return b.p - a.p || (a.id < b.id ? -1 : 1); })[0];   // unfinished job first, then closed essential buildings
      if (worst) { var dep = nearestNode(doorPt('repair').x, doorPt('repair').y), tgt = nearestNode(doorPt(worst.id).x, doorPt(worst.id).y), r = dep === tgt ? null : route(dep, tgt, false);
        var n0 = G.nodes[dep]; S.vehicles.push({ id: nid('v'), kind: 'repair', route: r || [dep], ri: 1, x: n0.x, y: n0.y, ang: 0, speed: 0, max: 4, hp: 99, repairGoal: worst.id, color: '#f59f00', parked: !r }); feed('A repair crew is heading to ' + G.bmap[worst.id].name + '.', 'city'); } }
    if (crew && crew.parked) { var B = S.buildings[crew.repairGoal]; if (dayTime) B.dmg = Math.max(0, B.dmg - C.damage.repairPerGameHour / 60 * gm); if (B.dmg <= 0 || !dayTime) { crew.exited = true; S.city = S.city || {}; S.city.repairGoal = B.dmg > 0 ? crew.repairGoal : null; if (B.dmg <= 0) feed(G.bmap[crew.repairGoal].name + ' is fully repaired.', 'city'); updateRoadClosures(); } }
    C.buildings.forEach(function (b) { var B = S.buildings[b.id]; if (B.closed && B.dmg <= C.damage.reopenAt) { B.closed = false; feed(b.name + ' has reopened.', 'city'); updateRoadClosures(); } });
    Object.keys(S.zones).forEach(function (z) { var Z = S.zones[z], bs = C.buildings.filter(function (b) { return b.zone === z; }), dm = bs.reduce(function (a, b) { return a + S.buildings[b.id].dmg; }, 0) / Math.max(1, bs.length);
      Z.damage = +dm.toFixed(2); Z.infrastructure = clamp(Z.infrastructure + ((100 - dm) - Z.infrastructure) * Math.min(1, gm / 240), 0, 100);
      Z.confidence = clamp(Z.confidence + (65 - Z.confidence) * gm / 720 - dm * gm / 6000, 0, 100); Z.crime = clamp(Z.crime + (20 - Z.crime) * gm / 720, 0, 100); Z.faction.iteron = clamp(Z.faction.iteron - gm / 288, 0, 100); Z.faction.vesper = clamp(Z.faction.vesper - gm / 288, 0, 100); Z.faction.city = clamp(100 - Math.max(Z.faction.iteron, Z.faction.vesper), 0, 100);
      var shut = bs.filter(function (b) { return (b.kind === 'shop' || b.kind === 'food' || b.kind === 'bank') && S.buildings[b.id].closed; }).length; Z.economy = clamp(Z.economy + ((70 - shut * 20) - Z.economy) * gm / 600, 0, 100); });
  }
  sim.hooks = function () {   // cross-world hooks (data only in this slice; nothing is written to other games)
    return { valenceLife: { cornerMarketOpen: !S.buildings.store.closed, steamlineCafeOpen: !S.buildings.cafe.closed, note: 'A damaged business could affect Valence Life (owner §6) — PROPOSED hook, not wired' },
      metal: { iteronPrototypeCores: S.research, note: 'Captured robot components could become usable technology in Metal (owner §6) — PROPOSED hook, not wired' },
      creatures: { note: 'Biological escapes (Dr. Sprawl) are not built in this slice' }, passportEventsQueued: S.outbox.length };
  };

  /* =============================================================== THE DIVIDER — the hero manipulator (owner spec t83u §2; owner picked him next, t88s472)
     PROPOSED ORIGINAL villain. He never fights. He plans with a resource budget, plants forged evidence, rents Iteron drones to broadcast doctored
     footage, turns the five supers against each other (or against Mella), drags public opinion down through zone confidence and hero reputation,
     and recruits a rival team. He adapts to how he was beaten. All numbers PROPOSED (config: divider). */
  function divInit() {
    S.divider = { resources: C.divider.baseResources, exposure: 0, dormantUntil: 0, planDay: 0, plannedOp: null, plannedAt: 0, ops: 0, rival: null,
      learn: { exposedByMella: 0, exposedByHeroes: 0, deescalated: 0, repProtected: 0, succeeded: 0, failedBy: {} },
      mods: { forgery: 1, targetMella: C.divider.targetMellaBase, drones: 1 }, history: [] };
    S.rep = { mella: C.divider.repStart }; C.supers.forEach(function (d) { S.rep[d.id] = C.divider.repStart; });
  }
  function repName(id) { return id === 'mella' ? 'Mella' : sdef(id).codename; }
  function divAdapt() {   // learning: how was he beaten? (PROPOSED rules)
    var V = S.divider, L = V.learn, DV = C.divider;
    V.mods.forgery = +Math.min(DV.forgeryMax, 1 + .5 * (L.exposedByMella + L.exposedByHeroes * .5)).toFixed(2);   // better forgeries the more he is exposed
    V.mods.targetMella = +Math.min(.85, DV.targetMellaBase + .15 * L.exposedByMella).toFixed(2);                   // Mella keeps exposing him -> he frames Mella
    V.mods.drones = Math.min(3, 1 + Math.floor((L.exposedByHeroes + L.repProtected) / 2));                         // heroes keep protecting reputations -> more broadcast drones
  }
  function divPlan() {
    var V = S.divider, DV = C.divider, L = V.learn, M = S.director.mode;
    V.resources = Math.min(DV.maxResources, V.resources + DV.dailyResources);
    if (rnd() > DV.opsPerDay[M]) { V.history.push({ day: clock().day, plan: 'lie low' }); return; }
    var w = { frame_up: V.resources >= DV.cost.frame_up ? 1 + L.deescalated * .35 : 0,          // de-escalations keep ending his fights -> forge more
              staged_fight: V.resources >= DV.cost.staged_fight ? 1 + L.repProtected * .35 + L.succeeded * .1 : 0,   // reputations keep being protected -> stage fights
              recruit: !V.rival && V.resources >= DV.cost.recruit ? .7 : 0 };
    var op = wpick(w); if (!op) { V.history.push({ day: clock().day, plan: 'saving resources' }); return; }
    if (op === 'recruit') { divRecruit(); return; }
    V.plannedOp = op; V.plannedAt = absMin() + rr(DV.delayMin[0], DV.delayMin[1]); V.history.push({ day: clock().day, plan: op, at: Math.round(V.plannedAt) });
  }
  function divRecruit() {
    var V = S.divider; V.resources -= C.divider.cost.recruit;
    var cand = S.supers.filter(function (s) { return s.state !== 'captured'; }).map(function (s) { var r = 0; for (var k in s.rel) r += s.rel[k]; return { s: s, r: r + s.mellaRel + (sdef(s.id).temperament === 'destructive' ? -20 : 0) }; }).sort(function (a, b) { return a.r - b.r || (a.s.id < b.s.id ? -1 : 1); })[0];
    if (!cand) return; V.rival = { id: cand.s.id, name: C.divider.rivalTeamName, until: absMin() + C.divider.rivalDays * 1440 };
    var t = 'Clue: ' + sdef(cand.s.id).codename + ' has been seen with an anonymous sponsor and now calls a crew "' + C.divider.rivalTeamName + '". Someone is recruiting a rival team.';
    histNote(t); feed(t, 'clue'); V.history.push({ day: clock().day, plan: 'recruit', who: cand.s.id });
  }
  function dividerStep(dt) {
    if (!S.divider) divInit(); var V = S.divider, c = clock(), am = absMin();
    if (V.rival && am >= V.rival.until) { feed(C.divider.rivalTeamName + ' quietly broke up.', 'city'); V.rival = null; }
    if (V.dormantUntil && am < V.dormantUntil) return;
    if (V.planDay !== c.day && c.minute >= C.divider.planMinute) { V.planDay = c.day; divPlan(); }
    if (V.plannedOp && am >= V.plannedAt && !S.incidents.some(function (i) { return i.div; })) {
      if (startIncident(V.plannedOp, C.incidents[V.plannedOp].tier, 'divider')) V.plannedOp = null; else V.plannedAt = am + 5; }
    S.incidents.forEach(function (i) { if (i.div) divTick(i, dt); });
    for (var k in S.rep) S.rep[k] = clamp(S.rep[k] + (C.divider.repStart - S.rep[k]) * dt * C.clock.gameMinPerSec / 4320, 0, 100);   // reputations heal slowly (3 game days)
  }
  function siteFar() {   // a plausible location (building door) that is not near Mella
    var bs = C.buildings.filter(function (b) { if (b.kind === 'villain') return false; var p = doorPt(b.id); return spawnOK(p.x, p.y); });
    if (!bs.length) return null; var b = pick(bs), p = doorPt(b.id); return { x: p.x, y: p.y + .4, b: b.id, name: b.name };
  }
  function rentDrones(inc, n, cls, extra) {   // Iteron <-> Divider: he rents Iteron hardware; Iteron gets resources and watches the heroes fight
    var o = validOrigins('robot', inc.target); if (!o.length) return 0; var org = o[0];
    for (var i = 0; i < n; i++) { spawnRobot(cls, org.x + rr(-.3, .3), org.y + rr(-.3, .3), inc.id, Object.assign({ disguised: true, rented: true }, extra || {})); logSpawn(org.x, org.y, cls); }
    S.iteron.resources += C.divider.iteronFee * n; inc.notes.push('The Divider rented ' + n + ' Iteron ' + (cls === 'scout' ? 'drone' : 'interceptor') + (n > 1 ? 's' : '') + ' (out of ' + org.name + ').'); return n;
  }
  function startDivider(type, why) {
    var V = S.divider || (divInit(), S.divider), DV = C.divider, site = siteFar(); if (!site) return null;
    if (type === 'frame_up') {
      var tgt = rnd() < V.mods.targetMella ? 'mella' : S.supers.filter(function (s) { return s.state !== 'captured'; }).sort(function (a, b) { return S.rep[b.id] - S.rep[a.id] || (a.id < b.id ? -1 : 1); })[0].id;
      var inc = newInc('frame_up', 'minor', G.bmap[site.b].zone, site, { x: site.x, y: site.y, name: site.name }, why); inc.div = { op: type, target: tgt, rep0: S.rep[tgt], exposed: null, forgery: V.mods.forgery, turned: {} };
      inc.cause = 'Doctored footage "shows" ' + repName(tgt) + ' wrecking ' + site.name + '. Forged evidence was planted at the door, and drones are broadcasting the clip. Somebody wants the city to turn on ' + repName(tgt) + '.';
      S.items.push({ id: nid('it'), kind: 'evidence', x: site.x + .6, y: site.y + .3, inc: inc.id, t: 1e9, prog: 0, label: 'forged evidence' }); logSpawn(site.x, site.y, 'evidence');
      rentDrones(inc, V.mods.drones + (S.director.mode === 'chaos' ? 1 : 0), 'scout', { broadcast: true });
      ['expose_evidence', 'protect_reputation', 'disable_drones'].forEach(function (id) { addObj(inc, id); });
      damageBuilding(site.b, 6, inc);   // the "evidence" is a real, small act of vandalism
      V.resources -= DV.cost.frame_up; feed('Something is wrong: clips of ' + repName(tgt) + ' "wrecking" ' + site.name + ' are all over the district.', 'alert');
      return inc; }
    // staged_fight: pick two supers with the worst mutual relationship (or a super against Mella when he is targeting her)
    var avail = S.supers.filter(function (s) { return s.state === 'patrol' && s.hp > s.max * .5; }); if (avail.length < 1) return null;
    var pair = null;
    if (rnd() < V.mods.targetMella * .6) { var sm = avail.slice().sort(function (a, b) { return a.mellaRel - b.mellaRel || (a.id < b.id ? -1 : 1); })[0]; if (sm.mellaRel < 6) pair = [sm.id, 'mella']; }
    if (!pair && avail.length === 1) pair = [avail[0].id, 'mella'];
    if (!pair) { if (avail.length < 2) return null; var best = null; avail.forEach(function (a) { avail.forEach(function (b) { if (a.id >= b.id) return; var r = (a.rel[b.id] || 0) + (b.rel[a.id] || 0) + rr(-6, 6); if (!best || r < best.r) best = { r: r, a: a.id, b: b.id }; }); }); pair = [best.a, best.b]; }
    var inc2 = newInc('staged_fight', 'major', G.bmap[site.b].zone, site, { x: site.x, y: site.y, name: site.name }, why);
    inc2.div = { op: type, fighters: pair.slice(), calm: {}, exposed: null, forgery: V.mods.forgery, ended: null };
    inc2.cause = 'A forged message convinced ' + repName(pair[0]) + ' that ' + repName(pair[1]) + ' sold them out to Iteron. They are squaring off at ' + site.name + '. Somebody staged this.';
    S.items.push({ id: nid('it'), kind: 'evidence', x: site.x - .7, y: site.y + .4, inc: inc2.id, t: 1e9, prog: 0, label: 'holo-projector (the forged message)' }); logSpawn(site.x, site.y, 'evidence');
    pair.forEach(function (id, i) { if (id === 'mella') return; var s = S.supers.filter(function (x) { return x.id === id; })[0], other = pair[1 - i];
      s.state = 'feud'; s.inc = inc2.id; s.obj = 'feud'; s.feud = other; s.path = []; if (other !== 'mella') s.rel[other] = (s.rel[other] || 0) - DV.feudRelHit; else s.mellaRel -= 6; inc2.heroes.push(id); inc2.div.calm[id] = 0; });
    rentDrones(inc2, 1 + (S.director.mode === 'chaos' ? 1 : 0), 'interceptor', { keepFight: true }); S.iteron.observedSec += 60;
    ['deescalate_heroes', 'expose_evidence', 'protect_civilians', 'prevent_damage'].forEach(function (id) { addObj(inc2, id); });
    V.resources -= DV.cost.staged_fight; feed('A hero fight is breaking out at ' + site.name + ': ' + repName(pair[0]) + ' vs ' + repName(pair[1]) + '!', 'alert');
    return inc2;
  }
  function feuding(inc) { return inc.div.fighters.filter(function (id) { if (id === 'mella') return inc.div.fighters.some(function (o) { return o !== 'mella' && feuding1(o, inc); }); return feuding1(id, inc); }); }
  function feuding1(id, inc) { var s = S.supers.filter(function (x) { return x.id === id; })[0]; return s && s.state === 'feud' && s.inc === inc.id; }
  function stepFeud(s, dt) {   // a duped super fights the hero they were told betrayed them
    var d = sdef(s.id), inc = incById(s.inc); if (!inc) { s.state = 'patrol'; s.feud = null; s.inc = null; s.obj = null; return; }
    if (s.feud === 'mella') { var dm = seek(s, S.player.x, S.player.y, d.power.speed * .8, dt); s.hitT = (s.hitT || 0) - dt;
      if (dm < Math.max(1.3, d.power.range) && s.hitT <= 0) { s.hitT = 2.2; hurtPlayer(d.codename + ' (duped by The Divider)'); } return; }
    var o = S.supers.filter(function (x) { return x.id === s.feud; })[0]; if (!o || o.state === 'injured' || o.state === 'captured') { s.state = 'patrol'; s.feud = null; s.inc = null; s.obj = null; return; }
    var dist = seek(s, o.x, o.y, d.power.speed * .7, dt);
    if (dist < Math.max(d.power.range, 1.3) + .3) { o.hp -= d.power.dps * C.divider.feudDps * dt * (1 - (sdef(o.id).power.shield || 0)); if (rnd() < C.divider.feudCollateral * dt) collateral(o.x, o.y, 3, d.codename);
      if (o.hp <= 0) { injureSuper(o, inc); inc.notes.push(d.codename + ' put ' + sdef(o.id).codename + ' in the clinic. The Divider got his headline.'); } }
  }
  function calmFighter(inc, id, amt, by) { if (inc.div.calm[id] == null || !feuding1(id, inc)) return false; inc.div.calm[id] = Math.min(1, inc.div.calm[id] + amt); inc.div.calmBy = inc.div.calmBy || {}; inc.div.calmBy[by] = (inc.div.calmBy[by] || 0) + amt;
    if (inc.div.calm[id] >= 1) { var s = S.supers.filter(function (x) { return x.id === id; })[0]; s.state = 'engage'; s.obj = 'expose_evidence'; s.feud = null; s.cd = 6; feed(sdef(id).codename + ' stands down' + (by === 'mella' ? ' after Mella talks them out of it.' : by ? ' (' + nameOf(by) + ' got through to them).' : '.'), 'hero'); }
    return true; }
  function divTick(inc, dt) {   // per-step pressure: reputation drain, opinion, turning heroes
    var D0 = inc.div, gm = dt * C.clock.gameMinPerSec, DV = C.divider;
    if (D0.op === 'frame_up' && !D0.exposed) { var dr = S.robots.filter(function (r) { return r.inc === inc.id && r.broadcast && r.st !== 'down'; }).length;
      if (dr) { S.rep[D0.target] = clamp(S.rep[D0.target] - DV.repDrainPerGameMin * dr * gm, 0, 100); S.zones[inc.zone].confidence = clamp(S.zones[inc.zone].confidence - DV.confDrainPerGameMin * dr * gm, 0, 100);
        S.supers.forEach(function (s) { if (s.id === D0.target) return; if (D0.target === 'mella') s.mellaRel -= DV.turnPerGameMin * gm; else s.rel[D0.target] = (s.rel[D0.target] || 0) - DV.turnPerGameMin * gm; });
        S.civs.forEach(function (c) { if (c.inside || D0.turned[c.id]) return; if (S.robots.some(function (r) { return r.inc === inc.id && r.broadcast && r.st !== 'down' && D(r, c) < 6; })) { D0.turned[c.id] = 1; if (D0.target === 'mella') c.opinion = clamp(c.opinion - 6, -100, 100);
          Brain.remember(c, { t: Math.floor(absMin()), k: 'heard', v: -.4, inc: inc.id, txt: 'the clip of ' + repName(D0.target) + ' wrecking ' + (G.bmap[inc.targetB] ? G.bmap[inc.targetB].name : 'a building') }); } }); } }
  }
  function divExamine(it, by) {   // Mella (E) or a super examines the planted evidence
    var inc = incById(it.inc); if (!inc || !inc.div) return null; var q = inc.div.forgery;
    it.prog = Math.min(1, it.prog + (by === 'mella' ? 1 / Math.max(1, Math.round(q)) + 1e-9 : 0)); if (it.prog < 1) return { kind: 'evidence', who: 'Evidence', line: 'It looks real at first glance… look closer (press again). Forgery quality ' + q.toFixed(1) + '.' };
    divExpose(inc, it, by); return { kind: 'evidence', who: 'Evidence', line: inc.div.op === 'frame_up' ? 'Forged. The timestamps are spliced and the "hero" in the clip is a hologram. ' + repName(inc.div.target) + ' is cleared.' : 'A holo-projector loaded with a forged message. Whoever planted this wanted the heroes to fight.' };
  }
  function divExpose(inc, it, by) {
    var D0 = inc.div; if (D0.exposed) return; D0.exposed = by; S.items = S.items.filter(function (x) { return x !== it; }); objDone(inc, 'expose_evidence', by);
    var V = S.divider; V.exposure = clamp(V.exposure + C.divider.exposeGain, 0, 100); if (by === 'mella') V.learn.exposedByMella++; else V.learn.exposedByHeroes++;
    if (D0.op === 'frame_up') { S.rep[D0.target] = clamp(Math.min(S.rep[D0.target] + C.divider.repRestore, Math.max(D0.rep0, S.rep[D0.target])), 0, 100); S.supers.forEach(function (s) { if (D0.target === 'mella') s.mellaRel += 4; else if (s.id !== D0.target) s.rel[D0.target] = (s.rel[D0.target] || 0) + 4; }); }
    else { D0.fighters.forEach(function (id) { if (id !== 'mella' && feuding1(id, inc)) calmFighter(inc, id, 1, by); }); var a = D0.fighters[0], b = D0.fighters[1]; if (a !== 'mella' && b !== 'mella') { S.supers.forEach(function (s) { if (s.id === a) s.rel[b] = (s.rel[b] || 0) + C.divider.feudRelHit * .75; if (s.id === b) s.rel[a] = (s.rel[a] || 0) + C.divider.feudRelHit * .75; }); } }
    feed(nameOf(by) + ' exposed the forged evidence: The Divider staged this.', 'hero'); inc.notes.push(nameOf(by) + ' exposed The Divider\'s forged evidence.');
    if (V.exposure >= 100) { V.exposure = C.divider.exposureAfterBust; V.dormantUntil = absMin() + C.divider.dormantDays * 1440; V.plannedOp = null;
      Object.keys(S.zones).forEach(function (z) { S.zones[z].confidence = clamp(S.zones[z].confidence + 5, 0, 100); });
      var t = 'The Divider has been publicly exposed. His sponsor network goes quiet for ' + C.divider.dormantDays + ' days, and the city breathes again.'; histNote(t); feed(t, 'history'); }
  }
  function divEngage(s, d, inc, dt) {   // supers pursuing Divider objectives; returns true if handled
    if (!inc.div) return false;
    var ev = S.items.filter(function (it) { return it.inc === inc.id && it.kind === 'evidence'; })[0];
    if (s.obj === 'expose_evidence' && ev) { var dd = seek(s, ev.x, ev.y, d.power.speed, dt); s.state = dd < 8 ? 'engage' : 'respond'; if (dd < 1.4) { ev.prog = Math.min(1, ev.prog + dt / (C.divider.heroExamineSec * inc.div.forgery)); if (ev.prog >= 1) divExpose(inc, ev, s.id); } return true; }
    if (s.obj === 'deescalate_heroes') { var f = S.supers.filter(function (x) { return x.state === 'feud' && x.inc === inc.id; }).sort(function (a, b) { return D(a, s) - D(b, s); })[0]; if (!f) return false;
      var d2 = seek(s, f.x, f.y, d.power.speed, dt); s.state = d2 < 8 ? 'engage' : 'respond'; if (d2 < 2) calmFighter(inc, f.id, dt * (d.temperament === 'cautious' ? .1 : .06), s.id); return true; }
    if (s.obj === 'join_fight') { var foe = S.supers.filter(function (x) { return x.state === 'feud' && x.inc === inc.id && x.id !== s.id; }).sort(function (a, b) { return (s.rel[a.id] || 0) - (s.rel[b.id] || 0); })[0]; if (!foe) return false;
      var d3 = seek(s, foe.x, foe.y, d.power.speed, dt); s.state = 'engage'; if (d3 < d.power.range + .4) { foe.hp -= d.power.dps * C.divider.feudDps * dt; if (d.power.collateral && rnd() < d.power.collateral * dt) collateral(foe.x, foe.y, 4, d.codename); if (foe.hp <= 0) injureSuper(foe, inc); }
      if (!inc.div.joined) { inc.div.joined = s.id; inc.notes.push(d.codename + (S.divider.rival && S.divider.rival.id === s.id ? ' (' + S.divider.rival.name + ')' : '') + ' joined the fight instead of stopping it.'); feed(d.codename + ' is making the hero fight worse!', 'alert'); } return true; }
    return false;
  }
  function divObjective(s, d, inc) {   // objective preferences for Divider incidents (temperament-driven, PROPOSED)
    var open = inc.objectives.filter(function (o) { return o.state === 'open'; }).map(function (o) { return o.id; });
    var rival = S.divider && S.divider.rival && S.divider.rival.id === s.id;
    if (inc.div.op === 'staged_fight' && (rival || d.temperament === 'destructive') && feuding(inc).length && rnd() < (rival ? .8 : .45)) return 'join_fight';
    if (inc.div.op === 'frame_up' && inc.div.target === s.id && open.indexOf('expose_evidence') >= 0) return 'expose_evidence';
    var order = d.temperament === 'cautious' || d.temperament === 'protective' ? ['deescalate_heroes', 'protect_civilians', 'expose_evidence'] : d.temperament === 'analytical' ? ['expose_evidence', 'disable_drones', 'deescalate_heroes'] : ['disable_drones', 'deescalate_heroes', 'expose_evidence'];
    for (var i = 0; i < order.length; i++) if (open.indexOf(order[i]) >= 0 && (order[i] !== 'deescalate_heroes' || feuding(inc).length)) return order[i];
    return null;
  }
  function divStepIncident(inc, dt) {   // resolution rules for Divider incidents
    var D0 = inc.div; if (distPlayer(inc.x, inc.y) < 10) inc.mellaNearSec += dt;
    var drones = S.robots.filter(function (r) { return r.inc === inc.id && r.st !== 'down' && !r.gone; });
    if (D0.op === 'frame_up') { if (D0.exposed && !drones.some(function (r) { return r.broadcast; })) return resolve(inc, 'cleared'); }
    else { var f = feuding(inc); if (!f.length && !D0.ended) D0.ended = S.t; if (D0.ended && S.t - D0.ended > 20 && !drones.length && !S.supers.some(function (s) { return s.state === 'injured' && s.injInc === inc.id; })) return resolve(inc, 'cleared'); }
    if (S.t >= inc.deadline) return resolve(inc, 'deadline');
  }
  function divBeforeResolve(inc) {   // settle the Divider objectives before the generic resolution
    var D0 = inc.div, V = S.divider;
    if (D0.op === 'frame_up') { var lost = D0.rep0 - S.rep[D0.target]; if (lost <= C.divider.repLossOK && (inc.mellaNearSec > 3 || inc.heroes.length || D0.exposed)) objDone(inc, 'protect_reputation', D0.exposed || (inc.mellaNearSec > 10 ? 'mella' : inc.heroes[0])); else objFail(inc, 'protect_reputation'); if (!D0.exposed) objFail(inc, 'expose_evidence'); }
    else { var calmAll = D0.fighters.filter(function (id) { return id !== 'mella'; }).every(function (id) { return D0.calm[id] >= 1; });
      if (calmAll) { var by = D0.exposed || Object.keys(D0.calmBy || {}).sort(function (a, b) { return D0.calmBy[b] - D0.calmBy[a]; })[0] || null; objDone(inc, 'deescalate_heroes', by); } else objFail(inc, 'deescalate_heroes');
      if (!D0.exposed) objFail(inc, 'expose_evidence');
      S.supers.forEach(function (s) { if (s.state === 'feud' && s.inc === inc.id) { s.state = 'patrol'; s.feud = null; s.inc = null; s.obj = null; } }); }
    S.items = S.items.filter(function (it) { return !(it.inc === inc.id && it.kind === 'evidence'); });
    var done = function (id) { return inc.objectives.some(function (o) { return o.id === id && o.state === 'done'; }); };
    if (done('deescalate_heroes')) V.learn.deescalated++; if (done('protect_reputation')) V.learn.repProtected++;
    if (!D0.exposed && !done('deescalate_heroes') && !done('protect_reputation')) { V.learn.succeeded++; V.resources += C.divider.winBonus; S.zones[inc.zone].confidence = clamp(S.zones[inc.zone].confidence - 6, 0, 100);
      if (D0.op === 'staged_fight') D0.fighters.forEach(function (id) { if (id !== 'mella') S.rep[id] = clamp(S.rep[id] - 12, 0, 100); }); }
    divAdapt();
  }
  sim.divider = function () { return S.divider; };
  sim.dividerStatus = function () { var V = S.divider || {}, zs = Object.keys(S.zones); return { dormant: !!(V.dormantUntil && absMin() < V.dormantUntil), planned: V.plannedOp || null, exposure: V.exposure || 0, rival: V.rival || null,
    confidence: zs.reduce(function (a, z) { return a + S.zones[z].confidence; }, 0) / zs.length }; };
  sim.calmFighters = function (radius) {   // Mella's CALM near feuding heroes
    var n = 0; S.incidents.forEach(function (i) { if (!i.div || i.div.op !== 'staged_fight') return; S.supers.forEach(function (s) { if (s.state === 'feud' && s.inc === i.id && distPlayer(s.x, s.y) < radius) { if (calmFighter(i, s.id, C.divider.mellaCalm, 'mella')) { n++; i.mellaActs++; } } }); }); return n; };

  /* =============================================================== init + main step */
  function init() {
    C.civilians.forEach(function (c) { var at = G.bmap[c[2]].door;
      S.civs.push({ id: c[0], name: c[1], home: c[2], job: c[3], role: c[4], tr: clone(c[5]), x: at[0] + .5, y: at[1] + .5, inside: c[2], action: 'home', dest: null, path: [], pi: 0, place: null, goalB: null,
        needs: { energy: rr(.5, .9), hunger: rr(.4, .9), social: rr(.3, .9), fun: rr(.3, .9), safety: 1 }, mem: [], opinion: 0, injured: 0, grabbed: null, think: rr(0, 2), chat: 0, said: '', witnessed: {} }); });
    C.supers.forEach(function (d) { var b = G.bmap[d.base] ? doorPt(d.base) : placePt(d.base); S.supers.push({ id: d.id, x: b.x, y: b.y, hp: d.hp, max: d.hp, state: 'patrol', inc: null, obj: null, path: [], pi: 0, dest: null, wp: null, mem: [], rel: clone(d.rel || {}), mellaRel: 0, fatigue: 0, cd: 0, think: rr(0, 1), injuredT: 0, capturedUntil: 0, alertT: 0 }); });
    var M = C.director.modes[C.director.defaultMode];
    S.director = { mode: C.director.defaultMode, nextMinor: rr(C.director.firstMinorSec[0], C.director.firstMinorSec[1]), nextMajor: rr(C.director.firstMajorSec[0], C.director.firstMajorSec[1]),
      last: {}, recent: [], recentZones: [], patrolTarget: ri(M.patrols[0], M.patrols[1]), nextPatrolCheck: 5, log: [], deferred: 0 };
    S.iteron = { gen: 1, resources: C.iteron.baseResources, learn: { hit: 0, blast: 0, dash: 0, calm: 0, skate: 0, drive: 0 }, mods: { meleeGuard: 0, blastDodge: 0, extraScouts: 0, disguise: C.iteron.disguiseBase }, observedSec: 0, encounters: 0, captured: [] };
    S.vesper = { stage: 'idle', dronesBought: 0 };
    divInit();
    for (var i = 0; i < C.traffic.cars; i++) spawnCar(true);
    var c0 = clock(); feed('Day ' + c0.day + ' · ' + c0.weekday + ' ' + c0.hhmm + ' · a normal afternoon in the district.', 'info');
  }
  function stepSecurity(r, dt) { r.cyc += dt; var foe = S.robots.filter(function (o) { return o.inc && o.hostile && o.st !== 'down' && !o.riding && !o.security && D(o, r) < 6; })[0];
    if (foe) { seek(r, foe.x, foe.y, 3, dt); if (D(foe, r) < 1.5) hitRobot(foe, 8 * dt, 'security'); return; }
    if (!r.wp || D(r, r.wp) < .5) { var bs = C.buildings.filter(function (b) { return b.zone === r.zone; }), b = pick(bs), p = doorPt(b.id); r.wp = { x: p.x + rr(-1.5, 1.5), y: p.y + .3 }; } seek(r, r.wp.x, r.wp.y, 1.6, dt); }
  function step(dt) {
    S.t += dt; var c = clock(), weekend = c.weekday === 'Saturday' || c.weekday === 'Sunday';
    var incNear = S.incidents.filter(function (i) { return i.type !== 'scout_sighting'; })[0] || null;
    var ctx = { h: c.hour, day: c.day, weekend: weekend, incNear: incNear };
    stepPlayerTimers(dt);
    var i; for (i = 0; i < S.civs.length; i++) stepCiv(S.civs[i], dt, ctx);
    for (i = 0; i < S.supers.length; i++) stepSuper(S.supers[i], dt, ctx);
    for (i = 0; i < S.robots.length; i++) { var r = S.robots[i]; if (r.security) stepSecurity(r, dt); else stepRobot(r, dt); }
    for (i = 0; i < S.vehicles.length; i++) stepVehicle(S.vehicles[i], dt);
    S.incidents.slice().forEach(function (inc) { stepIncident(inc, dt); });
    S.robots = S.robots.filter(function (r) { return !r.gone; });
    S.vehicles = S.vehicles.filter(function (v) { if (v.towT != null) { v.towT -= dt; if (v.towT <= 0) return false; } return !v.exited; });
    var cars = 0; S.vehicles.forEach(function (v) { if (v.kind === 'car') cars++; }); if (cars < C.traffic.cars && rnd() < dt * .5) spawnCar(false);
    if (S.fx) { S.fx.forEach(function (f) { f.t -= dt; }); S.fx = S.fx.filter(function (f) { return f.t > 0; }); }
    directorStep(dt); calendarStep(); dividerStep(dt); cityStep(dt);
  }
  var acc = 0;
  sim.step = step;
  sim.tick = function (realDt, timeScale) { acc += Math.min(realDt, .25) * (timeScale == null ? 1 : timeScale); var n = 0, st = C.clock.stepSec; while (acc >= st && n < 2000) { step(st); acc -= st; n++; } if (n >= 2000) acc = 0; return n; };
  sim.advance = function (seconds, stepSec) { var st = stepSec || C.clock.stepSec, n = Math.round(seconds / st); for (var i = 0; i < n; i++) step(st); return n; };
  sim.serialize = function () { return clone(S); };
  sim.digest = function () {   // compact, comparable snapshot for determinism tests
    return JSON.stringify({ t: +S.t.toFixed(2), rng: S.rng, log: S.director.log, hist: S.history.map(function (h) { return [h.id, h.type, h.zone, h.outcome, (h.heroes || []).join('+')]; }),
      civ: S.civs.map(function (c) { return [c.id, +c.x.toFixed(3), +c.y.toFixed(3), c.action, c.inside]; }), sup: S.supers.map(function (s) { return [s.id, +s.x.toFixed(3), +s.y.toFixed(3), s.state]; }),
      zones: S.zones, iteron: S.iteron, bld: S.buildings, divider: S.divider, rep: S.rep });
  };
  sim.activeObjectives = function () { return S.incidents.map(function (i) { return { id: i.id, type: i.type, label: i.label, zone: C.zones[i.zone].name, phase: i.phase, objectives: i.objectives, heroes: i.heroes.map(function (h) { return sdef(h).codename + (S.supers.filter(function (s) { return s.id === h; })[0].obj ? ' → ' + S.supers.filter(function (s) { return s.id === h; })[0].obj.replace(/_/g, ' ') : ''); }), x: i.x, y: i.y, cause: i.cause, left: Math.max(0, Math.round(i.deadline - S.t)) }; }); };
  sim.sdef = sdef; sim.Brain = Brain; sim.doorPt = doorPt;
  if (!opts.save) init();
  return sim;
}

return { VERSION: VERSION, create: create, Brain: Brain, buildGeo: buildGeo, config: CFG };
}));
