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
