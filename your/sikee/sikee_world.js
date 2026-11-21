/* SIKEE WORLD — villains that turn things to wood and grass, Sikee as the main boss,
 * encounters on the road, house intrusions, home plants, and the KAW home check.
 * Design: wir-100-studio octec/sections/sikee/DESIGN_SIKEE_BOSS_AND_VILLAINS_v1.md
 * Reads the game's globals (GM().S, GM().G, GM().T, GM().cx, GM().walkable, GM().toast, GM().save, enterMap) at call time.
 * Art is procedural placeholder until the owner's sprites are cut in.
 * Keys: M Mella on/off · in a fight: WASD move, J punch (3-hit combo), B blast, Space/Shift dodge, X run · K send KAW home · G repair a nearby wreck (hold 3s).
 * The fight is real-time in the world: villains chase, show a red marker, then strike. */
(function () {
  'use strict';
  const GM = () => window.WIR_GAME;

  const VILLAINS = [
    { id: 'if00', name: 'IF-00', title: 'The First Condition', col: '#ff7d2a', dark: '#3a1d0c', hp: 40, dmg: 5, every: 1.6, pose: 'pose_if00' },
    { id: 'pweza', name: 'PWEZA', title: 'Parallel Process Coordinator', col: '#e0408a', dark: '#3b1024', hp: 55, dmg: 6, every: 1.5, pose: 'pose_pweza' },
    { id: 'tembo', name: 'TEMBO', title: 'Persistent World Memory', col: '#3c8dff', dark: '#14213d', hp: 80, dmg: 8, every: 1.9, pose: 'pose_tembo' },
    { id: 'duma', name: 'DUMA', title: 'Latency Governor', col: '#ffc73a', dark: '#1a1408', hp: 45, dmg: 7, every: 1.2, pose: 'pose_duma' },
    { id: 'buibui', name: 'BUIBUI', title: 'Dependency-Web Architect', col: '#38d6d0', dark: '#122a2c', hp: 50, dmg: 6, every: 1.4, pose: 'pose_buibui' },
    { id: 'simba', name: 'SIMBA', title: 'World Orchestrator', col: '#d63a2a', dark: '#2a0f0b', hp: 70, dmg: 7, every: 1.5, pose: 'pose_simba' },
    { id: 'fisi', name: 'FISI', title: 'Recycler and Scavenger', col: '#7cc24a', dark: '#23301a', hp: 60, dmg: 6, every: 1.5, pose: 'pose_fisi' },
  ];
  const SIKEE_DEF = { id: 'sikee', name: 'Sikee', title: 'Authority form', col: '#c9913a', dark: '#241a12', hp: 200, boss: true };
  const SIKEE_PHASES = [{ dmg: 6, every: 1.2 }, { dmg: 9, every: .9 }, { dmg: 12, every: .7 }];
  // Sprite sheets per phase, with the number of filled frames in row 0.
  const SIKEE_SHEETS = [{ name: 'sikee_authority', cols: 8 }, { name: 'sikee_mella', cols: 6 }, { name: 'sikee_ultra', cols: 7 }];
  const CIVILIANS = ['a Savannah baker', 'a schoolkid', 'a market vendor', 'a bus driver'];
  const HOME_HP = 60, MELLA_HIT = 12, HIT_CD = .35, RUN_CD = 3, PLANT_STEP_MS = 10 * 60 * 1000, KAW_TRIP_MS = 20000;
  // Crimes: a villain on the road wrecks a tile every CRIME_MIN..CRIME_MAX seconds until it is beaten or escapes.
  const CRIME_MIN = 18, CRIME_MAX = 28, ESCAPE_MS = 5 * 60 * 1000;
  // Wrecks stay until repaired (stand next to one and hold G for REPAIR_S). Unrepaired wrecks spread every GROW_MS.
  const REPAIR_S = 3, GROW_MS = 10 * 60 * 1000, WRECK_CAP = 40;
  // Lingering effects: standing within WRECK_NEAR tiles of a wreck slows you to WRECK_SLOW of normal speed;
  // every UPKEEP_S seconds the city bills $UPKEEP_FEE per unrepaired wreck (real time, see note in PR).
  const WRECK_NEAR = 0.8, WRECK_SLOW = 0.55, UPKEEP_S = 60, UPKEEP_FEE = 5;

  // Fight moves: punch (J) builds charge; blast (B) spends it for a big hit at range.
  const PUNCH_CHARGE = 15, CHARGE_MAX = 100, BLAST_COST = 40, BLAST_DMG = 30, BLAST_CD = 1.0, START_CHARGE = 20;

  const R = { wanderers: [], battle: null, dist: 0, cool: 0, lastX: undefined, lastY: undefined, lastMap: null,
    hp: HOME_HP, mella: false, hud: null, rolled: 0, charge: 0, blastCool: 0 };

  // ---- saved state (lives in GM().S.sikee, so GM().save() keeps it) ----
  function st() {
    if (!GM().S) return null;
    if (!GM().S.sikee) GM().S.sikee = { defeated: 0, rescued: 0, failed: 0, bossDown: false, woodTiles: [], rescues: [],
      plantStart: Date.now(), intrusions: 0, kawBlocked: 0, kawTrip: null, wrecks: [] };
    if (!GM().S.sikee.wrecks) GM().S.sikee.wrecks = [];
    return GM().S.sikee;
  }
  function plantStage() { const s = st(); return s ? Math.min(4, Math.floor((Date.now() - s.plantStart) / PLANT_STEP_MS)) : 0; }

  // ---- spawning ----
  function freeTileNear(cx0, cy0, minD, maxD) {
    const m = GM().G.map;
    for (let tries = 0; tries < 80; tries++) {
      const a = Math.random() * Math.PI * 2, d = minD + Math.random() * (maxD - minD);
      const x = Math.floor(cx0 + Math.cos(a) * d), y = Math.floor(cy0 + Math.sin(a) * d);
      if (GM().walkable(m, x, y)) return [x + .5, y + .5];
    }
    return null;
  }
  function makeWanderer(def, pos, opts) {
    const w = Object.assign({ def, boss: !!def.boss, x: pos[0], y: pos[1], hp: def.hp, max: def.hp,
      map: GM().G.map.id, dx: 0, dy: 0, timer: 0, hold: null, crimeT: CRIME_MIN + Math.random() * (CRIME_MAX - CRIME_MIN), since: Date.now(), crimes: 0 }, opts || {});
    R.wanderers.push(w);
    return w;
  }
  function spawnRoadVillain() {
    const s = st(); if (!s || !GM().G.map || GM().G.map.id === 'HOME') return;
    const onMap = R.wanderers.filter(w => w.map === GM().G.map.id && !w.boss).length;
    if (onMap >= 2) return;
    const pos = freeTileNear(GM().G.px, GM().G.py, 5, 10); if (!pos) return;
    const def = VILLAINS[Math.floor(Math.random() * VILLAINS.length)];
    const w = makeWanderer(def, pos);
    if (Math.random() < 1 / 3 && s.rescues.filter(r => r.state === 'open').length < 2) {
      const r = { id: 'r' + Date.now().toString(36) + Math.floor(Math.random() * 1e3), name: CIVILIANS[Math.floor(Math.random() * CIVILIANS.length)],
        map: GM().G.map.id, x: w.x, y: w.y, deadline: Date.now() + 180000, state: 'open' };
      s.rescues.push(r); w.hold = r.id;
      GM().toast(def.name + ' took ' + r.name + '. Get them back within 3 minutes.', 'bad');
    } else GM().toast(def.name + ' is on the road.', 'dim');
    GM().save();
  }
  function spawnSikeeOnRoad() {
    if (!GM().G.map || GM().G.map.id === 'HOME') return;
    if (R.wanderers.some(w => w.boss)) return;
    const pos = freeTileNear(GM().G.px, GM().G.py, 6, 11); if (!pos) return;
    makeWanderer(SIKEE_DEF, pos);
    GM().toast('Sikee is on the road.', 'gold');
  }

  // ---- crimes, wrecks and repair ----
  function wreckAt(map, x, y) { const s = st(); return s && s.wrecks.find(k => k.map === map && k.x === x && k.y === y); }
  function wreckCount(map) { const s = st(); return s ? s.wrecks.filter(k => k.map === map).length : 0; }
  function addWreck(map, x, y, by) {
    const s = st(); if (wreckAt(map, x, y) || s.wrecks.length >= WRECK_CAP) return false;
    s.wrecks.push({ id: 'w' + Date.now().toString(36) + Math.floor(Math.random() * 1e4), map, x, y, by, grown: Date.now() });
    return true;
  }
  function commitCrime(w) {
    const s = st(), m = GM().G.map;
    const pos = freeTileNear(w.x, w.y, 1, 2.5); if (!pos) return;
    const x = Math.floor(pos[0]), y = Math.floor(pos[1]);
    if (!addWreck(m.id, x, y, w.def.name)) return;
    w.crimes++;
    GM().toast(w.def.name + ' wrecked a tile. Beat it to stop the damage.', 'bad');
    GM().save();
  }
  function growWrecks(now) {
    const s = st(); if (!s) return;
    const map = GM().G.map; if (!map) return;
    // wrecks only spread on the map you are on: walkability is checked against the live map
    for (const k of s.wrecks.slice()) {
      if (k.map !== map.id || now - k.grown < GROW_MS) continue;
      k.grown = now;
      const d = [[1, 0], [-1, 0], [0, 1], [0, -1]][Math.floor(Math.random() * 4)];
      const nx = k.x + d[0], ny = k.y + d[1];
      if (GM().walkable(map, nx, ny) && addWreck(map.id, nx, ny, 'spread')) {
        GM().toast('A wreck spread. Repair them before they take more road.', 'bad');
        GM().save();
      }
    }
  }
  // Called by the main game's movePlayer(): slows the player near wrecks on the current map.
  function wreckSlow() {
    const s = st(), m = GM().G && GM().G.map; if (!s || !m || !s.wrecks.length) return 1;
    for (const k of s.wrecks) {
      if (k.map !== m.id) continue;
      if (Math.hypot(k.x + .5 - GM().G.px, k.y + .5 - GM().G.py) < WRECK_NEAR) return WRECK_SLOW;
    }
    return 1;
  }
  function tickUpkeep(dt) {
    const s = st(), S = GM().S; if (!s || !S) return;
    R.upkeepT = (R.upkeepT || 0) + dt;
    if (R.upkeepT < UPKEEP_S) return;
    R.upkeepT = 0;
    const n = s.wrecks.length; if (!n) return;
    const fee = Math.min(S.money, UPKEEP_FEE * n);
    if (fee <= 0) return;
    S.money -= fee;
    GM().toast('City cleanup fee: -$' + fee + ' for ' + n + ' unrepaired wreck' + (n > 1 ? 's' : '') + '.', 'bad');
    GM().save();
  }
  function startRepair() {
    const s = st(), m = GM().G.map; if (!s || !m || R.battle) return;
    let best = null, bd = 1.6;
    for (const k of s.wrecks) {
      if (k.map !== m.id) continue;
      const d = Math.hypot(k.x + .5 - GM().G.px, k.y + .5 - GM().G.py);
      if (d < bd) { bd = d; best = k; }
    }
    if (!best) { GM().toast('Nothing to repair nearby.', 'dim'); return; }
    R.repairing = best; R.repairT = 0;
    GM().toast('Repairing... hold still.', 'gold');
  }
  function tickRepair(dt) {
    const s = st(); if (!R.repairing || !s) return;
    const k = R.repairing;
    if (!s.wrecks.includes(k)) { R.repairing = null; return; }
    const d = Math.hypot(k.x + .5 - GM().G.px, k.y + .5 - GM().G.py);
    if (d > 1.8 || GM().G.map.id !== k.map) { R.repairing = null; GM().toast('Repair cancelled.', 'dim'); return; }
    R.repairT += dt;
    if (R.repairT >= REPAIR_S) {
      s.wrecks.splice(s.wrecks.indexOf(k), 1);
      R.repairing = null;
      GM().toast('Repaired. The road is back.', 'gold');
      GM().save();
    }
  }

  // ---- movement, encounters and contact ----
  function moveWanderers(dt) {
    const m = GM().G.map; if (!m) return;
    for (const w of R.wanderers) {
      if (w.map !== m.id || (R.battle && R.battle.foe === w)) continue;
      w.timer -= dt;
      if (w.timer <= 0) {
        w.timer = 1 + Math.random() * 2; const a = Math.random() * Math.PI * 2, sp = w.boss ? .8 : .6;
        w.dx = Math.cos(a) * sp; w.dy = Math.sin(a) * sp;
      }
      const nx = w.x + w.dx * dt, ny = w.y + w.dy * dt;
      if (GM().walkable(m, Math.floor(nx), Math.floor(ny))) { w.x = nx; w.y = ny; } else w.timer = 0;
    }
  }
  // ---- real-time fight ----
  // The fight happens in the world: you walk, punch (J, 3-hit combo), blast (B), and dodge (Space/Shift).
  // Villains chase, telegraph an attack (red marker on the ground), then strike. Dodge out of the marker to avoid it.
  const FOE_R = .45, PL_R = .35, ENGAGE = 1.6;
  const ATKS = {
    lunge: { wind: .55, act: .22, rec: .7, reach: 2.6, rad: .75 },
    dash:  { wind: .3,  act: .2,  rec: .45, reach: 3.4, rad: .7 },
    slam:  { wind: .85, act: .12, rec: .85, rad: 2.0 },
    orb:   { wind: .5,  act: .05, rec: .6, speed: 4.5, rad: .3 },
  };
  const FOE_ATKS = { if00: ['lunge'], pweza: ['slam', 'dash'], tembo: ['slam'], duma: ['dash', 'lunge'], buibui: ['orb'], simba: ['slam', 'orb'], fisi: ['lunge', 'slam'] };
  const BOSS_ATKS = [['lunge', 'slam'], ['lunge', 'slam', 'orb'], ['dash', 'slam', 'orb']];
  const FOE_SPEED = { if00: 2.1, pweza: 2.2, tembo: 1.5, duma: 2.7, buibui: 1.9, simba: 2.0, fisi: 2.0, sikee: 1.9 };
  const DODGE_T = .2, DODGE_DIST = 2.4, DODGE_CD = .8, PUNCH_REACH = 1.35;

  function startBattle(w) {
    if (R.battle) return;
    // Contact always brings MELLA up, so a fight can start on any street or at home without a menu step.
    R.mella = true; R.charge = START_CHARGE; R.blastCool = 0;
    R.p = { atkCd: 0, combo: 0, comboT: 0, dodgeT: 0, dodgeCd: 0, inv: .4, flash: 0, fx: 1, fy: 0, dx: 0, dy: 0, arcT: 0, arcA: 0, arcBig: false };
    R.shots = []; R.fx = []; R.stop = 0;
    Object.assign(w, { st: 'idle', stT: 0, cd: .9, kx: 0, ky: 0, face: 1, atk: null, flash: 0, hitstun: 0, ax: 1, ay: 0, hit: false });
    R.battle = { foe: w, strike: 0, foeCool: 1, phase: 1, log: [] };
    for (const k in GM().G.keys) GM().G.keys[k] = 0;
    GM().G.path = []; GM().G.go = null;
    logLine(w.def.name + ' — ' + w.def.title + '. Move, punch (J), blast (B), dodge (Space).');
    showBattle(true);
  }
  // Home intrusion: a villain comes out of the CPU while you are standing in the house.
  function homeIntruder() {
    if (R.battle || R.cool > 0) return false;
    const pos = freeTileNear(GM().G.px, GM().G.py, 1.5, 2.5); if (!pos) return false;
    const def = VILLAINS[Math.floor(Math.random() * VILLAINS.length)];
    const w = makeWanderer(def, pos);
    GM().toast(def.name + ' came out of your CPU.', 'bad');
    startBattle(w);
    return true;
  }
  function logLine(t) { if (!R.battle) return; R.battle.log.push(t); if (R.battle.log.length > 2) R.battle.log.shift(); }

  function canStand(x, y, r) {
    const m = GM().G.map; r = r || .3;
    return [[-r, -r], [r, -r], [-r, r], [r, r]].every(([ox, oy]) => GM().walkable(m, Math.floor(x + ox), Math.floor(y + oy)));
  }
  function nudge(o, dx, dy, r) {   // move o by (dx,dy), sliding along walls
    if (canStand(o.x + dx, o.y, r)) o.x += dx;
    if (canStand(o.x, o.y + dy, r)) o.y += dy;
  }
  function addFx(kind, x, y, extra) { R.fx.push(Object.assign({ kind, x, y, t: 0, max: .35 }, extra || {})); if (R.fx.length > 40) R.fx.shift(); }
  function atkListFor(f, phase) { return f.boss ? BOSS_ATKS[phase - 1] : (FOE_ATKS[f.def.id] || ['lunge']); }

  function hurtPlayer(dmg, dx, dy) {
    const p = R.p, g = GM().G; if (p.inv > 0) return false;
    R.hp -= dmg; p.inv = .55; p.flash = .25; R.stop = .05;
    const l = Math.hypot(dx, dy) || 1, me = { x: g.px, y: g.py };
    nudge(me, dx / l * .9, dy / l * .9, .3); g.px = me.x; g.py = me.y;
    addFx('num', g.px, g.py - .6, { text: '-' + dmg, col: '#ff6b6b', max: .7 });
    logLine(R.battle.foe.def.name + ' hits you for ' + dmg + '.');
    if (R.hp <= 0) { lose(); return true; }
    return true;
  }
  function damageFoe(f, dmg, dx, dy, knock, stagger) {
    f.hp -= dmg; f.flash = .18; const l = Math.hypot(dx, dy) || 1;
    f.kx = dx / l * knock * 6; f.ky = dy / l * knock * 6;
    const armor = f.boss && R.battle.phase >= 2 && f.st === 'wind';
    if (stagger && !armor) { f.st = 'stagger'; f.stT = stagger; f.atk = null; } else f.hitstun = Math.max(f.hitstun, .12);
    addFx('num', f.x, f.y - .9, { text: String(dmg), col: '#ffe066', max: .6 });
    addFx('ring', f.x, f.y - .3, { col: '#ffffff', max: .25, rad: .7 });
    if (f.hp <= 0) win();
  }

  function foeStep(f, dt) {
    const g = GM().G, b = R.battle, p = R.p;
    f.flash = Math.max(0, f.flash - dt);
    if (Math.abs(f.kx) + Math.abs(f.ky) > .05) { nudge(f, f.kx * dt, f.ky * dt, FOE_R * .6); const d = Math.pow(.0005, dt); f.kx *= d; f.ky *= d; }
    let dx = g.px - f.x, dy = g.py - f.y; const dist = Math.hypot(dx, dy) || 1, ux = dx / dist, uy = dy / dist;
    if (f.hitstun > 0) { f.hitstun -= dt; return; }
    const ph = f.boss ? b.phase : 1, list = atkListFor(f, ph), spd = (FOE_SPEED[f.def.id] || 2) * (f.boss && ph === 3 ? 1.25 : 1);
    const ranged = list.length === 1 && list[0] === 'orb' || f.def.id === 'buibui';
    if (f.st === 'stagger') { f.stT -= dt; if (f.stT <= 0) { f.st = 'idle'; f.cd = .5; } return; }
    if (f.st === 'idle') {
      f.face = ux >= 0 ? 1 : -1;
      const bx = f.x, by = f.y;
      if (ranged) {
        if (dist < 2.6) nudge(f, -ux * spd * dt, -uy * spd * dt, FOE_R * .6);
        else if (dist > 4.5) nudge(f, ux * spd * dt, uy * spd * dt, FOE_R * .6);
      } else if (dist > 1.3) nudge(f, ux * spd * dt, uy * spd * dt, FOE_R * .6);
      // walls: if the foe cannot make progress toward you for a moment, it blinks to open ground near you
      if (dist > 2.2 && Math.hypot(f.x - bx, f.y - by) < spd * dt * .3) f.stuck = (f.stuck || 0) + dt; else f.stuck = 0;
      if (f.stuck > 1.5) {
        f.stuck = 0; const pos = freeTileNear(g.px, g.py, 2, 3);
        if (pos) { addFx('ring', f.x, f.y, { col: f.def.col, max: .3, rad: .8 }); f.x = pos[0]; f.y = pos[1]; addFx('ring', f.x, f.y, { col: f.def.col, max: .3, rad: .8 }); }
      }
      f.cd -= dt;
      if (!f.next || !list.includes(f.next)) f.next = list[Math.floor(Math.random() * list.length)];
      const id = f.next, A = ATKS[id];
      const inRange = id === 'orb' ? dist < 7 : id === 'slam' ? dist < 2.3 : dist < A.reach * .95;
      if (f.cd <= 0 && inRange) {
        f.atk = Object.assign({ id }, A); f.st = 'wind'; f.stT = A.wind * (f.boss && ph === 3 ? .8 : 1);
        f.ax = ux; f.ay = uy; f.hit = false; f.next = null;
      }
    } else if (f.st === 'wind') {
      f.stT -= dt; f.face = ux >= 0 ? 1 : -1;
      if (f.stT > f.atk.wind * .35) { f.ax = ux; f.ay = uy; }   // tracks you, then locks on in the last third
      if (f.stT <= 0) {
        f.st = 'act'; f.stT = f.atk.act; f.hit = false;
        if (f.atk.id === 'orb') {
          const n = f.boss && ph >= 2 ? 3 : 1;
          for (let i = 0; i < n; i++) { const a = Math.atan2(f.ay, f.ax) + (i - (n - 1) / 2) * .35; R.shots.push({ x: f.x, y: f.y - .2, vx: Math.cos(a) * f.atk.speed, vy: Math.sin(a) * f.atk.speed, from: 'f', dmg: f.boss ? SIKEE_PHASES[ph - 1].dmg : f.def.dmg, life: 2.2, r: f.atk.rad, col: f.def.col }); }
          f.st = 'rec'; f.stT = f.atk.rec;
        } else if (f.atk.id === 'slam') {
          addFx('ring', f.x, f.y, { col: f.def.col, max: .3, rad: f.atk.rad });
          if (dist < f.atk.rad + PL_R) hurtPlayer(f.boss ? SIKEE_PHASES[ph - 1].dmg : Math.round(f.def.dmg * 1.2), ux, uy);
        }
      }
    } else if (f.st === 'act') {
      f.stT -= dt;
      if (f.atk.id === 'lunge' || f.atk.id === 'dash') {
        nudge(f, f.ax * f.atk.reach / f.atk.act * dt, f.ay * f.atk.reach / f.atk.act * dt, FOE_R * .6);
        if (!f.hit && Math.hypot(g.px - f.x, g.py - f.y) < f.atk.rad + PL_R * .6) { f.hit = hurtPlayer(f.boss ? SIKEE_PHASES[ph - 1].dmg : f.def.dmg, f.ax, f.ay) || f.hit; }
      }
      if (f.stT <= 0) { f.st = 'rec'; f.stT = f.atk.rec; }
    } else if (f.st === 'rec') {
      f.stT -= dt;
      if (f.stT <= 0) { f.st = 'idle'; f.cd = Math.max(.35, (f.boss ? SIKEE_PHASES[ph - 1].every : f.def.every) * .55); f.atk = null; }
    }
  }

  function battleTick(dt) {
    const b = R.battle, f = b.foe, g = GM().G, p = R.p;
    for (const e of R.fx) e.t += dt; R.fx = R.fx.filter(e => e.t < e.max);
    if (R.stop > 0) { R.stop -= dt; updateBattleUI(); return; }      // short hit-stop on impact
    R.blastCool = Math.max(0, R.blastCool - dt);
    p.atkCd = Math.max(0, p.atkCd - dt); p.comboT = Math.max(0, p.comboT - dt); p.inv = Math.max(0, p.inv - dt);
    p.flash = Math.max(0, p.flash - dt); p.arcT = Math.max(0, p.arcT - dt); p.dodgeCd = Math.max(0, p.dodgeCd - dt);
    // facing follows your input; when idle it follows the foe
    const K = g.keys || {}, kx = (K.arrowright || K.d ? 1 : 0) - (K.arrowleft || K.a ? 1 : 0), ky = (K.arrowdown || K.s ? 1 : 0) - (K.arrowup || K.w ? 1 : 0);
    if (kx || ky) { const l = Math.hypot(kx, ky); p.fx = kx / l; p.fy = ky / l; }
    if (p.dodgeT > 0) {
      const step = DODGE_DIST / DODGE_T * dt, me = { x: g.px, y: g.py }; nudge(me, p.dx * step, p.dy * step, .3); g.px = me.x; g.py = me.y;
      p.dodgeT -= dt; if (Math.random() < .6) addFx('ghost', g.px, g.py, { max: .25 });
    }
    if (f.boss) {
      const frac = f.hp / f.max, ph = frac <= .33 ? 3 : frac <= .66 ? 2 : 1;
      if (ph !== b.phase) { b.phase = ph; logLine('Sikee shifts into phase ' + ph + '.'); }
    }
    foeStep(f, dt);
    if (!R.battle) return;
    // shots
    for (const s of R.shots) {
      s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt;
      if (!GM().walkable(g.map, Math.floor(s.x), Math.floor(s.y))) s.life = 0;
      if (s.from === 'p') {
        if (Math.hypot(s.x - f.x, s.y - f.y) < FOE_R + s.r) { s.life = 0; damageFoe(f, s.dmg, s.vx, s.vy, 1.0, .4); logLine('Blast hits ' + f.def.name + ' for ' + s.dmg + '.'); if (!R.battle) return; }
      } else if (Math.hypot(s.x - g.px, s.y - g.py) < PL_R + s.r) { s.life = 0; if (hurtPlayer(s.dmg, s.vx, s.vy) && !R.battle) return; }
    }
    R.shots = R.shots.filter(s => s.life > 0);
    updateBattleUI();
  }

  // Punch: a 3-hit combo. The third hit is heavier and staggers. Auto-aims at a foe in reach.
  function strike() {
    const b = R.battle; if (!b) return; const f = b.foe, g = GM().G, p = R.p;
    if (!R.mella) { logLine('Enter MELLA (M) first.'); updateBattleUI(); return; }
    if (p.atkCd > 0 || p.dodgeT > 0 || R.stop > 0) return;
    p.combo = p.comboT > 0 ? (p.combo + 1) % 3 : 0; p.comboT = .75;
    const big = p.combo === 2, reach = big ? PUNCH_REACH + .35 : PUNCH_REACH;
    let dx = f.x - g.px, dy = f.y - g.py; const dist = Math.hypot(dx, dy) || 1;
    if (dist < reach + 1) { p.fx = dx / dist; p.fy = dy / dist; }     // aim assist
    p.arcT = .18; p.arcA = Math.atan2(p.fy, p.fx); p.arcBig = big;
    p.atkCd = big ? .55 : .3;
    const me = { x: g.px, y: g.py }; nudge(me, p.fx * .25, p.fy * .25, .3); g.px = me.x; g.py = me.y;   // small lunge
    const dot = (f.x - g.px) * p.fx + (f.y - g.py) * p.fy, d2 = Math.hypot(f.x - g.px, f.y - g.py);
    b.strike = HIT_CD;
    if (d2 <= reach + FOE_R * .6 && dot >= 0) {
      const dmg = big ? Math.round(MELLA_HIT * 1.5) : MELLA_HIT;
      R.charge = Math.min(CHARGE_MAX, R.charge + PUNCH_CHARGE);
      logLine((big ? 'Heavy hit' : 'You punch') + ' ' + f.def.name + ' for ' + dmg + '.');
      R.stop = big ? .09 : .05;
      damageFoe(f, dmg, p.fx, p.fy, big ? 1.3 : .5, big ? .5 : 0);
    } else p.atkCd += .1;     // whiff recovery
    updateBattleUI();
  }
  // Blast: spends charge, fires a bolt along your aim. Dodgeable by moving off its line.
  function blast() {
    const b = R.battle; if (!b) return; const f = b.foe, g = GM().G, p = R.p;
    if (!R.mella) { logLine('MELLA is down.'); updateBattleUI(); return; }
    if (R.blastCool > 0) return;
    if (R.charge < BLAST_COST) { logLine('Not enough charge. Punch to build it.'); updateBattleUI(); return; }
    let dx = p.fx, dy = p.fy; const fx = f.x - g.px, fy = f.y - g.py, fd = Math.hypot(fx, fy) || 1;
    if (fd < 9) { dx = fx / fd; dy = fy / fd; p.fx = dx; p.fy = dy; }
    R.charge -= BLAST_COST; R.blastCool = BLAST_CD;
    R.shots.push({ x: g.px, y: g.py - .2, vx: dx * 10, vy: dy * 10, from: 'p', dmg: BLAST_DMG, life: .9, r: .4, col: '#55ddff' });
    addFx('ring', g.px + dx * .5, g.py - .2, { col: '#55ddff', max: .2, rad: .5 });
    logLine('Blast fired.'); updateBattleUI();
  }
  // Dodge: a quick dash with a moment of invulnerability. Use it to leave a red marker.
  function dodge() {
    const b = R.battle; if (!b) return; const g = GM().G, p = R.p, f = b.foe;
    if (p.dodgeCd > 0 || p.dodgeT > 0 || R.stop > 0) return;
    const K = g.keys || {}, kx = (K.arrowright || K.d ? 1 : 0) - (K.arrowleft || K.a ? 1 : 0), ky = (K.arrowdown || K.s ? 1 : 0) - (K.arrowup || K.w ? 1 : 0);
    const pd = g.pad || {}; let dx = kx || (Math.abs(pd.ax) > .3 ? Math.sign(pd.ax) : 0), dy = ky || (Math.abs(pd.ay) > .3 ? Math.sign(pd.ay) : 0);
    if (!dx && !dy) { dx = g.px - f.x; dy = g.py - f.y; }   // no input: back away from the foe
    const l = Math.hypot(dx, dy) || 1; p.dx = dx / l; p.dy = dy / l;
    p.dodgeT = DODGE_T; p.dodgeCd = DODGE_CD; p.inv = Math.max(p.inv, .32);
    updateBattleUI();
  }
  function run() {
    if (!R.battle) return;
    const f = R.battle.foe, g = GM().G;
    if (Math.hypot(f.x - g.px, f.y - g.py) < 2.6) { logLine('Too close to run. Dodge out first.'); updateBattleUI(); return; }
    R.battle = null; R.cool = RUN_CD; R.shots = []; showBattle(false);
    GM().toast('You got clear of ' + f.def.name + '.', 'dim'); GM().save();
  }
  function win() {
    const s = st(), f = R.battle.foe; R.battle = null; R.cool = 1.5; R.shots = []; showBattle(false);
    R.wanderers = R.wanderers.filter(w => w !== f);
    if (f.boss) {
      s.bossDown = true;
      GM().toast('Sikee falls. The wood and grass start to loosen.', 'gold');
    } else {
      s.defeated++;
      // bounty: more for villains that did more damage before they were stopped
      const bounty = 20 + 5 * Math.min(10, f.crimes || 0);
      if (GM().S) GM().S.money += bounty;
      s.bounties = (s.bounties || 0) + bounty;
      const left = wreckCount(GM().G.map.id);
      GM().toast(f.def.name + ' is stopped. +$' + bounty + ' bounty. ' + (left ? left + ' wreck' + (left > 1 ? 's' : '') + ' still need repair here.' : '') + (s.defeated >= 3 ? ' Sikee is watching now.' : ''), 'gold');
    }
    if (f.hold) {
      const r = s.rescues.find(x => x.id === f.hold);
      if (r && r.state === 'open') { r.state = 'rescued'; s.rescued++; GM().toast(r.name + ' is safe.', 'gold'); }
    }
    GM().save();
  }
  function lose() {
    R.battle = null; R.shots = []; showBattle(false); R.cool = 2; R.hp = HOME_HP;
    GM().toast('Knocked out. You wake up at home.', 'bad');
    GM().enterMap("HOME");
    GM().save();
  }

  function tick(dt) {
    const s = st(); if (!s || !GM().G.map) return;
    const m = GM().G.map;
    buildHud();
    if (R.lastMap !== m.id) {
      R.lastMap = m.id; R.wanderers = R.wanderers.filter(w => w.map === m.id);
      R.dist = 0; R.lastX = undefined; R.lastY = undefined;
    }
    if (!R.battle) R.hp = Math.min(HOME_HP, R.hp + dt * 1.5);
    // status line: wrecks and loose villains on this map
    R.stT = (R.stT || 0) - dt;
    if (R.stT <= 0 && R.hud) {
      R.stT = .5;
      const loose = R.wanderers.filter(w => w.map === m.id && !w.boss).length, wr = wreckCount(m.id);
      const el = document.getElementById('skStatus');
      if (el) el.textContent = wr || loose ? 'Wrecks ' + wr + ' · Loose ' + loose : 'Road is clear';
    }

    // open rescues: track the holder; expire them
    const now = Date.now();
    for (const r of s.rescues) {
      if (r.state !== 'open') continue;
      const holder = R.wanderers.find(w => w.hold === r.id);
      if (holder) { r.x = holder.x; r.y = holder.y; r.map = holder.map; }
      if (now > r.deadline) {
        r.state = 'failed'; s.failed++; s.woodTiles.push({ map: r.map, x: r.x, y: r.y });
        R.wanderers = R.wanderers.filter(w => w.hold !== r.id);
        GM().toast(r.name + ' was taken. Wood and grass spread over the road.', 'bad'); GM().save();
      }
    }
    if (s.kawTrip && now >= s.kawTrip.until) finishKaw(s);
    growWrecks(now);
    tickRepair(dt);
    tickUpkeep(dt);

    if (R.battle) { battleTick(dt); return; }

    moveWanderers(dt);
    // crimes: each road villain wrecks a tile on a timer; villains that are not stopped escape after ESCAPE_MS
    for (const w of R.wanderers.slice()) {
      if (w.map !== m.id || w.boss || w.hold) continue;
      w.crimeT -= dt;
      if (w.crimeT <= 0) { commitCrime(w); w.crimeT = CRIME_MIN + Math.random() * (CRIME_MAX - CRIME_MIN); }
      if (now - w.since > ESCAPE_MS) {
        R.wanderers = R.wanderers.filter(x => x !== w);
        GM().toast(w.def.name + ' got away. Its wrecks are still on the road.', 'bad'); GM().save();
      }
    }
    if (R.cool > 0) R.cool -= dt;

    // house: electronics can send a villain out while you are away
    if (Math.random() < dt / 900) {
      if (m.id === 'HOME') {
        // already inside: the villain fights you here, unless KAW is home on guard
        if (s.kawTrip) s.kawBlocked++; else homeIntruder();
      } else if (s.kawTrip) s.kawBlocked++; else { s.intrusions++; GM().toast('Something is coming out of your CPU at home.', 'bad'); GM().save(); }
    }

    // distance walked on the road: rare rolls for a villain, rarer for Sikee
    if (m.id !== 'HOME') {
      if (R.lastX !== undefined) { const d = Math.hypot(GM().G.px - R.lastX, GM().G.py - R.lastY); if (d < 2) R.dist += d; }
      R.lastX = GM().G.px; R.lastY = GM().G.py;
      if (R.dist >= 1) {
        R.dist -= 1;
        // wrecks draw more villains to the area until they are repaired
        if (Math.random() < (wreckCount(m.id) ? 1 / 20 : 1 / 40)) spawnRoadVillain();
        if (s.defeated >= 3 && !s.bossDown && Math.random() < 1 / 60) spawnSikeeOnRoad();
      }
    }

    // contact starts the fight
    if (R.cool <= 0) {
      for (const w of R.wanderers) {
        if (w.map === m.id && Math.hypot(w.x - GM().G.px, w.y - GM().G.py) < ENGAGE) { startBattle(w); break; }
      }
    }
  }

  // ---- entering the house ----
  function onEnterMap(id) {
    if (R.battle) { R.battle = null; R.shots = []; showBattle(false); }
    R.wanderers = R.wanderers.filter(w => w.map === id);
    R.dist = 0; R.lastX = undefined; R.lastY = undefined; R.lastMap = id;
    if (id === 'HOME') {
      R.hp = HOME_HP;
      const s = st(); if (!s) return;
      if (s.intrusions > 0) {
        s.intrusions--; GM().save();
        const pos = freeTileNear(GM().G.px, GM().G.py, 1.5, 2.5);
        if (pos) {
          const def = VILLAINS[Math.floor(Math.random() * VILLAINS.length)];
          const w = makeWanderer(def, pos); R.cool = 0;
          GM().toast(def.name + ' came out of your CPU.', 'bad');
          startBattle(w);
        }
      }
    }
  }

  // ---- KAW home check ----
  function toggleKaw() {
    const s = st(); if (!s || R.battle) return;
    if (s.kawTrip) { GM().toast('KAW is already at home.', 'dim'); return; }
    s.kawTrip = { until: Date.now() + KAW_TRIP_MS };
    GM().toast('KAW is heading home to check the house. Back in 20 seconds.', 'gold'); GM().save();
  }
  function finishKaw(s) {
    const blocked = s.kawBlocked, stg = plantStage();
    s.kawTrip = null; s.kawBlocked = 0; GM().save();
    GM().toast('KAW is back. Plants at stage ' + stg + ' of 4. Blocked ' + blocked + ' house intrusion' + (blocked === 1 ? '' : 's') + '. ' + (s.intrusions ? s.intrusions + ' still waiting in your electronics.' : 'The house is clear.'), 'gold');
  }

  // ---- drawing ----
  // Sprite atlases: art/sikee/sheets/s01_<name>.png, 96px cells, rows = animations, cols = frames.
  const SPR = {};
  function sprite(name) {
    if (!SPR[name]) { const i = new Image(); i.src = 'art/sikee/sheets/' + name + '.png'; SPR[name] = i; }
    return SPR[name].complete && SPR[name].naturalWidth ? SPR[name] : null;
  }
  function drawFoe(w, t) {
    const d = w.def, sc = w.boss ? 1.6 : 1, X = w.x * GM().T, Y = w.y * GM().T + Math.sin(t * 6 + w.x) * 1.2;
    GM().cx.save(); GM().cx.translate(X, Y); GM().cx.scale(sc, sc);
    GM().cx.fillStyle = 'rgba(0,0,0,.3)'; GM().cx.beginPath(); GM().cx.ellipse(0, 10, 9, 4, 0, 0, 7); GM().cx.fill();
    // Sikee: three sheets, one per boss phase (1 = authority, 2 = Mella, 3 = Ultra Mella).
    // Row 0 = idle/walk, row 1 = combat poses (shown while a strike lands).
    const inFight = R.battle && R.battle.foe === w;
    const bossPhase = w.boss && inFight ? R.battle.phase : 1;
    const bossSet = w.boss ? SIKEE_SHEETS[bossPhase - 1] : null;
    const img = bossSet ? sprite(bossSet.name) : d.pose ? sprite(d.pose) : d.sprite ? sprite('s01_' + d.sprite) : null;
    if (w.face < 0) GM().cx.scale(-1, 1);
    if (inFight && w.flash > 0) GM().cx.translate((Math.random() - .5) * 3, 0);
    if (img) {
      GM().cx.imageSmoothingEnabled = false;
      if (bossSet) {
        const row = inFight && (w.st === 'wind' || w.st === 'act') ? 1 : 0, cols = bossSet.cols;
        const f = Math.floor(t * (row ? 12 : 6) + w.x) % cols;
        GM().cx.drawImage(img, f * 96, row * 96, 96, 96, -24, -36, 48, 48);
      } else {
        // pose atlas, 4 cols x 3 rows: row0 neutral/carve/jump/guard, row1 light/heavy/power start/power release, row2 recovery/hit/windup/expression
        let r0 = 0, c0 = 0;
        if (!inFight) c0 = Math.floor(t * 3 + w.x) % 2 ? 1 : 0;
        else if (w.st === 'stagger') { r0 = 2; c0 = 1; }
        else if (w.st === 'wind') { const id = w.atk && w.atk.id; if (id === 'slam' || id === 'orb') { r0 = 1; c0 = 2; } else { r0 = 0; c0 = 3; } }
        else if (w.st === 'act') { const id = w.atk && w.atk.id; if (id === 'slam') { r0 = 1; c0 = 3; } else if (id === 'orb') { r0 = 1; c0 = 0; } else { r0 = 1; c0 = 1; } }
        else if (w.st === 'rec') { r0 = 0; c0 = 3; }
        else c0 = Math.floor(t * 5 + w.x) % 2 ? 1 : 0;
        GM().cx.drawImage(img, c0 * 96, r0 * 96, 96, 96, -24, -36, 48, 48);
      }
    } else {
    GM().cx.strokeStyle = d.col; GM().cx.lineWidth = 2;
    for (let i = 0; i < 7; i++) {
      const a = -Math.PI / 2 + (i - 3) * .28;
      GM().cx.beginPath(); GM().cx.moveTo(0, -12); GM().cx.quadraticCurveTo(Math.cos(a) * 14, -18 + Math.sin(t * 4 + i) * 2, Math.cos(a) * 22, -6 + Math.sin(a) * 4); GM().cx.stroke();
    }
    GM().cx.fillStyle = d.dark; GM().cx.fillRect(-5, -6, 10, 14);
    GM().cx.fillStyle = d.col; GM().cx.fillRect(-5, -6, 10, 4);
    GM().cx.fillStyle = d.dark; GM().cx.beginPath(); GM().cx.arc(0, -12, 7, 0, 7); GM().cx.fill();
    GM().cx.fillStyle = d.col; GM().cx.beginPath(); GM().cx.arc(0, -12, 4, 0, 7); GM().cx.fill();
    GM().cx.fillStyle = '#fff'; GM().cx.fillRect(-3, -13, 2, 2); GM().cx.fillRect(1, -13, 2, 2);
    if (w.boss) { GM().cx.fillStyle = '#ffd166'; GM().cx.beginPath(); GM().cx.moveTo(-6, -20); GM().cx.lineTo(-3, -26); GM().cx.lineTo(0, -21); GM().cx.lineTo(3, -26); GM().cx.lineTo(6, -20); GM().cx.fill(); }
    }
    GM().cx.restore();
    GM().cx.textAlign = 'center'; GM().cx.font = 'bold 9px sans-serif'; GM().cx.fillStyle = '#fff';
    GM().cx.fillText(d.name + (w.hold ? ' · holding' : ''), X, Y - 26 * sc);
    if (w.max && w.hp < w.max) { GM().cx.fillStyle = 'rgba(0,0,0,.6)'; GM().cx.fillRect(X - 14, Y - 22 * sc, 28, 3); GM().cx.fillStyle = d.col; GM().cx.fillRect(X - 14, Y - 22 * sc, 28 * Math.max(0, w.hp / w.max), 3); }
  }
  // Red markers on the ground show where an attack will land. They fill as the wind-up runs out.
  function drawTelegraph() {
    const b = R.battle; if (!b) return; const f = b.foe, c = GM().cx, T = GM().T;
    if (f.st !== 'wind' || !f.atk) return;
    const prog = 1 - Math.max(0, f.stT) / f.atk.wind, X = f.x * T, Y = f.y * T;
    c.save(); c.fillStyle = 'rgba(255,60,60,' + (.15 + .3 * prog) + ')'; c.strokeStyle = 'rgba(255,90,90,.85)'; c.lineWidth = 1.5;
    if (f.atk.id === 'slam') { c.beginPath(); c.arc(X, Y, f.atk.rad * T, 0, 7); c.fill(); c.stroke(); c.fillStyle = 'rgba(255,60,60,.45)'; c.beginPath(); c.arc(X, Y, f.atk.rad * T * prog, 0, 7); c.fill(); }
    else {
      const len = (f.atk.id === 'orb' ? 6 : f.atk.reach) * T, wd = f.atk.rad * T * (f.atk.id === 'orb' ? .4 : 1);
      c.translate(X, Y); c.rotate(Math.atan2(f.ay, f.ax));
      c.fillRect(0, -wd, len, wd * 2); c.strokeRect(0, -wd, len, wd * 2);
      c.fillStyle = 'rgba(255,60,60,.45)'; c.fillRect(0, -wd, len * prog, wd * 2);
    }
    c.restore();
  }
  // Your punch arc, blasts, enemy shots, hit rings, damage numbers and dodge ghosts.
  function drawFight() {
    const b = R.battle; if (!b) return; const c = GM().cx, T = GM().T, g = GM().G, p = R.p;
    c.save();
    if (p.arcT > 0) {
      const k = p.arcT / .18, r = (p.arcBig ? 1.7 : 1.35) * T;
      c.translate(g.px * T, g.py * T - 8); c.rotate(p.arcA);
      c.strokeStyle = p.arcBig ? 'rgba(255,214,102,' + k + ')' : 'rgba(255,255,255,' + k + ')'; c.lineWidth = p.arcBig ? 6 : 4;
      c.beginPath(); c.arc(0, 0, r * (1.1 - .4 * k), -.9, .9); c.stroke();
    }
    c.restore(); c.save();
    for (const s of R.shots) {
      c.fillStyle = s.col; c.shadowColor = s.col; c.shadowBlur = 10;
      c.beginPath(); c.arc(s.x * T, s.y * T - 6, s.r * T * .75, 0, 7); c.fill();
    }
    c.shadowBlur = 0;
    for (const e of R.fx) {
      const k = e.t / e.max, X = e.x * T, Y = e.y * T;
      if (e.kind === 'ring') { c.strokeStyle = e.col; c.globalAlpha = 1 - k; c.lineWidth = 3; c.beginPath(); c.arc(X, Y, (e.rad || .6) * T * (.4 + k), 0, 7); c.stroke(); }
      else if (e.kind === 'num') { c.globalAlpha = 1 - k * k; c.fillStyle = e.col; c.strokeStyle = '#000'; c.lineWidth = 3; c.font = 'bold 13px system-ui,sans-serif'; c.textAlign = 'center'; c.strokeText(e.text, X, Y - k * 22); c.fillText(e.text, X, Y - k * 22); }
      else if (e.kind === 'ghost') { c.globalAlpha = .35 * (1 - k); c.fillStyle = '#55ddff'; c.beginPath(); c.ellipse(X, Y - 4, 7, 12, 0, 0, 7); c.fill(); }
    }
    c.restore();
  }
  function drawWood(x, y) {
    const X = x * GM().T, Y = y * GM().T;
    GM().cx.fillStyle = '#6b4a2a'; GM().cx.fillRect(X + 4, Y + 6, GM().T - 8, GM().T - 12);
    GM().cx.strokeStyle = '#3e2a16'; GM().cx.lineWidth = 1;
    for (let i = 1; i < 4; i++) { GM().cx.beginPath(); GM().cx.moveTo(X + 4, Y + 6 + i * 7); GM().cx.lineTo(X + GM().T - 4, Y + 6 + i * 7); GM().cx.stroke(); }
    GM().cx.fillStyle = '#6fbf4a';
    for (let i = 0; i < 5; i++) { GM().cx.beginPath(); GM().cx.arc(X + 6 + i * 5, Y + GM().T - 5, 3, 0, 7); GM().cx.fill(); }
  }
  function drawWreck(k, t) {
    const X = k.x * GM().T, Y = k.y * GM().T, c = GM().cx;
    c.fillStyle = '#2a2220'; c.fillRect(X + 2, Y + 2, GM().T - 4, GM().T - 4);
    c.strokeStyle = '#120e0c'; c.lineWidth = 1;
    c.beginPath(); c.moveTo(X + 6, Y + 8); c.lineTo(X + 16, Y + 14); c.lineTo(X + 10, Y + 22); c.stroke();
    c.beginPath(); c.moveTo(X + 20, Y + 5); c.lineTo(X + 26, Y + 16); c.stroke();
    c.fillStyle = '#4a3a2c';
    for (let i = 0; i < 3; i++) c.fillRect(X + 5 + i * 8, Y + 22 + (i % 2) * 3, 5, 3);
    const puff = (t * 0.6 + k.x * 0.37) % 1;
    c.globalAlpha = 0.35 * (1 - puff); c.fillStyle = '#9a9a9a';
    c.beginPath(); c.arc(X + GM().T / 2, Y + 8 - puff * 10, 3 + puff * 3, 0, 7); c.fill(); c.globalAlpha = 1;
    if (R.repairing === k) {
      c.fillStyle = 'rgba(0,0,0,.6)'; c.fillRect(X, Y - 6, GM().T, 3);
      c.fillStyle = '#ffd166'; c.fillRect(X, Y - 6, GM().T * Math.min(1, R.repairT / REPAIR_S), 3);
    }
  }
  function drawPlants(t) {
    const stg = plantStage();
    const boxes = [[8.4, 4.4], [9.3, 4.4], [10.2, 4.4]];
    const pimg = sprite('s01_mounds_plants'); // row 4 of the mound sheet: five growth stages
    for (let i = 0; i < boxes.length; i++) {
      if (stg <= i) continue;
      const X = boxes[i][0] * GM().T, Y = boxes[i][1] * GM().T, h = 4 + stg * 3 + Math.sin(t * 2 + i) * .5;
      if (pimg) {
        GM().cx.imageSmoothingEnabled = false;
        GM().cx.drawImage(pimg, Math.min(stg - 1, 4) * 96, 4 * 96, 96, 96, X - 19, Y - 34, 38, 38);
        continue;
      }
      GM().cx.strokeStyle = '#4fbf55'; GM().cx.lineWidth = 2; GM().cx.beginPath(); GM().cx.moveTo(X, Y); GM().cx.lineTo(X, Y - h); GM().cx.stroke();
      GM().cx.fillStyle = '#5fd06a'; GM().cx.beginPath(); GM().cx.ellipse(X - 4, Y - h * .6, 4, 2, -.5, 0, 7); GM().cx.fill();
      GM().cx.beginPath(); GM().cx.ellipse(X + 4, Y - h * .8, 4, 2, .5, 0, 7); GM().cx.fill();
      if (stg >= 4) { GM().cx.fillStyle = '#ff9ad5'; GM().cx.beginPath(); GM().cx.arc(X, Y - h - 2, 2.5, 0, 7); GM().cx.fill(); }
    }
    if (stg >= 2) { // vines along the back wall: decoration only, never blocks
      GM().cx.strokeStyle = '#3f9e4a'; GM().cx.lineWidth = 2;
      for (let x = 1; x < 9; x += 2) { GM().cx.beginPath(); GM().cx.moveTo(x * GM().T + 8, 1.3 * GM().T); GM().cx.quadraticCurveTo(x * GM().T + 14, 1.8 * GM().T + stg * 2, x * GM().T + 4, 2.4 * GM().T); GM().cx.stroke(); }
    }
  }
  function drawList(m, t) {
    const out = [];
    if (!m || !GM().S) return out;
    if (m.id === 'HOME') out.push({ y: 4.9, f: () => drawPlants(t) });
    for (const w of R.wanderers) if (w.map === m.id) out.push({ y: w.y + .2, f: () => drawFoe(w, t) });
    const s = st();
    if (s) for (const wt of s.woodTiles) if (wt.map === m.id) out.push({ y: wt.y + .05, f: () => drawWood(Math.floor(wt.x), Math.floor(wt.y)) });
    if (s) for (const k of s.wrecks) if (k.map === m.id) out.push({ y: k.y + .05, f: () => drawWreck(k, t) });
    if (R.battle) { out.push({ y: -5, f: drawTelegraph }); out.push({ y: 999, f: drawFight }); }
    return out;
  }

  // ---- UI: HUD buttons and the battle panel ----
  function buildHud() {
    if (R.hud || !document.body) return;
    const css = document.createElement('style');
    css.textContent = '#sikeeHud{position:absolute;left:10px;bottom:10px;z-index:4;display:flex;gap:6px}' +
      '#sikeeHud button,#sikeeBattle button{border:1px solid #55ddff;background:rgba(23,20,44,.92);color:#55ddff;border-radius:10px;padding:8px 10px;font:800 11px system-ui,sans-serif;cursor:pointer}' +
      '#sikeeHud button.on{background:#55ddff;color:#120e1e}' +
      '#skStatus{align-self:center;font:700 11px system-ui,sans-serif;color:#f4eadb;background:rgba(23,20,44,.85);padding:6px 8px;border-radius:10px}' +
      '#sikeeBattle{position:fixed;inset:0;z-index:60;pointer-events:none;font-family:system-ui,sans-serif;color:#f4eadb}' +
      '#sikeeBattle[hidden]{display:none}' +
      '.sk-box{position:absolute;top:10px;left:50%;transform:translateX(-50%);background:rgba(27,20,32,.82);border:2px solid #f3a93d;border-radius:12px;padding:8px 12px;width:min(92vw,380px)}' +
      '.sk-bar{height:8px;background:#2a2236;border-radius:6px;overflow:hidden;margin:3px 0 6px}.sk-bar i{display:block;height:100%;background:#ff7d2a;width:100%}' +
      '.sk-me i{background:#76e086}.sk-log{min-height:16px;font-size:12px;line-height:1.3;opacity:.9}' +
      '.sk-btns{position:absolute;right:12px;bottom:14px;display:flex;gap:10px;align-items:flex-end;pointer-events:auto}' +
      '.sk-btns button{width:64px;height:64px;border-radius:50%;padding:0;font-size:11px;touch-action:manipulation}.sk-btns #skStrike{width:78px;height:78px;border-color:#ffe066;color:#ffe066;font-size:13px}' +
      '.sk-btns button:disabled{opacity:.4}' +
      'body.sk-fight #yourMoves,body.sk-fight #yourPowers{display:none !important}' +
      'body:has(#your-touch[style*="display: block"]) .sk-btns{bottom:calc(min(100vw,100vh) * .3 + 10px)}' +
      '#sikeeHud .mella{border-color:#ff9ad5;color:#ff9ad5}' +
      '.sk-ch i{background:#55ddff}';
    document.head.appendChild(css);

    const hud = document.createElement('div'); hud.id = 'sikeeHud';
    hud.innerHTML = '<button type="button" id="skMellaBtn">MELLA · M</button><button type="button" id="skKawBtn">KAW HOME · K</button><span id="skStatus"></span>';
    document.body.appendChild(hud);
    hud.querySelector('#skMellaBtn').onclick = toggleMella;
    hud.querySelector('#skKawBtn').onclick = toggleKaw;

    const bat = document.createElement('div'); bat.id = 'sikeeBattle'; bat.hidden = true;
    bat.innerHTML = '<div class="sk-box"><div><b id="skFoe"></b> <span id="skTitle" style="opacity:.7;font-size:11px"></span></div>' +
      '<div class="sk-bar"><i id="skFoeBar"></i></div><div class="sk-bar sk-me"><i id="skMeBar"></i></div>' +
      '<div class="sk-bar sk-ch"><i id="skChargeBar"></i></div><div class="sk-log" id="skLog"></div></div>' +
      '<div class="sk-btns"><button type="button" id="skRun">Run<br>X</button><button type="button" id="skMella2" hidden>Mella (M)</button>' +
      '<button type="button" id="skDodge">Dodge<br>Space</button><button type="button" id="skBlast">Blast<br>B</button><button type="button" id="skStrike">Punch<br>J</button></div>';
    document.body.appendChild(bat);
    bat.querySelector('#skDodge').onclick = dodge;
    bat.querySelector('#skStrike').onclick = strike;
    bat.querySelector('#skBlast').onclick = blast;
    bat.querySelector('#skMella2').onclick = toggleMella;
    bat.querySelector('#skRun').onclick = run;
    R.hud = { hud, bat };
  }
  function showBattle(on) { if (R.hud) R.hud.bat.hidden = !on; if (document.body) document.body.classList.toggle('sk-fight', !!on); if (on) updateBattleUI(); }
  function updateBattleUI() {
    if (!R.hud || !R.battle) return;
    const b = R.battle, f = b.foe;
    const q = id => document.getElementById(id);
    q('skFoe').textContent = f.def.name; q('skTitle').textContent = f.def.title;
    q('skFoeBar').style.width = Math.max(0, 100 * f.hp / f.max) + '%';
    q('skFoeBar').style.background = f.def.col;
    q('skMeBar').style.width = Math.max(0, 100 * R.hp / HOME_HP) + '%';
    q('skLog').textContent = b.log.join(' · ');
    q('skMella2').textContent = R.mella ? 'Mella on (M)' : 'Mella off (M)';
    q('skStrike').disabled = !R.mella; q('skDodge').disabled = R.p.dodgeCd > 0;
    q('skChargeBar').style.width = Math.max(0, 100 * R.charge / CHARGE_MAX) + '%';
    q('skBlast').disabled = !R.mella || R.charge < BLAST_COST || R.blastCool > 0;
    q('skBlast').innerHTML = R.blastCool > 0 ? 'Blast<br>…' : 'Blast<br>' + Math.floor(R.charge) + '%';
  }
  function toggleMella() {
    // A fight always keeps MELLA up, so an accidental M cannot disarm you mid-fight.
    if (R.battle && R.mella) { logLine('MELLA stays up until the fight ends.'); updateBattleUI(); return; }
    R.mella = !R.mella;
    GM().toast(R.mella ? 'MELLA on. Your strikes land.' : 'MELLA off.', R.mella ? 'gold' : 'dim');
    if (R.hud) {
      const b = document.getElementById('skMellaBtn'); if (b) { b.classList.toggle('on', R.mella); }
    }
    if (R.battle) { logLine(R.mella ? 'MELLA on. Strike with J.' : 'MELLA off. You can only run.'); updateBattleUI(); }
  }

  // ---- keys (the game ignores movement, interact and ride keys while blocking) ----
  addEventListener('keydown', e => {
    if (!GM().S || (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA'))) return;
    const k = e.key.toLowerCase();
    if (R.battle) {
      // Movement keys fall through to the game so you can walk while you fight. Everything else is ours.
      // The Y.O.U.R. layer binds J (hit), L (blast), Q (jump), C, T, 1-3 (powers), Shift/K (dash/sprint), F (fly), H/Z (KAW).
      // In a fight those keys belong to the fight only, so stop them reaching the other layers.
      const mine = { j: strike, b: blast, ' ': dodge, shift: dodge, m: toggleMella, x: run };
      if (mine[k]) { if (!e.repeat || k === 'j') mine[k](); e.preventDefault(); e.stopImmediatePropagation(); }
      else if (['e', 'r', 'p', 'k', 'g', 'escape', 'q', 'l', 'c', 't', '1', '2', '3', 'f', 'h', 'z'].includes(k)) { e.preventDefault(); e.stopImmediatePropagation(); }
      return;
    }
    if (GM().G.sheet || GM().G.phone || GM().G.fb || GM().G.lab || GM().MG.cur) return;
    if (k === 'm') toggleMella();
    else if (k === 'k') toggleKaw();
    else if (k === 'g') startRepair();
  }, true);

  window.SIKEE = {
    tick, enterMap: onEnterMap, drawList,
    blocking: () => false,   // the fight runs in the world: movement and the clock keep going
    fighting: () => !!R.battle,
    // controller entry point: aim is an optional unit vector (right stick); the fight rules stay in strike/blast/dodge/run
    act(name, ax, ay) {
      if (!R.battle) return false;
      if ((ax || ay) && R.p) { const l = Math.hypot(ax, ay) || 1; R.p.fx = ax / l; R.p.fy = ay / l; }
      ({ strike, blast, dodge, run })[name]?.(); return true;
    },
    wreckSlow,
    debug: { R, st, dodge, plantStage, spawnRoadVillain, spawnSikeeOnRoad, startBattle, homeIntruder, strike, blast, commitCrime, wreckCount, startRepair, tickUpkeep },
  };
})();
