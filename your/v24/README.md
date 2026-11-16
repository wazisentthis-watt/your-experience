# Y.O.U.R. v2.4 · KAW Living Brain for Veyru · PROPOSAL

Status: PR #1, draft (publish HOLD). Needs owner review before it ships.

## What changes
- `your/v24/wir_kaw_living_brain.js`: unchanged copy of KAW_LIVING_BRAIN_v0.1 (sha256 prefix 99819ffcc1c3890f).
- `your/v24/your_v24.js`: wrapper. Veyru moves at a capped speed (2.6 tiles/s, 3.6 when far behind). No trail follow and no 7-tile snap.
- `your/v22/your_v22.js`: guarded hooks. If v24 is not loaded, the old v2.2 behavior runs.
- `index.html`: loads v24 after v23.

## Controls
- H: call Veyru (leave the house, or come to you when out).
- Z: stay / at ease. Q is jump in v2.2, so the brain's suggested Q key is not used.
- Touch: on-screen VEYRU and STAY buttons (bottom right, `#kawTouch`), because phones have no H/Z keys.

## Relay 002 fixes
1. **Placement.** A real map change places Veyru beside the hero (transition). Ordinary frames never teleport it. Tested both ways.
2. **Targets.** `explore` roams to walkable points (around the hero when accompanied, so the companion stays in range). `socialize` approaches the hero and stops at the gap. `forage` has no food objects yet, so it falls back to roaming and is recorded in `state.incomplete`.
3. **Obstacles and long runs.** Movement checks walkability with an axis-slide fallback. Tests cover a wall, a 10-minute run with the hero standing still, and mobile touch.
4. **Save consistency.** The brain store is keyed to the hero id and the KAW id (`wir-kaw-brain-v24`, version 2). A different hero or an old or corrupt store resets only the brain. The hero profile is never written by the brain. Bond is read from the profile every frame.
5. **Hazard.** `hazard` comes from `YOUR_V23.foes` (not downed) and `YOUR_V23.boss` (not done): 80 within 4 tiles, 35 within 8, otherwise 0. Units are the same tile coordinates the hero uses.

## Bug found while fixing
The module's `decide()` rewrites `state.destination` on every tick. Movement therefore uses the wrapper's own `state.target`. Before this fix, roaming never moved.

## Decisions (owner delegated, see KAW_LIVING_BRAIN_v0.1 §7)
- Bond below 30: Veyru never refuses. A refusal at or above 30 starts a 20 s re-ask cooldown.
- Stay window: 45 s, from the module default.
- MELLA powers (2026-11-16): Hit and Blast stay effect-only in the Valence city. Nimbus lanes stay off. Calm maps to Veyru's bond. The living circuit pays once per Valence day. Keys stay as they are.

## Known gaps (not fixed in this PR)
- **Socialize is almost never chosen under normal needs.** In a 20-minute simulation with the hero standing still it was never picked. It is only exercised when social need is held high. The needs curve needs tuning, and that is a design decision for the owner.
- **Forage and investigate have no targets.** Both fall back to roaming. There is no food or investigable object in the world yet.
- **Investigate is untested.** The brain rarely selects it, and the test harness cannot force it.
- Walking speed and follow gap are proposals, not tuned.
- Veyru's new states use the existing v2.2 sprite. Only idle is drawn when away.
- No v2.3 raid test in this PR.
- Real-play feel (movement, touch layout on a real phone) is not verified. Only headless checks ran.

## Tests
- `node your/v24/tests/v24_wrapper.test.cjs`: 17/17 passing, stable over three runs.
- Headless touch check on `index.html` at 390×844: VEYRU button present, tap shows the toast, no page errors.
- B01–B15 browser pages: see the PR description for the latest run.
