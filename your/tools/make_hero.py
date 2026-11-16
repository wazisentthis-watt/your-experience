#!/usr/bin/env python3
"""Owner hero sheet builder · v1.1 · PROPOSAL_HOLD.
Input : assets/chatgpt/19_OWNER_STARTER_WALK_SHEET.png (keyed; 4x4 rows down,left,right,up) and 20_OWNER_STARTER_FIGHT_SHEET.png
        (keyed; 8 frames idle,step,windup,punch,kick,block,hit,victory) — written by tools/sync_chatgpt_art.py from your-art/chatgpt (owner/ChatGPT art).
Output: assets/hero/hero_sheet_96.png — SAME 16x7 @96 layout as the Mella sheet so every v1 renderer works unchanged:
  rows 0-3 down,up,left,right : cols 0-3 idle (walk frame 0 + 1px breathe), 4-11 walk (4 native frames x2), 12-15 cast = FALLBACK (fight idle/windup/punch/victory, front)
  row 4 fight RIGHT (native)  : idle[0,1]=idle,step  strike[2,3,4]=windup,punch,kick  block[5,6]  hit[7,8]  cast[9-12]=step,windup,punch,victory  ko[13-15]=FALLBACK rotate of hit
  row 5 fight LEFT            : mirror of row 4
  row 6 skate (FALLBACK)      : ride,push,crouch,ollie,kickflip,grind,bail = transforms of the right-facing walk frames
  Every cell: trimmed to its bbox, scaled by the sheet's MEDIAN body height (88 px), feet baseline aligned 4 px above the cell bottom.
Also writes assets/hero/hero_cells/ (per-frame PNGs) and assets/hero/HERO_SHEET.json (provenance)."""
import os, json, numpy as np
from PIL import Image
from scipy import ndimage
R=os.path.join(os.path.dirname(os.path.abspath(__file__)),'..'); A=os.path.join(R,'assets'); C=96; BASE=C-4
def runs(m):
    r=[];s=None
    for i,v in enumerate(m):
        if v and s is None:s=i
        if not v and s is not None:r.append((s,i));s=None
    if s is not None:r.append((s,len(m)))
    return r
def blobs(im,n,min_frac=0.02):
    al=np.asarray(im.split()[3])>20; lab,k=ndimage.label(ndimage.binary_dilation(al,iterations=3)); objs=ndimage.find_objects(lab); area=ndimage.sum(al,lab,range(1,k+1))
    order=[i for i in np.argsort(-area) if area[i]>area.max()*min_frac]; main=sorted(order[:n],key=lambda i:objs[i][1].start)
    out=[]
    for m in main:
        sl=objs[m]; c=np.asarray(im.crop((sl[1].start,sl[0].start,sl[1].stop,sl[0].stop))).copy(); mask=lab[sl]==m+1; c[...,3]=np.where(mask,c[...,3],0); out.append(Image.fromarray(c))
    return out
def walk_cells(im):
    al=np.asarray(im.split()[3])>20; rows=[x for x in runs(al.any(1)) if x[1]-x[0]>40]
    if len(rows)!=4:  # fall back to equal grid
        h=im.height//4; rows=[(i*h,(i+1)*h) for i in range(4)]
    out=[]
    for (y0,y1) in rows:
        band=im.crop((0,y0,im.width,y1)); cells=blobs(band,4)
        if len(cells)!=4: w=im.width//4; cells=[band.crop((i*w,0,(i+1)*w,band.height)) for i in range(4)]
        out.append([c.crop(c.getbbox()) for c in cells])
    return out
def grid_cells(im,rows,cols,inset=8,keep_frac=0.04):
    W,H=im.size; out=[]
    for r in range(rows):
        for c in range(cols):
            x0=int(c*W/cols)+inset; x1=int((c+1)*W/cols)-inset; y0=int(r*H/rows)+inset; y1=int((r+1)*H/rows)-inset
            cell=np.asarray(im.crop((x0,y0,x1,y1))).copy(); al=cell[...,3]>20; lab,k=ndimage.label(ndimage.binary_dilation(al,iterations=2))
            if k:
                area=ndimage.sum(al,lab,range(1,k+1)); keep=[i+1 for i in range(k) if area[i]>=area.max()*keep_frac]; cell[...,3]=np.where(np.isin(lab,keep),cell[...,3],0)
            ci=Image.fromarray(cell); out.append(ci.crop(ci.getbbox()))
    return out
