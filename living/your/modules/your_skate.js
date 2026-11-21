/* YOUR skate run — B09 · PROPOSAL_HOLD. 45 s top-down 2.5D park: 8 rings, ollie / kickflip / 180 / 50-50 grind, combo + bank, bail.
   Sources (constants kept as-is):
   - RIFFT RIDE-RZ sim.js C: G_AIR 320, PUSH_A 260, PUSH_MAX 150, TURN_LO 5.5, TURN_HI 3.0, GRIP 10, FRIC_C 4, FRIC_L .08, FRIC_Q .0005, VMAX 300,
     POP_BASE 100, POP_CHARGE 50, CHARGE_T .45, AIR_SPIN 7, FLIP_T .38, LAND_BAIL_VZ 300, LAND_ALIGN 50°, BANK_T .35, BAIL_T .9,
     SLIDE_VEL_COS .82, SLIDE_BASE 50-50 100, SLIDE_PER_S 220; tricks OLLIE 25, KICKFLIP 240, 180 150; repeat halving; combo x(1+.25*(unique-1)).
     land(): INCOMPLETE FLIP / HARD LANDING / LANDED SIDEWAYS bails. render.js PZ .58, atlas rows ride/push/crouch/ollie/kickflip/grind.
   - Y.O.U.R. slice startSkate/updateSkate: 45 s, 8 rings (positions below, y shifted -560 to fit the view), ring radius 34 / z ±45, +$30 +25xp on all rings.
   - Shared 2.5D skating core: stepSkater/railSample idea (rail sampling by projection).
   PROPOSED: park layout, rail placement, score = rings*100 + banked combo. Bail frame reuses atlas row 2 (crouch) — sheet has no bail row. */
