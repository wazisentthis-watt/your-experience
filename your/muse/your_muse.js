/* Y.O.U.R. · Muse Living Neighborhood v1 · PROPOSAL_HOLD (PUBLISH HOLD)
 * Relay 005, Assignment 001 — World Art & Environment (Muse).
 * Installs after v2.0 → v2.1 → v2.2 → v2.3 → v2.4 (wraps window.YOUR_V20_INSTALL,
 * the same chaining v22/v23 use). Nothing in Valence's model is copied or
 * changed; no file under your/v22/ or your/v24/ is touched.
 *
 * What it does, in the live game (index.html, G.map):
 *  1. Re-skins the HOME fridge and bed with original WIR art from
 *     your/assets/muse/muse_home_props.png (sheet 768x192, cells 192x192:
 *     0 fridge, 1 bed, 2 water, 3 home exterior). The old atlas art stays as
 *     the fallback: if the sheet has not loaded, drawObj falls through to the
 *     existing drawFurn/drawObj path, so the objects are never invisible.
 *  2. Adds one new HOME object, the Roar Well (id 'muse_water', tile 18,4 —
 *     a free kitchen tile in buildHomeV2's 20x13 HOME). It blocks its own
 *     tile in map.block, gets its use spot from the existing useSpot() ring
 *     rule, and offers a new M.ACTS.drink (PROPOSED: 0.25 h, Fuel +.06,
 *     Clean +.08 — a sip, not a meal).
 *  3. Exposes window.YOUR_MUSE: the object contract Claude's KAW system
 *     asked for (id, mapId, position, type, walkable interaction position,
 *     actions, resource availability, visual asset reference) plus
 *     affordances() in the same shape v24's affordances() returns, so the
 *     KAW brain can read this module without touching v24.
 *
 * Verified against main @ 7e46581 (2026-11-16):
 *  - Live renderer is index.html's own canvas 2d render(), T = 32, HOME is
 *    buildHomeV2() (20x13, NOT the 12x11 buildHome() — MAPS.HOME is
 *    reassigned), cities are 44x32 with tile ids 0 grass, 1 wall, 2 road,
 *    3 sidewalk, 4 wood, 5 bath tile, 6 tree (blocked), 7 plaza, 8 water
 *    (blocked), 9 dirt. Camera: HOME fits the whole 20x13 map; cities clamp
 *    to ~11 tiles wide. Objects draw y-sorted via draws[] (y = o.y + o.h).
 *  - your/modules/your_world.js is the STANDALONE v1.2.1 engine (TILE 32,
 *    its own string map, doors H/S/K/F/A) — it is NOT the live world.
 *    The live world is G.map in index.html; do not wire art to your_world.
 *  - v24's AFF_OBJ maps 'couch' -> rest, but the live HOME V2 object is
 *    'sofa' (id 'sofa', fur 'sofa'), so v24 currently finds rest only at
 *    the bed. This module's affordances() include the sofa. The one-line
 *    v24 fix (add sofa:'rest') is PROPOSED in your/muse/README.md, not
 *    applied here — v24 files are out of scope for this branch.
 *  - v24's env.walk receives fractional (.5) coords; Valence walkable()
 *    indexes m.block with a fractional index, which is undefined, so a
 *    fractional walk check is bounds-only, not blocking-aware. This
 *    module floors tile coords before every walkable() call.
 *  - Food is a stand-in (v24 README): standing at the fridge spot counts
 *    as eating; no food item exists yet. The contract says so explicitly.
 *  - The SAV 'home' building exterior is drawn procedurally by
 *    bldgSprite() (Kenney tiles + ST styles). The home-exterior cell in
 *    this sheet is art delivered + spec'd, NOT yet wired to the SAV
 *    building — wiring it needs a drawBuilding hook, Phase 2.
 *  - iPhone: one 768x192 sheet (170 KB), drawn only for objects on the
 *    HOME map; no per-frame allocation beyond the existing draws[] pass.
 *    Real-phone play is NOT verified here.
 */
