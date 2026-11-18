# RIFFT COURIER / 01

**What Is Reality × PHATOM** • Experimental browser game • PROPOSAL / PUBLISH HOLD until owner reviews the draft PR.

## Play
This directory contains a complete static web game. Open `index.html` in a browser, or serve the directory through GitHub Pages after approval. Game entrypoint: `rifft-courier/index.html` from the repository root.

**Controls**

| Action | Keyboard | Controller | Touch |
|---|---|---|---|
| Move | WASD / arrows | Left stick | Direction arrows |
| Cast elemental pulse | Space | A | CAST |
| Change element | E | Y | Power |
| Dash | Shift | B | DASH |
| Pause | P / Escape | Start | Pause button |
| Menu select | Enter / Space on focused button | Start / A | Tap |

## Game
Three WIR-inspired districts: Morrow City silver rain, WishBorn root garden, and Elemental Gridiron ion field. Recover six fragments; use ROOT, METAL, and ION powers to move roaming hazards away. The opening story is an original WIR-inspired experiment, **not a canon lock**. The game stores local progress in your browser via localStorage; it has no server accounts and no multiplayer.

## Source/rights
Only three text files of the proposed game are included: `index.html`, `experience.css`, and `experience.js`. All visible game art is currently procedurally generated. No private PHATOM agent source, secrets, Google Drive files, sprite image bytes, or recovered asset manifest are copied to the public candidate. No remote scripts, data fetches, analytics or third-party libraries are required.

## Publish through GitHub Pages
After review and merge to this public repository's `main` branch, confirm **Settings → Pages** publishes from `main` and `/ (root)` (or a workflow that includes this directory). The expected URL path will be `/your-experience/rifft-courier/`. This URL is **not verified live** on this branch. If Pages is configured differently, adapt the release path accordingly.

## Verification
A GitHub connector readback compared the three proposed public files byte-for-byte at the text level against the private PHATOM development branch. Thirty static checks passed on 2026-11-18. This does **not** establish browser, Safari, iPhone, touch, audio unlock, accessibility, or gamepad runtime correctness. Those require real device/browser acceptance before describing the release as fully tested.

## Rollback
Revert the public PR after merge or remove the `rifft-courier/` directory. The existing Y.O.U.R. game source remains untouched.
