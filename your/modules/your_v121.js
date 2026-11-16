/* YOUR v1.2.1 · PROPOSAL_HOLD — hero base moves from ChatGPT 24-27 (owner starter look), wired as overlay (no base-module rewrites).
   Sheet rows (assets/hero/hero_sheet_96.png, 16x11 @96):
     7 RIGHT / 8 LEFT(mirror): 0-3 run (24) · 4-7 jump crouch/rise/apex/land (24) · 8-9 dash burst/streak (25) · 10 slide · 11 roll · 12-13 climb ladder · 14-15 climb wall (25)
     9 RIGHT / 10 LEFT(mirror): 0 takeoff · 1 hover · 2 fly diag · 3 fly side (26 row 1) · 4 fly UP · 5 fly DOWN · 6-7 fly RIGHT (26 row 2)
                               8-9 swim side · 10-11 swim dive (27) · 12-13 power-up · 14 slam · 15 spin (27)
   LABEL: 26 row 2 is 4-DIRECTION FLIGHT (front / back / side angles), NOT true top-down. Its two side frames both face right; LEFT = mirror.
   World abilities (all numbers PROPOSED, no energy/pay/stat changes):
     hold B (K / gamepad B) while moving = sprint ×1.7 (first 0.2 s = dash burst frames 25, then run cycle 24 on left/right; up/down keep walk frames)
     F (gamepad RB) = toggle flight ×1.45: jump crouch (24) → takeoff (26) → 4-direction flight; idle = hover; F again = land (24 land frame).
     Flight keeps normal collisions (hover over the road, not over buildings); doors need you to land first.
   Arena: B dash uses the 25 dash frames (was the cast stand-in). Climb/slide/roll/swim/power-up/slam/spin are in the sheet + anims for other games; not used by a YOUR mechanic yet. */
