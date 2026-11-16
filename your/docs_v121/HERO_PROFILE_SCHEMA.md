# WIR shared hero profile — schema `wir.hero/1` (v1.1 · PROPOSAL_HOLD)

The owner wants one hero across every WIR game (t59u/t60u). Any game that includes `modules/wir_hero_profile.js` reads and writes the same profile. The module is standalone and does not need YOUR.

**Storage**
- localStorage key **`wir-hero-profile-v1`** (same browser origin).
- In Chromium, all file:// pages share it; QA shows a second page, `qa/fixtures/wir_other_game.html`, reading the hero.
- Across sites or devices, use **Export / Import** (Settings → Hero, or `WIR_HERO.export()` / `WIR_HERO.import(json)`).

## Fields
| field | type | rule |
|---|---|---|
| `schema` | string | must be `"wir.hero/1"` (import rejects anything else) |
| `id` | string | `[\w-]{3,40}`, generated once (`hero_xxxxxxxxxxxx`) |
| `name` | string | 1–22 chars. Control characters and `<>{}\` are stripped. Default **"Hero"** is a placeholder and was never invented; the player edits it in Settings. |
| `lookId` | string | `owner_starter_v1` = ChatGPT 18/19/20 owner starter look (future looks get new ids) |
| `level` | int ≥ 1 | synced as the **max** across games (`syncLevel`) |
| `xp` | int ≥ 0 | max across games |
| `unlocks` | string[] | `"<game>:<unlock>"`, e.g. `your:first_shift`. Unique, ≤ 200. Invalid ids are dropped on import. |
| `games` | object | `{ <gameId>: { lastPlayed: ISO, level?: int, data?: object ≤ 4 KB JSON } }`, ≤ 80 games |
| `createdAt`, `updatedAt` | ISO strings | |

Example:
```json
{"schema":"wir.hero/1","id":"hero_k3v9x2m1q0ab","name":"Hero","lookId":"owner_starter_v1","level":3,"xp":180,
 "unlocks":["your:first_shift","your:skate_clear","your:drone_beaten","your:sikee_defeated"],
 "games":{"your":{"lastPlayed":"2026-11-14T16:19:11.358Z","level":3,"data":{"day":2,"money":361,"story":{"sikeeDefeated":true}}}},
 "createdAt":"2026-11-14T16:10:02.000Z","updatedAt":"2026-11-14T16:19:11.358Z"}
```

## API (`window.WIR_HERO`)
| call | what it does |
|---|---|
| `get()` | returns the profile; creates one if it is missing |
| `exists()` | whether a profile exists |
| `save(p)` | validates, then saves |
| `update(patch)` | applies a patch |
| `setName(s)` | sets the name |
| `unlock(id)` | adds an unlock |
| `has(id)` | checks an unlock |
| `gameData(gameId[, {level, data}])` | reads or writes per-game data |
| `syncLevel(level, xp)` | raises level/xp to the max across games |
| `export()` | returns the profile as JSON |
| `import(json)` | returns `{ok, error?, profile?}` |
| `reset()` | clears the profile |
| `onChange(fn)` | subscribes to changes |
| `validate(obj)` | validates without saving |

## How Y.O.U.R. uses it
- **New Game** takes the hero name, id and look.
- **Continue** re-reads the name, so a rename in another game carries over.
- Every profile save, and every XP gain, syncs level and xp plus `games.your` (day, money, story).
- **Milestone unlocks:** `your:first_shift`, `your:skate_clear`, `your:eg_win`, `your:drone_beaten`, `your:sikee_defeated`.
- **Elemental Gridiron:** the bridge sends the hero name, `lookId` and the portrait path; the copy shows a "STAR QB · Y.O.U.R. HERO" badge.

## v1.2 addendum (Y.O.U.R. v2.2 · PROPOSAL_HOLD, 2026-11-16): optional `kaw` field

The schema id stays **`wir.hero/1`**. `kaw` is optional and additive, so older profiles import unchanged.

| field | type | rule |
|---|---|---|
| `kaw` | object, optional | the hero's bonded KAW sidekick. Dropped unless `kaw.id` matches `^kaw-[\w-]{1,40}$`. |
| `kaw.id` | string | e.g. `kaw-veyru-001` (owner pick 2026-11-16) |
| `kaw.name`, `kaw.species` | string | ≤ 22 / ≤ 40 chars, control characters and `<>{}\` stripped |
| `kaw.elements` | string[] | ≤ 4 entries, ≤ 12 chars each |
| `kaw.bond` | int 0–100 | Y.O.U.R. bond meter (calm, CORE, CROWN, the circuit, kind words) |
| `kaw.since` | ISO string | when the bond started |

Example: `"kaw":{"id":"kaw-veyru-001","name":"Veyru","species":"Rainroot Lynx","elements":["Water","Plant"],"bond":42,"since":"2026-11-16T16:40:00.000Z"}`.

**Compatibility.** A game that still loads the v1.1 module reads the profile fine but drops `kaw` the next time it saves. To keep the choice visible to those games too, Y.O.U.R. also adds the unlock **`your:kaw_veyru`**, which every version keeps. When Y.O.U.R. sees the unlock but no `kaw` object, it writes the object again on Continue.

New Y.O.U.R. unlocks in v2.2: `your:kaw_veyru`, `your:kaw_bonded` (bond reaches 86, the V7 calm threshold), `your:mella_circuit` (first ROOT → CORE → CROWN circuit).
