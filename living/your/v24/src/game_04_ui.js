
/* ---------------------------------------------------------------- HUD + menus */
var hudT = 0, ui = { menu: false, hist: false, focus: 0, histAll: false };
function bar(lbl, v, col) { return '<span>' + lbl + '</span><div class="bar"><i style="width:' + clamp(v, 0, 100).toFixed(0) + '%;background:' + col + '"></i></div>'; }
function hud() {
  var c = sim.clock(), p = S.player, z = sim.zoneAt(p.x, p.y), Z = S.zones[z], M = C.director.modes[S.director.mode];
  $('hudL').innerHTML = '<div class="brand"><b>Y.O.U.R. Experience</b> — Experience Wonders · LIVING DISTRICT v2.4 · PROPOSAL_HOLD</div>' +
    '<div class="clk">Day ' + c.day + ' · ' + c.weekday.slice(0, 3) + ' ' + c.hhmm + '</div>' +
    '<div class="row"><span class="hearts">' + '♥'.repeat(p.hp) + '<span style="opacity:.25">' + '♥'.repeat(Math.max(0, HC.hp - p.hp)) + '</span></span><span class="chip mode">' + (p.ko > 0 ? 'KNOCKED DOWN' : p.mode.toUpperCase()) + '</span><span class="chip dir">' + M.label.toUpperCase() + '</span>' + (hs.comboPts > 0 ? '<span class="chip">COMBO ' + Math.round(hs.comboPts) + ' ×' + Math.max(1, hs.combo) + '</span>' : '') + '</div>' +
    '<div class="row small">' + C.zones[z].name + (Z.security ? ' · security ' + Z.security : '') + ' · Iteron gen ' + S.iteron.gen + '</div>' +
    '<div class="bars">' + bar('Infra', Z.infrastructure, '#4dabf7') + bar('Trust', Z.confidence, '#51cf66') + bar('Crime', Z.crime, '#fa5252') + bar('Damage', Z.damage, '#fd7e14') + '</div>';
  var A = sim.activeObjectives();
  $('hudR').innerHTML = A.map(function (i) { return '<div class="inc"><h4>⚠ ' + esc(i.label) + ' · ' + esc(i.zone) + (i.phase !== 'active' ? ' · ' + esc(i.phase) : '') + ' · ' + i.left + 's</h4><div class="cause">' + esc(i.cause) + '</div>' +
    i.objectives.map(function (o) { return '<div class="ob ' + o.state + '">' + (o.state === 'done' ? '✔' : o.state === 'failed' ? '✖' : '☐') + ' ' + esc(o.label) + (o.by ? ' · ' + esc(o.by === 'mella' ? 'Mella' : (sim.sdef(o.by) || { codename: o.by }).codename) : '') + '</div>'; }).join('') +
    (i.heroes.length ? '<div class="heroes">Heroes: ' + esc(i.heroes.join(' · ')) + '</div>' : '<div class="heroes">No heroes responding yet</div>') + '</div>'; }).join('');
  if (feedDirty) { feedDirty = false; $('feed').innerHTML = S.feed.slice(-4).map(function (f) { return '<div class="' + f.kind + '">' + (f.kind === 'history' ? '' : esc(f.at) + ' · ') + esc(f.text) + '</div>'; }).join(''); }
}
function menuItems() { return Array.prototype.slice.call(document.querySelectorAll(ui.menu ? '#menuCard .mb' : '#histCard .mb')); }
function openMenu(on) { ui.menu = on; ui.hist = false; $('menu').classList.toggle('on', on); $('hist').classList.remove('on'); if (on) renderMenu(); ui.focus = 0; focusItem(); count(on ? 'menu_open' : 'menu_close'); }
function openHist(on) { ui.hist = on; ui.menu = false; $('hist').classList.toggle('on', on); $('menu').classList.remove('on'); if (on) renderHist(); ui.focus = 0; focusItem(); count(on ? 'hist_open' : 'hist_close'); }
function focusItem() { var it = menuItems(); it.forEach(function (b, i) { b.classList.toggle('focus', i === ui.focus && usingPad); }); }
function renderMenu() {
  var V = C.villains, M = S.director.mode;
  var DV = S.divider || {}, RP = S.rep || {}, DS = sim.dividerStatus();
  $('menuCard').innerHTML = '<h2>Y.O.U.R. City · Living District · menu</h2><div class="small">The main Y.O.U.R. city (owner t88s472) · CCE 2.0 · PROPOSAL_HOLD · nothing here is published. Times are in-game.</div>' +
    '<h3>Event director</h3><div class="btns">' + Object.keys(C.director.modes).map(function (k) { var m = C.director.modes[k]; return '<button class="mb' + (k === M ? ' sel' : '') + '" data-mode="' + k + '">' + m.label + '<br><span class="small">minor ' + m.minorMin.join('–') + ' min · major ' + m.majorMin.join('–') + ' min · patrols ' + m.patrols.join('–') + ' · ' + Math.round(m.intensity * 100) + '%</span><span class="tag">' + m.tag + '</span></button>'; }).join('') + '</div>' +
    '<div class="small">All modes keep villain plans, civilian life and city consequences running; the setting only changes how often disruptions reach you (owner spec §4).</div>' +
    '<h3>Game</h3><div class="btns"><button class="mb" data-act="resume">Resume</button><button class="mb" data-act="save">Save now</button><button class="mb" data-act="hist">City history</button><button class="mb" data-act="morrow">Travel to Morrow City</button><button class="mb" data-act="newcity">New city (new seed)</button><a class="mb" href="index.html?valence=1" style="text-decoration:none" data-act="back" id="valenceLink">Play the Valence day</a></div>' +
    '<div class="small" id="saveMsg">' + (L.lastSave ? 'Last save: ' + L.lastSave.why + ' · ' + L.lastSave.bytes + ' bytes' : 'Autosaves every 20 s and after every incident.') + '</div>' +
    '<h3>Controls</h3><table class="v"><tr><td>Move</td><td>WASD / arrows · left stick / D-pad · touch stick</td></tr><tr><td>Hit · Blast · Dash</td><td>J · L · K &nbsp;|&nbsp; X · B · RB &nbsp;|&nbsp; HIT · BLAST · DASH</td></tr><tr><td>Jump / ollie</td><td>Space · A · JUMP (in the air on the board: Hit / Blast = tricks; land on a rail to grind)</td></tr><tr><td>Talk / act</td><td>E · Y · TALK/ACT (talk, heal, revive heroes, capture cores, open the truck, recover loot, ask Veyru to stay)</td></tr><tr><td>Calm</td><td>C · LB · CALM (eases nearby civilians)</td></tr><tr><td>Skate · Car</td><td>Q · LT · SKATE &nbsp;|&nbsp; F · RT · CAR (near your teal car at Riverside)</td></tr><tr><td>Menu · History</td><td>Esc/P · Start &nbsp;|&nbsp; H · Back/Select</td></tr></table>' +
    '<h3>The six villains (proposed original characters, owner spec t83u)</h3><table class="v">' + Object.keys(V).map(function (k) { return '<tr><td><b>' + V[k].name + '</b><br><span class="small">' + V[k].title + '</span></td><td>' + V[k].slice + '</td></tr>'; }).join('') + '</table>' +
    '<h3>Public opinion (city confidence ' + Math.round(DS.confidence) + '%)</h3><table class="v">' + Object.keys(RP).map(function (k) { return '<tr><td>' + (k === 'mella' ? 'Mella' : sim.sdef(k).codename) + '</td><td>' + Math.round(RP[k]) + ' / 100' + (DV.rival && DV.rival.id === k ? ' · recruited by ' + DV.rival.name : '') + '</td></tr>'; }).join('') + '</table>' +
    '<div class="small">The Divider: ' + (DS.dormant ? 'lying low after being exposed' : DS.planned ? 'planning something' : 'watching') + ' · exposure ' + Math.round(DV.exposure || 0) + '% · forgery skill ' + (DV.mods ? DV.mods.forgery.toFixed(2) : '–') + '. Look for EVIDENCE (E to examine), talk to or CALM feuding heroes.</div>' +
    '<h3>This city right now</h3><div class="small">Iteron generation ' + S.iteron.gen + ' (melee guard ' + Math.round(S.iteron.mods.meleeGuard * 100) + '%, blast dodge ' + Math.round(S.iteron.mods.blastDodge * 100) + '%) · lab ' + (S.labRevealed ? 'REVEALED under the Old Foundry' : 'unknown') + ' · prototype cores ' + S.research + ' · discoveries ' + Object.keys(S.discovered).length + '/' + C.discoveries.length + ' · skate best ' + S.skate.best + ' · mural ' + Math.round(S.mural) + '%</div>' +
    '<div class="small">Placeholders: the five heroes and every vehicle are drawn shapes (no art yet); robots reuse METAL machine sprites; Veyru uses the temporary 64 px frames and the KAW Living Brain v0.1 with DEFAULT rules (ask to leave home each time; a no means come back home to ask again; no hunger/thirst in the city). Veyru lives at Riverside A.</div>';
  Array.prototype.forEach.call(document.querySelectorAll('#menuCard [data-mode]'), function (b) { b.onclick = function () { sim.setMode(b.getAttribute('data-mode')); save('mode'); renderMenu(); }; });
  Array.prototype.forEach.call(document.querySelectorAll('#menuCard [data-act]'), function (b) { b.onclick = function (e) { var a = b.getAttribute('data-act');
    if (a === 'resume') openMenu(false); else if (a === 'save') { save('manual'); renderMenu(); } else if (a === 'hist') openHist(true); else if (a === 'morrow') { openMenu(false); openMorrow('hero'); }
    else if (a === 'newcity') { if (confirm('Start a new city? The current city save is replaced in this browser (the hero profile and Passport are kept).')) { localStorage.removeItem(C.saveKey); location.search = '?new=1'; } }
    else if (a === 'back') { save('leave'); } }; });
}
function renderHist() {
  var H2 = S.history.slice().reverse().filter(function (h) { return ui.histAll || (h.type !== 'scout_sighting'); });
  $('histCard').innerHTML = '<h2>City history</h2><div class="small">Everything that happened in the district, whether or not Mella was there. ' + S.history.length + ' entries.</div><div class="btns" style="margin:6px 0"><button class="mb" data-h="close">Close</button><button class="mb" data-h="all">' + (ui.histAll ? 'Hide' : 'Show') + ' quiet scout sightings</button></div>' +
    (H2.length ? H2.slice(0, 120).map(function (h) { return '<div class="hist ' + h.outcome + '">' + esc(h.text) + (h.cause ? '<div class="small">Cause: ' + esc(h.cause) + '</div>' : '') + (h.consequences && h.consequences.length ? '<div class="small">Consequences: ' + esc(h.consequences.join(' · ')) + '</div>' : '') + '</div>'; }).join('') : '<div class="small">Nothing yet — it is an ordinary day. For now.</div>');
  Array.prototype.forEach.call(document.querySelectorAll('#histCard [data-h]'), function (b) { b.onclick = function () { if (b.getAttribute('data-h') === 'close') openHist(false); else { ui.histAll = !ui.histAll; renderHist(); } }; });
}
function menuNav(inp) { var it = menuItems(), P = inp.pressed; if (P.menu && ui.menu) return openMenu(false); if ((P.hist || P.back) && ui.hist) return openHist(false); if (P.back && ui.menu) return openMenu(false);
  if (P.down || P.right) { ui.focus = (ui.focus + 1) % it.length; focusItem(); } if (P.up || P.left) { ui.focus = (ui.focus - 1 + it.length) % it.length; focusItem(); }
  if ((P.confirm || P.jump) && it[ui.focus]) it[ui.focus].click(); }

