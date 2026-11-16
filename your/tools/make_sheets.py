# Build in-game 96px sprite sheets · PROPOSAL_HOLD
# MELLA: frames from WIR Third Door (assets/frames/mella/<dir>/<anim>/NN.png, 96x96). Source atlas rows are south,east,north,west;
#   source west idle/walk frames are byte-identical to east (face right), so LEFT idle/walk = mirrored EAST (labelled). West cast is native.
#   Rows 0-3 down/up/left/right: cols 0-3 idle, 4-11 walk, 12-15 cast (native art).
#   Row 4/5 FIGHT right/left and row 6 SKATE: FALLBACK built by transforming/tinting native Mella frames (no fight/skate art exists).
# SIKEE: DERIVED FROM OWNER ART (your-art/ref/sikee_authority_form_turnaround.jpg) — cut views scaled to 96px cells,
#   procedural idle breathe / walk bob + lower-body sway; fight frames are transforms of the front / 3/4 views.
import os, json, math
from PIL import Image, ImageOps, ImageEnhance, ImageDraw, ImageFilter
R='/workspace/game-recovery/your-build/assets'
TD='/workspace/game-recovery/screens/www/WIR_Third_Door/WIR_Third_Door_Studio_Complete_v1_1/assets'
C=96
def blank(): return Image.new('RGBA',(C,C),(0,0,0,0))
def fr(d,a,i): return Image.open(f'{TD}/frames/mella/{d}/{a}/{i:02d}.png').convert('RGBA')
def tint(im,col,amt):
    ov=Image.new('RGBA',im.size,col+(0,)); a=im.split()[3]; base=im.convert('RGB'); t=Image.blend(base,Image.new('RGB',im.size,col),amt).convert('RGBA'); t.putalpha(a); return t
def xf(im,rot=0,dx=0,dy=0,sx=1.0,sy=1.0,pivot=(48,90)):
    w,h=im.size; big=Image.new('RGBA',(w*3,h*3),(0,0,0,0)); big.alpha_composite(im,(w,h))
    if sx!=1 or sy!=1:
        nb=big.resize((int(big.width*sx),int(big.height*sy)),Image.LANCZOS); px,py=(w+pivot[0])*sx,(h+pivot[1])*sy
        b2=Image.new('RGBA',big.size,(0,0,0,0)); b2.alpha_composite(nb,(int(w+pivot[0]-px),int(h+pivot[1]-py)) if True else (0,0)); big=b2
    big=big.rotate(rot,resample=Image.BICUBIC,center=(w+pivot[0],h+pivot[1]))
    out=big.crop((w-dx,h-dy,2*w-dx,2*h-dy)); return out
def glow_ring(im,r,col=(46,196,182)):
    o=im.copy(); d=ImageDraw.Draw(o); d.ellipse((70-r,30-r,70+r,30+r),outline=col+(230,),width=3); return o
# ---------- MELLA ----------
dirs=[('down','south'),('up','north'),('left','west'),('right','east')]
sheet=Image.new('RGBA',(C*16,C*7),(0,0,0,0)); notes={}
for ri,(dn,src) in enumerate(dirs):
    for i in range(4):
        im=fr('east','idle',i) if src=='west' else fr(src,'idle',i)
        if src=='west': im=ImageOps.mirror(im)
        sheet.alpha_composite(im,(i*C,ri*C))
    for i in range(8):
        im=fr('east','walk',i) if src=='west' else fr(src,'walk',i)
        if src=='west': im=ImageOps.mirror(im)
        sheet.alpha_composite(im,((4+i)*C,ri*C))
    for i in range(4): sheet.alpha_composite(fr(src,'cast',i),((12+i)*C,ri*C))
# fight row (facing right) — FALLBACK transforms
E=lambda a,i:fr('east',a,i)
fight=[E('idle',0),E('idle',2),                                    # idle 0-1
       xf(E('walk',2),rot=-8,dx=6),xf(E('cast',1),rot=-14,dx=12),xf(E('walk',2),rot=-4,dx=4),   # strike 2-4
       tint(xf(E('idle',0),dx=-3,sx=.96,sy=.98),(46,196,182),.35),tint(xf(E('idle',1),dx=-3,sx=.96,sy=.98),(46,196,182),.35),  # block 5-6 (teal guard tint)
       tint(xf(E('idle',0),rot=10,dx=-6),(255,80,90),.45),tint(xf(E('idle',0),rot=6,dx=-3),(255,80,90),.25),   # hit 7-8
       E('cast',0),E('cast',1),E('cast',2),E('cast',3),           # cast 9-12 (native cast art)
       xf(E('idle',0),rot=35,dx=14,dy=0),xf(E('idle',0),rot=70,dx=30,dy=-2),tint(xf(E('idle',0),rot=90,dx=40,dy=-6),(90,90,110),.3)]  # KO 13-15
for i,im in enumerate(fight):
    sheet.alpha_composite(im,(i*C,4*C)); sheet.alpha_composite(ImageOps.mirror(im),(i*C,5*C))
