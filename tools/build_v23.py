#!/usr/bin/env python3
"""Y.O.U.R. v2.3 PROPOSAL_HOLD build: runs the v2.2 build (→ v2.1 → v2.0 from the untouched originals), then applies the v2.3 patches:
branding "Y.O.U.R. Experience — Experience Wonders" (owner t74u), villain combat + raids (your/v23/), Nimbus combat module vendored unchanged.
Every patch must match exactly once. Never writes to the originals. PUBLISH HOLD: nothing here pushes, deploys or publishes."""
import os, subprocess, sys, hashlib
HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
r = subprocess.run([sys.executable, os.path.join(HERE, 'tools', 'build_v22.py')], capture_output=True, text=True)
print(r.stdout[-300:])
if r.returncode: sys.exit('v2.2 build failed: ' + r.stdout[-500:] + r.stderr)
LOG = []
def sub1(s, old, new, label):
    n = s.count(old)
    if n != 1: sys.exit('PATCH FAILED %s: expected 1 match, found %d' % (label, n))
    LOG.append(label); return s.replace(old, new)
NIMBUS_SHA = 'a6aa3384fdd7ac5c3954fae35e2baf7b15dd6f426a373705b9503ecde2fbf517'
v = os.path.join(HERE, 'your', 'v23', 'vendor', 'wir_mella_combat.js')
if hashlib.sha256(open(v, 'rb').read()).hexdigest() != NIMBUS_SHA: sys.exit('vendored wir_mella_combat.js changed (sha mismatch)')
p = os.path.join(HERE, 'index.html'); s = open(p, encoding='utf-8').read()
s = sub1(s, '<title>Y.O.U.R. v2.2 · PROPOSAL_HOLD', '<title>Y.O.U.R. Experience — Experience Wonders · v2.3 · PROPOSAL_HOLD', 'index: title v2.3 + brand')
s = sub1(s, '<script src="your/v22/your_v22.js"></script>\n', '<script src="your/v22/your_v22.js"></script>\n<script src="your/v23/vendor/wir_mella_combat.js"></script>\n<script src="your/v23/your_v23_config.js"></script>\n<script src="your/v23/your_v23.js"></script>\n', 'index: Nimbus module + v2.3 config + layer')
open(p, 'w', encoding='utf-8').write(s)
print('v2.3 patches:', len(LOG)); [print(' -', l) for l in LOG]
