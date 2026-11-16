# Y.O.U.R. v1.1: owner hero across all games · PROPOSAL_HOLD (PUBLISH HOLD)
Built 2026-11-14, about 11:30 AM EST. Owner message pt61u ("Ok let's keep building"), following the decisions in t59u/t60u.

**Hold rules**
- No push, deploy or publish.
- The v1 zip, v1 working tree, the originals, `claude-v42/43/44` and `team-packs` were not touched.
- v1.1 lives in `your-build-v11/`, a copy of v1.

## 1. What changed
| area | v1.1 |
|---|---|
| **Player** | The owner hero (ChatGPT 18 portrait / 19 walk / 20 fight) is the player in the world, job, skate and arena. `assets/hero/hero_sheet_96.png` uses Mella's 16×7 @96 layout, so all v1 renderers are reused. |
| **Hero sheet build** | `tools/sync_chatgpt_art.py`: white key-out with border flood-fill, removal of enclosed white >120 px and of soft background shadow. `tools/make_hero.py`: blob slicing, auto-trim, cells scaled to a shared median body height (88 px), feet baseline aligned per cell. Provenance is in `assets/hero/HERO_SHEET.json`. |
| **Native frames** | idle/walk in 4 directions (19); fight idle / step / windup / punch / kick / block / hit / victory (20, left = mirror) |
| **FALLBACK frames** (labelled on screen and in the JSON) | skate row = transforms of the walk frames; KO = rotated hit; cast = fight frames |
| **Cover (21)** | Default title art (contained, over the dimmed 01). Settings → Title art toggles to Classic (01). Menu → Cover shows it full screen. |
| **Mella companion** | Follows on a breadcrumb trail (gap 46 px, catch-up 260 px/s, snaps when more than 320 px away). Labelled "Mella · X". X/L opens her dialogue, with LLM or offline grammar. Her voice is PROPOSED and her sheet has `never: invent lore`. She is excluded from A-talk, so she never blocks doors. |
| **Assists** (FaFiFi-fair, `FAFIFI_ACTIVITIES.md` §7) | **Job spotter:** highlights the next in-order empty slot while you carry a crate. **Skate line caller:** points at the next ring of the revealed line, and cancels **one** Dependency delay per run using the existing `protect_bond` counter. Arena: none. Clocks, pay, energy, the road and the audit are unchanged. |
| **Hero name** | Placeholder **"Hero"**. No name was invented. Settings → Hero has name, export JSON (download plus textarea) and import JSON. Dialogue uses `{name}`, and SIKEE's lines use the hero name. |
| **Shared profile** | `modules/wir_hero_profile.js`: key `wir-hero-profile-v1`, schema `wir.hero/1` (`HERO_PROFILE_SCHEMA.md`). Holds name, look, level/xp (max-synced), unlocks (`your:first_shift`, `skate_clear`, `eg_win`, `drone_beaten`, `sikee_defeated`) and per-game data. A second WIR page reads it (QA fixture). |
| **Elemental Gridiron** | The bridge sends the hero name, lookId and portrait. The EG copy shows a "STAR QB · Y.O.U.R. HERO" badge with the portrait (path whitelisted). EG logic was not edited, and the originals are hash-checked as unchanged. |
| **Bug fix** (found by the new QA) | Skate: a seeded ring could sit on the rider's spawn point, get auto-collected on frame 1 and mark the Route-Attack read as "missed". Fixed with a spawn guard: that ring arms once the rider leaves it. Road geometry and the audit are unchanged. |

## 2. QA (Playwright, file://, all http(s) aborted, fetch stubbed, no real network)
| suite | result |
|---|---|
| v1.1 e2e (`qa/run_v11_e2e.js`) | **131/131 pass** · console errors 0 · external requests 0 · 276 local requests · 44 screenshots (`qa/screenshots_v11/`) |
| B01–B15 regression (`qa/run_qa.js`) | **94/94 pass**; static scan ok (no flagged assets, IP names or CDN) |
| fairness audit | job / skate / arena × 200 seeds × d ∈ {0.82, 1, 1.18}: all ok |
| key leak scan | no API key in any shipped file (the key lives in localStorage only) |
| EG originals | claude-v44 is unchanged (528 files) |

