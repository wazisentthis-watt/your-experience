/* Y.O.U.R. controls map · SteelSeries Nimbus-safe gamepad layout (data only, no DOM).
   Indices are the W3C "standard" Gamepad API ones:
     0 A · 1 B · 2 X · 3 Y · 4 L1 · 5 R1 · 6 L2 · 7 R2 · 8 Back/View · 9 Menu/Start · 10 L3 · 11 R3
     12 D-pad up · 13 D-pad down · 14 D-pad left · 15 D-pad right · 16 Home.
   Rules this map follows (tests/controls.test.cjs checks them):
     - nothing needs R3 (11), Home (16) or Back (8): the Nimbus has no R3, the original Nimbus has no Back,
       and Home is usually kept by the OS. Back still works as an extra where a pad has it.
     - inside one context no two actions share a button (a button + its own hold is one move, listed once).
     - chords are L1 + a button. While L1 is held the chord buttons never fire their plain action,
       and L1 alone does nothing in the world.
   "legacy" = the index the older layers (index.html pollPad, v20, v22 MC.pad) already listen to, so the
   controls layer feeds them a remapped pad instead of editing their files. */
(function (root) {
  'use strict';
  var NAMES = ['A', 'B', 'X', 'Y', 'L1', 'R1', 'L2', 'R2', 'Back', 'Menu', 'L3', 'R3', 'D-pad up', 'D-pad down', 'D-pad left', 'D-pad right', 'Home'];
  var AVOID = [11, 16, 8];           // never required (R3, Home, Back)
  var MOD = 4;                       // L1 = hold modifier in the world
  // legacy listeners in the older layers (what each legacy index does in the world, no menu open)
  var LEGACY_WORLD = { 0: 'interact', 1: 'dash · sprint (hold)', 2: 'phone Do tab', 3: 'next ride', 4: 'ROOT (v22)', 5: 'fly (v20)', 6: 'CORE (v22)', 7: 'blast (v22)',
    9: 'phone', 11: 'transform (v22)', 12: 'calm Veyru (v22)', 13: 'jump (v22)', 14: 'hit (v22)', 15: 'CROWN (v22)' };

  var CONTEXTS = {
    world: { title: 'Walking, riding, Living District and raids', actions: [
      { id: 'interact', label: 'Talk / use / open', btn: 0, legacy: 0 },
      { id: 'dash', label: 'Dash (tap) · sprint (hold)', btn: 1, legacy: 1 },
      { id: 'hit', label: 'Hit', btn: 2, legacy: 14 },
      { id: 'jump', label: 'Jump', btn: 3, legacy: 13 },
      { id: 'transform', label: 'Transform (Living Refraction)', btn: 5, legacy: 11 },
      { id: 'calm', label: 'Calm Veyru', btn: 6, legacy: 12 },
      { id: 'blast', label: 'Blast', btn: 7, legacy: 7 },
      { id: 'phone', label: 'Phone', btn: 9, legacy: 9 },
      { id: 'fly', label: 'Fly on / off', btn: 10, legacy: 5 },
      { id: 'core', label: 'CORE', btn: 12, legacy: 6 },
      { id: 'ride', label: 'Next ride (feet / board / car)', btn: 13, legacy: 3 },
      { id: 'root', label: 'ROOT', btn: 14, legacy: 4 },
      { id: 'crown', label: 'CROWN', btn: 15, legacy: 15 },
      { id: 'slot4', label: '★4 custom power', chord: [MOD, 2], call: 'slot0' },
      { id: 'slot5', label: '★5 custom power', chord: [MOD, 3], call: 'slot1' },
      { id: 'fly2', label: 'Fly on / off (for pads without L3)', chord: [MOD, 1], legacy: 5 },
      { id: 'doTab', label: 'Phone · Do tab', chord: [MOD, 9], legacy: 2 },
      { id: 'help', label: 'This controller map', chord: [MOD, 0], call: 'help' }
    ], stick: 'Left stick: walk / steer' },
    menu: { title: 'Phone, sheets, Power Forge, title screen', actions: [
      { id: 'ok', label: 'Confirm / press', btn: 0, legacy: 0 },
      { id: 'back', label: 'Back / close', btn: 1, legacy: 1 },
      { id: 'doTab', label: 'Do tab', btn: 2, legacy: 2 },
      { id: 'tabL', label: 'Phone tab left', btn: 4, legacy: 4 },
      { id: 'tabR', label: 'Phone tab right', btn: 5, legacy: 5 },
      { id: 'phone', label: 'Close phone', btn: 9, legacy: 9 },
      { id: 'up', label: 'Move up', btn: 12, legacy: 12 },
      { id: 'down', label: 'Move down', btn: 13, legacy: 13 },
      { id: 'left', label: 'Move up (left)', btn: 14, legacy: 14 },
      { id: 'right', label: 'Move down (right)', btn: 15, legacy: 15 }
    ], stick: 'Left stick up / down: move focus' },
    fight: { title: 'SIKEE street fight', actions: [
      { id: 'strike', label: 'Punch', btn: 2, call: 'skStrike' },
      { id: 'dodge', label: 'Dodge', btn: 1, call: 'skDodge' },
      { id: 'blast', label: 'Blast', btn: 7, call: 'skBlast' },
      { id: 'mella', label: 'Mella on / off', btn: 6, call: 'skMella' },
      { id: 'run', label: 'Run away', btn: 3, call: 'skRun' }
    ], stick: 'Everything else is off during the fight (no phone, powers or rides leak in)' },
    lab: { title: 'Practice labs (RIFFT, CCR)', actions: [
      { id: 'end', label: 'End session', btn: 9, legacy: 8 }
    ], stick: 'The lab game reads the pad itself' },
    football: { title: 'Football practice', actions: [
      { id: 'leave', label: 'Leave practice (hold 1.2 s)', btn: 9, hold: 1200, call: 'fbLeave' },
      { id: 'ask', label: 'Ask for a play (was R3)', btn: 10, frame: 11 }
    ], stick: 'Everything else is the football engine\'s own layout (its own REMAP CONTROLLER screen). Tap Menu = its pause.' },
    minigame: { title: 'Mini-games', actions: [], stick: 'Mini-games read A, B, X, Y and the D-pad directly (unchanged)' },
    activity: { title: 'Y.O.U.R. activities', actions: [], stick: 'Activity frames use A, B, X, Y, R1 fly, Menu pause, D-pad (unchanged, no R3)' }
  };

  function buttonsOf(a) { return a.chord ? [] : [a.btn]; }
  function chordKey(a) { return a.chord ? a.chord.join('+') : null; }
  function label(i) { return NAMES[i] || ('button ' + i); }
  function describe(a) { return a.chord ? a.chord.map(label).join(' + ') : (label(a.btn) + (a.hold ? ' (hold)' : '')); }
  // physical -> legacy table for one context (chords excluded)
  function table(ctx) { var t = {}; (CONTEXTS[ctx] || { actions: [] }).actions.forEach(function (a) { if (!a.chord && a.legacy != null) t[a.btn] = a.legacy; }); return t; }
  function conflicts() {
    var out = [];
    Object.keys(CONTEXTS).forEach(function (c) { var seen = {}, chords = {};
      CONTEXTS[c].actions.forEach(function (a) {
        buttonsOf(a).forEach(function (b) { if (seen[b]) out.push(c + ': ' + label(b) + ' = ' + seen[b] + ' and ' + a.id); seen[b] = a.id; });
        var k = chordKey(a); if (k) { if (chords[k]) out.push(c + ': chord ' + k + ' twice'); chords[k] = a.id; if (seen[a.chord[0]]) out.push(c + ': modifier ' + label(a.chord[0]) + ' also has ' + seen[a.chord[0]]); }
        var used = a.chord ? a.chord : [a.btn]; used.forEach(function (b) { if (AVOID.indexOf(b) >= 0) out.push(c + ': ' + a.id + ' needs ' + label(b)); });
      });
      CONTEXTS[c].actions.forEach(function (a) { if (a.chord && seen[a.chord[0]]) out.push(c + ': ' + a.id + ' modifier collides'); });
      var legacyUsed = {}; CONTEXTS[c].actions.forEach(function (a) { if (a.legacy == null || a.chord) return; if (legacyUsed[a.legacy] != null) out.push(c + ': legacy ' + a.legacy + ' fed twice'); legacyUsed[a.legacy] = a.id; });
    });
    return out;
  }
  function legend(ctx) { var C = CONTEXTS[ctx]; return C ? C.actions.map(function (a) { return { id: a.id, label: a.label, pad: describe(a) }; }) : []; }
  function padFor(ctx, id) { var a = (CONTEXTS[ctx] || { actions: [] }).actions.find(function (x) { return x.id === id; }); return a ? describe(a) : ''; }

  var MAP = { version: 1, NAMES: NAMES, AVOID: AVOID, MOD: MOD, CONTEXTS: CONTEXTS, LEGACY_WORLD: LEGACY_WORLD,
    label: label, describe: describe, table: table, conflicts: conflicts, legend: legend, padFor: padFor,
    // the order the setup screen asks for buttons on a pad without the "standard" mapping
    SETUP: [0, 1, 2, 3, 4, 5, 6, 7, 9, 12, 13, 14, 15, 10],
    OPTIONAL: [10] };
  root.YOUR_CONTROLS_MAP = MAP;
  if (typeof module !== 'undefined' && module.exports) module.exports = MAP;
})(typeof window !== 'undefined' ? window : globalThis);
