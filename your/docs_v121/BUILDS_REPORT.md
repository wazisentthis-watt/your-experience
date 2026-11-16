# YOUR — Builds B01–B15 report · PROPOSAL_HOLD

PUBLISH HOLD — nothing uploaded, pushed or deployed. B16 (integration) intentionally NOT built.

QA run: 2026-11-14 09:43 EST · headless Chromium (Playwright), one browser per suite, `--disable-dev-shm-usage`, file:// only.

| Build | Name | Tests | Console errors | External requests | Result |
|---|---|---|---|---|---|
| B01 | Core shell | 8/8 | 0 | 0 | PASS |
| B02 | Input | 5/5 | 0 | 0 | PASS |
| B03 | Profile + save | 6/6 | 0 | 0 | PASS |
| B04 | Character + animator | 6/6 | 0 | 0 | PASS |
| B05 | Neighborhood map | 6/6 | 0 | 0 | PASS |
| B06 | NPCs + dialogue | 6/6 | 0 | 0 | PASS |
| B07 | Day + economy | 6/6 | 0 | 0 | PASS |
| B08 | Job: Corner Store | 5/5 | 0 | 0 | PASS |
| B09 | Skate run | 7/7 | 0 | 0 | PASS |
| B10 | Football practice | 7/7 | 0 | 0 | PASS |
| B11 | Arena fight | 7/7 | 0 | 0 | PASS |
| B12 | FaFiFi rules (football) | 7/7 | 0 | 0 | PASS |
| B13 | Fusion hub (season) | 6/6 | 0 | 0 | PASS |
| B14 | HUD + journal + pause | 6/6 | 0 | 0 | PASS |
| B15 | Audio | 6/6 | 0 | 0 | PASS |

**Total: 94/94 tests pass.** Static checks: every module header carries PROPOSAL_HOLD (ok); no asset hash matches the flagged list (0 hits); no IP-risk names in code/tests/asset manifest (0 hits); no http(s) URLs/CDN (0 hits).

Run again: `node qa/run_qa.js` (or `node qa/run_qa.js B09` for one suite). Open any `tests/Bxx_test.html` directly in a browser to see the frame and the pass list.

## Placeholders and rules followed
- Main character, art style: **undecided** → neutral grey generated figure by default; `YOUR.config.hero` / `heroSheets` / `assets` is the swap point (asset manifest `assets/ASSETS.json`, all marked PLACEHOLDER with source paths).
- Only teardown-library sprites used: WishBorn hero (optional), Living WIR npc0/npc1, RIFFT rider atlas/board/rail/ramp, Extreme Football crowd. None from [excluded sheets] ([excluded sheets]), [excluded IP], [excluded IP], or [excluded IP].
- FaFiFi: football rules from rulebook §5 implemented; job/skate/arena rules are a labelled pluggable stub — nothing invented.
- Values copied from sources are labelled with their source in each module header; anything new is marked PROPOSED.

## B01 — Core shell  (`modules/your_core.js`, test `tests/B01_test.html`)

**What it does:** Fixed-timestep loop (1/60 s, max 5 catch-up steps), scene manager (enter/exit), DPR-aware letterboxed 960x540 view, pause on blur / resume on focus without time jump, offline asset loader with progress.

**Sources reused:** Y.O.U.R. slice enterScene/buildScene/frame; [excluded IP] main.js frame/reset (logic only, no art); RIFFT main.js tick/advance/togglePause.

**Tests passed (8/8):**
- ✅ offline: every loaded resource is local (file:)
- ✅ scene.go("b") calls exit(a) then enter(b) exactly once each
- ✅ key N switches scenes
- ✅ at 30 fps throttle update() still runs ~60/s (55–65)
- ✅ max 5 catch-up steps per frame
- ✅ resize keeps 16:9 logical view and full-res backing store at DPR 2
- ✅ blur pauses; focus resumes without a time jump >100 ms
- ✅ asset loader reports progress to 1 and returns images

**Known limits:** UPS measured with fake 30 fps timestamps (deterministic), not wall-clock throttling. Fullscreen button not built (B16 shell concern).