# skate row (facing right) — FALLBACK: ride, push, crouch, ollie, kickflip, grind, bail
sk=[E('idle',0),xf(E('walk',2),dx=2),xf(E('idle',0),sx=1.0,sy=.86),xf(E('idle',1),dy=-10,rot=-6),xf(E('cast',2),dy=-12,rot=-10),
    xf(E('idle',0),rot=-12),tint(xf(E('idle',0),rot=40,dx=14,dy=0),(255,80,90),.35)]
for i,im in enumerate(sk): sheet.alpha_composite(im,(i*C,6*C))
sheet.save(f'{R}/mella/mella_sheet_96.png')
Image.open(f'{TD}/portraits/mella.png').save(f'{R}/mella/mella_portrait.png')
# ---------- SIKEE ----------
def fit(view,h=92):
    im=Image.open(f'{R}/sikee/ref/sikee_{view}.png'); s=h/im.height; im=im.resize((max(1,round(im.width*s)),h),Image.LANCZOS)
    im=ImageEnhance.Sharpness(im).enhance(1.6); c=blank(); c.alpha_composite(im,((C-im.width)//2,C-h-2)); return c
def sway(im,ph):
    # walk: whole-body bob + lower-body (robe/legs, bottom 45%) horizontal shear in alternating phase
    bob=round(-2*abs(math.sin(ph))); top=im.crop((0,0,C,52)); bot=im.crop((0,52,C,C))
    sh=0.10*math.sin(ph); bot=bot.transform(bot.size,Image.AFFINE,(1,sh,-sh*22,0,1,0),Image.BICUBIC)
    o=blank(); o.alpha_composite(bot,(0,52)); o.alpha_composite(top,(0,0)); return xf(o,dy=bob,rot=1.2*math.sin(ph))
def breathe(im,k): return xf(im,sx=1.0,sy=1+0.012*math.sin(k*math.pi/2),pivot=(48,94))
sv={'down':fit('front'),'up':fit('back'),'left':fit('left'),'right':fit('right')}
s34=fit('right34'); sfront=fit('front')
ss=Image.new('RGBA',(C*16,C*6),(0,0,0,0))
for ri,dn in enumerate(['down','up','left','right']):
    for i in range(4): ss.alpha_composite(breathe(sv[dn],i),(i*C,ri*C))
    for i in range(8): ss.alpha_composite(sway(sv[dn],i*math.pi/4),((4+i)*C,ri*C))
    for i in range(4): ss.alpha_composite(glow_ring(sv[dn],6+i*5,(214,150,60)),((12+i)*C,ri*C))   # cast: bronze concentric ring (shield motif)
sf=[breathe(s34,0),breathe(s34,1),
    xf(s34,rot=-6,dx=4),xf(s34,rot=-12,dx=10),xf(s34,rot=-5,dx=5),
    tint(xf(sfront,sx=.97),(214,150,60),.25),tint(xf(sfront,sx=.97,dx=-2),(214,150,60),.35),
    tint(xf(s34,rot=9,dx=-6),(255,80,90),.4),tint(xf(s34,rot=5,dx=-3),(255,80,90),.2),
    glow_ring(s34,8,(214,150,60)),glow_ring(s34,14,(214,150,60)),glow_ring(s34,20,(214,150,60)),glow_ring(glow_ring(s34,12,(214,150,60)),22,(214,150,60)),
    xf(s34,rot=30,dx=20,dy=0),xf(s34,rot=65,dx=36,dy=-2),tint(xf(s34,rot=88,dx=44,dy=-6),(90,90,110),.35)]
for i,im in enumerate(sf):
    ss.alpha_composite(im,(i*C,4*C)); ss.alpha_composite(ImageOps.mirror(im),(i*C,5*C))
ss.save(f'{R}/sikee/sikee_sheet_96.png')
FIGHT={'idle':[0,1],'strike':[2,3,4],'block':[5,6],'hit':[7,8],'cast':[9,10,11,12],'ko':[13,14,15]}
json.dump({'status':'PROPOSAL_HOLD','cell':96,
 'mella':{'file':'mella/mella_sheet_96.png','cols':16,'rows':7,'dirs':['down','up','left','right'],'idle':[0,3],'walk':[4,11],'cast':[12,15],
   'fightRight':4,'fightLeft':5,'fight':FIGHT,'skateRow':6,'skate':['ride','push','crouch','ollie','kickflip','grind','bail'],
   'source':'WIR Third Door Studio v1.1 assets/frames/mella (native idle/walk/cast)',
   'fallback':'LEFT idle/walk = mirrored EAST (source west frames duplicate east). Rows 4-6 (fight, skate) = FALLBACK transforms/tints of native Mella frames — no fight/skate art exists (Melanaris games draw a code silhouette).'},
 'sikee':{'file':'sikee/sikee_sheet_96.png','cols':16,'rows':6,'dirs':['down','up','left','right'],'idle':[0,3],'walk':[4,11],'cast':[12,15],'fightRight':4,'fightLeft':5,'fight':FIGHT,
   'source':'DERIVED FROM OWNER ART: your-art/ref/sikee_authority_form_turnaround.jpg (front/back/left/right/right 3/4 views)',
   'method':'background removal by border flood-fill; LANCZOS to 92 px tall; procedural breathe/bob/robe sway; fight frames = rotate/translate/tint transforms; cast = bronze concentric ring overlay (shield motif)'}},
 open(f'{R}/SHEETS.json','w'),indent=1)
print('ok')
