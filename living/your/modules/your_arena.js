/* YOUR arena — B11 · PROPOSAL_HOLD. 2.5D arena fight vs Training Drone (+$60).
   Sources: Y.O.U.R. slice updateArena (verbatim AI: idle→chase 105px/s→wind .75/.95→strike .28/.12→recover .95, lunge 430px/s, lunge hit <40, slam hit <92,
     slam jumpable z>26, perfect dodge → stagger 1.3 +25 burst, hit 18 dmg + 320 knockback; player strike cd .42 stam 15 range 72 angle 1.2 dmg 9*pow,
     opening x2.2, flank x1.5, +8 burst; burst (Y) 50 → 30*pow within 120; drone hp 100; arena 620x620; +$60 +40xp; move acc 1700/dec 2400/max 195; dodge 480/.26/stam 20).
   FaFiFi: canContact(range 98, depth 68) + block damage x0.13 / knock x0.18 / stamina drain dmg*2.3 (hit()), project(x,z,y) depth scale .83+depth*.31 clamp .51–1.3, depth sort.
   An earlier WIR prototype core.js used as logic reference only; no third-party art or names. Drone + fighters drawn as shapes (no drone sprite exists — gap).
   PROPOSED: player start (310,520), loss costs +10 energy, stamina regen 22/s, projection screen fit. */
