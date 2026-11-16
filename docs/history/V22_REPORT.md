# Y.O.U.R. v2.2 — PROPOSAL_HOLD report

Built: 2026-11-16 12:22 ET · Path: `/workspace/game-recovery/your-build-v22/` (a new copy of v21; v21 and the originals are untouched, checked by sha256 in QA)
PUBLISH HOLD: no GitHub push, no public deploy. Local git commit only.
Excluded IP: no [excluded IP], [excluded IP], [excluded IP], or [excluded IP]/Venom content. In the public repo the internal engine card id was renamed to `silicon`.
Mella Passport (`/workspace/game-recovery/mella-passport/`): NOT integrated, as you asked.

## What changed
1. **The hero IS the MELLA with powers.** The First Wish V7 kit: jump, dash, hit, blast, calm, transform, plus the ROOT → CORE → CROWN chain and the Living Circuit synergy. All values are copied from V7 (`your/v22/your_v22_config.js`, tag V7). Nimbus lane labels are tagged NIMBUS.
   - The V7→Valence scale is PROPOSED: V7 moves at 200 px/s and the Valence walk is 3.1 tiles/s.
   - Key and pad bindings are PROPOSED. Keys: Q jump, Shift/K dash, J hit, L blast, C calm, T transform, 1/2/3 ROOT/CORE/CROWN.
   - Touch: a MELLA button opens an 8-button power pad.
   - A HUD at top-left shows energy, stamina, CCR stability and Veyru's bond.
2. **The Mella follower is removed.** It is disabled (`YOUR_V20.mella.vis=false`), not deleted.
   - The Mella LLM persona sheet is marked disabled and reframed: "you are the MELLA".
   - Sikee is unchanged.
3. **Veyru (KAW, Rainroot Lynx, Water+Plant, `kaw-veyru-001`) is now the follower.**
   - Art: the temp 64px side-view cells (`your/assets/kaw/veyru/`). The left walk is the right walk mirrored.
   - Up/down: the side-view frames are used and labelled `kaw_ud_placeholder`.
   - Veyru has a talk sheet (narration only, Veyru never speaks words), a Calm action and a bond meter (start 20, PROPOSED).
   - Jobs, skate and assists now credit Veyru (PROPOSED).
4. **Profile `wir.hero/1` v1.2** has an optional `kaw` field (id, name, species, elements, bond 0–100, since). It is backward compatible: older readers drop the field, and the `your:kaw_veyru` unlock is also written for them. The schema doc addendum is in `your/docs_v121/HERO_PROFILE_SCHEMA.md`.
5. **Phone pocket-drill "PAUSED" bug fixed.**
   - Cause: Valence calls `FB.frame.focus()` about 400 ms after a command. That causes a blur, and the blur triggers `autoPause()`.
   - Fix (`football.html` PHONE_PAUSE_FIX): ignore that blur pause for 5 s after a command, unless the user has touched the frame.
   - Result: 0 paused samples on portrait and landscape.

Build script: `tools/build_v22.py` runs build_v21 and then the v22 patches.

## QA (Playwright; desktop 1280×800, portrait 390×844, landscape 844×390)
| Suite | Result | Notes |
|---|---|---|
| v2.2 new (`qa/run_v22_qa.js`) | **95/95** | Zero console errors on all 3 viewports. 18 screenshots in `qa/screenshots_v22/`. Provenance and sha checks pass. |
| v2.1 regression on v22 | **74/75** | The only failure is "title marks v2.1", which is expected because the title is now v2.2. |
| v2.0 regression on v22 | 131/136 | All 5 failures are expected: they test the Mella follower (drawn at home, follows, E talks, phone "hero + Mella drawn" ×2), which v2.2 removes on purpose. |
| v1.2.1 e2e | 145/145 | B01–B15 OK, static OK. |

**Flaky test, not caused by v22:** the v2.1 "game · hero at QB" tests sometimes fail.
- An untouched v21 copy gave 21/21, 18/21 and 20/21 on the game-only trimmed run.
- v22 gave the same kind of mix, and the last full v2.1 run on v22 passed every game test.
- Likely cause: keyboard focus timing into the football iframe under headless Chromium.

Contact sheet: `qa/V22_CONTACT_SHEET.png`. Best shots: `qa/screenshots_v22/03_city_hero_veyru_follow.png` and `qa/screenshots_v22/09_power_living_circuit.png`.

## PROPOSED (not from source data)
- The V7→Valence scale
- Key and pad bindings
- The circuit is limited to once per day
- The Veyru bond rules (start 20, +2 on talk/choose)
- Veyru follow gap 1.25 / snap 7
- The V7 KoPani assists remapped to Veyru

## Open gaps
- No real 4-direction Veyru art. Up/down uses placeholder side-view frames; see the prompt below.
- Hit and Blast have no targets in the city yet. They are visual and stat only.
- Nimbus lanes are labels only. There is no Valence Star or Divine-12 combat.
- Older profile modules (v1.1 and earlier) drop `kaw`. Only the unlock flag survives.
- Where Veyru's art came from is UNKNOWN (taken from the KAW intake; no license note).
- The 9 football stand-in poses from v2.1 are still there.
- The v2.1 game-section test is flaky (see above).
- The Mella Passport is not integrated (deferred).

## ChatGPT prompt — full Veyru 4-direction walk sheet
Attach `kaw-mella/assets/veyru/Veyru_idle.png` and `kaw-mella/assets/veyru/VEYRU_16_FRAME_PREVIEW.png`.

> Flat 2D pixel-friendly game sprite sheet of the SAME creature as the attached reference (Veyru, a Rainroot Lynx with water and plant traits): soft rounded shapes, the same fur colors and leaf/water markings as the reference, dark brown outlines, gentle soft shadows, clean readable silhouette. Transparent background. One image, a 4-column × 5-row grid of equal square cells (overall aspect ratio 4:5), with even gaps and nothing crossing the cell borders. Row 1: walking toward the viewer (down/front), 4 walk-cycle frames. Row 2: walking left, 4 frames. Row 3: walking right, 4 frames. Row 4: walking away (up/back), 4 frames. Row 5: idle front, idle side, sit, happy bounce. The creature is the same size and centred in every cell, with its feet on the same baseline near the bottom of each cell. No text, no numbers, no labels, no logos, no humans. An original wildlife companion, not based on any existing franchise.

After you get it, slice it into 64×64 cells (a slicer is not written yet) and replace the `kaw_ud_placeholder` frames.
