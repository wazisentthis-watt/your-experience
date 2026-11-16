# YOUR v1 — integrated build (B16) · PROPOSAL_HOLD · PUBLISH HOLD
Built on the box in `/workspace/game-recovery/your-build/` (Sat Nov 14 2026, ~10:30 EST).
- Nothing was pushed, deployed, published or uploaded.
- No originals were modified: `claude-v42/`, `claude-v43/`, `claude-v44/` and `team-packs/` are untouched. EG v44 was copied, and QA re-hashed 528 originals: all unchanged.
- The B01–B15 package `YOUR_B01_B15_PROPOSAL_HOLD.zip` is kept as it was.

**Play:** `game/index.html` (offline over file://).
**QA:** `node qa/run_v1_e2e.js` (v1) and `node qa/run_qa.js` (B01–B15 regression).

## What the owner asked for (t56u + steering) and what was built
| # | Ask | Built |
|---|---|---|
| 1 | Mella is the main character | Player sheet `assets/mella/mella_sheet_96.png` (16×7 @96), built from the Third Door atlas and frames.<br>Rows 0–3 are idle/walk/cast in 4 directions (left idle/walk mirror east because the source west frames are duplicates; west cast is native). Rows 4–5 are fight (idle, strike, block, hit, cast, KO) and row 6 is skate (ride, push, crouch, ollie, kickflip, grind, bail). Rows 4–6 are **FALLBACK** transforms of Mella frames and are labelled as such in-game and in `assets/SHEETS.json`.<br>Walk, skate and fight all go through the B04 SpriteSheet animator. |
| 2 | FaFiFi for job, skate and arena, "you decide with good algorithms" | **OWNER-DELEGATED DESIGN v1**: EWMA performance → bounded rubber band d ∈ [0.82, 1.18] → seeded rejection-sampled roads at the approved clocks → shared logistic completion model → seeded fairness audit (passes at 3 × 200 seeds × 3 d values). The 4 roles are mapped in all 3 activities; the Reality slider is in Settings. Formulas: `FAFIFI_ACTIVITIES.md`. |
| 3 | Good AI dialogue with an LLM | `modules/your_llm.js` + `your_dialogue_v1.js`. Details below. |
| 4 | Keep the numbers | All approved PROPOSED numbers are kept: pay, costs, 90 s / 45 s clocks, Reality gate 75. |
| 5 | Football through Elemental Gridiron | `football/eg44/` is a copy of `claude-v44/build`. The copied `index.html` gets one bridge script (`your_bridge_child.js`); it is inert unless the page opens with `#your-bridge`. The game launches in an iframe over the Y.O.U.R. canvas. Details below. B10 stays as "Practice drill (fallback)". |
| 6 | Screens + images via ChatGPT | Title, main menu, settings (incl. LLM provider setup), credits, pause, results, home, season board (hub), journal, town map, sleep/day-end, field menu, arena menu and SIKEE boss intro.<br>All 17 ChatGPT images are wired through `assets/chatgpt/manifest.js` (slots in `modules/your_art.js`), and every slot falls back to a drawn placeholder (QA screenshots 35–36 show the no-art fallback). |
| 7 | End-to-end Playwright QA | 103/103 checks, 0 console errors, 0 external requests, 36 screenshots. Details below. |
| S1 | SIKEE (Authority Form) as main villain | Owner sheet cut into 8 transparent reference PNGs (`assets/sikee/ref/`).<br>Derived 16×6 @96 in-game sheet (`assets/sikee/sikee_sheet_96.png`, "derived from owner art"): 4-direction idle/walk with procedural bob and robe sway, plus fight idle/strike/block/hit/cast/KO.<br>ChatGPT 15/16 are preferred when present (they are), and the derived sheet is the fallback. Story and boss details below. |
| S2 | All 17 ChatGPT images | White keyed out for 05, 07–11 and 14–16.<br>Sliced: 07 into 6 props, 10 into drone front/side, 11 into 2 rivals, 15 into a 4×4 walk sheet (384×384), 16 into an 8-frame combat strip (768×96).<br>Mara = 08, Dex = 09, drone = 10, arena rivals = 11 (spectators), 12 hub, 13 sleep, 14 SIKEE portrait, 17 boss intro.<br>All appear in the QA screenshots. |

### LLM dialogue (ask 3)
- **Providers:** OpenAI-compatible, Anthropic, Ollama (local) or WebLLM (`window.YOUR_WEBLLM_ENGINE`), plus `registerProvider` for others. The player chooses one in Settings → Dialogue AI (provider, base URL, model, key, Test, Save, Clear key).
- **Key handling:** the key is stored only in localStorage (`your-llm-settings`). QA confirms no key string exists in any shipped file and none is in the save.
- **Prompts** are built from the character sheet (Mara, Dex, SIKEE), live game state (day, clock, energy, money, done, next season part, relationship, story flags) and per-NPC memory (last 6 talks).
- **Strict JSON schema:** one line ≤ 220 chars plus 2–3 choices of ≤ 48 chars each, with a whitelisted effect: none, rel_up, rel_down, hint(job|skate|football|arena|sleep), remember(≤ 60 chars), or challenge (SIKEE only, and only after the drone is beaten). The validator also applies a blocklist, strips URLs and markdown, and times out after 15 s. Effects can never touch money, energy or XP.
- **Offline fallback:** a deterministic, state-aware grammar. It is used when the provider is set to offline or when a reply is invalid or fails.
- **First meetings:** the verbatim Y.O.U.R. first lines of Mara and Dex are kept. The `[TODO choice]` placeholders are gone.

### Football bridge (ask 5)
- **In:** profile (name, lvl, pow, spd), difficulty from the season (hub speedFor → EG diff 0/1/2), active buff and seed.
- **Out:** score, win/tie, team names and stats → `day.complete('football')` (approved $50 + XP, season win) or `day.fail`, plus a journal entry `eg_game`. Energy is spent on launch (approved cost 20).
- Inside EG, the "Sim to final" and "Back to Y.O.U.R." buttons are added by the bridge script only.

### SIKEE story and boss (steering 1)
- **Story beats (PROPOSED):**
  1. After Mella's first finished activity of a day, SIKEE stands by the Arena door. Talking to him uses the LLM or offline sheet: calm, authoritative, menacing; no lore beyond "Authority Form".
  2. Beating the training drone unlocks "Face SIKEE" and his whitelisted *challenge* choice.
  3. Boss intro (ChatGPT 17) with his line, then the boss fight under FaFiFi arena rules.
  4. His reply line appears on the results screen.
- **Boss numbers (PROPOSED v1):** hp 160, chase +10.5 px/s, damage ×1.15.

## Day loop (B16)
1. Title → menu (New / Continue / Settings / Credits) → world as Mella (Mara and Dex wander, SIKEE appears after beat 1).
2. Door → activity: Corner Store job, skate park, Training Facility (EG or B10 practice) or Arena (drone / SIKEE).
3. Results screen (pay, money, energy, FaFiFi equity / route / Perfect 30 / d, season line) → back at the same door.
4. The clock runs only in the world. Each finished activity advances it **60 game-minutes (PROPOSED v1)**.
5. Home: Sleep / Season board / Town map / Journal / Save / Settings / Leave.
6. Sleep, midnight or 0 energy → day-end screen (earned today, what was done, next season match) → next day at 06:00 with stats restored and the save written.
7. Pause (Esc) in world and activities: Resume / Save / Quit to title. The pause key is ignored on menu screens.
8. Continue restores day, money, story, memory, clock and position.

## QA (headless Chromium, file://, offline)
- **v1 e2e `qa/run_v1_e2e.js`: 103/103 passed, 0 console errors, 0 external requests** (248 file requests). `fetch` is stubbed and all http(s) is aborted at the context.

| Group | Checks |
|---|---|
| screens | 18 |
| world + dialogue | 12 |
| job | 6 |
| SIKEE world | 2 |
| skate | 4 |
| football (EG bridge, a real EG v44 game simulated to the final inside the iframe) | 8 |
| arena | 4 |
| SIKEE boss | 7 |
| hub + home | 7 |
| sleep | 3 |
| save/load | 5 |
| unit: llm (schema, length limits, whitelist, challenge gating, reply mode, request building for OpenAI/Anthropic/Ollama, parsers, SIKEE sheet) | 14 |
| unit: key storage | 2 |
| unit: FaFiFi audit + band | 2 |
| unit: art + sheets | 6 |
| unit: EG originals | 1 |
| global | 2 |

- LLM coverage: the mocked provider (`mock`) is used for an LLM line. A URL injected by the mock is stripped, and a `give_money` effect is neutralised. An invalid mock reply triggers the offline fallback. In the settings form, Test with network disabled reports failure; the call was blocked and recorded, so no real network call was made.
- **B01–B15 regression `qa/run_qa.js`: 94/94, 0 console errors, 0 external requests; static checks OK** (headers, flagged assets, IP names, URLs). Re-run after the v1 changes, including the `your_character.js` scale change.
- The static URL check now allows only the three default provider endpoint strings, which are never requested unless the player configures a provider.
- Screenshots in `qa/screenshots_v1/`:
  - 01 title (ChatGPT 01), 02 menu (02), 03–04 settings + LLM form, 05 credits
  - 06 world Mella, 07 Mara (08 portrait, offline), 08 Dex (09 portrait, mock LLM)
  - 09–11 job (06 store, 07 crates/shelves, 03 panel), 12 SIKEE in world (14 portrait)
  - 13–14 skate, 15 field menu, 16 EG v44 in the iframe, 17 EG results, 18 B10 practice
  - 19–21 arena menus, 20 drone (10) with rivals (11)
  - 22 boss intro (17), 23–25 SIKEE windup/strike/KO (16), 26 SIKEE results
  - 27 home (13), 28 season board (12), 29 town map (04), 30 pause, 31 journal
  - 32–33 day end, 34 Continue
  - 35–36 placeholder fallback with no art

## Fixes found during QA
- **EG bridge sim:** v44 declares `G` with top-level `let`, so `window.G` is undefined. The bridge now checks `typeof G`, and during the sim it clears the v40 huddle (`G.hs`), which otherwise waits for human input at presnap.
- **Reality before New Game:** the setting chosen before a profile exists is now carried into the new profile.
- **LLM state before a profile exists:** guarded, so Test works from the title menu.
- **Journal "talk" rows:** they now show the relationship change.
- **Day-end text:** it now wraps.

## Open items (PROPOSED / needs owner)
1. **EG buff:** the season buff is sent to EG but not applied inside EG (that would need edits to EG logic).
2. **EG play mode:** the player can play a full EG game in the iframe or use "Sim to final"; QA uses the sim. EG's own menus and settings remain reachable inside the iframe.
3. **ChatGPT 04 / 05:** 04 (town map) is shown on the Town map screen; 05 (tileset) is keyed but not mapped to the world tile collision grid, so the world still uses the B05 drawn tiles.
4. **PROPOSED v1 numbers:** clock +60 min per activity; SIKEE hp 160, chase +10.5 px/s, ×1.15 damage; all FaFiFi parameters (α 0.3, K 0.6, band ±0.18, ρ₀ 0.34/0.25, β 4, TOL 0.05, +120 ms / +2 energy, +180 ms window). These need calibration in playtests.
5. **SIKEE text:** all of it (sheet, offline lines, story beats) is PROPOSED. No lore was added beyond "Authority Form".
6. **Mella art:** fight and skate poses are FALLBACK transforms. A real sheet (like SIKEE 15/16) can be dropped in later.
7. **Arena rivals (ChatGPT 11):** they are only spectators; there are no rival fights yet.
8. **LLM default model ids** (gpt-4o-mini, claude-3-5-haiku-latest, llama3.2) are editable in Settings. Calling Anthropic directly from a browser needs its browser-access header (set); some providers may block browser CORS, in which case the offline fallback is used.
9. **Menu panel art:** ChatGPT 03 is drawn 9-slice; its inner frame lines show under menu buttons. This is cosmetic and can be tuned once final art is chosen.
