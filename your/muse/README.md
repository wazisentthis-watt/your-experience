# Muse — Living Neighborhood v1 · PROPOSAL / PUBLISH HOLD

Relay 005, Assignment 001 (World Art & Environment). Branch:
`feature/muse-living-neighborhood-v1`. Draft PR, publish HOLD.
No file under `your/v22/` or `your/v24/` is modified. No push to `main`.

## 1. Verified repository architecture (read at main @ 7e46581, 2026-11-16)

The live game is **WIR Valence Life v3 + Y.O.U.R. layers v2.0–v2.4**, all in
`index.html` (456,741 bytes) plus `your/` layers. It runs offline in the
browser: plain HTML/canvas/JS, no CDN, relative paths only.

| Piece | Verified finding |
|---|---|
| Live renderer | `index.html` `render()` on canvas `#cv`, 2d context, `imageSmoothingEnabled = false` except furniture. `T = 32` px per tile. Camera: HOME fits the whole map; cities clamp to ~11 tiles wide (`clamp(G.w / (11*T), 1.15, 2.4)`). Objects draw y-sorted via `draws[]` (`y = o.y + o.h`); foreground/background is that sort, not layers. |
| Live world | `G.map` in `index.html`. `MAPS.HOME` is **`buildHomeV2()` — 20×13**, not the 12×11 `buildHome()` (which is reassigned away at `MAPS.HOME = buildHomeV2()`). Cities are 44×32 (`buildCity`). Tiles: 0 grass, 1 wall, 2 road, 3 sidewalk, 4 wood, 5 bath tile, 6 tree (blocked), 7 plaza, 8 water (blocked), 9 dirt. `BLOCKING = {1, 6, 8}`. |
| Collision | `finishMap()` builds `m.block[]` from blocking tiles + object footprints (unless `o.walk`). `walkable(m,x,y)` indexes `m.block[y*m.w+x]` with the coords as given — **no flooring**: a fractional coordinate reads `undefined` and passes as walkable. See §5. |
| Interaction | `useSpot(o)`: explicit `o.use`, else nearest walkable ring tile. `openObj(o)`: `o.enter` → `enterMap`, `o.exit` → SAV, else a sheet of `o.acts` → `M.ACTS`. Doors: HOME front door (`exit: 'SAV'`, `use: [10, 11.5]`); SAV home building (`enter: 'HOME'`). Indoor/outdoor transition already works; this branch adds no new transition. |
| Furniture art (live) | HOME V2 objects use `draw: 'fur'` + `FURN` rects in `spr/life_furn.webp` (1024×512 atlas, cells ~63–124 px wide, 105–124 tall), drawn bottom-anchored by `drawFurn()` (`dw = o.dw * 2`). Buildings use procedural `bldgSprite()` (Kenney tiles `window.WIR_KENNEY` + `ST` styles, sign plate, awning, night window glow). Props (`lamp/bench/bin/hydrant/cart`) are `m.props`, drawn not blocking. Trees are tile 6, drawn 2 tiles tall via `drawTree()`. |
| Standalone engine | `your/modules/your_world.js` is the **v1.2.1 standalone** engine (TILE 32, string map, doors H/S/K/F/A, `YOUR.world`). It is **not** the live world. Do not wire art to it. Same for `your/modules/your_art.js` (ChatGPT screen slots, `YOUR.art`) — used by the standalone/hub screens, not by Valence `render()`. |
| Layers | v2.0 `your/v20/` (merge hook `window.YOUR_V20_INSTALL`, hands Valence internals to layers), v2.1 football, v2.2 MELLA kit + Veyru follow (hooks `V22.brainStep/brainPlace/brainMap/brainEnv`), v2.3 villains/raids + vendored Nimbus combat (do not edit), v2.4 KAW Living Brain (`your/v24/wir_kaw_living_brain.js` + wrapper `your_v24.js`, 28/28 tests). Script order in `index.html`: v20 config/shim → v22 llm → v20 → v21 → v22 config/js → Nimbus → v23 config/js → v24 brain + wrapper. This module loads after v24 and chains `YOUR_V20_INSTALL` exactly like v22/v23. |
| Characters | Hero/Mella sheets 96 px cells (`SHEETS.json`, `mella_sheet_96.png` 1536×672, 16×7). Veyru: 64 px right-facing walk strip, mirrored for left (`your/assets/kaw/veyru/`). |
| Profile | Shared hero profile `wir.hero/1`, localStorage `wir-hero-profile-v1` (`your/modules/wir_hero_profile.js`). KAW brain store `wir-kaw-brain-v24` v4, one record per hero. |

