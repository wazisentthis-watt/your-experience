
/* ---------------------------------------------------------------- rendering */
var cv, cx, mini, mx, base, W = 0, Hh = 0, DPR = 1, scale = 1, cam = { x: 0, y: 0 }, NPCV = [];
function resize() { DPR = Math.min(2, window.devicePixelRatio || 1); W = innerWidth; Hh = innerHeight; cv.width = W * DPR; cv.height = Hh * DPR; scale = clamp(Math.min(W / (22 * T), Hh / (14 * T)), .62, 1.3); }
function prerender() {   // static district: roads, sidewalks, buildings, plaza, park (damage/closures are drawn live on top)
  var G = sim.G, b = document.createElement('canvas'); b.width = G.W * T; b.height = G.H * T; var x = b.getContext('2d');
  x.fillStyle = '#9aa3ad'; x.fillRect(0, 0, b.width, b.height);
  for (var ty = 0; ty < G.H; ty++) for (var tx = 0; tx < G.W; tx++) { var g = G.g[ty * G.W + tx]; if (g === 0) { x.fillStyle = '#3b4048'; x.fillRect(tx * T, ty * T, T, T); } }
  x.fillStyle = '#5f9e55'; x.fillRect(1 * T, 1 * T, 10 * T, 8 * T); x.fillStyle = '#4f8a46'; for (var i = 0; i < 14; i++) { var px = (1.6 + (i * 3.7) % 9) * T, py = (1.5 + (i * 2.3) % 7) * T; x.beginPath(); x.arc(px, py, 13, 0, 7); x.fill(); }
  x.fillStyle = '#c0b8a8'; x.fillRect(14 * T, 24 * T, 18 * T, 10 * T); x.strokeStyle = 'rgba(0,0,0,.08)'; for (var gx = 14; gx < 32; gx += 2) { x.beginPath(); x.moveTo(gx * T, 24 * T); x.lineTo(gx * T, 34 * T); x.stroke(); }
  x.fillStyle = '#b8b0a0'; x.fillRect(14 * T, 36 * T, 18 * T, 5 * T);
  C.plaza.ramps.forEach(function (r) { var g2 = x.createLinearGradient(r[0] * T, 0, (r[0] + r[2]) * T, 0); g2.addColorStop(0, '#8d8577'); g2.addColorStop(1, '#e3dccd'); x.fillStyle = g2; x.fillRect(r[0] * T, r[1] * T, r[2] * T, r[3] * T); x.strokeStyle = '#5c564c'; x.lineWidth = 2; x.strokeRect(r[0] * T, r[1] * T, r[2] * T, r[3] * T); });
  C.plaza.rails.forEach(function (r) { x.strokeStyle = '#d0d4da'; x.lineWidth = 5; x.beginPath(); if (r[3] === 'h') { x.moveTo(r[0] * T, (r[1] + .5) * T); x.lineTo((r[0] + r[2]) * T, (r[1] + .5) * T); } else { x.moveTo((r[0] + .5) * T, r[1] * T); x.lineTo((r[0] + .5) * T, (r[1] + r[2]) * T); } x.stroke(); x.strokeStyle = '#6c737d'; x.lineWidth = 1; x.stroke(); });
  x.strokeStyle = 'rgba(255,255,255,.55)'; x.lineWidth = 2; x.setLineDash([12, 12]);
  C.map.roadsY.forEach(function (ry) { x.beginPath(); x.moveTo(0, (ry + 1) * T); x.lineTo(b.width, (ry + 1) * T); x.stroke(); });
  C.map.roadsX.forEach(function (rx) { x.beginPath(); x.moveTo((rx + 1) * T, 0); x.lineTo((rx + 1) * T, b.height); x.stroke(); }); x.setLineDash([]);
  x.fillStyle = 'rgba(255,255,255,.7)'; C.map.roadsX.forEach(function (rx) { C.map.roadsY.forEach(function (ry) { for (var k = 0; k < 5; k++) { x.fillRect((rx - 1) * T + 4, (ry + k * .4) * T + 2, T - 8, 5); x.fillRect((rx + 2) * T + 4, (ry + k * .4) * T + 2, T - 8, 5); } }); });
  C.buildings.forEach(function (bd) { var r = bd.r; x.fillStyle = 'rgba(0,0,0,.25)'; x.fillRect(r[0] * T + 5, r[1] * T + 6, r[2] * T, r[3] * T); x.fillStyle = bd.color; x.fillRect(r[0] * T, r[1] * T, r[2] * T, r[3] * T);
    x.fillStyle = 'rgba(255,255,255,.12)'; x.fillRect(r[0] * T, r[1] * T, r[2] * T, 8); x.strokeStyle = 'rgba(0,0,0,.45)'; x.lineWidth = 2; x.strokeRect(r[0] * T + 1, r[1] * T + 1, r[2] * T - 2, r[3] * T - 2);
    if (bd.kind !== 'mural') { x.fillStyle = 'rgba(255,255,230,.35)'; for (var wy = r[1] + .7; wy < r[1] + r[3] - .6; wy += 1.3) for (var wx = r[0] + .6; wx < r[0] + r[2] - .5; wx += 1.2) x.fillRect(wx * T, wy * T, 12, 9); }
    x.fillStyle = '#2b2b2b'; x.fillRect((bd.door[0] + .2) * T, (bd.door[1] - (bd.door[1] > r[1] ? .25 : -.75)) * T, .6 * T, 7);
    x.font = 'bold 11px system-ui'; x.textAlign = 'center'; x.fillStyle = '#fff'; x.strokeStyle = 'rgba(0,0,0,.75)'; x.lineWidth = 3; var lx = (r[0] + r[2] / 2) * T, ly = (r[1] + Math.min(1.2, r[3] / 2)) * T + 4; x.strokeText(bd.name, lx, ly); x.fillText(bd.name, lx, ly); });
  C.grates.forEach(function (g3) { x.fillStyle = '#222'; x.fillRect(g3[0] * T + 6, g3[1] * T + 6, T - 12, T - 12); x.strokeStyle = '#555'; for (var k2 = 0; k2 < 4; k2++) { x.beginPath(); x.moveTo(g3[0] * T + 8 + k2 * 5, g3[1] * T + 7); x.lineTo(g3[0] * T + 8 + k2 * 5, g3[1] * T + T - 7); x.stroke(); } });
  base = b;
}
function W2S(x, y) { return [(x * T - cam.x) * scale + W / 2, (y * T - cam.y) * scale + Hh / 2]; }
var DIRROW = { down: 0, up: 1, left: 2, right: 3 };
function heroFrame() { var p = S.player, side = p.dir === 'left', t = S.t;
  if (p.ko > 0) return { c: 14, r: 4, f: side };
  if (hs.act === 'hit') return { c: 3, r: 4, f: side }; if (hs.act === 'blast') return { c: 10, r: 4, f: side }; if (hs.act === 'calm') return { c: 12, r: 1, f: false };
  if (p.mode === 'skate') { if (hs.act === 'bail') return { c: 5, r: 6, f: side }; if (hs.grind) return { c: 2, r: 6, f: side }; if (hs.air > 0) return { c: hs.trick ? 4 : 3, r: 6, f: side }; return { c: hs.moving ? [0, 1, 0, 6][Math.floor(hs.ph * .5) % 4] : 0, r: 6, f: side }; }
  if (hs.dashT > 0 && (p.dir === 'left' || p.dir === 'right')) return { c: 8 + (Math.floor(t * 12) % 2), r: side ? 8 : 7, f: false };
  if (hs.air > 0) return { c: 5, r: side ? 8 : 7, f: false };
  var r = DIRROW[p.dir] || 0; return hs.moving ? { c: 4 + Math.floor(hs.ph * .55) % 8, r: r, f: false } : { c: Math.floor(t * 1.6) % 4, r: r, f: false }; }
