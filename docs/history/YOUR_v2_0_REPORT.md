# Y.O.U.R. v2.0 · PROPOSAL_HOLD · Report

Built 2026-11-15, America/New_York. The build is on **publish hold**: nothing was pushed, deployed or published.

The base is a copy of WIR Valence Life v3 (Drive 1FryE_BltNvTqYamkpiIfyLYMsFssnFIC), with the Y.O.U.R. v1.2.1 systems merged in. The originals in user-closest-your, your-build-v121, claude-v42/43/44 and the team packs were not modified; the QA sha256 check passes.

## What was merged

| # | Must-have | Status |
|---|---|---|
| 1 | Owner hero sprite as the player in city, home, skate and job | Done. The owner sheet is used at home, in the city, on the board, in the Valence Rifft skate mini-game, and in the Y.O.U.R. job, arena, boss and skate activities. The character creator stays as a cosmetic option: its preview shows the owner and its look feeds the football card. The name defaults to "Hero" and can be changed in Y.O.U.R. → Settings. `wir_hero_profile` follows HERO_PROFILE_SCHEMA (`wir.hero/1`, localStorage `wir-hero-profile-v1`) and supports export and import. |
| 2 | Mella follows as sidekick | Done. She trails at 1.25 tiles, appears on every map, and talks when E has nothing else to use. |
| 3 | SIKEE (Authority Form) boss | Done and reachable through the story. First Y.O.U.R. activity → SIKEE appears at the Corner Gym → drone win → SIKEE's challenge → boss intro (art 17) → fight using the art 14–16 sheets (hp 160, PROPOSED) → result line. Progress is saved in the Valence save and recorded as WIR_HERO unlocks. |
| 4 | Mara and Dex with LLM dialogue | Done. The player picks the provider (offline, OpenAI, Anthropic, Ollama or WebLLM) in Settings. The key is stored in localStorage only. Invalid or failed replies fall back to offline lines, and effects are limited to a whitelist. The Valence bond Talk and Deep talk options are on the same sheet. |
| 5 | ChatGPT art | Done. Title uses the 21 cover (01 classic is selectable). Menu screens use 02. Banners: store 06, drone 10, hub 12, sleep 13, boss 17. Portraits: Mara 08, Dex 09, SIKEE 14, and the owner. |
| 6 | Corner Store job and Drone arena, FaFiFi, Valence systems kept | Done. Store job: 5 crates / 90 s / $45, once per day. Drone arena: $60. FaFiFi rules apply on the job, skate and arena. The Valence dock job, scored job mini-games and Rifft skate are kept. Pay goes through Valence `payroll()` and the clock and needs through `fastAct`. Valence tax, bank and housing are unchanged. A Y.O.U.R. day log gives a recap each new day. |
| 7 | Sprint (B) and fly (F/RB) | Done. Sprint: Shift, K, pad B or touch, ×1.7. Fly: F, pad RB or touch, ×1.45, with take-off, hover and land frames. Flying is outdoors only and you must land before using a door. |
| 8 | EG and Testimony career, drill-pause fix | Done, in the bridge copy only. The claude-v44 fallback was not needed. The drill opens unpaused, Leave returns you to the city, and scrimmage End shows the result and goes back to the Valence report. A gamepad guard was also added for file:// play. EG game logic is unchanged. |
| 9 | Offline | Done. Fonts are bundled (OFL). The claude.ai links and online play were removed. QA saw zero outside requests and no `fetch()` calls. |
| 10 | IP exclusions | Done. All 7 `[excluded]_*` art files are removed, and the name "[excluded IP]" is now "Silicon". Stay On Page ("WIR KI WAR ([excluded IP] style)") is removed. In football, the [excluded IP] art and name are removed. None of the [excluded IP], [excluded IP] or flagged-uniform files are shipped. |

## QA results (headless Chromium, run 2026-11-15)

**v2.0 suite** (`qa/run_v20_qa.js`): **136/136 passed.**

| Suite | Passed |
|---|---|
| Boot / title / maker | 11 |
| Hero | 6 |
| City | 5 |
| Moves | 9 |
| Dialogue / LLM | 13 |
| Store job | 11 |
| SIKEE | 3 |
| Arena | 6 |
| Boss | 9 |
| Skate | 5 |
| Valence extras | 3 |
| Football | 5 |
| Phone tab | 6 |
| Day loop | 2 |
| Save/load | 2 |
| Desktop global | 5 |
| Phone portrait (390×844) | 10 |
| Phone landscape (844×390) | 10 |
| file:// | 7 |
| Static scans | 8 |

