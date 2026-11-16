/* YOUR v1.1 · PROPOSAL_HOLD — owner hero + Mella companion + shared WIR hero profile.
   HERO   : player sheet = Y.config.hero ('owner', ChatGPT 18/19/20). Name from WIR_HERO (placeholder "Hero", editable in Settings).
   MELLA  : companion NPC.
     - World: follows the hero along a breadcrumb trail (gap 46 px, catch-up 260 px/s, snaps beside the hero if > 320 px away).
       Talk to her with X (L key / pad X) — A stays for doors and the other NPCs, so she never blocks a door.
     - Dialogue: LLM / offline sheet 'mella' (companion voice PROPOSED; no invented lore).
     - Assists (FaFiFi-fair, see FAFIFI_ACTIVITIES.md §7). Both are INFORMATION or a COUNTER only: the clock, pay, road density, equity line
       and audit are unchanged, and every player gets exactly the same assist.
         job   "spotter"     : while you carry a crate she points at the next in-order empty slot (first empty slot index = the one Perfect-30 scores as crate_in_order).
         skate "line caller" : she marks the next ring of the revealed Route-Attack line; once per run she cancels a Dependency delay
                               right after a bail (counter 'protect_bond').
   SHARED PROFILE: level / xp sync to WIR_HERO; unlocks "your:<id>" on milestones; per-game data under games.your. */
