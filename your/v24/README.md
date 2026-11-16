# Y.O.U.R. v2.4 · KAW Living Brain for Veyru · PROPOSAL

Status: PR #1 merged to main by the owner. PR #2 (draft, publish HOLD) carries the review fixes. Not merged, not deployed.

## What changes
- `your/v24/wir_kaw_living_brain.js`: the active module. Changed only by the approved `canDrink` flag (see Relay 007).
- `your/v24/wir_kaw_living_brain.v0.1.orig.js`: the untouched original (sha256 prefix 99819ffcc1c3890f). Kept for comparison.
- `your/v24/your_v24.js`: wrapper. Motion is capped (2.6 tiles/s, 3.6 when far behind). No trail follow, no 7-tile snap.
- `your/v22/your_v22.js`: guarded hooks. Without v24, the old v2.2 behavior runs.
- `index.html`: loads v24 after v23.

## Controls
- H: call Veyru. Z: stay / at ease. F2: debug status line (off by default). Q is jump in v2.2, so it is not used.
- Touch: VEYRU and STAY are added to the top of the existing v2.0 touch column `#yourMoves`.
- While the touch overlay is on screen, the column and the MELLA panel `#yourPowers` are lifted above the overlay's button band (a rule injected by v24, scoped to the overlay canvas). Desktop, with no overlay, is unchanged. The v2.0 and v2.2 sources are not edited.

## Relay 007 (this round)
1. **Thirst flag (approved).** The module's thirst drop on `drink` now needs `context.canDrink === true`. A caller that omits the flag keeps the v0.1 behavior, so older callers and saved states are unchanged. The wrapper always passes an explicit `canDrink`, true only while Veyru is drinking next to live water. The old thirst clamp in the wrapper is gone. Natural thirst rise continues when water is not available.
2. **Change log.** The change is written in the module header and in the diff against `wir_kaw_living_brain.v0.1.orig.js`. A test checks the module and the original match step for step when no flag is passed.
3. **Water lost mid-drink.** The wrapper reads water from the live map, not the cached affordance list. The affordance cache also expires every 2 seconds. Tested: drinking stops counting the moment the water is drained, and thirst then only rises.
4. **Save and reload.** Tested during navigation (the brain resumes and still reaches water) and after drinking (thirst is the same after reload, with no reset or free refill).
5. **Per-hero store.** Already in place from relay 004. Each hero keeps its own brain record, so MELLA companion memories do not disappear when a profile changes.
6. **Bugs found by the simulated day, fixed:**
   - The route search stopped 20 tiles from Veyru, so water farther away was reported unreachable and she never drank. The search now covers the whole map, with the map area as its node budget.
   - Waypoint steps could overshoot at large dt (for example 0.25 s), then walk back, forever. Steps are now clamped to the distance to the waypoint.
   - A trip already under way is finished before the intent can redirect it. Without this, Veyru walked back and forth between the fridge and the water.
   - After a resource satisfies a need, Veyru holds at it for 4 seconds (`CFG.dwell`, proposed). Intent is untouched; only the motor holds.
   - A route left in place after arrival blocked new trips. Arrival now clears it.
7. **MELLA panel.** The panel was at the same bottom edge as the column and covered the overlay's X, Y, A and B buttons at every size. It is now lifted with the column while the overlay is on. The panel does not overlap any Veyru control (VEYRU, STAY, MELLA).
8. **Debug status (F2).** One line: intent, activity, motor, hunger, thirst, rest, social, and the last outcome.
9. **Socialize and investigate (investigated, not changed).**
   - Investigate has no score term in `choose()`, so the brain can never pick it. Adding one would mean inventing a signal the world does not have yet.
   - Socialize scores `socialNeed × sociability/100 × 1.4`. With default traits (sociability 55) it must beat a watch baseline of about 32, which needs social need above roughly 41. Hunger and thirst usually sit higher, so socialize rarely wins. I did not raise its probability.

## Simulated day (`your/v24/tests/v24_simulated_day.cjs`)
One simulated day, 0.25 s steps, on a HOME map with a fridge, a bed and a water channel.
- **Holds (hard checks, exit 1 on failure):** every need stays within 0 to 100; Veyru never stands on a blocked tile; no need falls without its satisfied resource.
- **Water:** 1,417 satisfied steps. Thirst falls at the shore and rises elsewhere.
- **Food:** only 5 satisfied steps. Open finding (below).
- **Rest:** the bed is never satisfied. Open finding.
- **Activity share:** drink 76%, forage 24%, home 0.1%. Socialize and investigate never chosen.

## Open findings (not fixed, need a decision)
- **Intent flips every few ticks between forage and drink.** The two needs sit near 100 with near-equal scores, and per-tick jitter (up to 1.5) decides the winner. Hunger only falls on a tick where the intent is `forage` at the fridge, so she reaches the fridge and leaves before eating. Needs then saturate at 100, and rest never wins. The fix is intent hysteresis in the module's `choose()`. That is a module behavior change, so it needs your approval. It would be a backward-compatible flag, off by default.
- **Food is a stand-in.** Standing at the fridge counts as eating; there is no food item in the world yet.
- **Investigate has no score term** (see item 9). **Socialize is rarely chosen** under normal needs.

## Relay 004 (previous round)
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
- **Socialize is rarely chosen** under normal needs. It works when social need is held high (tested).
- **Investigate is untested.** The brain rarely selects it, and the city map has no investigable objects.
- **Affordance cache** is keyed by map id and expires every 2 seconds. Water is also read live, so drained water stops counting at once.
- **Real play is not verified.** All checks are headless. Speed, follow distance and touch feel are unverified on a phone.
- **The overlay is not in `index.html`.** `your/modules/your_input.js` (the stick and X/A/Y/B overlay) is loaded by the standalone game and runner pages, not by `index.html`. The clearance check adds it to measure the composition. The lift rule applies only when the overlay is shown.
- **Pre-existing v2.0 overlap, now cleared by the lift rule while the overlay is shown.** The fix is in v24, not in `your_v20.js`. Whether the owner wants the v2.0 buttons repositioned in their own source is a decision for the owner.
- **`yourPowers` (MELLA panel)** is not measured. It is hidden until MELLA is opened.
- **Walk speed and follow distance** are proposals, not tuned.

## Tests
- `node your/v24/tests/v24_wrapper.test.cjs`: 35/35 passing (this round).
  - New this round: the module-vs-original compatibility check; the canDrink flag; water lost mid-drink; no water at all; save and reload during navigation; thirst kept across reload; debug line.
- `node your/v24/tests/v24_touch_clearance.cjs` (Playwright, headless Chromium): run this round in four sizes, as shipped and with the overlay added, with the MELLA panel open.
  - As shipped (no overlay on screen): no overlaps, no off-screen controls.
  - With overlay shown: no overlaps and no off-screen controls at 390×844, 844×390, 768×1024, 1024×768. Before the MELLA panel fix there were 18 overlaps across these sizes.
  - Control run with the lift rule removed (`NO_LIFT=1`): overlaps return, so the rule is what clears them.
- `node your/v24/tests/v24_simulated_day.cjs`: hard checks pass; open findings printed (above).
- B01–B15 browser pages: 94/94 in an earlier round. Not rerun this round; they load the v2.x runner pages, not v24.
