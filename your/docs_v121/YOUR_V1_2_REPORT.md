# Y.O.U.R. v1.2: native hero skate, KO and cast frames · PROPOSAL_HOLD (PUBLISH HOLD)
Built 2026-11-14, about 12:45 PM EST. Owner message pt62u ("Next").

**Hold rules**
- No push, deploy or publish.
- v1.2 lives in `your-build-v12/`, a copy of v1.1. The v1 and v1.1 builds and zips, the originals, `claude-v42/43/44` and `team-packs` were not touched.
- Elemental Gridiron logic was not edited.

## 1. What changed from v1.1
| area | v1.2 |
|---|---|
| **New art** | **22_OWNER_STARTER_SKATE_SHEET.png** (1774×887, 2×4: push, push, cruise, crouch / ollie, air, land, bail; sha256 e65a063d9a1acae1…) and **23_OWNER_STARTER_KO_CAST_SHEET.png** (2172×724, 8 frames: knockback, fall, down, get up, cast windup, cast release, energy blast, recover; sha256 0c80a917dcda377e…) |
| **Keying** (`tools/sync_chatgpt_art.py`) | Slots 22 `hero_skate` and 23 `hero_ko_cast`. For 22, the faint grey grid lines are painted white before keying. Then the hero white, shadow and enclosed-gap removal runs. |
| **Slicing** (`tools/make_hero.py`) | **22:** equal 2×4 cells, inset 10 px; motion ticks under 5 % of the main blob area are dropped. **23:** 8 largest blobs = bodies; effect blobs (orbs, swirl, blast) join the body with the nearest bbox edge (≤ 40 px). One scale per sheet: skate = body + board at 1.12 × the 88 px body height; KO/cast = the standing frames at 88 px. Feet/wheels baseline is 4 px from the cell bottom. |
| **Sheet layout** | Unchanged 16×7 @96, so every renderer still works. **Row 6 (skate):** 0 cruise (RIDE), 1 push, 2 crouch, 3 ollie, 4 air (KICKFLIP), 5 crouch reused (GRIND, since 22 has no grind frame), 6 bail, 7 push2, 8 land, 15 get-up (from 23). **Rows 4/5:** cast 9–12 = windup, release, energy blast (effect clipped at the cell edge, body scale kept), recover; KO 13–15 = knockback, fall, down. Row 5 = mirror. **Rows 0–3 cast cols 12–15:** 23 cast frames (3/4 view reused for down/up, mirrored for left). |
| **Renderer** (`your_v1_activities.js`) | Skate uses native poses. PUSH alternates push / push2 at 6 fps, LAND = land. The separate RIFFT board is no longer drawn (the frames include the board), except during KICKFLIP, where it spins under the air frame. On-screen labels now say the frames are native. |
| **FALLBACK left** | Only two items: GRIND reuses the crouch frame, and the down/up cast directions reuse the 3/4 cast frames (`assets/hero/HERO_SHEET.json` → `fallback`). |

## 2. QA (Playwright, file://, all http(s) aborted, fetch stubbed, no real network)
| suite | result |
|---|---|
| v1.2 e2e (`qa/run_v12_e2e.js`) | **133/133 pass** · console errors 0 · external requests 0 · 280 local requests · 48 screenshots (`qa/screenshots_v12/`) |
| B01–B15 regression (`qa/run_qa.js`) | **94/94 pass**; static scan ok |
| fairness audit | job / skate / arena × 200 seeds × 3 d values: all ok |
| key leak scan | clean |

**New checks:**
- art slots 18–23 loaded
- native frames present: skate land and push2, KO down, get-up, cast blast, mirrored left cast
- skate `skateNative` flag set

**New screenshots:**
- `13c_skate_hero_ollie_native`, `13d_skate_hero_bail_native`
- `24b_arena_hero_cast_native`, `24c_arena_hero_ko_native`

**QA note:** in v1.1's `24_arena_sikee_strike`, the hero stood 30 px from SIKEE (the test pins him there), so he was mostly hidden. The v1.2 shots 24b/24c move him 170 px aside, so the native frames are visible.

## 3. Open items
1. **EG:** the hero is still a badge only. A playable hero QB needs an EG data/logic edit, which needs approval.
2. **Frames:** GRIND has no dedicated frame (crouch reused). A ChatGPT grind frame (50-50 on a rail) would complete row 6, and the prompt is in `HERO_ART_BATCHES.md`.
3. **Leftovers from v1.1:** a tiny white speck on the left-idle walk frames; Mella's voice and the assist numbers are PROPOSED; arena rivals only watch; 04/05 tiles are unused.
