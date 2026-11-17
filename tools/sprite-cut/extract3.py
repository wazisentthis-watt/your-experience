"""Grid cutter for the 2x5 sub-sheet layout (6 rows x 5 cols per sub-sheet).
Each cell is cropped with a generous margin; only foreground components whose
centroid falls inside the cell's own bounds are kept, so neighbours that spill
over are dropped while the sprite's own tail/limbs (which spill) are kept."""
import argparse, json
import numpy as np
from PIL import Image
from scipy import ndimage
from extract import load, sub_rect, IDS

def fgmask(rgb):
    a = rgb.astype(np.int16)
    mn = a.min(axis=2); sat = a.max(axis=2) - mn
    return (mn < 226) | (sat >= 30)

def cut_cell(sub_rgb, cell_box, margin=12):
    cx0, cy0, cx1, cy1 = cell_box          # in sub-sheet coords (floats)
    H, W = sub_rgb.shape[:2]
    x0 = max(0, int(cx0) - margin); y0 = max(0, int(cy0) - margin)
    x1 = min(W, int(cx1) + margin); y1 = min(H, int(cy1) + margin)
    crop = sub_rgb[y0:y1, x0:x1]
    m = fgmask(crop)
    m = ndimage.binary_opening(m, iterations=1)
    lab, n = ndimage.label(m)
    if n == 0: return None
    keep = np.zeros_like(m)
    for i in range(1, n + 1):
        ys, xs = np.nonzero(lab == i)
        if len(xs) < 40: continue
        gx = xs.mean() + x0; gy = ys.mean() + y0
        if cx0 <= gx < cx1 and cy0 <= gy < cy1 + 4:
            keep |= lab == i
    if not keep.any(): return None
    ys, xs = np.nonzero(keep)
    a = crop.astype(np.int16)
    mn = a.min(axis=2); sat = a.max(axis=2) - mn
    alpha = np.where(keep, 255, 0).astype(np.uint8)
    # anti-alias: soften pixels that are light but inside the kept mask
    out = np.dstack([crop, alpha])
    img = Image.fromarray(out, 'RGBA')
    return img.crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))

def atlas(sheet, k, cell=96):
    im = load(sheet); W, H = im.size
    sub = np.asarray(im.crop(sub_rect(W, H, k)))
    sh, sw = sub.shape[:2]
    cw, ch = sw / 5, sh / 6
    out = Image.new('RGBA', (cell * 5, cell * 6), (0, 0, 0, 0))
    meta = []
    for r in range(6):
        for c in range(5):
            box = (c * cw, r * ch, (c + 1) * cw, (r + 1) * ch)
            spr = cut_cell(sub, box)
            if spr is None: continue
            s = min((cell - 6) / spr.width, (cell - 6) / spr.height, 1.0)
            if s < 1.0: spr = spr.resize((max(1, int(spr.width * s)), max(1, int(spr.height * s))), Image.LANCZOS)
            px = c * cell + (cell - spr.width) // 2
            py = r * cell + cell - spr.height - 3
            out.paste(spr, (px, py), spr)
            meta.append({'row': r, 'col': c, 'w': spr.width, 'h': spr.height})
    return out, meta

if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('sheet', type=int); ap.add_argument('sub', type=int); ap.add_argument('out')
    ap.add_argument('--cell', type=int, default=96)
    a = ap.parse_args()
    img, meta = atlas(a.sheet, a.sub, a.cell)
    img.save(a.out)
    bg = Image.new('RGBA', img.size, (40, 40, 60, 255)); bg.alpha_composite(img); bg.convert('RGB').save(a.out.replace('.png', '_bg.png'))
    print('cells filled', len(meta))
