# YOUR — v1.2.1 build · PROPOSAL_HOLD (PUBLISH HOLD)
**v1.2.1:**
- Hero base moves from ChatGPT 24–27 (run/jump, climb/dash/slide/roll, fly, swim/power-up/slam/spin) are in the hero sheet. The sheet is now 16×11 @96 (rows 7–10; `tools/make_hero.py`).
- World: **hold B (K)** to sprint (×1.7, PROPOSED). The first 0.2 s shows the dash burst (25), then the run cycle (24).
- World: **F (gamepad RB)** toggles flight (×1.45, PROPOSED): jump crouch (24) → takeoff (26) → **4-direction flight (26 row 2: front / back / side angles, NOT true top-down; left = mirror)**. Idle shows hover. Press F again to land (24 land frame). Doors need landing first.
- Arena: the B dash uses the 25 dash frames.
- Climb, slide, roll, swim, power-up, slam and spin are sheet + anims only; no YOUR mechanic uses them yet.
- No energy, pay or stat changes. Touch has no fly button yet (keyboard F / gamepad RB only).
- QA: `node qa/run_v121_e2e.js` → `qa/qa_v121_results.json`, `qa/screenshots_v121/`; B regression `node qa/run_qa.js`.
- Also included: `HERO_SPRITE_MASTER_PLAN_v2.md/.csv` (play-verified), `HERO_ART_BATCHES.md`, `docs/play-verify/VERIFIED.json`.
- Full notes: `YOUR_V1_2_1_REPORT.md`.

**v1.2:**
- Native hero skate (ChatGPT 22) and KO / cast (ChatGPT 23) frames replace the FALLBACK transforms.
- QA (v1.2): 133/133. That runner is superseded by `qa/run_v121_e2e.js`, which keeps every v1.2 check.
- Full notes: `YOUR_V1_2_REPORT.md`.

**v1.1:**
- The owner hero (ChatGPT 18/19/20) is the player in every scene, and Mella is the companion.
- Talk to Mella with X (L key). She gives a spotter assist in the job and a line-caller assist in skate.
- The hero name defaults to the placeholder "Hero". Change it in Settings → Hero, which also does export/import.
- The shared profile is `modules/wir_hero_profile.js` (see `HERO_PROFILE_SCHEMA.md`).
- The cover (21) is the default title art. Switch with Settings → Title art, or open Menu → Cover.
- The cross-game plan is `HERO_SPRITE_MASTER_PLAN.md` / `.csv`.
- Rebuild the hero sheet with `python3 tools/sync_chatgpt_art.py && python3 tools/make_hero.py`.
- Full notes: `YOUR_V1_1_REPORT.md`.

**Play:** open `game/index.html` (file:// works offline). Controls: WASD/arrows to move, J/Enter = A, K = B, L = X, I = Y (journal), Esc/P = pause; gamepad and touch work too. Mouse clicks work on menus.
Plain canvas 2D, offline, no CDN. Shared modules are in `modules/` (namespace `window.YOUR`).
- B01–B15 test pages are in `tests/Bxx_test.html` (`node qa/run_qa.js` → `qa/qa_results.json`, `qa/screenshots/`).
- Football is the Elemental Gridiron v44 **copy** in `football/eg44/`, launched through the postMessage bridge. Original hashes are in `football/EG44_ORIGINAL_SHA256.txt`.
- ChatGPT art: drop images into `your-art/chatgpt/` and run `python3 tools/sync_chatgpt_art.py`. Any slot without an image falls back to a drawn placeholder.
- Dialogue AI: Settings → Dialogue AI. The key is stored in this browser's localStorage only and never in files.
- Docs: `YOUR_V1_2_REPORT.md`, `YOUR_V1_1_REPORT.md`, `HERO_PROFILE_SCHEMA.md`, `HERO_SPRITE_MASTER_PLAN.md`, `YOUR_V1_REPORT.md` (v1), `FAFIFI_ACTIVITIES.md`, `BUILDS_REPORT.md` (B01–B15).
