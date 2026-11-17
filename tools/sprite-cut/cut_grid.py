"""Cut a sheet laid out on a fixed square grid (cell px) into a transparent atlas.
Keeps only foreground components whose centroid falls inside the cell."""
import sys, json
import numpy as np
from PIL import Image
from scipy import ndimage

def mask_of(rgba):
    if (rgba[:, :, 3] < 250).mean() > 0.05:
        return rgba[:, :, 3] > 20
    c = rgba[:, :, :3].astype(np.int16); mn = c.min(axis=2); sat = c.max(axis=2) - mn
    return (mn < 228) | (sat >= 28)

def cut(path, out_png, cell_src=128, cell_out=96, margin=8):
    im = Image.open(path).convert('RGBA'); arr = np.asarray(im).astype(np.uint8)
    W, H = im.size
    cols, rows = W // cell_src, H // cell_src
    full = mask_of(arr.astype(np.int16))
    atlas = Image.new('RGBA', (cell_out * cols, cell_out * rows), (0, 0, 0, 0))
    filled = []
    for r in range(rows):
        line = []
        for c in range(cols):
            x0, y0 = c * cell_src, r * cell_src
            x0m, y0m = max(0, x0 - margin), max(0, y0 - margin)
            x1m, y1m = min(W, x0 + cell_src + margin), min(H, y0 + cell_src + margin)
            m = full[y0m:y1m, x0m:x1m]
            m = ndimage.binary_opening(m, iterations=1)
            lab, n = ndimage.label(m)
            keep = np.zeros_like(m)
            for i in range(1, n + 1):
                ys, xs = np.nonzero(lab == i)
                if len(xs) < 60: continue
                gx, gy = xs.mean() + x0m, ys.mean() + y0m
                if x0 <= gx < x0 + cell_src and y0 <= gy < y0 + cell_src:
                    keep |= lab == i
            if not keep.any(): line.append(0); continue
            crop = arr[y0m:y1m, x0m:x1m].copy()
            crop[:, :, 3] = np.where(keep, crop[:, :, 3] if (arr[:, :, 3] < 250).mean() > 0.05 else 255, 0)
            spr = Image.fromarray(crop, 'RGBA')
            bb = spr.getbbox()
            if not bb: line.append(0); continue
            spr = spr.crop(bb)
            s = min((cell_out - 6) / spr.width, (cell_out - 6) / spr.height, 1.0)
            if s < 1.0: spr = spr.resize((max(1, int(spr.width * s)), max(1, int(spr.height * s))), Image.LANCZOS)
            px = c * cell_out + (cell_out - spr.width) // 2
            py = r * cell_out + cell_out - spr.height - 3
            atlas.paste(spr, (px, py), spr)
            line.append(1)
        filled.append(line)
    atlas.save(out_png)
    bg = Image.new('RGBA', atlas.size, (40, 40, 60, 255)); bg.alpha_composite(atlas)
    bg.convert('RGB').save(out_png.replace('.png', '_bg.png'))
    return cols, rows, filled

if __name__ == '__main__':
    cols, rows, filled = cut(sys.argv[1], sys.argv[2], int(sys.argv[3]) if len(sys.argv) > 3 else 128)
    print(json.dumps({'grid': [cols, rows], 'filled': filled}))