**Screenshots:** `qa/screenshots/B01_frame.png` (game frame), `qa/screenshots/B01_results.png` (full page with results)

## B02 — Input  (`modules/your_input.js`, test `tests/B02_test.html`)

**What it does:** Poll-based input: keyboard (WASD/arrows, J/K/L/I = A/B/X/Y, Esc/P = pause), gamepad (0.2 radial deadzone, buttons 0–3, 9, d-pad 12–15), touch overlay (virtual stick + buttons) shown only after first touchstart. pressed/held/released edges, normalized diagonals.

**Sources reused:** Y.O.U.R. slice kd/ku/readInput/layoutTouch/deadzone; Shared 2.5D skating core actionFromKeyboard/actionFromGamepad; [excluded IP] src/input.js padButtons/merge (logic only).

**Tests passed (5/5):**
- ✅ hold J 1 s → pressed("a") on exactly one poll, held("a") on all polls
- ✅ diagonal keyboard move is normalized (length ≤ 1)
- ✅ gamepad stick inside 0.2 deadzone returns 0,0; buttons map to actions
- ✅ touch overlay hidden on desktop, visible after first touchstart; stick drives move
- ✅ no globals other than window.YOUR (plus test harness)

**Known limits:** Gamepad tested through an injectable provider (no physical pad in headless). Touch tested with synthetic PointerEvents; real-device feel unverified. Key bindings are PROPOSED.

**Screenshots:** `qa/screenshots/B02_frame.png` (game frame), `qa/screenshots/B02_results.png` (full page with results)

## B03 — Profile + save  (`modules/your_profile.js`, test `tests/B03_test.html`)

**What it does:** Single shared profile (hp/stamina/energy/money/xp/lvl/pow/spd/day/rel/flags/log/hub), versioned save (your-save-v1, v:1) with migration of the Y.O.U.R. v0 snapshot shape, corrupt-save fallback with warning, earn/spend/gainXP/event log (20).

**Sources reused:** Y.O.U.R. slice newPlayer (money 20, hp 100, stamina 100) + snapshot shape for migration; PHATOM Fusion hub fresh() and gainXP need()=100*lvl; Living WIR save/spend/pay shapes.

**Tests passed (6/6):**
- ✅ create → save → reload page → load returns deep-equal object
- ✅ spend(999999) returns false and money unchanged
- ✅ corrupt JSON in storage → load() returns fresh profile, logs warning, no throw
- ✅ a v0 object without v (Y.O.U.R. snapshot shape) is migrated to v:1
- ✅ starting values come from Y.O.U.R. newPlayer (money 20, hp 100, stamina 100) + PHATOM fresh (lvl 1)
- ✅ event log keeps last 20

**Known limits:** PROPOSED: MAX_ENERGY 100, LOG_MAX 20, SAVE_KEY. Single slot only.

**Screenshots:** `qa/screenshots/B03_frame.png` (game frame), `qa/screenshots/B03_results.png` (full page with results)

## B04 — Character + animator  (`modules/your_character.js`, test `tests/B04_test.html`)

**What it does:** SpriteSheet (4-direction rows, 8 fps independent of update rate, idle = frame 0), Character with 140 px/s movement, feet-box axis-separated collision (slides along walls), freeze flag. Hero sheet chosen by config: neutral generated placeholder (default) or library WishBorn 4x4 sheet.

**Sources reused:** WishBorn createPlayer/move/heroSprite/drawActors (row-per-direction sheet, y-sorted draw); WishBorn hero sheet (library, PLACEHOLDER, optional).

**Tests passed (6/6):**
- ✅ walking in each of 4 directions shows that direction row; idle shows frame 0
- ✅ animation runs at 8 fps independent of update rate
- ✅ cannot enter a solid tile; slides along walls
- ✅ speed is 140 px/s (PROPOSED)
- ✅ swapping the sheet (config.hero = "wishborn" library sheet) works without code changes
- ✅ placeholder art is labelled PROPOSAL_HOLD (config.status) and swappable label recorded

**Known limits:** Main character undecided → neutral grey placeholder is default. SPEED 140 / ANIM_FPS 8 PROPOSED. No run/attack animation rows.

