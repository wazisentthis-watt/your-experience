# Y.O.U.R. v2.1 · PROPOSAL_HOLD · Report

**PUBLISH HOLD is on.** Nothing was pushed, deployed or published. The build was made from a copy of v2.0 (`your-build-v21/`); v2.0 and every original are unchanged, and QA checks their sha256 (47 files).
Times are America/New_York. The QA runs took place on 2026-11-15, roughly 3:40–3:55 PM EST.

## What changed: the owner hero plays on the Elemental Gridiron field

- **Who you play.** In Valence (Free Life and Testimony) the football "my player" card is the owner hero:
  - drills, the combine and tryout use the engine's `rookie` card;
  - live reps, scrimmages and games use `myplayer`.
  
  So every rule, stat, position slot and control path is the engine's own. Opened on its own, `football.html` also uses the hero when a hero profile exists.
- **Art.** Only the owner hero sheet is used: ChatGPT art 18–27 plus the run, jump and dash frames, in 96 px cells. Engine poses map to existing frames:
  - run / walk: rows 0, 1 and 7;
  - juke / dash, spin / roll, hurdle / jump, fall, get-up, block and kick: rows 4 and 7;
  - celebrations: power-up, row 9.

  **Stand-ins** are clearly marked and use the closest existing frame. They are throw (fight windup/punch), stance, carry (ball not drawn), catch, tackle, dive, TD celebration, kneel and helmet-off. The HUD chip shows "pose X: stand-in art" in pink, and `__V21.standin` counts them. ChatGPT prompts for real art are in `FOOTBALL_HERO_ART_PROMPTS.md`.
- **Jersey and team colours.** The engine's team colours are kept. The hero's teal kit pixels are recoloured to the team jersey colour (c1), and dark teal goes to the trim colour (c2). This is PROPOSED.
- **Name.** "HERO · QB" appears over the hero on the field, and a HUD chip shows the portrait, name, position and YOU/TEAMMATE/DEF.
- **Position.** Defaults to QB.
  - Free Life: a chooser on the phone Y.O.U.R. tab (QB/WR/RB/DB/LB), saved to Valence and to `wir_hero_profile`.
  - Testimony: the existing chooser is kept and preselected from the hero profile.
  - Control is locked to the hero's slot outside Testimony as well (PROPOSED).
- **Stats.**
  - Testimony uses its own numbers, unchanged.
  - Free Life uses the engine's position base plus a PROPOSED football-level bonus: +1 speed/agility/power per 3 levels, maximum +2.
- **Progress to `wir_hero_profile`** (`games.football`) persists across games and reloads:
  - drills (best, last, count);
  - games, wins, losses, ties, scrimmages, yards, TDs, completions and passes;
  - xp → level;
  - unlocks `football:first_drill`, `first_game`, `first_win` and `first_td`.
- **Fixes found in QA:**
  - When a game ended during a TD celebration, the celebration pad covered BACK TO YOUR DAY.
  - The hero could be missed when Valence's command arrived before `eg_hero.js` had loaded. An early command catcher in football.html fixes this.

## QA (headless Chromium / Playwright, local server, zero outside requests)

| Suite | Result |
|---|---|
| v2.1 hero football (`qa/run_v21_qa.js`): desktop Free Life, Testimony, phone portrait, phone landscape, static/IP | **75/75** |
| v2.0 suite re-run on v2.1 (`V20_PORT=18921 node qa/run_v20_qa.js`) | **136/136** |
| v1.2.1 e2e regression (`your/qa/run_v121_e2e.js`) | **145/145** (console errors 0, outside requests 0) |
| v1.2.1 builds B01–B15 (`your/qa/run_qa.js`) | **94/94**, static OK |

The v2.1 checks cover:
- hero visible and controllable in a drill (keyboard and thumb stick) and in a game;
- drag-to-throw, with throw poses drawn;
- the run in for a TD, with 6 on the scoreboard;
- final screen YOU WIN, then BACK TO YOUR DAY, then the Valence game report "Win 6–0";
- profile progress and unlocks;
- the WR position in a scrimmage;
- persistence across a reload;
- standalone football.html reading the profile;
- Testimony combine and locked game at QB;
- phone HIKE and throw;
- zero page and console errors, zero outside requests;
- no [excluded IP] display name or art, and no [excluded IP] content.

Screenshots: `qa/screenshots_v21/` (18) and `qa/v21_contact_sheet.png`. Hero on the field: `05_game_presnap_hero_qb.png` and `07_game_hero_touchdown.png`.

