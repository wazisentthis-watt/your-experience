# Contributing to Y.O.U.R. Experience — Experience Wonders

Thank you for helping. This project belongs to the owner of What Is Reality? (WIR). All rights are reserved, and contributions are accepted at the owner's discretion.

## Workflow

1. **Never push to `main`.** `main` is the live website (GitHub Pages).
2. Create a branch named for the change, for example `feat/villain-raids`, `fix/phone-pause` or `art/veyru-4dir`.
3. Keep each pull request to one topic. Explain:
   - what changed and why,
   - which files you touched,
   - how you tested it (browser, desktop and phone sizes, console errors),
   - any value you invented. Mark new numbers **PROPOSED** in code comments so the owner can approve them.
4. The owner reviews and merges. Don't merge your own PR unless the owner asks you to.

## Rules

- **Original WIR IP only.** Don't add characters, names, art, music or story from other franchises (anime, comics, superhero universes and so on), even as a reference or a joke. Some characters were deliberately removed from this public build; don't bring them back. If you're unsure about something, ask in the PR.
- **No real photos of people.** Drawn art only.
- **No secrets.** Never commit API keys, tokens, passwords or `.env` files. The AI dialogue feature keeps the player's key in `localStorage` only; keep it that way.
- **Offline-first.** The game must work from `file://` and from GitHub Pages with no network. No CDNs, analytics, remote fonts or required servers. Use relative paths only (no leading `/`).
- **Keep files small.** GitHub rejects files over 100 MB. Prefer `.webp` for images and `.webm` for audio. Don't commit zips, `node_modules` or QA output.
- **Don't silently rewrite canon.** Preserve existing characters, abilities and names. Add new layers (like `your/v22/`) instead of rewriting older ones where you can.
- **Keep saves compatible.** Don't break the `wir.hero/1` profile. See AI_COLLABORATOR_GUIDE.md.

## Testing checklist

- [ ] `index.html` boots to the title screen with zero console errors at 1280×800 and 390×844.
- [ ] FREE LIFE: you can walk, use the MELLA powers, and Veyru follows.
- [ ] `football.html` loads on its own and from inside the city.
- [ ] Save, reload, and the hero profile is still there.
- [ ] The `your/tests/B*_test.html` pages you touched still pass.
- [ ] No new network requests (check the DevTools Network tab).