(function(){
'use strict';
var Y=window.YOUR=window.YOUR||{};
var PI=Math.PI;
var C={G_AIR:320,PUSH_A:260,PUSH_MAX:150,TURN_LO:5.5,TURN_HI:3.0,GRIP:10,FRIC_C:4,FRIC_L:.08,FRIC_Q:.0005,VMAX:300,POP_BASE:100,POP_CHARGE:50,CHARGE_T:.45,
  AIR_SPIN:7,FLIP_T:.38,LAND_BAIL_VZ:300,LAND_ALIGN:50*PI/180,BANK_T:.35,BAIL_T:.9,SLIDE_VEL_COS:.82,SLIDE_BASE:100,SLIDE_PER_S:220,PZ:.58};
var RUN_T=45, RING_R=34, RING_Z=45;
var RINGS=[[120,650,0],[300,640,0],[460,720,0],[420,880,40],[260,900,0],[110,820,0],[200,760,50],[330,780,0]]; // Y.O.U.R.
var OX=200, OY=-560+90; // PROPOSED placement of the Y.O.U.R. ring field in the 960x540 view
var RAILS=[{id:'rail1',x1:560+OX-200,y1:150,x2:760+OX-200,y2:150,h:14},{id:'rail2',x1:80,y1:260,x2:80,y2:440,h:14}]; // PROPOSED
function angDiff(a,b){ var d=a-b; while(d>PI)d-=2*PI; while(d<-PI)d+=2*PI; return d; }
function axisDiff(a,b){ var d=Math.abs(angDiff(a,b)); return Math.min(d,PI-d); } /* board is symmetric (fakie) */
var s={C:C,RUN_T:RUN_T,RINGS:RINGS,RAILS:RAILS,angDiff:angDiff,axisDiff:axisDiff,r:null,run:null,events:[]};
s.newRider=function(x,y){ return {x:x,y:y,z:0,vx:0,vy:0,vz:0,heading:0,grounded:true,flip:-1,spin:0,charge:0,crouch:false,slide:null,combo:{list:[],sum:0},
  bailT:0,landT:0,score:0,state:'RIDE',pushT:0,lastBail:''}; };
function ev(type,o){ var e={type:type,t:s.run?RUN_T-s.run.t:0}; for(var k in o)e[k]=o[k]; s.events.push(e); if(s.events.length>60)s.events.shift(); return e; }
s.addTrick=function(r,name,pts){ var rep=r.combo.list.filter(function(t){return t.name===name;}).length, p=Math.round(pts*Math.pow(.5,rep)); r.combo.list.push({name:name,pts:p}); r.combo.sum+=p; ev('TRICK',{name:name,pts:p}); };
s.comboTotal=function(r){ var n={}; r.combo.list.forEach(function(t){n[t.name]=1;}); var u=Object.keys(n).length; return Math.round(r.combo.sum*(1+.25*Math.max(0,u-1))); };
s.bank=function(r){ var tot=s.comboTotal(r); r.score+=tot; ev('BANK',{pts:tot,tricks:r.combo.list.map(function(t){return t.name;})}); r.combo={list:[],sum:0}; return tot; };
s.bail=function(r,reason){ var lost=s.comboTotal(r); r.combo={list:[],sum:0}; r.slide=null; r.flip=-1; r.grounded=true; r.vz=0; r.z=0; r.vx*=.2; r.vy*=.2; r.bailT=C.BAIL_T; r.state='BAIL'; r.lastBail=reason; ev('BAIL',{reason:reason,lost:lost}); if(Y.audio)Y.audio.sfx('bail'); };
function speed(r){ return Math.hypot(r.vx,r.vy); }
s.land=function(r){ var impact=-r.vz; r.z=0; r.vz=0; r.grounded=true;
  if(r.flip>=0&&r.flip<1){ s.bail(r,'INCOMPLETE FLIP'); return false; }
  if(impact>C.LAND_BAIL_VZ){ s.bail(r,'HARD LANDING'); return false; }
  var sp=speed(r); if(sp>40&&axisDiff(r.heading,Math.atan2(r.vy,r.vx))>C.LAND_ALIGN){ s.bail(r,'LANDED SIDEWAYS'); return false; }
  if(r.flip>=1)s.addTrick(r,'KICKFLIP',240); if(r.spin>=PI*0.9)s.addTrick(r,'180',150);
  r.flip=-1; r.spin=0; r.landT=C.BANK_T; r.state='LAND'; ev('LAND',{impact:Math.round(impact)}); if(Y.audio)Y.audio.sfx('land'); return true; };
s.pop=function(r){ var k=Math.min(1,r.charge/C.CHARGE_T); r.vz=C.POP_BASE+C.POP_CHARGE*k; r.grounded=false; r.charge=0; r.crouch=false; r.state='OLLIE'; s.addTrick(r,'OLLIE',25); if(Y.audio)Y.audio.sfx('ollie'); };
s.railNear=function(r){ for(var i=0;i<RAILS.length;i++){ var L=RAILS[i],dx=L.x2-L.x1,dy=L.y2-L.y1,len=Math.hypot(dx,dy),ux=dx/len,uy=dy/len,
    t=((r.x-L.x1)*ux+(r.y-L.y1)*uy), px=L.x1+ux*t, py=L.y1+uy*t, d=Math.hypot(r.x-px,r.y-py);
    if(t>4&&t<len-4&&d<12)return {rail:L,t:t,ux:ux,uy:uy,len:len}; } return null; };
s.step=function(r,dt,inp){ inp=inp||{x:0,y:0,a:false,x2:false};
  if(r.bailT>0){ r.bailT-=dt; r.vx*=Math.max(0,1-4*dt); r.vy*=Math.max(0,1-4*dt); r.x+=r.vx*dt; r.y+=r.vy*dt; if(r.bailT<=0)r.state='RIDE'; return; }
  var des=(Math.hypot(inp.x,inp.y)>0.2)?Math.atan2(inp.y,inp.x):null;
  if(r.slide){ var S=r.slide,sp=Math.max(60,S.speed); S.t+=dt; S.pos+=S.dir*sp*dt; r.x=S.rail.x1+S.ux*S.pos; r.y=S.rail.y1+S.uy*S.pos; r.z=S.rail.h; r.state='GRIND';
    if(S.pos<=0||S.pos>=S.len||inp.aPressed){ s.addTrick(r,'50-50',Math.round(C.SLIDE_BASE+C.SLIDE_PER_S*S.t)); r.vx=S.ux*S.dir*sp; r.vy=S.uy*S.dir*sp; r.heading=Math.atan2(r.vy,r.vx); r.slide=null; r.grounded=false; r.vz=inp.aPressed?C.POP_BASE*0.6:0; }
    return; }
  if(r.grounded){
    var sp2=speed(r);
    if(des!==null){ var rate=C.TURN_LO+(C.TURN_HI-C.TURN_LO)*Math.min(1,sp2/220), d=angDiff(des,r.heading); r.heading+=Math.max(-rate*dt,Math.min(rate*dt,d));
      if(sp2<C.PUSH_MAX&&Math.abs(d)<50*PI/180){ r.pushT+=dt; r.vx+=Math.cos(r.heading)*C.PUSH_A*dt; r.vy+=Math.sin(r.heading)*C.PUSH_A*dt; r.state='PUSH'; } else r.state='RIDE'; }
    else r.state='RIDE';
    sp2=speed(r); var fwd=Math.cos(angDiff(Math.atan2(r.vy,r.vx),r.heading))>=0?1:-1, tv=sp2; /* grip: velocity follows board axis */
    var hx=Math.cos(r.heading)*fwd, hy=Math.sin(r.heading)*fwd, g=Math.min(1,C.GRIP*dt); r.vx+= (hx*tv-r.vx)*g; r.vy+=(hy*tv-r.vy)*g;
    var fr=(C.FRIC_C+C.FRIC_L*sp2+C.FRIC_Q*sp2*sp2)*dt; if(sp2>0){ var k=Math.max(0,sp2-fr)/sp2; r.vx*=k; r.vy*=k; }
    sp2=speed(r); if(sp2>C.VMAX){ r.vx*=C.VMAX/sp2; r.vy*=C.VMAX/sp2; }
    if(inp.a){ r.crouch=true; r.charge+=dt; r.state='CROUCH'; } else if(r.crouch){ s.pop(r); }
    if(r.landT>0){ r.landT-=dt; if(r.landT<=0&&r.combo.list.length)s.bank(r); }
  } else {
    if(des!==null){ var d2=angDiff(des,r.heading), st=Math.max(-C.AIR_SPIN*dt,Math.min(C.AIR_SPIN*dt,d2)); r.heading+=st; r.spin+=Math.abs(st); }
    if(inp.xPressed&&r.flip<0){ r.flip=0; r.state='KICKFLIP'; }
    if(r.flip>=0&&r.flip<1)r.flip=Math.min(1,r.flip+dt/C.FLIP_T);
    r.vz-=C.G_AIR*dt; r.z+=r.vz*dt;
    var near=r.vz<0?s.railNear(r):null;
    if(near&&r.z<=near.rail.h+20&&r.z>=near.rail.h-8){ var vd=Math.atan2(r.vy,r.vx), c=Math.abs(Math.cos(angDiff(vd,Math.atan2(near.uy,near.ux))));
      if(c>=C.SLIDE_VEL_COS&&(r.flip<0||r.flip>=1)){ var dir=Math.cos(angDiff(vd,Math.atan2(near.uy,near.ux)))>=0?1:-1; r.slide={rail:near.rail,ux:near.ux,uy:near.uy,len:near.len,pos:near.t,dir:dir,t:0,speed:speed(r)}; r.flip=-1; r.vz=0; r.grounded=false; ev('GRIND',{rail:near.rail.id}); return; } }
    if(r.z<=0)s.land(r); else if(r.flip<0)r.state='OLLIE'; }
  r.x+=r.vx*dt; r.y+=r.vy*dt; r.x=Math.max(20,Math.min(940,r.x)); r.y=Math.max(60,Math.min(530,r.y)); };
/* scene */
s.enter=function(d){ s.events=[]; s.r=s.newRider(OX+210,OY+940); s.r.heading=-PI/2; s.spawn={x:s.r.x,y:s.r.y};
  s.run={t:RUN_T,rings:RINGS.map(function(q){return {x:q[0]+OX,y:q[1]+OY,z:q[2],got:false};}),got:0,over:false,result:null,paid:0};
  if(Y.day&&!(d&&d.free)&&!Y.day.start('skate')){ s.run.over=true; s.run.result='refused'; } };
s.exit=function(){};
s.score=function(){ return s.run.got*100+s.r.score; };
s.end=function(result){ var R=s.run; if(R.over)return; R.over=true; R.result=result; R.endedAt=RUN_T-R.t; if(s.r.combo.list.length&&s.r.bailT<=0&&!s.r.slide&&s.r.grounded)s.bank(s.r);
  if(result==='complete'){ if(Y.day)R.paid=Y.day.complete('skate',{score:s.score()}); else { R.paid=30; Y.profile.earn(30,'skate'); } if(Y.hud)Y.hud.toast('Skate Run clear! +$'+R.paid); }
  else { if(Y.hud)Y.hud.toast('Time up. Try again!'); if(Y.day)Y.day.fail('skate'); } ev('END',{result:result,score:s.score()}); };
s.update=function(dt){ var R=s.run; if(R.over){ if(Y.input.pressed('a')&&Y.core.scene.has('world'))Y.core.scene.go('world',{from:'skatepark'}); return; }
  var I=Y.input; s.step(s.r,dt,{x:I.held('moveX'),y:I.held('moveY'),a:I.held('a'),aPressed:I.pressed('a'),xPressed:I.pressed('x')});
  R.rings.forEach(function(q){ /* v1.1 spawn guard: a ring that overlaps the rider at spawn arms only after the rider has left it (no auto-pickup on frame 1) */ if(q.guard===undefined)q.guard=!!(s.spawn&&Math.hypot(s.spawn.x-q.x,s.spawn.y-q.y)<RING_R+12); if(q.guard&&Math.hypot(s.r.x-q.x,s.r.y-q.y)>RING_R+12)q.guard=false; if(q.guard)return; if(!q.got&&Math.hypot(s.r.x-q.x,s.r.y-q.y)<RING_R&&Math.abs(s.r.z-q.z)<RING_Z){ q.got=true; R.got++; ev('RING',{n:R.got}); if(Y.audio)Y.audio.sfx('pickup'); } });
  R.t-=dt; if(R.got>=R.rings.length)s.end('complete'); else if(R.t<=1e-9){ R.t=0; s.end('timeout'); } };
s.frameFor=function(r){ var cfg=Y.config.rider, row={RIDE:0,LAND:0,PUSH:1,CROUCH:2,BAIL:2,OLLIE:3,KICKFLIP:4,GRIND:5}[r.state]; if(row===undefined)row=0;
  var col=((Math.round(r.heading/(PI/4))%8)+8)%8; return {row:row,col:col,sx:col*cfg.frame,sy:row*cfg.frame,pose:cfg.poses[row],dir:cfg.dirs[col]}; };
s.render=function(g){ var R=s.run,r=s.r,img=Y.core.assets.get('rider_atlas'),rail=Y.core.assets.get('rail'),ramp=Y.core.assets.get('ramp');
  g.fillStyle='#58606e'; g.fillRect(0,0,960,540); g.fillStyle='#6a7280'; for(var i=0;i<960;i+=48)for(var j=0;j<540;j+=48)if(((i+j)/48)%2)g.fillRect(i,j,48,48);
  RAILS.forEach(function(L){ g.strokeStyle='#222'; g.lineWidth=6; g.beginPath(); g.moveTo(L.x1,L.y1+2); g.lineTo(L.x2,L.y2+2); g.stroke(); g.strokeStyle='#cfd6e0'; g.lineWidth=4; g.beginPath(); g.moveTo(L.x1,L.y1-L.h*C.PZ); g.lineTo(L.x2,L.y2-L.h*C.PZ); g.stroke();
    if(rail)g.drawImage(rail,L.x1-24,L.y1-30,48,48); });
  if(ramp)g.drawImage(ramp,OX+400,OY+860,48,48);
  R.rings.forEach(function(q){ if(q.got)return; var yy=q.y-q.z*C.PZ; g.strokeStyle='#ffd166'; g.lineWidth=4; g.beginPath(); g.ellipse(q.x,yy-12,14,18,0,0,7); g.stroke(); if(q.z){g.strokeStyle='rgba(255,209,102,.35)'; g.lineWidth=1; g.beginPath(); g.moveTo(q.x,q.y); g.lineTo(q.x,yy); g.stroke();} });
  g.fillStyle='rgba(0,0,0,.3)'; g.beginPath(); g.ellipse(r.x,r.y+4,14-r.z*.03,5,0,0,7); g.fill();
  var f=s.frameFor(r); if(img)g.drawImage(img,f.sx,f.sy,48,48,Math.round(r.x-36),Math.round(r.y-r.z*C.PZ-66),72,72); else { g.fillStyle='#ccd'; g.fillRect(r.x-8,r.y-r.z*C.PZ-40,16,36); }
  g.fillStyle='rgba(0,0,0,.6)'; g.fillRect(636,458,312,72); g.fillStyle='#fff'; g.font='bold 16px system-ui'; g.textAlign='left';
  g.fillText('SKATE RUN  '+R.t.toFixed(1)+'s   Rings '+R.got+'/8',646,480); g.fillText('Score '+s.score()+'  Combo '+s.comboTotal(r)+(r.combo.list.length?' ['+r.combo.list.map(function(t){return t.name;}).join('+')+']':''),646,504);
  if(r.state==='BAIL'){ g.fillStyle='#ff5d73'; g.fillText('BAIL — '+r.lastBail,646,522); }
  if(R.over){ g.textAlign='center'; g.fillStyle='rgba(0,0,0,.7)'; g.fillRect(280,230,400,60); g.fillStyle='#ffd166'; g.font='bold 20px system-ui'; g.fillText(R.result==='complete'?'RUN COMPLETE +$'+R.paid:(R.result==='refused'?'Too tired to skate':'TIME UP'),480,267); }
  if(Y.hud)Y.hud.render(g); };
Y.skate=s; if(Y.core)Y.core.scene.register('skate',s);
})();
