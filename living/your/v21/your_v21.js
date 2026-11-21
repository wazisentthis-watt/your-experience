/* Y.O.U.R. v2.1 · PROPOSAL_HOLD · Valence side of "the hero on the football field".
   Runs right after the v2.0 merge layer installs (wraps window.YOUR_V20_INSTALL). It:
   - sends the hero (owner look, name) and the hero's football position with every football command (index.html fbPlayer → YOUR_V21_PLAYER)
   - adds the PROPOSED Free Life football-level stat bonus (Testimony keeps its own numbers)
   - writes every football result to the shared hero profile (games.football via YOUR_V21_FB.record)
   - adds a Football block to the Y.O.U.R. phone tab: position (Free Life), level, record, best drills. */
(function () {
  'use strict';
  var C = (window.YOUR_V21_CONFIG || {}).football || {};
  var V21 = window.YOUR_V21 = { version: 'v2.1', results: [] };
  var inst = window.YOUR_V20_INSTALL;
  window.YOUR_V20_INSTALL = function (X) {
    inst(X);
    var G = X.G, F = X.fn, $ = X.$, esc = X.esc, S = function () { return X.S; }, FB = window.YOUR_V21_FB;
    V21.X = X;
    // hero position for Free Life (Testimony uses S.tm.pos, chosen at the start screen)
    function heroPos() { var s = S(); if (s && s.tm && s.tm.pos) return s.tm.pos; return (s && s.fpos) || (FB ? FB.pos() : (C.defaultPos || 'QB')); }
    V21.heroPos = heroPos;
    window.YOUR_V21_PLAYER = function (p, testimony) {
      var s = S(); p.pos = testimony ? p.pos : heroPos();
      p.hero = { lookId: 'owner_starter_v1', name: s ? s.name : 'Hero', pos: p.pos, level: FB ? FB.level() : 1 };
      if (!testimony && FB) { var b = FB.bonus(); if (b > 0) { p.speed += b; p.agility += b; p.power += b; p.hero.bonus = b; } }
      V21.lastPlayer = JSON.parse(JSON.stringify(p)); return p;
    };
    window.addEventListener('message', function (e) { var d = e.data; if (!d || !d.wirT || d.type !== 'result' || !FB) return;
      var g = FB.record(d, heroPos()); V21.results.push({ kind: d.kind, quit: !!d.quit, saved: !!g });
      if (g && !d.quit) try { F.toast()('Hero football: level ' + g.level + ' · saved to your hero profile', 'dim'); } catch (err) { } });
    // phone: Y.O.U.R. tab gets a Football block
    var _rp = F.renderPhone();
    X.set('renderPhone', function (live) {
      var r = _rp.apply(this, arguments);
      if (G.tab === 'your' && !live && FB) { var body = $('#pbody'); if (body && !body.querySelector('#v21fb')) {
        var d = FB.data(), s = S(), tm = s && s.tm, best = Object.keys(d.drills).map(function (k) { return k + ' ' + d.drills[k].best; }).join(' · ') || 'none yet';
        var box = document.createElement('div'); box.id = 'v21fb';
        box.innerHTML = '<h4>Football · you on the field</h4><p class="dim">You are the controllable player in Elemental Gridiron drills, scrimmages, games and the Testimony career. Level ' + FB.level() + ' · ' + d.xp + ' xp (PROPOSED) · ' + d.games + ' games (' + d.wins + '-' + d.losses + (d.ties ? '-' + d.ties : '') + ') · ' + d.tds + ' TDs · ' + d.yds + ' yds · best drills: ' + esc(best) + '</p>' +
          (tm ? '<p class="dim">Testimony position: <b>' + esc(tm.pos) + '</b> (picked when the career started).</p>'
            : '<label>Football position (Free Life)<select id="v21Pos">' + (C.positions || ['QB']).map(function (p) { return '<option' + (p === heroPos() ? ' selected' : '') + '>' + p + '</option>'; }).join('') + '</select></label><div class="btnrow"><button type="button" class="btn" data-v21="pos">Save position</button></div>') +
          '<div class="dim" id="v21Msg"></div>';
        var form = body.querySelector('#yform'); if (form && form.previousElementSibling) body.insertBefore(box, form.previousElementSibling); else body.appendChild(box); } }
      return r;
    });
    document.addEventListener('click', function (e) { var b = e.target.closest && e.target.closest('[data-v21]'); if (!b) return; e.preventDefault();
      if (b.dataset.v21 === 'pos') { var p = $('#v21Pos').value, s = S(); if (s) s.fpos = p; if (FB) FB.setPos(p); var m = $('#v21Msg'); if (m) m.textContent = 'Position saved: ' + p + '. Your next practice or game puts you at ' + p + '.'; try { F.save()(); } catch (err) { } } });
    V21.installed = true;
  };
})();
