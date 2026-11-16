import json,datetime,hashlib,os
from zoneinfo import ZoneInfo
R='/workspace/game-recovery/your-build'
q=json.load(open(f'{R}/qa/qa_results.json'))
gen=datetime.datetime.fromisoformat(q['generated'].replace('Z','+00:00')).astimezone(ZoneInfo('America/New_York')).strftime('%Y-%m-%d %H:%M %Z')
B={
'B01':('Core shell','your_core.js','Fixed-timestep loop (1/60 s, max 5 catch-up steps), scene manager (enter/exit), DPR-aware letterboxed 960x540 view, pause on blur / resume on focus without time jump, offline asset loader with progress.',
 'Y.O.U.R. slice enterScene/buildScene/frame; [excluded IP] main.js frame/reset (logic only, no art); RIFFT main.js tick/advance/togglePause.',
 'UPS measured with fake 30 fps timestamps (deterministic), not wall-clock throttling. Fullscreen button not built (B16 shell concern).'),
'B02':('Input','your_input.js','Poll-based input: keyboard (WASD/arrows, J/K/L/I = A/B/X/Y, Esc/P = pause), gamepad (0.2 radial deadzone, buttons 0–3, 9, d-pad 12–15), touch overlay (virtual stick + buttons) shown only after first touchstart. pressed/held/released edges, normalized diagonals.',
 'Y.O.U.R. slice kd/ku/readInput/layoutTouch/deadzone; Shared 2.5D skating core actionFromKeyboard/actionFromGamepad; [excluded IP] src/input.js padButtons/merge (logic only).',
 'Gamepad tested through an injectable provider (no physical pad in headless). Touch tested with synthetic PointerEvents; real-device feel unverified. Key bindings are PROPOSED.'),
'B03':('Profile + save','your_profile.js','Single shared profile (hp/stamina/energy/money/xp/lvl/pow/spd/day/rel/flags/log/hub), versioned save (your-save-v1, v:1) with migration of the Y.O.U.R. v0 snapshot shape, corrupt-save fallback with warning, earn/spend/gainXP/event log (20).',
 'Y.O.U.R. slice newPlayer (money 20, hp 100, stamina 100) + snapshot shape for migration; PHATOM Fusion hub fresh() and gainXP need()=100*lvl; Living WIR save/spend/pay shapes.',
 'PROPOSED: MAX_ENERGY 100, LOG_MAX 20, SAVE_KEY. Single slot only.'),
'B04':('Character + animator','your_character.js','SpriteSheet (4-direction rows, 8 fps independent of update rate, idle = frame 0), Character with 140 px/s movement, feet-box axis-separated collision (slides along walls), freeze flag. Hero sheet chosen by config: neutral generated placeholder (default) or library WishBorn 4x4 sheet.',
 'WishBorn createPlayer/move/heroSprite/drawActors (row-per-direction sheet, y-sorted draw); WishBorn hero sheet (library, PLACEHOLDER, optional).',
 'Main character undecided → neutral grey placeholder is default. SPEED 140 / ANIM_FPS 8 PROPOSED. No run/attack animation rows.'),
'B05':('Neighborhood map','your_world.js','40x30 string-array tile map (data, not code), 5 POIs (home, store, skate park, field, arena) entered with one A press, dead-zone camera clamped to bounds, culled tile drawing, minimap with player dot.',
 'Living WIR POI model (canMoveEntity/nearestPOIId/openPOI); WishBorn createWorld/zoneGround/renderTile; Lil Heavy minimap/road; POI names from the Y.O.U.R. slice. Map layout itself is PROPOSED.',
 'Tiles are flat procedural colours (no tileset in the library cleared for reuse). Perf test is headless avg render time, not on-device fps.'),
'B06':('NPCs + dialogue','your_npc.js','Mara and Dex NPCs (wander, talk radius 56), dialogue box with typewriter (skip then advance), choices that change profile.rel and save, player frozen while talking, Dex line tracks crate progress.',
 'Y.O.U.R. npcTalk/say/renderDialog — every line verbatim; Living WIR openNPC/updateRelation; Living WIR npc0/npc1 sprites as PLACEHOLDERS.',
 'Choice labels are "[TODO choice A/B]" — no story text invented. Only Mara/Dex exist.'),
'B07':('Day + economy','your_day.js','Day clock 06:00→24:00 (2 game-min/s), energy costs per activity with refusal toast, payouts {job 45, skate 30, football 50, arena 60} + XP, sleep (day+1, restore, save), forced sleep at midnight / 0 energy, clock paused during dialogue/menus.',
 'Y.O.U.R. payouts/XP/flags + jobDone/sleep; Living WIR advance/onNewDay/grantWork; WishBorn nextDay.',
 'PROPOSED: energy costs 20/15/20/25, clock rate, 06:00 start. No shops/spending sinks yet.'),
'B08':('Job: Corner Store','your_job.js','Stock 5 crates (Y.O.U.R. positions, pick radius 44) onto 5 shelf slots (one each); 5/5 pays $45 once; same-day re-entry shows "Shift done"; 90 s timer with partial pay 9/crate logged; exit returns to the store door.',
 'Y.O.U.R. store scene; Living WIR startShift/workScreen/finishShift.',
 'Shapes only — no store/crate/shelf sprite in the library (art gap). PROPOSED: 90 s, 9/crate, drop radius 50.'),
'B09':('Skate run','your_skate.js','RIFFT-style skating: push/turn/grip/friction, charge ollie, kickflip, 180, rail 50-50 grind, combo with repeat halving + variety multiplier, bank on clean landing, bails (incomplete flip, hard landing, landed sideways), 8 Y.O.U.R. rings in 45 s → $30 once.',
 'RIFFT RIDE-RZ sim.js constants + trick table + land() bails, render.js atlas layout; RIFFT rider atlas/board/rail/ramp sprites (GENERIC placeholders); Y.O.U.R. startSkate/updateSkate (45 s, 8 rings, $30); Shared 2.5D skating core rail sampling idea.',
 'Top-down only (no 2.5D ramps), one park layout. Rider atlas is generic RIFFT art.'),
'B10':('Football practice','your_football.js','2.5D perspective drill on a 420x1000 field: run past 4 seeded defenders (pursuit + separation ≥ 30 px), juke/spin (0.6 s cooldown, stamina), jump, tackle resets drill, 2 TDs → $50 once then back to world. Equity Line (FaFiFi rulebook §5) shown, payout unchanged.',
 'Y.O.U.R. updateField/spawnDefenders/approach/collide (field, 4 defenders, tackle 28, juke 34, accel/dodge values); WIR Extreme Football V23 project() + crowd backdrop; WIR Combine execJuke/execSpin/steerDefender; FaFiFi rulebook §5 Equity Line.',
 'Uses 4 defenders (Y.O.U.R. source) — plan text said 3; open decision. No QB/passing play (Extreme Football pass not ported). Players are procedural shapes.'),
'B11':('Arena fight','your_arena.js','Training drone fight: Y.O.U.R. drone AI (chase→wind→strike→recover, lunge/slam), strike with range/facing + FaFiFi canContact lanes, block ×0.13, opening ×2.2 / flank ×1.5, dash/burst, depth-sorted 2.5D draw. Win $60 once; loss $0 and +10 energy.',
 'Y.O.U.R. updateArena (drone AI and strike values, verbatim); FaFiFi canContact (98/68), block ×0.13, knock ×0.18, stamina drain, project() depth scale; [excluded IP] core.js reference only (no art/names).',
 'Shapes only — no drone/fighter sprite cleared ([excluded IP]/[excluded IP]/[excluded IP] excluded). Hub buff only applied here.'),
'B12':('FaFiFi rules (football)','your_fair.js','Rulebook §5 football rules: Perfect-30 meter table (bond cap 2/drive, cap 30, Q4 + Reality ≥75 gating), finish window +180 ms then reset, Dependency (+120 ms / +2 energy once), Route Attack flow, Equity Line pick (payout never changed). Pluggable rule registry; job/skate/arena are labelled stubs.',
 'WIR_RETRO_BOWL_Elemental_Gridiron_Gameplay_Power_Interaction_Rulebook.md §5 (lines 453–513), text and numbers as written. Meter floor 0 is PROPOSED (rulebook gives only the cap).',
 'Non-football FaFiFi rules NOT invented — stubs marked "PENDING OWNER DECISION". Meter not yet wired to a full 11-on-11 game (needs B16 decision).'),
'B13':('Fusion hub (season)','your_hub.js','PHATOM 10-week season rotating job/skate/football/arena (final week 10), rewards xp 40+12k / coins 15+6k, rival tracking, difficulty multiplier clamped 0.75–1.3, buff earned in one activity consumed by the next different one, state saved in the profile.',
 'PHATOM Fusion hub 1.0 (phatom_bay.html hubrt): weeks, xp/coins formula, rival, buff, speedFor clamp, RIVALS names. Rotation of 4 parts is an adaptation.',
 'Only the scheduled activity advances the week (PHATOM semantics), not every 4 reports. Buff effect only applied in arena.'),
'B14':('HUD + journal + pause','your_hud.js','HP/STA/ENERGY bars + money/day/clock/level, toast queue (2.5 s, max 3, no overlap), journal overlay of the event log, pause menu (Resume / Save / Quit to title) that truly stops core updates, safe-area insets.',
 'Y.O.U.R. updateHud/renderJournal/toast; Lil Heavy hud/toast/minimap; Living WIR modals.',
 '"Quit to title" has no title scene yet (B16). Safe-area values injected in test, not read from a real notch device.'),
'B15':('Audio','your_audio.js','9 procedural WebAudio SFX (step, pickup, coin, hit, whistle, ollie, land, bail, menu), unlock on first input, master volume, mute persisted in localStorage. No audio files, no network.',
 'PHATOM runtime sfx()/music() AudioContext+gain pattern; CCR Bowl WIRFB.Crowd (sample-free WebAudio). The 9 recipes are PROPOSED; library audio files not used.',
 'Sound is not judged by ear in headless QA — only uniqueness/plays are automated; a human listen is still needed. No music.'),
}
L=[f'# YOUR — Builds B01–B15 report · PROPOSAL_HOLD','',f'PUBLISH HOLD — nothing uploaded, pushed or deployed. B16 (integration) intentionally NOT built.','',f'QA run: {gen} · headless Chromium (Playwright), one browser per suite, `--disable-dev-shm-usage`, file:// only.','',
'| Build | Name | Tests | Console errors | External requests | Result |','|---|---|---|---|---|---|']
tp=tt=0
for k,(n,*_) in B.items():
    s=q['suites'][k]; tp+=s['pass']; tt+=s['total']
    L.append(f"| {k} | {n} | {s['pass']}/{s['total']} | {len(s['consoleErrors'])} | {len(s['externalRequests'])} | {'PASS' if s['ok'] else 'FAIL'} |")
