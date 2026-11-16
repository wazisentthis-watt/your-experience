# Y.O.U.R. v2.2 · PROPOSAL_HOLD · CHANGELOG

## 2026-11-16 · v2.2 proposal build: you are the MELLA; Veyru (KAW) is your sidekick

Times are America/New_York. Built from a copy of the v2.1 build. Nothing was pushed, deployed or published. v2.1 and all originals are unchanged (sha256 checked in QA).

Owner decisions: "you are the Mella with powers no side kick but you do have KAW" (t70u). KAW pick: **Veyru** (2026-11-16).

- `your/v22/your_v22_config.js`: every kit number is tagged V7 (copied from *The First Wish · Mella V7*), NIMBUS (labels from `wir_mella_combat.js`), KAWR3 (KAW master) or PROPOSED.
- `your/v22/your_v22.js` (Valence layer):
  - The Mella follower is off (`YOUR_V20.mella.vis = false`). Her v2.0 code stays in the file, unused.
  - The hero gets the V7 kit: jump, dash, hit, blast, calm, transform (Living Refraction), and ROOT / CORE / CROWN with the 12 s circuit. A MELLA HUD shows energy, stamina and CCR stability.
  - Keys: Q, Shift/K press, J, L, C, T, 1/2/3. Gamepad: D-pad, B, RT, R3, LB, LT. Touch: MELLA button with an 8-button power pad.
  - Veyru follows on every map using the temporary 64 px frames. Left is mirrored. Up and down show the side view and are labelled as placeholders.
  - E or a tap opens Veyru: an offline or LLM narration, 3 choices, and a Calm button.
  - Bond and the KAW choice are saved to the Valence save and to `wir_hero_profile.kaw`.
  - The phone Y.O.U.R. tab has "You are the MELLA" and "Your KAW: Veyru" blocks. Mella text in the activity rows and on the title screen is reworded.
- `your/v22/your_v22_llm.js`: the Mella sheet is switched off and a Veyru sheet is added (KAW narration; the creature never speaks words). Mara learns that the hero is the MELLA. SIKEE and Dex are unchanged.
- `your/v22/your_v22_runner.js`: the v1.1 companion assists (job spotter, skate line caller, one protect_bond per run) are drawn and labelled as Veyru. The rules are unchanged.
- `your/modules/wir_hero_profile.js` v1.2: optional `kaw` field, still `wir.hero/1`. The schema addendum is in `your/docs_v121/HERO_PROFILE_SCHEMA.md`.
- `tools/build_v22.py`: runs the v2.1 build, then adds the v2.2 script tags, the runner overlay, two guarded hooks in `your_v20.js` (hero frame and jump lift), and the football phone fix.
- **Fix (v2.1 known issue 2):** the phone pocket drill no longer opens on PAUSED.
  - Cause: about 0.4 s after a drill command, Valence calls `FB.frame.focus()`. The resulting blur reached the engine's `autoPause()` before the v2.0 guard.
  - Fix: for 5 s after a bridge command, auto-pause on focus loss is skipped while the player hasn't touched the frame.
- QA: `qa/run_v22_qa.js`. Screenshots are in `qa/screenshots_v22/`. Regression results are in `V22_REPORT.md`.

# Y.O.U.R. v2.1 · PROPOSAL_HOLD · CHANGELOG

## 2026-11-15 · v2.1 proposal build: the owner hero is playable on the Elemental Gridiron field

Times are America/New_York. Built from a copy of the v2.0 build. Nothing was pushed, deployed or published. v2.0 and all originals are unchanged (sha256 checked in QA).
Owner request: "Yes, make you playable on the field" (2026-11-15). The owner approved changes to EG game logic for this.

- `your/v21/your_v21_config.js`: football settings. New numbers are marked PROPOSED. `cast` lists where to swap the follower (Mella → KAW) and the hero's powers in the next pass; it is documentation only.
- `your/v21/hero_football.js`: reads `wir_hero_profile` and writes `games.football` to it: drills, games, wins, TDs, xp → level, and `football:*` unlocks.
- `your/v21/your_v21.js` (Valence): every football command carries the hero (look, name, position, level). The Y.O.U.R. tab has a Football block with level, record and a Free Life position chooser (default QB). Testimony keeps its own chooser, which is now preselected from the hero profile. Results are recorded to the profile.
- `your/v21/eg_hero.js` (football.html):
  - The hero is drawn from the owner sheet with football poses mapped from existing frames. Stand-ins are labelled in the HUD chip.
  - The team colour is applied to the hero's teal kit.
  - The name tag "HERO · POS" shows on the field, with a HUD chip.
  - Control locks to the hero's slot.
  - Opened standalone, football.html writes progress itself.
  - Fix: when a game ended during a TD celebration, the celebration pad covered BACK TO YOUR DAY.
- `tools/build_v21.py`: runs the v2.0 build and then the v2.1 patches. Each patch must match exactly once. One patch adds an early catcher for the Valence command in football.html, because the hero was missed when the command arrived before `eg_hero.js` finished loading.
- `FOOTBALL_HERO_ART_PROMPTS.md`: ChatGPT prompts for the 9 football poses that have only stand-in art for now.
- QA: `qa/run_v21_qa.js` passed 75/75. The v2.0 suite on v2.1 passed 136/136. The v1.2.1 e2e passed 145/145 and builds B01–B15 passed 94/94.

