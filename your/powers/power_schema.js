/* Y.O.U.R. · wir.power/1 schema, caps and validator. PROPOSAL_HOLD (PUBLISH HOLD).
   Unified design §3 (Drive doc 1tmYnY8XnKzhTXHlX_IeOnUGwp_humKa3CtwORfY07Rc). A power is DATA, never code: this file only checks records;
   nothing here evaluates text, builds functions or touches HP. Damage always comes from the v2.3 Nimbus path (YOUR_V23.nimbus → YOUR_V23.damage).
   Tiers:  core = the shipped MELLA V7 kit (structure checked; numbers are the kit's own and are guarded by a parity test against the v2.2/v2.3 configs)
           user = made by a player (U2 Power Forge): every cap below applies + the budget
           dlc  = from a DLC pack (U4): same caps as user; id must be dlc.<pack>.<name>
   Units:  tiles, tiles/s, seconds. Every cap is PROPOSED (owner decision 21 Nov 2026 4:09 PM ET: custom powers are allowed in raids and boss
           fights "with sane caps/validation, so no infinite damage"). Pure function file: safe to load in Node tests. */
(function (root) {
  'use strict';
  var SCHEMA = 'wir.power/1';
  var LANES = ['hit', 'blast', 'root', 'core', 'crown', 'calm', 'dash', 'jump', 'transform', 'utility'];
  var DAMAGE_LANES = ['hit', 'blast', 'root', 'core', 'crown'];          // lanes that already have a Nimbus lane in YOUR_V23_CONFIG.nimbus
  var SHAPES = ['self', 'front_arc', 'circle', 'line', 'projectile', 'cell'];
  var ANIMS = ['none', 'hit', 'cast_up', 'cast_down', 'calm', 'refraction', 'jump', 'dash'];   // frames that exist (your_hero_art.js + hero_sheet_96)
  var SHEETS = { 'hero.vfx': { cols: 6, rows: 5 }, 'hero.icons': { cols: 7, rows: 2 } };       // registered art only (U4 adds validated DLC sheets)
  var USER_EFFECTS = ['damage', 'knockback', 'pull', 'stun', 'slow', 'shield', 'heal_self', 'bond_kaw', 'energy_self', 'light', 'reveal', 'move'];
  var CORE_EFFECTS = USER_EFFECTS.concat(['jump', 'transform', 'cell', 'chain', 'read', 'regulate', 'ram']);
  var CAPS = {                                                                   // PROPOSED (user + dlc tiers)
    name: 28, desc: 160, effects: 4,
    cost: { energy: [0, 60], stamina: [0, 40], stability: [0, 20], minTotal: 4 },
    cooldown: [0.5, 30], castTime: [0.1, 1.5],
    target: { front_arc: { range: [0.5, 3], arc: [0.2, 2.1] }, circle: { radius: [0.5, 3] }, line: { range: [1, 6], width: [0.2, 1.5] },
              projectile: { speed: [3, 12], life: [0.2, 2], radius: [0.1, 0.6] }, cell: { range: [0, 3], radius: [0.3, 2], life: [0.5, 10] }, self: {} },
    maxTargets: [1, 5],
    effect: { damage: { scale: [0.3, 1.25] }, knockback: { tiles: [0, 3] }, pull: { tiles: [0, 2] }, stun: { seconds: [0, 1.5] },
              slow: { pct: [0, 50], seconds: [0, 3] }, shield: { seconds: [0, 1] }, heal_self: { hp: [0, 1] }, bond_kaw: { amount: [0, 5] },
              energy_self: { amount: [0, 10] }, light: { radius: [0, 4] }, reveal: { radius: [0, 6] }, move: { tiles: [0, 4] } },
    budget: 40
  };
  var ID_RE = /^(core|user|dlc)\.[a-z0-9-]{1,24}(\.[a-z0-9-]{1,32}){1,2}$/;
  var SEMVER = /^\d{1,3}\.\d{1,3}\.\d{1,3}$/;
  var TOP = ['schema', 'id', 'name', 'desc', 'version', 'tier', 'owner', 'base', 'nimbus', 'cost', 'cooldown', 'cast', 'target', 'effects', 'visual', 'limits', 'input', 'engine', 'source', 'text', 'author', 'v7'];

  function num(v) { return typeof v === 'number' && isFinite(v); }
  function inR(v, r) { return num(v) && v >= r[0] && v <= r[1]; }
  function plain(o) { return !!o && typeof o === 'object' && !Array.isArray(o); }

  /* budget: PROPOSED points. Strong effects cost points, costs and cooldown give points back. A custom power must score ≤ CAPS.budget. */
  function budget(p) {
    var s = 0, e = Array.isArray(p.effects) ? p.effects : [], t = plain(p.target) ? p.target : {}, c = plain(p.cost) ? p.cost : {};
    e = e.filter(plain);
    e.forEach(function (x) {
      if (x.type === 'damage') s += 40 * (x.scale || 0);
      else if (x.type === 'knockback') s += 6 * (x.tiles || 0);
      else if (x.type === 'pull') s += 6 * (x.tiles || 0);
      else if (x.type === 'stun') s += 25 * (x.seconds || 0);
      else if (x.type === 'slow') s += 0.3 * (x.pct || 0) * (x.seconds || 0) / 3;
      else if (x.type === 'shield') s += 30 * (x.seconds || 0);
      else if (x.type === 'heal_self') s += 20 * (x.hp || 0);
      else if (x.type === 'bond_kaw') s += 2 * (x.amount || 0);
      else if (x.type === 'energy_self') s += 1.5 * (x.amount || 0);
      else if (x.type === 'move') s += 2 * (x.tiles || 0);
      else s += 2;                                                                  // light / reveal
    });
    s += 8 * (t.radius || 0) + 2 * (t.range || 0) + 4 * ((t.maxTargets || 1) - 1);
    s -= 2.5 * (p.cooldown || 0) + 0.5 * (c.energy || 0) + 0.6 * (c.stamina || 0) + 1 * (c.stability || 0);
    return Math.round(s * 10) / 10;
  }

  /* validate(record, opts) → { ok, errors[], warnings[], budget }. opts.tier forces the tier (the Forge passes 'user', DLC passes 'dlc'),
     opts.pack = DLC pack id. Never throws on bad input. */
  function validate(p, opts) {
    opts = opts || {}; var E = [], W = [];
    function err(m) { E.push(m); }
    if (!plain(p)) return { ok: false, errors: ['a power must be a JSON object'], warnings: W, budget: null };
    var tier = opts.tier || p.tier;
    Object.keys(p).forEach(function (k) { if (TOP.indexOf(k) < 0) err('unknown field "' + k + '"'); });
    if (p.schema !== SCHEMA) err('schema must be "' + SCHEMA + '"');
    if (['core', 'user', 'dlc'].indexOf(tier) < 0) err('tier must be core, user or dlc');
    if (p.tier !== tier) err('tier "' + p.tier + '" not allowed here (expected ' + tier + ')');
    if (typeof p.id !== 'string' || !ID_RE.test(p.id)) err('id must look like user.<you>.<power-name> (lowercase, digits, dashes)');
    else if (p.id.split('.')[0] !== tier) err('id must start with "' + tier + '."');
    else if (tier === 'dlc' && opts.pack && p.id.indexOf('dlc.' + opts.pack + '.') !== 0) err('DLC power ids must start with dlc.' + opts.pack + '.');
    if (typeof p.name !== 'string' || !p.name.trim() || p.name.length > CAPS.name) err('name: 1–' + CAPS.name + ' characters');
    if (p.desc != null && (typeof p.desc !== 'string' || p.desc.length > CAPS.desc)) err('desc: up to ' + CAPS.desc + ' characters');
    if (typeof p.version !== 'string' || !SEMVER.test(p.version)) err('version must be like 1.0.0');
    if (p.owner !== 'hero') err('owner must be "hero" (KAW abilities come later)');
    if (LANES.indexOf(p.base) < 0) err('base must be one of ' + LANES.join(', '));
    // cost
    var c = p.cost;
    if (!plain(c)) err('cost must be an object');
    else { ['energy', 'stamina', 'stability'].forEach(function (k) { if (c[k] != null && (!num(c[k]) || c[k] < 0)) err('cost.' + k + ' must be a number ≥ 0'); });
      Object.keys(c).forEach(function (k) { if (['energy', 'stamina', 'stability'].indexOf(k) < 0) err('unknown cost "' + k + '"'); }); }
    if (!num(p.cooldown) || p.cooldown < 0) err('cooldown must be a number ≥ 0 (seconds)');
    if (!plain(p.cast) || !num(p.cast.time) || p.cast.time < 0) err('cast.time must be a number ≥ 0');
    else if (ANIMS.indexOf(p.cast.anim) < 0) err('cast.anim must be one of ' + ANIMS.join(', '));
    // target
    var t = p.target;
    if (!plain(t) || SHAPES.indexOf(t.shape) < 0) err('target.shape must be one of ' + SHAPES.join(', '));
    // effects
    var allowed = tier === 'core' ? CORE_EFFECTS : USER_EFFECTS;
    if (!Array.isArray(p.effects) || !p.effects.length) err('effects: at least one');
    else p.effects.forEach(function (x, i) { if (!plain(x) || allowed.indexOf(x.type) < 0) err('effects[' + i + '].type not allowed (' + (x && x.type) + ')');
      else Object.keys(x).forEach(function (k) { if (k !== 'type' && !num(x[k]) && typeof x[k] !== 'string' && typeof x[k] !== 'boolean') err('effects[' + i + '].' + k + ' must be a number, text or true/false'); }); });
    var dmg = (Array.isArray(p.effects) ? p.effects : []).filter(function (x) { return x && x.type === 'damage'; });
    if (dmg.length > 1) err('only one damage effect per power');
    if (dmg.length && DAMAGE_LANES.indexOf(p.base) < 0) err('a damage effect needs a damage lane as base (' + DAMAGE_LANES.join(', ') + ')');
    // visual (registered sheets only)
    var v = p.visual;
    if (!plain(v)) err('visual must be an object');
    else {
      if (v.sheet != null) { var sh = SHEETS[v.sheet]; if (!sh) err('visual.sheet must be a registered sheet (' + Object.keys(SHEETS).join(', ') + ')');
        else { if (!(Number.isInteger(v.row) && v.row >= 0 && v.row < sh.rows)) err('visual.row out of range');
          if (!Array.isArray(v.frames) || !v.frames.length || v.frames.some(function (f) { return !(Number.isInteger(f) && f >= 0 && f < sh.cols); })) err('visual.frames out of range'); } }
      if (v.icon != null && !(Array.isArray(v.icon) && v.icon.length === 2 && Number.isInteger(v.icon[0]) && Number.isInteger(v.icon[1]) && v.icon[0] >= 0 && v.icon[0] < 7 && v.icon[1] >= 0 && v.icon[1] < 2)) err('visual.icon must be [col,row] on hero.icons');
      if (v.tint != null && !/^#[0-9a-fA-F]{6}$/.test(v.tint)) err('visual.tint must be #rrggbb');
    }
    if (tier === 'core') {
      if (typeof p.engine !== 'string' || !/^v22:(jump|dash|hit|blast|transform|calm|root|core|crown)$/.test(p.engine)) err('core powers must name their engine function (v22:<kit move>)');
    } else {
      if (p.engine != null) err('only core powers may name an engine function');
      if (p.input != null) err('input keys are assigned by the game, not by the power');
      if (p.nimbus != null) err('the Nimbus lane comes from the base lane, not from the power');
      if (p.v7 != null) err('v7 block is core-only');
      // caps
      if (plain(c)) { var K = CAPS.cost; ['energy', 'stamina', 'stability'].forEach(function (k) { if (c[k] != null && !inR(c[k], K[k])) err('cost.' + k + ' must be ' + K[k][0] + '–' + K[k][1]); });
        if ((c.energy || 0) + (c.stamina || 0) + (c.stability || 0) < K.minTotal) err('total cost must be at least ' + K.minTotal); }
      if (num(p.cooldown) && !inR(p.cooldown, CAPS.cooldown)) err('cooldown must be ' + CAPS.cooldown[0] + '–' + CAPS.cooldown[1] + ' s');
      if (plain(p.cast) && num(p.cast.time) && !inR(p.cast.time, CAPS.castTime)) err('cast.time must be ' + CAPS.castTime[0] + '–' + CAPS.castTime[1] + ' s');
      if (plain(t) && CAPS.target[t.shape]) { var TC = CAPS.target[t.shape];
        Object.keys(TC).forEach(function (k) { if (!inR(t[k], TC[k])) err('target.' + k + ' must be ' + TC[k][0] + '–' + TC[k][1] + ' for ' + t.shape); });
        Object.keys(t).forEach(function (k) { if (k !== 'shape' && k !== 'maxTargets' && !TC[k]) err('target.' + k + ' is not used by ' + t.shape); });
        var mt = t.maxTargets == null ? 1 : t.maxTargets; if (!(Number.isInteger(mt) && mt >= CAPS.maxTargets[0] && mt <= CAPS.maxTargets[1])) err('target.maxTargets must be 1–' + CAPS.maxTargets[1]);
        if (t.shape === 'self' && dmg.length) err('a self power cannot deal damage'); }
      if (Array.isArray(p.effects)) {
        if (p.effects.length > CAPS.effects) err('at most ' + CAPS.effects + ' effects');
        var seen = {};
        p.effects.forEach(function (x, i) { if (!plain(x) || !CAPS.effect[x.type]) return; if (seen[x.type]) err('effect "' + x.type + '" listed twice'); seen[x.type] = 1;
          var EC = CAPS.effect[x.type]; Object.keys(EC).forEach(function (k) { if (!inR(x[k], EC[k])) err('effects[' + i + '] ' + x.type + '.' + k + ' must be ' + EC[k][0] + '–' + EC[k][1]); });
          Object.keys(x).forEach(function (k) { if (k !== 'type' && !EC[k]) err('effects[' + i + '] ' + x.type + ' has no "' + k + '"'); }); }); }
      if (plain(p.limits)) Object.keys(p.limits).forEach(function (k) { if (['inCity', 'inRaid', 'inBoss'].indexOf(k) < 0 || typeof p.limits[k] !== 'boolean') err('limits.' + k + ' not allowed'); });
      else if (p.limits != null) err('limits must be an object');
      if (p.text != null) err('text block is core-only');
    }
    var b = budget(p);
    if (tier !== 'core' && b > CAPS.budget) err('too strong: budget ' + b + ' > ' + CAPS.budget + ' (raise the cost or cooldown, or soften an effect)');
    return { ok: E.length === 0, errors: E, warnings: W, budget: b };
  }

  root.WIR_POWER_SCHEMA = Object.freeze({ schema: SCHEMA, LANES: LANES, DAMAGE_LANES: DAMAGE_LANES, SHAPES: SHAPES, ANIMS: ANIMS, SHEETS: SHEETS,
    USER_EFFECTS: USER_EFFECTS, CORE_EFFECTS: CORE_EFFECTS, CAPS: CAPS, validate: validate, budget: budget });
})(typeof window !== 'undefined' ? window : this);