(function(){
'use strict';
var Y=window.YOUR=window.YOUR||{};
var AW=620,AH=620, BLOCK_MUL=0.13 /* FaFiFi hit(): blocked damage x0.13 */, BLOCK_KNOCK=0.18, LOSS_ENERGY=10, REGEN=22;
var A={AW:AW,AH:AH,BLOCK_MUL:BLOCK_MUL,P:null,e:null,over:false,result:null,paid:0,log:[]};
function clamp(v,a,b){return Math.max(a,Math.min(b,v));}
A.canContact=function(a,b,range,depth){ range=range||98; depth=depth||68; return Math.abs(a.x-b.x)<=range&&Math.abs(a.y-b.y)<=depth; }; /* FaFiFi canContact on x / depth(z≡y here) */
A.project=function(x,z,h){ var depth=(z-300)/350, sc=clamp(.83+depth*.31,.51,1.3); return {x:480+(x-310)*1.05*sc, y:540*(.60+(z-310)/1000)-(h||0)*sc, scale:sc}; }; /* FaFiFi project, screen fit adapted */
A.enter=function(d){ var p=Y.profile.data; A.over=false; A.result=null; A.paid=0; p.burst=0;
  A.P={x:310,y:520,vx:0,vy:0,z:0,vz:0,face:-Math.PI/2,dodgeT:0,atkCd:0,stun:0,block:false,lunge:0};
  A.e={x:310,y:200,hp:100,st:'idle',t:1,face:Math.PI/2,tx:0,ty:0,kind:'lunge',n:0,hit:false,hitFlash:0};
  if(Y.day&&!(d&&d.free)&&!Y.day.start('arena')){ A.over=true; A.result='refused'; } };
A.exit=function(){};
A.damagePlayer=function(dmg,knockFrom){ var P=A.P,p=Y.profile.data,mul=1,kn=320;
  if(P.block){ mul=BLOCK_MUL; kn*=BLOCK_KNOCK; Y.profile.add('stamina',-dmg*2.3); }
  var actual=dmg*mul; Y.profile.add('hp',-actual); P.stun=P.block?0.12:0.3; var l=Math.hypot(P.x-knockFrom.x,P.y-knockFrom.y)||1; P.vx=(P.x-knockFrom.x)/l*kn; P.vy=(P.y-knockFrom.y)/l*kn; P.dodgeT=0;
  A.log.push({t:'hurt',dmg:actual,blocked:P.block}); if(Y.audio)Y.audio.sfx('hit'); return actual; };
A.strike=function(){ var P=A.P,e=A.e,p=Y.profile.data;
  if(P.atkCd>0||p.stamina<15||P.stun>0)return null; P.atkCd=0.42; Y.profile.add('stamina',-15); P.lunge=0.12;
  var dist=Math.hypot(P.x-e.x,P.y-e.y),ang=Math.atan2(e.y-P.y,e.x-P.x),diff=Math.abs(Math.atan2(Math.sin(ang-P.face),Math.cos(ang-P.face)));
  if(dist<72&&diff<1.2&&A.canContact(P,e)){ var dmg=9*(p.pow||1),tag='';
    if(e.st==='recover'||e.st==='stagger'){dmg*=2.2;tag='Opening!';}
    if(Math.cos(Math.atan2(P.y-e.y,P.x-e.x)-e.face)<-0.3){dmg*=1.5;tag='Flank!';}
    var bf=Y.hub&&Y.hub.activeBuff&&Y.hub.activeBuff('arena'); if(bf&&bf.kind==='pow')dmg*=1+bf.val; /* PHATOM buff carried in */
    e.hp-=dmg; p.burst=Math.min(100,(p.burst||0)+8); e.hitFlash=0.15; if(e.st==='idle'||e.st==='chase')e.t=Math.max(e.t,0.2); if(tag&&Y.hud)Y.hud.toast(tag);
    A.log.push({t:'hit',dmg:dmg,tag:tag}); if(Y.audio)Y.audio.sfx('hit'); return dmg; }
  A.log.push({t:'whiff'}); return 0; };
A.dash=function(){ var P=A.P,p=Y.profile.data; if(p.stamina<20||P.dodgeT>0)return false; var I=Y.input,fx=I.held('moveX'),fy=I.held('moveY'),m=Math.hypot(fx,fy);
  if(m<0.1){fx=Math.cos(P.face);fy=Math.sin(P.face);m=1;} fx/=m; fy/=m; P.vx=fx*480; P.vy=fy*480; P.dodgeT=0.26; Y.profile.add('stamina',-20); return true; };
A.burst=function(){ var P=A.P,e=A.e,p=Y.profile.data; if((p.burst||0)<50)return false; p.burst-=50; if(Math.hypot(P.x-e.x,P.y-e.y)<120){ e.hp-=30*(p.pow||1); e.st='stagger'; e.t=0.9; } if(Y.hud)Y.hud.toast('Energy burst!'); return true; };
A.ai=function(dt){ var e=A.e,P=A.P,toP=Math.atan2(P.y-e.y,P.x-e.x),dist=Math.hypot(P.x-e.x,P.y-e.y); e.t-=dt; e.hitFlash=Math.max(0,e.hitFlash-dt);
  if(e.st==='idle'){ if(e.t<=0)e.st='chase'; }
  else if(e.st==='chase'){ e.face=toP; e.x+=Math.cos(toP)*105*dt; e.y+=Math.sin(toP)*105*dt;
    if(dist<(e.kind==='slam'?90:150)&&e.t<=0){ e.st='wind'; e.t=e.kind==='slam'?0.95:0.75; e.face=toP; e.tx=Math.cos(toP); e.ty=Math.sin(toP); } }
  else if(e.st==='wind'){ if(e.kind==='lunge')e.face=Math.atan2(e.ty,e.tx); if(e.t<=0){ e.st='strike'; e.t=e.kind==='slam'?0.12:0.28; e.hit=false; } }
  else if(e.st==='strike'){ if(e.kind==='lunge'){ e.x+=e.tx*430*dt; e.y+=e.ty*430*dt; }
    if(!e.hit){ var hitNow=e.kind==='lunge'?Math.hypot(P.x-e.x,P.y-e.y)<40:dist<92;
      if(hitNow){ if(e.kind==='slam'&&P.z>26){ e.hit=true; if(Y.hud)Y.hud.toast('Jumped the slam!'); }
        else if(P.dodgeT>0){ e.hit=true; e.st='stagger'; e.t=1.3; var p=Y.profile.data; p.burst=Math.min(100,(p.burst||0)+25); if(Y.hud)Y.hud.toast('PERFECT DODGE'); }
        else { e.hit=true; A.damagePlayer(18,e); } } }
    if(e.t<=0&&e.st==='strike'){ e.st='recover'; e.t=0.95; } }
  else if(e.st==='recover'||e.st==='stagger'){ if(e.t<=0){ e.st='chase'; e.t=0.25; e.kind=(e.n++%3===1)?'slam':'lunge'; } }
  e.x=clamp(e.x,20,AW-20); e.y=clamp(e.y,20,AH-20); };
A.step=function(dt,inp){ var P=A.P,p=Y.profile.data; P.atkCd=Math.max(0,P.atkCd-dt); P.dodgeT=Math.max(0,P.dodgeT-dt); P.lunge=Math.max(0,P.lunge-dt); P.block=!!inp.block&&P.dodgeT<=0; Y.profile.add('stamina',REGEN*dt*(P.block?0.3:1));
  if(P.stun>0){ P.stun-=dt; } else if(P.dodgeT<=0){ var mag=Math.min(1,Math.hypot(inp.x,inp.y)),max=P.block?80:195*(p.spd||1);
    if(mag>0.01){ P.vx+=inp.x*1700*dt; P.vy+=inp.y*1700*dt; var s=Math.hypot(P.vx,P.vy); if(s>max){P.vx*=max/s;P.vy*=max/s;} P.face=Math.atan2(inp.y,inp.x); }
    else { var s2=Math.hypot(P.vx,P.vy),k=s2>0?Math.max(0,s2-2400*dt)/s2:0; P.vx*=k; P.vy*=k; } }
  P.x=clamp(P.x+P.vx*dt,20,AW-20); P.y=clamp(P.y+P.vy*dt,20,AH-20);
  if(P.stun>0){ P.vx*=Math.max(0,1-6*dt); P.vy*=Math.max(0,1-6*dt); }
  A.ai(dt);
  if(A.e.hp<=0&&!A.over){ A.over=true; A.result='win'; A.paid=Y.day?Y.day.complete('arena'):(Y.profile.earn(60,'arena'),60); if(Y.hud)Y.hud.toast('Drone defeated! +$'+A.paid); }
  else if(p.hp<=0&&!A.over){ A.over=true; A.result='loss'; A.paid=0; if(Y.day)Y.day.fail('arena',LOSS_ENERGY); if(Y.hud)Y.hud.toast('Knocked out. Heading back...'); } };
A.update=function(dt){ var I=Y.input; if(A.over){ if(I.pressed('a')&&Y.core.scene.has('world'))Y.core.scene.go('world',{from:'arena'}); return; }
  if(I.pressed('a'))A.strike(); if(I.pressed('b'))A.dash(); if(I.pressed('y'))A.burst();
  A.step(dt,{x:I.held('moveX'),y:I.held('moveY'),block:I.held('x')}); };
A.drawOrder=function(){ return [{id:'player',y:A.P.y},{id:'drone',y:A.e.y}].sort(function(a,b){return a.y-b.y;}).map(function(o){return o.id;}); }; /* nearer (larger z) drawn last */
A.render=function(g){ g.fillStyle='#211d2e'; g.fillRect(0,0,960,540);
  var c=[[0,0],[AW,0],[AW,AH],[0,AH]].map(function(q){return A.project(q[0],q[1]);}); g.fillStyle='#3a3550'; g.beginPath(); c.forEach(function(q,i){i?g.lineTo(q.x,q.y):g.moveTo(q.x,q.y);}); g.fill();
  g.strokeStyle='rgba(255,255,255,.15)'; for(var z=0;z<=AH;z+=62){ var a=A.project(0,z),b=A.project(AW,z); g.beginPath(); g.moveTo(a.x,a.y); g.lineTo(b.x,b.y); g.stroke(); }
  var P=A.P,e=A.e;
  A.drawOrder().forEach(function(id){
    if(id==='drone'){ var q=A.project(e.x,e.y,40),s=q.scale,gq=A.project(e.x,e.y,0); g.fillStyle='rgba(0,0,0,.35)'; g.beginPath(); g.ellipse(gq.x,gq.y,26*s,8*s,0,0,7); g.fill();
      g.fillStyle=e.hitFlash>0?'#fff':(e.st==='wind'?'#ffb347':e.st==='stagger'||e.st==='recover'?'#7dffb0':'#8c96b8'); g.beginPath(); g.arc(q.x,q.y-14*s,22*s,0,7); g.fill();
      g.fillStyle='#ff5d73'; g.beginPath(); g.arc(q.x+Math.cos(e.face)*10*s,q.y-14*s+Math.sin(e.face)*6*s,6*s,0,7); g.fill(); g.strokeStyle='#cfd6e0'; g.lineWidth=3*s; g.beginPath(); g.moveTo(q.x-30*s,q.y-30*s); g.lineTo(q.x+30*s,q.y-30*s); g.stroke(); }
    else { var pq=A.project(P.x,P.y,P.z),ps=pq.scale*1.1,gp=A.project(P.x,P.y,0); g.fillStyle='rgba(0,0,0,.35)'; g.beginPath(); g.ellipse(gp.x,gp.y,14*ps,5*ps,0,0,7); g.fill();
      g.fillStyle=P.dodgeT>0?'#fff':'#9aa3b5'; g.fillRect(pq.x-9*ps,pq.y-42*ps,18*ps,28*ps); g.fillStyle='#4a5160'; g.fillRect(pq.x-8*ps,pq.y-15*ps,6*ps,15*ps); g.fillRect(pq.x+2*ps,pq.y-15*ps,6*ps,15*ps);
      g.fillStyle='#9aa3b5'; g.beginPath(); g.arc(pq.x,pq.y-49*ps,8*ps,0,7); g.fill();
      if(P.block){ g.strokeStyle='#4ecdc4'; g.lineWidth=3; g.beginPath(); g.arc(pq.x,pq.y-30*ps,22*ps,0,7); g.stroke(); }
      if(P.lunge>0){ g.fillStyle='#ffd166'; g.beginPath(); g.arc(pq.x+Math.cos(P.face)*22*ps,pq.y-32*ps+Math.sin(P.face)*8*ps,7*ps,0,7); g.fill(); } } });
  var p=Y.profile.data; g.fillStyle='rgba(0,0,0,.6)'; g.fillRect(636,90,312,72); g.fillStyle='#fff'; g.font='bold 16px system-ui'; g.textAlign='left';
  g.fillText('TRAINING DRONE  HP '+Math.max(0,Math.round(e.hp))+'  ['+e.st+']',646,112); g.fillText('Burst '+Math.round(p.burst||0)+'  A strike · B dash · X block',646,136);
  if(A.over){ g.textAlign='center'; g.fillStyle='rgba(0,0,0,.7)'; g.fillRect(280,230,400,60); g.fillStyle='#ffd166'; g.font='bold 20px system-ui'; g.fillText(A.result==='win'?'DRONE DEFEATED +$'+A.paid:A.result==='loss'?'KNOCKED OUT':'Too tired to fight',480,267); }
  if(Y.hud)Y.hud.render(g); };
Y.arena=A; if(Y.core)Y.core.scene.register('arena',A);
})();
