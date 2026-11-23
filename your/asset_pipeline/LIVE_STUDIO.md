# Live WIR Sprite Studio (Y.O.U.R. root)

**Deployment:** Live user-facing sprite-preview feature added by a short opt-in script at the bottom of root index.html. This is not full character gameplay integration.

**Open:** Start Y.O.U.R., tap DO to open Phone, then tap SPRITES in the Phone header. Choose YOUR HERO or MELLA, direction, and IDLE/WALK/CAST where available. Touch, arrows/WASD, and compatible gamepads. Close returns to the Phone. No extra buttons are added to the city.

**Source:** Uses existing published your/assets/hero/hero_sheet_96.png and your/assets/mella/mella_sheet_96.png. Original art files are unchanged. Atlas layout follows existing your/assets/hero/HERO_SHEET.json and your/assets/SHEETS.json; this is documented metadata, not independent provenance or rights approval.

**Truthful classification:** HERO has documented native walk rows down,left,right,up. MELLA down/up/right are source-documented native rows; left is a fallback duplicate of right, clearly marked. Generated fight/skate rows are not included. Hero cast is unavailable. The viewer rejects unexpected image dimensions instead of stretching.

**No save or gameplay changes:** Read-only. Does not change wir.hero/1 or character appearance during gameplay.

**Testing:** node --test your/asset_pipeline/tests/live_sprite_studio.test.cjs. Pure frame/bounds checks evaluated before commit. Visual browser, phone and controller smoke checks are release follow-ups, not yet claimed.

**Rollback:** Remove one script tag from root index.html; no save, art, combat, or other game modules are modified.

**Follow-up:** Verify source art and native authored animation frames before wiring approved packets to actual player/NPC movement. Do not count this viewer as additional gameplay sprite coverage.