Across every viewport: 0 page errors, 0 console errors, 0 outside requests and 0 failed local requests.

**v1.2.1 regression, re-run inside this copy:**
- `your/qa/run_v121_e2e.js`: **145/145**
- `your/qa/run_qa.js` (builds B01–B15): **94/94**

Logs are in `qa/regression_v121_*.log`.

**Screenshots:** 39 in `qa/screenshots_v20/`, plus the contact sheet `qa/v20_contact_sheet.png`.

## PROPOSED numbers

None of these are owner-approved. They are all in `your/v20/your_v20_config.js`.

- **Tax:** Y.O.U.R. gross pay ($45 job, $60 arena or boss, $30 skate; these are the v1.2.1 values) goes through Valence payroll, so FICA 7.65% is withheld.
- **Time:** each Y.O.U.R. activity takes 1 Valence hour.
- **Needs per activity:**

  | Activity | Gains | Drains |
  |---|---|---|
  | Job | Hustle +.3, Purpose +.1 | Rest .06, Fuel .05 |
  | Arena | Play +.2, Skill +.15 | Rest .1, Fuel .08, Clean .12 |
  | Boss | Play +.25, Purpose +.15 | Rest .14, Fuel .1, Clean .15 |
  | Skate | Play +.32 | Rest .05, Fuel .04 |

- **XP:** job tech +2, arena combat +4, boss combat +6.
- **Movement:** sprint ×1.7, fly ×1.45 (v1.2.1 values), dash 0.2 s, take-off 0.4 s, land 0.22 s. Flying is outdoors only.
- **Places:** job at Sahelatrix Market, arena and SIKEE at the Corner Gym, skate at the park. Mara is at the park by day and the venue in the evening. Dex is at the market.
- **Bonds:** EN 2.2 placeholder for Mara, Dex and SIKEE, so the Valence bond math works. No element lore is claimed.
- **Mella and sprites:** Mella follows at a 1.25-tile gap and snaps back past 7 tiles. Sprite sizes: hero 60, Mella 54, SIKEE 72, Mara/Dex 58.
- **Runner energy:** the Y.O.U.R. runner starts each activity at full energy. Valence needs act as the stamina system.

## Known issues / owner review

1. **The hero is not playable on the football field.** The EG engine still uses its own player; only the cosmetic look and name are passed. Changing this means changing EG game logic, which needs approval.
2. **The `spr/leg3.webp` legend sheet** is shared by Metal and the former [excluded IP] card slot (now "Silicon"). It was kept; please check whether it depicts [excluded IP]. [excluded IP] internal ids (bonds, mentors) remain as data keys only and are not shown.
3. **The [excluded IP]/Stay On Page removals are content changes.** The NeonGlazed BrawlScape building no longer has a lab.
4. **Online multiplayer is off.** It needed the claude.ai host.
5. **The Valence scored job mini-games draw no person** (that is Valence's design). The owner hero appears in the Y.O.U.R. store-job runner.
6. **Mara and Dex bodies are Living WIR placeholder sprites.** Their portraits are ChatGPT 08 and 09.
7. **The boss win pays $60** (the arena rate, as in v1.2.1).
8. **Fonts are OFL.** Add each family's OFL.txt before publishing (see `fonts/FONTS_LICENSE.md`).
9. **The zip includes `your/football/eg44`** (about 48 MB). It is the v1.2.1 fallback bridge and regression target, and the v2.0 index does not load it.

## What's left (needs the owner)

- Approve or replace the PROPOSED numbers.
- Decide on the football hero (EG logic) and on `leg3`.
- Supply final Mara and Dex walk sheets.
- Decide whether to restore online play behind an opt-in.
- Lift the publish hold.

## Files

- **Build:** `index.html`, `football.html`, `your/`, `art/`, `spr/`, `aud/`, `games/`, `fonts/`.
- **Build script:** `tools/build_v20.py`.
- **QA:** `qa/run_v20_qa.js`, `qa/qa_v20_results.json`, `qa/ORIGINALS_SHA256.json`.
- **Docs:** `CHANGELOG.md`, `ASSET_SOURCES.csv`, `README_v20.md`.
