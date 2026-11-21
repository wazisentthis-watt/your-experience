# Y.O.U.R. Experience — Experience Wonders

**▶ Play in your browser:** https://wazisentthis-watt.github.io/your-experience/

**▶ v2.4 Living District + Morrow City (PROPOSED, separate folder `living/`):** https://wazisentthis-watt.github.io/your-experience/living/

Y.O.U.R. is the playable doorway into **What Is Reality? (WIR)**. You play as yourself, a superpowered hero who is the **MELLA** with the First Wish powers. **Veyru**, a KAW (Rainroot Lynx), follows you and fights beside you. You live a day in the WIR city (Valence Life), fight villains, survive raids, take jobs, skate, fight in the arena, and play **Elemental Gridiron** football. Your progress is saved to one shared hero profile that other WIR games can read.

This repository is build **v2.3**. It runs fully offline in the browser: no server, no CDN, no account. An AI dialogue provider can be added in Settings, and its key stays in that browser only.

> © The owner of What Is Reality? (WIR). **All rights reserved.** This code and art are published so collaborators can read and improve them. No open-source license has been granted. Do not copy, reuse, or redistribute any part outside this project without the owner's written permission.

## How to play

- Open the **Play** link above, or clone the repo and open `index.html` (double-click works). You can also run `python3 -m http.server` and open http://localhost:8000.
- On the title screen, choose **FREE LIFE** to walk the city, or **TESTIMONY** for the football career mode.

### Controls

| Action | Keyboard | Gamepad / touch |
|---|---|---|
| Move | WASD or arrow keys | Left stick, or the on-screen stick |
| Use / talk | E or Space | Tap the person or door |
| Sprint | Shift or K | B / SPRINT button |
| Fly / land (outdoors only) | F | RB / FLY button |
| Jump | Q | MELLA power pad |
| Dash | Shift / K | MELLA power pad |
| Hit · Blast | J · L | MELLA power pad |
| Calm · Transform | C · T | MELLA power pad |
| ROOT · CORE · CROWN | 1 · 2 · 3 | MELLA power pad |
| Phone (settings, hero name, AI provider) | Y.O.U.R. tab | Y.O.U.R. button |

On a phone, the **MELLA** button opens an 8-button power pad. The HUD in the top-left shows energy, stamina, CCR stability and Veyru's bond.

### Villains and raids (new in v2.3)

- **Villains:** ghosted METAL machines (Loader, Lifter, Walker, Scout Bot, Breacher) and the S1 bosses **BALLAST** and **GLASSJAW**. Enemies telegraph their attacks with an amber lane or arc. Hit them with your MELLA powers until they're **ISOLATED** (switched off, not killed).
- **Start a raid:** walk to the raid beacon on the starter block and press **E** (or tap it), or open the phone **Y.O.U.R.** tab and tap **Start a raid here**. You face 4 waves, then a boss.
- **Bosses:** BALLAST shrugs off direct hits. Jump his KA CHUNK shockwaves, and use ROOT or CORE under him between braces. GLASSJAW unlocks after Ballast.
- **Work site:** step on the ⚙ marker in the plaza to wake a Labor Ghosting site.
- **Getting knocked down costs nothing.** At 0 ♥ you're down for a few seconds, then you recover. A failed raid counts as a retreat; you keep your money and can retry right away.

**Story path:** work a shift at Dex's Corner Store → SIKEE appears by the Corner Gym → beat the Training Drone in the Arena → talk to SIKEE → "Face SIKEE".

## Project structure

```
index.html            Main game: WIR Valence Life v3 + the Y.O.U.R. layers (v2.0 → v2.1 → v2.2 → v2.3)
football.html         Elemental Gridiron (WIR Retro Bowl), opened by index.html in an iframe or on its own
games/                Labs linked from the city: ccr.html (CCR Living World), rifft.html (RIFFT Combat Lab)
art/ spr/ aud/ fonts/ Valence Life art, sprites, sounds and local fonts (no font CDN)
your/
  modules/            Y.O.U.R. engine modules (core, input, world, NPCs, HUD, jobs, skate, arena, dialogue, profile...)
  v20/ v21/ v22/ v23/ Version layers installed on top of Valence (configs live here); v23/vendor/ holds the Nimbus combat module
  game/               The v1.2.1 standalone game and v20_runner.html (activities run inside Valence)
  assets/             Hero, Mella, Sikee, Veyru and ChatGPT-drawn art
  tests/              In-browser unit tests (open B01_test.html ... B15_test.html)
  docs_v121/          Earlier design docs, including HERO_PROFILE_SCHEMA.md
  tools/              Art-cutting and report scripts (Python)
tools/                build_v20…v23.py and extract_metal_machines.py: how index.html and football.html were patched (they need the original source files, which are not in this repo)
docs/history/         Version reports and the changelog
docs/screenshots/     A few v2.3 screenshots
ASSET_SOURCES.csv     Where each asset came from
```

## Working with AI collaborators

Other AIs (and people) are welcome to help. Please read **[CONTRIBUTING.md](CONTRIBUTING.md)** and **[AI_COLLABORATOR_GUIDE.md](AI_COLLABORATOR_GUIDE.md)** first. The short version:

1. **Make a branch and open a pull request.** Never push to `main` directly. The owner reviews and merges.
2. **No copyrighted or third-party IP.** Only original WIR characters and art.
3. **Stay offline-first.** No CDNs, trackers, remote fonts or required servers. Use relative paths only.
4. **Never commit secrets** (API keys, tokens, `.env`) or real photos of people.
5. **Keep the shared hero profile compatible** (`wir.hero/1`).
6. **Say what you tested** in the PR, and include a screenshot at desktop and phone size.

The live site is published by GitHub Pages from the `main` branch root, so anything merged to `main` goes live.
