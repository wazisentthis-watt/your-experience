/* Y.O.U.R. Living District in root · art loader · PROPOSAL (draft PR for owner review). Drafted by WIR Recovery for owner review.
   Images: your/living/assets/ (webp converted from the Y.O.U.R. Map Art Pack, ChatGPT sheets 57-68; see assets/LIVING_ART_MANIFEST.json).
   Ground comes from one 32 px atlas (ROOT_GROUND_TILESET), so the district is image-backed at root's T = 32. If an image fails to load,
   the district falls back to root's own ground and a plain lot outline for that piece (counted in stats.fallback). */
(function (W) {
  'use strict';
  var A = W.YOUR_LIVING_ART = { ready: false, img: {}, missing: [], stats: { loaded: 0, error: 0, blit: 0, fallback: 0 } };

  // atlas cells, copied from assets/ground/root_ground_tileset_32.json (a test checks they match)
  A.TILESET = { image: 'ground/root_ground_tileset_32.webp', tile: 32, tiles: {
    sidewalk: [0, 0], curb: [32, 0], asphalt: [64, 0], asphalt_worn: [96, 0],
    dash_v: [0, 32], dash_h: [32, 32], crosswalk: [64, 32], grass: [96, 32],
    plaza: [0, 64] } };
  A.TILE_JSON_KEY = { sidewalk: 'LD-01_sidewalk', curb: 'LD-01b_curb', asphalt: 'LD-02_asphalt', asphalt_worn: 'LD-02b_asphalt_worn', dash_v: 'LD-03_dash_v',
    dash_h: 'LD-03b_dash_h', crosswalk: 'LD-04_crosswalk', grass: 'LD-05_grass', plaza: 'LD-08_plaza' };

  var FILES = A.FILES = {
    tileset: A.TILESET.image,
    hero_hall: 'buildings/LD-25_hero_hall.webp', civic_clinic: 'buildings/LD-26_civic_clinic.webp', first_ledger_bank: 'buildings/LD-13_first_ledger_bank.webp',
    ledger_offices: 'buildings/LD-14_ledger_offices.webp', substation_4: 'buildings/LD-15_substation_4.webp', hollis_flats: 'buildings/LD-16_hollis_flats.webp',
    corner_market: 'buildings/LD-17_corner_market.webp', steamline_cafe: 'buildings/LD-18_steamline_cafe.webp', tinker_workshop: 'buildings/LD-19_tinker_workshop.webp',
    ninefold_apartments: 'buildings/LD-20_ninefold_apartments.webp', old_foundry: 'buildings/LD-21_old_foundry.webp', transit_depot: 'buildings/LD-22_transit_depot.webp',
    repair_depot: 'buildings/LD-23_repair_depot.webp', eastside_garage: 'buildings/LD-24_eastside_garage.webp', elm_court: 'buildings/LD-27_elm_court.webp',
    riverside_a: 'buildings/LD-28_riverside_a.webp', riverside_b: 'buildings/LD-29_riverside_b.webp', lowline_lofts: 'buildings/LD-30_lowline_lofts.webp',
    mural_wall_blank: 'buildings/LD-31_mural_wall_blank.webp', mural_wall_half: 'buildings/LD-31b_mural_wall_half.webp', mural_wall_finished: 'buildings/LD-31c_mural_wall_finished.webp',
    tree: 'props/LD-06_park_tree.webp', bench: 'props/LD-07_park_bench.webp', fountain: 'props/LD-08b_plaza_fountain.webp', skate_ramp: 'props/LD-10_skate_ramp.webp',
    rail_long: 'props/LD-11_skate_rail_long.webp', rail_short: 'props/LD-12_skate_rail_short.webp', grate: 'props/LD-32_sewer_grate.webp',
    traffic_light: 'props/LD-35_traffic_light.webp', gate_idle: 'props/LD-36_morrow_gate_idle.webp', gate_open: 'props/LD-36b_morrow_gate_open.webp',
    car_n: 'vehicles/LD-40_car_n.webp', car_e: 'vehicles/LD-40b_car_e.webp', truck_n: 'vehicles/LD-42_truck_n.webp', truck_e: 'vehicles/LD-42b_truck_e.webp',
    van_n: 'vehicles/LD-43_van_n.webp', repair_n: 'vehicles/LD-44_repair_van_n.webp', repair_e: 'vehicles/LD-44b_repair_van_e.webp',
    kestrel: 'supers/LD-45a_kestrel_ray.webp', kestrel_hurt: 'supers/LD-45a_kestrel_ray_hurt.webp', anvil: 'supers/LD-45b_anvil_mae.webp',
    anvil_hurt: 'supers/LD-45b_anvil_mae_hurt.webp', mendwell: 'supers/LD-45c_mendwell.webp', quillshot: 'supers/LD-45d_quillshot.webp', riotgale: 'supers/LD-45e_riotgale.webp'
  };
  // CCE building id -> facade
  A.BUILDING = { hq: 'hero_hall', clinic: 'civic_clinic', bank: 'first_ledger_bank', office: 'ledger_offices', substation: 'substation_4', aptD: 'hollis_flats',
    store: 'corner_market', cafe: 'steamline_cafe', workshop: 'tinker_workshop', aptC: 'ninefold_apartments', foundry: 'old_foundry', depot: 'transit_depot',
    repair: 'repair_depot', garage: 'eastside_garage', aptE: 'elm_court', aptA: 'riverside_a', aptB: 'riverside_b', aptF: 'lowline_lofts', mural: 'mural_wall_blank' };

  A.load = function (base) {
    if (A.loading) return A.loading;
    var keys = Object.keys(FILES), left = keys.length;
    A.loading = new Promise(function (resolve) {
      if (typeof Image === 'undefined') { A.ready = true; resolve(A); return; }
      keys.forEach(function (k) {
        var im = new Image();
        im.onload = function () { A.stats.loaded++; if (--left === 0) { A.ready = true; resolve(A); } };
        im.onerror = function () { A.stats.error++; A.missing.push(FILES[k]); if (--left === 0) { A.ready = true; resolve(A); } };
        im.src = base + FILES[k]; A.img[k] = im;
      });
    });
    return A.loading;
  };
  function ok(k) { var i = A.img[k]; return !!(i && i.complete && i.naturalWidth > 0); }
  A.ok = ok;
  A.tile = function (ctx, key, x, y) {   // one 32 px atlas cell at world px (x, y)
    var c = A.TILESET.tiles[key]; if (!c || !ok('tileset')) { A.stats.fallback++; return false; }
    ctx.drawImage(A.img.tileset, c[0], c[1], 32, 32, x, y, 32, 32); return true;
  };
  A.blitSouth = function (ctx, key, cx, southY, destW, maxH) {
    if (!ok(key)) { A.stats.fallback++; return false; }
    var i = A.img[key], dw = destW, dh = destW * i.naturalHeight / i.naturalWidth;
    if (maxH && dh > maxH) { dh = maxH; dw = dh * i.naturalWidth / i.naturalHeight; }
    ctx.drawImage(i, cx - dw / 2, southY - dh, dw, dh); A.stats.blit++; return true;
  };
  A.blitCenter = function (ctx, key, cx, cy, destW, destH) {
    if (!ok(key)) { A.stats.fallback++; return false; }
    var i = A.img[key]; if (destH == null) destH = destW * i.naturalHeight / i.naturalWidth;
    ctx.drawImage(i, cx - destW / 2, cy - destH / 2, destW, destH); A.stats.blit++; return true;
  };
  A.blitFeet = function (ctx, key, cx, feetY, destH) {
    if (!ok(key)) { A.stats.fallback++; return false; }
    var i = A.img[key], dw = destH * i.naturalWidth / i.naturalHeight;
    ctx.drawImage(i, cx - dw / 2, feetY - destH, dw, destH); A.stats.blit++; return true;
  };
  // sim vehicle at world px (sx, sy); ang in radians (0 = east). East art is flipped for west; north art is used for both north and south.
  A.drawVehicle = function (ctx, v, sx, sy, T) {
    var kind = v.kind || 'car', c = Math.cos(v.ang || 0), s = Math.sin(v.ang || 0), horiz = Math.abs(c) >= Math.abs(s), key;
    if (kind === 'truck') key = horiz ? 'truck_e' : 'truck_n'; else if (kind === 'van') key = 'van_n'; else if (kind === 'repair') key = horiz ? 'repair_e' : 'repair_n'; else key = horiz ? 'car_e' : 'car_n';
    if (!ok(key)) { A.stats.fallback++; return false; }
    var i = A.img[key], L = kind === 'truck' ? 2.3 : kind === 'van' ? 1.9 : kind === 'repair' ? 2 : 1.5, dw = L * T * 1.15, dh = dw * i.naturalHeight / i.naturalWidth;
    ctx.save(); ctx.translate(sx, sy); if (horiz && c < 0) ctx.scale(-1, 1); ctx.drawImage(i, -dw / 2, -dh * .62, dw, dh); ctx.restore(); A.stats.blit++; return true;
  };
  A.drawSuper = function (ctx, id, injured, sx, sy) {
    var key = (injured && ok(id + '_hurt')) ? id + '_hurt' : id;
    return A.blitFeet(ctx, key, sx, sy, 46);
  };
})(typeof window !== 'undefined' ? window : globalThis);
