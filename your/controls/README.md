# your/controls · Nimbus-safe gamepad layout (PROPOSAL_HOLD)

The owner said (pt97u): *"I'm playing on my Steel Series Nimbus controller no r3 make sure button functions map well and non over lap"*.

Merge order: #30 (powers as data) → #31 (Power Forge) → this.

## What it does
- `controls_map.js`: the layout as data. It lists one table per context and has a `conflicts()` checker.
- `nimbus_controls.js`: wraps `navigator.getGamepads` once.
  - Every older reader gets a pad remapped for the current context: index.html `pollPad` / `overlayPad` / `mgPad` / `labTick`, v20 and v22.
  - No older file is edited. `MC.pad` (v22) and `core_kit` keep their legacy indices; this layer feeds them.
- `tests/controls.test.cjs` checks four things:
  - no shared buttons per context
  - nothing needs R3 (11), Home (16) or Back (8)
  - wiring to the legacy listeners
  - a simulated-pad runtime run covering chords, the context latch, the fight and a non-standard pad

Standard Gamepad API indices: 0 A · 1 B · 2 X · 3 Y · 4 L1 · 5 R1 · 6 L2 · 7 R2 · 8 Back · 9 Menu · 10 L3 · 11 R3 · 12–15 D-pad up/down/left/right · 16 Home.

## Final layout
| Context | Buttons |
|---|---|
| Walking / riding / raids / Living District | A talk/use · B dash (hold = sprint) · X hit · Y jump · R1 transform · R2 blast · L2 calm Veyru · L3 fly · D-pad ← ROOT, ↑ CORE, → CROWN, ↓ next ride · Menu phone |
| Hold L1 (world) | L1+X ★4 · L1+Y ★5 · L1+B fly · L1+Menu Do tab · L1+A controller map. L1 alone does nothing. A button pressed under L1 never fires its plain action, even after L1 is let go first. |
| Phone / sheets / Power Forge / title | A confirm · B back · X Do tab · L1/R1 tabs · Menu close · D-pad/stick focus |
| SIKEE street fight | X punch · B dodge · R2 blast · L2 Mella on/off · Y run. Everything else is off. |
| Practice lab | Menu (or Back) = end session |
| Football | Hold Menu (or Back) 1.2 s = leave. Taps stay inside the engine. L3 also sends R3 ("ask for a play"). |
| Mini-games, activities | Unchanged (they use A/B/X/Y/D-pad; activities also R1 fly, Menu pause) |

- **Context latch:** a button still held when a menu opens or closes is ignored until it is released, so it never fires twice.
- **Non-standard pads** (`mapping !== "standard"`): a toast points to Phone · Y.O.U.R. · **Set up buttons**. That screen asks you to press each button in turn and saves the result in the root save as `S.controls`. It adds no storage key. The raw order is used until the setup is saved.

## Audit: conflicts found on main + #30 + #31 (fixed here)
1. **Transform was on R3 (11)**, which the Nimbus does not have. Moved to R1.
2. **R1 = fly (v20) in the world** clashed with the new transform button. Fly moved to L3, with L1+B as a fallback.
3. **B in the world** did three jobs: v22 dash, v20 sprint hold, and base stopBusy. Now B is dash (hold = sprint) only; stopBusy only happens when an activity is running.
4. **The SIKEE fight had no pad controls.** World actions also leaked into it: v22 powers, A interact, X phone, Y ride and B dash. The fight now has its own buttons and nothing leaks.
5. **★4 / ★5 had no pad buttons.** They are now L1+X and L1+Y, with masking so the base action can't fire.
6. **Hit and jump were on the D-pad**, so the left thumb couldn't move and fight at the same time. They moved to X and Y.
7. **Labs / football exit needed Back (8)**, which the original Nimbus doesn't have. Menu now works too.
8. **Football: a Back tap did two things at once.** Football toggled its view while the shell ended the scrimmage. Now the shell only acts on a 1.2 s hold.
9. **Football "ask for a play" was R3 only.** L3 now sends it as well.
10. **X = Do tab and Y = ride in the world** clashed with the new hit/jump buttons. Do tab moved to L1+Menu, ride to D-pad ↓.

## Flagged, not changed (separate `living/` build)
- `living/your/morrow/district/morrow_v17.html` uses:
  - R3 for "step"
  - L2+R3 for "mode"
  - Back for "map"
  - L2+Back for "district"
- Those four can't be reached on a Nimbus.
- `living/index.html` also uses Back (8).
- These need their own pass in the `living/` build.
- Root has no Morrow pad code.
