/* Y.O.U.R. v2.1 config · PROPOSAL_HOLD (PUBLISH HOLD). Owner approved EG game-logic changes for "make you playable on the field" (2026-11-15).
   PROPOSED = new in v2.1, not an owner-approved value. Loaded by index.html (Valence) and football.html (Elemental Gridiron). */
window.YOUR_V21_CONFIG = {
  version: 'v2.1', status: 'PROPOSAL_HOLD',
  football: {
    defaultPos: 'QB',                       // owner request: default QB; Testimony keeps its own position chooser (preselected from the hero profile)
    positions: ['QB', 'WR', 'RB', 'DB', 'LB'],   // the engine's own playable career positions (unchanged)
    sheet: 'your/assets/hero/hero_sheet_96.png', portrait: 'your/assets/hero/hero_portrait_256.png',
    spriteSize: 31,                         // PROPOSED on-field draw size (engine legends draw at 28)
    teamRecolor: true,                      // PROPOSED: the hero's teal kit pixels take the team's jersey colour (c1), trim keeps c2
    nameTag: true,                          // name over the hero on the field + HUD chip
    standaloneHero: true,                   // PROPOSED: football.html opened on its own uses the hero for the "my player" card when a hero profile exists
    lockControlToHero: true,                // PROPOSED: outside Testimony too, you control the hero's slot (not only the QB)
    // progress written to wir_hero_profile games.football (all PROPOSED)
    xp: { drillPerScore: 0.1, game: 20, win: 10, td: 5, scrimmage: 10 },
    xpPerLevel: 100,                        // PROPOSED football level = 1 + floor(xp / 100)
    levelBoost: { every: 3, cap: 2 },       // PROPOSED Free Life only: +1 speed/agility/power per 3 football levels, max +2 (Testimony uses its own numbers)
    unlocks: ['football:first_drill', 'football:first_game', 'football:first_win', 'football:first_td']
  },
  // NEXT-PASS SWAP POINTS (documentation only, nothing reads this yet). Owner design note 2026-11-15: the hero HAS Mella's powers;
  // the sidekick is "KAW" (still being researched). This pass does NOT remove Mella or add KAW.
  cast: {
    follower: { now: 'mella', next: 'KAW (TBD)', where: ['your/v20/your_v20_config.js mella{gap,snap,label} + sprite.mella', 'your/v20/your_v20.js SHEETS.mella / mellaFace',
      'your/v20/your_v20.js mella state / stepMella / placeMella / drawMella / MELLA pseudo-NPC (hitObj, interactNear, openNpc)',
      'your/modules/your_config_v11.js C.companion', 'your/modules/your_v11.js companion in the world + talk + job spotter + skate line caller',
      'your/modules/your_llm.js dialogue sheet "mella"'] },
    heroPowers: { from: 'mella', where: ['your/modules/your_v11.js job assist (spotter) + skate assist (line caller, one Dependency cancel) — move to the hero',
      'your/modules/your_config_v11.js C.companion.assist text'], football: 'none yet: the hero uses the engine card (Free Life bonus = football level only)' }
  }
};
