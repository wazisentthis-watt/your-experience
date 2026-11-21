/* Y.O.U.R. v2.1 · hero football progress in the shared WIR hero profile (wir.hero/1 → games.football). PROPOSAL_HOLD.
   Loaded by index.html (Valence) and football.html (Elemental Gridiron). Needs wir_hero_profile.js and your_v21_config.js.
   games.football = { lastPlayed, level, data: { pos, xp, drills:{<type>:{best,last,n}}, games, wins, losses, ties, scrims, yds, tds, comp, pass, plays, last } } */
(function () {
  'use strict';
  var C = (window.YOUR_V21_CONFIG || {}).football || {};
  var POS = C.positions || ['QB', 'WR', 'RB', 'DB', 'LB'];
  function H() { return window.WIR_HERO; }
  function blank() { return { pos: C.defaultPos || 'QB', xp: 0, drills: {}, games: 0, wins: 0, losses: 0, ties: 0, scrims: 0, yds: 0, tds: 0, comp: 0, pass: 0, plays: 0, last: null }; }
  function data() { var h = H(); if (!h) return blank(); var g = h.gameData('football') || {}; var d = blank(), s = g.data || {};
    Object.keys(d).forEach(function (k) { if (s[k] !== undefined) d[k] = s[k]; }); if (POS.indexOf(d.pos) < 0) d.pos = C.defaultPos || 'QB'; return d; }
  function levelOf(xp) { return 1 + Math.floor((xp || 0) / (C.xpPerLevel || 100)); }
  function write(d) { var h = H(); if (!h) return null; var lv = levelOf(d.xp); var g = h.gameData('football', { level: lv, data: d }); try { h.syncLevel(lv); } catch (e) { } return g; }
  function n(v) { v = +v; return isFinite(v) ? v : 0; }
  var F = {
    data: data, levelOf: levelOf,
    level: function () { return levelOf(data().xp); },
    pos: function () { return data().pos; },
    setPos: function (p) { if (POS.indexOf(p) < 0) return false; var d = data(); d.pos = p; write(d); return true; },
    // Free Life stat bonus from the hero's football level (PROPOSED numbers in the config)
    bonus: function () { var b = C.levelBoost || { every: 3, cap: 2 }; return Math.min(b.cap, Math.floor((F.level() - 1) / b.every)); },
    // one finished drill / game / scrimmage from the engine's own result message
    record: function (r, pos) {
      if (!r || r.quit) return null; var d = data(), X = C.xp || {}, h = H(), gain = 0, un = [];
      if (pos && POS.indexOf(pos) >= 0) d.pos = pos;
      if (r.kind === 'drill') { var t = String(r.drill || 'drill').slice(0, 16), s = Math.round(n(r.score)), o = d.drills[t] || { best: 0, last: 0, n: 0 };
        o.best = Math.max(o.best, s); o.last = s; o.n++; d.drills[t] = o; gain = s * (X.drillPerScore || .1); un.push('football:first_drill'); }
      else if (r.kind === 'game' || r.kind === 'scrimmage') {
        if (r.kind === 'game') { d.games++; if (r.us > r.them) { d.wins++; un.push('football:first_win'); gain += X.win || 0; } else if (r.us < r.them) d.losses++; else d.ties++; gain += X.game || 0; un.push('football:first_game'); }
        else { d.scrims++; gain += X.scrimmage || 0; }
        d.yds += Math.round(n(r.yds)); d.tds += n(r.tds); d.comp += n(r.comp); d.pass += n(r.pass); d.plays += n(r.myAct);
        if (n(r.tds) > 0) { un.push('football:first_td'); gain += (X.td || 0) * n(r.tds); }
      } else return null;
      d.xp = Math.round(d.xp + gain); d.last = { kind: r.kind, drill: r.drill || null, score: r.score != null ? Math.round(n(r.score)) : null, us: r.us != null ? r.us | 0 : null, them: r.them != null ? r.them | 0 : null, at: new Date().toISOString() };
      var g = write(d); if (h) un.forEach(function (u) { try { h.unlock(u); } catch (e) { } });
      return g;
    }
  };
  window.YOUR_V21_FB = F;
})();