function shadowAt(sx, sy, rx) { cx.fillStyle = 'rgba(0,0,0,.28)'; cx.beginPath(); cx.ellipse(sx, sy, rx * scale, rx * .4 * scale, 0, 0, 7); cx.fill(); }
function label(sx, sy, txt, col, size) { cx.font = 'bold ' + Math.round((size || 10) * Math.max(.9, scale)) + 'px system-ui'; cx.textAlign = 'center'; cx.lineWidth = 3; cx.strokeStyle = 'rgba(0,0,0,.8)'; cx.strokeText(txt, sx, sy); cx.fillStyle = col || '#fff'; cx.fillText(txt, sx, sy); }
function drawMachine(kind, fr, sx, sy, k, alpha, flip) { var im = IMG[kind + fr]; if (!im) { cx.fillStyle = '#444'; cx.fillRect(sx - 10, sy - 24, 20, 24); return; } var m = MFR && MFR[kind + '_' + fr], ax = m ? m[2] : im.width / 2, ay = m ? m[3] : im.height;
  cx.save(); cx.globalAlpha = alpha == null ? 1 : alpha; cx.translate(sx, sy); if (flip) cx.scale(-1, 1); cx.drawImage(im, -ax * k * scale, -ay * k * scale, im.width * k * scale, im.height * k * scale); cx.restore(); }
