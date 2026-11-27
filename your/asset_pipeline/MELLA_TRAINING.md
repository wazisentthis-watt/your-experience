# WIR Mella Movement Trial, actual playable movement, NOV 2026

This live Y.O.U.R. feature is a **controllable training course**, not another gallery or a replacement for the owner's avatar. The source Mella atlas already exists at your/assets/mella/mella_sheet_96.png. It is 1536x672, PNG RGBA 8-bit, 16x7 cells at 96x96. It was visually inspected before this change. Existing source descriptions: your/assets/SHEETS.json, source WIR Third Door Studio v1.1; row 2 left is a source fallback duplicate of row 3 right. No art is overwritten, and generated fight/skate transforms are not represented as authored movement.

HOW TO PLAY: Open the main Y.O.U.R. experience > FREE LIFE > DO (Phone) > SPRITES > PLAY MELLA. Move with arrows / WASD / gamepad left stick or D-pad / on-screen direction buttons. Collect the three turquoise markers, avoid obstacles, reach the exit. Return to studio by Back to Studio, then Close to phone/city. Restart course button available.

TECH: one passive game module JS added after existing Sprite Studio script. Deterministic update with dt cap, normalized diagonal movement, circle vs AABB collision, axis-separated movement, collision bounds, three pickups, unlocked exit. Responsive canvas, keyboard/touch/gamepad, preserved source atlas dimensions. Read-only trial; no save data touched. Mella left-facing fallback explicitly identified; original game character remains visually unchanged.

TESTS: module tests in your/asset_pipeline/tests/mella_training.test.cjs. Node test runner: node --test your/asset_pipeline/tests/mella_training.test.cjs. Tests cover bounds, collisions, diagonal speed, pickup gating, finish, animation source cell offsets, manifest image dimensions, and module side effect safety. Mobile/gamepad graphical smoke checks are additional runtime gates and should not be claimed as completed solely from headless tests.

ROLLBACK: remove the new script tag from index.html; no core module changes needed. Live feature release is authorized by the studio owner; source art remains original, no new permissions or copyrights are inferred.

NEXT: Wire additional confirmed original WIR frames into the *main city player and NPC animation layers* after reconciled character identity and provenance. This trial does not claim the entire 874-frame Mella library is now playable.
