/* Y.O.U.R. v2.4-living · map art loader + blit helpers (ChatGPT sheets 57–68, cut to transparent cells).
   Loaded before living.js. Images live at your/assets/map-art/. Code drawers stay as fallback if a cell fails to load. */
(function (W) {
  'use strict';
  var A = W.MAP_ART = {
    version: '2026-11-21',
    ready: false,
    img: {},
    missing: [],
    stats: { loaded: 0, error: 0, blit: 0, fallback: 0 },
    whenReady: null
  };

  var FILES = {
    sidewalk: 'tiles_32/LD-01_sidewalk_32.png',
    curb: 'tiles_32/LD-01b_curb_32.png',
    asphalt: 'tiles_32/LD-02_asphalt_32.png',
    asphalt_worn: 'tiles_32/LD-02b_asphalt_worn_32.png',
    dash_v: 'tiles_32/LD-03_dash_v_32.png',
    dash_h: 'tiles_32/LD-03b_dash_h_32.png',
    crosswalk: 'tiles_32/LD-04_crosswalk_32.png',
    grass: 'tiles_32/LD-05_grass_32.png',
    plaza: 'tiles_32/LD-08_plaza_32.png',
    concrete: 'tiles_32/MC-01_concrete_32.png',
    concrete_dirty: 'tiles_32/MC-01b_concrete_dirty_32.png',
    steel: 'tiles_32/MC-02_steel_32.png',
    water: 'tiles_32/MC-17c_canal_water_32.png',
    /* 64 px copies for Morrow (TUNE.TILE=64) */
    concrete64: 'tiles_64/MC-01_concrete_64.png',
    concrete_dirty64: 'tiles_64/MC-01b_concrete_dirty_64.png',
    steel64: 'tiles_64/MC-02_steel_64.png',
    water64: 'tiles_64/MC-17c_canal_water_64.png',
    sidewalk64: 'tiles_64/LD-01_sidewalk_64.png',
    asphalt64: 'tiles_64/LD-02_asphalt_64.png',
    grass64: 'tiles_64/LD-05_grass_64.png',
    plaza64: 'tiles_64/LD-08_plaza_64.png',

    hero_hall: 'living/buildings/LD-25_hero_hall.png',
    civic_clinic: 'living/buildings/LD-26_civic_clinic.png',
    first_ledger_bank: 'living/buildings/LD-13_first_ledger_bank.png',
    ledger_offices: 'living/buildings/LD-14_ledger_offices.png',
    substation_4: 'living/buildings/LD-15_substation_4.png',
    hollis_flats: 'living/buildings/LD-16_hollis_flats.png',
    corner_market: 'living/buildings/LD-17_corner_market.png',
    steamline_cafe: 'living/buildings/LD-18_steamline_cafe.png',
    tinker_workshop: 'living/buildings/LD-19_tinker_workshop.png',
    ninefold_apartments: 'living/buildings/LD-20_ninefold_apartments.png',
    old_foundry: 'living/buildings/LD-21_old_foundry.png',
    transit_depot: 'living/buildings/LD-22_transit_depot.png',
    repair_depot: 'living/buildings/LD-23_repair_depot.png',
    eastside_garage: 'living/buildings/LD-24_eastside_garage.png',
    elm_court: 'living/buildings/LD-27_elm_court.png',
    riverside_a: 'living/buildings/LD-28_riverside_a.png',
    riverside_b: 'living/buildings/LD-29_riverside_b.png',
    lowline_lofts: 'living/buildings/LD-30_lowline_lofts.png',
    mural_wall_blank: 'living/buildings/LD-31_mural_wall_blank.png',
    mural_wall_half: 'living/buildings/LD-31b_mural_wall_half.png',
    mural_wall_finished: 'living/buildings/LD-31c_mural_wall_finished.png',

    damage_cracks: 'living/props/LD-33_damage_cracks.png',
    damage_heavy: 'living/props/LD-33b_damage_heavy.png',
    smoke: 'living/props/LD-33c_smoke.png',
    night_windows: 'living/props/LD-33d_night_windows.png',
    boarded_windows: 'living/props/LD-33e_boarded_windows.png',
    closed_plaque: 'living/props/LD-33_closed_plaque.png',
    name_plaque: 'living/props/LD-33f_name_plaque.png',
    sunflower: 'living/props/LD-37b_sunflower_pothole.png',
    octopus_tag: 'living/props/LD-37c_octopus_tag.png',
    skate_ramp: 'living/props/LD-10_skate_ramp.png',
    rail_long: 'living/props/LD-11_skate_rail_long.png',
    rail_short: 'living/props/LD-12_skate_rail_short.png',
    tree: 'living/props/LD-06_park_tree.png',
    bench: 'living/props/LD-07_park_bench.png',
    grate: 'living/props/LD-32_sewer_grate.png',
    traffic_light: 'living/props/LD-35_traffic_light.png',
    cones: 'living/props/LD-34_road_cones.png',
    fountain: 'living/props/LD-08b_plaza_fountain.png',
    gate_idle: 'living/props/LD-36_morrow_gate_idle.png',
    gate_open: 'living/props/LD-36b_morrow_gate_open.png',
    evidence: 'living/props/LD-38_evidence.png',
    prototype_core: 'living/props/LD-39_prototype_core.png',
    discovery_glint: 'living/props/LD-37_discovery_glint.png',
    morrow_totem: 'living/props/LD-36c_morrow_line_totem.png',

    car_n: 'living/vehicles/LD-40_car_n.png',
    car_e: 'living/vehicles/LD-40b_car_e.png',
    pcar_n: 'living/vehicles/LD-41_player_car_n.png',
    pcar_e: 'living/vehicles/LD-41b_player_car_e.png',
    truck_n: 'living/vehicles/LD-42_truck_n.png',
    truck_e: 'living/vehicles/LD-42b_truck_e.png',
    van_n: 'living/vehicles/LD-43_van_n.png',
    repair_n: 'living/vehicles/LD-44_repair_van_n.png',
    repair_e: 'living/vehicles/LD-44b_repair_van_e.png',

    kestrel: 'living/supers/LD-45a_kestrel_ray.png',
    kestrel_hurt: 'living/supers/LD-45a_kestrel_ray_hurt.png',
    anvil: 'living/supers/LD-45b_anvil_mae.png',
    anvil_hurt: 'living/supers/LD-45b_anvil_mae_hurt.png',
    mendwell: 'living/supers/LD-45c_mendwell.png',
    quillshot: 'living/supers/LD-45d_quillshot.png',
    riotgale: 'living/supers/LD-45e_riotgale.png',
    security_idle: 'living/supers/LD-46_city_security_idle.png',
    security_alert: 'living/supers/LD-46b_city_security_alert.png',

    mc_shop_a: 'morrow/facades/MC-03_market_shop_a.png',
    mc_shop_b: 'morrow/facades/MC-04_market_shop_b.png',
    mc_transit_hall: 'morrow/facades/MC-05_transit_hall.png',
    mc_transit_annex: 'morrow/facades/MC-06_transit_annex.png',
    mc_fab_west: 'morrow/facades/MC-07_fab_west.png',
    mc_fab_large: 'morrow/facades/MC-08_fab_large_hall.png',
    mc_mural6: 'morrow/facades/MC-09_midblock_mural6.png',
    mc_mural7: 'morrow/facades/MC-10_midblock_mural7.png',
    mc_murals: 'morrow/facades/MC-20_wall_murals.png',
    mc_wall: 'morrow/infra/MC-12_perimeter_wall.png',
    mc_containers: 'morrow/infra/MC-13_shipping_containers.png',
    mc_viaduct_ew: 'morrow/infra/MC-19_viaduct_ew.png',
    mc_viaduct_ns: 'morrow/infra/MC-19b_viaduct_ns.png',
    mc_fence: 'morrow/infra/MC-18_chain_fence.png',
    mc_ramp_lin: 'morrow/skate/MC-15_ramp_linear.png',
    mc_ramp_kick: 'morrow/skate/MC-15b_ramp_kick.png',
    mc_stairs: 'morrow/skate/MC-15c_stairs.png',
    mc_bowl: 'morrow/skate/MC-16_bowl.png',
    mc_pool: 'morrow/skate/MC-17_pool_dry.png',
    mc_canal: 'morrow/skate/MC-17b_flood_canal.png',
    mc_deck: 'morrow/skate/MC-14_deck.png',
    mc_funbox: 'morrow/skate/MC-14b_funbox.png',
    mc_planter: 'morrow/skate/MC-14c_planter.png'
  };

  A.BUILDING = {
    hq: 'hero_hall', clinic: 'civic_clinic', bank: 'first_ledger_bank', office: 'ledger_offices',
    substation: 'substation_4', aptD: 'hollis_flats', store: 'corner_market', cafe: 'steamline_cafe',
    workshop: 'tinker_workshop', aptC: 'ninefold_apartments', foundry: 'old_foundry', depot: 'transit_depot',
    repair: 'repair_depot', garage: 'eastside_garage', aptE: 'elm_court', aptA: 'riverside_a',
    aptB: 'riverside_b', aptF: 'lowline_lofts', mural: 'mural_wall_blank'
  };
  A.SUPER = { kestrel: 'kestrel', anvil: 'anvil', mendwell: 'mendwell', quillshot: 'quillshot', riotgale: 'riotgale' };

  function basePath() {
    var p = (W.location && location.pathname) || '';
    if (/\/morrow\//.test(p) || /morrow_v17\.html/.test(p)) return '../../assets/map-art/';
    return 'your/assets/map-art/';
  }

  function loadAll() {
    var keys = Object.keys(FILES), left = keys.length, BASE = basePath();
    A.base = BASE;
    return new Promise(function (resolve) {
      if (!left) { A.ready = true; resolve(A); return; }
      keys.forEach(function (k) {
        var im = new Image();
        im.onload = function () { A.stats.loaded++; if (--left === 0) { A.ready = true; resolve(A); } };
        im.onerror = function () { A.stats.error++; A.missing.push(FILES[k]); if (--left === 0) { A.ready = true; resolve(A); } };
        im.src = BASE + FILES[k];
        A.img[k] = im;
      });
    });
  }
  A.whenReady = loadAll();

  function ok(k) { var im = A.img[k]; return !!(im && im.complete && im.naturalWidth > 0); }
  A.ok = ok;

  function im(k) { return ok(k) ? A.img[k] : null; }
  A.get = im;

  /* Tile a 32 (or native) texture across a rectangle. Returns false if missing. */
  A.tileFill = function (ctx, key, x, y, w, h) {
    var i = im(key); if (!i) { A.stats.fallback++; return false; }
    var tw = i.naturalWidth, th = i.naturalHeight;
    var x1 = x + w, y1 = y + h;
    for (var yy = y; yy < y1; yy += th) {
      for (var xx = x; xx < x1; xx += tw) {
        var dw = Math.min(tw, x1 - xx), dh = Math.min(th, y1 - yy);
        ctx.drawImage(i, 0, 0, dw, dh, xx, yy, dw, dh);
      }
    }
    A.stats.blit++;
    return true;
  };

  /* Bottom-center blit, optionally scaled to a target width and capped height. */
  A.blitSouth = function (ctx, key, cx, southY, destW, maxH) {
    var i = im(key); if (!i) { A.stats.fallback++; return false; }
    var iw = i.naturalWidth, ih = i.naturalHeight;
    var dw = destW, dh = destW * (ih / iw);
    if (maxH && dh > maxH) { dh = maxH; dw = dh * (iw / ih); }
    ctx.drawImage(i, cx - dw / 2, southY - dh, dw, dh);
    A.stats.blit++;
    return true;
  };

  A.blitCenter = function (ctx, key, cx, cy, destW, destH) {
    var i = im(key); if (!i) { A.stats.fallback++; return false; }
    var iw = i.naturalWidth, ih = i.naturalHeight;
    if (destW == null) destW = iw;
    if (destH == null) destH = destW * (ih / iw);
    ctx.drawImage(i, cx - destW / 2, cy - destH / 2, destW, destH);
    A.stats.blit++;
    return true;
  };

  A.blitFeet = function (ctx, key, cx, feetY, destH) {
    var i = im(key); if (!i) { A.stats.fallback++; return false; }
    var iw = i.naturalWidth, ih = i.naturalHeight;
    var dh = destH, dw = destH * (iw / ih);
    ctx.drawImage(i, cx - dw / 2, feetY - dh, dw, dh);
    A.stats.blit++;
    return true;
  };

  /* Draw a Living building facade into the prerender canvas (tile space already in px). */
  A.drawLivingBuilding = function (ctx, bd, T, muralProg) {
    var key = A.BUILDING[bd.id];
    if (bd.id === 'mural') {
      var p = muralProg == null ? 0 : muralProg;
      key = p >= 90 ? 'mural_wall_finished' : p >= 40 ? 'mural_wall_half' : 'mural_wall_blank';
    }
    if (!ok(key)) { A.stats.fallback++; return false; }
    var r = bd.r;
    var lotX = r[0] * T, lotY = r[1] * T, lotW = r[2] * T, lotH = r[3] * T;
    /* faint foundation so the lot is not empty beside a narrower sprite */
    ctx.fillStyle = 'rgba(40,36,32,.28)';
    ctx.fillRect(lotX + 2, lotY + lotH * .45, lotW - 4, lotH * .55);
    var maxH = lotH * 1.45;
    A.blitSouth(ctx, key, lotX + lotW / 2, lotY + lotH, lotW, maxH);
    return true;
  };

  /* Live overlays: damage, smoke, closed, night windows. World-space px. */
  A.drawLivingBuildingLive = function (ctx, bd, B, T, t, night, muralProg) {
    var r = bd.r, x = r[0] * T, y = r[1] * T, w = r[2] * T, h = r[3] * T;
    var used = false;
    if (bd.kind === 'mural') {
      var p = muralProg == null ? 0 : muralProg;
      /* baked mural is the static blank; live swaps progress if we can redraw the facade */
      var key = p >= 90 ? 'mural_wall_finished' : p >= 40 ? 'mural_wall_half' : null;
      if (key && ok(key)) { A.blitSouth(ctx, key, x + w / 2, y + h, w, h * 1.45); used = true; }
    }
    if (B && B.dmg > 35) {
      ctx.save(); ctx.globalAlpha = .85;
      if (A.blitSouth(ctx, 'damage_heavy', x + w / 2, y + h, w, h * 1.2)) used = true;
      if (Math.sin(t * 2 + r[0]) > -.2) {
        ctx.globalAlpha = .55 + .2 * Math.sin(t * 3);
        A.blitSouth(ctx, 'smoke', x + w / 2, y + h * .35, w * .7, h * .8);
      }
      ctx.restore();
    } else if (B && B.dmg > 3) {
      ctx.save(); ctx.globalAlpha = Math.min(.85, .35 + B.dmg / 80);
      if (A.blitSouth(ctx, 'damage_cracks', x + w / 2, y + h, w, h * 1.2)) used = true;
      ctx.restore();
    }
    if (B && B.closed) {
      if (A.blitCenter(ctx, 'closed_plaque', (bd.door[0] + .5) * T, (bd.door[1] + .4) * T, 52, 28)) used = true;
    }
    if (night > 0 && !(B && B.closed)) {
      ctx.save(); ctx.globalAlpha = Math.min(.8, night * 1.6);
      A.blitSouth(ctx, 'night_windows', x + w / 2, y + h, w * .9, h * 1.1);
      ctx.restore();
    }
    if (B && B.closed) {
      ctx.save(); ctx.globalAlpha = .7;
      A.blitSouth(ctx, 'boarded_windows', x + w / 2, y + h, w * .9, h * 1.1);
      ctx.restore();
    }
    return used;
  };

  A.drawVehicle = function (ctx, v, sx, sy, T, scale, t) {
    var kind = v.kind || 'car';
    var player = !!(v.player || v.color === '#2ec4b6');
    var ang = v.ang || 0;
    var c = Math.cos(ang), s = Math.sin(ang);
    var horiz = Math.abs(c) >= Math.abs(s);
    var key, flip = false;
    if (kind === 'truck') { key = horiz ? 'truck_e' : 'truck_n'; flip = horiz && c < 0; }
    else if (kind === 'van') { key = 'van_n'; flip = horiz && c < 0; }
    else if (kind === 'repair') { key = horiz ? 'repair_e' : 'repair_n'; flip = horiz && c < 0; }
    else { key = player ? (horiz ? 'pcar_e' : 'pcar_n') : (horiz ? 'car_e' : 'car_n'); flip = horiz && c < 0; }
    var i = im(key); if (!i) { A.stats.fallback++; return false; }
    var L2 = kind === 'truck' ? 2.3 : kind === 'van' ? 1.9 : kind === 'repair' ? 2 : 1.5;
    var destW = L2 * T * scale * 1.15;
    var iw = i.naturalWidth, ih = i.naturalHeight;
    var dw = destW, dh = destW * (ih / iw);
    ctx.save();
    ctx.translate(sx, sy);
    if (flip) ctx.scale(-1, 1);
    ctx.drawImage(i, -dw / 2, -dh * .62, dw, dh);
    ctx.restore();
    A.stats.blit++;
    return true;
  };

  A.drawSuper = function (ctx, id, state, sx, sy, scale) {
    var key = A.SUPER[id];
    if ((state === 'injured') && (id === 'kestrel' || id === 'anvil') && ok(key + '_hurt')) key = key + '_hurt';
    if (!ok(key)) { A.stats.fallback++; return false; }
    A.blitFeet(ctx, key, sx, sy, 46 * scale);
    return true;
  };

  A.drawSecurity = function (ctx, alert, sx, sy, scale) {
    var key = alert ? 'security_alert' : 'security_idle';
    if (!ok(key)) { A.stats.fallback++; return false; }
    A.blitFeet(ctx, key, sx, sy, 36 * scale);
    return true;
  };

  A.drawGate = function (ctx, xPx, yPx, active, t) {
    var key = active ? 'gate_open' : 'gate_idle';
    if (!ok(key)) { A.stats.fallback++; return false; }
    A.blitSouth(ctx, key, xPx, yPx + 10, 70, 90);
    if (ok('morrow_totem')) A.blitSouth(ctx, 'morrow_totem', xPx, yPx + 10, 36, 70);
    return true;
  };

  A.FILES = FILES;
})(typeof window !== 'undefined' ? window : this);
