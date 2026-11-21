/* Y.O.U.R. v2.2 · PROPOSAL_HOLD — dialogue overlay for your/modules/your_llm.js (that file is unchanged).
   Owner (t70u): the hero IS the MELLA with powers; Mella is not a sidekick. The sidekick is a KAW: Veyru (owner pick, 2026-11-16).
   - The 'mella' NPC sheet is switched off (kept in the file, never spoken): nobody talks AS Mella, because the player is the MELLA.
   - New 'veyru' sheet: facts only from the KAW Universal Master R3 (species, elements, home, likes). A KAW does not speak words,
     so the voice is PROPOSED narration ("Veyru flicks its ears…"). No new lore, abilities or history.
   - Mara learns one fact: the player is the MELLA and Veyru is their bonded KAW. SIKEE and Dex are unchanged. */
(function () {
  'use strict';
  var Y = window.YOUR, llm = Y && Y.llm; if (!llm) return;
  var SH = llm.SHEETS, G = llm.GRAMMAR;
  if (SH.mella) { SH.mella.disabled = 'v2.2: the player is the MELLA (owner t70u); this sheet is kept for reference only'; }
  SH.veyru = {
    name: 'Veyru', role: 'the bonded KAW companion of {name}. Veyru is a Rainroot Lynx (Water + Plant), a forest scout and support creature that follows {name}. {name} is the MELLA, a caretaker with ROOT, CORE and CROWN powers',
    voice: 'PROPOSED: Veyru is an animal and never speaks human words. The "line" is one short third-person narration of what Veyru does or the sound it makes, for example: Veyru flicks its ears and pads closer.',
    facts: ['Veyru is a KAW: a Rainroot Lynx, Water + Plant', 'Veyru awakened in Rainroot Canopy', 'Veyru loves clean water, canopy cover and regular time with {name}', 'Veyru follows {name} around the neighborhood',
      'Veyru is a bonded companion, not property', 'on the Corner Store shift Veyru points at the next shelf slot; at the skate park it marks the next ring'],
    never: ['Veyru never talks in human words', 'no new abilities, places, family or history beyond the facts', 'do not name any other KAW'],
    source: 'facts: WIR_WISHBORN_KAW_UNIVERSAL_MASTER_R3 (Drive 1t499zFSGiH1ba2s57_WC7g4jsLQzESEt); voice PROPOSED (v2.2)'
  };
  if (SH.mara && SH.mara.facts.indexOf('{name} is the MELLA and is bonded to a KAW named Veyru, a Rainroot Lynx') < 0) SH.mara.facts.push('{name} is the MELLA and is bonded to a KAW named Veyru, a Rainroot Lynx');
  G.veyru = {
    open: { morning: ['Veyru stretches in the morning light and pads up to {name}.', 'Veyru yawns, then bumps its head against {name}\'s hand.'],
            day: ['Veyru trots up beside {name}, ears forward.', 'Veyru circles {name} once and sits, tail curled.'],
            evening: ['Veyru\'s eyes glow softly in the evening light as it stays close to {name}.', 'Veyru pads close, slow and calm in the evening.'] },
    obs: { tired: ['It nudges {name} toward home. Time to rest.', 'It lies down and looks at {name}: rest first.'],
           none: ['Its ears turn toward the Corner Store, then toward the skate park.', 'It sniffs the air, waiting to see where {name} goes.'],
           some: ['It gives a pleased chirp. {doneList} done today.'], allDone: ['It rolls in the grass, content. Everything is done today.'],
           sikee: ['Its fur bristles when it looks toward the Arena.'], water: ['It looks around for clean water.'] },
    sug: { next: ['It looks toward {nextName}.'] },
    mem: ['It remembers when {name} said "{last}".'],
    choices: function (s) { var nx = s.energy < 20 ? 'sleep' : (s.next || 'job'); return [{ label: 'Scratch behind its ears.', effect: { type: 'rel_up' } }, { label: 'Where should we go?', effect: { type: 'hint', value: nx } }, { label: 'Come on, Veyru.', effect: { type: 'none' } }]; },
    reply: { hint: ['Veyru trots toward {hintName} and looks back.'], rel_up: ['Veyru purrs and leans into {name}.', 'Veyru chirps happily.'], none: ['Veyru falls in step beside {name}.'], rel_down: ['Veyru flattens its ears.'], remember: ['Veyru blinks slowly.'] }
  };
  var ACT = { job: 'the Corner Store', skate: 'the skate park', football: 'the Training Facility', arena: 'the Arena', sleep: 'home' };
  function hash(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function rng(seed) { var a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) >>> 0; var t = a; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function pick(r, a) { return a[Math.floor(r() * a.length)]; }
  function fill(t, s, x) { return t.replace(/\{(\w+)\}/g, function (_, k) { if (x && k in x) return x[k]; if (k === 'nextName') return ACT[s.next] || 'the Corner Store'; if (k === 'doneList') return s.done.join(', ').replace(/^./, function (c) { return c.toUpperCase(); }); return s[k] != null ? s[k] : ''; }); }
  var off = llm.offline;
  llm.offline = function (npc, opts) {
    if (npc !== 'veyru') return off.apply(this, arguments);
    opts = opts || {}; var g = G.veyru, s = llm.state(npc), mem = llm.memory(npc), r = rng(hash('veyru|' + s.day + '|' + mem.length + '|' + (opts.choice || '')));
    if (opts.mode === 'reply') { var ef = (opts.effect && opts.effect.type) || 'none'; return { line: fill(pick(r, g.reply[ef] || g.reply.none), s, { hintName: ACT[opts.effect && opts.effect.value] || 'the path ahead' }), choices: [], mood: '', source: 'offline' }; }
    var h = parseInt(s.clock, 10), tod = h < 11 ? 'morning' : h < 18 ? 'day' : 'evening', O = g.obs, parts = [fill(pick(r, g.open[tod]), s)];
    if (s.energy < 20) parts.push(fill(pick(r, O.tired), s)); else if (s.done.length >= 4) parts.push(pick(r, O.allDone)); else if (s.done.length) parts.push(fill(pick(r, O.some), s)); else parts.push(fill(pick(r, O.none), s));
    if (s.droneBeaten && !s.sikeeDefeated && r() < .4) parts.push(pick(r, O.sikee)); else if (s.next && s.energy >= 20) parts.push(fill(pick(r, g.sug.next), s));
    var last = mem.length && mem[mem.length - 1].chose; if (last && r() < .5) parts.splice(1, 0, fill(pick(r, g.mem), s, { last: last }));
    var line = parts.join(' '); if (line.length > 200) line = parts.slice(0, 2).join(' ');
    var v = llm.validate({ line: line, choices: g.choices(s) }, npc); return Object.assign(v.data, { source: 'offline' });
  };
  window.YOUR_V22_LLM = { version: 'v2.2', sheets: ['veyru'], disabled: ['mella'] };
})();
