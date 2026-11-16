# Y.O.U.R. v2.3 · PROPOSAL_HOLD · report

**Built:** 2026-11-16, around 3:40 PM EST (America/New_York).

**Build folder:** `/workspace/game-recovery/your-build-v23/`. It is a fresh copy of the v2.2 build, with a local git commit only. Nothing was pushed, deployed or published.

**Untouched:** the v2.2 build (sha256 of all 1125 files, checked in QA) and all originals (sha256 checked).

**Not integrated:** the Mella Passport. The mapping notes are in §7.

## 1. Branding: please confirm the wording

The owner's exact words (t74u):

> "Group we're called the Y O U R Experience, Experience Wonders, and you should be able to fight villains and survive raids and all of that type of stuff. You're a super powered person as well."

What the build uses:
- **Title:** `Y.O.U.R. Experience — Experience Wonders · v2.3 · PROPOSAL_HOLD`. The page title, the start screen and the phone Y.O.U.R. tab all use it. The Y.O.U.R. acronym is kept.
- **UNCONFIRMED:** the punctuation and casing. You dictated "Y O U R Experience, Experience Wonders". I wrote it as "Y.O.U.R. Experience" with "Experience Wonders" as the tagline, joined by an em dash.
- **Where to change it:** if you want different wording, edit the `brand` block in `your/v23/your_v23_config.js`. Every screen reads from that one place.

## 2. Villains: all sourced from recovered WIR material

| Villain | In game | Source (provenance) | Art |
|---|---|---|---|
| GHOSTED LOADER (hp 3, dash) | waves + work site | METAL: IN DA RIFFT · City Siege · `MACHINE_DEFS.loader` (verbatim) | real METAL sprites (4 frames) |
| GHOSTED LIFTER (hp 5, sweep) | waves | `MACHINE_DEFS.lifter` | real METAL sprites |
| WALKER (hp 2, fast dash) | waves | `MACHINE_DEFS.walker` | real METAL sprites |
| SCOUT BOT (hp 1, hover dash) | waves | `MACHINE_DEFS.scout` | real METAL sprites |
| BREACHER (hp 6, frontal shield) | waves | `MACHINE_DEFS.breacher` | real METAL sprites |
| **BALLAST**, boss (Daily · 3/10, S1E1 "Concrete Has a Tempo") | raid boss wave | METAL `BOSS_DEFS.ballast`. Name, tier, lesson and lines are marked **CANON (S1 villain ladder)**. The fight design is marked PROPOSAL in the METAL file. | **placeholder art (labelled)**, because no sprite exists |
| **GLASSJAW**, boss (Daily · 3.5/10) | raid boss after Ballast + 3 events (METAL rule) | METAL `BOSS_DEFS.glassjaw`, CANON name and lines | **placeholder art (labelled)** |
| SIKEE (Authority Form) | unchanged arena boss from v2.0/2.2 | earlier recovered WIR material | existing |

**Source file:** `/workspace/game-recovery/metal-all/files/METAL:_IN_DA_RIFFT/2D/_unversioned/octec_engine_pmk-pnk-camera-shelf_games_rifft-city-siege.html`.
- sha256: `6c45eaa8a37699cd62d59cf1470c4f13979fdab3a0cac2a191b40504e115124f`
- The same MACHINE_DEFS appear in the v9, v10, v16 and v17 builds.

**Sprites:**
- 28 frames were extracted to `your/assets/villains/metal_machines/` by `tools/extract_metal_machines.py`.
- QA re-extracts them and compares them byte for byte.
- QA also evaluates MACHINE_DEFS, MACHINE_SITES and BOSS_DEFS directly out of the METAL file and compares them with the config.

**Not used:**
- **FIRSTLINE drones:** they exist in METAL, but they belong to the drone-escort mode.
- **First Wish V7:** it has no villain. Its K is a creature you calm, not an enemy.
- **Ghoulie Tools and WishBorn:** no fightable villain was found.
- **Excluded IP:** none was used. QA regex-scans the v2.3 files for [excluded IP], [excluded IP], [excluded IP], [excluded IP], [excluded IP], Venom and [excluded IP].

