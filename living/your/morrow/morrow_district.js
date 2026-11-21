/* Y.O.U.R. v2.4m · PROPOSAL_HOLD (PUBLISH HOLD) — MORROW CITY district module (owner t84u).
   Morrow City (METAL: IN DA RIFFT v17 engine, all 8 districts, Brantacle 03 Metal Story missions 1–10, Lil Heavy, build tools, bosses, NPCs) becomes an
   enterable Y.O.U.R. district through a WISHBORN GATE in the Savannah city map. You enter as the hero (the MELLA) with METAL as an AI ally, or swap.
   Modular on purpose: the district is a self-contained folder (your/morrow/district + your/morrow/assets) described by WIR_DISTRICTS.morrow, so the
   living-city engine (your-build-v24-living, built separately) can later mount it as one of its districts without code from this file.
   Installs after v2.0 → v2.3 (wraps window.YOUR_V20_INSTALL). Progress lives in the shared hero profile games.your_morrow (wir.hero/1). */
(function () {
  'use strict';
  var D = window.WIR_DISTRICTS = window.WIR_DISTRICTS || {};
  D.morrow = { id: 'morrow', name: 'Morrow City', status: 'PROPOSAL_HOLD', version: '2.4m',
    engine: { title: 'METAL: IN DA RIFFT · MORROW ALIVE v17 · UNIFIED CAMPAIGN', drive: '1CJy__25KfIpMJGI9AR7gqTbZYWxt-p1Y', file: 'METAL_IN_DA_RIFFT_UNIFIED_v17_OFFLINE.html', sha256: '7a2792730335…', kind: 'canvas 2D top-down, single file' },
    entry: 'your/morrow/district/morrow_v17.html', coop: 'your/morrow/district/morrow_coop.js', assets: 'your/morrow/assets/', library: 'your/morrow/library.html', manifest: 'your/morrow/METAL_ABSORPTION_MANIFEST.csv',
    arrival: 'Lighthouse Yard (safe zone · save point)', zones: ['Market Zone', 'Transit Hub', 'Fabrication Zone', 'Rooftops', 'Lighthouse Yard', 'The Gyre', 'Flood Tunnels', 'Old Bowls'],
    missions: { set: 'BRANTACLE 03 · METAL STORY · THE CITY THAT CARRIES US', count: 10 }, saves: { engine: 'localStorage your_morrow_v17_save', coop: 'localStorage your_morrow_coop_v1', profile: 'wir-hero-profile-v1 → games.your_morrow' },
    leads: ['hero', 'metal'], messages: { exit: 'your-morrow-exit' } };
  /* v2.4 public build: the 1983-file METAL asset library is an owner archive and is not published; its button shows only on a local copy. */
  var LOCAL_LIB = location.protocol === 'file:' || /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  var Z = window.YOUR_MORROW_GATE = { installed: false, stats: {}, open: null, overlay: null, last: null, error: null };
  function count(k) { Z.stats[k] = (Z.stats[k] || 0) + 1; }
  var inst = window.YOUR_V20_INSTALL;
  window.YOUR_V20_INSTALL = function (X) { inst(X); try { install(X); } catch (e) { console.warn('YOUR v2.4m Morrow install', e); Z.error = String(e && e.stack || e); } };
  function install(X) {
    var G = X.G, F = X.fn, $ = X.$, esc = X.esc, T = X.T, H = window.WIR_HERO;
    function onCity() { return !!(G.map && G.map.id === 'SAV'); }
    function walk(x, y) { return G.map && F.walkable()(G.map, Math.floor(x), Math.floor(y)); }
    var GATE = { id: 'morrowGate', name: 'Wishborn Gate', your: 'v24morrow', role: 'Morrow City', x: 10.5, y: 13.5, vis: true, placed: false };
    function place() { if (GATE.placed || !onCity()) return; var cand = [[10.5, 13.5], [11.5, 13.5], [9.5, 12.5], [10.5, 15.5], [12.5, 12.5], [8.5, 15.5], [13.5, 14.5]];
      for (var i = 0; i < cand.length; i++) if (walk(cand[i][0], cand[i][1])) { GATE.x = cand[i][0]; GATE.y = cand[i][1]; break; } GATE.placed = true; }
    Z.gate = GATE;
    function rec() { try { var g = H && H.gameData('your_morrow'); return (g && g.data) || {}; } catch (e) { return {}; } }
    function drawGate() { var cx = X.cx, t = performance.now() / 1000, X0 = GATE.x * T, Y0 = GATE.y * T + 6;
      cx.save(); for (var k = 0; k < 3; k++) { cx.strokeStyle = k === 1 ? 'rgba(201,166,255,.85)' : 'rgba(124,240,224,.75)'; cx.lineWidth = 2; cx.beginPath(); cx.ellipse(X0, Y0 - 16, 9 + k * 3 + Math.sin(t * 2 + k) * 1.5, 15 + k * 3, 0, 0, 7); cx.stroke(); }
      cx.fillStyle = 'rgba(124,240,224,.18)'; cx.beginPath(); cx.ellipse(X0, Y0 - 16, 9, 15, 0, 0, 7); cx.fill();
      cx.font = '700 7px JetBrains Mono, monospace'; cx.textAlign = 'center'; var lab = 'WISHBORN GATE · MORROW CITY · E / tap', w = cx.measureText(lab).width + 6;
      cx.fillStyle = 'rgba(8,10,24,.78)'; cx.fillRect(X0 - w / 2, Y0 - 46, w, 10); cx.fillStyle = '#7cf0e0'; cx.fillText(lab, X0, Y0 - 38.5); cx.restore(); count('gate_drawn'); }
    var _dp = F.drawPlayer(); X.set('drawPlayer', function (tm) { if (onCity()) { place(); drawGate(); } return _dp(tm); });
    var _hit = F.hitObj(); X.set('hitObj', function (wx, wy) { if (onCity() && Math.abs(GATE.x - wx) < .7 && wy > GATE.y - 1.6 && wy < GATE.y + .6) return { npc: GATE }; return _hit(wx, wy); });
    var _on = F.openNpc(); X.set('openNpc', function (n) { if (n && n.your === 'v24morrow') return openSheet(); return _on(n); });
    var _in = F.interactNear(); X.set('interactNear', function () { if (onCity() && !G.sheet && Math.hypot(G.px - GATE.x, G.py - GATE.y) < 1.3) return openSheet(); return _in(); });
    function openSheet() { var r = rec(), t = r.totals || {}, name = (H && H.get().name) || 'Hero';
      F.openSheet()('<h3>WISHBORN GATE · MORROW CITY</h3><div class="sh-sub">METAL\'s home city — all eight districts of <b>METAL: IN DA RIFFT v17</b> (Market, Transit Hub, Fabrication, Rooftops, Lighthouse Yard, The Gyre, Flood Tunnels, Old Bowls). You arrive at Lighthouse Yard. <b>BRANTACLE 03 · METAL STORY</b> missions 1–10, Lil Heavy, Gallium build tools, Frame bosses, the city siege and the Morrow crew are all there.</div>' +
        '<div class="sh-sub dim">Co-op: METAL follows you, fights what is near you, covers you when you go down, shares Galaxy Gallium, and lands RIFFT combos with your hits. Keys: [ ally order · ] team combo · \\ blast · ; calm · ` swap · Home return. Gamepad: hold View + A/B/X/Y/D-pad. Touch: the panel at the top.</div>' +
        '<div class="kv"><span>Visits</span><b>' + (r.visits | 0) + '</b></div><div class="kv"><span>Metal Story</span><b>' + (r.chapterClear ? '10 / 10 · chapter clear' : (r.missionsDone | 0) + ' / 10 missions') + '</b></div>' +
        '<div class="kv"><span>Team combos · revives</span><b>' + (t.combos | 0) + ' · ' + (t.revives | 0) + '</b></div><div class="kv"><span>Veyru</span><b>stays at home for this trip (KAW living behaviours are a separate pass)</b></div>' +
        '<div class="acts"><button type="button" class="btn" id="v24MorrowHero">Enter as ' + esc(name) + ' (METAL fights beside you)</button><button type="button" class="btn" id="v24MorrowMetal">Enter as METAL (' + esc(name) + ' fights beside him)</button>' + (LOCAL_LIB ? '<button type="button" class="btn" id="v24MorrowLib">Browse the METAL asset library</button>' : '') + '</div>');
      var a = $('#v24MorrowHero'), b = $('#v24MorrowMetal'), c = $('#v24MorrowLib');
      if (a) a.onclick = function () { F.closeSheet()(); open('hero'); }; if (b) b.onclick = function () { F.closeSheet()(); open('metal'); }; if (c) c.onclick = function () { window.open('your/morrow/library.html', '_blank'); }; count('gate_sheet'); }
    Z.openSheet = openSheet;
    function open(lead) { if (Z.overlay) return false; var ov = document.createElement('div'); ov.id = 'yourMorrowOverlay';
      ov.style.cssText = 'position:fixed;inset:0;z-index:9999;background:#120e16'; var fr = document.createElement('iframe'); fr.id = 'yourMorrowFrame'; fr.title = 'Morrow City (METAL v17) co-op';
      fr.setAttribute('allow', 'gamepad; autoplay'); fr.style.cssText = 'border:0;width:100%;height:100%;display:block'; fr.src = 'your/morrow/district/morrow_v17.html?lead=' + (lead === 'metal' ? 'metal' : 'hero') + '&from=your';
      ov.appendChild(fr); document.body.appendChild(ov); Z.overlay = ov; Z.lead = lead; count('enter_' + lead); setTimeout(function () { try { fr.focus(); } catch (e) { } }, 300); return true; }
    function close(summary) { if (!Z.overlay) return; Z.overlay.remove(); Z.overlay = null; Z.last = summary || null; count('exit');
      try { if (window.YOUR_V20 && YOUR_V20.heroSync) YOUR_V20.heroSync(); } catch (e) { }
      var s = summary || {}; try { F.toast()('Back from Morrow City · Metal Story ' + (s.finished ? '10/10' : (s.step | 0) + '/10') + ' · team combos ' + ((s.stats && s.stats.combos) | 0), 'ok'); } catch (e) { } }
    Z.open = open; Z.close = close;
    window.addEventListener('message', function (e) { var d = e.data; if (d && d.type === 'your-morrow-exit') close(d.summary); });
    Z.installed = true;
  }
})();