st=q['static']
L+=['',f'**Total: {tp}/{tt} tests pass.** Static checks: every module header carries PROPOSAL_HOLD ({"ok" if not st["headers"] else st["headers"]}); no asset hash matches the flagged list ({len(st["flaggedAssets"])} hits); no IP-risk names in code/tests/asset manifest ({len(st["ipNames"])} hits); no http(s) URLs/CDN ({len(st["cdn"])} hits).','',
'Run again: `node qa/run_qa.js` (or `node qa/run_qa.js B09` for one suite). Open any `tests/Bxx_test.html` directly in a browser to see the frame and the pass list.','',
'## Placeholders and rules followed','- Main character, art style: **undecided** → neutral grey generated figure by default; `YOUR.config.hero` / `heroSheets` / `assets` is the swap point (asset manifest `assets/ASSETS.json`, all marked PLACEHOLDER with source paths).',
'- Only teardown-library sprites used: WishBorn hero (optional), Living WIR npc0/npc1, RIFFT rider atlas/board/rail/ramp, Extreme Football crowd. None from [excluded sheets] ([excluded sheets]), [excluded IP], [excluded IP], or [excluded IP].',
'- FaFiFi: football rules from rulebook §5 implemented; job/skate/arena rules are a labelled pluggable stub — nothing invented.',
'- Values copied from sources are labelled with their source in each module header; anything new is marked PROPOSED.','']
for k,(n,mod,what,src,lim) in B.items():
    s=q['suites'][k]
    L+=[f'## {k} — {n}  (`modules/{mod}`, test `tests/{k}_test.html`)','',f'**What it does:** {what}','',f'**Sources reused:** {src}','',f"**Tests passed ({s['pass']}/{s['total']}):**"]
    L+=[f"- {'✅' if t['ok'] else '❌'} {t['name']}" for t in s['tests']]
    L+=['',f'**Known limits:** {lim}','',f"**Screenshots:** `qa/screenshots/{k}_frame.png` (game frame), `qa/screenshots/{k}_results.png` (full page with results)",'']