## 3. Combat: you are the super-powered MELLA

**Hero (from METAL):**
- 5 ♥.
- When hit: 1.1 s of invulnerability with a blink, and 240 px of knock-back.
- Dash: 0.34 s dodge window.
- Jumping clears dash attacks and shockwaves.
- When transformed (⚡SHIFT), hits are ABSORBED.
- Knock-out: at 0 ♥ you are **KNOCKED DOWN** for 2.4 s. Powers are blocked and you can't move. You then recover with full ♥ and a 1.5 s grace period. **Nothing is lost.**

**Enemies (METAL AI):**
- They wake, chase, **telegraph** (an amber dash lane or sweep arc), attack, take a **hit reaction** (stun frame, flash, HP bar), and are then **ISOLATED**. In METAL, machines are "ghosted", so they are switched off, not killed.
- Enemy HP = METAL hp × 18 (**PROPOSED**).

**Powers → Nimbus:** every V7 power deals damage through `WIRMellaCombat.executeMellaCombatFrame`, using the recovered `wir_mella_combat.js` v1.2.0, vendored byte-identical.

| Power | Nimbus lane | Base damage |
|---|---|---|
| ROOT | A ROOT_TERRAIN_TRAVERSE | 22 |
| CORE | X LEFT_CORE_ANCHOR_PULL | 26 |
| Blast | B RIGHT_CORE_BIOELECTRIC | 38 |
| CROWN | Y CROWN_ALLOTROPE_SHIFT | 32 |
| Melee | sector strike | 20 × the sector dmgMult |

The Nimbus multipliers apply as recovered:
- Valence shell: ×1.25 Balanced, ×0.75 Under, ×1.4 Over.
- CCR triangle: ×1.4 / ×0.65 against each machine's stance (stances are PROPOSED).

Effects on the HUD stars:
- The living circuit uses Gravitational Charge.
- CALM runs Valence Regulation, which puts the stars back to 6.
- Each isolated machine gives +1 ★.

**Veyru (KAW) assists:**
- RAINROOT SNARE every 6.2 s roots the nearest machine.
- CALM in a fight stuns nearby machines for 1.3 s and gives +1 ♥.
- These numbers are PROPOSED.

## 4. Raids: survival waves (tuning PROPOSED)

**Start:**
- At the raid beacon on the starter block, press E or tap it.
- Or tap "Start a raid here" in the phone Y.O.U.R. tab.

**Waves:** "RAID ON THE STARTER FLAT BLOCK" has 4 escalating waves that use METAL site compositions: TRANSIT DEPOT 4 → FOUNDRY YARD 4 → GYRE PLATFORM 5 → FLOOD PUMPHOUSE 5. There is a 4 s rest between waves. Wave 5 is the **boss**.

**BALLAST:**
- Direct hits fail ("You can't move me." / "Didn't plan to.").
- His KA CHUNK cycle sends out shockwaves you must JUMP.
- ROOT or CORE under him only works in the free window between his braces.
- He has 3 phases.

**GLASSJAW:**
- Unlocks after Ballast plus 3 events.
- Direct hits go TINK.
- 3 landings near him cause REPEATED LOADING (−10).
- ROOT under him causes TORSION CRACK (−11).
- In phase 3 he charges after a 0.7 s telegraph.
- Win card: "Contained — not killed. Nobody gets killed here." (METAL).

**Reward:** $60 gross, paid through Valence payroll with FICA withheld, once per in-game day. Also Veyru bond +2 and profile unlocks.

**Failure is recoverable:** being knocked down in a raid, or leaving the city, counts as RETREATED. The machines power down, and your money and HP are restored. You can retry at once.

**Work site:** a Labor Ghosting site sits on the plaza ⚙ marker. Step onto it to wake it. Its escalation follows your clears.

## 5. Nimbus wiring

- **Wired for real:** all damage goes through the recovered module.
- **Gap:** the Divine-12 nodes use the module's defaults (12/14 shown).
- **Gap:** the recovered BaseEngine is absent, so the module's native CCR fallback is used.

## 6. Saves