def blob_frames(im,n,min_area=60):
    # n largest blobs = bodies (left->right); every smaller blob (effects: orbs, swirl, blast, motion ticks) joins the body with the nearest bbox edge
    al=np.asarray(im.split()[3])>20; lab,k=ndimage.label(ndimage.binary_dilation(al,iterations=2)); objs=ndimage.find_objects(lab); area=ndimage.sum(al,lab,range(1,k+1))
    order=list(np.argsort(-area)); main=sorted(order[:n],key=lambda i:objs[i][1].start); grp={int(m):[int(m)] for m in main}
    def gap(a,b): return max(0,objs[b][1].start-objs[a][1].stop,objs[a][1].start-objs[b][1].stop)
    for i in order[n:]:
        if area[i]<min_area: continue
        j=min(main,key=lambda m:gap(m,i))
        if gap(j,i)<=40: grp[int(j)].append(int(i))
    out=[]
    for m in main:
        ids=grp[int(m)]; y0=min(objs[i][0].start for i in ids); y1=max(objs[i][0].stop for i in ids); x0=min(objs[i][1].start for i in ids); x1=max(objs[i][1].stop for i in ids)
        c=np.asarray(im.crop((x0,y0,x1,y1))).copy(); c[...,3]=np.where(np.isin(lab[y0:y1,x0:x1],[i+1 for i in ids]),c[...,3],0); out.append(Image.fromarray(c))
    return out
def place_clip(sheet,im,col,row,s,body_w,dy=0):
    # wide effect frames (energy blast): keep body scale, centre the LEFT body_w px, clip the effect at the cell edge
    im=im.resize((max(1,round(im.width*s)),max(1,round(im.height*s))),Image.LANCZOS)
    if im.height>BASE: k=BASE/im.height; im=im.resize((max(1,round(im.width*k)),BASE),Image.LANCZOS)
    cell=Image.new('RGBA',(C,C)); x=(C-min(body_w,im.width))//2; cell.alpha_composite(im.crop((0,0,min(im.width,C-x),im.height)),(x,BASE-im.height+dy)); sheet.alpha_composite(cell,(col*C,row*C))
def place_fixed(sheet,im,col,row,s,anchor='bottom',mirror=False):
    # v1.2.1: fixed body scale; effects (aura, trails, splashes) that overflow are cropped at the cell edge instead of shrinking the body
    im=im.crop(im.getbbox()); im=im.resize((max(1,round(im.width*s)),max(1,round(im.height*s))),Image.LANCZOS)
    if mirror: im=im.transpose(Image.FLIP_LEFT_RIGHT)
    x=(C-im.width)//2; y=(BASE-im.height) if anchor=='bottom' else (C-im.height)//2
    cell=Image.new('RGBA',(C,C)); cell.alpha_composite(im.crop((max(0,-x),max(0,-y),max(0,-x)+min(im.width,C),max(0,-y)+min(im.height,C))),(max(0,x),max(0,y))); sheet.alpha_composite(cell,(col*C,row*C))
def place(sheet,im,col,row,s,dx=0,dy=0):
    im=im.crop(im.getbbox()); im=im.resize((max(1,round(im.width*s)),max(1,round(im.height*s))),Image.LANCZOS)
    if im.width>C or im.height>BASE: k=min(C/im.width,BASE/im.height); im=im.resize((max(1,round(im.width*k)),max(1,round(im.height*k))),Image.LANCZOS)
    x=col*C+(C-im.width)//2+dx; y=row*C+BASE-im.height+dy; cell=Image.new('RGBA',(C,C)); cell.alpha_composite(im,(x-col*C,y-row*C)) if 0<=x-col*C and 0<=y-row*C else cell.paste(im,(x-col*C,y-row*C),im)
    sheet.alpha_composite(cell,(col*C,row*C))
