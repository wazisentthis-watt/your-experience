#!/usr/bin/env python3
"""Re-creates your/assets/villains/metal_machines/*.png from the METAL RIFFT City Siege build (read-only): decodes the embedded
v4 atlas (EMBED.metal4, WebP) and crops the machine frames named in EMBED.m4 (loader/lifter/walker/scout/breacher _0.._3 =
idle / alert(telegraph) / attack / damaged, METAL drawSprite). Usage: extract_metal_machines.py [outdir]"""
import json, base64, io, os, sys
from PIL import Image
SRC = '/workspace/game-recovery/metal-all/files/METAL:_IN_DA_RIFFT/2D/_unversioned/octec_engine_pmk-pnk-camera-shelf_games_rifft-city-siege.html'
out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'your', 'assets', 'villains', 'metal_machines')
os.makedirs(out, exist_ok=True)
s = open(SRC, encoding='utf-8').read(); i = s.index('const EMBED = ') + len('const EMBED = ')
E, _ = json.JSONDecoder().raw_decode(s, i)
im = Image.open(io.BytesIO(base64.b64decode(E['metal4'].split(',', 1)[1]))).convert('RGBA')
n = 0
for k, (x, y, w, h, ax, ay) in sorted(E['m4'].items()):
    if k.split('_')[0] in ('loader', 'lifter', 'walker', 'scout', 'breacher', 'dronefl', 'dronepd') and '~' not in k:
        im.crop((x, y, x + w, y + h)).save(os.path.join(out, k + '.png')); n += 1
print(n, 'frames ->', out)
