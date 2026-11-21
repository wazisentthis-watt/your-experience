/* Y.O.U.R. v2.4-living · PROPOSAL_HOLD · the Valence day start screen gets a button back to the MAIN city (the Living District, living.html).
   Nothing else in the v2.3 day changes. Entry routing: your/v24/your_v24_entry.js. */
(function () {
  function add() { var st = document.getElementById('start'); if (!st || document.getElementById('v24living')) return;
    var a = document.createElement('a'); a.id = 'v24living'; a.href = 'living.html'; a.textContent = '▶ Y.O.U.R. CITY · Living District (main city)'; a.onclick = function () { try { sessionStorage.removeItem('your.entry'); } catch (e) {} };
    a.setAttribute('style', 'position:fixed;right:10px;bottom:10px;z-index:50;background:#163a37;color:#8ff5ea;border:2px solid #2ec4b6;border-radius:10px;padding:8px 12px;font:700 12px system-ui;text-decoration:none');
    document.body.appendChild(a);
    var obs = setInterval(function () { var s = document.getElementById('start'); a.style.display = s && !s.hidden ? '' : 'none'; }, 500); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', add); else add();
})();