def rot(im,deg): return im.rotate(deg,resample=Image.BICUBIC,expand=True)
def main():
    W=Image.open(os.path.join(A,'chatgpt','19_OWNER_STARTER_WALK_SHEET.png')).convert('RGBA'); F=Image.open(os.path.join(A,'chatgpt','20_OWNER_STARTER_FIGHT_SHEET.png')).convert('RGBA')
    wc=walk_cells(W); fc=[c.crop(c.getbbox()) for c in blobs(F,8)]
    assert len(fc)==8, 'fight sheet: expected 8 frames, got %d'%len(fc)
    walk={'down':wc[0],'left':wc[1],'right':wc[2],'up':wc[3]}
    hs=sorted([c.height for r in wc for c in r]); s_w=88/hs[len(hs)//2]
    fh=sorted([c.height for c in fc]); s_f=88/fh[len(fh)//2]*0.98
    sh=Image.new('RGBA',(16*C,7*C))
    for r,d in enumerate(['down','up','left','right']):
        fr=walk[d]
        for i in range(4): place(sh,fr[0],i,r,s_w,dy=(1 if i in (1,2) else 0))
        for i in range(8): place(sh,fr[i%4],4+i,r,s_w)
        for i,fi in enumerate([0,2,3,7]): place(sh,fc[fi],12+i,r,s_f)   # cast = FALLBACK
    N=dict(idle=0,step=1,windup=2,punch=3,kick=4,block=5,hit=6,victory=7)
    row4=[N['idle'],N['step'],N['windup'],N['punch'],N['kick'],N['block'],N['block'],N['hit'],N['hit'],N['step'],N['windup'],N['punch'],N['victory']]
    for c,fi in enumerate(row4): place(sh,fc[fi],c,4,s_f,dy=(2 if c==8 else 0))
    KP=os.path.join(A,'chatgpt','23_OWNER_STARTER_KO_CAST_SHEET.png'); native_ko=os.path.exists(KP)
    if native_ko:   # v1.2 native: knockback,fall,down,getup,cast_windup,cast_release,energy_blast,recover
        kc=blob_frames(Image.open(KP).convert('RGBA'),8); assert len(kc)==8; K=dict(zip(['knockback','fall','down','getup','cast_windup','cast_release','energy_blast','recover'],kc))
        stand=sorted([K[k].height for k in ('cast_windup','cast_release','recover')]); s_k=88/stand[1]*0.98; bw=round(K['recover'].width*s_k)
        sh.paste(Image.new('RGBA',(7*C,C)),(9*C,4*C))   # clear v1.1 cast/KO cells before placing native frames
        for c,k in zip((9,10,12),('cast_windup','cast_release','recover')): place(sh,K[k],c,4,s_k)
        place_clip(sh,K['energy_blast'],11,4,s_k,bw)
        for c,k in zip((13,14,15),('knockback','fall','down')): place(sh,K[k],c,4,s_k)
        for r in range(4):   # directional cast cols 12-15 (rows down,up,left,right): 3/4 view reuse; LEFT row mirrored
            for i,k in enumerate(('cast_windup','cast_release','energy_blast','recover')):
                tmp=Image.new('RGBA',(C,C*1)); t2=Image.new('RGBA',(16*C,7*C))
                (place_clip if k=='energy_blast' else (lambda S,I,c_,r_,s_,b_: place(S,I,c_,r_,s_)))(t2,K[k],12+i,r,s_k,bw)
                cell=t2.crop(((12+i)*C,r*C,(13+i)*C,(r+1)*C))
                if r==2: cell=cell.transpose(Image.FLIP_LEFT_RIGHT)
                box=((12+i)*C,r*C,(13+i)*C,(r+1)*C); sh.paste(Image.new('RGBA',(C,C)),box); sh.alpha_composite(cell,(box[0],box[1]))
        for k,im in K.items(): os.makedirs(os.path.join(A,'hero','hero_cells'),exist_ok=True); im.save(os.path.join(A,'hero','hero_cells','kocast_%s.png'%k))
    else:
        for c,deg in zip((13,14,15),(25,55,85)): place(sh,rot(fc[N['hit']],-deg),c,4,s_f*0.95)   # KO FALLBACK (falls backwards, right-facing)
    r4=sh.crop((0,4*C,16*C,5*C)); cells=[r4.crop((i*C,0,(i+1)*C,C)).transpose(Image.FLIP_LEFT_RIGHT) for i in range(16)]
    for i,c in enumerate(cells): sh.alpha_composite(c,(i*C,5*C))
    rw=walk['right']
    def squash(im,kx,ky): return im.resize((max(1,round(im.width*kx)),max(1,round(im.height*ky))),Image.LANCZOS)
    SP=os.path.join(A,'chatgpt','22_OWNER_STARTER_SKATE_SHEET.png'); native_skate=os.path.exists(SP)
    if native_skate:   # v1.2 native 2x4: push,push2,cruise,crouch / ollie,air,land,bail — frames include the board
        sc=grid_cells(Image.open(SP).convert('RGBA'),2,4,inset=10,keep_frac=0.05); Sk=dict(zip(['push','push2','cruise','crouch','ollie','air','land','bail'],sc))
        s_s=min(88*1.12/Sk['cruise'].height, 92/max(c.height for c in sc))   # body+board; cap so every frame fits the cell at one scale
        # row 6 cols: 0 RIDE=cruise,1 PUSH=push,2 CROUCH=crouch,3 OLLIE=ollie,4 KICKFLIP=air,5 GRIND=crouch(reuse),6 BAIL=bail,7 PUSH b=push2,8 LAND=land,15 GETUP (from 23)
        for c,k in enumerate(['cruise','push','crouch','ollie','air','crouch','bail','push2','land']): place(sh,Sk[k],c,6,s_s)
        if native_ko: place(sh,K['getup'],15,6,s_k)
        for k,im in Sk.items(): im.save(os.path.join(A,'hero','hero_cells','skate_%s.png'%k))
    else:
        sk=[(rw[0],0,0),(rw[1],0,0),(squash(rw[0],1.06,0.82),0,0),(rw[2],0,-14),(rot(rw[0],-18),0,-18),(rot(rw[3],8),0,-6),(rot(rw[0],-80),0,0)]
        for c,(im,dx,dy) in enumerate(sk): place(sh,im,c,6,s_w,dx,dy)
    P24,P25,P26,P27=[os.path.join(A,'chatgpt',f) for f in ('24_OWNER_RUN_JUMP_SHEET.png','25_OWNER_CLIMB_DASH_SLIDE_SHEET.png','26_OWNER_FLY_SHEET.png','27_OWNER_SWIM_SPECIAL_SHEET.png')]
    moves=all(os.path.exists(x) for x in (P24,P25,P26,P27))
    if moves:   # v1.2.1 rows 7-10 (sheet grows to 16x11): 7 = side moves RIGHT, 8 = mirror LEFT, 9 = fly/swim/special RIGHT, 10 = mirror LEFT
        big=Image.new('RGBA',(16*C,11*C)); big.alpha_composite(sh,(0,0)); sh=big
        g24=grid_cells(Image.open(P24).convert('RGBA'),2,4,inset=10,keep_frac=0.05); g25=grid_cells(Image.open(P25).convert('RGBA'),2,4,inset=10,keep_frac=0.02)
        g26=grid_cells(Image.open(P26).convert('RGBA'),2,4,inset=6,keep_frac=0.02); g27=grid_cells(Image.open(P27).convert('RGBA'),2,4,inset=6,keep_frac=0.02)
        s24=88/sorted(c.height for c in g24[:4])[1]          # run frames = standing body height 88 px
        s26=88/g27[4].height*0.97                            # 27 power-up idle (body + small aura) ~ standing height; 26 and 27 share one canvas scale
        R7=[(g24[0],s24,'bottom'),(g24[1],s24,'bottom'),(g24[2],s24,'bottom'),(g24[3],s24,'bottom'),          # 0-3 run
            (g24[4],s24,'bottom'),(g24[5],s24,'bottom'),(g24[6],s24,'bottom'),(g24[7],s24,'bottom'),          # 4-7 jump crouch, rise, apex, land
            (g25[4],s24,'bottom'),(g25[5],s24,'bottom'),(g25[6],s24,'bottom'),(g25[7],s24,'center'),          # 8-9 dash burst/streak, 10 slide, 11 roll
            (g25[0],s24,'bottom'),(g25[1],s24,'bottom'),(g25[2],s24,'bottom'),(g25[3],s24,'bottom')]          # 12-13 climb ladder (back), 14-15 climb wall (side)
        R9=[(g26[0],s26,'center'),(g26[1],s26,'center'),(g26[2],s26,'center'),(g26[3],s26,'center'),          # 0 takeoff, 1 hover, 2 fly diagonal, 3 fly forward (side)
            (g26[4],s26,'center'),(g26[5],s26,'center'),(g26[6],s26,'center'),(g26[7],s26,'center'),          # 4 fly UP, 5 fly DOWN, 6-7 fly RIGHT (4-dir flight, NOT true top-down)
            (g27[0],s26,'center'),(g27[1],s26,'center'),(g27[2],s26,'center'),(g27[3],s26,'center'),          # 8-9 swim side, 10-11 swim dive (front)
            (g27[4],s26,'bottom'),(g27[5],s26,'bottom'),(g27[6],s26,'bottom'),(g27[7],s26,'bottom')]          # 12-13 power-up, 14 slam, 15 spin
        for row,R in ((7,R7),(9,R9)):
            for c,(im,sc_,an) in enumerate(R):
                place_fixed(sh,im,c,row,sc_,an)
                if not (row==9 and c in (4,5)): place_fixed(sh,im,c,row+1,sc_,an,mirror=True)
                else: place_fixed(sh,im,c,row+1,sc_,an)          # up/down flight frames are not mirrored
        for nm,gg in (('runjump',g24),('climbdash',g25),('fly',g26),('swimspecial',g27)):
            for i,im in enumerate(gg): im.save(os.path.join(A,'hero','hero_cells','%s_%d.png'%(nm,i)))
    sh.save(os.path.join(A,'hero','hero_sheet_96.png'),optimize=True)
    os.makedirs(os.path.join(A,'hero','hero_cells'),exist_ok=True)
    for d,fr in walk.items():
        for i,c in enumerate(fr): c.save(os.path.join(A,'hero','hero_cells','walk_%s_%d.png'%(d,i)))
    for k,i in N.items(): fc[i].save(os.path.join(A,'hero','hero_cells','fight_%s.png'%k))
    meta={'status':'PROPOSAL_HOLD','version':'v1.2.1' if moves else 'v1.2','cell':C,'cols':16,'rows':11 if moves else 7,'source':{'walk':'your-art/chatgpt/19_OWNER_STARTER_WALK_SHEET.png (rows down,left,right,up)','fight':'your-art/chatgpt/20_OWNER_STARTER_FIGHT_SHEET.png (idle,step,windup,punch,kick,block,hit,victory)','skate':'your-art/chatgpt/22_OWNER_STARTER_SKATE_SHEET.png (2x4 push,push,cruise,crouch / ollie,air,land,bail) -> row 6','ko_cast':'your-art/chatgpt/23_OWNER_STARTER_KO_CAST_SHEET.png (knockback,fall,down,getup,cast windup,cast release,energy blast,recover) -> row 4/5 cols 9-15, rows 0-3 cols 12-15, row 6 col 15'},
      'native':['idle/walk 4 dirs (idle = walk frame 0 + 1px breathe)','fight idle,step,windup,punch,kick,block,hit,victory (right; left = mirror)']+(['KO knockback,fall,down + cast windup,release,blast,recover (23)'] if native_ko else [])+(['skate row 6: cruise,push,crouch,ollie,air,bail,push2,land (22)'] if native_skate else []),
      'fallback':([] if native_ko else ['cast cols 12-15 (fight frames)','KO cols 13-15 row 4/5 (rotated hit)'])+([] if native_skate else ['row 6 skate poses (transforms of right-walk frames)'])+(['rows 0-3 cast cols 12-15: native 23 cast frames reused for down/up (3/4 view), mirrored for left'] if native_ko else [])+(['row 6 GRIND = crouch frame reused (no grind frame in 22)'] if native_skate else []),
      'moves_rows':({'7':'RIGHT: 0-3 run (24), 4-7 jump crouch/rise/apex/land (24), 8-9 dash (25), 10 slide, 11 roll, 12-13 climb ladder, 14-15 climb wall (25)','8':'mirror of 7 (LEFT)','9':'RIGHT: 0 takeoff, 1 hover, 2 fly diag, 3 fly side (26 row 1); 4 fly UP, 5 fly DOWN, 6-7 fly RIGHT (26 row 2 = 4-direction flight angles, NOT true top-down); 8-9 swim side, 10-11 swim dive (27); 12-13 power-up, 14 slam, 15 spin (27)','10':'mirror of 9 (LEFT); fly up/down not mirrored'} if moves else {}),'scale':{'walk_median_px':hs[len(hs)//2],'fight_median_px':fh[len(fh)//2],'body_px_in_cell':88},'baseline_px_from_bottom':4}
    pc=Image.open(os.path.join(A,'chatgpt','18_cut.png')).convert('RGBA'); pc=pc.crop(pc.getbbox()); side=max(pc.size); sq=Image.new('RGBA',(side,side)); sq.alpha_composite(pc,((side-pc.width)//2,(side-pc.height)//2)); sq.resize((256,256),Image.LANCZOS).save(os.path.join(A,'hero','hero_portrait_256.png'),optimize=True)
    meta['portrait']='assets/hero/hero_portrait_256.png (from ChatGPT 18, keyed)'
    json.dump(meta,open(os.path.join(A,'hero','HERO_SHEET.json'),'w'),indent=1); print(json.dumps(meta['scale']))
main()
