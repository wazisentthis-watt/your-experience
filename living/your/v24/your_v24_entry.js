/* Y.O.U.R. v2.4 · PROPOSAL_HOLD · owner decision t88s472: the Living District is the MAIN Y.O.U.R. city.
   index.html now opens the Living District (living.html) by default. The Valence day (the v2.0-v2.3 day systems) stays reachable:
   index.html?valence=1 (or #valence), the "Play the Valence day" button in the Living District menu, and it stays the active
   world for the rest of this browser tab once chosen. The "Y.O.U.R. CITY" button on the Valence start screen goes back to the city. */
(function () {
  /* The public site serves this build under /living/ on the same origin as the main Y.O.U.R. build. Give this copy's Valence-day save its own key so
     the two builds never overwrite each other's day save. The shared hero profile (wir-hero-profile-v1) stays shared on purpose (cross-game). */
  try { var NS = { 'wir_valence_life_v1': 'your-v24-living:wir_valence_life_v1' }, SP = Storage.prototype, g0 = SP.getItem, s0 = SP.setItem, r0 = SP.removeItem;
    SP.getItem = function (k) { return g0.call(this, NS[k] || k); }; SP.setItem = function (k, v) { return s0.call(this, NS[k] || k, v); }; SP.removeItem = function (k) { return r0.call(this, NS[k] || k); };
  } catch (e) { }
  try {
    var q = location.search + location.hash;
    if (/[?&#]valence(=1|\b)/.test(q)) { sessionStorage.setItem('your.entry', 'valence'); return; }
    if (sessionStorage.getItem('your.entry') === 'valence') return;
    location.replace('living.html' + (location.search && !/valence/.test(location.search) ? location.search : ''));
  } catch (e) { /* storage blocked: stay on the Valence day rather than loop */ }
})();
