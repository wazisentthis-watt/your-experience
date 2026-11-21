/* YOUR ⇄ Elemental Gridiron v44 bridge — PARENT side · PROPOSAL_HOLD.
   Owner (t56u): "Football should be played through Elemental Gridiron." Scene 'football_eg' opens the COPY at football/eg44/ in an iframe
   over the game canvas and talks to it with window.postMessage (child: football/eg44/your_bridge_child.js).
   IN : the hero's profile (shared WIR hero: name, look, portrait path) (name, level, pow, spd), difficulty from the season (hub speedFor 0.75–1.3 → EG diff 0/1/2), active hub buff, seed.
   OUT: {win, tie, us, them, team, opp, stats} → win: YOUR.day.complete('football') (+$50 +30 XP, hub win); loss/tie: YOUR.day.fail('football').
   Energy is spent on launch (YOUR.day.start, approved cost 20). B10 football practice stays available as the fallback. */
(function(){
var Y=window.YOUR=window.YOUR||{};
var B={name:'football_eg',frame:null,state:'idle',msgs:[],result:null,team:null,opp:null,t:0,READY_TIMEOUT:25};
B.diffFor=function(){ var s=Y.hub&&Y.hub.speedFor?Y.hub.speedFor():1; return s<0.95?0:s<1.12?1:2; };
B.payload=function(){ var p=Y.profile.data,bf=Y.hub&&Y.hub.activeBuff?Y.hub.activeBuff('football'):null;
  return {your:'start',profile:{name:p.name||'Hero',lvl:p.lvl,pow:p.pow,spd:p.spd,portrait:'../../assets/hero/hero_portrait_256.png',lookId:(window.WIR_HERO?WIR_HERO.get().lookId:null)},diff:B.diffFor(),buff:bf?{kind:bf.kind,val:bf.val}:null,seed:(p.day||1)*7919+(p.lvl||1)}; };
B.mount=function(){ B.unmount(); var st=Y.core.canvas.parentElement||document.body, f=document.createElement('iframe'); f.id='your-eg-frame'; f.title='Elemental Gridiron v44';
  f.style.cssText='position:absolute;left:0;top:0;width:100%;height:100%;border:0;z-index:5;background:#000'; f.src=(Y.config.football&&Y.config.football.url)||'../football/eg44/index.html#your-bridge';
  if(getComputedStyle(st).position==='static')st.style.position='relative'; st.appendChild(f); B.frame=f; return f; };
B.unmount=function(){ if(B.frame&&B.frame.parentNode)B.frame.parentNode.removeChild(B.frame); B.frame=null; try{ window.focus(); }catch(e){} if(Y.core.pauseReason==='blur')Y.core.setPaused(false); };
B.send=function(m){ if(B.frame&&B.frame.contentWindow)B.frame.contentWindow.postMessage(m,'*'); };
B.sim=function(){ B.send({your:'sim'}); };
B.quit=function(){ B.send({your:'quit'}); };
function onMsg(e){ if(!B.frame||e.source!==B.frame.contentWindow)return; var m=e.data; if(!m||typeof m!=='object'||typeof m.your!=='string')return; B.msgs.push(m.your);
  if(m.your==='ready'&&B.state==='loading'){ B.state='playing'; B.send(B.payload()); }
  else if(m.your==='started'){ B.team=String(m.team||'').slice(0,40); B.opp=String(m.opp||'').slice(0,40); }
  else if(m.your==='result'&&B.state==='playing'){ B.apply(m); }
  else if(m.your==='quit'&&B.state==='playing'){ B.apply(null); } }
window.addEventListener('message',onMsg);
B.apply=function(m){ var win=!!(m&&m.win&&!m.tie), num=function(v){ v=+v; return isFinite(v)?Math.max(0,Math.min(999,Math.round(v))):0; };
  var r=m?{win:win,tie:!!m.tie,us:num(m.us),them:num(m.them),team:String(m.team||B.team||'').slice(0,40),opp:String(m.opp||B.opp||'').slice(0,40),stats:{}}:{forfeit:true,win:false};
  if(m&&m.stats)['tds','yds','pass','comp','sacks','ints','turnovers','plays'].forEach(function(k){ r.stats[k]=num(m.stats[k]); });
  var paid=0; if(win)paid=Y.day.complete('football',{score:r.us}); else Y.day.fail('football');
  Y.profile.event('eg_game',{win:win,us:r.us,them:r.them,opp:r.opp}); Y.profile.save(); B.result=r; B.state='done'; B.unmount();
  var res={result:r.forfeit?'forfeit':win?'win':r.tie?'tie':'loss',paid:paid,eg:r,outcome:win?1:0};
  if(Y.game&&Y.game.finishActivity)Y.game.finishActivity('football',res); else if(Y.core.scene.has('world'))Y.core.scene.go('world',{from:'field'});
  return res; };
B.enter=function(d){ B.result=null; B.msgs=[]; B.t=0; B.team=B.opp=null;
  if(!(d&&d.free)&&!Y.day.start('football')){ B.state='refused'; return; } B.state='loading'; B.mount(); };
B.exit=function(){ B.unmount(); if(B.state==='loading'||B.state==='playing')B.state='idle'; };
B.update=function(dt){ B.t+=dt;  var I=Y.input;
  if(B.state==='refused'&&I.pressed('a')){ if(Y.game)Y.game.finishActivity('football',{result:'refused',paid:0,outcome:null}); else Y.core.scene.go('world',{from:'field'}); }
  if(B.state==='loading'&&B.t>B.READY_TIMEOUT){ B.state='failed'; B.unmount(); }
  if(B.state==='failed'&&I.pressed('a'))Y.core.scene.go('football',{free:true}); };
B.render=function(g){ g.fillStyle='#0b1a12'; g.fillRect(0,0,960,540); g.fillStyle='#ffd166'; g.font='bold 22px system-ui'; g.textAlign='center';
  g.fillText(B.state==='refused'?'Too tired for football (needs '+Y.day.COST.football+' energy). A: back':B.state==='failed'?'Elemental Gridiron did not start — A: B10 practice drill':'Loading Elemental Gridiron v44…',480,260);
  g.font='13px system-ui'; g.fillStyle='#9ab'; g.fillText('Football is played in Elemental Gridiron (copy at football/eg44). Your result comes back to Y.O.U.R.',480,292); };
Y.egBridge=B; if(Y.core)Y.core.scene.register('football_eg',B);
})();