function vehicleShape(v, sx, sy) { var L2 = v.kind === 'truck' ? 2.3 : v.kind === 'van' ? 1.9 : v.kind === 'repair' ? 2 : 1.5, W2 = v.kind === 'truck' ? 1 : v.kind === 'van' ? .9 : .78;
  cx.save(); cx.translate(sx, sy); cx.rotate(v.ang || 0); var l = L2 * T * scale, w = W2 * T * scale; cx.fillStyle = 'rgba(0,0,0,.3)'; cx.fillRect(-l / 2 + 3, -w / 2 + 4, l, w); cx.fillStyle = v.color || '#ccc'; cx.fillRect(-l / 2, -w / 2, l, w);
  cx.fillStyle = 'rgba(20,30,40,.75)'; cx.fillRect(l / 2 - l * .28, -w / 2 + 2, l * .18, w - 4); if (v.kind === 'truck') { cx.fillStyle = '#ced4da'; cx.fillRect(-l / 2, -w / 2, l * .62, w); cx.fillStyle = '#495057'; cx.font = 'bold ' + Math.round(8 * scale) + 'px system-ui'; cx.textAlign = 'center'; cx.fillText('DELIVERY', -l * .2, 3); }
  if (v.kind === 'repair') { cx.fillStyle = '#212529'; for (var i = 0; i < 4; i++) cx.fillRect(-l / 2 + i * l / 4, -w / 2, l / 8, w); }
  if (v.stopped && Math.floor(S.t * 3) % 2) { cx.fillStyle = '#ffd43b'; cx.fillRect(-l / 2, -w / 2, 5, 5); cx.fillRect(l / 2 - 5, -w / 2, 5, 5); cx.fillRect(-l / 2, w / 2 - 5, 5, 5); cx.fillRect(l / 2 - 5, w / 2 - 5, 5, 5); }
  cx.restore(); }
