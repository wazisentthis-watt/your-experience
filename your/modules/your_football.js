/* YOUR football practice — B10 · PROPOSAL_HOLD. Score 2 touchdowns vs pursuing defenders (+$50).
   Sources: Y.O.U.R. slice updateField/spawnDefenders/approach/collide: field 420x1000, start (210,940), end zone y<60,
     4 defenders (x 60-360, y 560-i*130, speed 150+i*18+rnd 0-10, lead 0.35), tackle dist 28 unless dodging / z>=18, juke credit dist 34,
     player acc 1100 / dec 1500 / max 255, dodge: vel 480, dodgeT .26, stamina -20; +$50 +30xp after 2 TDs.
   WIR Extreme Football V23 project() (ground → screen with depth zoom); WIR Combine execJuke/execSpin/steerDefender (juke vs spin split, pursuit).
   Players drawn procedurally (neutral). Backdrop: Extreme Football crowd strip (library). No Elemental Gridiron / flagged sheets used.
   PROPOSED: juke cooldown 0.6 s, spin = forward burst (stamina 25), stamina regen 20/s, min defender separation 30 px, jump vz 300 g 1200, K=420 projection. */
(function(){
'use strict';
var Y=window.YOUR=window.YOUR||{};
var FW=420,FH=1000,START={x:210,y:940},GOAL_Y=60,DEFS=4,TACKLE=28,JUKE_R=34;            // Y.O.U.R.
var ACC=1100,DEC=1500,MAX=255,DODGE_V=480,DODGE_T=.26,DODGE_STA=20;                   // Y.O.U.R.
var JUKE_CD=.6,SPIN_STA=25,REGEN=20,SEP=30,JUMP_V=300,GRAV=1200,K=420;               // PROPOSED
var f={FW:FW,FH:FH,GOAL_Y:GOAL_Y,JUKE_CD:JUKE_CD,SEP:SEP,P:null,def:[],td:0,tries:0,paid:0,over:false,cam:{y:START.y},rng:null,equity:null};
function rnd(a,b){ return a+f.rng()*(b-a); }
f.seed=function(n){ var s=n>>>0||1; f.rng=function(){ s=(Math.imul(1664525,s)+1013904223)>>>0; return s/4294967296; }; };
f.seed(12345);
f.spawnDefenders=function(){ f.def=[]; for(var i=0;i<DEFS;i++)f.def.push({x:rnd(60,360),y:560-i*130,sp:150+i*18+rnd(0,10),face:0,juked:false}); };
f.resetDrill=function(){ var P=f.P; P.x=START.x; P.y=START.y; P.vx=P.vy=0; P.z=0; P.vz=0; P.dodgeT=0; f.spawnDefenders(); };
f.project=function(x,y,z){ /* depth = distance ahead of camera; nearer = bigger (Extreme Football project() idea) */
  var d=Math.max(-150,f.cam.y+140-y), sc=K/(d+K), hor=120, bot=560; return {x:480+(x-FW/2)*sc*1.9, y:hor+(bot-hor)*sc-(z||0)*sc, scale:sc}; };
f.enter=function(d){ var p=Y.profile.data; f.P={x:START.x,y:START.y,vx:0,vy:0,z:0,vz:0,face:-Math.PI/2,dodgeT:0,cd:0,kind:''}; f.td=0; f.tries=0; f.paid=0; f.over=false; f.result=null; f.spawnDefenders(); f.cam.y=START.y;
  f.equity=(Y.fair&&Y.fair.equity)?Y.fair.equity.pick('football',f.rng):null;
  if(Y.day&&!(d&&d.free)&&!Y.day.start('football')){ f.over=true; f.result='refused'; } };
f.exit=function(){};
f.juke=function(kind){ var P=f.P,p=Y.profile.data, cost=kind==='spin'?SPIN_STA:DODGE_STA;
  if(P.cd>0||p.stamina<cost)return false; Y.profile.add('stamina',-cost); P.cd=JUKE_CD; P.dodgeT=DODGE_T; P.kind=kind;
  var m=Math.hypot(P.vx,P.vy)||1, fx=P.vx/m, fy=P.vy/m; if(m<5){fx=0;fy=-1;}
  if(kind==='spin'){ P.vx=fx*DODGE_V; P.vy=fy*DODGE_V; } else { var side=(Y.input&&Y.input.held('moveX')<0)?-1:1; P.vx=-fy*side*DODGE_V; P.vy=fx*side*DODGE_V; }
  return true; };
f.separate=function(){ for(var i=0;i<f.def.length;i++)for(var j=i+1;j<f.def.length;j++){ var a=f.def[i],b=f.def[j],dx=b.x-a.x,dy=b.y-a.y,l=Math.hypot(dx,dy);
  if(l<SEP){ if(l<0.001){dx=1;dy=0;l=1;} var push=(SEP-l)/2; a.x-=dx/l*push; a.y-=dy/l*push; b.x+=dx/l*push; b.y+=dy/l*push; } } };
f.minSeparation=function(){ var m=1e9; for(var i=0;i<f.def.length;i++)for(var j=i+1;j<f.def.length;j++)m=Math.min(m,Math.hypot(f.def[i].x-f.def[j].x,f.def[i].y-f.def[j].y)); return m; };
f.step=function(dt,inp){ var P=f.P,p=Y.profile.data;
  P.cd=Math.max(0,P.cd-dt); P.dodgeT=Math.max(0,P.dodgeT-dt); Y.profile.add('stamina',REGEN*dt);
  if(P.dodgeT<=0){ var mag=Math.min(1,Math.hypot(inp.x,inp.y));
    if(mag>0.01){ P.vx+=inp.x/Math.max(mag,1e-6)*mag*ACC*dt; P.vy+=inp.y/Math.max(mag,1e-6)*mag*ACC*dt; var s=Math.hypot(P.vx,P.vy); if(s>MAX){P.vx*=MAX/s;P.vy*=MAX/s;} P.face=Math.atan2(P.vy,P.vx); }
    else { var s2=Math.hypot(P.vx,P.vy),k=s2>0?Math.max(0,s2-DEC*dt)/s2:0; P.vx*=k; P.vy*=k; } }
  if(inp.jump&&P.z<=0){ P.vz=JUMP_V; } if(P.z>0||P.vz>0){ P.vz-=GRAV*dt; P.z=Math.max(0,P.z+P.vz*dt); if(P.z===0)P.vz=0; }
  P.x=Math.max(16,Math.min(FW-16,P.x+P.vx*dt)); P.y=Math.max(20,Math.min(FH-10,P.y+P.vy*dt));
  var tackled=false;
  f.def.forEach(function(d){ var lead=0.35,tx=P.x+P.vx*lead,ty=P.y+P.vy*lead,dx=tx-d.x,dy=ty-d.y,l=Math.hypot(dx,dy)||1;
    d.x+=dx/l*d.sp*dt; d.y+=dy/l*d.sp*dt; d.face=Math.atan2(dy,dx);
    var dist=Math.hypot(P.x-d.x,P.y-d.y);
    if(dist<TACKLE&&P.dodgeT<=0&&P.z<18)tackled=true; else if(dist<JUKE_R&&P.dodgeT>0&&!d.juked){ d.juked=true; Y.profile.gainXP(2); if(Y.hud)Y.hud.toast(P.kind==='spin'?'Spin!':'Juke!'); } });
  f.separate();
  if(tackled){ f.tries++; if(Y.hud)Y.hud.toast('Tackled! Try a juke (X), spin (Y) or jump (A).'); if(Y.audio)Y.audio.sfx('whistle'); f.resetDrill(); return 'tackle'; }
  if(P.y<GOAL_Y){ f.td++; if(Y.audio)Y.audio.sfx('whistle'); f.resetDrill();
    if(f.td>=2){ f.over=true; f.result='complete'; f.paid=Y.day?Y.day.complete('football',{score:f.td}):(Y.profile.earn(50,'football'),50); if(Y.hud)Y.hud.toast('Practice done! +$'+f.paid); }
    else if(Y.hud)Y.hud.toast('Touchdown! One more.'); return 'td'; }
  f.cam.y+=(P.y-f.cam.y)*Math.min(1,6*dt); return null; };
f.update=function(dt){ var I=Y.input; if(f.over){ if(I.pressed('a')&&Y.core.scene.has('world'))Y.core.scene.go('world',{from:'field'}); return; }
  if(I.pressed('x'))f.juke('juke'); if(I.pressed('y'))f.juke('spin');
  f.step(dt,{x:I.held('moveX'),y:I.held('moveY'),jump:I.pressed('a')}); };
function body(g,pt,col,num,juking){ var s=pt.scale*1.15; g.fillStyle='rgba(0,0,0,.3)'; g.beginPath(); g.ellipse(pt.x,pt.y,14*s,5*s,0,0,7); g.fill();
  g.fillStyle=juking?'#fff':col; g.fillRect(pt.x-9*s,pt.y-40*s,18*s,26*s); g.fillStyle='#333'; g.fillRect(pt.x-8*s,pt.y-15*s,6*s,15*s); g.fillRect(pt.x+2*s,pt.y-15*s,6*s,15*s);
  g.fillStyle=col; g.beginPath(); g.arc(pt.x,pt.y-47*s,8*s,0,7); g.fill(); g.fillStyle='#111'; g.font='bold '+Math.round(10*s)+'px system-ui'; g.textAlign='center'; g.fillText(num,pt.x,pt.y-23*s); }
f.render=function(g){ var crowd=Y.core.assets.get('crowd'); g.fillStyle='#14202e'; g.fillRect(0,0,960,540); if(crowd)g.drawImage(crowd,0,0,960,120);
  var corners=[[0,f.cam.y+140+150],[FW,f.cam.y+140+150],[FW,f.cam.y-1400],[0,f.cam.y-1400]].map(function(c){return f.project(c[0],c[1]);});
  g.fillStyle='#2c7a3a'; g.beginPath(); corners.forEach(function(c,i){i?g.lineTo(c.x,c.y):g.moveTo(c.x,c.y);}); g.fill();
  for(var yy=0;yy<=FH;yy+=50){ var a=f.project(0,yy),b=f.project(FW,yy); if(a.y<120||a.y>560)continue; g.strokeStyle=yy<=GOAL_Y?'#ffd166':'rgba(255,255,255,.55)'; g.lineWidth=yy%100===0?2:1; g.beginPath(); g.moveTo(a.x,a.y); g.lineTo(b.x,b.y); g.stroke(); }
  var ez=[f.project(0,0),f.project(FW,0),f.project(FW,GOAL_Y),f.project(0,GOAL_Y)]; if(ez[2].y>120){ g.fillStyle='rgba(255,209,102,.25)'; g.beginPath(); ez.forEach(function(c,i){i?g.lineTo(c.x,c.y):g.moveTo(c.x,c.y);}); g.fill(); }
  var list=f.def.map(function(d,i){return {y:d.y,draw:function(){body(g,f.project(d.x,d.y,0),'#d0574e',''+(50+i));}};});
  list.push({y:f.P.y,draw:function(){body(g,f.project(f.P.x,f.P.y,f.P.z),'#9aa3b5','YOU',f.P.dodgeT>0);}});
  list.sort(function(a,b){return a.y-b.y;}).forEach(function(o){o.draw();});
  g.fillStyle='rgba(0,0,0,.6)'; g.fillRect(636,90,312,72); g.fillStyle='#fff'; g.font='bold 16px system-ui'; g.textAlign='left';
  g.fillText('PRACTICE  TD '+f.td+'/2   Tackled '+f.tries,646,112); g.fillText('X juke · Y spin · A jump  cd '+f.P.cd.toFixed(1),646,136);
  if(f.equity){ g.font='12px system-ui'; g.fillStyle='#ffd166'; g.fillText('Equity Line: '+f.equity.label,646,154); }
  if(f.over){ g.textAlign='center'; g.fillStyle='rgba(0,0,0,.7)'; g.fillRect(280,230,400,60); g.fillStyle='#ffd166'; g.font='bold 20px system-ui'; g.fillText(f.result==='complete'?'PRACTICE DONE +$'+f.paid:'Too tired for practice',480,267); }
  if(Y.hud)Y.hud.render(g); };
Y.football=f; if(Y.core)Y.core.scene.register('football',f);
})();
