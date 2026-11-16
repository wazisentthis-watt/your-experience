# Y.O.U.R. v2.4 · KAW Living Brain for Veyru · PROPOSAL

Status: PR #1 merged to main by the owner. Follow-up PR #2 (draft, publish HOLD) carries the review fixes. Not merged.

## What changes
- `your/v24/wir_kaw_living_brain.js`: unchanged copy of KAW_LIVING_BRAIN_v0.1 (sha256 prefix 99819ffcc1c3890f).
- `your/v24/your_v24.js`: wrapper. Motion is capped (2.6 tiles/s, 3.6 when far behind). No trail follow, no 7-tile snap.
- `your/v22/your_v22.js`: guarded hooks. Without v24, the old v2.2 behavior runs.
- `index.html`: loads v24 after v23.

## Controls
- H: call Veyru. Z: stay / at ease. Q is jump in v2.2, so it is not used.
- Touch: VEYRU and STAY are added to the top of the existing v2.0 touch column `#yourMoves`.
- While the touch overlay is on screen, the column is lifted above the overlay's button band (a rule injected by v24, scoped to the overlay canvas). Desktop, with no overlay, is unchanged. The v2.0 source is not edited.

## Relay 004 (this round)
1. **Hunger and thirst need the resource.** Hunger falls only when the outcome is `satisfied` (at the fridge spot). Thirst falls only at a water shore. The module's rule that lowers thirst on any `drink` activity is cancelled away from water, and the cancel now keeps the natural rise (it used to hold thirst flat, which also hid the rise).
2. **Rest.** The HOME bed or couch is preferred. If no rest spot is reachable, Veyru rests in place, and the outcome reports `place: 'in place'` with `satisfied: false`.
3. **Navigation.** The bounded BFS (`findRoute`) is the same approach as the game's `findPath` in `index.html`, which is a closure and is not exposed, so it is re-implemented with a 20-tile window and a 2000-node budget. Routes are cached per goal and rebuilt when the next step is blocked or the goal changes.
4. **Intent, target, action, outcome are separate.** `state.activity` (intent), `state.target` (where), `state.motor` (what it is doing now), and `state.outcome` (`{intent, motor, need, satisfied, place}`, readable through `YOUR_V24.outcome()`).
5. **Touch clearance.** See "Tests" below. The overlay's X, A, Y and B buttons and the stick clear the column at 390×844, 844×390, 768×1024 and 1024×768, with the overlay shown.
6. **Hero identity.** The store is now one record per hero (`heroes[id]`, version 4). Switching heroes saves the outgoing brain first and loads the incoming hero's own brain. The earlier single-record store overwrote the other hero's brain on each switch. The test caught it.

## Relay 002 and 003 fixes (still in place)
1. **Reachability.** Every move uses a bounded BFS route. An unreachable target is reported as motor `unreachable` and dropped.
2. **Intent is preserved.** The motor layer never rewrites `state.activity` (static test). Forage with no food stays forage while the motor searches.
3. **Affordances from the live map.** Water = tile 8 next to walkable ground. Rest = a ring around the HOME `bed` or `couch`. Food = a ring around the HOME `fridge`. Nothing new is drawn.
4. **Hero ID.** Checked on every tick. Until it resolves, Veyru does not tick, save or respond, and is hidden.
5. **Preferred distance.** Within 6 tiles of the hero, Veyru may roam or rest. Beyond 6 it returns, unless a stay command is active. A preference, not a leash.

## Bugs found while fixing
- The module's `decide()` overwrites `destination` every tick, so movement uses the wrapper's own `target`.
- A target flag set by the forage branch stopped the search from ever running. Fixed: only a route-motor target holds the branch.
- Thirst clamp (relay 004): the clamp reset thirst to its pre-tick value, which cancelled the natural rise. Fixed.
- Single-record store (relay 004): switching heroes overwrote the other hero's brain. Fixed with per-hero records.
- Touch geometry (relay 004): the earlier "no collisions" claim measured formula circles without showing the real overlay. The real overlay did overlap the column (13 overlaps across four sizes). Fixed with the lift rule. The control run without the rule reproduces the 13.

## Decisions (owner delegated)
- Bond below 30: Veyru never refuses. At or above 30, a refusal starts a 20 s cooldown.
- Stay window: 45 s (module default). Preferred social distance: 6 tiles.
- MELLA powers (2026-11-16): Hit and Blast stay effect-only in the city. Nimbus lanes off. Calm maps to Veyru's bond. The living circuit pays once per Valence day. Keys unchanged.

## Known gaps (not fixed)
- **Food is a stand-in.** Standing at the kitchen fridge spot counts as eating. There is no food item in the world yet. Hunger falls only at that spot.
- **Thirst clamp lives in the wrapper.** The clean fix is a `hasWater` flag in the vendored module. That changes `wir_kaw_living_brain.js`, so it needs owner approval.
- **Socialize is rarely chosen** under normal needs. It works when social need is held high (tested).
- **Investigate is untested.** The brain rarely selects it, and the city map has no investigable objects.
- **Affordance cache** is keyed by map id. It does not track objects whose state changes.
- **Real play is not verified.** All checks are headless. Speed, follow distance and touch feel are unverified on a phone.
- **The overlay is not in `index.html`.** `your/modules/your_input.js` (the stick and X/A/Y/B overlay) is loaded by the standalone game and runner pages, not by `index.html`. The clearance check adds it to measure the composition. The lift rule applies only when the overlay is shown.
- **Pre-existing v2.0 overlap, now cleared by the lift rule while the overlay is shown.** The fix is in v24, not in `your_v20.js`. Whether the owner wants the v2.0 buttons repositioned in their own source is a decision for the owner.
- **`yourPowers` (MELLA panel)** is not measured. It is hidden until MELLA is opened.
- **Walk speed and follow distance** are proposals, not tuned.

## Tests
- `node your/v24/tests/v24_wrapper.test.cjs`: 28/28 passing (this round, after the relay 004 changes).
- `node your/v24/tests/v24_touch_clearance.cjs` (Playwright, headless Chromium): run this round in four sizes, as shipped and with the overlay added.
  - As shipped (no overlay on screen): no overlaps, no off-screen controls.
  - With overlay shown: no overlaps, no off-screen controls, at 390×844, 844×390, 768×1024, 1024×768.
  - Control run with the lift rule removed (`NO_LIFT=1`): 13 overlaps. This confirms the rule is what clears them.
- B01–B15 browser pages: 94/94 in the earlier round. Not rerun this round; they load the v2.x runner pages, not v24.