**Screenshots:** `qa/screenshots/B04_frame.png` (game frame), `qa/screenshots/B04_results.png` (full page with results)

## B05 — Neighborhood map  (`modules/your_world.js`, test `tests/B05_test.html`)

**What it does:** 40x30 string-array tile map (data, not code), 5 POIs (home, store, skate park, field, arena) entered with one A press, dead-zone camera clamped to bounds, culled tile drawing, minimap with player dot.

**Sources reused:** Living WIR POI model (canMoveEntity/nearestPOIId/openPOI); WishBorn createWorld/zoneGround/renderTile; Lil Heavy minimap/road; POI names from the Y.O.U.R. slice. Map layout itself is PROPOSED.

**Tests passed (6/6):**
- ✅ map is data: 40x30 string array with 5 POIs (Y.O.U.R. places)
- ✅ camera never shows outside map bounds
- ✅ each of 5 POIs triggers onEnter exactly once per press (held A does not repeat)
- ✅ minimap shows player dot within 1 tile
- ✅ character collides with buildings/trees (solid tiles)
- ✅ 60 fps budget: 1280x720 canvas, full redraw avg < 16.7 ms with off-screen culling

**Known limits:** Tiles are flat procedural colours (no tileset in the library cleared for reuse). Perf test is headless avg render time, not on-device fps.

**Screenshots:** `qa/screenshots/B05_frame.png` (game frame), `qa/screenshots/B05_results.png` (full page with results)

## B06 — NPCs + dialogue  (`modules/your_npc.js`, test `tests/B06_test.html`)

**What it does:** Mara and Dex NPCs (wander, talk radius 56), dialogue box with typewriter (skip then advance), choices that change profile.rel and save, player frozen while talking, Dex line tracks crate progress.

**Sources reused:** Y.O.U.R. npcTalk/say/renderDialog — every line verbatim; Living WIR openNPC/updateRelation; Living WIR npc0/npc1 sprites as PLACEHOLDERS.

**Tests passed (6/6):**
- ✅ talking freezes player movement and resumes after close
- ✅ typewriter: first A mid-line shows full line, second A advances
- ✅ choice changes profile.rel and persists via YOUR.profile.save()
- ✅ choice cursor moves with up/down
- ✅ no dialogue text beyond the Y.O.U.R. excerpt; extra choices are [TODO ...] placeholders
- ✅ Dex line reflects crate progress (Y.O.U.R. storeCount)

**Known limits:** Choice labels are "[TODO choice A/B]" — no story text invented. Only Mara/Dex exist.

**Screenshots:** `qa/screenshots/B06_frame.png` (game frame), `qa/screenshots/B06_results.png` (full page with results)

## B07 — Day + economy  (`modules/your_day.js`, test `tests/B07_test.html`)

**What it does:** Day clock 06:00→24:00 (2 game-min/s), energy costs per activity with refusal toast, payouts {job 45, skate 30, football 50, arena 60} + XP, sleep (day+1, restore, save), forced sleep at midnight / 0 energy, clock paused during dialogue/menus.

**Sources reused:** Y.O.U.R. payouts/XP/flags + jobDone/sleep; Living WIR advance/onNewDay/grantWork; WishBorn nextDay.

**Tests passed (6/6):**
- ✅ payout table equals {job:45,skate:30,football:50,arena:60}
- ✅ sleep() increments day by exactly 1, restores energy and saves
- ✅ activity start is refused with a toast if energy < cost
- ✅ complete() pays the table amount and sets the Y.O.U.R. flag
- ✅ clock pauses while a dialogue or menu is open
- ✅ forced sleep at 24:00 and at 0 energy

**Known limits:** PROPOSED: energy costs 20/15/20/25, clock rate, 06:00 start. No shops/spending sinks yet.

**Screenshots:** `qa/screenshots/B07_frame.png` (game frame), `qa/screenshots/B07_results.png` (full page with results)

## B08 — Job: Corner Store  (`modules/your_job.js`, test `tests/B08_test.html`)

**What it does:** Stock 5 crates (Y.O.U.R. positions, pick radius 44) onto 5 shelf slots (one each); 5/5 pays $45 once; same-day re-entry shows "Shift done"; 90 s timer with partial pay 9/crate logged; exit returns to the store door.

