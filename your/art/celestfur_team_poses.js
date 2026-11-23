/* CelestFur whole-team football kit for the Elemental Gridiron field. PROPOSAL_HOLD.
   Drafted by the hook subagent for owner / coordinator review. DO NOT SHIP until the
   atlases + celestfur.json exist at your/assets/football/celestfur/ (cut step, running
   in parallel) and the football.html hook change in celestfur_hook_note.md is applied.

   Art: the 29 CelestFur squad strips (manifest ~/workspace/celestfur-squad-living/
   manifest.json), cut into three 96 px-cell atlases, one row per positional strip,
   all facing right (the engine mirrors for left), body height matched to the hero
   sheet:
     your/assets/football/celestfur/celestfur_run_96.webp       (11 rows, roster order)
     your/assets/football/celestfur/celestfur_celebrate_96.webp (11 rows, roster order)
     your/assets/football/celestfur/celestfur_block_96.webp     (7 rows, block order)
   Row order is the manifest roster order below; the block atlas has only the 7
   strips that exist (QB/RB/WRs have no block strips), so it carries its own row map.

   Pattern: modelled on your/art/eg_hero_poses.js. Loaded LAST, after
   your/art/eg_hero_poses.js. It wraps the engine's hdFrame once more: when the
   entity is an offensive player of a CelestFur team and the engine's pose has
   native team-kit art, only the image is swapped (same pose, same timing, same
   on-field size). Pose choice, timing, views and every rule stay the engine's.
   Front/back views keep the engine frame; the hero keeps the hero sheet.
   If an atlas fails to load nothing changes.

   NO RECOLOUR, deliberately. The engine default (config teamRecolor:true) recolours
   teal-hue pixels (hue 150-200, sat >= .35, v >= .22) to the team colours c1/c2.
   CelestFur art is white/gold/lavender with almost no teal-hue pixels, and the
   white/gold kit IS the identity — running cell() with the recolour pass would
   tint the lavender/gold the moment any pixel fell in the teal band. So this
   wrapper crops only, never touches pixel data, and ignores C.teamRecolor.
   (eg_hero_poses.js / eg_hero.js cell() recolour because the hero kit is drawn
   teal-on-purpose; the CelestFur kit is not.)

   SLOT MAPPING (verified against football.html at main, NOT invented):
   The engine has NO e.pos field. Entities carry e.role, set in buildEnts()
   (lines 1533-1535): 'QB','RB','WR0','WR1','WR2','TE','OL0'..'OL4' on offence,
   'DL0'..'DBn' on defence. OFF_SLOTS (line 1493) is QB,RB,WR,WR,WR,TE,OLx5.
   The kit's 11 positional strips map onto the 11 offensive slots:
     QB->qb-01  RB->rb-07  WR0->wr-11  WR1->wr-84  TE->te-88
     OL0->ol-55 OL1->ol-66 OL2->ol-77 OL3->ol-60  OL4->ol-72
     WR2->flex-33   <-- DECISION: no FLEX role exists in the engine; OFF_SLOTS has
     three WR slots and the kit has two WR strips + one Flex strip, so Flex-33
     takes the third receiver slot. If the commissioner rules otherwise, change
     this one line. The strip's jersey number is baked into the art, so OL3
     always renders "60" etc. — that is inherent to positional strips.
   Defence has no CelestFur strips: a CelestFur team on defence keeps engine art.

   POSE MAPPING (f.nm comes from hdName, football.html line 3511):
     run, carry, carryIdle        -> run atlas
     td1, td2, dunk, hype, backflip, moonwalk, worm -> celebrate atlas
     block                        -> block atlas (only the 7 slots that have one)
     everything else (juke, spin, truck, stiff, hurdle, fall, getup, power, kick,
     idle, ready, hit, dive, catchHigh, catchLow, throwWind, throwRel, throwFollow,
     kneel, helmetoff)            -> falls through untouched.
   BLOCK REACHABILITY CAVEAT (verified): hdName() as read at main has NO branch
   that returns 'block' — HDM.leg block:29 and the B1M line/lb block entries exist,
   but no engine path currently produces nm 'block' from hdFrame, so the block
   mapping is wired and will fire the moment any engine path does produce it; it
   changes nothing today. This is NOT inventing a pose: 'block' is an engine pose
   name in the B1M/B1G/HDM role maps, the hero POSE table has a block entry, and
   the CelestFur block strips exist. Do not "fix" hdName in this PR.

   !!! KNOWN-BAD FRAME — DO NOT REDRAW HERE, DO NOT USE !!!
   Flex-33 celebrate frame 5 (cell index 4) is the WRONG CHARACTER entirely
   (white/green/brown Orun Vale-style outfit, no wings, no gold CelestFur helmet
   — manifest verdict "weak", top redraw candidate). The wrapper cycles Flex-33
   celebrate frames over [1,2,3,4,6] only (indices [0,1,2,3,5]) and counts every
   skip in CELESTFUR.skippedBadFrame. Remove this skip only when the strip is
   redrawn and the manifest says so.

   DEVIATION FROM eg_hero_poses.js (deliberate, read before "fixing"): that file
   only ever sees hero frames (heroFrame returns sx:0, sy:0), so it can swap f.img
   without touching f.sx/f.sy. This wrapper sees ENGINE frames: leg-sheet players
   arrive with sx=(ix%8)*96, sy=floor(ix/8)*96. A swapped 96x96 cell canvas MUST
   be drawn from 0,0, so the wrapper resets f.sx=0 and f.sy=0 on every swap.
   f.s (on-field size: HD_SZ.leg 28 / oct 25) is left alone so kit players draw
   at exactly the same size as everyone else. f.nf is left alone: the kit faces
   right and the engine mirrors for left, same as the hero sheet.
*/
(function () {
  'use strict';
  var V = window.__V21;
  if (!V || !V.POSE || typeof hdFrame !== 'function') return;
  if (typeof TEAMS === 'undefined' || typeof G === 'undefined') return;

  var BASE = 'your/assets/football/celestfur/';
  var SRC = {
    run: BASE + 'celestfur_run_96.webp',
    celebrate: BASE + 'celestfur_celebrate_96.webp',
    block: BASE + 'celestfur_block_96.webp'
  };

  /* Roster order = manifest order. Run/celebrate atlases: one row per strip. */
  var STRIPS = ['qb-01', 'rb-07', 'wr-11', 'wr-84', 'te-88',
                'ol-55', 'ol-66', 'ol-77', 'ol-60', 'ol-72', 'flex-33'];
  var ROW = {};
  STRIPS.forEach(function (id, i) { ROW[id] = i; });

  /* e.role (buildEnts, football.html lines 1533-1535) -> positional strip. */
  var ROLE_TO_STRIP = {
    QB: 'qb-01', RB: 'rb-07',
    WR0: 'wr-11', WR1: 'wr-84', WR2: 'flex-33', /* WR2->flex-33: see header */
    TE: 'te-88',
    OL0: 'ol-55', OL1: 'ol-66', OL2: 'ol-77', OL3: 'ol-60', OL4: 'ol-72'
  };

  /* Block atlas: only the 7 strips in the manifest's block list, in that order. */
  var BLOCK_ROW = { 'te-88': 0, 'ol-55': 1, 'ol-66': 2, 'ol-77': 3,
                    'ol-60': 4, 'ol-72': 5, 'flex-33': 6 };

  /* Frame counts, copied from ~/workspace/celestfur-squad-living/manifest.json
     (data, not invented). Everything is 6 except ol-60 / ol-72 block, which are 5. */
  var FRAMES = {
    run:       { 'qb-01': 6, 'rb-07': 6, 'wr-11': 6, 'wr-84': 6, 'te-88': 6,
                 'ol-55': 6, 'ol-66': 6, 'ol-77': 6, 'ol-60': 6, 'ol-72': 6, 'flex-33': 6 },
    celebrate: { 'qb-01': 6, 'rb-07': 6, 'wr-11': 6, 'wr-84': 6, 'te-88': 6,
                 'ol-55': 6, 'ol-66': 6, 'ol-77': 6, 'ol-60': 6, 'ol-72': 6, 'flex-33': 6 },
    block:     { 'te-88': 6, 'ol-55': 6, 'ol-66': 6, 'ol-77': 6,
                 'ol-60': 5, 'ol-72': 5, 'flex-33': 6 }
  };

  /* Engine pose name (f.nm, from hdName) -> kit atlas. Poses not listed here
     fall through to the engine frame untouched. */
  var POSE_TO_ATLAS = {
    run: 'run', carry: 'run', carryIdle: 'run',
    td1: 'celebrate', td2: 'celebrate', dunk: 'celebrate', hype: 'celebrate',
    backflip: 'celebrate', moonwalk: 'celebrate', worm: 'celebrate',
    block: 'block'
  };

  /* !!! KNOWN-BAD FRAME: flex-33 celebrate frame 5 (index 4) is the wrong
     character (Orun Vale-style, no wings, no CelestFur helmet). Cycle over
     frames 1,2,3,4,6 only. See header. !!! */
  var FLEX33_CELEBRATE_OK = [0, 1, 2, 3, 5];

  var CF = window.CELESTFUR = {
    src: SRC, ready: { run: false, celebrate: false, block: false },
    drawn: {}, skippedBadFrame: 0, fallthrough: {}
  };

  var imgs = {};
  Object.keys(SRC).forEach(function (action) {
    var im = new Image();
    im.onload = function () { CF.ready[action] = true; };
    /* No onerror handler needed: ready stays false and the wrapper falls
       through to the engine frame, exactly as if the kit did not exist. */
    im.src = SRC[action];
    imgs[action] = im;
  });

  /* A team is CelestFur when its team object carries the sheet field (the
     hook — see celestfur_hook_note.md), OR, as a fallback that needs no engine
     change, when its name is the CelestFur team name. applyUniform() uppercases
     t.name, so match both casings. The sheet field is authoritative; the name
     fallback exists so the kit works before any ELEM_TEAMS entry is ruled on. */
  function isCelestFurTeam(tm) {
    if (!tm) return false;
    if (tm.sheet === 'celestfur') return true;
    var n = String(tm.name || '');
    return n === 'CelestFur HaloHustlers' || n === 'CELESTFUR HALOHUSTLERS';
  }

  var cache = {};
  function cell(action, row, col) {
    /* Crop only — NO recolour pass (see header: the kit is white/gold/lavender
       and its colours are the identity). Cache key has no team colours in it. */
    var key = action + ',' + row + ',' + col;
    if (cache[key]) return cache[key];
    var cv = document.createElement('canvas');
    cv.width = cv.height = 96;
    var g = cv.getContext('2d');
    g.drawImage(imgs[action], col * 96, row * 96, 96, 96, 0, 0, 96, 96);
    return cache[key] = cv;
  }

  var _hd = hdFrame;
  hdFrame = function (e, sp, down) {
    var f = _hd.apply(this, arguments);
    try {
      if (!f || f.hero) return f;                    /* hero keeps the hero sheet */
      if (!e || e.side !== 'O') return f;           /* kit is offence-only */
      var tm = TEAMS[e.team];
      if (!isCelestFurTeam(tm)) return f;
      var strip = ROLE_TO_STRIP[e.role];
      if (!strip) return f;                         /* DL/LB/DB/K roles: no strips */
      var action = POSE_TO_ATLAS[f.nm];
      if (!action || !CF.ready[action]) return f;   /* unmapped pose, or atlas missing */
      var count = FRAMES[action][strip];
      if (!count) return f;                         /* e.g. QB/RB/WR have no block strip */
      var row = action === 'block' ? BLOCK_ROW[strip] : ROW[strip];
      if (row === undefined) return f;

      /* Same clocks as eg_hero.js heroFrame: run/carry ride e.anim, idle rides
         G.t*3, everything else rides G.t*6. */
      var t = (f.nm === 'run' || f.nm === 'carry') ? e.anim * 1.6
            : f.nm === 'carryIdle' ? G.t * 3 : G.t * 6;
      var col;
      if (strip === 'flex-33' && action === 'celebrate') {
        /* !!! Skip known-bad frame 5 (index 4) — wrong character. !!! */
        col = FLEX33_CELEBRATE_OK[((Math.floor(t) % 5) + 5) % 5];
        CF.skippedBadFrame++;
      } else {
        col = ((Math.floor(t) % count) + count) % count;
      }
      f.img = cell(action, row, col);
      f.sx = 0; f.sy = 0;   /* REQUIRED: cell canvas is 96x96, drawn from 0,0.
                               Engine leg-sheet frames arrive with non-zero sx/sy;
                               eg_hero_poses.js never needs this because it only
                               ever sees hero frames (sx=sy=0). */
      f.native = true;
      CF.drawn[f.nm] = (CF.drawn[f.nm] || 0) + 1;
    } catch (err) { /* never break the frame: fall through to the engine result */ }
    return f;
  };
})();
