# Cut Sikee full-body views from the owner turnaround sheet (background removal by border flood-fill on a light grey bg).
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage
SRC='/workspace/game-recovery/your-art/ref/sikee_authority_form_turnaround.jpg'
OUT='/workspace/game-recovery/your-build/assets/sikee/ref'
im=np.asarray(Image.open(SRC).convert('RGB')).astype(np.int16)
H,W,_=im.shape
def cut(box,name,shadow_cut=True):
    x0,y0,x1,y1=box; a=im[y0:y1,x0:x1]
    # background estimate from the box border
    border=np.concatenate([a[0],a[-1],a[:,0],a[:,-1]]); bg=np.median(border,axis=0)
    d=np.sqrt(((a-bg)**2).sum(-1)); lum=a.mean(-1)
    sat=a.max(-1)-a.min(-1)
    cand=((d<34)&(lum>150))|((sat<14)&(lum>110))   # bg grey + neutral floor shadow (robe is dark/brown, never neutral light grey)
    lab,_=ndimage.label(cand); edge=set(np.unique(np.concatenate([lab[0],lab[-1],lab[:,0],lab[:,-1]])))-{0}
    bgm=np.isin(lab,list(edge))
    fg=~bgm; fg=ndimage.binary_opening(fg,iterations=1)
    lab2,n=ndimage.label(fg)
    if n>1:  # keep the largest component + anything big (detached beads/feet)
        sizes=ndimage.sum(fg,lab2,range(1,n+1)); keep=[i+1 for i,s in enumerate(sizes) if s>=max(sizes)*0.02]
        fg=np.isin(lab2,keep)
    fg=ndimage.binary_fill_holes(fg)
    alpha=Image.fromarray((fg*255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.8))
    rgb=Image.fromarray(a.astype(np.uint8)); rgba=rgb.convert('RGBA'); rgba.putalpha(alpha)
    bb=rgba.getbbox(); rgba=rgba.crop(bb); rgba.save(f'{OUT}/{name}.png'); return rgba.size,bb
S=1500/1024
views=[('front',10,190),('left34',190,345),('left',352,500),('back',505,680),('right',680,830),('right34',830,1015)]
for n,a,b in views: print(n,cut((int(a*S),int(28*S),int(b*S),int(418*S)),'sikee_'+n))
print('top',cut((int(5*S),int(450*S),int(190*S),int(625*S)),'sikee_top'))
print('under',cut((int(195*S),int(450*S),int(380*S),int(625*S)),'sikee_underside'))
