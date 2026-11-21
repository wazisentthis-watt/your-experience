/* Y.O.U.R. · the Power Forge (U2: the power creator). PROPOSAL_HOLD (PUBLISH HOLD).
   Owner (t96u): "people can invent and create new powers". Phone → Y.O.U.R. → Your powers → "Open the Power Forge".
   A form that builds a wir.power/1 record from fixed choices and sliders. Every slider is clamped to WIR_POWER_SCHEMA.CAPS; the validator
   and the budget meter update live; Save is only possible when the record passes. Art = existing sheets only (VFX rows of mella_vfx_96.webp,
   icons of power_icons_96.webp). Text you type is shown with textContent / escaped HTML only and never run.
   Export / import = the record as JSON text (validated again on import). */
(function () {
  'use strict';
  var SC = window.WIR_POWER_SCHEMA, R = window.YOUR_POWERS;
  var FG = window.YOUR_POWER_FORGE = { version: 'u2', installed: false, stats: {} };
  var inst = window.YOUR_V20_INSTALL;
  window.YOUR_V20_INSTALL = function (X) { inst(X); try { install(X); } catch (e) { console.warn('YOUR power forge install', e); FG.error = String(e && e.stack || e); } };

  var VFX = [['Blast bolt', 0, [0, 1, 2, 3]], ['ROOT growth', 1, [0, 1, 2, 3, 4, 5]], ['CORE pulse', 2, [0, 1, 2, 3, 4, 5]], ['Calm ring', 3, [0, 1, 2, 3, 4, 5]], ['Circuit bloom', 4, [0, 1, 2, 3, 4, 5]]];
  var BASES = [['hit', 'Hit lane (melee)'], ['blast', 'Blast lane (B)'], ['root', 'ROOT lane (A)'], ['core', 'CORE lane (X)'], ['crown', 'CROWN lane (Y)'], ['utility', 'Utility (no damage)']];
  var SHAPE_TXT = { front_arc: 'Strike in front', circle: 'Ring around you', line: 'Line ahead', projectile: 'Projectile', cell: 'Ground cell ahead', self: 'Only you' };
  var EFF = [['damage', 'scale', 'Damage (× Nimbus roll)', 0.05], ['knockback', 'tiles', 'Knockback (tiles)', 0.1], ['pull', 'tiles', 'Pull in (tiles)', 0.1], ['stun', 'seconds', 'Stun (s)', 0.05],
    ['shield', 'seconds', 'Shield / dodge (s)', 0.05], ['heal_self', 'hp', 'Heal you (hearts)', 1], ['energy_self', 'amount', 'Give you energy', 1], ['bond_kaw', 'amount', 'Veyru bond', 1], ['move', 'tiles', 'Dash forward (tiles)', 0.1]];
  var ANIMS = [['cast_down', 'Cast'], ['hit', 'Strike'], ['calm', 'Calm'], ['none', 'None']];
  var DEFAULT = { schema: 'wir.power/1', id: 'user.hero.rainroot-lash', name: 'Rainroot Lash', desc: 'A whip of rooted water that pulls a machine in and holds it.', version: '1.0.0', tier: 'user', owner: 'hero', base: 'root',
    cost: { energy: 18, stamina: 0, stability: 6 }, cooldown: 6, cast: { time: 0.4, anim: 'cast_down' }, target: { shape: 'line', range: 4, width: 0.8, maxTargets: 2 },
    effects: [{ type: 'damage', scale: 0.8 }, { type: 'pull', tiles: 1.5 }, { type: 'stun', seconds: 0.6 }], visual: { sheet: 'hero.vfx', row: 1, frames: [0, 1, 2, 3, 4, 5], icon: [6, 0], tint: '#6fe3c8' }, limits: { inCity: true, inRaid: true, inBoss: true } };

  function install(X) {
    var G = X.G, F = X.fn, $ = X.$, esc = X.esc, RT = window.YOUR_POWER_RUNTIME, CAP = SC.CAPS;
    if (!RT || !RT.installed) throw new Error('power runtime missing');
    function slug(s) { return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 32) || 'power'; }
    function uniqueId(name, keep) { if (keep) return keep; var base = 'user.hero.' + slug(name), id = base, n = 2, mine = (RT.state() || { mine: [] }).mine; while (mine.some(function (r) { return r.id === id; })) id = base.slice(0, 40) + '-' + n++; return id; }
    var draft = null, editing = null;
    function rng(r) { return r; }
    function slider(id, label, val, r, step, help) { return '<label class="fg-row"><span>' + esc(label) + ' <b id="' + id + 'V">' + val + '</b></span><input type="range" id="' + id + '" min="' + r[0] + '" max="' + r[1] + '" step="' + step + '" value="' + val + '">' + (help ? '<small>' + esc(help) + '</small>' : '') + '</label>'; }
    function opt(list, cur) { return list.map(function (o) { return '<option value="' + esc(o[0]) + '"' + (o[0] === cur ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join(''); }
    function shapeSliders(t) { var TC = CAP.target[t.shape] || {}, STEP = { range: .1, arc: .05, radius: .05, width: .05, speed: .5, life: .1 };
      return Object.keys(TC).map(function (k) { var v = t[k] == null ? TC[k][0] : t[k]; return slider('fgT_' + k, k[0].toUpperCase() + k.slice(1) + (k === 'arc' ? ' (radians)' : k === 'speed' ? ' (tiles/s)' : k === 'life' ? ' (s)' : ' (tiles)'), v, TC[k], STEP[k]); }).join('') +
        (t.shape === 'self' ? '' : slider('fgT_maxTargets', 'Max targets', t.maxTargets || 1, CAP.maxTargets, 1)); }
    function effRows(p) { return EFF.map(function (e) { var cur = p.effects.find(function (x) { return x.type === e[0]; }), r = CAP.effect[e[0]][e[1]];
      return '<div class="fg-eff"><label><input type="checkbox" data-eff="' + e[0] + '"' + (cur ? ' checked' : '') + '> ' + esc(e[2]) + '</label>' + slider('fgE_' + e[0], '', cur ? cur[e[1]] : (e[0] === 'damage' ? 0.8 : r[1] / 2), [e[0] === 'damage' ? r[0] : r[0] + (e[3] >= 1 ? 1 : e[3]), r[1]], e[3]) + '</div>'; }).join(''); }
    function iconCss(ic, sz) { return 'background-position:-' + ic[0] * sz + 'px -' + ic[1] * sz + 'px'; }
    function body() { var p = draft, t = p.target, c = p.cost;
      return '<h3>Power Forge</h3><div class="sh-sub">Make your own power. It runs on your MELLA energy, stamina and stability; damage is rolled by Nimbus on the lane you pick, then scaled. Every slider stops at a safe cap, and the budget keeps it fair. Works in the city, raids and boss fights.</div>' +
        '<div id="fgMine"></div>' +
        '<div class="fg-grid"><label class="fg-row"><span>Name</span><input id="fgName" maxlength="' + CAP.name + '" value="' + esc(p.name) + '"></label>' +
        '<label class="fg-row"><span>What it does</span><input id="fgDesc" maxlength="' + CAP.desc + '" value="' + esc(p.desc || '') + '"></label>' +
        '<label class="fg-row"><span>Lane</span><select id="fgBase">' + opt(BASES, p.base) + '</select></label>' +
        '<label class="fg-row"><span>Shape</span><select id="fgShape">' + opt(SC.SHAPES.map(function (s) { return [s, SHAPE_TXT[s]]; }), t.shape) + '</select></label></div>' +
        '<div id="fgShapeBox">' + shapeSliders(t) + '</div>' +
        '<h4>Effects (up to ' + CAP.effects + ')</h4>' + effRows(p) +
        '<h4>Cost and timing</h4>' + slider('fgC_energy', 'Energy', c.energy || 0, CAP.cost.energy, 1) + slider('fgC_stamina', 'Stamina', c.stamina || 0, CAP.cost.stamina, 1) + slider('fgC_stability', 'Stability', c.stability || 0, CAP.cost.stability, 1) +
        slider('fgCool', 'Cooldown (s)', p.cooldown, CAP.cooldown, .1) + slider('fgCast', 'Cast time (s)', p.cast.time, CAP.castTime, .05) +
        '<label class="fg-row"><span>Move</span><select id="fgAnim">' + opt(ANIMS, p.cast.anim) + '</select></label>' +
        '<h4>Look</h4><div class="fg-vfx">' + VFX.map(function (v) { return '<button type="button" data-vfx="' + v[1] + '" class="' + (p.visual.row === v[1] ? 'on' : '') + '" title="' + esc(v[0]) + '"><span style="background-position:-' + 2 * 48 + 'px -' + v[1] * 48 + 'px"></span>' + esc(v[0]) + '</button>'; }).join('') + '</div>' +
        '<div class="fg-icons">' + [0, 1].map(function (r) { return [0, 1, 2, 3, 4, 5, 6].map(function (cI) { var on = p.visual.icon[0] === cI && p.visual.icon[1] === r; return '<button type="button" data-icon="' + cI + ',' + r + '" class="' + (on ? 'on' : '') + '" style="' + iconCss([cI, r], 32) + '" aria-label="icon"></button>'; }).join(''); }).join('') + '</div>' +
        '<label class="fg-row"><span>Colour</span><input type="color" id="fgTint" value="' + esc(p.visual.tint || '#6fe3c8') + '"></label>' +
        '<div class="fg-budget"><div class="fg-meter"><i id="fgBudgetBar"></i></div><span id="fgBudget"></span></div><ul id="fgErr" class="fg-err"></ul>' +
        '<div class="acts fg-acts"><button type="button" class="btn" id="fgSave">Save power</button><button type="button" class="btn" id="fgEq0">Save + equip ★4</button><button type="button" class="btn" id="fgEq1">Save + equip ★5</button>' +
        '<button type="button" class="btn" id="fgTry">Try it now</button><button type="button" class="btn" id="fgNew">New power</button><button type="button" class="btn" id="fgExport">Export JSON</button><button type="button" class="btn" id="fgImportBtn">Import JSON</button></div>' +
        '<textarea id="fgJson" class="fg-json" rows="5" spellcheck="false" placeholder="Paste a wir.power/1 record here, then Import JSON" hidden></textarea>'; }
    function mineHtml() { var s = RT.state(), sl = RT.slots(); if (!s || !s.mine.length) return '<p class="dim">No powers yet. Build one below.</p>';
      return '<h4>Your creations (' + s.mine.length + '/' + CAP.saved + ')</h4>' + s.mine.map(function (r) { var off = RT.off && RT.off[r.id], ic = r.visual && r.visual.icon || [2, 1];
        return '<div class="fg-mine"><span class="ic" style="' + iconCss(ic, 24) + '"></span><span><b></b><small>' + (off ? 'switched off: ' + esc(off[0]) : (sl[0] === r.id ? '★4 · ' : sl[1] === r.id ? '★5 · ' : '') + 'cooldown ' + r.cooldown + ' s') + '</small></span>' +
          '<button type="button" class="btn" data-edit="' + esc(r.id) + '">Edit</button><button type="button" class="btn" data-eq0="' + esc(r.id) + '">★4</button><button type="button" class="btn" data-eq1="' + esc(r.id) + '">★5</button><button type="button" class="btn" data-del="' + esc(r.id) + '">Delete</button></div>'; }).join(''); }
    function read(sh) { var p = JSON.parse(JSON.stringify(draft)), v = function (id) { var el = sh.querySelector('#' + id); return el ? +el.value : null; };
      p.name = sh.querySelector('#fgName').value.trim(); p.desc = sh.querySelector('#fgDesc').value.trim(); p.base = sh.querySelector('#fgBase').value;
      var shape = sh.querySelector('#fgShape').value, t = { shape: shape }; Object.keys(CAP.target[shape] || {}).forEach(function (k) { var x = v('fgT_' + k); t[k] = x == null ? CAP.target[shape][k][0] : x; });
      if (shape !== 'self') { var mt = v('fgT_maxTargets'); t.maxTargets = mt == null ? 1 : mt; } p.target = t;
      p.effects = EFF.filter(function (e) { var cb = sh.querySelector('[data-eff="' + e[0] + '"]'); return cb && cb.checked; }).map(function (e) { var o = { type: e[0] }; o[e[1]] = v('fgE_' + e[0]); return o; });
      p.cost = { energy: v('fgC_energy'), stamina: v('fgC_stamina'), stability: v('fgC_stability') }; p.cooldown = v('fgCool'); p.cast = { time: v('fgCast'), anim: sh.querySelector('#fgAnim').value };
      p.id = uniqueId(p.name, editing); return p; }
    function check(sh) { draft = read(sh); var r = SC.validate(draft, { tier: 'user' }), b = r.budget == null ? 0 : r.budget;
      sh.querySelectorAll('input[type=range]').forEach(function (i) { var o = sh.querySelector('#' + i.id + 'V'); if (o) o.textContent = i.value; });
      sh.querySelector('#fgBudget').textContent = 'Budget ' + b + ' / ' + CAP.budget + (r.ok ? ' · ready' : ''); var bar = sh.querySelector('#fgBudgetBar');
      bar.style.width = Math.max(0, Math.min(100, b / CAP.budget * 100)) + '%'; bar.className = b > CAP.budget ? 'over' : '';
      var ul = sh.querySelector('#fgErr'); ul.innerHTML = ''; r.errors.forEach(function (e) { var li = document.createElement('li'); li.textContent = e; ul.appendChild(li); });
      ['fgSave', 'fgEq0', 'fgEq1', 'fgTry'].forEach(function (id) { sh.querySelector('#' + id).disabled = !r.ok; }); FG.lastCheck = r; return r; }
    function paintMine(sh) { var m = sh.querySelector('#fgMine'); m.innerHTML = mineHtml(); var s = RT.state();
      m.querySelectorAll('.fg-mine').forEach(function (row, i) { row.querySelector('b').textContent = s.mine[i].name; });   // player text → textContent only
      m.querySelectorAll('[data-edit]').forEach(function (b) { b.onclick = function () { var rec = s.mine.find(function (r) { return r.id === b.dataset.edit; }); if (rec) open(rec); }; });
      m.querySelectorAll('[data-eq0],[data-eq1]').forEach(function (b) { b.onclick = function () { var id = b.dataset.eq0 || b.dataset.eq1; RT.equip(b.dataset.eq0 ? 0 : 1, id); paintMine(sh); }; });
      m.querySelectorAll('[data-del]').forEach(function (b) { b.onclick = function () { RT.remove(b.dataset.del); if (editing === b.dataset.del) editing = null; paintMine(sh); }; }); }
    function saveDraft(sh, slot) { var r = check(sh); if (!r.ok) return false; var v = RT.saveMine(draft); if (!v.ok) { var ul = sh.querySelector('#fgErr'); v.errors.forEach(function (e) { var li = document.createElement('li'); li.textContent = e; ul.appendChild(li); }); return false; }
      editing = draft.id; if (slot != null) RT.equip(slot, draft.id); FG.stats.saved = (FG.stats.saved || 0) + 1; F.toast()('Saved ' + draft.name + (slot != null ? ' to ★' + (slot + 4) : ''), 'gold'); paintMine(sh); return true; }
    function bind(sh) {
      sh.classList.add('fg');
      sh.addEventListener('input', function (e) { if (e.target.id === 'fgShape') return; check(sh); });
      sh.querySelector('#fgShape').onchange = function () { draft = read(sh); draft.target = { shape: this.value }; Object.keys(CAP.target[this.value] || {}).forEach(function (k) { var r = CAP.target[draft.target.shape][k]; draft.target[k] = +((r[0] + r[1]) / 2).toFixed(2); });
        if (this.value !== 'self') draft.target.maxTargets = 1; sh.querySelector('#fgShapeBox').innerHTML = shapeSliders(draft.target); check(sh); };
      sh.querySelectorAll('[data-vfx]').forEach(function (b) { b.onclick = function () { var v = VFX[+b.dataset.vfx]; draft = read(sh); draft.visual.row = v[1]; draft.visual.frames = v[2]; sh.querySelectorAll('[data-vfx]').forEach(function (x) { x.classList.toggle('on', x === b); }); check(sh); }; });
      sh.querySelectorAll('[data-icon]').forEach(function (b) { b.onclick = function () { draft = read(sh); draft.visual.icon = b.dataset.icon.split(',').map(Number); sh.querySelectorAll('[data-icon]').forEach(function (x) { x.classList.toggle('on', x === b); }); check(sh); }; });
      sh.querySelector('#fgTint').oninput = function () { draft.visual.tint = this.value; check(sh); };
      sh.querySelector('#fgSave').onclick = function () { saveDraft(sh, null); };
      sh.querySelector('#fgEq0').onclick = function () { saveDraft(sh, 0); };
      sh.querySelector('#fgEq1').onclick = function () { saveDraft(sh, 1); };
      sh.querySelector('#fgTry').onclick = function () { if (!saveDraft(sh, null)) return; var id = draft.id; F.closeSheet ? F.closeSheet()() : (sh.hidden = true, G.sheet = false); setTimeout(function () { FG.lastTry = RT.cast(id, 'forge'); }, 60); };
      sh.querySelector('#fgNew').onclick = function () { editing = null; var d = JSON.parse(JSON.stringify(DEFAULT)); d.name = 'New power'; open(d, true); };
      var ta = sh.querySelector('#fgJson');
      sh.querySelector('#fgExport').onclick = function () { ta.hidden = false; ta.value = JSON.stringify(read(sh), null, 1); ta.select(); };
      sh.querySelector('#fgImportBtn').onclick = function () { if (ta.hidden) { ta.hidden = false; ta.value = ''; ta.focus(); return; } var rec; try { rec = JSON.parse(ta.value); } catch (e) { rec = null; }
        var ul = sh.querySelector('#fgErr'); ul.innerHTML = ''; var r = rec ? SC.validate(rec, { tier: 'user' }) : { ok: false, errors: ['not valid JSON'] };
        if (!r.ok) { r.errors.forEach(function (e) { var li = document.createElement('li'); li.textContent = 'Import: ' + e; ul.appendChild(li); }); FG.lastImport = r; return; }
        editing = null; FG.lastImport = r; open(rec, true); };
      paintMine(sh); check(sh);
    }
    function open(rec, fresh) { draft = JSON.parse(JSON.stringify(rec || DEFAULT)); if (!draft.visual) draft.visual = JSON.parse(JSON.stringify(DEFAULT.visual)); if (!draft.visual.icon) draft.visual.icon = [6, 0];
      if (!draft.visual.sheet) { draft.visual.sheet = 'hero.vfx'; draft.visual.row = 1; draft.visual.frames = [0, 1, 2, 3, 4, 5]; }
      if (rec && !fresh && RT.state() && RT.state().mine.some(function (r) { return r.id === rec.id; })) editing = rec.id; else if (fresh) editing = null;
      if (G.phone) F.closePhone()(); F.openSheet()(body(), bind); FG.open = true; FG.stats.opened = (FG.stats.opened || 0) + 1; }
    FG.open = open; FG.openForge = function () { open(null); };
    FG.read = function () { return draft; };

    /* styles (layout only; art = the existing sheets) */
    var css = document.createElement('style'); css.textContent =
      '#sheet.fg h4{margin:12px 0 4px}#sheet .fg-row{display:flex;flex-direction:column;gap:2px;margin:6px 0;font-size:13px}#sheet .fg-row input:not([type=range]),#sheet .fg-row select{font:inherit;padding:6px 8px;border-radius:8px;border:1px solid var(--line);background:var(--panel2);color:inherit}' +
      '#sheet .fg-row input[type=range]{width:100%}#sheet .fg-row small{opacity:.7}#sheet .fg-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:0 12px}' +
      '#sheet .fg-eff{display:grid;grid-template-columns:minmax(150px,1fr) 2fr;gap:8px;align-items:center;font-size:13px}#sheet .fg-eff .fg-row{margin:2px 0}' +
      '#sheet .fg-vfx{display:flex;flex-wrap:wrap;gap:6px}#sheet .fg-vfx button{display:flex;align-items:center;gap:6px;padding:4px 8px;border-radius:10px;border:1px solid var(--line);background:var(--panel2);color:inherit;font-size:12px}' +
      '#sheet .fg-vfx span{width:48px;height:48px;background:url(your/assets/hero/power_art/mella_vfx_96.webp) 0 0/288px 240px no-repeat}#sheet .fg-vfx .on,#sheet .fg-icons .on{outline:2px solid #7cf0e0}' +
      '#sheet .fg-icons{display:grid;grid-template-columns:repeat(7,36px);gap:4px;margin:8px 0}#sheet .fg-icons button{width:36px;height:36px;border-radius:8px;border:1px solid var(--line);background:url(your/assets/hero/power_art/power_icons_96.webp) 0 0/224px 64px no-repeat;background-color:var(--panel2);padding:0;background-origin:content-box;padding:2px}' +
      '#sheet .fg-budget{display:flex;align-items:center;gap:8px;margin:10px 0 4px;font:700 12px JetBrains Mono,monospace}#sheet .fg-meter{flex:1;height:8px;border-radius:4px;background:rgba(255,255,255,.12);overflow:hidden}#sheet .fg-meter i{display:block;height:100%;background:#7cf0e0}#sheet .fg-meter i.over{background:#ff6b6b}' +
      '#sheet .fg-err{color:#ffb3b3;font-size:12px;margin:4px 0;padding-left:18px}#sheet .fg-acts{flex-direction:row;flex-wrap:wrap}#sheet .fg-json{width:100%;font:11px JetBrains Mono,monospace;margin-top:8px;border-radius:8px;background:var(--panel2);color:inherit;border:1px solid var(--line)}' +
      '#sheet .fg-mine{display:grid;grid-template-columns:24px 1fr auto auto auto auto;gap:6px;align-items:center;padding:4px 0;font-size:13px}#sheet .fg-mine small{display:block;opacity:.7}#sheet .fg-mine .btn{padding:5px 8px}' +
      '#sheet .fg-mine .ic{width:24px;height:24px;background:url(your/assets/hero/power_art/power_icons_96.webp) 0 0/168px 48px no-repeat}';
    document.head.appendChild(css);

    /* entry: a button in the phone Y.O.U.R. tab, under "Your powers" (U1 list) */
    var _rp = F.renderPhone(); X.set('renderPhone', function (live) { _rp(live); if (G.tab !== 'your' || live) return; var box = $('#yourPowerList'); if (!box || $('#yourForgeBtn')) return;
      var sl = RT.slots(), d = document.createElement('div'); d.className = 'acts'; d.innerHTML = '<p class="dim" id="yourSlotsTxt"></p><button type="button" class="btn" id="yourForgeBtn">Open the Power Forge</button>';
      box.appendChild(d); $('#yourSlotsTxt').textContent = 'Custom slots: ★4 ' + (sl[0] && R.get(sl[0]) ? R.get(sl[0]).name : 'empty') + ' · ★5 ' + (sl[1] && R.get(sl[1]) ? R.get(sl[1]).name : 'empty') + ' (keys 4 / 5, ★ buttons on the MELLA pad).';
      $('#yourForgeBtn').onclick = function () { open(null); }; });
    FG.installed = true;
  }
})();
