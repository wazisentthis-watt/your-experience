# Y.O.U.R. Savannah Mission Pack 02: live episode layer

**Release path:** the studio owner explicitly authorized merged-and-live incremental features. This file describes additions to the preexisting Mission Pack 01. Nothing here silently changes old mission completion rules, story canon, character artwork, or core save data.

## Player experience

Open https://wazisentthis-watt.github.io/your-experience/ > FREE LIFE > DO > MISSIONS. Accept one of the original four missions and return to the city. A teal location marker points toward the current real-world objective. It tracks the camera and stays pinned at the screen edge for off-screen destinations. Visit the site or use the original powers to complete objectives. Original Mission Pack 01 progress logic remains unchanged.

As the player accepts a mission or completes a stage, a short, dismissible in-game **radio dialogue** appears. New story-radio lines are **PROPOSAL / in-game original WIR writing**, not previously verified canon. They use existing WIR names (Mara, Dex, Coach Flo, Mella, Veyru, METAL). Veyru communication is represented as nonverbal behavior, not invented human speech. This is scripted text, **not** an NPC conversation tree, cutscene voiceover, or LLM service.

During **GHOST SWEEP**, the board now has **Launch Ghost Sweep encounter**. This launches two actual machine actors through the existing YOUR_V23.spawn interface, one loader and one lifter. Enemies use existing authored definitions, combat movement, hit detection, and isolation counters. The board and phone close before combat. The encounter refuses to launch in another city, on an obstructed street, during an active raid/site/boss, while working, or if live enemies are already nearby. Spawn positions come from a BFS over the published Savannah blocked-tile grid, validated for reachability and separation. No new art or enemy definitions are imported. Existing **Start existing raid** remains an alternative.

## Source changes

- Only **one new script tag** appended at bottom of root index.html.
- `your/missions/wir_mission_episodes.js` self-contained add-on; reads existing hero profile and mission state, and uses existing city camera and V23 combat APIs. No modifications to existing mission board file or save schema.
- `your/missions/tests/wir_mission_episodes.test.cjs` 23 focused source/logic tests.
- `your/missions/PACK02_README.md` this document.

## Verification / known limitations

- 23/23 focused tests passed in V8 with Node-compatible test/assert shims. Verified mission events, camera projection and arrows, spawn BFS, no duplicate combat spawns, safe failure rollback.
- Simulated DOM UI smoke passed for mount, encounter button, two actors, and closing phone/mission overlays. These are not a substitute for physical iPhone, controller, or actual running browser tests.
- Stage dialogue is short text-only radio, no new voice recording. Marker exists only for visit objectives, not power counter stages or combat enemies.
- All map objectives and combat events require the existing game to have initialized. The original mission engine saves progress and badges.
- Release safety: rollback by removing the single new script tag. Old mission progress remains intact. Do not claim new original animation cells or verified dialogue canon.

## Playtest checklist

1. Start FREE LIFE and accept STREET WATCH; a teal objective marker should track the actual Market entrance and switch to Field/Gym when each visit registers.
2. Start VEYRU SIGNAL; the marker should lead to the park, then disappear after park visit while the CALM objective remains on the existing HUD.
3. Start GHOST SWEEP in Savannah; select Launch Ghost Sweep encounter; verify **two** live machines spawn only in clear walkable spaces, and existing powers can isolate them.
4. Try launching during a raid or in another city; the board should refuse with an explanation.
5. Verify accepting a mission, stage completion, and mission-clear trigger the proper radio text exactly once. Reload the game; previously completed missions and partial stages should still be saved, without replaying old dialogue.
6. Verify phone, Mella Movement Trial, football, touch controls, Bluetooth gamepad, and saved profile still work.

Next sprint suggestion: full in-world NPC conversations and quest-specific staged enemy wave logic with authored cinematics, once actual browser QA confirms this additive release.
