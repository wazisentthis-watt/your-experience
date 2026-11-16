#!/usr/bin/env python3
"""Y.O.U.R. v2.1 PROPOSAL_HOLD build: runs the v2.0 build (originals → patched copies), then applies the v2.1 patches
(owner hero playable on the Elemental Gridiron field; owner approved EG logic changes 2026-11-15). Every patch must match once.
Never writes to the originals. PUBLISH HOLD: nothing here pushes, deploys or publishes."""
import os, subprocess, sys
HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
r = subprocess.run([sys.executable, os.path.join(HERE, 'tools', 'build_v20.py')], capture_output=True, text=True)
print(r.stdout[-400:]); 
if r.returncode: sys.exit('v2.0 build failed: ' + r.stderr)
LOG = []
def sub1(s, old, new, label):
    n = s.count(old)
    if n != 1: sys.exit('PATCH FAILED %s: expected 1 match, found %d' % (label, n))
    LOG.append(label); return s.replace(old, new)

p = os.path.join(HERE, 'index.html'); s = open(p, encoding='utf-8').read()
s = sub1(s, '<title>Y.O.U.R. v2.0 · PROPOSAL_HOLD', '<title>Y.O.U.R. v2.1 · PROPOSAL_HOLD', 'index: title v2.1')
s = sub1(s, '<script src="your/modules/wir_hero_profile.js"></script>\n',
         '<script src="your/modules/wir_hero_profile.js"></script>\n<script src="your/v21/your_v21_config.js"></script>\n<script src="your/v21/hero_football.js"></script>\n', 'index: v2.1 config + hero football scripts')
s = sub1(s, '<script src="your/v20/your_v20.js"></script>\n', '<script src="your/v20/your_v20.js"></script>\n<script src="your/v21/your_v21.js"></script>\n', 'index: v2.1 layer script')
# Testimony position chooser: preselect the hero profile's football position (default QB) instead of WR
s = sub1(s, "name: '', pos: 'WR', lin:", "name: '', pos: (window.YOUR_V21_FB ? YOUR_V21_FB.pos() : 'QB'), lin:", 'index: Testimony position default from hero profile')
# football player payload: hero position + hero look/name (Free Life), PROPOSED level bonus
s = sub1(s, "  return { name: S.name, pos: T ? T.pos : (S.fpos || 'WR'),", "  const __p = { name: S.name, pos: T ? T.pos : (S.fpos || (window.YOUR_V21_FB ? YOUR_V21_FB.pos() : 'QB')),", 'index: fbPlayer position')
s = sub1(s, "    look: S.look, crown: c.crown, core: c.core, root: c.root };\n}", "    look: S.look, crown: c.crown, core: c.core, root: c.root };\n  return window.YOUR_V21_PLAYER ? YOUR_V21_PLAYER(__p, !!T) : __p;\n}", 'index: fbPlayer hero payload')
open(p, 'w', encoding='utf-8').write(s)

p = os.path.join(HERE, 'football.html'); s = open(p, encoding='utf-8').read()
# remember the Valence command if it arrives while the v2.1 scripts below are still loading (the hero would otherwise be missed)
s = sub1(s, "(function () {\n  'use strict';\n  const post = m =>", "/* Y.O.U.R. v2.1 */ window.__V21LAST = null; addEventListener('message', function (e) { var d = e.data; if (d && d.wirCmd && d.player) window.__V21LAST = d; });\n(function () {\n  'use strict';\n  const post = m =>", 'football: early hero catcher')
s = sub1(s, '</script>\n\n</body>\n</html>', '</script>\n<!-- Y.O.U.R. v2.1 (PROPOSAL_HOLD): the owner hero on the field -->\n<script src="your/modules/wir_hero_profile.js"></script>\n<script src="your/v21/your_v21_config.js"></script>\n<script src="your/v21/hero_football.js"></script>\n<script src="your/v21/eg_hero.js"></script>\n\n</body>\n</html>', 'football: hero scripts')
open(p, 'w', encoding='utf-8').write(s)

p = os.path.join(HERE, 'your', 'v20', 'your_v20.js'); s = open(p, encoding='utf-8').read()
if 'v2.1 · PROPOSAL_HOLD · built on' not in s:
    s = sub1(s, 'v2.0 · PROPOSAL_HOLD · built on', 'v2.1 · PROPOSAL_HOLD · built on', 'title subtitle v2.1')
    open(p, 'w', encoding='utf-8').write(s)
for l in LOG: print('ok · ' + l)