(function () {
  'use strict';
  var MUSE = window.YOUR_MUSE = {
    version: 'muse-living-neighborhood-v1',
    status: 'PROPOSAL_HOLD',
    installed: false,
    imageLoaded: false,
    imageSrc: null,
    drawWrapped: false,
    waterAdded: false,
    error: null
  };

  /* ---- sprite sheet: cells 192x192, order fridge, bed, water, home ---- */
  var SHEET_URL = 'your/assets/muse/muse_home_props.png';
  var SHEET_DATA_URL = 'your/muse/muse_home_props_data.js'; // generated mirror, fallback only
  var CELL = 192;
  var CELLS = { fridge: 0, bed: 1, water: 2, home: 3 };
  /* Draw width in game px (drawFurn convention: dw * 2). Height follows the
     cell's own aspect, bottom-anchored at (o.y + o.h) * T like drawFurn.
     Fridge is 20 (40 px wide, ~98 px tall) so its on-screen height matches
     the atlas fridge it replaces (63x124 cell at dw 26); the raw fridge
     cell is taller (78x192), and 26 would make it poke 4 tiles high. */
  var DRAW_W = { fridge: 20, bed: 46, water: 20, home: 60 };
  var CELL_AR = { fridge: 78 / 192, bed: 192 / 190, water: 192 / 169, home: 186 / 192 };

  var sheetImg = null, sheetTriedData = false;

  function loadSheet() {
    if (typeof Image === 'undefined') return; // Node test stub: no DOM image
    var im = new Image();
    im.onload = function () { sheetImg = im; MUSE.imageLoaded = true; MUSE.imageSrc = SHEET_URL; };
    im.onerror = function () {
      if (sheetTriedData) { MUSE.error = 'muse sheet missing (png + data fallback)'; return; }
      sheetTriedData = true;
      var s = document.createElement('script');
      s.src = SHEET_DATA_URL;
      s.onload = function () {
        var data = window.YOUR_MUSE_PROPS_DATA;
        if (!data) { MUSE.error = 'muse sheet data file loaded but empty'; return; }
        var im2 = new Image();
        im2.onload = function () { sheetImg = im2; MUSE.imageLoaded = true; MUSE.imageSrc = 'embedded-data'; };
        im2.onerror = function () { MUSE.error = 'muse sheet data fallback failed'; };
        im2.src = data;
      };
      s.onerror = function () { MUSE.error = 'muse sheet png + data file both missing'; };
      document.head.appendChild(s);
    };
    im.src = SHEET_URL;
  }

  /* ---- object contract (Relay 005 Phase 4) ---- */
  var TYPE_OF = {
    fridge: 'food', bed: 'rest', sofa: 'rest', couch: 'rest',
    muse_water: 'water', sink: 'prop', shower: 'prop', stove: 'prop',
    desk: 'work', tv: 'prop', console: 'prop', weights: 'work',
    treadmill: 'work', arcade: 'prop', plant: 'prop', garden: 'food',
    mat: 'prop', door: 'door', closet: 'prop', coffee: 'food',
    tree: 'decor', aquarium: 'decor', fire: 'decor'
  };
  var RESOURCES_OF = {
    fridge: { food: { available: true, kind: 'stand-in', note: 'Standing at the fridge spot counts as eating (v24 stand-in). No food item exists yet.' } },
    bed: { rest: { available: true, kind: 'sleep', note: 'Sleep / nap via M.ACTS sleep, nap.' } },
    sofa: { rest: { available: true, kind: 'nap', note: 'Nap via M.ACTS nap; scroll via M.ACTS scroll.' } },
    couch: { rest: { available: true, kind: 'nap', note: 'Legacy id; live HOME V2 uses sofa.' } },
    muse_water: { drink: { available: true, kind: 'clean-water', note: 'Roar Well: unlimited clean water. M.ACTS.drink (PROPOSED).' } },
    sink: { drink: { available: false, note: 'Wash only (M.ACTS tidy). Not a KAW drink source.' } },
    shower: { drink: { available: false, note: 'Wash only (M.ACTS shower, tidy). Not a KAW drink source.' } },
    garden: { food: { available: false, kind: 'growing', note: 'Harvest after 3 waterings; not a stand-in food spot.' } }
  };

  /* Integer tile coords only: Valence walkable() indexes m.block with the
     raw coords, so a fractional (.5) coordinate reads undefined and passes
     as walkable even on a blocked tile. Floor first. */
  function walkTile(F, map, tx, ty) {
    tx = Math.floor(tx); ty = Math.floor(ty);
    if (tx < 0 || ty < 0 || tx >= map.w || ty >= map.h) return false;
    if (F && F.walkable) { try { return !!F.walkable()(map, tx, ty); } catch (e) { /* fall through */ } }
    return !map.block || !map.block[ty * map.w + tx];
  }
  function ringSpots(F, map, o) {
    var out = [];
    for (var j = o.y - 1; j <= o.y + o.h; j++) for (var i = o.x - 1; i <= o.x + o.w; i++) {
      if (i >= o.x && i < o.x + o.w && j >= o.y && j < o.y + o.h) continue; // ring only
      if (walkTile(F, map, i, j)) out.push({ x: i + 0.5, y: j + 0.5 });
    }
    return out;
  }
  function useFor(F, map, o) {
    if (F && F.useSpot) { try { var u = F.useSpot()(o); if (u) return [u[0], u[1]]; } catch (e) { /* fall through */ } }
    var ring = ringSpots(F, map, o);
    return ring.length ? [ring[0].x, ring[0].y] : [o.x + o.w / 2, o.y + o.h + 0.5];
  }

  function contractFor(F, map, o) {
    var type = TYPE_OF[o.id] || 'prop';
    return {
      id: o.id, mapId: map.id,
      x: o.x, y: o.y, w: o.w, h: o.h,
      type: type,
      use: useFor(F, map, o),
      actions: (o.acts || []).slice(),
      resources: RESOURCES_OF[o.id] || {},
      asset: o.museArt ? ('muse_home_props.png#' + o.museArt) : (o.fur ? ('spr/life_furn.webp#' + o.fur) : null),
      name: o.name || o.id, blocked: !o.walk
    };
  }

  function affordances(F, map) {
    var out = { water: [], food: [], rest: [] };
    if (!map || !map.t) return out;
    var W = 8; // tile 8 = water (blocked); a shore spot is walkable ground next to it
    for (var y = 0; y < map.h; y++) for (var x = 0; x < map.w; x++) {
      if (map.t[y * map.w + x] !== W) continue;
      var dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
      for (var d = 0; d < 4; d++) {
        var nx = x + dirs[d][0], ny = y + dirs[d][1];
        if (walkTile(F, map, nx, ny)) out.water.push({ x: nx + 0.5, y: ny + 0.5, objectId: null, kind: 'shore' });
      }
    }
    (map.objs || []).forEach(function (o) {
      var kind = o.id === 'fridge' ? 'food'
        : (o.id === 'bed' || o.id === 'sofa' || o.id === 'couch') ? 'rest'
        : o.id === 'muse_water' ? 'water' : null;
      if (!kind) return;
      ringSpots(F, map, o).forEach(function (s) {
        out[kind].push({ x: s.x, y: s.y, objectId: o.id, kind: kind });
      });
    });
    return out;
  }

  /* ---- drawing: wrap the live drawObj (captured at install, after the
     buildHomeV2 reassignment at index.html:3437). Falls through to the
     original whenever this module has nothing to draw, so removing the
     sheet can never blank an object. ---- */
  function drawMuseProp(cx, T, o) {
    var dw = (DRAW_W[o.museArt] || 26) * 2;
    var dh = dw / (CELL_AR[o.museArt] || 1);
    var X = (o.x + o.w / 2) * T - dw / 2, Y = (o.y + o.h) * T - dh;
    if (sheetImg) {
      cx.save(); cx.imageSmoothingEnabled = true;
      cx.drawImage(sheetImg, CELLS[o.museArt] * CELL, 0, CELL, CELL, X, Y, dw, dh);
      cx.restore();
      return true;
    }
    // Code-drawn fallback (sheet not loaded yet): never invisible.
    cx.save();
    if (o.museArt === 'water') {
      cx.fillStyle = '#2b6a86'; cx.fillRect(X, Y + dh * 0.45, dw, dh * 0.55);
      cx.fillStyle = '#7cc8e8'; cx.fillRect(X + 2, Y + dh * 0.45, dw - 4, 5);
      cx.fillStyle = '#c98a4a'; cx.fillRect(X + dw * 0.6, Y, dw * 0.35, dh * 0.5);
    } else if (o.museArt === 'fridge') {
      cx.fillStyle = '#5a2a8a'; cx.fillRect(X, Y, dw, dh);
      cx.fillStyle = '#1f9e8a'; cx.fillRect(X + 4, Y + 4, dw - 8, dh - 8);
      cx.fillStyle = '#ffcf6a'; cx.fillRect(X + dw - 12, Y + dh * 0.5, 4, 12);
    } else if (o.museArt === 'bed') {
      cx.fillStyle = '#3a2a1c'; cx.fillRect(X, Y + dh * 0.6, dw, dh * 0.4);
      cx.fillStyle = '#6a2a6a'; cx.fillRect(X + 2, Y + dh * 0.4, dw - 4, dh * 0.6);
      cx.fillStyle = '#e8e2ff'; cx.fillRect(X + 4, Y + dh * 0.35, dw * 0.4, dh * 0.2);
    } else { return false; }
    cx.restore();
    return true;
  }

  function install(X) {
    var G = X.G, F = X.fn, M = X.M, T = X.T, MAPS = X.MAPS, cx = X.cx;
    var home = MAPS && MAPS.HOME;
    if (!home) { MUSE.error = 'MAPS.HOME missing'; return; }

    /* 1. Re-skin the existing HOME fridge + bed (same ids, tiles, acts,
       use spots, collision — only the picture changes). */
    var patched = [];
    (home.objs || []).forEach(function (o) {
      if (o.id === 'fridge') { o.museArt = 'fridge'; patched.push('fridge'); }
      if (o.id === 'bed') { o.museArt = 'bed'; patched.push('bed'); }
    });

    /* 2. New water object: Roar Well at HOME (18,4), 1x1. Free kitchen
       tile in buildHomeV2 (neighbours: aquarium 17,4; wall 19,4). Block
       its tile the way finishMap() would have, and offer drink. */
    var water = null;
    if (!home.objs.some(function (o) { return o.id === 'muse_water'; })) {
      water = {
        id: 'muse_water', name: 'Roar Well', sub: 'Clean water — drink',
        x: 18, y: 4, w: 1, h: 1, draw: 'muse', museArt: 'water',
        acts: ['drink']
      };
      home.objs.push(water);
      if (home.block) home.block[4 * home.w + 18] = 1;
      MUSE.waterAdded = true;
    } else { water = home.objs.find(function (o) { return o.id === 'muse_water'; }); }

    /* 3. Drink act (PROPOSED values; same shape as M.ACTS.coffee). */
    if (M && M.ACTS && !M.ACTS.drink) {
      M.ACTS.drink = { name: 'Drink clean water', place: 'muse_water', h: 0.25, gain: { Fuel: 0.06, Clean: 0.08 } };
    }

    /* 4. Wrap drawObj for museArt objects only. */
    if (typeof window !== 'undefined' && typeof window.drawObj === 'function') {
      var prevDraw = window.drawObj;
      window.drawObj = function (o, t) {
        if (o && o.museArt && CELLS[o.museArt] !== undefined) {
          if (drawMuseProp(cx, T, o)) return;
        }
        return prevDraw(o, t);
      };
      MUSE.drawWrapped = true;
    } else { MUSE.error = 'drawObj not found at install; art not wrapped'; }

    loadSheet();
    MUSE.installed = true;
    MUSE.objectsPatched = patched;
    MUSE._F = F; MUSE._MAPS = MAPS; MUSE._G = G;
  }

  /* Public surface for Claude / KAW and for tests. */
  MUSE.objects = function (mapId) {
    var maps = MUSE._MAPS, F = MUSE._F;
    if (!maps) return [];
    var map = maps[mapId] || (MUSE._G && MUSE._G.map);
    if (!map) return [];
    return (map.objs || []).map(function (o) { return contractFor(F, map, o); });
  };
  MUSE.affordances = function (mapId) {
    var maps = MUSE._MAPS, F = MUSE._F;
    if (!maps) return { water: [], food: [], rest: [] };
    var map = maps[mapId] || (MUSE._G && MUSE._G.map);
    if (!map) return { water: [], food: [], rest: [] };
    return affordances(F, map);
  };
  MUSE.status = function () {
    return {
      version: MUSE.version, installed: MUSE.installed,
      imageLoaded: MUSE.imageLoaded, imageSrc: MUSE.imageSrc,
      drawWrapped: MUSE.drawWrapped, waterAdded: MUSE.waterAdded,
      objectsPatched: MUSE.objectsPatched || [], error: MUSE.error
    };
  };
  /* Test seam: pure helpers + install, no DOM needed. */
  MUSE._test = { walkTile: walkTile, ringSpots: ringSpots, useFor: useFor, contractFor: contractFor, affordances: affordances, install: install, CELLS: CELLS, DRAW_W: DRAW_W };

  /* Chain the Valence install hook exactly like v22/v23. */
  var prevInstall = (typeof window !== 'undefined') ? window.YOUR_V20_INSTALL : null;
  if (typeof window !== 'undefined') {
    window.YOUR_V20_INSTALL = function (X) {
      if (prevInstall) prevInstall(X);
      try { install(X); } catch (e) { console.warn('YOUR muse install', e); MUSE.error = String(e && e.stack || e); }
    };
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = MUSE;
})();
