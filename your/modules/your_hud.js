/* YOUR HUD — B14 · PROPOSAL_HOLD. Bars (HP/Stamina/Energy), money, day/clock, toast queue, journal overlay, pause menu.
   Sources: Y.O.U.R. updateHud/renderJournal/toast; Lil Heavy hud/toast/minimap; Living WIR modals.
   PROPOSED: toast 2.5 s, max 3 visible, 12 px margin + CSS safe-area insets. Pause stops YOUR.core (paused flag) and is driven by onPausedTick. */
(function(){
'use strict';
var Y=window.YOUR=window.YOUR||{};
var TOAST_T=2.5, TOAST_MAX=3;
var h={queue:[],visible:[],journal:false,pauseOpen:false,sel:0,items:['Resume','Save','Quit to title'],onQuit:null,margin:12,safe:{t:0,r:0,b:0,l:0}};
(function probe(){ try{ var e=document.createElement('div'); e.style.cssText='position:fixed;visibility:hidden;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)'; document.documentElement.appendChild(e);
  var cs=getComputedStyle(e); h.safe={t:parseFloat(cs.paddingTop)||0,r:parseFloat(cs.paddingRight)||0,b:parseFloat(cs.paddingBottom)||0,l:parseFloat(cs.paddingLeft)||0}; e.remove(); }catch(err){} })();
h.toast=function(msg){ h.queue.push({msg:String(msg),t:TOAST_T}); h.pump(); };
h.pump=function(){ while(h.visible.length<TOAST_MAX&&h.queue.length)h.visible.push(h.queue.shift()); };
h.blocking=function(){ return h.journal||h.pauseOpen; };
h.toggleJournal=function(){ h.journal=!h.journal; };
h.openPause=function(){ h.pauseOpen=true; h.sel=0; Y.core.setPaused(true,'menu'); Y.core.onPausedTick=h.pausedTick; };
h.closePause=function(){ h.pauseOpen=false; Y.core.onPausedTick=null; Y.core.setPaused(false); };
h.select=function(i){ var it=h.items[i];
  if(it==='Resume')h.closePause();
  else if(it==='Save'){ var ok=Y.profile.save(); h.toast(ok?'Saved':'Save failed'); h.pump(); }
  else if(it==='Quit to title'){ h.closePause(); if(h.onQuit)h.onQuit(); } };
h.pausedTick=function(dt){ var I=Y.input; h.tickToasts(dt);
  var my=I.held('moveY'),dir=my>0.5?1:my<-0.5?-1:0; if(dir&&dir!==h._ly)h.sel=(h.sel+dir+h.items.length)%h.items.length; h._ly=dir;
  if(I.pressed('a'))h.select(h.sel); else if(I.pressed('pause'))h.closePause(); };
h.tickToasts=function(dt){ h.visible.forEach(function(t){t.t-=dt;}); h.visible=h.visible.filter(function(t){return t.t>0;}); h.pump(); };
h.update=function(dt){ h.tickToasts(dt); if(Y.input.pressed('pause')&&!h.pauseOpen)h.openPause(); };
function bar(g,x,y,w,v,mx,col,label){ g.fillStyle='rgba(0,0,0,.55)'; g.fillRect(x,y,w,12); g.fillStyle=col; g.fillRect(x+1,y+1,Math.max(0,(w-2)*v/mx),10); g.fillStyle='#fff'; g.font='bold 10px system-ui'; g.textAlign='left'; g.fillText(label+' '+Math.round(v),x+4,y+10); }
h.layout=function(){ var s=Y.core.view.s||1; return {x:h.margin+h.safe.l/s,y:h.margin+h.safe.t/s,r:Y.core.W-h.margin-h.safe.r/s,b:Y.core.H-h.margin-h.safe.b/s}; };
h.render=function(g){ var p=Y.profile&&Y.profile.data; if(!p)return; var L=h.layout(),x=L.x,y=L.y;
  g.fillStyle='rgba(10,12,20,.6)'; g.fillRect(x-6,y-6,200,74);
  bar(g,x,y,186,p.hp,p.maxHp,'#ff5d73','HP'); bar(g,x,y+16,186,p.stamina,p.maxStamina,'#4ecdc4','STA'); bar(g,x,y+32,186,p.energy,p.maxEnergy,'#ffd166','ENERGY');
  g.fillStyle='#fff'; g.font='bold 13px system-ui'; g.fillText('$'+p.money+'   Day '+p.day+'  '+(Y.day?Y.day.clock():'')+'   Lv '+p.lvl,x,y+62);
  h.last={hp:p.hp,stamina:p.stamina,energy:p.energy,money:p.money};
  g.textAlign='center'; h.visible.forEach(function(t,i){ var ty=L.b-40-i*30; g.globalAlpha=Math.min(1,t.t*3); g.font='bold 14px system-ui'; var w=g.measureText(t.msg).width+24; g.fillStyle='rgba(15,18,30,.9)'; g.fillRect(Y.core.W/2-w/2,ty-18,w,26); g.fillStyle='#ffd166'; g.fillText(t.msg,Y.core.W/2,ty); g.globalAlpha=1; });
  h.lastToastYs=h.visible.map(function(t,i){return L.b-40-i*30;});
  if(h.journal){ g.fillStyle='rgba(8,10,16,.94)'; g.fillRect(120,60,720,420); g.fillStyle='#ffd166'; g.font='bold 18px system-ui'; g.textAlign='left'; g.fillText('Journal — Day '+p.day,140,92);
    g.font='13px system-ui'; g.fillStyle='#dde'; (p.log||[]).slice(0,18).forEach(function(e,i){ g.fillText('Day '+e.day+' · '+e.t+(e.amount!==undefined?' $'+e.amount:'')+(e.reason?' ('+e.reason+')':'')+(e.a?' '+e.a:'')+(e.npc?' '+e.npc+' '+(e.d>=0?'+':'')+e.d:''),140,120+i*19); }); }
  if(h.pauseOpen){ g.fillStyle='rgba(0,0,0,.6)'; g.fillRect(0,0,Y.core.W,Y.core.H); g.textAlign='center'; g.fillStyle='#fff'; g.font='bold 28px system-ui'; g.fillText('PAUSED',Y.core.W/2,190);
    h.items.forEach(function(it,i){ g.font=(i===h.sel?'bold ':'')+'20px system-ui'; g.fillStyle=i===h.sel?'#ffd166':'#ccd'; g.fillText((i===h.sel?'▶ ':'')+it,Y.core.W/2,240+i*36); }); } };
Y.hud=h; if(Y.core)Y.core.hooks.pre.push(function(dt){h.update(dt);});
})();
