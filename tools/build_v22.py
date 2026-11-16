#!/usr/bin/env python3
"""Y.O.U.R. v2.2 PROPOSAL_HOLD build: runs the v2.1 build (which runs the v2.0 build from the untouched originals), then applies
the v2.2 patches: the hero is the MELLA (V7 power kit), no Mella follower, Veyru (KAW) follows; phone pocket-drill pause fix.
Every patch must match exactly once. Never writes to the originals. PUBLISH HOLD: nothing here pushes, deploys or publishes."""
import os, subprocess, sys
HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
r = subprocess.run([sys.executable, os.path.join(HERE, 'tools', 'build_v21.py')], capture_output=True, text=True)
print(r.stdout[-300:])
if r.returncode: sys.exit('v2.1 build failed: ' + r.stdout[-500:] + r.stderr)
LOG = []
def sub1(s, old, new, label):
    n = s.count(old)
    if n != 1: sys.exit('PATCH FAILED %s: expected 1 match, found %d' % (label, n))
    LOG.append(label); return s.replace(old, new)

# ---------------------------------------------------------------- index.html (Valence)
p = os.path.join(HERE, 'index.html'); s = open(p, encoding='utf-8').read()
s = sub1(s, '<title>Y.O.U.R. v2.1 · PROPOSAL_HOLD', '<title>Y.O.U.R. v2.2 · PROPOSAL_HOLD', 'index: title v2.2')
s = sub1(s, '<script src="your/modules/your_llm.js"></script>\n', '<script src="your/modules/your_llm.js"></script>\n<script src="your/v22/your_v22_llm.js"></script>\n', 'index: v2.2 dialogue overlay (Veyru sheet, Mella sheet off)')
s = sub1(s, '<script src="your/v21/your_v21.js"></script>\n', '<script src="your/v21/your_v21.js"></script>\n<script src="your/v22/your_v22_config.js"></script>\n<script src="your/v22/your_v22.js"></script>\n', 'index: v2.2 config + layer')
open(p, 'w', encoding='utf-8').write(s)

# ---------------------------------------------------------------- activity runner (v1.2.1 game inside Valence)
p = os.path.join(HERE, 'your', 'game', 'v20_runner.html'); s = open(p, encoding='utf-8').read()
s = sub1(s, '<script src="../v20/your_v20_runner.js"></script>\n', '<script src="../v20/your_v20_runner.js"></script>\n<script src="../v22/your_v22_runner.js"></script>\n', 'runner: Veyru takes the companion assists')
open(p, 'w', encoding='utf-8').write(s)

# ---------------------------------------------------------------- your_v20.js: two read-only hooks for the MELLA kit (guarded, idempotent)
p = os.path.join(HERE, 'your', 'v20', 'your_v20.js'); s = open(p, encoding='utf-8').read()
if 'V.frameHook' not in s:
    s = sub1(s, "  function heroFrame(dir, ph, moving, ctxKind) {\n",
             "  function heroFrame(dir, ph, moving, ctxKind) {\n    if (V.frameHook && !ctxKind) { var hk = V.frameHook(dir, ph, moving); if (hk) return hk; }   // v2.2 MELLA kit frames\n", 'v20: hero frame hook (v2.2)')
    s = sub1(s, "lift = (kind || c !== X.cx) ? 0 : C.move.hoverPx * mv.alt;", "lift = (kind || c !== X.cx) ? 0 : C.move.hoverPx * mv.alt + (V.jumpLift ? V.jumpLift() : 0);", 'v20: jump lift hook (v2.2)')
    open(p, 'w', encoding='utf-8').write(s)
else: LOG.append('v20 hooks already present')

# ---------------------------------------------------------------- football.html: phone pocket drill opened on PAUSED (bridge only)
PHONE_FIX = """
  /* Y.O.U.R. v2.2 PHONE_PAUSE_FIX (PROPOSAL_HOLD · bridge only, no game logic changed). v2.1 known issue: on phone viewports the
     pocket drill opened on PAUSED. Cause (QA trace): about 0.4 s after a drill command Valence calls FB.frame.focus(); the frame gets
     a 'blur' that reaches the engine's blur → autoPause() listener before the v2.0 capture-phase guard can stop it. Fix: for 5 s after a
     bridge command, autoPause('… WINDOW LOST FOCUS' / '… TAB HIDDEN') is skipped while the player has not touched the frame, and a PAUSED
     screen that still appears in that window is closed. A real blur later (or after the player touches the frame) still pauses. */
  let __v22CmdT = -1e9;
  if (typeof autoPause === 'function') { const __v22AP = autoPause; autoPause = function (why) {
      if (window.parent !== window && TM && /WINDOW LOST FOCUS|TAB HIDDEN/.test(String(why || '')) && performance.now() - __v22CmdT < 5000 && __v20UserT < __v22CmdT) { window.__v22BlurIgnored = (window.__v22BlurIgnored | 0) + 1; return; }
      return __v22AP.apply(this, arguments); }; }
  window.addEventListener('message', e => { const d = e.data; if (!d || !d.wirCmd || d.wirCmd === 'end' || d.wirCmd === 'export' || d.wirCmd === 'import') return; const t0 = __v22CmdT = performance.now();
    const iv = setInterval(() => { try { if (performance.now() - t0 > 5000 || __v20UserT >= t0) return clearInterval(iv);
      if (TM && G.paused && curScr && curScr.classList.contains('title') && /PAUSED/.test(curScr.textContent) && !document.hidden) { closeScreen(); window.__v22PauseClosed = (window.__v22PauseClosed | 0) + 1; } } catch (err) { clearInterval(iv); } }, 100); }, true);
"""
p = os.path.join(HERE, 'football.html'); s = open(p, encoding='utf-8').read()
anchor = "  // embedded in Valence Life: the standalone game's debug and phone buttons stay out of the way\n"
s = sub1(s, anchor, PHONE_FIX + anchor, 'football: v2.2 phone pause fix')
open(p, 'w', encoding='utf-8').write(s)
for l in LOG: print('ok · ' + l)
