# WIR Y.O.U.R. Savannah Mission Board, Mission Pack 01

**User-facing:** in the live Y.O.U.R. Experience, choose FREE LIFE > tap DO (Phone) > tap MISSIONS. Select one of four missions and return to the real city. The board is additive and does not replace the existing first story route, raids, Mella actions, profile, or football.

## Four missions and real completion checks

1. **STREET WATCH** (Exploration): walk to the Sahelatrix Market, Gridiron Bolt Field, and Sahelatrix Corner Gym **entrance waypoints in Savannah**, any order. Uses actual `window.__VL.G.map`, `G.px/py` and built city object `.use` coordinates; no virtual/pretend checkboxes.
2. **VEYRU SIGNAL** (Companion): enter Savannah skate park and successfully use CALM near Veyru. Reads the real `YOUR_V22.P.uses.calm` counter after acceptance.
3. **THREE-LAYER CIRCUIT** (Powers): visit Sahelatrix Corner Gym then complete ROOT → CORE → CROWN within the game’s existing CCR chain window. Reads `YOUR_V22.P.uses.circuit` after acceptance, rather than granting a fake power.
4. **GHOST SWEEP** (Combat): isolate **two new** METAL ghost machines in the city, using the existing v2.3 combat/raid system. Reads live `YOUR_V23.rec().isolated` totals from real combat records. The mission board exposes a **Start existing raid** control only while on Savannah map.

All quests are **one active at a time**. In-game Mission HUD tracks current steps. Completing one unlocks a permanent achievement `your:mission_<id>` in the existing `wir.hero/1` profile and writes mission history to `games.your_missions.data`. There are **no money awards**, new enemy types, or unverified art. Completed quests remain clear after reload, and partial visit steps are saved. On session restart, successful CALM/circuit actions must occur again if their objective was unfinished; ghost isolation totals remain cumulative.

## Files and integration

- `your/missions/wir_mission_board.js` is a new optional overlay and self-contained quest state engine.
- `your/missions/tests/wir_mission_board.test.cjs` checks mission state transitions, map targeting, actual counters, reload, and one-time badge preservation.
- One new bottom-of-body script tag in root `index.html` is the **only** edit to existing files.
- All existing files in Valence, V20–V24, Mella trial, hero assets, save schema, controllers, and combat remain byte-identical.

## Tests and release verification

Run `node --test your/missions/tests/wir_mission_board.test.cjs` (21 focused tests). Before merge: isolated V8 logic suite passed 21/21 using a node-assert/test compatibility shim, and a simulated DOM mount/phone button/HUD smoke test passed. These are **not full physical-browser, iPhone, or gamepad tests**. After merge, check GitHub Pages deployment success for the exact commit.

## Limitations / what not to claim

- This is **four mission structures built around existing live game actions**, not four new cinematic boss fights or new NPC dialogue scenes.
- World objective waypoints use the existing Savannah map and map objects, not 3D travel or an external navigation service.
- Raid starts from current city location, unchanged rules. If the user is in HOME/another city, they must return to Savannah.
- Rights/canon: only existing original WIR content. New narrative labels are proposals now made playable by user release instruction; no older canon overwritten.

## Rollback

Remove only `<script src="your/missions/wir_mission_board.js"></script>` from root `index.html`. Existing `games.your_missions` optional save field can safely remain and does not invalidate older readers.

Follow-up: mission locations as visible map pins, real dialogues, richer stage objectives, mission-driven NPC and enemy spawn groups, payouts only after reviewed economy integration.