(function(){
'use strict';
var Y=window.YOUR, C=Y.config, o=C.heroSheets.owner, cols=16;
C.version='v1.2.1';
var M=function(row,cs){ return {frames:cs.map(function(c){return row*cols+c;})}; }, an={};
Object.keys(o.anims).forEach(function(k){ an[k]=o.anims[k]; });
[['right',7,9],['left',8,10]].forEach(function(d){ var s=d[0],a=d[1],b=d[2];
  an['run_'+s]=M(a,[0,1,2,3]); an['jump_crouch_'+s]=M(a,[4]); an['jump_rise_'+s]=M(a,[5]); an['jump_apex_'+s]=M(a,[6]); an['jump_land_'+s]=M(a,[7]);
  an['dash_'+s]=M(a,[8,9]); an['slide_'+s]=M(a,[10]); an['roll_'+s]=M(a,[11]); an['climb_wall_'+s]=M(a,[14,15]);
  an['fly_takeoff_'+s]=M(b,[0]); an['fly_hover_'+s]=M(b,[1]); an['fly_diag_'+s]=M(b,[2]); an['fly_side_'+s]=M(b,[3]); an['fly_'+s]=M(b,[6,7]);
  an['swim_'+s]=M(b,[8,9]); an['powerup_'+s]=M(b,[12,13]); an['slam_'+s]=M(b,[14]); an['spin_'+s]=M(b,[15]);
  an['fight_dash_'+s]=M(a,[8,9]); an['fight_powerup_'+s]=M(b,[12,13]); });
an.climb_ladder=M(7,[12,13]); an.fly_up=M(9,[4]); an.fly_down=M(9,[5]); an.swim_dive=M(9,[10,11]);
o.rows=11; o.anims=an; o.movesFrom='ChatGPT 24 run/jump · 25 climb/dash/slide/roll · 26 fly (row 2 = 4-direction flight angles, NOT true top-down) · 27 swim/power-up/slam/spin';
o.note+=' · v1.2.1: + run/jump (24), dash (25), flight (26) in the world';
var MV=Y.moves={SPRINT:1.7,FLY:1.45,DASH_T:0.2,CROUCH_T:0.12,TAKEOFF_T:0.4,LAND_T:0.22,HOVER:24,status:'PROPOSED',
  label:'Flight art: 4-direction flight (front / back / side angles), not true top-down'};
var P=Y.Character.prototype, CU=P.update, CA=P.anim, CD=P.draw;
function side(ch){ if(ch.face==='left'||ch.face==='right')ch.mv.lastH=ch.face; return ch.mv.lastH||'right'; }
P.update=function(dt,ax,ay,solid){ var m=this.mv; if(!m||!this.sheet||!this.sheet.anims.run_right)return CU.call(this,dt,ax,ay,solid);
  var I=Y.input, mov=Math.hypot(ax||0,ay||0)>0.05;
  if(!this.frozen&&I.pressed('fly')){ if(!m.fly){m.fly=true;m.flyT=0;m.landT=0;} else {m.fly=false;m.landT=MV.LAND_T;} m.toggles=(m.toggles||0)+1; }
  var sprint=!m.fly&&!this.frozen&&I.held('b')&&mov; if(sprint&&!m.sprint)m.dashT=MV.DASH_T; m.sprint=sprint;
  var base=this.speed, lift=m.fly&&m.flyT<MV.CROUCH_T; this.speed=base*(lift?0:m.fly?MV.FLY:sprint?MV.SPRINT:1);
  CU.call(this,dt,ax,ay,solid); this.speed=base; if(lift&&mov)this.state='walk';
  m.dashT=Math.max(0,(m.dashT||0)-dt); m.landT=Math.max(0,(m.landT||0)-dt); if(m.fly)m.flyT+=dt;
  m.alt=m.fly?Math.max(0,Math.min(1,(m.flyT-MV.CROUCH_T)/(MV.TAKEOFF_T-MV.CROUCH_T))):(m.landT>0?m.landT/MV.LAND_T:0); side(this); };
P.anim=function(){ var m=this.mv; if(!m||!this.sheet||!this.sheet.anims.run_right)return CA.call(this); var s=side(this), walk=this.state==='walk';
  if(m.fly){ if(m.flyT<MV.CROUCH_T)return 'jump_crouch_'+s; if(m.flyT<MV.TAKEOFF_T)return 'fly_takeoff_'+s;
    if(!walk)return 'fly_hover_'+s; return this.face==='up'?'fly_up':this.face==='down'?'fly_down':'fly_'+this.face; }
  if(m.landT>0)return 'jump_land_'+s;
  if(m.sprint&&walk){ if(m.dashT>0)return 'dash_'+s; if(this.face==='left'||this.face==='right')return 'run_'+this.face; }
  return CA.call(this); };
P.draw=function(g,ox,oy){ var m=this.mv; if(!m||!m.alt||!this.sheet)return CD.call(this,g,ox,oy);
  var x=this.x-(ox||0), y=this.y-(oy||0), h=MV.HOVER*m.alt*(1+0.12*Math.sin(this.t*5));
  g.save(); g.fillStyle='rgba(0,0,0,'+(0.32-0.12*m.alt)+')'; g.beginPath(); g.ellipse(x,y,14-4*m.alt,5-1.5*m.alt,0,0,7); g.fill(); g.restore();
  return this.sheet.draw(g,this.anim(),this.t,x,y-h,this.scale); };
/* world hooks: give the world player the move state; doors need landing; tiny control hint */
var W=Y.world, MS=W.makeScene, CE=W.checkEnter;
W.makeScene=function(opts){ var sc=MS.call(W,opts), en=sc.enter, rd=sc.render;
  sc.enter=function(d){ en.call(sc,d); sc.player.mv={fly:false,flyT:0,landT:0,dashT:0,alt:0,sprint:false,lastH:'right',toggles:(sc.player.mv&&sc.player.mv.toggles)||0}; };
  sc.render=function(g){ rd.call(sc,g); var m=sc.player&&sc.player.mv; if(!m||!sc.player.sheet||!sc.player.sheet.anims.run_right)return;
    g.save(); g.font='11px system-ui'; g.textAlign='left'; var txt=m.fly?'FLYING — F to land · '+MV.label:'Hold B: sprint · F: fly';
    var tw=g.measureText(txt).width+10; g.fillStyle='rgba(0,0,0,.5)'; g.fillRect(8,Y.core.H-24,tw,17); g.fillStyle=m.fly?'#7df9ff':'#ddd'; g.fillText(txt,13,Y.core.H-12); g.restore(); };
  return sc; };
W.checkEnter=function(ch,input){ if(ch&&ch.mv&&(ch.mv.fly||ch.mv.alt>0)){ if(input.pressed('a')&&Y.hud&&Y.hud.toast)Y.hud.toast('Land first (F) to go inside'); return null; } return CE.call(W,ch,input); };
})();