**Sources reused:** Y.O.U.R. store scene; Living WIR startShift/workScreen/finishShift.

**Tests passed (5/5):**
- ✅ exactly 5 crates at the Y.O.U.R. positions; each slot accepts one crate
- ✅ completion pays 45 once (+20 xp); re-entering same day shows "shift done"
- ✅ timeout ends shift with partial pay 9 per crate (PROPOSED) and logs it
- ✅ pick-up uses Y.O.U.R. radius 44 (no pick from 60 px)
- ✅ scene exits back to world at the store door

**Known limits:** Shapes only — no store/crate/shelf sprite in the library (art gap). PROPOSED: 90 s, 9/crate, drop radius 50.

**Screenshots:** `qa/screenshots/B08_frame.png` (game frame), `qa/screenshots/B08_results.png` (full page with results)

## B09 — Skate run  (`modules/your_skate.js`, test `tests/B09_test.html`)

**What it does:** RIFFT-style skating: push/turn/grip/friction, charge ollie, kickflip, 180, rail 50-50 grind, combo with repeat halving + variety multiplier, bank on clean landing, bails (incomplete flip, hard landing, landed sideways), 8 Y.O.U.R. rings in 45 s → $30 once.

**Sources reused:** RIFFT RIDE-RZ sim.js constants + trick table + land() bails, render.js atlas layout; RIFFT rider atlas/board/rail/ramp sprites (GENERIC placeholders); Y.O.U.R. startSkate/updateSkate (45 s, 8 rings, $30); Shared 2.5D skating core rail sampling idea.

**Tests passed (7/7):**
- ✅ timer ends run at 45.0 s ±0.1 (no rings → timeout, no pay)
- ✅ landing sideways beyond LAND_ALIGN (50°) bails and resets combo
- ✅ hard landing (impact > 300) and incomplete flip bail; aligned landing does not
- ✅ rail grind adds 50-50 to combo; combo banks on clean landing
- ✅ ollie from A release pops POP_BASE..POP_BASE+POP_CHARGE; kickflip (X in air) scores 240 on clean landing
- ✅ payout 30 exactly once per run completion (all 8 Y.O.U.R. rings)
- ✅ rider atlas frame chosen by state and heading (RIFFT rows ride/push/crouch/ollie/kickflip/grind)

**Known limits:** Top-down only (no 2.5D ramps), one park layout. Rider atlas is generic RIFFT art.

**Screenshots:** `qa/screenshots/B09_frame.png` (game frame), `qa/screenshots/B09_results.png` (full page with results)

## B10 — Football practice  (`modules/your_football.js`, test `tests/B10_test.html`)

**What it does:** 2.5D perspective drill on a 420x1000 field: run past 4 seeded defenders (pursuit + separation ≥ 30 px), juke/spin (0.6 s cooldown, stamina), jump, tackle resets drill, 2 TDs → $50 once then back to world. Equity Line (FaFiFi rulebook §5) shown, payout unchanged.

**Sources reused:** Y.O.U.R. updateField/spawnDefenders/approach/collide (field, 4 defenders, tackle 28, juke 34, accel/dodge values); WIR Extreme Football V23 project() + crowd backdrop; WIR Combine execJuke/execSpin/steerDefender; FaFiFi rulebook §5 Equity Line.