L+=['## Open decisions for B16 (integration)','',
'1. **Main character** — neutral placeholder vs WishBorn sheet vs new art (set `YOUR.config.hero`).',
'2. **Art style** — library sprites are mixed styles (pixel RIFFT, WishBorn, Living WIR); pick one direction or commission.',
'3. **FaFiFi rules outside football** — job/skate/arena are stubs; owner must write them (register via `YOUR.fair.registerRules`).',
'4. **Football defenders: 3 (plan) or 4 (Y.O.U.R. source)** — currently 4.',
'5. **Art gaps** — no cleared sprites for the store interior/crates, drone/fighters, football players, map tiles; all are shapes now.',
'6. **Mara/Dex choice text** — currently "[TODO choice A/B]".',
'7. **PROPOSED constants to confirm** — energy costs 20/15/20/25, clock 2 game-min/s, 90 s shift + 9/crate, 45 s skate run, juke cooldown 0.6 s, loss energy 10, key bindings.',
'8. **Hub semantics** — PHATOM "one scheduled activity per week" vs "all four activities per week"; whether buffs should affect skate/football/job too.',
'9. **Title screen / "Quit to title"** and the full-game scene flow (world → activities → hub → sleep) are B16 work.',
'10. **Model for small per-prompt builds** — the brief named "Haiku 5.5"; that model id needs confirming before using it for B16 prompts.','']
open(f'{R}/BUILDS_REPORT.md','w').write('\n'.join(L))
print(tp,tt)