/* ---------------------------------------------------------------- main loop */
var last = 0, timeScale = +(Q.get('ts') || 1), paused = false;
function frame(now) {
  var dt = last ? Math.min(.1, (now - last) / 1000) : 0; last = now;
  try {
    var inp = readInput();
    if (ui.menu || ui.hist) menuNav(inp);
    else { if (inp.pressed.menu) openMenu(true); else if (inp.pressed.hist) openHist(true); }
    if (!(ui.menu || ui.hist) && !paused) { heroStep(dt, inp); shotsStep(dt); veyruStep(dt); sim.tick(dt, timeScale); }
    fx.pops.forEach(function (o) { o.t -= dt; }); fx.pops = fx.pops.filter(function (o) { return o.t > 0; }); flash = Math.max(0, flash - dt);
    if (hs.talkT <= 0) $('talk').classList.remove('on');
    draw(); hudT -= dt; if (hudT <= 0) { hudT = .2; hud(); drawMini(); }
    saveT += dt; if (saveT > 20 || pendingSave) { saveT = 0; pendingSave = false; save('auto'); }
  } catch (e) { L.error = String(e && e.stack || e); console.error(e); }
  requestAnimationFrame(frame);
}
function init() {
  cv = $('cv'); cx = cv.getContext('2d'); mini = $('mini'); mx = mini.getContext('2d');
  boot(); NPCV = []; [IMG.npc0, IMG.npc1].forEach(function (im) { if (im) TINTS.forEach(function (d) { NPCV.push(tinted(im, d)); }); });
  prerender(); resize(); addEventListener('resize', resize); setupTouch();
  cam.x = S.player.x * T; cam.y = S.player.y * T;
  $('bMenu').onclick = function () { openMenu(!ui.menu); }; $('bHist').onclick = function () { openHist(!ui.hist); };
  addEventListener('pagehide', function () { save('pagehide'); }); document.addEventListener('visibilitychange', function () { if (document.hidden) save('hidden'); });
  $('boot').style.display = 'none'; L.ready = true; requestAnimationFrame(frame);
}
/* ---------------------------------------------------------------- QA hooks (used by qa/run_v24_qa.js; harmless in play) */
L.qa = {
  advance: function (sec, step) { return sim.advance(sec, step); },
  kaw: { ask: function () { return veyruAsk(); }, step: function (sec) { var acts = {}; for (var t = 0; t < sec; t += .05) { veyruStep(.05); acts[S.game.veyru.brain.activity] = 1; } return Object.keys(acts); }, put: function (x, y) { var k = S.game.veyru; k.x = x; k.y = y; }, home: KHOME, force: function (on) { var b = S.game.veyru.brain; b.accompanied = !!on; b.currentMap = on ? 'DISTRICT' : 'HOME'; } },
  place: function (x, y) { S.player.x = x; S.player.y = y; S.player.mode = 'walk'; var k = S.game.veyru; if (k.brain.accompanied && !k.inCar) { k.x = x - .8; k.y = y + .4; } cam.x = x * T; cam.y = y * T; },
  spawn: function (type, tier) { var i = sim.spawnIncident(type, tier, 'qa'); return i && i.id; },
  div: function () { return { st: sim.dividerStatus(), rep: JSON.parse(JSON.stringify(S.rep || {})), mods: S.divider && S.divider.mods, learn: S.divider && S.divider.learn,
    evidence: S.items.filter(function (i) { return i.kind === 'evidence'; }).map(function (i) { return { x: i.x, y: i.y, inc: i.inc, prog: i.prog }; }),
    incs: S.incidents.filter(function (i) { return i.div; }).map(function (i) { return { id: i.id, type: i.type, x: i.x, y: i.y, div: i.div, objectives: i.objectives }; }),
    feud: S.supers.filter(function (s) { return s.state === 'feud'; }).map(function (s) { return { id: s.id, x: s.x, y: s.y, feud: s.feud }; }) }; },
  morrow: { open: function (lead) { return openMorrow(lead || 'hero'); }, close: function (s) { closeMorrow(s); }, near: function () { return morrowNear(); }, gate: function () { return { x: MORROW.x, y: MORROW.y }; }, state: function () { return { open: !!MORROW.overlay, visits: MORROW.visits, last: MORROW.last, paused: paused }; } },
  setTimeScale: function (k) { timeScale = k; }, pause: function (on) { paused = on; },
  save: function () { return save('qa'); }, menu: openMenu, hist: openHist, hud: hud,
  state: function () { var p = S.player; return { t: +S.t.toFixed(2), clock: sim.clock(), mode: S.director.mode, player: { x: +p.x.toFixed(2), y: +p.y.toFixed(2), hp: p.hp, ko: p.ko, mode: p.mode, dir: p.dir, z: +(p.z || 0).toFixed(2) },
    incidents: sim.activeObjectives(), history: S.history.length, lastHistory: S.history[S.history.length - 1], stats: L.stats, nimbus: L.lastNimbus, buildings: S.buildings, zones: S.zones, skate: S.skate, hs: { air: hs.air, grind: !!hs.grind, comboPts: hs.comboPts },
    robots: S.robots.map(function (r) { return { id: r.id, cls: r.cls, x: +r.x.toFixed(2), y: +r.y.toFixed(2), hp: +r.hp.toFixed(1), st: r.st, inc: r.inc, hostile: r.hostile, riding: !!r.riding, patrol: !!r.patrol }; }),
    civs: S.civs.map(function (c) { return { id: c.id, x: +c.x.toFixed(2), y: +c.y.toFixed(2), action: c.action, inside: c.inside, injured: c.injured, mem: c.mem.length, opinion: c.opinion }; }),
    supers: S.supers.map(function (s) { return { id: s.id, state: s.state, x: +s.x.toFixed(2), y: +s.y.toFixed(2), hp: Math.round(s.hp), obj: s.obj }; }),
    veyru: (function (k) { var b = k.brain; return { action: b.activity, reason: b.reason, mood: KB.mood(b), accompanied: b.accompanied, staying: b.stayUntil != null, lock: !!k.lock, bond: +b.bond.toFixed(1), needs: b.needs, x: +k.x.toFixed(2), y: +k.y.toFixed(2), inCar: !!k.inCar, maxStep: k.maxStep || 0, home: KHOME, valid: KB.valid(b), events: b.events.slice(-6).map(function (e) { return e.type; }) }; }(S.game.veyru)), outbox: S.outbox.length, minSpawnDistPx: Math.round(S.stats.minSpawnDist * T), spawns: S.stats.spawns, saveId: S.saveId, boot: S.game.bootCount, lastTalk: L.lastTalk, touchUI: !!L.touchUI }; }
};
loadAll(function () { try { init(); } catch (e) { L.error = String(e && e.stack || e); console.error(e); $('boot').innerHTML = '<div class="t">Living District failed to start</div><div class="small">' + esc(L.error) + '</div>'; } });
})();
