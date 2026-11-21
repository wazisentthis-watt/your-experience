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

## U2: the power creator
The owner decided on 21 Nov 2026 at 4:09 PM ET that custom powers are allowed in raids and boss fights.

- **`power_runtime.js`** (`window.YOUR_POWER_RUNTIME`)
  - **Save:** your powers are kept in the root save as `S.powers = { v:1, mine:[…], slots:[id, id] }`. That allows up to 12 powers and 2 custom slots.
  - **Casting:** keys **4** and **5** cast the two slots, and so do the **★** buttons on the MELLA touch pad.
  - **Each cast:**
    - spends the power's energy, stamina and stability
    - starts its cooldown
    - plays the existing cast, strike or calm frames
  - **Targeting:** a strike in front, a ring around you, a line ahead, a projectile, or a ground cell ahead. Each one stops at its max targets.
  - **Damage:** for every target, `YOUR_V23.nimbus(<lane>, foe)` rolls the hit. The roll is multiplied by the power's scale (0.3–1.25) and capped at `CAPS.hitCap` (60). Then `YOUR_V23.damage` applies it.
  - **Bosses keep their lessons:**
    - BALLAST only takes ROOT/CORE ground powers between shifts.
    - GLASSJAW only cracks from ROOT/CORE ground powers under him.
    - Direct powers bounce off both.
  - **Effects art:** frames of the existing `mella_vfx_96.webp`. Your colour choice only rotates the hue.
  - **Broken saved powers:** a saved power that no longer validates (an edited save, or a newer rule) is **switched off, not deleted**.
- **`power_forge.js`** (`window.YOUR_POWER_FORGE`): Phone → Y.O.U.R. → **Open the Power Forge**. It lets you:
  - pick a name, lane, shape, effects, costs, cooldown, look (VFX row, icon, colour) and move
  - see the live validator and budget meter (Save stays disabled until the power passes)
  - Save, Save + equip ★4/★5, Try it now, and Export/Import JSON (imports are validated again)
- **Anti-loop caps** (PROPOSED, in `power_schema.js`):
  - heal needs a cooldown of at least 8 s
  - shield needs at least 3 s
  - giving energy needs at least 6 s and no energy cost
  - Veyru bond needs at least 10 s
  - the cooldown must be at least twice the stun
- **Tests:** `node your/powers/tests/power_forge.test.cjs`

## Next
- **U4:** DLC powers.
