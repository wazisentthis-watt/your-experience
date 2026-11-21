# World-module slot · PROPOSAL (draft PR for owner review)

Drafted by WIR Recovery for owner review. Not merged, not published.

`index.html` already calls `window.SIKEE` by name at six points of the game loop. This slot adds a **generic list next to those calls**, so a new world module (the Living District, a native Morrow City, …) can plug in **without editing `index.html` again and without touching Sikee**. Sikee keeps its own calls exactly as they were.

## Contract

Push an object onto `window.WIR_WORLD_MODULES` (create the array if it is missing). Every hook is optional.

| Hook | Called from (`index.html`) | Same point as | Return |
|---|---|---|---|
| `enterMap(id)` | end of `enterMap()` | `SIKEE.enterMap(id)` | ignored |
| `drawList(map, t)` | `render()`, with the y-sorted `draws` list | `SIKEE.drawList(m, t)` | array of `{ y, f }` (`y` in tiles, `f()` draws on `WIR_GAME.cx`) |
| `tick(dt)` | `frame()`, only while a life is loaded (`S`) | `SIKEE.tick(dt)` | ignored |
| `blocking()` | `paused()` and the keydown handler | `SIKEE.blocking()` | truthy = the module owns input (a fight, a cut-scene) |
| `wreckSlow()` | `movePlayer()` speed | `SIKEE.wreckSlow()` | multiplier `0 < v ≤ 1`; anything else counts as `1` |

Rules:

- Read game state at call time through `window.WIR_GAME` / `window.__VL` (the same way `your/sikee/sikee_world.js` does). Do not copy the game model.
- Save module state inside the game save (`WIR_GAME.S.<yourId>`, like `S.sikee`) or under `games.<yourId>.data` in `wir.hero/1`. Do not add new `localStorage` keys.
- All combat damage goes through the v2.3 path and the Nimbus module (`your/v23/vendor/wir_mella_combat.js`, byte-identical).
- If a hook throws, the slot logs one `console.error` naming the module and switches that hook off. The game keeps running.
- Load your module with its own `<script>` tag after `your/muse/your_muse.js`.

## Minimal module

```js
(function () {
  'use strict';
  var W = window.WIR_WORLD_MODULES = window.WIR_WORLD_MODULES || [];
  W.push({
    id: 'example',
    enterMap: function (id) { /* spawn things for map id */ },
    tick: function (dt) { /* advance your simulation */ },
    drawList: function (map, t) { var G = window.WIR_GAME; return [{ y: 5, f: function () { G.cx.fillRect(5 * G.T, 5 * G.T, 8, 8); } }]; },
    blocking: function () { return false; },
    wreckSlow: function () { return 1; }
  });
})();
```

## Tests

`node your/world/tests/world_slot.test.cjs` checks that every hook site sits next to its Sikee call. It also runs the real `wmCall` helper, taken from `index.html`, against fake modules: call order, an empty or missing list, a throwing hook being switched off, and the speed multiplier.