## PROPOSED numbers (in `your/v21/your_v21_config.js`)

- spriteSize 31 (engine legends draw at 28);
- teamRecolor;
- standaloneHero;
- lockControlToHero;
- xp: drill score × 0.1, game 20, win 10, TD 5, scrimmage 10;
- 100 xp per level;
- Free Life level bonus +1 per 3 levels, maximum +2.

## Known issues / owner review

1. **Stand-in poses (9 groups).** Throw, stance, ball carry, catch, tackle, dive, TD celebration, kneel and helmet-off have no football art yet. They use the closest existing frame and are labelled. The ball is not drawn in the hero's hand. Prompts are in `FOOTBALL_HERO_ART_PROMPTS.md`.
2. **Phone drill opens paused.** On the phone viewports the pocket drill sometimes opened on the engine's PAUSED menu (window-blur auto-pause; the v2.0 bridge fix does not catch every case). Tapping RESUME continues. QA did this and logged it twice. This is not fixed in v2.1.
3. **QA shortcuts.** For speed, QA spotted the ball at the 3-yard line before the TD run and forced the clock to Q4 0:00 for the final. The run, the throw and the scoring themselves were real input.
4. **One hero card.** The hero is your team's "my player" card only, never an opponent. Outside Testimony, control is locked to his slot.
5. **Recolour heuristic.** The recolour is a hue-range heuristic (teal 150–200°). Other teal details on the sprite could take the jersey colour.
6. **Internal ids.** The engine card that displays as "Silicon" uses the internal id `silicon` in the public repo; leg3 remains internal only. No [excluded IP] name or art is shown.
7. **Not addressed (not part of this pass).** Owner message: "make sure that Wishborn is connect in all of the metal games, because I want you to be able to go into Morrow City with metal". Nothing was done for Wishborn or Morrow City.

## Mella / KAW (design note from the owner, 2026-11-15)

The owner says the hero HAS Mella's powers, and the sidekick is "KAW", not Mella. Per the instructions, this pass neither removes Mella nor adds KAW. Football has no Mella code.

The swap points are listed in `YOUR_V21_CONFIG.cast` (documentation only). Here is where they live.

**The Mella follower (v2.0 Valence city):**
- `your/v20/your_v20_config.js`:
  - `mella: { gap, snap, label }` (PROPOSED follow distance);
  - `sprite.mella`.
- `your/v20/your_v20.js`:
  - `SHEETS.mella` / `mellaFace` (line ~15);
  - the `mella` state object (~41);
  - Mella drawing in `P.draw` (~90) and `drawMella` (~115);
  - `stepMella` (~139) and `placeMella` (~149), hooked into `enterMap` and newGame/continue (~153, ~312);
  - the `MELLA` pseudo-NPC with `hitObj`, the interact override and the Mella sheet in `openNpc` (~210–231, `V.MELLA` ~256).

**Mella in the v1.2.1 modules:**
- `your/modules/your_config_v11.js`: `C.companion` (id, sheet, follow numbers, assist text).
- `your/modules/your_v11.js`: companion in the world (lines 17–39), talk with X (40–41).
- `your/modules/your_llm.js`: the dialogue sheet `mella`.
- `your/modules/your_config_v1.js` / `your_v1_activities.js`: Mella sheet definitions (v1 main-character legacy).

**Mella's abilities (to move to the hero next pass):**
- `your/modules/your_v11.js` **job assist "spotter"** (lines 42–50): highlights the next correct shelf slot.
- `your/modules/your_v11.js` **skate assist "line caller"** (lines 51–59): points to the next ring and cancels one Dependency per run.
- The hero's own movement powers (fly, sprint, dash) are already the hero's, in `your/v20/your_v20.js` (`mv`, ~74–134).

## Files

- `your/v21/`: `your_v21_config.js`, `hero_football.js`, `your_v21.js`, `eg_hero.js`
- `tools/build_v21.py`, which regenerates index.html and football.html from the originals through the v2.0 build
- `qa/run_v21_qa.js`, `qa/qa_v21_results.json`, `qa/screenshots_v21/`, `qa/v21_contact_sheet.png`
- `FOOTBALL_HERO_ART_PROMPTS.md`, `CHANGELOG.md` (v2.1 section), `ASSET_SOURCES.csv` (hero sheet and portrait notes; no new art)
