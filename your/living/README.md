# Living District in root · PROPOSAL (draft PR for owner review)

Drafted by WIR Recovery for owner review. Not merged, not published.

The v2.4 Living District, rebuilt as a **native root map** (`MAPS.LIV`, 64 × 44 tiles at T = 32) that you walk into from Savannah. There's no iframe and no second engine, and it adds no new `localStorage` key.

## How you get there

- **Savannah → district:** a gate in Savannah's back lot, east of the R-I-F-F-T station. Walk into it.
- **District → Savannah:** walk into the gate at the district's west edge (labelled with the host city's name).
- Both trips use PR #18's arrival checkpoint (`your/integration/section_handoff.js`). It checks that the destination spawn is walkable, enters the map, then calls `confirmArrival`. Root's existing world (HOME and the cities) counts as section `HOME`. The district is `LIVING_DISTRICT`.
- Phone shortcuts ("go do X") used inside the district walk you back out to the host city first.

## Host city: one line

`your/living/living_config.js` → `hostCity: 'SAV'`. Change it to `'JAX'`, `'NOLA'`, `'HOU'` or `'LA'` and the district moves:
- Any city without an entry in `hostGates` gets a free gate spot automatically.
- The HUD reads "Living District · <host>".
- `S.city` stays the host city while you're in the district, so rides, jobs and the model keep working.
- City lists, rides, treasuries and the "all five cities" goal still see exactly five cities.

## What's inside

| Piece | Source | Notes |
|---|---|---|
| Sim core | `vendor/cce_core.js` (CCE 2.0, byte-identical to `living/your/v24/cce_core.js`) | DOM-free, seeded, fixed step. |
| District data | `vendor/cce_config.js` (same as `living/your/v24/cce_config.js`, except the title emoji is removed from one header comment) | 19 buildings, 20 civilians, 5 supers, Iteron, Vault Vesper, The Divider. |
| Art | `assets/` (webp, from the Y.O.U.R. Map Art Pack = ChatGPT sheets 57–68; see `assets/LIVING_ART_MANIFEST.json`) | Ground comes from one 32 px atlas (`ground/root_ground_tileset_32.webp` = ROOT_GROUND_TILESET). Buildings, props, vehicles and supers are sprites. |
| Layer | `living_district.js`, `living_art.js`, `living_config.js` | World-module slot (PR #19) plus the `YOUR_V20_INSTALL` chain (for `MAPS`, `M` and the `goDo` hook). |

**Proposed originals.** The 20 civilians, the five supers (Kestrel Ray, Anvil Mae, Mendwell, Quillshot, Riotgale), Iteron, Vault Vesper and The Divider are proposed original characters awaiting owner confirmation, not existing canon.

**First playable (this PR):**
- The sim runs in a quiet mode (`quiet: true`): civilians live their routines, the five supers patrol, and traffic drives.
- Incidents, Iteron patrols, the Vesper calendar and The Divider's operations are switched off by a config overlay. The vendored files are unchanged.
- The follow-up PR turns them on, together with the combat bridge (through the v2.3 path and Nimbus) and the district HUD.

**Clock.** The district keeps the v2.4 pace (0.25 game-min per real second, PROPOSED in v2.4) while you're inside, and catches up to the root clock each time you enter.

**Save.** Everything lives in the root save as `S.living` (`{ v, host, clockStart, visits, lastTrip, sim }`), about 25 KB. The PR #18 checkpoint goes under `wir.hero/1` `games.your_universe.data.checkpoint`, as that contract specifies.

**Veyru.** This layer never creates, moves or commands Veyru. Root's `your/v24/` KAW Living Brain stays the only brain.

**Untouched:** Sikee, `your/v24/` and the Nimbus module (`your/v23/vendor/wir_mella_combat.js`, byte-identical).

## Known limits

- Sikee's roaming villains spawn on any non-HOME map, so they can appear in the district too. Sikee is unchanged.
- District civilians can't be talked to yet. `E` still talks to root NPCs and objects.
- Root draws the night tint by root hour. The district's building windows don't light up yet.

## Tests

`node your/living/tests/living_district.test.cjs`:
- loads the real files into a vm sandbox with a small fake of the root game;
- walks Savannah → district → Savannah, saves and reloads;
- moves the host to Jacksonville;
- checks the rules: core byte-identical, root save only, one brain, no damage, no network.
