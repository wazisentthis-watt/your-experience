/* Y.O.U.R. v2.4m · Morrow City world art — facades, concrete/steel, skate volumes, fence, viaduct, containers.
   Loaded after morrow_your_art.js. Uses window.MAP_ART and window.METAL. Code drawers remain if an image is missing. */
(function () {
  'use strict';
  var wait = (window.MAP_ART && MAP_ART.whenReady) ? MAP_ART.whenReady : Promise.resolve();
  wait.then(hook);

  function ok(k) { return window.MAP_ART && MAP_ART.ok(k); }
  function img(k) { return MAP_ART.get(k); }

  function hook() {
    var M = window.METAL;
    if (!M || !M.Render) { console.warn('MAP_ART Morrow: METAL.Render missing'); return; }
    var R = M.Render, World = M.World, TUNE = M.TUNE, Cam = M.Cam, T = (TUNE && TUNE.TILE) || 64;
    window.MAP_ART_MORROW = { installed: true };

    var _ground = R.ground;
    R.ground = function (ctx, v) {
      _ground.call(this, ctx, v);
      if (!World || !World.ground) return;
      var tx0 = Math.max(0, Math.floor(v.x0 / T)), tx1 = Math.min(TUNE.MAP_W - 1, Math.floor(v.x1 / T));
      var ty0 = Math.max(0, Math.floor(v.y0 / T)), ty1 = Math.min(TUNE.MAP_H - 1, Math.floor(v.y1 / T));
      for (var ty = ty0; ty <= ty1; ty++) for (var tx = tx0; tx <= tx1; tx++) {
        var type = World.ground[ty][tx], key = null;
        if (type === 'steel' && ok('steel64')) key = 'steel64';
        else if (type === 'concrete' && ok('concrete64')) key = ((tx + ty) % 5 === 0 && ok('concrete_dirty64')) ? 'concrete_dirty64' : 'concrete64';
        if (!key) continue;
        var im = img(key);
        ctx.drawImage(im, tx * T - .3, ty * T - .3, T + .6, T + .6);
      }
    };

    function facadeKey(s) {
      if (!s) return null;
      if (s.kind === 'container') return ok('mc_containers') ? 'mc_containers' : null;
      if (s.kind === 'wall') {
        if (s.mural === 8 && ok('mc_murals')) return 'mc_murals';
        if (s.mural === 6 && ok('mc_mural6')) return 'mc_mural6';
        if (s.mural === 7 && ok('mc_mural7')) return 'mc_mural7';
        return ok('mc_wall') ? 'mc_wall' : null;
      }
      if (s.kind === 'planter') return ok('mc_planter') ? 'mc_planter' : null;
      if (s.kind === 'funbox') return ok('mc_funbox') ? 'mc_funbox' : null;
      if (s.kind === 'deck' || s.kind === 'platform' || s.kind === 'ledge') return ok('mc_deck') ? 'mc_deck' : null;
      if (s.kind !== 'building') return null;
      var m = s.mural;
      if (m === 1 && ok('mc_shop_a')) return 'mc_shop_a';
      if (m === 2 && ok('mc_shop_b')) return 'mc_shop_b';
      if (m === 6 && ok('mc_mural6')) return 'mc_mural6';
      if (m === 7 && ok('mc_mural7')) return 'mc_mural7';
      if (m === 8 && ok('mc_murals')) return 'mc_murals';
      var cx = (s.x + s.w / 2) / T;
      if (cx < 20) return ok('mc_shop_a') ? ((Math.floor(s.x / T) % 2) ? 'mc_shop_b' : 'mc_shop_a') : null;
      if (cx < 44) return (s.w > 220 && ok('mc_transit_hall')) ? 'mc_transit_hall' : (ok('mc_transit_annex') ? 'mc_transit_annex' : null);
      return (s.w > 260 && ok('mc_fab_large')) ? 'mc_fab_large' : (ok('mc_fab_west') ? 'mc_fab_west' : null);
    }

    var _block = R.drawBlock;
    R.drawBlock = function (ctx, s) {
      var key = facadeKey(s);
      if (key && ok(key)) {
        var K = (Cam && Cam.K) || 1, H = s.H || 0;
        var south = s.y + s.h, mid = s.x + s.w / 2;
        var maxH = (s.h + H * K) * 1.15 + 8;
        /* keep a short foundation so collision footprints stay readable */
        ctx.fillStyle = 'rgba(0,0,0,.22)';
        ctx.fillRect(s.x + 4, s.y + s.h - 8, s.w, 10);
        if (MAP_ART.blitSouth(ctx, key, mid, south, s.w + 8, maxH || s.h + 40)) return;
      }
      return _block.call(this, ctx, s);
    };

    var _ramp = R.drawRamp;
    R.drawRamp = function (ctx, s) {
      var key = null;
      if (s.stairs && ok('mc_stairs')) key = 'mc_stairs';
      else if (s.profile === 'kick' && ok('mc_ramp_kick')) key = 'mc_ramp_kick';
      else if ((s.profile === 'curve' || s.kind === 'drop') && ok('mc_ramp_lin')) key = 'mc_ramp_lin';
      else if (ok('mc_ramp_lin')) key = 'mc_ramp_lin';
      if (key && MAP_ART.blitSouth(ctx, key, s.x + s.w / 2, s.y + s.h, Math.max(s.w, 40), Math.max(s.h, 40) * 1.6 + 20)) return;
      return _ramp.call(this, ctx, s);
    };

    var _fence = R.drawFence;
    R.drawFence = function (ctx, f) {
      if (!ok('mc_fence')) return _fence.call(this, ctx, f);
      var im = img('mc_fence');
      var dx = f.bx - f.ax, dy = f.by - f.ay, len = Math.sqrt(dx * dx + dy * dy) || 1;
      var ang = Math.atan2(dy, dx);
      var iw = im.naturalWidth, ih = im.naturalHeight;
      var seg = 64, n = Math.max(1, Math.round(len / seg));
      var h = (f.h || 48) * ((Cam && Cam.K) || 1);
      ctx.save();
      for (var k = 0; k < n; k++) {
        var u = (k + .5) / n, x = f.ax + dx * u, y = f.ay + dy * u;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(ang);
        ctx.drawImage(im, -seg / 2, -h, seg, h + 8);
        ctx.restore();
      }
      ctx.restore();
    };

    var _dep = R.depressions;
    R.depressions = function (ctx, v) {
      _dep.call(this, ctx, v);
      if (!World || !World.shapes) return;
      for (var i = 0; i < World.shapes.length; i++) {
        var s = World.shapes[i];
        if (s.type !== 'pool' && s.type !== 'bowl') continue;
        if (s.x > v.x1 || s.x + s.w < v.x0 || s.y > v.y1 + 20 || s.y + s.h < v.y0) continue;
        var key = s.canal ? 'mc_canal' : (s.type === 'bowl' ? 'mc_bowl' : 'mc_pool');
        if (s.canal && ok('water64')) {
          /* water fill already drawn procedurally; stamp a water-tinted overlay in the bowl */
        }
        if (ok(key)) MAP_ART.blitCenter(ctx, key, s.x + s.w / 2, s.y + s.h / 2, s.w, s.h);
      }
    };

    var _oh = R.overhead;
    R.overhead = function (ctx, v, P) {
      var saved = World.viaducts;
      World.viaducts = [];
      _oh.call(this, ctx, v, P);
      World.viaducts = saved;
      var K = (Cam && Cam.K) || 1;
      (saved || []).forEach(function (vd) {
        var z = vd.z * K, hw = vd.w / 2;
        var under = false;
        if (P) {
          if (vd.axis === 'h') under = Math.abs(P.y - vd.c) < hw + 40;
          else under = Math.abs(P.x - vd.c) < hw + 30;
        }
        ctx.globalAlpha = under ? .45 : .96;
        if (vd.axis === 'h' && ok('mc_viaduct_ew')) {
          var y = vd.c - hw - z, im = img('mc_viaduct_ew');
          var tw = Math.max(160, im.naturalWidth * (vd.w / im.naturalHeight));
          for (var x = v.x0 - tw; x < v.x1 + tw; x += tw) ctx.drawImage(im, x, y, tw, vd.w);
        } else if (vd.axis !== 'h' && ok('mc_viaduct_ns')) {
          var x0 = vd.c - hw, im2 = img('mc_viaduct_ns');
          var th = Math.max(160, im2.naturalHeight * (vd.w / im2.naturalWidth));
          for (var y2 = v.y0 - z - th; y2 < v.y1 - z + th; y2 += th) ctx.drawImage(im2, x0, y2, vd.w, th);
        } else {
          /* fallback: restore this one and let a mini original path run — just fill */
          ctx.globalAlpha = 1;
          World.viaducts = [vd];
          _oh.call(this, ctx, v, P);
          World.viaducts = saved;
        }
        ctx.globalAlpha = 1;
      }, this);
    };
  }
})();
