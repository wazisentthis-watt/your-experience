# YOUR v1.2.1 · PROPOSAL_HOLD (PUBLISH HOLD) — report

Built 2026-11-14, around 12:58 PM EST, in a new copy (`your-build-v121`). v1.2 and every earlier zip, `claude-v42/43/44`, `team-packs` and all originals are untouched. Nothing was pushed, deployed or published.

## What changed vs v1.2
| area | change |
|---|---|
| art | ChatGPT 24 RUN_JUMP (1774×887), 25 CLIMB_DASH_SLIDE (1774×887), 26 FLY (1536×1024) and 27 SWIM_SPECIAL (1536×1024) are synced as slots `hero_run_jump`, `hero_climb_dash`, `hero_fly` and `hero_swim_special`. White is keyed out, and grid lines are wiped on 24 and 25. |
| hero sheet | 16×7 → **16×11 @96**. Body scale is fixed: 24 run frames = 88 px body, and 26/27 share one scale. Effects such as aura and trails are cropped at the cell edge rather than shrinking the body. |
| hero sheet layout | Row 7 faces right; row 8 is its mirror (left): run 0–3, jump crouch/rise/apex/land 4–7, dash 8–9, slide 10, roll 11, climb ladder 12–13, climb wall 14–15. |
| | Row 9 faces right; row 10 is its mirror (left): takeoff 0, hover 1, fly diagonal 2, fly side 3, **fly up 4, fly down 5, fly right 6–7** (26 row 2), swim side 8–9, swim dive 10–11, power-up 12–13, slam 14, spin 15. |
| flight label | Sheet 26 row 2 is a **4-direction flight (front / back / side angles), NOT true top-down**. Both of its side frames face right, so left = mirror. Up and down are not mirrored. The label is shown in the game HUD while flying, in the code header and in the sheet meta. |
| world: sprint | Hold B (K / gamepad B) while moving for ×1.7 speed (PROPOSED). The first 0.2 s shows dash burst/streak (25), then the run cycle (24) left/right. Up/down keep the walk frames. |
| world: flight | F (gamepad RB) toggles flight at ×1.45 (PROPOSED). The sequence is jump crouch 0.12 s (24) → takeoff (26) → hover/4-dir flight, with a 24 px hover, bob and ground shadow. F again lands, using the 24 land frame. Collisions stay on, so flight goes over roads, not buildings. Doors say "Land first (F) to go inside". |
| arena | The B dash now draws 25 dash frames instead of the cast stand-in. The arena has no jump mechanic, so none was added. |
| not wired | Climb, slide, roll, swim, power-up, slam and spin are in the sheet and anims (`modules/your_v121.js`) but no YOUR mechanic uses them yet. Touch has no fly button yet. |
| unchanged | Energy, pay, stats, FaFiFi fairness and football / Elemental Gridiron logic (the claude-v44 originals check: 528 files unchanged). |
| files | `modules/your_v121.js` (new overlay), `your_input.js` (KeyF/RB → fly), `your_v1_activities.js` (arena dash anim + label), `your_config_v11.js` (rows 11), `your_art.js` (slots 24–27), `tools/sync_chatgpt_art.py`, `tools/make_hero.py`, `game/index.html` (title, script). |

## QA (headless Chromium, `file://`, all http(s) aborted, fetch stubbed)
| suite | result |
|---|---|
| v1.2.1 e2e (`qa/run_v121_e2e.js`) | **145/145 pass**: every v1.2 check (133) plus 12 new move checks. Console errors 0, external requests 0, 54 screenshots (`qa/screenshots_v121/`). |
| New move checks | Rows 7–10 filled and 21 anims defined; flight label text present; sprint ratio 1.70 with dash → run; left sprint uses mirrored row 8; F → crouch → takeoff → hover; fly up/down/left/right frames; doors blocked while flying (door present); land frame and back to idle; door works after landing; flight resets on re-entering the world; arena dash frames. |
| B01–B15 regression (`qa/run_qa.js`) | **94/94 pass**; static scan ok. |
| API key | No key in any shipped file. Settings live only in localStorage; QA makes no real network calls. |

New screenshots: `06c_world_hero_sprint_run`, `06d_world_hero_sprint_left`, `06e_world_hero_fly_up`, `06f_world_hero_fly_down`, `06g_world_hero_fly_left`, `06h_world_hero_hover`, `24b_arena_hero_dash_native`.

## Open items
- GRIND still reuses the crouch frame, and down/up cast reuse the 3/4 frames. Prompts for both are in `HERO_ART_BATCHES.md` batch 1.
- Flight art is not true top-down (labelled). If true overhead flight is wanted, it needs a new sheet.
- Numbers marked PROPOSED (sprint ×1.7, fly ×1.45, timings) are not owner-confirmed.
- Elemental Gridiron: badge-only integration, logic untouched.
