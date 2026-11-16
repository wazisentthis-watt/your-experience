#!/usr/bin/env python3
"""Sync ChatGPT art into the game · PROPOSAL_HOLD.
Reads /workspace/game-recovery/your-art/chatgpt/NN_NAME.png (names per ART_REQUESTS.md), writes assets/chatgpt/ + manifest.js.
- 16:9 backgrounds are downscaled to <=1920 px wide.
- white-background sprites/portraits (07-11, 14-16) get the white background removed (border flood-fill).
- 15 SIKEE_WALK_SHEET (4 rows x 4) and 16 SIKEE_COMBAT_SHEET (1 row x 8) are sliced by content gaps and re-packed into 96 px cells
  (sikee_walk_96.png 4x4 rows down,left,right,up; sikee_combat_96.png 8 cells) and listed in the manifest; the game prefers them over
  the derived sheet. If slicing does not find the expected grid, the sheet is skipped and the derived owner-art sheet stays in use.
Safe to re-run any time; never modifies the source folder."""
import os, re, json, sys
import numpy as np
from PIL import Image
from scipy import ndimage
SRC=sys.argv[1] if len(sys.argv)>1 else '/workspace/game-recovery/your-art/chatgpt'
DST=os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','assets','chatgpt')
SLOTS={1:'title',2:'menu_bg',3:'panel',4:'map',5:'tileset',6:'store',7:'crates',8:'mara',9:'dex',10:'drone',11:'rivals',12:'hub_bg',13:'sleep_bg',14:'sikee_portrait',15:'sikee_walk',16:'sikee_combat',17:'sikee_intro',18:'hero_portrait',19:'hero_walk',20:'hero_fight',21:'cover',22:'hero_skate',23:'hero_ko_cast',24:'hero_run_jump',25:'hero_climb_dash',26:'hero_fly',27:'hero_swim_special'}
WHITE={5,7,8,9,10,11,14,15,16}
HERO={18,19,20,22,23,24,25,26,27}   # v1.1 owner hero: white bg + floor shadows + enclosed white gaps (between legs/arms) removed
def unwhite(im):
    a=np.asarray(im.convert('RGB')).astype(np.int16); cand=(a.min(-1)>228)
    lab,_=ndimage.label(cand); edge=set(np.unique(np.concatenate([lab[0],lab[-1],lab[:,0],lab[:,-1]])))-{0}
    bg=np.isin(lab,list(edge)); out=im.convert('RGBA'); al=np.where(bg,0,255).astype(np.uint8); out.putalpha(Image.fromarray(al)); return out
def unwhite_hero(im):
    a=np.asarray(im.convert('RGB')).astype(np.int16); mn=a.min(-1); mx=a.max(-1)
    white=mn>228; lab,k=ndimage.label(white); edge=set(np.unique(np.concatenate([lab[0],lab[-1],lab[:,0],lab[:,-1]])))-{0}
    bg=np.isin(lab,list(edge))
    if k:  # enclosed white gaps bigger than highlights/teeth
        area=ndimage.sum(white,lab,range(1,k+1)); big=[i+1 for i in range(k) if area[i]>120]; bg|=np.isin(lab,big)
    shadow=(mn>150)&((mx-mn)<45)&~white            # soft warm-grey floor shadows (low saturation, light)
    sl,sk=ndimage.label(shadow|bg); keep=set(np.unique(sl[bg]))-{0}; bg|=np.isin(sl,list(keep))&shadow
    bg=ndimage.binary_opening(bg,iterations=1)|bg
    out=im.convert('RGBA'); out.putalpha(Image.fromarray(np.where(bg,0,255).astype(np.uint8))); return out
def runs(mask):
    r=[];s=None
    for i,v in enumerate(mask):
        if v and s is None:s=i
        if not v and s is not None: r.append((s,i)); s=None
    if s is not None:r.append((s,len(mask)))
    return r
def slice_grid(im,rows,cols):
    al=np.asarray(im.split()[3])>20
    rr=[x for x in runs(al.any(1)) if x[1]-x[0]>8]
    if len(rr)!=rows: return None
    cells=[]
    for (y0,y1) in rr:
        cc=[x for x in runs(al[y0:y1].any(0)) if x[1]-x[0]>6]
        if len(cc)!=cols: return None
        cells.append([im.crop((x0,y0,x1,y1)) for (x0,x1) in cc])
    return cells
def slice_valleys(im,n):
    # equal-ish columns: cut at the lowest alpha-density column within ±W/(4n) of each k·W/n (effects may overlap neighbours)
    al=np.asarray(im.split()[3])>20; dens=al.sum(0); W=im.width; cuts=[0]
    for k in range(1,n):
        c=int(k*W/n); w=int(W/(4*n)); seg=dens[c-w:c+w]; cuts.append(c-w+int(np.argmin(seg)))
    cuts.append(W); ys=np.where(al.any(1))[0]; y0,y1=int(ys.min()),int(ys.max())+1
    return [[im.crop((cuts[i],y0,cuts[i+1],y1)) for i in range(n)]]