**Tests passed (7/7):**
- ✅ 2 touchdowns → payout 50 once, then back to world
- ✅ defenders never overlap (min separation ≥ 30 px every frame)
- ✅ tackle resets the drill (Y.O.U.R. 28 px rule)
- ✅ juke has a 0.6 s cooldown and costs 20 stamina (Y.O.U.R. dodge cost)
- ✅ project() maps field → screen with depth scaling (far players smaller)
- ✅ only library sprites without flags are configured (no [excluded sheets]/#22/Galaxy/[excluded IP]/[excluded IP]/[excluded IP])
- ✅ Equity Line (rulebook §5) shown for football, payout unchanged

**Known limits:** Uses 4 defenders (Y.O.U.R. source) — plan text said 3; open decision. No QB/passing play (Extreme Football pass not ported). Players are procedural shapes.

**Screenshots:** `qa/screenshots/B10_frame.png` (game frame), `qa/screenshots/B10_results.png` (full page with results)

## B11 — Arena fight  (`modules/your_arena.js`, test `tests/B11_test.html`)

**What it does:** Training drone fight: Y.O.U.R. drone AI (chase→wind→strike→recover, lunge/slam), strike with range/facing + FaFiFi canContact lanes, block ×0.13, opening ×2.2 / flank ×1.5, dash/burst, depth-sorted 2.5D draw. Win $60 once; loss $0 and +10 energy.

**Sources reused:** Y.O.U.R. updateArena (drone AI and strike values, verbatim); FaFiFi canContact (98/68), block ×0.13, knock ×0.18, stamina drain, project() depth scale; [excluded IP] core.js reference only (no art/names).

**Tests passed (7/7):**
- ✅ strike only connects when in range + facing + canContact (FaFiFi depth lane)
- ✅ block multiplies damage by the FaFiFi constant 0.13
- ✅ opening (recover/stagger) x2.2 and flank x1.5 multipliers (Y.O.U.R.)
- ✅ drone defeated → payout 60 exactly once
- ✅ depth sorting: nearer fighter (larger z) drawn last
- ✅ drone AI (Y.O.U.R. lunge/slam cycle) lands hits when the player idles; loss pays 0 and costs +10 energy
- ✅ no [excluded IP] / [excluded IP] / [excluded IP] art configured (logic-only reuse)

**Known limits:** Shapes only — no drone/fighter sprite cleared ([excluded IP]/[excluded IP]/[excluded IP] excluded). Hub buff only applied here.

**Screenshots:** `qa/screenshots/B11_frame.png` (game frame), `qa/screenshots/B11_results.png` (full page with results)

## B12 — FaFiFi rules (football)  (`modules/your_fair.js`, test `tests/B12_test.html`)

**What it does:** Rulebook §5 football rules: Perfect-30 meter table (bond cap 2/drive, cap 30, Q4 + Reality ≥75 gating), finish window +180 ms then reset, Dependency (+120 ms / +2 energy once), Route Attack flow, Equity Line pick (payout never changed). Pluggable rule registry; job/skate/arena are labelled stubs.

**Sources reused:** WIR_RETRO_BOWL_Elemental_Gridiron_Gameplay_Power_Interaction_Rulebook.md §5 (lines 453–513), text and numbers as written. Meter floor 0 is PROPOSED (rulebook gives only the cap).

**Tests passed (7/7):**
- ✅ Perfect-30 meter math matches rulebook §5 table exactly
- ✅ meter only builds in Q4 at Reality 75+
- ✅ full meter → one finish window (+180 ms readable) on next snap, then resets to 0
- ✅ Equity Line never changes payout amounts
- ✅ Dependency broken → next linked action +120 ms or +2 energy (once); counters restore
- ✅ Route Attack: reveal → branch only if read → finish/checkdown; first down preserves, sack ends against offense
- ✅ non-football activities are clearly-labelled pluggable stubs (no invented rules)

**Known limits:** Non-football FaFiFi rules NOT invented — stubs marked "PENDING OWNER DECISION". Meter not yet wired to a full 11-on-11 game (needs B16 decision).

**Screenshots:** `qa/screenshots/B12_frame.png` (game frame), `qa/screenshots/B12_results.png` (full page with results)

## B13 — Fusion hub (season)  (`modules/your_hub.js`, test `tests/B13_test.html`)

**What it does:** PHATOM 10-week season rotating job/skate/football/arena (final week 10), rewards xp 40+12k / coins 15+6k, rival tracking, difficulty multiplier clamped 0.75–1.3, buff earned in one activity consumed by the next different one, state saved in the profile.

**Sources reused:** PHATOM Fusion hub 1.0 (phatom_bay.html hubrt): weeks, xp/coins formula, rival, buff, speedFor clamp, RIVALS names. Rotation of 4 parts is an adaptation.

**Tests passed (6/6):**
- ✅ report() for 4 activities advances exactly one week and records W/L
- ✅ PHATOM week rewards: xp 40+12k, coins 15+6k
- ✅ a buff earned in skate is consumed by the next (different) activity only
- ✅ rival +1 on a scheduled loss; difficulty multiplier stays within 0.75–1.3
- ✅ state persists through YOUR.profile.save()
- ✅ scheduled win pays PHATOM coins into money and XP into the shared profile

**Known limits:** Only the scheduled activity advances the week (PHATOM semantics), not every 4 reports. Buff effect only applied in arena.

**Screenshots:** `qa/screenshots/B13_frame.png` (game frame), `qa/screenshots/B13_results.png` (full page with results)

## B14 — HUD + journal + pause  (`modules/your_hud.js`, test `tests/B14_test.html`)

**What it does:** HP/STA/ENERGY bars + money/day/clock/level, toast queue (2.5 s, max 3, no overlap), journal overlay of the event log, pause menu (Resume / Save / Quit to title) that truly stops core updates, safe-area insets.

**Sources reused:** Y.O.U.R. updateHud/renderJournal/toast; Lil Heavy hud/toast/minimap; Living WIR modals.

**Tests passed (6/6):**
- ✅ bars reflect profile values within one frame
- ✅ toasts never overlap (max 3); 4th waits, shows after 2.5 s
- ✅ pause stops core updates (YOUR.core paused flag)
- ✅ Save from pause writes storage and toasts "Saved"
- ✅ journal overlay lists profile log and blocks gameplay
- ✅ respects safe-area insets (layout inside canvas minus margins)

**Known limits:** "Quit to title" has no title scene yet (B16). Safe-area values injected in test, not read from a real notch device.

**Screenshots:** `qa/screenshots/B14_frame.png` (game frame), `qa/screenshots/B14_results.png` (full page with results)

## B15 — Audio  (`modules/your_audio.js`, test `tests/B15_test.html`)

**What it does:** 9 procedural WebAudio SFX (step, pickup, coin, hit, whistle, ollie, land, bail, menu), unlock on first input, master volume, mute persisted in localStorage. No audio files, no network.

**Sources reused:** PHATOM runtime sfx()/music() AudioContext+gain pattern; CCR Bowl WIRFB.Crowd (sample-free WebAudio). The 9 recipes are PROPOSED; library audio files not used.

**Tests passed (6/6):**
- ✅ sfx() before unlock is a silent no-op (no errors)
- ✅ unlock on first input, then every named sfx plays
- ✅ mute persists in localStorage and silences sfx
- ✅ each named sfx has a distinct recipe (automated) — audible check listed in BUILDS_REPORT
- ✅ no network or audio-file loads (procedural only)
- ✅ master volume clamps 0..1

**Known limits:** Sound is not judged by ear in headless QA — only uniqueness/plays are automated; a human listen is still needed. No music.

**Screenshots:** `qa/screenshots/B15_frame.png` (game frame), `qa/screenshots/B15_results.png` (full page with results)

## Open decisions for B16 (integration)

1. **Main character** — neutral placeholder vs WishBorn sheet vs new art (set `YOUR.config.hero`).
2. **Art style** — library sprites are mixed styles (pixel RIFFT, WishBorn, Living WIR); pick one direction or commission.
3. **FaFiFi rules outside football** — job/skate/arena are stubs; owner must write them (register via `YOUR.fair.registerRules`).
4. **Football defenders: 3 (plan) or 4 (Y.O.U.R. source)** — currently 4.
5. **Art gaps** — no cleared sprites for the store interior/crates, drone/fighters, football players, map tiles; all are shapes now.
6. **Mara/Dex choice text** — currently "[TODO choice A/B]".
7. **PROPOSED constants to confirm** — energy costs 20/15/20/25, clock 2 game-min/s, 90 s shift + 9/crate, 45 s skate run, juke cooldown 0.6 s, loss energy 10, key bindings.
8. **Hub semantics** — PHATOM "one scheduled activity per week" vs "all four activities per week"; whether buffs should affect skate/football/job too.
9. **Title screen / "Quit to title"** and the full-game scene flow (world → activities → hub → sleep) are B16 work.
10. **Model for small per-prompt builds** — the brief named "Haiku 5.5"; that model id needs confirming before using it for B16 prompts.
