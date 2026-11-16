/* YOUR job scene — B08 · PROPOSAL_HOLD. Corner Store shift: stock 5 crates on the shelf (+$45).
   Sources: Y.O.U.R. slice store scene (crate positions [[260,200],[340,260],[200,280],[420,230],[300,150]], pick radius 44,
   shelf on the left, storeCount n/5, +$45 +20xp, Dex lines) ; Living WIR startShift/workScreen/finishShift (shift structure).
   Art: flat shapes only — no store/crate/shelf sprite exists in the teardown library (gap).
   PROPOSED: 90 s shift timer, partial pay 9 per crate on timeout, room 620x420, 5 shelf slots, drop radius 50. */
(function(){
'use strict';
var Y=window.YOUR=window.YOUR||{};
var CRATES=[[260,200],[340,260],[200,280],[420,230],[300,150]]; // Y.O.U.R.
var PICK_R=44, DROP_R=50, SHIFT_T=90, PARTIAL=9, RW=620, RH=420; // PICK_R from Y.O.U.R.; rest PROPOSED
var OX=(960-RW)/2, OY=(540-RH)/2+20;
var SLOTS=[0,1,2,3,4].map(function(i){return {x:44,y:90+i*62,crate:false};});
var EXIT={x:310,y:400,r:36};
var sc={CRATES:CRATES,SHIFT_T:SHIFT_T,PARTIAL:PARTIAL,state:'idle',t:0,carry:null,crates:[],slots:SLOTS,player:null,exited:false,paid:0};
function solid(x,y){ return x<20||x>RW-20||y<40||y>RH-6||(x<70&&y>70&&y<400); }
sc.count=function(){ return SLOTS.filter(function(s){return s.crate;}).length; };
sc.enter=function(d){ var p=Y.profile.data; sc.exited=false; sc.paid=0; sc.carry=null; sc.msg='';
  if(!sc.player){ sc.player=new Y.Character(); try{sc.player.sheet=Y.SpriteSheet.fromConfig();}catch(e){sc.player.sheet=Y.SpriteSheet.fromConfig('neutral');} }
  sc.player.x=EXIT.x; sc.player.y=EXIT.y-30; sc.player.face='up';
  SLOTS.forEach(function(s){s.crate=false;});
  if(p.flags.job){ sc.state='done'; sc.crates=[]; sc.msg='Shift done for today — come back tomorrow.'; if(Y.hud)Y.hud.toast(sc.msg); return; }
  if(Y.day&&!(d&&d.free)&&!Y.day.start('job')){ sc.state='refused'; sc.crates=[]; sc.msg='Too tired to work.'; return; }
  sc.crates=CRATES.map(function(c){return {x:c[0],y:c[1],taken:false,placed:false};}); p.flags.storeCount=0; sc.t=SHIFT_T; sc.state='shift';
  if(Y.hud)Y.hud.toast('Stock the shelf: 0/5'); };
sc.finish=function(){ sc.state='done'; var p=Y.profile.data; if(Y.day)sc.paid=Y.day.complete('job'); else { sc.paid=45; Y.profile.earn(45,'job'); p.flags.job=true; }
  sc.msg='Shift complete! +$'+sc.paid; if(Y.audio)Y.audio.sfx('coin'); };
sc.timeout=function(){ var n=sc.count(); sc.state='timeout'; sc.paid=n*PARTIAL; if(sc.paid)Y.profile.earn(sc.paid,'job partial'); Y.profile.event('job_timeout',{crates:n,amount:sc.paid}); Y.profile.save();
  sc.msg='Time up: '+n+'/5 stocked, partial pay $'+sc.paid; if(Y.hud)Y.hud.toast(sc.msg); };
sc.exit=function(){};
sc.leave=function(){ sc.exited=true; if(Y.core.scene.has('world')&&Y.core.scene.name==='job')Y.core.scene.go('world',{from:'store'}); };
sc.act=function(){ var P=sc.player,p=Y.profile.data;
  if(sc.state!=='shift')return null;
  if(!sc.carry){ var best=null,bd=PICK_R; sc.crates.forEach(function(c){ if(c.taken)return; var d=Math.hypot(P.x-c.x,P.y-c.y); if(d<bd){bd=d;best=c;} });
    if(best){ best.taken=true; sc.carry=best; if(Y.audio)Y.audio.sfx('pickup'); return 'pick'; } return null; }
  var slot=null,sd=DROP_R; SLOTS.forEach(function(s){ if(s.crate)return; var d=Math.hypot(P.x-(s.x+30),P.y-s.y); if(d<sd){sd=d;slot=s;} });
  if(slot){ slot.crate=true; sc.carry.placed=true; sc.carry=null; p.flags.storeCount=sc.count(); if(Y.hud)Y.hud.toast('Stocked '+sc.count()+'/5'); if(sc.count()>=5)sc.finish(); return 'drop'; } return null; };
sc.update=function(dt){ var I=Y.input,P=sc.player; P.update(dt,I.held('moveX'),I.held('moveY'),solid);
  if(sc.state==='shift'){ sc.t-=dt; if(sc.t<=0){sc.t=0; sc.timeout();} }
  if(I.pressed('a')){ if(Math.hypot(P.x-EXIT.x,P.y-EXIT.y)<EXIT.r&&!sc.carry)sc.leave(); else sc.act(); }
  if(sc.carry){ sc.carry.x=P.x; sc.carry.y=P.y-30; } };
sc.render=function(g){ g.fillStyle='#1d1a22'; g.fillRect(0,0,960,540); g.save(); g.translate(OX,OY);
  g.fillStyle='#cbb894'; g.fillRect(0,0,RW,RH); g.fillStyle='#8a7350'; for(var i=0;i<RW;i+=40)g.fillRect(i,0,1,RH);
  g.fillStyle='#5b4636'; g.fillRect(0,0,RW,36); g.fillStyle='#fff'; g.font='bold 16px system-ui'; g.textAlign='center'; g.fillText('CORNER STORE',RW/2,24);
  g.fillStyle='#6d4c33'; g.fillRect(20,70,50,330); SLOTS.forEach(function(s){ g.fillStyle='#4a3324'; g.fillRect(s.x-20,s.y-18,64,6); if(s.crate){ g.fillStyle='#b0804a'; g.fillRect(s.x-12,s.y-40,24,22); g.strokeStyle='#6b4a2a'; g.strokeRect(s.x-12,s.y-40,24,22);} });
  g.fillStyle='#3a2e22'; g.fillRect(EXIT.x-30,RH-10,60,10); g.fillStyle='#fff'; g.font='11px system-ui'; g.fillText('EXIT (A)',EXIT.x,RH-14);
  var ds=sc.crates.filter(function(c){return !c.placed;}).map(function(c){return {y:c.y,draw:function(g){ g.fillStyle='#b0804a'; g.fillRect(c.x-12,c.y-24,24,22); g.strokeStyle='#6b4a2a'; g.strokeRect(c.x-12,c.y-24,24,22); g.beginPath(); g.moveTo(c.x-12,c.y-24); g.lineTo(c.x+12,c.y-2); g.stroke(); }};});
  ds.push({y:sc.player.y,draw:function(g){sc.player.draw(g,0,0);}}); ds.sort(function(a,b){return a.y-b.y;}).forEach(function(d){d.draw(g);});
  g.restore();
  g.fillStyle='rgba(0,0,0,.6)'; g.fillRect(960-230,14,216,52); g.fillStyle='#ffd166'; g.font='bold 16px system-ui'; g.textAlign='left';
  g.fillText('Stocked '+sc.count()+'/5',960-220,36); g.fillStyle='#fff'; g.fillText(sc.state==='shift'?('Time '+Math.ceil(sc.t)+'s'):sc.state.toUpperCase(),960-220,58);
  if(sc.msg&&sc.state!=='shift'){ g.textAlign='center'; g.fillStyle='rgba(0,0,0,.7)'; g.fillRect(260,250,440,40); g.fillStyle='#ffd166'; g.fillText(sc.msg,480,276); }
  if(Y.hud)Y.hud.render(g); };
sc.solid=solid; sc.EXIT=EXIT; sc.OX=OX; sc.OY=OY;
Y.job=sc; if(Y.core)Y.core.scene.register('job',sc);
})();
