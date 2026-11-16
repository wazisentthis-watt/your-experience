# AI Collaborator Guide

A short map of the code for AIs (and people) joining the project. Read CONTRIBUTING.md for the rules: branch + PR, never push to `main`, original WIR IP only, offline-first, no secrets.

## How the game is put together

The build is layered. Each layer wraps the previous one without rewriting it:

1. **WIR Valence Life v3** (`index.html`): the city life-sim. Plain HTML, canvas and JS in one big file.
2. **Y.O.U.R. v1.2.1 modules** (`your/modules/*.js`): a separate small canvas engine. It provides jobs, skating, arena fights, NPC dialogue and HUD. In v2.x these run inside Valence through `your/game/v20_runner.html` in an iframe, and results come back by `postMessage`.
3. **v2.0 merge layer** (`your/v20/`): `your_v20.js` hooks into the end of the Valence IIFE (`window.YOUR_V20_INSTALL`) and adds the hero, Y.O.U.R. activities, payroll and the LLM shim.
4. **v2.1** (`your/v21/`): the hero on the Elemental Gridiron field (`eg_hero.js`, loaded in `football.html`) and football progress in the shared profile (`hero_football.js`).
5. **v2.2** (`your/v22/`): the hero IS the MELLA (First Wish V7 power kit), the Mella follower is off, and Veyru the KAW follows you with a bond meter.

The patches that inserted these script tags are recorded in `tools/build_v20.py`, `build_v21.py` and `build_v22.py`. Those scripts need original source files that are not in this repo, so edit `index.html` and `football.html` directly and describe the edit in your PR.

## Where configs live

| File | What it holds |
|---|---|
| `your/v22/your_v22_config.js` | `window.YOUR_V22_CONFIG`: MELLA powers (V7 values), key bindings, Veyru follow and bond rules, scales |
| `your/v21/your_v21_config.js` | `window.YOUR_V21_CONFIG`: football hero (positions, XP per level, standalone hero) |
| `your/v20/your_v20_config.js` | `window.YOUR_V20_CONFIG`: activity payouts, Mella follower (now off), dialogue |
| `your/modules/your_config.js` + `_v1` + `_v11` | v1.2.1 engine config and asset manifest |
| `your/assets/chatgpt/manifest.js` | ChatGPT-drawn art slots |

Values are tagged in comments: **V7** (copied from The First Wish · Mella V7), **V121** (from v1.2.1), and **PROPOSED** (not owner-approved yet). Keep that tagging.

## Shared hero profile: `wir.hero/1`

`your/modules/wir_hero_profile.js` exposes `window.WIR_HERO`. It stores ONE hero shared by every WIR game in `localStorage` key **`wir-hero-profile-v1`**. Any WIR game can include this file. Full doc: `your/docs_v121/HERO_PROFILE_SCHEMA.md`.

```js
{
  schema: "wir.hero/1",
  id: "hero_xxxxxxxxxxxx",
  name: "Hero",                 // 1..22 chars; "Hero" is a placeholder; never invent the owner's hero name
  lookId: "owner_starter_v1",
  level: 1, xp: 0,
  unlocks: ["<game>:<unlock>"], // unique, ≤200
  games: { "<gameId>": { lastPlayed: ISO, level?: int, data?: object /* ≤4 KB JSON */ } },
  kaw?: { id: "kaw-veyru-001", name, species, elements: [], bond: 0..100, since: ISO }, // v1.2, optional
  createdAt: ISO, updatedAt: ISO
}
```

API: `get() · save(p) · update(patch) · setName(s) · unlock(id) · has(id) · gameData(gameId[, data]) · syncLevel(level, xp) · export() · import(json) · reset() · onChange(fn) · validate(obj)`.

Rules: add new fields as **optional**, so older readers can ignore them. Put game-specific data under `games.<yourGameId>.data`. Never delete fields you don't understand.

A richer event-history save, the **Mella Passport**, has been designed and tested separately. It isn't wired in yet; don't build a competing save format.

## Bridge to Elemental Gridiron

- `index.html` opens `football.html` in an iframe (`FB.frame`, id `fbFrame`) and sends commands with `postMessage({ wirCmd: ... })`, for example drills and scrimmages. The result comes back by `postMessage` to the parent.
- `your/v21/your_v21.js` (Valence side) sends the hero's look, name and position. `your/v21/eg_hero.js` (football side) makes the engine's own "my player" card (`myplayer` / `rookie`) draw as the hero.
- Football progress is written to `games.football` in the profile (`hero_football.js`): `{ pos, xp, drills, games, wins, losses, ties, scrims, yds, tds, comp, pass, plays, last }`.
- `football.html` also works on its own and reads the same profile.
- The older v1.2.1 bridge (`your/modules/your_eg_bridge.js`) pointed at a separate copy of Elemental Gridiron that isn't in this public repo, so v1.2.1 standalone football falls back to the practice drill.

## Open work (good first PRs)

- Villains with health bars, wave raids and targets for Hit and Blast (v2.3 is in progress with the owner's main developer, so coordinate in a PR first).
- A real 4-direction Veyru walk sheet. Today the right-facing frames are mirrored for left.
- Nimbus lanes are labels only.
- 9 football stand-in poses.

## Don'ts

- Don't add third-party IP, real photos, secrets, CDNs, analytics or files over 95 MB.
- Don't rename `localStorage` keys or the `wir.hero/1` schema.
- Don't remove the PROPOSED/V7 tags or change owner-approved values without saying so in the PR.