function draw() {
  var p = S.player; var tx = p.x * T, ty = (p.y - .4) * T; cam.x += (tx - cam.x) * .18; cam.y += (ty - cam.y) * .18;
  var hw = W / 2 / scale, hh = Hh / 2 / scale; cam.x = clamp(cam.x, Math.min(hw, base.width / 2), Math.max(base.width - hw, base.width / 2)); cam.y = clamp(cam.y, Math.min(hh, base.height / 2), Math.max(base.height - hh, base.height / 2));
  cx.setTransform(DPR, 0, 0, DPR, 0, 0); cx.fillStyle = '#0b0f16'; cx.fillRect(0, 0, W, Hh);
  cx.save(); cx.translate(W / 2, Hh / 2); cx.scale(scale, scale); cx.translate(-cam.x, -cam.y); cx.drawImage(base, 0, 0);
  // live city state: damage, closures, mural progress, traffic lights, road closures
  C.buildings.forEach(function (bd) { var B = S.buildings[bd.id], r = bd.r; if (bd.kind === 'mural') { var n = Math.floor(r[2] * S.mural / 100); for (var i = 0; i < n; i++) { cx.fillStyle = 'hsl(' + ((i * 47) % 360) + ',70%,60%)'; cx.fillRect((r[0] + i) * T, r[1] * T + 3, T, r[3] * T - 6); } }
    if (B.dmg > 3) { cx.fillStyle = 'rgba(30,20,10,' + Math.min(.55, B.dmg / 140) + ')'; cx.fillRect(r[0] * T, r[1] * T, r[2] * T, r[3] * T); cx.strokeStyle = 'rgba(0,0,0,.6)'; cx.lineWidth = 2; for (var k = 0; k < Math.floor(B.dmg / 12); k++) { var sx0 = (r[0] + ((k * 2.7) % r[2])) * T, sy0 = (r[1] + ((k * 1.9) % r[3])) * T; cx.beginPath(); cx.moveTo(sx0, sy0); cx.lineTo(sx0 + 14, sy0 + 9); cx.lineTo(sx0 + 6, sy0 + 20); cx.stroke(); }
      if (B.dmg > 35 && Math.sin(S.t * 2 + r[0]) > -.2) { cx.fillStyle = 'rgba(120,120,120,.35)'; cx.beginPath(); cx.arc((r[0] + r[2] / 2) * T, (r[1] + .5) * T - (S.t * 20 % 30), 12 + (S.t * 10 % 8), 0, 7); cx.fill(); } }
    if (B.closed) { var lx = (bd.door[0] + .5) * T, ly = (bd.door[1] + .5) * T; cx.fillStyle = '#c92a2a'; cx.fillRect(lx - 26, ly - 9, 52, 16); cx.fillStyle = '#fff'; cx.font = 'bold 10px system-ui'; cx.textAlign = 'center'; cx.fillText('CLOSED', lx, ly + 3); } });
  (S.roadClosures || []).forEach(function (rc) { for (var i = -1; i <= 1; i++) { var cx0 = rc.x * T + i * 14, cy0 = rc.y * T; cx.fillStyle = '#ff922b'; cx.beginPath(); cx.moveTo(cx0, cy0 - 9); cx.lineTo(cx0 - 6, cy0 + 7); cx.lineTo(cx0 + 6, cy0 + 7); cx.fill(); cx.fillStyle = '#fff'; cx.fillRect(cx0 - 3, cy0 - 1, 6, 2); } });
  var ph = sim.light(); sim.G.nodes.forEach(function (n) { if (n.edge) return; cx.fillStyle = ph === 'h' ? '#51cf66' : '#ff6b6b'; cx.beginPath(); cx.arc(n.x * T - 26, n.y * T - 26, 4, 0, 7); cx.fill(); cx.fillStyle = ph === 'v' ? '#51cf66' : '#ff6b6b'; cx.beginPath(); cx.arc(n.x * T + 26, n.y * T + 26, 4, 0, 7); cx.fill(); });
  C.discoveries.forEach(function (d) { if (S.discovered[d.id]) return; var dd = hyp(d.at[0] - p.x, d.at[1] - p.y); if (dd < 5) { cx.fillStyle = 'rgba(99,230,190,' + (.35 + .3 * Math.sin(S.t * 5)) + ')'; cx.beginPath(); cx.arc(d.at[0] * T, d.at[1] * T, 6, 0, 7); cx.fill(); } });
  drawMorrowGate();
  S.items.forEach(function (it) { var a = .6 + .4 * Math.sin(S.t * 10); if (it.kind === 'evidence') { cx.fillStyle = 'rgba(255,212,59,' + a + ')'; cx.fillRect(it.x * T - 8, it.y * T - 6, 16, 12); cx.strokeStyle = '#fff'; cx.lineWidth = 2; cx.strokeRect(it.x * T - 8, it.y * T - 6, 16, 12); cx.fillStyle = '#ffd43b'; cx.font = '700 9px system-ui'; cx.textAlign = 'center'; cx.fillText('EVIDENCE · E', it.x * T, it.y * T - 10); return; } cx.fillStyle = 'rgba(218,119,242,' + a + ')'; cx.beginPath(); cx.arc(it.x * T, it.y * T, 9, 0, 7); cx.fill(); cx.strokeStyle = '#fff'; cx.lineWidth = 2; cx.stroke(); });
  cx.restore();
  // y-sorted sprites in screen space
  var list = [];
  S.vehicles.forEach(function (v) { list.push({ y: v.y, f: function () { var s = W2S(v.x, v.y); vehicleShape(v, s[0], s[1]); if (v.inc && v.maxHp) { var w = 34 * scale; cx.fillStyle = '#000'; cx.fillRect(s[0] - w / 2, s[1] - 26 * scale, w, 4); cx.fillStyle = '#ff922b'; cx.fillRect(s[0] - w / 2, s[1] - 26 * scale, w * clamp(v.hp / v.maxHp, 0, 1), 4); if (v.protT > 0) label(s[0], s[1] - 30 * scale, 'SHIELDED', '#ffa94d', 9); } } }); });
  var car = S.game.pcar; if (S.player.mode !== 'car') list.push({ y: car.y, f: function () { var s = W2S(car.x, car.y); vehicleShape({ kind: 'car', ang: car.ang, color: '#2ec4b6' }, s[0], s[1]); if (hyp(car.x - p.x, car.y - p.y) < 6) label(s[0], s[1] - 18 * scale, 'YOUR CAR · F / RT', '#8ff5ea', 9); } });
  S.civs.forEach(function (c, i) { if (c.inside) return; list.push({ y: c.y, f: function () { var s = W2S(c.x, c.y), im = NPCV[i % NPCV.length]; shadowAt(s[0], s[1], 9); cx.save(); cx.translate(s[0], s[1]); if (c.injured > 0) cx.rotate(Math.PI / 2);
    var bob = (c.dest && !(c.injured > 0)) ? Math.abs(Math.sin(S.t * 9 + i)) * 2 : 0; if (im) cx.drawImage(im, -20 * scale, (-40 - bob) * scale, 40 * scale, 40 * scale); cx.restore();
    if (c.grabbed) label(s[0], s[1] - 44 * scale, 'HELP!', '#ff6b6b', 11); else if (c.injured > 0) label(s[0], s[1] - 18 * scale, 'hurt · E / CALM', '#ffa8a8', 9);
    else if (c.chat > 0 && c.said) label(s[0], s[1] - 46 * scale, '💬 ' + c.said.slice(0, 34), '#e9ecef', 9); else if (hyp(c.x - p.x, c.y - p.y) < 3) label(s[0], s[1] - 44 * scale, c.name + ' · ' + c.role, '#dee2e6', 9);
    if (c.action === 'protest' && !c.dest) label(s[0], s[1] - 52 * scale, '🪧 FIX OUR STREETS', '#ffd43b', 9); } }); });
  S.supers.forEach(function (s) { if (s.state === 'captured') return; var d = sim.sdef(s.id); list.push({ y: s.y, f: function () { var q = W2S(s.x, s.y); shadowAt(q[0], q[1], 10); cx.save(); cx.translate(q[0], q[1]); if (s.state === 'injured') cx.rotate(Math.PI / 2);
    cx.fillStyle = d.color; cx.beginPath(); cx.moveTo(-9 * scale, -10 * scale); cx.lineTo(9 * scale, -10 * scale); cx.lineTo(12 * scale, 4 * scale); cx.lineTo(-12 * scale, 4 * scale); cx.fill();
    cx.fillStyle = '#1b1f27'; cx.beginPath(); cx.arc(0, -16 * scale, 10 * scale, 0, 7); cx.fill(); cx.strokeStyle = d.color; cx.lineWidth = 3; cx.stroke(); cx.fillStyle = d.color; cx.beginPath(); cx.arc(0, -30 * scale, 7 * scale, 0, 7); cx.fill(); cx.strokeStyle = '#fff'; cx.lineWidth = 1.5; cx.stroke(); cx.restore();
    label(q[0], q[1] - 42 * scale, d.codename + (s.state === 'injured' ? ' · HURT · E' : s.state === 'alerted' ? ' · !' : s.state === 'feud' ? ' · FEUD · E/C' : (S.divider && S.divider.rival && S.divider.rival.id === s.id) ? ' · ' + S.divider.rival.name : ''), s.state === 'injured' ? '#ff8787' : s.state === 'feud' ? '#ffa94d' : d.color, 9); } }); });
  S.robots.forEach(function (r) { list.push({ y: r.y, f: function () { var s = W2S(r.x, r.y);
    if (r.security) { shadowAt(s[0], s[1], 9); cx.fillStyle = '#4dabf7'; cx.beginPath(); cx.arc(s[0], s[1] - 12 * scale, 9 * scale, 0, 7); cx.fill(); cx.strokeStyle = '#fff'; cx.stroke(); label(s[0], s[1] - 26 * scale, 'CITY SECURITY', '#a5d8ff', 8); return; }
    if (r.riding) return; var R = C.robots[r.cls], spr = R.sprite, fr = r.st === 'tele' ? 2 : r.st === 'atk' ? 3 : r.st === 'down' ? 3 : Math.floor(r.cyc * 4) % 2, k = r.cls === 'scout' ? .62 : r.cls === 'interceptor' ? .7 : .8;
    if (r.cls === 'commander' && r.st !== 'down') { cx.strokeStyle = 'rgba(116,192,252,.35)'; cx.lineWidth = 2; cx.beginPath(); cx.arc(s[0], s[1], C.robots.commander.shieldR * T * scale, 0, 7); cx.stroke(); }
    if (r.st === 'tele') { cx.strokeStyle = 'rgba(255,169,77,.8)'; cx.lineWidth = 6 * scale; cx.beginPath(); cx.moveTo(s[0], s[1]); cx.lineTo(s[0] + Math.cos(r.face) * 2.6 * T * scale, s[1] + Math.sin(r.face) * 2.6 * T * scale); cx.stroke(); }
    shadowAt(s[0], s[1], 11);
    if (r.disguised && hyp(r.x - p.x, r.y - p.y) > 3) { cx.fillStyle = '#e9ecef'; cx.fillRect(s[0] - 9 * scale, s[1] - 30 * scale, 18 * scale, 12 * scale); cx.fillStyle = '#868e96'; cx.fillRect(s[0] - 14 * scale, s[1] - 33 * scale, 28 * scale, 3 * scale); label(s[0], s[1] - 38 * scale, C.patrolDrone.name, '#ced4da', 8); return; }
    var lift = r.cls === 'scout' ? (10 + Math.sin(r.cyc * 3) * 3) * scale : 0; drawMachine(spr, fr, s[0], s[1] - lift, k, r.st === 'down' ? clamp(r.t / 2.2, 0, 1) : 1, Math.cos(r.face || 0) < 0 || (r.x > p.x && r.cls !== 'scout'));
    if (r.flash > 0) { cx.fillStyle = 'rgba(255,255,255,.5)'; cx.beginPath(); cx.arc(s[0], s[1] - 18 * scale, 14 * scale, 0, 7); cx.fill(); }
    if (r.st !== 'down') { var w = 28 * scale; cx.fillStyle = '#000'; cx.fillRect(s[0] - w / 2, s[1] - 50 * scale - lift, w, 3); cx.fillStyle = r.hostile ? '#fa5252' : '#adb5bd'; cx.fillRect(s[0] - w / 2, s[1] - 50 * scale - lift, w * r.hp / r.max, 3);
      if (hyp(r.x - p.x, r.y - p.y) < 7 || r.fleeing) label(s[0], s[1] - 54 * scale - lift, (r.fleeing && r.inc ? '◎ SIGNAL · ' : '') + (r.patrol ? 'ITERON PATROL' : R.name) + (sim.shielded(r) ? ' · SHIELDED' : ''), r.fleeing ? '#da77f2' : '#ffc9c9', 8); } } }); });
  if (!(S.game.veyru.inCar)) { var k2 = S.game.veyru; list.push({ y: k2.y, f: function () { var s = W2S(k2.x, k2.y), im = k2.moving ? IMG['vW' + (Math.floor(k2.ph || 0) % 3)] : IMG.vIdle; shadowAt(s[0], s[1], 12); if (im) { cx.save(); cx.translate(s[0], s[1]); if (k2.face < 0) cx.scale(-1, 1); cx.drawImage(im, -24 * scale, -40 * scale, 48 * scale, 48 * scale); cx.restore(); } var b2 = k2.brain; label(s[0], s[1] - 40 * scale, 'Veyru · ' + (b2.accompanied ? (b2.stayUntil != null ? 'staying' : b2.activity) : 'home · ' + b2.activity), b2.accompanied ? '#b2f2bb' : '#ffd8a8', 8); } }); }
  list.push({ y: p.y + .01, f: function () { var s = W2S(p.x, p.y); if (p.mode === 'car') { vehicleShape({ kind: 'car', ang: car.ang, color: '#2ec4b6' }, s[0], s[1]); label(s[0], s[1] - 18 * scale, 'MELLA', '#8ff5ea', 9); return; }
    shadowAt(s[0], s[1], p.z > 0 ? 8 : 11); var f = heroFrame(), im = IMG.hero, sz = 70 * scale, lift = p.z * 18 * scale; if (p.inv > 0 && Math.floor(S.t * 20) % 2 && p.ko <= 0) return;
    if (p.mode === 'skate' && f.r !== 6) { cx.fillStyle = '#2b2b2b'; cx.fillRect(s[0] - 14 * scale, s[1] - 4 * scale - lift, 28 * scale, 5 * scale); }
    if (im) { cx.save(); cx.translate(s[0], s[1] - lift); if (f.f) cx.scale(-1, 1); cx.drawImage(im, f.c * 96, f.r * 96, 96, 96, -sz / 2, -sz * .96, sz, sz); cx.restore(); }
    if (hs.act === 'calm') { cx.strokeStyle = 'rgba(178,242,187,.7)'; cx.lineWidth = 3; cx.beginPath(); cx.arc(s[0], s[1], HC.calmRadius * T * scale * (1 - hs.actT), 0, 7); cx.stroke(); }
    if (hs.act === 'hit') { var dv = dirVec(p.dir); cx.strokeStyle = 'rgba(255,224,102,.8)'; cx.lineWidth = 4; cx.beginPath(); cx.arc(s[0] + dv[0] * 20 * scale, s[1] - 20 * scale + dv[1] * 14 * scale, 16 * scale, 0, 7); cx.stroke(); } } });
  list.sort(function (a, b) { return a.y - b.y; }); list.forEach(function (o) { o.f(); });
  fx.shots.forEach(function (s) { var q = W2S(s.x, s.y); cx.fillStyle = '#74c0fc'; cx.beginPath(); cx.arc(q[0], q[1] - 14 * scale, 7 * scale, 0, 7); cx.fill(); cx.fillStyle = '#e7f5ff'; cx.beginPath(); cx.arc(q[0], q[1] - 14 * scale, 3 * scale, 0, 7); cx.fill(); });
  (S.fx || []).forEach(function (f) { var q = W2S(f.x, f.y); cx.fillStyle = 'rgba(255,146,43,' + f.t + ')'; cx.beginPath(); cx.arc(q[0], q[1], (1 - f.t) * 40 * scale + 8, 0, 7); cx.fill(); });
  fx.pops.forEach(function (o) { var q = W2S(o.x, o.y - (1.1 - o.t) * .8); cx.globalAlpha = clamp(o.t, 0, 1); label(q[0], q[1], o.txt, o.col, 11); cx.globalAlpha = 1; });
  var c = sim.clock(), night = c.hour >= 20 || c.hour < 6 ? .42 : c.hour >= 18 ? (c.minute - 1080) / 120 * .42 : c.hour < 7 ? (420 - c.minute) / 60 * .42 : 0; if (night > 0) { cx.fillStyle = 'rgba(10,18,48,' + night.toFixed(3) + ')'; cx.fillRect(0, 0, W, Hh); }
  if (flash > 0) { cx.fillStyle = 'rgba(255,60,60,' + (flash * 1.2).toFixed(2) + ')'; cx.fillRect(0, 0, W, Hh); }
  S.incidents.forEach(function (inc) { var q = W2S(inc.x, inc.y); if (q[0] > 20 && q[0] < W - 20 && q[1] > 20 && q[1] < Hh - 20) { label(q[0], q[1] - 70 * scale, '⚠ ' + inc.label.toUpperCase(), '#ffb347', 11); return; }
    var a = Math.atan2(q[1] - Hh / 2, q[0] - W / 2), ex = W / 2 + Math.cos(a) * (W / 2 - 34), ey = Hh / 2 + Math.sin(a) * (Hh / 2 - 34); ex = clamp(ex, 30, W - 30); ey = clamp(ey, 60, Hh - 60);
    cx.save(); cx.translate(ex, ey); cx.rotate(a); cx.fillStyle = inc.tier === 'major' ? '#ff6b6b' : '#ffb347'; cx.beginPath(); cx.moveTo(14, 0); cx.lineTo(-8, -9); cx.lineTo(-8, 9); cx.fill(); cx.restore(); label(ex, ey + 22, inc.label + ' · ' + Math.round(hyp(inc.x - p.x, inc.y - p.y)) + 'm', '#ffd8a8', 9); });
}
function drawMini() { var G = sim.G, w = mini.width, h = mini.height, kx = w / G.W, ky = h / G.H; mx.drawImage(base, 0, 0, w, h);
  mx.fillStyle = 'rgba(0,0,0,.25)'; mx.fillRect(0, 0, w, h);
  S.robots.forEach(function (r) { if (r.riding || r.st === 'down') return; mx.fillStyle = r.security ? '#4dabf7' : r.hostile ? '#ff6b6b' : '#adb5bd'; mx.fillRect(r.x * kx - 2, r.y * ky - 2, 4, 4); });
  S.supers.forEach(function (s) { if (s.state === 'captured') return; mx.fillStyle = sim.sdef(s.id).color; mx.beginPath(); mx.arc(s.x * kx, s.y * ky, 3.5, 0, 7); mx.fill(); });
  S.incidents.forEach(function (i) { mx.strokeStyle = '#ffb347'; mx.lineWidth = 2; mx.beginPath(); mx.arc(i.x * kx, i.y * ky, 9 + Math.sin(S.t * 6) * 2, 0, 7); mx.stroke(); });
  mx.fillStyle = '#2ec4b6'; mx.beginPath(); mx.arc(S.player.x * kx, S.player.y * ky, 4.5, 0, 7); mx.fill(); mx.strokeStyle = '#fff'; mx.lineWidth = 1.5; mx.stroke(); }