## 2. Visual asset inventory — what exists, what is missing

Existing (verified in the tree, 422 entries):

- **Neighborhood screens (ChatGPT art, `your/assets/chatgpt/`)**: `04_NEIGHBORHOOD_TOP_DOWN_MAP.png` (1672×941), `05_NEIGHBORHOOD_TILESET.png` (1254×1254), `06_STORE_INTERIOR.png`, `07_CRATES_AND_SHELVES_SPRITES.png` + cut sprites (`07_crate`, `07_shelf_full/empty`, `07_hand_cart`), `12_HUB_BG.png`, `13_SLEEP_DAY_END_BG.png`. These are **screen art, not wired into the live Valence renderer** — the live city draws from Kenney tiles + code. They are reference/start points, not in-game sprites.
- **Hero/Mella/Sikee**: full 96 px sheets + cut cells (`your/assets/hero/hero_cells/`, `mella/`, `sikee/`), portraits.
- **Veyru**: idle + 4-frame right walk, 64 px.
- **Furniture**: `spr/life_furn.webp` atlas (bed, fridge, sofa, stove, sink, shower, desk, tv, console, arcade, plant, garden tools, …). Third-party-style atlas, not original WIR art — this is what the live HOME currently draws.
- **City**: `spr/life_city.png` (592×448), `life_portal.webp`, football/leg sheets, `art/` combat poses.
- **Docs**: `your/assets/ASSETS.json` (placeholders), `SHEETS.json` (PROPOSAL_HOLD).