**v1.1 checks added (in the e2e):**
- **Profile:** name saved under `wir-hero-profile-v1`, export → import round trip, invalid import rejected.
- **Cross-game:** level/day sync and unlocks; another WIR page reads the hero.
- **Hero art:** sheet 16×7 plus slots 18–21 loaded; hero walk; skate pose from the hero sheet.
- **Mella:** follows and catches up, dialogue on X, portrait; the line caller is active and not auto-missed at spawn; exactly one Dependency cancel per run; the job spotter count.
- **Title and EG:** cover and classic title, Cover screen, EG badge.

**Key screenshots:**
- `01_title_cover`, `05b_cover_screen`
- `06_world_hero_walk`, `06b_world_mella_follow`, `06c_dialogue_mella_companion`
- `09b_job_mella_spotter`, `13_skate_hero_mella_caller`, `13b_skate_hero_riding`
- `20_arena_drone_rivals`, `23/24/25_arena_sikee_*` (hero fight frames)
- `04b_settings_hero_form`, `37_other_wir_game_reads_hero`

## 3. Cross-game hero sprite plan
`HERO_SPRITE_MASTER_PLAN.md` / `.csv` cover all **59** 2D/2.5D games (40 2D + 19 2.5D).

**Totals:**
- **118 sheets** (one locomotion sheet and one action sheet per game)
- **2,574 frames**

**Views:** top-down 16 · 2.5D projected 14 · UNKNOWN 2D view 14 · football 6 · side-view 6 · 2.5D lane 2 · 2.5D iso 1.

**Current hero sprite found:**
- by name: 10
- GUESS (first idle/walk/actor frame): 4
- none found: 45 (mostly code-drawn or unnamed sprites)

**Rules applied:**
- Skills come only from evidence: function names, quoted state strings or sprite names, with the evidence listed per row. Games with no evidence say UNKNOWN.
- Frame sizes default to a PROPOSED 96/128 px where no hero sprite was found.
- Every prompt references image 18.
- This is a heuristic from the static teardown. Verify each game in play before generating art.

## 4. Open items
1. **EG:** the hero is a **badge**, not a playable QB card. EG players are WIR cards, so a real hero QB needs an EG data/logic edit, which needs approval. The v1 EG buff is still not applied inside EG.
2. **Hero frames:** skate, KO and cast are FALLBACK. A ChatGPT skate sheet and a KO/cast row would replace them (prompt templates are in the master plan). A tiny white speck remains between the legs on the left-idle frames.
3. **Mella:** her voice and the assist numbers are PROPOSED. Arena rivals are still spectators only.
4. **Tiles:** 04/05 tiles are still unused for the world map.
5. **Master plan:** 14 games have an UNKNOWN view and 45 have no hero sprite identified. These need a quick play check.
6. **PROPOSED values** carried from v1: clocks, pay, d-band, XP curve.

## 5. Files
- **New:**
  - modules: `modules/wir_hero_profile.js`, `modules/your_config_v11.js`, `modules/your_v11.js`
  - tools: `tools/make_hero.py`, `tools/hero_master_plan.py`
  - assets: `assets/hero/*`
  - QA: `qa/run_v11_e2e.js`, `qa/fixtures/wir_other_game.html`
  - docs: `HERO_PROFILE_SCHEMA.md`, `HERO_SPRITE_MASTER_PLAN.md/.csv`, this report
- **Changed:**
  - modules: `your_llm.js`, `your_screens.js`, `your_art.js`, `your_eg_bridge.js`, `your_v1_activities.js`, `your_game.js`, `your_skate.js` (spawn guard)
  - other: `football/eg44/your_bridge_child.js` (badge), `game/index.html`, `tools/sync_chatgpt_art.py`, `README.md`, `FAFIFI_ACTIVITIES.md` (§7)
