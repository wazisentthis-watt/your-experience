# Y.O.U.R. Universe Integration · Sprint 01

Status: **PROPOSAL / PUBLISH HOLD** · Started 2026-11-21 · ORIGINAL-WIR

## Mission

Make **the same playable MELLA** travel HOME → **Living District** → **Morrow City** → Living District → HOME with one hero identity, working First Wish powers, physical Veyru companionship, and persistent arrival checkpoints. Morrow is a real city district in Y.O.U.R., **not an iframe or separate-game portal**. The first release target remains the existing 2D/2.5D presentation. No 3D engine migration in this sprint.

## Baselines checked on 2026-11-21

- Public repository wazisentthis-watt/your-experience, default main, live via GitHub Pages. README.md calls it v2.3; later changes exist on main and must be preserved. PR #17 merged city/HOME combat. Do **not** edit main in this sprint.
- Public your/v24/ contains a KAW Living Brain **different from** the your/v24/ directory in the separate v2.4-living source. Collisions require manual reconciliation, not a folder overwrite.
- Google Drive Y.O.U.R. v2.4-living r2 design: https://docs.google.com/document/d/1EUETbud2YB9ytfKfo4Z3qQQ7jx2m-vs5yYRItP0LzLo/edit . Reports Living District, the Divider, 20 civilians, five supers, and Veyru rules; design-reported automated QA 156/156, plus 12/12 Valence/KAW and 91/91 legacy. These counts are from the source document, **not freshly rerun on a merged build**.
- Google Drive v2.4m Morrow absorption manifest: https://docs.google.com/spreadsheets/d/125Q55tOOCZUajW7MxyAXEr0_1BjsohEUxQ2kkqreQ34/edit . Public PR #17 explicitly says v2.4m is not in the public repo. Need inspect actual build files before merging.
- Google Drive Y.O.U.R. handoff: https://docs.google.com/document/d/1fkRRgA8tAhIFkzr3KHB0jjAwBMjpbOrEu9zcLtwg870/edit . The Passport (wir.passport/1) is a separate event-ledger design. **Never replace it with a new event-history format.**

## Implemented in this PR: thin arrival checkpoint contract

your/integration/section_handoff.js provides WIRSectionHandoff.create(window.WIR_HERO) (browser) or a CommonJS import (Node).

- Legal routes: HOME ↔ LIVING_DISTRICT ↔ MORROW_CITY; no fabricated direct HOME → Morrow shortcut.
- prepare({from,to,exitId,entryId}) creates an immutable travel intent for an **existing** wir.hero/1 identity. It does not save or teleport anything.
- The destination engine resolves a **real walkable spawn**, then calls confirmArrival(ticket, {arrived:true,section,entryId,x,y}); only after that does a small checkpoint go under games.your_universe.data.checkpoint. The source engine must not tear down before the destination confirms readiness.
- resume() reads the checkpoint for post-reload routing. All other game data and the optional KAW field remain untouched. No extra localStorage key, no new hero, no Passport event writer.
- Veyru is never moved or authorized by this module. The world-specific KAW adapter must enforce leave-house request, refusal, physical travel, and boarding checks. A checkpoint does not create companion presence.
- This contract is **not yet loaded in index.html**. It is non-invasive groundwork; no claim of playable multi-district movement is made.

**Node check:** node your/integration/tests/section_handoff.test.cjs (13 contract checks). Unit-check success does not replace browser / iPhone / hardware-controller QA.

## Development sequence and acceptance gates

| Phase | Implementation | Must pass before next phase |
|---|---|---|
| 0. Preserve | Snapshot main, record source hashes, isolate the Living/Morrow copies, classify original-vs-third-party asset provenance | Existing city, HOME, combat, Gridiron, and Veyru behavior remain unchanged |
| 1. Contract | This PR's arrival checkpoint; adapt the existing wir.hero/1 without introducing a competing Passport ledger | Unit checks, profile no-data-loss tests |
| 2. Living integration | Import *reviewed* CCE 2.0 sources with a nonconflicting directory name; bring Living District in as the default city | Living week simulation, ignored events, damage/repair, the Divider, desktop/phone controls |
| 3. Morrow integration | Import and IP-review Morrow v2.4m sources; mount its districts and METAL ally into the same world architecture | Reach Morrow with same MELLA, preserve powers/ally and no loading into another standalone game |
| 4. Companion continuity | Reconcile public v24 KAW wrapper with Living KAW adapter | D1–D5, no snap teleport, refusal, reload and house-return cases |
| 5. Gameplay content | One Morrow co-op objective, one Living District incident, trip home, art-frame ownership and animation checks | Interaction, damage, quest results and shared checkpoint survive reload |
| 6. Publication decision | Inspect licenses/IP; run all fresh suites, no external requests, phone portrait/landscape, hardware controller, complete smoke run | Only owner-approved merge to main, while release remains HOLD until then |

## Integration checklist for source owners

- [ ] Retrieve current v2.4-living r2 executable source (not only its design doc), including living.html, your/v24/cce_core.js, living.js, and QA suite.
- [ ] Retrieve current v2.4m executable source and mission content (your/morrow/), plus QA result, actual asset manifest and quarantined-IP list.
- [ ] Compare rather than replace conflicting your/v24/ trees; keep Nimbus combat module **byte-identical**.
- [ ] Inventory routes, spawn anchors, and destination walkability on both maps.
- [ ] Hook the section handoff only after destination engines implement safe arrival confirmation.
- [ ] Map controls by context; protect jump, skate, fly/drive, history and Veyru call from overlapping bindings.
- [ ] Build one mandatory end-to-end playtest: HOME → Living incident → ask Veyru → Morrow objective with METAL → Living → HOME → reload.
- [ ] Add automated save-conflict, failed-arrival, interrupted transition, and low-storage cases.
- [ ] Run browser smoke on desktop, iPhone portrait/landscape and physical Bluetooth controller; retain screenshots and logs.

## Not implemented by this sprint

The section map/router UI, Living District or Morrow engine code, the Mella Passport ledger integration, controller remapping, scene artwork, real-device testing and publish approval. No unverified test total is claimed for these.

**Owner control:** A draft PR is review material only. Do not merge, deploy, or publish this work until approved.
