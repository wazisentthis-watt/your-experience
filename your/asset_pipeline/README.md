# Y.O.U.R. Integration Sprint 01: WIR sprite intake foundation

**Status:** PROPOSAL / Publish HOLD. Draft PR only. No changes to the live `index.html`, `football.html`, player art, saves, physics, controller mappings, or game scripts.

## Why this slice
The existing `your/modules/your_core.js` provides `YOUR.core.assets.load/get` and `your_character.js` provides `YOUR.SpriteSheet`. This opt-in registry uses those interfaces without replacing or patching them. `your/assets/SHEETS.json` describes the existing Mella and Sikee atlas metadata, including generated fallback frames. This registry deliberately **does not** treat those derived frames as authored sprite motion or treat filenames as proof of rights.

## Files
- `registry.v1.json`: source-identified, **review-held** examples of files already present in the public repository. The `git_blob_sha` is a Git object identifier, **not** a content SHA-256 or proof of rights. All original image bytes are untouched.
- `wir_sprite_registry.js`: browser/Node adapter. Validates IDs, relative asset paths, geometry, semantic frame bounds, hashes, approval, and image dimensions; exposes `validate`, `find`, `preflight`, `loadSheet`.
- `tests/asset_registry.test.cjs`: unit and negative-case tests with a synthetic approved fixture only. A synthetic fixture is **never** production approval.

## Local tests
`node --test your/asset_pipeline/tests/asset_registry.test.cjs`

## Explicit opt-in example (once a source is independently approved)
```html
<script src="your/modules/your_core.js"></script>
<script src="your/modules/your_character.js"></script>
<script src="your/asset_pipeline/wir_sprite_registry.js"></script>
```
`WIRSpriteRegistry.loadSheet(manifest, 'approved-id', YOUR)` resolves to a `YOUR.SpriteSheet` only when the metadata includes verified rights, SHA-256, and grid geometry and the actual image dimensions match. The caller must supply the manifest object, which works offline and does not require `fetch()` or a CDN. **Do not** automatically load `registry.v1.json` into the published game; its two existing entries remain review-held.

## Ten prioritized milestones, staged safely
1. First boot reliability: baseline smoke test, failure recovery. **Not changed.**
2. Master sprite registry: validation and review-held inventory scaffold. **First slice.**
3. Reusable sprite importer: safe opt-in adapter and tests. **First slice, not connected to live game.**
4. Four-direction animation coverage: verify native art, no fake mirrored/procedural frame claims. **Next.**
5. METAL movement: recover and validate source packets. **Not started.**
6. Mella movement: source audit before enabling atlas. **Next.**
7. Melee hit detection: preserve combat/Nimbus. **Not changed.**
8. Veyru hunger/thirst intent conflict: requires focused behavior PR. **Not changed.**
9. Gridiron: reconcile embedded images to inventory. **Not changed.**
10. SOURCE SIPHON: transfer one tested entity between 2 sections. **Not changed.**

## Acceptance before promotion
- Identify file source and ownership; record a real content SHA-256; verify exact atlas width/height, cell geometry, alpha, baseline and source-authored movement frames.
- Never mark derived Sikee fight transformations or fallback Mella fight/skate frames as original animation.
- Run automated registry tests, baseline game browser tests, iPhone/controller smoke tests, and save compatibility checks before introducing runtime script tags.
- Keep current live build and all unrelated art intact; submit any runtime wiring as a separate reviewable PR.

Audit baseline: https://docs.google.com/document/d/1mjm4ARIENCTIcBkrfSPi9ZCfgBD_CA2KK4K81H_C7oU/edit
Source hub: https://drive.google.com/drive/folders/1Ca2jfsAkI3yJncDSGdYwKhcx8zh3FCY3
Tracking: https://github.com/wazisentthis-watt/your-experience/issues/34