Missing (this assignment's list, status after this PR):

| Asked | Status |
|---|---|
| MELLA's home exterior | **Art delivered** (`home` cell in the sheet). **Not yet wired**: SAV `home` building draws via procedural `bldgSprite()`; wiring needs a `drawBuilding` hook (Phase 2). |
| Corner store, training facility, skate park, combat arena, small business storefront | **Not built.** Exteriors are procedural `bldg` objects today (market, gym, field, park, station exist as buildings with acts, not as sprite art). Spec in §3. |
| Bedroom / kitchen / living room interiors | **First slice built**: fridge + bed re-skinned, Roar Well added (§4). Full interior sets (desk, sofa, tv, stove, sink, shower, plant, garden) still use the atlas. |
| Fridge, bed, couch, trees, garden, water, sidewalks, roads, doors, windows, furniture, streetlights | Fridge/bed/water **built**. Couch: live object is `sofa`, not `couch` (§5). Trees/sidewalks/roads/doors/windows/streetlights: already drawn procedurally (tile 6 trees, tile 2/3 roads/sidewalks, `drawProp` lamps); no sprite replacements in this slice. |

## 3. Sprite specifications + art direction

Palette (from the live game + WIR purple/gold): deep purple `#5a2a8a`, teal
`#1f9e8a` / `#2b6a86`, gold `#ffcf6a`, cream `#e8e2ff`, wood `#3a2a1c`.
Style: flat pixel art, 3/4 top-down for furniture, straight-on for the house,
black 1-px outlines, no text, transparent background (flood-filled from the
borders; enclosed cream/teal interiors untouched).

Sheet: `your/assets/muse/muse_home_props.png` — **768×192, 4 cells of 192×192**,
bottom-aligned in each cell (feet/base on the cell bottom, like `drawFurn`):

| Cell | Prop | Raw | Cell draw | In-game draw |
|---|---|---|---|---|
| 0 | Fridge — purple body, teal doors, gold handles + kente magnet strip | 1120×2240, bbox 844×2067 | 78×192 | 40 px wide, ~98 px tall (matches the atlas fridge height) |
| 1 | Bed — dark wood frame, purple blanket, gold trim, cream pillow, teal throw | 1600×1600, bbox 1444×1427 | 192×190 | 92 px wide, ~91 px tall |
| 2 | Roar Well — blue fountain + terracotta jug on a teal/gold stand | 1600×1600, bbox 1422×1252 | 192×169 | 40 px wide, ~35 px tall |
| 3 | Home exterior — purple roof, cream walls, teal windows, gold door, potted plants | 1600×1600, bbox 1399×1444 | 186×192 | art only in this slice (not wired) |

Cell manifest: `your/assets/muse/muse_home_props.json` (raw sizes, bboxes,
scales). Raws preserved in the workspace under
`work/muse_assets_raw/` (not in the repo). Draw rule: same as `drawFurn` —
`dw = DRAW_W * 2`, height follows the cell aspect, bottom-anchored at
`(o.y + o.h) * T`, `imageSmoothingEnabled = true`. The fridge draw width was
cut 26 → 20 after the placement preview showed the taller raw cell poking
4 tiles high; the bed and water were kept.

Future cells use the same 192×192 grid, appended in order, with the manifest
updated — never re-order existing cells (the module addresses them by index).

## 4. What this PR implements (first playable target)

`your/muse/your_muse.js` (loads after v24; one `<script>` line in
`index.html`, no other `index.html` change):

1. **Fridge + bed re-skin.** At install, the live `MAPS.HOME` fridge
   (`11,2,2×2`) and bed (`2,2,3×3`) get `museArt` set. Same ids, tiles,
   acts, use spots, collision — only the picture changes. `drawObj` is
   wrapped (captured after the `buildHomeV2` reassignment): muse objects
   draw the sheet cell; everything else falls through to the original
   `drawObj`. If the sheet has not loaded, a small code-drawn fallback
   draws instead — the object is never invisible.
2. **Roar Well (new water source).** Object `muse_water` at HOME `(18,4)`,
   1×1 — a free kitchen tile (neighbours: aquarium `17,4`; wall `19,4`).
   Its tile is blocked in `map.block` the way `finishMap()` would have;
   its use spot comes from the existing `useSpot()` ring rule. New act
   `M.ACTS.drink` (PROPOSED: 0.25 h, Fuel +.06, Clean +.08 — a sip).
   Walk in, press E / tap it, drink.
3. **Object contract for Claude / KAW** — `window.YOUR_MUSE`:
   `objects(mapId)` returns one record per live object:
   `{id, mapId, x, y, w, h, type, use, actions, resources, asset, name, blocked}`.
   `use` is a walkable `[x, y]` interaction position (tile centres).
   `affordances(mapId)` returns `{water, food, rest}` spot lists in the
   same shape as `YOUR_V24.affordances()`: `{x, y, objectId, kind}`.
   Types: `fridge → food`, `bed/sofa/couch → rest`, `muse_water → water`,
   `sink/shower → prop` (wash only — **not** drink sources), `garden → food`
   (growing, not a stand-in spot).
4. **Sheet loading.** Tries `your/assets/muse/muse_home_props.png` first;
   if that 404s it loads the generated text mirror
   `your/muse/muse_home_props_data.js` (`window.YOUR_MUSE_PROPS_DATA`,
   base64 data URL, byte-identical to the PNG — verified in tests).
   The PNG itself cannot travel through the GitHub connector (text files
   only), so it must be uploaded via the GitHub website after the branch
   exists; until then the embedded copy carries the art. See §6.

First playable target, as specified: MELLA approaches the SAV home, enters
via the existing front door (`exit: 'SAV'` / `enter: 'HOME'` — already
working, unchanged), and interacts with a visually represented fridge, bed,
and water source. The fridge and bed keep their existing acts
(`cook/harvest/order`, `sleep/nap`); the water source adds `drink`.

## 5. Findings for Claude (KAW coordination — please confirm before either of us changes shared code)

Proposed contract (implemented in `YOUR_MUSE.objects()` / `affordances()`):

```js
{ id: 'muse_water', mapId: 'HOME', x: 18, y: 4, w: 1, h: 1,
  type: 'water', use: [18.5, 5.5], actions: ['drink'],
  resources: { drink: { available: true, kind: 'clean-water',
    note: 'Roar Well: unlimited clean water. M.ACTS.drink (PROPOSED).' } },
  asset: 'muse_home_props.png#water', name: 'Roar Well', blocked: true }
```

Two live-code facts that affect the KAW brain, found while inspecting:

1. **Sofa ≠ couch.** `your/v24/your_v24.js` `AFF_OBJ` maps `couch → rest`,
   but the live HOME V2 object is **`sofa`** (id `sofa`, fur `sofa`).
   Rest currently resolves only at the bed. This module's `affordances()`
   includes the sofa. **Proposed one-line v24 fix** (not applied here —
   v24 is out of scope for this branch): add `sofa: 'rest'` to `AFF_OBJ`.
   Claude: please confirm, or apply it on your side — I will not edit
   `your/v24/` without owner/Claude agreement.
2. **Fractional walk checks are bounds-only.** `V22.brainEnv().walk`
   passes `.5` coords straight to Valence `walkable()`, which indexes
   `m.block` with the fractional index (`undefined` → passes). So v24's
   BFS/affordance checks treat any in-bounds fractional tile as walkable,
   including blocked ones. This module floors tile coords before every
   `walkable()` call (`walkTile()`). If the brain keeps using fractional
   coords, its routes can step through furniture/walls on paper while
   `moveAlong`'s per-step `env.walk(nx, ny)` (also fractional) lets the
   KAW through. Suggest the brain floor coords the same way; happy to
   coordinate the exact change.
3. **Food is a stand-in** (v24 README): standing at the fridge spot counts
   as eating; no food item exists. The contract labels it `kind:
   'stand-in'` explicitly so no consumer mistakes it for an inventory.
   Same for drink until a thirst/water-item system exists: the Roar Well
   is unlimited clean water by design, not a consumable.

No shared code was changed in this PR. The interface above is additive
(`window.YOUR_MUSE`, new objects/act only).

## 6. Files in this PR

```
index.html                                   +1 line (load your_muse.js after v24)
your/muse/your_muse.js                       layer module (install chain, art, water, contract)
your/muse/muse_home_props_data.js            GENERATED base64 mirror of the sheet (227,679 bytes)
your/muse/README.md                          this file
your/muse/tests/muse_neighborhood.test.cjs   12 Node tests
your/assets/muse/muse_home_props.json        cell manifest (raw sizes, bboxes, scales)
your/assets/muse/muse_home_props.png         768x192 sheet — UPLOAD VIA GITHUB WEBSITE (binary;
                                             the connector pushes text files only)
```

## 7. Tests

`node your/muse/tests/muse_neighborhood.test.cjs` — **12/12 passing** in
this environment. Covers: install chain (previous install runs first);
fridge/bed re-skin with acts unchanged; Roar Well at (18,4), tile blocked,
`drink` act values; install idempotency; `walkTile` flooring (blocked tile
stays blocked at fractional coords); affordances (food at fridge, rest at
bed **and** sofa, water at Roar Well; tile-8 shores never on the water);
contract shape for every HOME object (all Relay 005 fields, use walkable +
adjacent, fridge asset ref, sink not a drink source); `drawObj` wrap
(water cell x=384, dw 40, no fall-through; plain objects fall through);
sheet-missing code fallback (object still draws); embedded data file
decodes to the real 768×192 PNG and byte-matches the shipped PNG; manifest
matches module cell order. `node --check` clean on both JS files.

Placement preview (Python composite of the real HOME V2 floor plan with the
sprite cells pasted at their real tiles, bottom-anchored): workspace
`work/muse_home_preview.png`. It is a composite, **not** a game screenshot.

## 8. Known limitations (not fixed here)

- **Real in-game screenshot / phone play: NOT DONE.** No headless browser
  is available in this environment (no Chromium/Firefox/Playwright), and
  the repo lesson stands: local-file live-click checks do not work from
  background preparation. The render path is verified by unit tests
  against the real install chain + real HOME layout, not by a live load.
  Needs a device or browser run: open the branch, enter HOME, check the
  fridge/bed/water draw, E on the Roar Well, and `YOUR_MUSE.status()`.
- **PNG upload pending** (see §6). Until it lands, art comes from the
  embedded data copy; the loader prefers the PNG file once present.
- **Home exterior art only.** SAV `home` still draws procedurally.
- **No new interiors/rooms.** Bedroom/kitchen/living-room are the one
  HOME map; no separate interior maps exist in the live game (the v1.2.1
  `your_world.js` POI doors are a different engine). Store/training/
  arena/skate-park art is Phase 2.
- **Food is a stand-in** (see §5). No food items, no inventory change.
- **Drink values are PROPOSED** (0.25 h, Fuel +.06, Clean +.08).
- **Veyru art unchanged** (64 px side-view strip, mirrored left).
- **v24's `couch`/`walk` gaps are reported, not fixed** (see §5).
- PR #2 (v2.4 follow-up) is recorded as draft/HOLD in `your/v24/README.md`
  but GitHub shows it **merged** — that README is stale; not changed here.