# Y.O.U.R. v2.0 · PROPOSAL_HOLD · CHANGELOG

All times are America/New_York. Nothing was pushed, deployed or published, and the originals were not modified (sha256 checked in QA).

## 2026-11-15 · v2.0 proposal build

### Step 0 · Baseline (local git f39e2ce, never pushed)

- Copied the Valence Life v3 unpacked tree (Drive 1FryE_BltNvTqYamkpiIfyLYMsFssnFIC) and the Y.O.U.R. v1.2.1 tree, which lives under `your/`. The v1.2.1 docs moved to `your/docs_v121/`.
- Removed for IP:
  - `art/[excluded]_*.webp` (7 files).
  - `games/stayonpage.html` and `games/sop/`: "WIR KI WAR ([excluded IP] style)", which also featured [excluded IP].

### Step 1 · `tools/build_v20.py` (regenerates the patched pages from the untouched original)

**index.html**

- Local fonts (`fonts/fonts.css`, OFL) replace Google Fonts.
- The 6 claude.ai artifact links were removed. The online tab text says that multiplayer is off offline.
- Silicon hero name "[excluded IP]" → "Silicon". The Silicon NPC was renamed and its hero art set to null.
- The Stay On Page lab was removed from LABS. The NeonGlazed BrawlScape building now has no lab action.
- Loads `wir_hero_profile.js`, the v2.0 config, the LLM shim, `your_llm.js` and `your_v20.js`.
- Install hook added before boot. It exposes Valence internals to the merge layer through getters/setters, so no game logic is copied.

**football.html** (bridge copy only, EG game logic untouched)

- Local fonts.
- BRIDGE_FIX: the embedded drill no longer opens on the engine's PAUSED menu. Cause: on a bridge command, the iframe got a focus hand-off `blur` about 0.2 s later, which triggered `autoPause()`. The fix ignores that blur for 1.5 s after a bridge command and closes a PAUSED screen that appeared without user input.
- BRIDGE_FIX_GAMEPAD: when opened from file://, Chromium's permissions policy blocks `navigator.getGamepads()` in the iframe and it throws. The guard returns no pads instead, so keyboard and touch keep working.
- [excluded IP] legend art and display name removed: 9 legends remain. The card is named "Silicon" and its internal id is `silicon` in the public repo.

**Runner page**

- `your/game/v20_runner.html` is generated from the v1.2.1 `game/index.html` with a v2.0 boot script.

### Step 2 · Merge layer `your/v20/your_v20.js`

- **Player body:** the owner hero sprite (`hero_sheet_96`) is always the player at home, in the city, on the board, in the Valence Rifft skate mini-game and in all Y.O.U.R. activities.
- **Character creator:** kept as a cosmetic option, and its preview shows the owner hero. The default name is "Hero", editable in Y.O.U.R. → Settings and shared through `wir_hero_profile` (`wir.hero/1`).
- **Mella:** follows on a trail (gap 1.25 tiles). Pressing E with nothing else nearby talks to her.
- **Sprint:** Shift, K, gamepad B or touch, ×1.7, with a dash into run frames.
- **Fly:** F, gamepad RB or touch, ×1.45. Take-off, hover and land frames. Outdoors only, and you must land before using a door.
- **Mara and Dex:** added as Savannah NPCs.
  - The v1.2.1 dialogue runs through `your_llm.js`. The player picks the provider (offline, OpenAI, Anthropic, Ollama, WebLLM). The key is kept in localStorage only. Invalid or failed replies fall back to offline lines.
  - The Valence bond actions are kept on the same sheet.
- **SIKEE (Authority Form):**
  - Hidden until after your first Y.O.U.R. activity, then waits by the Corner Gym.
  - Dialogue → challenge (only after the drone) → boss intro (art 17) → fight (art 14–16 sheets) → result.
- **Corner Store shift** (Sahelatrix Market, 5 crates / 90 s / $45) and **Arena Training Drone** (Corner Gym, $60):
  - The v1.2.1 activities run unmodified in an iframe overlay with FaFiFi rules.
  - Pay goes through Valence `payroll()` (FICA withheld). The Valence clock and needs advance through `fastAct`.
- **Y.O.U.R. skate run** added at the park. The Valence Rifft session, the dock job and the scored job mini-games are kept.
- **Y.O.U.R. day log:**
  - Today's earnings and activities are recorded, with a recap on each new Valence day. The job is once per day.
  - Valence tax, bank and housing are unchanged.
- **Art:**
  - Title: ChatGPT 21 cover, with ChatGPT 01 selectable.
  - Menus: 02.
  - Store banner: 06. Drone banner: 10. Hub: 12. Sleep banner: 13.
  - Portraits: Mara 08, Dex 09, SIKEE 14.
- **Y.O.U.R. phone tab:** story, today, activity buttons and settings (hero name, export/import, AI provider/base/model/key, test/clear, title art). Y.O.U.R. buttons are also added to Phone → Do.

### Step 3 · QA

- `qa/run_v20_qa.js` passes 136/136 across desktop, phone portrait, phone landscape, file:// and static checks.
- The v1.2.1 regression passes inside this copy: e2e 145/145, builds B01–B15 94/94.
