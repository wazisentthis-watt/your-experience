"""Cut a 2x5 sub-sheet grid (6 rows x 5 cols per sub-sheet) into a transparent atlas.
usage: extract.py SHEET_ID SUBSHEET(0-9) OUT.png [--cell 72] [--rows 0,1,2,3,4,5]
Output atlas: one row per animation row, one column per frame, cells bottom-center aligned."""
import sys, argparse
import numpy as np
from PIL import Image

IDS = '9b03bb43 ccd9d667 dac2ff20 edd85352 890bfaec 9c8bf3e1 0c991b1e acce72d7 65fbc8c9 190c53df 920dd2c7 6e10d163 1c4693d8 1a5563c5 8622fd56 21c1567f f170c593 ea067782 f8bb147c e37d1fc5'.split()

def load(sheet_no):
    return Image.open(f'/mnt/user-data/uploads/{IDS[sheet_no-1]}-image.png').convert('RGB')

def to_rgba(cell):
    a = np.asarray(cell).astype(np.int16)
    mn = a.min(axis=2); sat = a.max(axis=2) - mn
    alpha = np.where((mn >= 232) & (sat < 30), 0, 255).astype(np.uint8)
    # soften the edge: pixels between 232 and 246 get partial alpha
    soft = (mn >= 232) & (mn < 246) & (sat < 30)
    alpha[soft] = 0
    out = np.dstack([a.clip(0, 255).astype(np.uint8), alpha])
    img = Image.fromarray(out, 'RGBA')
    # keep only the largest connected blob so stray specks/labels drop out
    from scipy import ndimage
    lab, n = ndimage.label(alpha > 0)
    if n > 1:
        sizes = ndimage.sum(np.ones_like(alpha), lab, range(1, n + 1))
        keep = lab == (int(np.argmax(sizes)) + 1)
        # include other blobs that are at least 15% of the biggest (multi-part sprites)
        for i, s in enumerate(sizes):
            if s >= 0.15 * sizes.max(): keep |= lab == (i + 1)
        arr = np.array(img); arr[~keep, 3] = 0; img = Image.fromarray(arr, 'RGBA')
    return img

def sub_rect(W, H, k):
    cw, ch = W / 5, H / 2
    return int((k % 5) * cw), int((k // 5) * ch), int((k % 5 + 1) * cw), int((k // 5 + 1) * ch)

def cell_boxes(rect):
    x0, y0, x1, y1 = rect
    cw = (x1 - x0) / 5; ch = (y1 - y0) / 6
    return [[(x0 + c * cw, y0 + r * ch, x0 + (c + 1) * cw, y0 + (r + 1) * ch) for c in range(5)] for r in range(6)]

def build(sheet_no, k, cell=72, rows=None):
    im = load(sheet_no)
    W, H = im.size
    grid = cell_boxes(sub_rect(W, H, k))
    rows = rows if rows is not None else list(range(6))
    atlas = Image.new('RGBA', (cell * 5, cell * len(rows)), (0, 0, 0, 0))
    for ri, r in enumerate(rows):
        for c in range(5):
            x0, y0, x1, y1 = grid[r][c]
            m = 3
            crop = im.crop((int(x0) - m, int(y0) - m, int(x1) + m, int(y1) + m))
            spr = to_rgba(crop)
            bb = spr.getbbox()
            if not bb: continue
            spr = spr.crop(bb)
            # fit inside cell, keep aspect, bottom-center align
            s = min((cell - 4) / spr.width, (cell - 4) / spr.height, 1.0)
            if s < 1.0: spr = spr.resize((max(1, int(spr.width * s)), max(1, int(spr.height * s))), Image.LANCZOS)
            px = c * cell + (cell - spr.width) // 2
            py = ri * cell + cell - spr.height - 2
            atlas.alpha_composite(spr, (px, py)) if False else atlas.paste(spr, (px, py), spr)
    return atlas

if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('sheet', type=int); ap.add_argument('sub', type=int); ap.add_argument('out')
    ap.add_argument('--cell', type=int, default=72); ap.add_argument('--rows', default='')
    a = ap.parse_args()
    rows = [int(x) for x in a.rows.split(',')] if a.rows else None
    build(a.sheet, a.sub, a.cell, rows).save(a.out)
    print('wrote', a.out)
