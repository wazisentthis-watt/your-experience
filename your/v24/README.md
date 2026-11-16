# Y.O.U.R. v2.4 · KAW Living Brain for Veyru · PROPOSAL

Status: draft PR, not published. Needs owner review before it ships.

## What changes
- `your/v24/wir_kaw_living_brain.js`: unchanged copy of KAW_LIVING_BRAIN_v0.1 (sha256 prefix 99819ffcc1c3890f).
- `your/v24/your_v24.js`: wrapper. Veyru now moves by a capped speed (2.6 tiles/s, 3.6 when far behind). No trail follow and no 7-tile snap.
- `your/v22/your_v22.js`: six guarded hooks. If v24 is not loaded, the old v2.2 behavior runs.
- `index.html`: loads v24 after v23.

## Controls
- H: call Veyru (leave the house, or come to you when out).
- Z: stay / at ease. Q is jump in v2.2, so the brain's suggested Q key is not used.

## Decisions (owner delegated these, see KAW_LIVING_BRAIN_v0.1 §7)
- Bond below 30: Veyru never refuses (decision 2).
- A refusal above bond 30 starts a 20 s re-ask cooldown.
- Stay window: 45 s, from the module default.

## Known gaps
- Walking speed and gap values are proposals, not tuned.
- Art for Veyru's new states is the existing v2.2 sprite set. Only idle is drawn when away.
- No v2.3 raid test. Not in scope for this PR.

## Tests
- `node your/v24/tests/v24_wrapper.test.cjs` (9 passing, Node only).
- B01–B15 browser pages: 94/94 passing.

## MELLA powers: decided (owner delegated, 2026-11-16)
- Hit and Blast stay as effect-only moves in the Valence city. Combat is arena-only (v1.2.1 FaFiFi rules).
- Nimbus lanes (Valence Star shells, Divine-12, lane damage) stay off until the owner picks a scope.
- Calm and the CCR bond boosts stay mapped to Veyru's bond (KoPani's trust numbers moved over).
- The living circuit pays once per Valence day, not once per run.
- Keys stay: Q jump, J hit, L blast, C calm, T transform, 1/2/3 ROOT/CORE/CROWN, Shift/K dash, H call Veyru, Z stay.
