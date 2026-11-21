
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