def slice_blobs(im,n):
    # n largest connected blobs = frames (left→right); smaller blobs (effects, sparks) join the frame whose bbox centre is nearest in x
    al=np.asarray(im.split()[3])>20; lab,k=ndimage.label(ndimage.binary_dilation(al,iterations=2))
    if k<n: return None
    objs=ndimage.find_objects(lab); area=ndimage.sum(al,lab,range(1,k+1)); order=np.argsort(-area)
    main=sorted(order[:n],key=lambda i:objs[i][1].start); groups={int(i):[int(i)] for i in main}
    cx=lambda i:(objs[i][1].start+objs[i][1].stop)/2
    for i in order[n:]:
        if area[i]<30: continue
        j=min(main,key=lambda m:abs(cx(m)-cx(i))); groups[int(j)].append(int(i))
    cells=[]
    for m in main:
        ids=groups[int(m)]; y0=min(objs[i][0].start for i in ids); y1=max(objs[i][0].stop for i in ids); x0=min(objs[i][1].start for i in ids); x1=max(objs[i][1].stop for i in ids)
        mask=np.isin(lab[y0:y1,x0:x1],[i+1 for i in ids]); c=np.asarray(im.crop((x0,y0,x1,y1))).copy(); c[...,3]=np.where(mask,c[...,3],0); cells.append(Image.fromarray(c))
    return [cells]
def pack(cells,cols,rows):
    C=96; out=Image.new('RGBA',(C*cols,C*rows),(0,0,0,0)); hs=sorted(c.height for row in cells for c in row); allh=hs[len(hs)//2]
    s=88/allh   # median-height scale keeps the body size constant; oversized effect frames are shrunk to fit below
    for r,row in enumerate(cells):
        for c,im in enumerate(row):
            im=im.crop(im.getbbox()); im=im.resize((max(1,round(im.width*s)),max(1,round(im.height*s))),Image.LANCZOS)
            if im.width>C or im.height>C-4: k=min(C/im.width,(C-4)/im.height); im=im.resize((max(1,round(im.width*k)),max(1,round(im.height*k))),Image.LANCZOS)
            out.alpha_composite(im,(c*C+(C-im.width)//2,r*C+C-im.height-4))
    return out
os.makedirs(DST,exist_ok=True); files={}; notes={}
for f in sorted(os.listdir(SRC)) if os.path.isdir(SRC) else []:
    m=re.match(r'^(\d\d)_([A-Z0-9_]+)\.(png|jpg|jpeg|webp)$',f,re.I)
    if not m: continue
    n=int(m.group(1)); slot=SLOTS.get(n)
    if not slot: continue
    im=Image.open(os.path.join(SRC,f)); im.load()
    if n in (22,24,25):   # v1.2: 2x4 skate grid has faint grey grid lines — paint them white before keying
        a=np.asarray(im.convert('RGB')).copy(); H,W=a.shape[:2]; b=6
        for k in range(0,5): x=int(round(k*W/4)); a[:,max(0,x-b):min(W,x+b)]=255
        for k in range(0,3): y=int(round(k*H/2)); a[max(0,y-b):min(H,y+b),:]=255
        im=Image.fromarray(a)
    if n in HERO: im=unwhite_hero(im)
    elif n in WHITE: im=unwhite(im)
    elif im.width>1920: im=im.resize((1920,round(im.height*1920/im.width)),Image.LANCZOS)
    name='%02d_%s.png'%(n,m.group(2).upper()); im.save(os.path.join(DST,name),optimize=True); files[slot]=name
    if n==15:
        g=slice_grid(im,4,4)
        if g: pack([g[0],g[3],g[1],g[2]],4,4).save(os.path.join(DST,'sikee_walk_96.png')); files['sikee_walk_96']='sikee_walk_96.png'; notes['sikee_walk_96']='rows down,up,left,right (from sheet rows front,left,right,back)'
        else: notes['sikee_walk_96']='SKIPPED: could not find a clean 4x4 grid; derived owner-art sheet stays in use'
    if n==7:
        g=slice_grid(im,2,3)
        if g:
            for nm,cell in zip(['crate','crate_stack','crate_open','shelf_full','shelf_empty','hand_cart'],g[0]+g[1]):
                cell=cell.crop(cell.getbbox()); cell.thumbnail((256,256)); fn='07_'+nm+'.png'; cell.save(os.path.join(DST,fn)); files['crates_'+nm]=fn
        else: notes['crates']='SKIPPED slicing: no clean 2x3 grid'
    if n==11:
        g=slice_grid(im,1,2)
        if g:
            for nm,cell in zip(['big','quick'],g[0]):
                cell=cell.crop(cell.getbbox()); cell.thumbnail((400,400)); fn='11_rival_'+nm+'.png'; cell.save(os.path.join(DST,fn)); files['rival_'+nm]=fn
        else: notes['rivals']='SKIPPED slicing: no clean 1x2 layout'
    if n==10:
        g=slice_grid(im,1,2) or slice_blobs(im,2) or slice_valleys(im,2)
        for nm,cell in zip(['front','side'],g[0]):
            cell=cell.crop(cell.getbbox()); cell.thumbnail((300,300)); fn='10_drone_'+nm+'.png'; cell.save(os.path.join(DST,fn)); files['drone_'+nm]=fn
    if n in (8,9,14,18):
        c=im.crop(im.getbbox()); c.thumbnail((512,512)); fn='%02d_cut.png'%n; c.save(os.path.join(DST,fn)); files[SLOTS[n]+'_cut']=fn
    if n==16:
        g=slice_grid(im,1,8) or slice_blobs(im,8) or slice_valleys(im,8)
        if g: pack(g,8,1).save(os.path.join(DST,'sikee_combat_96.png')); files['sikee_combat_96']='sikee_combat_96.png'; notes['sikee_combat_96']='8 cells: idle,idle2,windup,strike,block,hit,cast,ko'
        else: notes['sikee_combat_96']='SKIPPED: could not find a clean 1x8 row; derived owner-art sheet stays in use'
man={'status':'PROPOSAL_HOLD','source':SRC,'files':files,'notes':notes}
open(os.path.join(DST,'manifest.js'),'w').write('/* generated by tools/sync_chatgpt_art.py — do not edit */\nwindow.YOUR_ART_MANIFEST='+json.dumps(man,indent=1)+';\n')
print(json.dumps(man,indent=1))
