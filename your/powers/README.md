# your/powers: powers as data (U1)

PROPOSAL_HOLD (PUBLISH HOLD). This is U1 of the unified Y.O.U.R. design (Drive doc `1tmYnY8XnKzhTXHlX_IeOnUGwp_humKa3CtwORfY07Rc`, §3). The owner gave the go-ahead on 21 Nov 2026 at 4:09 PM ET: *"start the unified draft PRs in the planned order, beginning with U1 = powers as data"*.

## What it does
- **`power_schema.js`**: the `wir.power/1` schema, the caps and the validator (`WIR_POWER_SCHEMA.validate`, `.budget`).
  - It is a pure function file. It never evaluates text, builds functions, writes HP or draws anything.
  - The caps and budget for player-made powers (U2) and DLC powers (U4) already live here. They are **PROPOSED** numbers.
  - The owner decided custom powers are allowed in raids and boss fights "with sane caps/validation, so no infinite damage".
- **`core_kit.js`**: the MELLA V7 kit (jump, dash, hit, blast, Living Refraction, calm, ROOT, CORE, CROWN) as nine `wir.power/1` records. It is data only.
  - `v7` is the exact config block the engine reads.
  - `cost / cast / target / effects` restate those numbers in tiles and seconds.
- **`your_powers.js`**: `window.YOUR_POWERS`, one registry. It chains `YOUR_V20_INSTALL` after v2.3.
  - Core records are validated, frozen and registered.
  - `YOUR_POWERS.use(id)` runs a core record through the v2.2 kit move it names (`YOUR_V22.use(<move>)`).
  - The phone **Y.O.U.R.** tab lists your powers from the registry, with the existing `power_icons_96.webp`.

## What it does not change
- **Rules:** every number, key, pad button, MELLA touch button and HUD is unchanged. Keys still call v2.2 directly.
- **Damage:** damage still comes from Nimbus through v2.3 (`YOUR_V23.nimbus` → `YOUR_V23.damage`). `wir_mella_combat.js` is byte-identical.
- **Storage and network:** no new storage key, no network, no drawing code.

## Tests
`node your/powers/tests/powers_core.test.cjs` checks:
- the rules
- parity of every record with the live v2.2/v2.3 configs
- the validator, with 28 broken records and a 3,000-record fuzz
- the registry routing

## Next
- **U2:** the Power Forge. Make, test and equip your own powers in two custom slots. They run through the same Nimbus path, inside these caps.
- **U4:** DLC powers.