(function(){
var Y=window.YOUR=window.YOUR||{}, H=window.WIR_HERO, n=Y.npc, CC=Y.config.companion||{id:'mella',followGap:46,catchUp:260};
var V={trail:[],assist:{job:0,skate:0,depCancels:0},log:[]};
function P(){ return Y.profile.data; }
/* ---------------- companion in the world ---------------- */
V.ensure=function(){ if(!n)return null; var e=n.list.filter(function(x){return x.id==='mella';})[0]; var w=Y.core.scene.current, pl=w&&w.player;
  if(!e){ e=n.add({id:'mella',name:'Mella',x:pl?pl.x-30:200,y:pl?pl.y+10:300,r:0,col:'#2ec4b6'}); e.sheetKey='mella'; e.companion=true; e.face='down'; e.state='idle'; e.t=0; V.trail=[]; }
  return e; };
V.follow=function(dt,pl){ var e=V.ensure(); if(!e||!pl)return; var tr=V.trail, last=tr[tr.length-1];
  if(!last||Math.hypot(pl.x-last.x,pl.y-last.y)>4){ tr.push({x:pl.x,y:pl.y}); if(tr.length>160)tr.shift(); }
  var d=Math.hypot(pl.x-e.x,pl.y-e.y);
  if(d>320){ e.x=pl.x-24; e.y=pl.y+6; V.trail=[{x:pl.x,y:pl.y}]; e.state='idle'; return; }
  var tgt=null, acc=0; for(var i=tr.length-1;i>0;i--){ acc+=Math.hypot(tr[i].x-tr[i-1].x,tr[i].y-tr[i-1].y); if(acc>=CC.followGap){ tgt=tr[i-1]; break; } }
  var moving=false;
  if(tgt&&d>CC.followGap*0.8){ var dx=tgt.x-e.x, dy=tgt.y-e.y, dd=Math.hypot(dx,dy); if(dd>1.5){ var sp=Math.min(CC.catchUp,Math.max(120,dd*6)), k=Math.min(1,sp*dt/dd); e.x+=dx*k; e.y+=dy*k; moving=true;
      e.face=Math.abs(dx)>Math.abs(dy)?(dx<0?'left':'right'):(dy<0?'up':'down'); } }
  if(!moving&&d>4){ var fx=pl.x-e.x, fy=pl.y-e.y; e.face=Math.abs(fx)>Math.abs(fy)?(fx<0?'left':'right'):(fy<0?'up':'down'); }
  e.state=moving?'walk':'idle'; e.tx=e.x; e.ty=e.y; e.home={x:e.x,y:e.y,r:0}; e.t=99; };
if(n){
  var _upd=n.update; n.update=function(dt,pl){ var e=n.list.filter(function(x){return x.companion;})[0], sx=e&&e.x, sy=e&&e.y; var r=_upd(dt,pl); if(e){ e.x=sx; e.y=sy; } if(Y.core.scene.name==='world'&&!n.isOpen())V.follow(dt,pl); return r; };
  var _try=n.tryTalk; n.tryTalk=function(p,I){ var keep=n.list; n.list=keep.filter(function(e){return !e.companion;}); try{ return _try(p,I); } finally { n.list=keep; } };
  var _dr=n.drawables; n.drawables=function(){ var ds=_dr(); n.list.forEach(function(e,i){ if(!e.companion)return; ds[i]={y:e.y,draw:function(g,ox,oy){ var sh=e._sheet||(e._sheet=Y.SpriteSheet.fromConfig('mella'));
        g.fillStyle='rgba(0,0,0,.3)'; g.beginPath(); g.ellipse(e.x-ox,e.y-oy,14,5,0,0,7); g.fill(); sh.draw(g,(e.state||'idle')+'_'+(e.face||'down'),Y.core.stats.t,e.x-ox,e.y-oy);
        g.font='bold 10px system-ui'; g.textAlign='center'; g.fillStyle='#000'; g.fillText('Mella · X',e.x-ox+1,e.y-oy-63); g.fillStyle='#2ec4b6'; g.fillText('Mella · X',e.x-ox,e.y-oy-64); }}; }); return ds; };
  var _pt=n.portrait; n.portrait=function(id){ if(id==='mella'){ var im=Y.core.assets.get('mella_portrait'); return {img:im,src:'wir-third-door'}; } if(id==='hero')return {img:Y.core.assets.get('hero_portrait'),src:'chatgpt-18'}; return _pt(id); };
  var _setup=n.setup; n.setup=function(){ var r=_setup.apply(this,arguments); V.ensure(); return r; };
}
/* X in the world → talk to Mella */
Y.core.hooks.pre.push(function(){ if(Y.core.scene.name!=='world'||!P()||!n||n.isOpen()||(Y.hud&&Y.hud.blocking()))return; if(Y.input.pressed('x')){ V.ensure(); n.talk('mella'); } });
/* ---------------- job assist: spotter ---------------- */
(function(){ var J=Y.job; if(!J)return; var _r=J.render;
  J.render=function(g){ _r(g); if(J.state!=='shift')return; var free=J.slots.filter(function(s){return !s.crate;})[0], sh=V.msheet();
    g.save(); g.translate(J.OX,J.OY);
    if(sh){ var mx=160, my=free?free.y+34:300; sh.draw(g,'idle_left',Y.core.stats.t,mx,my); g.font='bold 10px system-ui'; g.textAlign='center'; g.fillStyle='#2ec4b6'; g.fillText('Mella',mx,my-62); }
    if(J.carry&&free){ var t=Y.core.stats.t, a=0.55+0.45*Math.sin(t*6); g.fillStyle='rgba(46,196,182,'+(0.18+0.17*a)+')'; g.fillRect(free.x-6,free.y-26,72,52); g.strokeStyle='#2ec4b6'; g.lineWidth=3; g.setLineDash([6,4]); g.strokeRect(free.x-6,free.y-26,72,52); g.setLineDash([]);
      g.fillStyle='#2ec4b6'; g.font='bold 12px system-ui'; g.textAlign='left'; g.fillText('▲ Mella: this slot next!',free.x-6,free.y+44); if(!J._spotted){ J._spotted=true; V.assist.job++; } }
    else J._spotted=false;
    g.restore(); }; })();
/* ---------------- skate assist: line caller + one Dependency cancel ---------------- */
(function(){ var S=Y.skate; if(!S)return; var _e=S.enter,_u=S.update,_r=S.render;
  S.enter=function(d){ _e(d); S._mellaUsed=false; };
  S.update=function(dt){ var r=_u(dt), fx=Y.v1&&Y.v1.fx.skate; if(fx&&!S.run.over&&fx.dep.broken&&!S._mellaUsed){ S._mellaUsed=true; fx.dep.counter('protect_bond'); V.assist.depCancels++; V.assist.skate++; if(Y.hud)Y.hud.toast('Mella: shake it off! (bail delay cancelled — once per run)'); } return r; };
  S.render=function(g){ _r(g); var fx=Y.v1&&Y.v1.fx.skate, R=S.run, sh=V.msheet(); if(sh){ sh.draw(g,'idle_down',Y.core.stats.t,44,170); g.font='bold 10px system-ui'; g.textAlign='center'; g.fillStyle='#2ec4b6'; g.fillText('Mella',44,108); }
    if(!fx||R.over||fx.ra.step>=3)return; var idx=fx.ra.step===1?fx.road.line[0]:fx.road.line[fx.lineIdx]; var q=idx!=null&&R.rings[idx]; if(!q||q.got)return;
    var yy=q.y-q.z*S.C.PZ-12, t=Y.core.stats.t; g.save(); g.strokeStyle='#2ec4b6'; g.lineWidth=2; g.setLineDash([5,5]); g.beginPath(); g.moveTo(52,140); g.quadraticCurveTo((52+q.x)/2,Math.min(140,yy)-60,q.x,yy-22); g.stroke(); g.setLineDash([]);
    g.fillStyle='#2ec4b6'; g.beginPath(); g.arc(q.x,yy-28-3*Math.sin(t*6),5,0,7); g.fill(); g.font='bold 11px system-ui'; g.textAlign='left'; g.fillText('Mella: ring '+(fx.road.line.indexOf(idx)+1)+' of the line!',70,126); g.restore(); }; })();
V.msheet=function(){ try{ return V._ms||(V._ms=Y.SpriteSheet.fromConfig('mella')); }catch(e){ return null; } };
/* ---------------- shared hero profile sync ---------------- */
V.sync=function(){ var p=P(); if(!p||!H)return; H.syncLevel(p.lvl||1,p.xp||0); H.gameData('your',{level:p.lvl||1,data:{day:p.day,money:p.money,story:p.story||{}}}); };
V.unlock=function(id){ if(H&&H.unlock('your:'+id)){ V.log.push(id); if(Y.hud)Y.hud.toast('Hero unlock: '+id.replace(/_/g,' ')); } };
if(Y.profile&&Y.profile.gainXP){ var _gx=Y.profile.gainXP; Y.profile.gainXP=function(){ var r=_gx.apply(this,arguments); try{ V.sync(); }catch(e){} return r; }; }
V.wrapGame=function(){ var G=Y.game; if(!G||G._v11)return; G._v11=true;
  var _fa=G.finishActivity; G.finishActivity=function(act,res){ var out=_fa(act,res), r=res||{}, s=(P()&&P().story)||{};
    if(act==='job'&&(r.result==='done'))V.unlock('first_shift'); if(act==='skate'&&r.result==='complete')V.unlock('skate_clear');
    if(act==='football'&&r.result==='win')V.unlock('eg_win'); if(act==='arena'&&r.result==='win'&&!r.boss)V.unlock('drone_beaten'); if(act==='arena'&&r.result==='win'&&r.boss)V.unlock('sikee_defeated');
    V.sync(); return out; };
  var _ng=G.newGame; G.newGame=function(){ _ng(); var p=P(); if(H){ var h=H.get(); p.name=h.name; p.heroId=h.id; p.lookId=h.lookId; Y.profile.save(); V.sync(); } V.trail=[]; };
  var _cg=G.continueGame; G.continueGame=function(){ _cg(); var p=P(); if(p&&H){ var h=H.get(); if(p.name!==h.name){ p.name=h.name; Y.profile.save(); } p.heroId=p.heroId||h.id; } V.trail=[]; }; };
if(Y.profile&&Y.profile.save){ var _sv=Y.profile.save; Y.profile.save=function(){ var r=_sv.apply(this,arguments); try{ if(P()&&!V._syncing){ V._syncing=true; V.sync(); V._syncing=false; } }catch(e){ V._syncing=false; } return r; }; }
V.wrapGame();
Y.v11=V;
})();