- **Where it is stored:** the combat/raid record goes in the Valence save (`state().combat`) and in the hero profile as `games.your_combat`, through `H.gameData`.
- **What it holds:** raids started/cleared/failed, bosses stopped, isolates by kind, and the reward day.
- **Unlocks:** `your:raid_survived`, `your:villain_ballast`, `your:villain_glassjaw`, `your:site_isolated`.
- **Backward compatible:** the record stays under the 4 KB limit in `wir.hero/1`. The older v1.1 profile module (from the v2.1 build) keeps the field (tested).
- **New saves:** a new save on the same profile restores the record.

## 7. Passport mapping note (NOT integrated)

These follow `mella-passport/PASSPORT_SCHEMA.md`, with worldId `your` (`worlds/your.world.json`).

| Y.O.U.R. event | Passport effect |
|---|---|
| Raid survived | `identity` record + grant `unlock.your.raid_survived`; `skills` upgrade delta `combat.raid` (amount PROPOSED) |
| Villain stopped (Ballast / Glassjaw) | `identity` accomplishment `unlock.your.villain_ballast` / `unlock.your.villain_glassjaw` (grant) |
| Machine isolated / site isolated | `skills` record (`combat.isolate`), `identity` grant `unlock.your.site_isolated` |
| Knocked down | `stability` downgrade `condition.power_strain`, with a `duration` and `recovery` (rest/activity). It never permanently subtracts. |
| Raid failed / retreated | No penalty event; at most a `stability` note with recovery |
| Veyru assist (snare / calm) | `relationships` delta on `rel.kaw-veyru-001` |
| Valence stars / regulation | `power` (control) and `stability` (regulation) entries |
| Raid reward money | Stays in Valence; not a Passport layer |

The legacy sync already maps `unlocks[]` to `identity.unlock.<game>.<unlock>` (schema §legacy). The v2.3 unlocks will therefore flow in automatically once the Passport is integrated.

## 8. QA (Playwright; desktop 1280×800, phone portrait, phone landscape with touch)

| Suite | Result |
|---|---|
| **v2.3 new suite** `qa/run_v23_qa.js` | **91/91 passed**, 21 screenshots in `qa/screenshots_v23/`. Contact sheet: `qa/V23_CONTACT_SHEET.png`. |
| **v2.2 regression** on the v2.3 build | **93/95**. The 2 failures are expected: the title and subtitle now say v2.3 and the new brand instead of v2.2. |
| v2.1 regression on the v2.3 build | **74/75**. The 1 failure is expected: the title. |

The v2.3 suite covers:
- branding
- every power against real targets
- telegraphs, hit reactions and isolation
- hero HP, i-frames, knock-out and recovery
- Veyru assists
- the full raid: 4 waves, Ballast, survived, reward
- Glassjaw
- raid failure and retreat, with no loss
- saves, cross-save carry and the backward-compatible profile
- phone portrait and landscape touch: HUD overlap, button sizes, tap HIT/JUMP, clearing wave 1, the KO banner
- provenance checks, the IP scan, and the v2.2/originals sha checks
- zero page, console or network errors

## 9. Gaps

1. **Brand punctuation and casing** need your confirmation (§1).
2. **No Ballast or Glassjaw sprites** exist in the recovered material. They use labelled placeholder art.
3. **Glassjaw's phase-2 fake platforms** (METAL PROPOSAL) are not built.
4. **Nimbus Divine-12 nodes** use defaults, and the BaseEngine is missing, so the native CCR fallback is used.
5. **SIKEE** is not part of the raids; she stays in the Arena.
6. **One district only:** there is a single raid, on the starter flat block, plus one plaza work site.
7. **Veyru** still has no 4-direction art; up and down show the side-view placeholder.
8. **All tuning is PROPOSED:** enemy HP ×18, CCR stances, the raid order, the reward, the Veyru assist timings, the 4 s rest, and the plaza trigger. The plaza site wakes when you step on its marker, not at METAL's 560 px proximity.
9. **Flaky v2.1 game section:** the v2.1 suite's game section has been flaky in the past. It passed on this run.
10. **Passport** not integrated (by request).
