# Y.O.U.R. v2.4 · KAW Living Brain for Veyru · PROPOSAL

Status: PR #1 merged to main by the owner. Follow-up PR #2 (draft, publish HOLD) carries the review fixes.

## What changes
- `your/v24/wir_kaw_living_brain.js`: unchanged copy of KAW_LIVING_BRAIN_v0.1 (sha256 prefix 99819ffcc1c3890f).
- `your/v24/your_v24.js`: wrapper. Motion is capped (2.6 tiles/s, 3.6 when far behind). No trail follow, no 7-tile snap.
- `your/v22/your_v22.js`: guarded hooks. Without v24, the old v2.2 behavior runs.
- `index.html`: loads v24 after v23.

## Controls
- H: call Veyru. Z: stay / at ease. Q is jump in v2.2, so it is not used.
- Touch: VEYRU and STAY buttons are added to the top of the existing v2.0 touch column `#yourMoves`. The column is bottom-anchored, so they sit above the overlay's X and A buttons.

## Relay 002 and 003 fixes
1. **Reachability.** Every move uses a bounded BFS route (`findRoute`, 20-tile window, 2000-node budget). An unreachable target is reported as motor `unreachable` and dropped. Tested with a walled-off target.
2. **Intent is preserved.** `state.activity` is the brain's choice and is never rewritten by the motor layer (a static test checks this). The motor reports what it is doing in `state.motor`: `route`, `search`, `approach`, `hold`, `return`, `unreachable`. Forage with no food stays forage while the motor searches.
3. **Affordances from the live map.** Water = tile 8 next to walkable ground. Rest = a ring around the HOME `bed` or `couch`. Food = a ring around the HOME `fridge` (kitchen). Nothing new is drawn.
4. **Touch layout.** Checked numerically at 390×844 and 844×390 in play-equivalent layout: no collision with the stick, the overlay buttons, the MELLA button, or the power panel. Visual check in play not done.
5. **Hero ID.** Validated on every tick. Until it resolves, Veyru does not tick, save or respond, and is hidden. A hero change resets the brain only. The store is keyed to hero and KAW ids (version 3).
6. **Preferred distance.** Within 6 tiles of the hero, Veyru may roam or rest. Beyond 6 it returns, unless a stay command is active. This is a preference, not a leash.
7. **Thirst.** The module lowers thirst whenever activity is `drink`, even far from water. The wrapper stops that drop unless Veyru is at a water spot.

## Bugs found while fixing
- The module's `decide()` overwrites `destination` every tick, so movement uses the wrapper's own `target`.
- A target flag set by the forage branch stopped the search from ever running. Fixed: only a route-motor target holds the branch.
- The hero ID check rejected IDs shorter than three characters (test IDs were too short; fixed in tests).

## Decisions (owner delegated)
- Bond below 30: Veyru never refuses. At or above 30, a refusal starts a 20 s cooldown.
- Stay window: 45 s (module default). Preferred social distance: 6 tiles.
- MELLA powers (2026-11-16): Hit and Blast stay effect-only in the city. Nimbus lanes off. Calm maps to Veyru's bond. The living circuit pays once per Valence day. Keys unchanged.

## Known gaps (not fixed)
- **Socialize is rarely chosen** under normal needs. With social need held high it works (tested).
- **Food is a stand-in.** The kitchen spot counts as eating. There is no food item in the world yet.
- **Forage and investigate** fall back to searching. The city map has no food or investigable objects.
- **Investigate is untested.** The brain rarely selects it.
- **Real play is not verified.** Everything above is headless. Speed, follow distance and touch feel are unverified on a phone.
- **Pre-existing overlap (v2.0, not changed here):** `yourSprint` and `yourBtn` overlap the overlay's X and A buttons in both orientations.
- **Walk speed and follow distance** are proposals, not tuned.
- Veyru's new states use the existing v2.2 sprite. Only idle is drawn when away.

## Tests
- `node your/v24/tests/v24_wrapper.test.cjs`: 20/20 passing, stable over repeated runs.
- B01–B15 browser pages: 94/94.
- Headless touch geometry at 390×844 and 844×390: zero new collisions.
