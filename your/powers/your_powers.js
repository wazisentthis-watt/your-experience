/* Y.O.U.R. · power registry (U1: powers as data). PROPOSAL_HOLD (PUBLISH HOLD).
   Installs after v2.0 → v2.1 → v2.2 → v2.3 (wraps window.YOUR_V20_INSTALL, like every layer). Additive: changes no rule, key, pad button or HUD.
   1. window.YOUR_POWERS: one registry for wir.power/1 records. The nine MELLA V7 records (core_kit.js) are validated and registered at load.
   2. YOUR_POWERS.use(id) runs a core record through the engine function it names (YOUR_V22.use(<kit move>)), so the kit behaves exactly as
      before; damage still comes from Nimbus through v2.3. Keys / pad / MELLA buttons keep calling v2.2 directly (unchanged).
   3. The phone YOUR tab lists your powers from the registry (name, cost, key) with the existing power icon sheet (power_icons_96.webp).
   Later PRs: U2 adds player-made powers (Power Forge, custom slots, caps + budget from power_schema.js); U4 adds DLC powers. */
(function () {
  'use strict';
  var SC = window.WIR_POWER_SCHEMA, KIT = window.YOUR_POWER_KIT;
  var R = window.YOUR_POWERS = { version: 'u1', installed: false, schema: SC ? SC.schema : null, stats: { used: {}, rejected: 0 }, errors: [], log: [] };
  var REG = {}, ORDER = [];
  function deepFreeze(o) { Object.keys(o).forEach(function (k) { var v = o[k]; if (v && typeof v === 'object') deepFreeze(v); }); return Object.freeze(o); }
  function copy(o) { return JSON.parse(JSON.stringify(o)); }
  /* register(record, opts) → { ok, errors, budget }. The record is validated (power_schema.js), deep-copied and frozen. Ids are unique. */
  R.register = function (rec, opts) {
    if (!SC) return { ok: false, errors: ['power_schema.js missing'] };
    var v = SC.validate(rec, opts);
    if (v.ok && REG[rec.id] && !(opts && opts.replace)) v = { ok: false, errors: ['id already registered: ' + rec.id], warnings: [], budget: v.budget };
    if (!v.ok) { R.stats.rejected++; R.errors.push({ id: rec && rec.id, errors: v.errors }); return v; }
    if (!REG[rec.id]) ORDER.push(rec.id);
    REG[rec.id] = deepFreeze(copy(rec)); return v;
  };
  R.get = function (id) { return REG[id] || null; };
  R.list = function (tier) { return ORDER.map(function (id) { return REG[id]; }).filter(function (p) { return !tier || p.tier === tier; }); };
  R.validate = function (rec, opts) { return SC.validate(rec, opts); };
  R.kit = KIT ? { id: KIT.id, name: KIT.name, resources: KIT.resources, chain: KIT.chain } : null;
  if (KIT) KIT.powers.forEach(function (p) { var v = R.register(p, { tier: 'core' }); if (!v.ok) console.warn('YOUR powers: core record rejected', p.id, v.errors); });

  var inst = window.YOUR_V20_INSTALL;
  window.YOUR_V20_INSTALL = function (X) { inst(X); try { install(X); } catch (e) { console.warn('YOUR powers install', e); R.error = String(e && e.stack || e); } };

  function install(X) {
    var G = X.G, F = X.fn, $ = X.$, esc = X.esc, V22 = window.YOUR_V22, C23 = window.YOUR_V23_CONFIG;
    if (!V22 || !V22.power || !V22.use) throw new Error('v2.2 kit missing');
    /* the Nimbus lane of every damage record must match the live v2.3 wiring (data never picks its own lane) */
    R.lanes = {}; R.list('core').forEach(function (p) { var live = C23 && C23.nimbus ? (C23.nimbus[p.base] || null) : null; R.lanes[p.id] = live;
      if (p.nimbus !== live) { R.errors.push({ id: p.id, errors: ['nimbus lane ' + p.nimbus + ' ≠ live ' + live] }); console.warn('YOUR powers: lane drift', p.id, p.nimbus, live); } });
    /* use(id, src): core records → the engine function they name. Returns what v2.2 returns (true = the move happened). */
    R.use = function (id, src) {
      var p = REG[id]; if (!p) return false;
      var k = p.engine && p.engine.split(':')[1];
      if (p.tier !== 'core' || !k || !V22.power[k]) return false;            // U2 adds the data runtime for user / dlc powers
      var ok = V22.use(k, src || 'powers');
      R.stats.used[id] = (R.stats.used[id] || 0) + (ok ? 1 : 0); R.last = { id: id, ok: ok, src: src || 'powers' }; return ok;
    };
    R.byKey = function (key) { key = String(key || '').toLowerCase(); return R.list().find(function (p) { return p.input && String(p.input.key).toLowerCase() === key; }) || null; };

    /* ---- phone YOUR tab: the kit, read from the registry (icons = existing power_icons_96.webp; text only, no drawing) */
    var ICONS = 'your/assets/hero/power_art/power_icons_96.webp', SZ = 28;
    var st = document.createElement('style'); st.textContent =
      '#yourPowerList .pw{display:grid;grid-template-columns:' + SZ + 'px 1fr auto;gap:8px;align-items:center;padding:4px 0;border-bottom:1px solid rgba(124,240,224,.12)}' +
      '#yourPowerList .ic{width:' + SZ + 'px;height:' + SZ + 'px;background:url(' + ICONS + ') 0 0/' + (7 * SZ) + 'px ' + (2 * SZ) + 'px no-repeat}' +
      '#yourPowerList .pw b{display:block}#yourPowerList .pw small{opacity:.75}#yourPowerList .k{font:700 10px JetBrains Mono,monospace;color:#7cf0e0;text-align:right}';
    document.head.appendChild(st);
    function costText(p) { var c = p.cost || {}, a = []; if (c.energy) a.push(c.energy + ' energy'); if (c.stamina) a.push(c.stamina + ' stamina'); if (c.stability) a.push(c.stability + ' stability'); return a.length ? a.join(' · ') : 'free'; }
    R.html = function () {
      return '<h4>Your powers</h4><p class="dim">Your own kit (The First Wish · Mella V7), read from power data (' + esc(SC.schema) + '). Same rules as before; damage comes from Nimbus.</p>' +
        R.list().map(function (p) { var ic = p.visual && p.visual.icon ? p.visual.icon : [0, 0];
          return '<div class="pw" data-power="' + esc(p.id) + '"><span class="ic" style="background-position:-' + ic[0] * SZ + 'px -' + ic[1] * SZ + 'px"></span><span><b>' + esc(p.name) + '</b><small>' + esc(p.desc || '') + ' · ' + esc(costText(p)) + '</small></span><span class="k">' + esc(String(p.input ? p.input.key : '').toUpperCase()) + '</span></div>'; }).join('');
    };
    var _rp = F.renderPhone(); X.set('renderPhone', function (live) { _rp(live); if (G.tab !== 'your' || live) return; var pb = $('#pbody'); if (!pb || $('#yourPowerList')) return;
      var box = document.createElement('div'); box.id = 'yourPowerList'; box.innerHTML = R.html(); var after = $('#v22mella');
      if (after && after.parentNode === pb) pb.insertBefore(box, after.nextSibling); else pb.appendChild(box); R.stats.listed = (R.stats.listed || 0) + 1; });
    R.installed = true;
  }
})();
