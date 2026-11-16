# Y.O.U.R. v2.0 · PROPOSAL_HOLD

**Publish hold.** This build is for the owner's review only. Do not deploy or publish it.

## Play

- Open `index.html` in Chrome/Edge (double-click works, file://), or serve the folder with any static server.
- No network is needed: no fonts, CDNs or claude.ai.

## Controls

- Move: WASD, arrows, tap or stick.
- E: use / talk. Pressing E with nothing else nearby talks to Mella.
- Shift or K, or gamepad B: sprint. F or gamepad RB: fly / land. Flying only works outdoors, and you must land before using a door.
- Touch buttons: SPRINT, FLY and Y.O.U.R. (the Y.O.U.R. phone tab, which holds settings, the hero name, AI provider and title art).

## Story path

1. Work Dex's Corner Store shift (Sahelatrix Market, or Phone > Do).
2. SIKEE then appears by the Corner Gym.
3. Beat the Training Drone (gym > Arena).
4. Talk to SIKEE and accept the challenge.
5. Choose "Face SIKEE".

## Layout

- `index.html` and `football.html` are patched copies of Valence Life v3. `tools/build_v20.py` regenerates them from the untouched original.
- `your/v20/` holds the merge layer, config, LLM shim and runner.
- `your/` holds the Y.O.U.R. v1.2.1 modules, assets and activities, which run unmodified inside `your/game/v20_runner.html`.

## QA

Start a server, then run the checks:

```
python3 -m http.server 18920
node qa/run_v20_qa.js
```

Results: `qa/qa_v20_results.json`, `qa/screenshots_v20/` and `qa/v20_contact_sheet.png`.
