/* YOUR v1 activities · PROPOSAL_HOLD — extends the B08 job, B09 skate and B11 arena scenes without editing them:
   - FaFiFi OWNER-DELEGATED DESIGN v1 roads + Route Attack / Dependency Attack / Equity Line / Perfect 30 (YOUR.fafifi)
   - Mella sprites (walk via the B04 animator, fight + skate FALLBACK rows), Sikee boss (ChatGPT 15/16 sheets preferred, else owner-art derived)
   - ChatGPT art: 06 store interior, 07 crates/shelves, 10 training drone, 11 arena rivals (spectators)
   - activity end → YOUR.game.finishActivity(...) results screen (falls back to the B-build behaviour if YOUR.game is absent).
   Sikee boss numbers (hp 160, damage ×1.15, chase ×1.1) and story text are PROPOSED. */
(function(){
var Y=window.YOUR=window.YOUR||{}, F=Y.fafifi, A=Y.art;
var V={sheets:{}};
function P(){ return Y.profile.data; }
function story(){ var p=P(); return p.story=p.story||{}; }
function img(k){ return Y.core.assets.get(k); }
function artImg(slot){ return A&&A.get(slot); }
/* ---------- sheets (ChatGPT preferred → derived) ---------- */
V.sheet=function(key){ if(V.sheets[key])return V.sheets[key]; var s=null;
  if(key==='sikee_walk'){ var w=artImg('sikee_walk_96'); if(w){ var an={}; ['down','up','left','right'].forEach(function(d,r){ an['idle_'+d]={frames:[r*4]}; an['walk_'+d]={frames:[r*4,r*4+1,r*4+2,r*4+3]}; });
      s=new Y.SpriteSheet({img:w,cols:4,rows:4,frameW:96,frameH:96,anims:an,label:'chatgpt_15'}); s.scale=0.78; } else s=Y.SpriteSheet.fromConfig('sikee'); }
  else if(key==='sikee_fight'){ var c=artImg('sikee_combat_96'); if(c){ var M={idle:[0,1],wind:[2],strike:[3],block:[4],hit:[5],cast:[6],ko:[7]},an2={};
      Object.keys(M).forEach(function(k){ an2['fight_'+k+'_right']={frames:M[k]}; }); s=new Y.SpriteSheet({img:c,cols:8,rows:1,frameW:96,frameH:96,anims:an2,label:'chatgpt_16'}); s.mirrorLeft=true; s.fps=4; }
    else { s=Y.SpriteSheet.fromConfig('sikee'); s.label='owner_art_derived'; } }
  else if(key==='mella')s=Y.SpriteSheet.fromConfig('mella'); else if(key==='hero')s=Y.SpriteSheet.fromConfig(Y.config.hero);
  return V.sheets[key]=s; };
V.drawFight=function(g,sheet,anim,face,t,x,y,scale){ var right=Math.cos(face)>=0, nm='fight_'+anim+'_'+(right?'right':'left');
  if(sheet.mirrorLeft){ nm='fight_'+anim+'_right'; if(!sheet.anims[nm])nm='fight_idle_right'; if(!right){ g.save(); g.translate(x,0); g.scale(-1,1); sheet.draw(g,nm,t,0,y,scale); g.restore(); return; } }
  if(!sheet.anims[nm])nm='fight_idle_'+(right?'right':'left'); if(!sheet.anims[nm]&&anim==='wind')nm='fight_cast_'+(right?'right':'left'); sheet.draw(g,nm,t,x,y,scale); };
function hudBox(g,x,y,w,h){ g.fillStyle='rgba(0,0,0,.62)'; g.fillRect(x,y,w,h); }
function fairPanel(g,fx,x,y){ if(!fx)return; hudBox(g,x,y,300,74); g.font='11px system-ui'; g.textAlign='left'; g.fillStyle='#2ec4b6'; g.fillText('FaFiFi · '+F.VERSION,x+8,y+15);
  g.fillStyle='#dde'; wrap(g,'Equity Line: '+fx.eq.label,x+8,y+30,284,13); g.fillStyle='#ffd166';
  g.fillText('Perfect 30: '+fx.meter.value+'/30'+(F.reality()<F.REALITY_GATE?' (Reality <75: off)':'')+(fx.meter.armed?' · FINISH READY':'')+' · Route: '+(fx.ra.outcome||fx.ra.branch||'revealed'),x+8,y+66); }
function wrap(g,t,x,y,w,lh){ var words=t.split(' '),line=''; words.forEach(function(wd){ if(g.measureText(line+wd).width>w){ g.fillText(line,x,y); y+=lh; line=''; } line+=wd+' '; }); g.fillText(line,x,y); }
function newFair(act,boss){ var seed=F.seedFor(act),d=F.difficulty(act),eq=F.equity(act,seed); return {act:act,seed:seed,d:d,eq:eq,ra:new F.RouteAttack(act),dep:new Y.fair.Dependency(),meter:F.meter(act),events:[],chain:0,boss:!!boss}; }
function scoreEv(fx,ev,run){ var v=F.score(fx.meter,fx.act,ev,run); fx.events.push(ev); return v; }
function linked(fx){ var mode=F.reality()>=50?'reaction':'energy', r=fx.dep.nextLinkedAction(mode); if(r.energy)Y.profile.add('energy',-r.energy); return r; }
function finish(act,res){ var fx=res.result==='refused'?null:V.fx[act]; if(fx&&!fx.recorded){ fx.recorded=true; F.record(act,res.outcome); }
  if(Y.game&&Y.game.finishActivity)Y.game.finishActivity(act,Object.assign({fair:fx?{equity:fx.eq.label,route:fx.ra.outcome||fx.ra.branch,meter:fx.meter.value,d:+fx.d.toFixed(3),seed:fx.seed,dependency:fx.depHits||0}:null},res));
  else if(Y.core.scene.has('world'))Y.core.scene.go('world',{from:{job:'store',skate:'skatepark',arena:'arena'}[act]}); }
V.fx={};
/* =============================== JOB =============================== */
(function(){ var J=Y.job; if(!J)return; var _enter=J.enter,_act=J.act,_update=J.update,_finish=J.finish,_timeout=J.timeout;
  J.enter=function(d){ _enter(d); V.fx.job=null; if(J.state!=='shift')return; var fx=V.fx.job=newFair('job'); var road=F.jobRoad(fx.seed,fx.d,fx.eq); fx.road=road;
    J.crates=road.crates.map(function(c,i){return {x:c.x,y:c.y,taken:false,placed:false,priority:i===road.priority};}); fx.ra.reveal('priority crate #'+(road.priority+1)); fx.firstPick=true; fx.lock=0; fx.depHits=0;
    J.player.speed=140*(fx.eq.speedMul||1); };
  J.act=function(){ var fx=V.fx.job, carrying=!!J.carry; if(fx&&fx.lock>0)return null; var c0=J.carry, low=J.slots.map(function(s){return s.crate;}).indexOf(false), before=J.slots.map(function(s){return s.crate;}), r=_act(); if(!fx)return r;
    var run={left:J.t,total:J.SHIFT_T};
    if(r==='pick'){ var c=J.carry; if(fx.firstPick){ fx.firstPick=false; fx.ra.readIt(!!c.priority); if(c.priority){ scoreEv(fx,'priority_read',run); fx.priT=15; } }
      var l=linked(fx); if(l.reactionMs){ fx.lock=l.reactionMs/1000; fx.depHits++; }
      if(fx.meter.armed){ fx.window=fx.meter.snap(); fx.windowT=fx.window.readableMs/1000; } }
    else if(r==='drop'){ var filled=J.slots.map(function(s){return s.crate;}).findIndex(function(v,i){return v&&!before[i];}); scoreEv(fx,filled===low?'crate_in_order':'clean_drop',run);
      fx.chain++; if(fx.chain>=2)scoreEv(fx,'bond_chain',run);
      if(c0&&c0.priority&&fx.ra.step===2)fx.ra.finish(fx.priT>0); }
    else if(carrying&&r===null&&J.state==='shift'){ fx.chain=0; fx.dep.attack(true); scoreEv(fx,'drop_wrong',run); }
    return r; };
  J.timeout=function(){ _timeout(); var fx=V.fx.job; if(fx){ scoreEv(fx,'timeout',{left:0,total:1}); if(fx.ra.step===2)fx.ra.finish(false); } };
  J.update=function(dt){ var fx=V.fx.job; if(fx){ fx.lock=Math.max(0,fx.lock-dt); if(fx.priT>0)fx.priT-=dt; if(fx.windowT>0)fx.windowT-=dt; }
    var over=J.state!=='shift'&&J.state!=='idle'; if(over&&Y.input.pressed('a')&&Y.game){ var P0=J.player,ex=J.EXIT; if(!J.carry){ finish('job',{result:(J.state==='done'&&!J.crates.length)?'refused':J.state,paid:J.paid,count:J.count(),outcome:J.state==='done'?1:J.count()/5*0.6}); return; } }
    _update(dt); };
  var _render=J.render;
  J.render=function(g){ var bg=artImg('store'); var fx=V.fx.job;
    if(!bg&&!artImg('crates_crate')){ _render(g); fairPanel(g,fx,14,460); return; }
    g.fillStyle='#1d1a22'; g.fillRect(0,0,960,540); g.save(); g.translate(J.OX,J.OY);
    if(bg){ A.cover(g,'store',0,0,620,420,0.55); g.fillStyle='rgba(30,24,20,.25)'; g.fillRect(0,0,620,420); } else { g.fillStyle='#cbb894'; g.fillRect(0,0,620,420); }
    g.fillStyle='rgba(60,40,30,.85)'; g.fillRect(0,0,620,36); g.fillStyle='#fff'; g.font='bold 16px system-ui'; g.textAlign='center'; g.fillText('CORNER STORE',310,24);
    var se=artImg('crates_shelf_empty'),sf=artImg('crates_shelf_full'),cr=artImg('crates_crate');
    J.slots.forEach(function(s,i){ var im=s.crate?sf:se; if(im)g.drawImage(im,s.x-22,s.y-50,52,58); else { g.fillStyle='#4a3324'; g.fillRect(s.x-20,s.y-18,64,6); }
      if(fx&&fx.windowT>0&&!s.crate){ g.strokeStyle='#ffd166'; g.lineWidth=3; g.strokeRect(s.x-24,s.y-52,56,62); } });
    g.fillStyle='#3a2e22'; g.fillRect(J.EXIT.x-30,410,60,10); g.fillStyle='#fff'; g.font='11px system-ui'; g.fillText('EXIT (A)',J.EXIT.x,406);
    var ds=J.crates.filter(function(c){return !c.placed;}).map(function(c){return {y:c.y,draw:function(g){ if(c.priority&&!c.placed&&F.reality()<100){ g.strokeStyle='rgba(46,196,182,.9)'; g.lineWidth=2; g.beginPath(); g.ellipse(c.x,c.y-12,22,14,0,0,7); g.stroke(); }
      if(cr)g.drawImage(cr,c.x-16,c.y-30,32,30); else { g.fillStyle='#b0804a'; g.fillRect(c.x-12,c.y-24,24,22); } }};});
    ds.push({y:J.player.y,draw:function(g){J.player.draw(g,0,0);}}); ds.sort(function(a,b){return a.y-b.y;}).forEach(function(d){d.draw(g);});
    g.restore();
    hudBox(g,730,14,216,52); g.fillStyle='#ffd166'; g.font='bold 16px system-ui'; g.textAlign='left'; g.fillText('Stocked '+J.count()+'/5',740,36); g.fillStyle='#fff'; g.fillText(J.state==='shift'?('Time '+Math.ceil(J.t)+'s'):J.state.toUpperCase(),740,58);
    if(J.msg&&J.state!=='shift'){ g.textAlign='center'; hudBox(g,260,250,440,40); g.fillStyle='#ffd166'; g.fillText(J.msg+' — A: results',480,276); }
    fairPanel(g,fx,14,460); if(Y.hud)Y.hud.render(g); };
})();
/* =============================== SKATE =============================== */
(function(){ var S=Y.skate; if(!S)return; var C=S.C, BASE={VMAX:C.VMAX,FRIC_L:C.FRIC_L,AIR_SPIN:C.AIR_SPIN};
  F.EQUITY.skate=[{id:'cracked_lane',label:'Cracked lane: top speed −10% — the road is set for it',speedMul:0.9,apply:function(){C.VMAX=BASE.VMAX*0.9;}},
                  {id:'cross_wind',label:'Cross-wind: air turning −20% — the road budgets +1 s for it',extraS:1.0,apply:function(){C.AIR_SPIN=BASE.AIR_SPIN*0.8;}},
                  {id:'loose_gravel',label:'Loose gravel: rolling friction +15% — the road budgets +0.5 s for it',extraS:0.5,apply:function(){C.FRIC_L=BASE.FRIC_L*1.15;}}];
  function reset(){ C.VMAX=BASE.VMAX; C.FRIC_L=BASE.FRIC_L; C.AIR_SPIN=BASE.AIR_SPIN; }
  var _enter=S.enter,_update=S.update,_end=S.end,_exit=S.exit;
  S.enter=function(d){ reset(); _enter(d); V.fx.skate=null; if(S.run.over)return; var fx=V.fx.skate=newFair('skate'); fx.eq=F.EQUITY.skate[fx.seed%3]; fx.eq.visibleToBoth=true; fx.eq.changesPayout=false; fx.eq.apply();
    var road=F.skateRoad(fx.seed,fx.d,fx.eq); fx.road=road; S.run.rings=road.rings.map(function(q){return {x:q.x,y:q.y,z:q.z,got:false};}); fx.ra.reveal('line '+road.line.map(function(i){return i+1;}).join('→')); fx.lineIdx=0; fx.seen=0; fx.depHits=0; fx.clean=0; };
  S.exit=function(){ reset(); if(_exit)_exit(); };
  S.end=function(result){ _end(result); var fx=V.fx.skate; if(fx){ if(result==='timeout')scoreEv(fx,'timeout',{left:0,total:1}); if(fx.ra.step===2)fx.ra.finish(false); } reset(); };
  S.update=function(dt){ var R=S.run,fx=V.fx.skate;
    if(R.over){ if(Y.input.pressed('a')&&Y.game){ finish('skate',{result:R.result,paid:R.paid,score:R.over&&S.r?S.score():0,rings:R.got,outcome:R.result==='complete'?1:R.got/R.rings.length*0.6}); return; } return _update(dt); }
    var got0=R.rings.map(function(q){return q.got;}); _update(dt); if(!fx)return; var run={left:R.t,total:S.RUN_T};
    R.rings.forEach(function(q,i){ if(q.got&&!got0[i]){ var want=fx.road.line[fx.lineIdx];
      if(fx.ra.step===1){ fx.ra.readIt(i===fx.road.line[0]); if(fx.ra.read){ scoreEv(fx,'line_read',run); fx.lineIdx=1; } }
      else if(fx.ra.step===2){ if(i===want){ scoreEv(fx,'ring_in_line',run); fx.lineIdx++; if(fx.lineIdx>=3)fx.ra.finish(true); } else fx.ra.finish(false); } } });
    for(;fx.seen<S.events.length;fx.seen++){ var e=S.events[fx.seen];
      if(e.type==='LAND'){ scoreEv(fx,'clean_land',run); if(fx.meter.armed){ fx.window=fx.meter.snap(); fx.windowT=fx.window.readableMs/1000; } }
      else if(e.type==='GRIND')scoreEv(fx,'grind_chain',run);
      else if(e.type==='BAIL'){ scoreEv(fx,'bail',run); fx.dep.attack(true); fx.clean=0; } }
    if(S.events.length>=60)fx.seen=Math.min(fx.seen,S.events.length);
    var r=S.r; if(r.state==='PUSH'||r.state==='RIDE'){ fx.clean+=dt; if(fx.clean>1&&fx.dep.broken){ fx.dep.counter('change_concept'); } }
    if(r.crouch&&r.charge<0.02&&fx.dep.broken){ var l=linked(fx); if(l.reactionMs){ r.charge=-l.reactionMs/1000; fx.depHits++; } }
    if(fx.windowT>0)fx.windowT-=dt; };
  S.render=function(g){ var R=S.run,r=S.r,fx=V.fx.skate,rail=img('rail'),ramp=img('ramp'),board=img('board'),sh=V.sheet('hero');
    g.fillStyle='#58606e'; g.fillRect(0,0,960,540); g.fillStyle='#6a7280'; for(var i=0;i<960;i+=48)for(var j=0;j<540;j+=48)if(((i+j)/48)%2)g.fillRect(i,j,48,48);
    S.RAILS.forEach(function(L){ g.strokeStyle='#222'; g.lineWidth=6; g.beginPath(); g.moveTo(L.x1,L.y1+2); g.lineTo(L.x2,L.y2+2); g.stroke(); g.strokeStyle='#cfd6e0'; g.lineWidth=4; g.beginPath(); g.moveTo(L.x1,L.y1-L.h*C.PZ); g.lineTo(L.x2,L.y2-L.h*C.PZ); g.stroke(); if(rail)g.drawImage(rail,L.x1-24,L.y1-30,48,48); });
    if(ramp)g.drawImage(ramp,600,390,48,48);
    R.rings.forEach(function(q,i){ if(q.got)return; var yy=q.y-q.z*C.PZ, li=fx?fx.road.line.indexOf(i):-1; g.strokeStyle=li>=0&&fx.ra.step<3?'#2ec4b6':'#ffd166'; g.lineWidth=4; g.beginPath(); g.ellipse(q.x,yy-12,14,18,0,0,7); g.stroke();
      if(li>=0&&fx.ra.step<3){ g.fillStyle='#2ec4b6'; g.font='bold 11px system-ui'; g.textAlign='center'; g.fillText(String(li+1),q.x,yy-34); }
      if(q.z){ g.strokeStyle='rgba(255,209,102,.35)'; g.lineWidth=1; g.beginPath(); g.moveTo(q.x,q.y); g.lineTo(q.x,yy); g.stroke(); } });
    var yy=r.y-r.z*C.PZ; g.fillStyle='rgba(0,0,0,.3)'; g.beginPath(); g.ellipse(r.x,r.y+4,16-r.z*.03,5,0,0,7); g.fill();
    var right=Math.cos(r.heading)>=0, nat=!!(Y.config.heroSheets&&Y.config.heroSheets.owner&&Y.config.heroSheets.owner.skateNative&&sh.img===Y.core.assets.get('hero_sheet')), pose={RIDE:0,LAND:nat?8:0,PUSH:1,CROUCH:2,OLLIE:3,KICKFLIP:4,GRIND:5,BAIL:6}[r.state]; if(pose===undefined)pose=0; if(nat&&r.state==='PUSH'&&Math.floor(Y.core.stats.t*6)%2)pose=7;
    if(board&&(!nat||r.state==='KICKFLIP')){ g.save(); g.translate(r.x,yy-2); g.rotate(r.heading+(r.state==='KICKFLIP'?Math.sin(r.flip*6.28)*0.6:0)); g.drawImage(board,-22,-22,44,44); g.restore(); }
    var cs=96*0.62; g.save(); g.translate(r.x,0); if(!right)g.scale(-1,1); g.drawImage(sh.img,pose*96,6*96,96,96,-cs/2,yy-cs-4,cs,cs); g.restore();
    if(fx&&fx.windowT>0&&!r.grounded){ g.strokeStyle='#ffd166'; g.lineWidth=2; g.beginPath(); g.moveTo(r.x,r.y); g.lineTo(r.x+Math.cos(Math.atan2(r.vy,r.vx))*40,r.y+Math.sin(Math.atan2(r.vy,r.vx))*40); g.stroke(); }
    hudBox(g,636,458,312,72); g.fillStyle='#fff'; g.font='bold 16px system-ui'; g.textAlign='left';
    g.fillText('SKATE RUN  '+R.t.toFixed(1)+'s   Rings '+R.got+'/'+R.rings.length,646,480); g.fillText('Score '+S.score()+'  Combo '+S.comboTotal(r),646,504);
    if(r.state==='BAIL'){ g.fillStyle='#ff5d73'; g.fillText('BAIL — '+r.lastBail,646,522); }
    if(R.over){ g.textAlign='center'; hudBox(g,280,230,400,60); g.fillStyle='#ffd166'; g.font='bold 20px system-ui'; g.fillText((R.result==='complete'?'RUN COMPLETE +$'+R.paid:(R.result==='refused'?'Too tired to skate':'TIME UP'))+' — A',480,267); }
    fairPanel(g,fx,14,460); g.fillStyle='rgba(255,255,255,.4)'; g.font='10px system-ui'; g.textAlign='left'; g.fillText((nat?'Hero skate frames: ChatGPT 22 (native; grind = crouch reuse) · kickflip board: RIFFT':'Hero skate pose: FALLBACK (transformed walk frame) · board: RIFFT'),14,452);
    if(Y.hud)Y.hud.render(g); };
})();
/* =============================== ARENA (drone + SIKEE boss) =============================== */
(function(){ var AR=Y.arena; if(!AR)return; var _enter=AR.enter,_ai=AR.ai,_dmg=AR.damagePlayer,_strike=AR.strike,_update=AR.update,_step=AR.step;
  AR.enter=function(d){ d=d||{}; _enter(d); V.fx.arena=null; var boss=d.boss==='sikee'; AR.boss=boss; AR.e.boss=boss; AR.e.name=boss?'SIKEE':'TRAINING DRONE'; AR.e.maxHp=boss?Y.config.villain.bossHp:100; AR.e.hp=AR.e.maxHp; AR.recorded=false;
    if(AR.over)return; var fx=V.fx.arena=newFair('arena',boss); var road=F.arenaRoad(fx.seed,fx.d,boss,fx.eq); fx.road=road; fx.ra.reveal(road.seq.slice(0,3).join(',')); fx.depHits=0; fx.firstAtk=true; AR.e.kind=road.seq[0]; };
  AR.ai=function(dt){ var e=AR.e,P=AR.P,fx=V.fx.arena,st0=e.st,n0=e.n; if(e.boss&&e.st==='chase'){ var a=Math.atan2(P.y-e.y,P.x-e.x); e.x+=Math.cos(a)*10.5*dt; e.y+=Math.sin(a)*10.5*dt; }
    _ai(dt); if(!fx)return;
    if(e.n!==n0)e.kind=fx.road.seq[e.n%fx.road.seq.length];
    if(st0!=='wind'&&e.st==='wind'){ var side=Math.sign(P.x-e.x)||1, extra=(fx.eq.side&&fx.eq.side===side)?fx.eq.ms/1000:0; e.t=Math.max(fx.road.windFloor,e.t*fx.road.telegraph)+extra;
      if(fx.meter.armed){ fx.window=fx.meter.snap(); e.t+=fx.window.readableMs/1000; fx.windowT=e.t; } e.windT=e.t; }
    if(st0==='strike'&&e.st==='recover'&&fx.ra.step===2&&fx.ra.read&&!fx.openingGiven){ fx.openingGiven=true; e.t+=0.3; fx.opening=true; }
    if(st0==='strike'&&e.st!=='strike'&&fx.firstAtk){ fx.firstAtk=false; fx.ra.readIt(!fx.tookFull); if(fx.ra.read)scoreEv(fx,'pattern_read',run()); }
    if(st0==='strike'&&e.st==='stagger'){ scoreEv(fx,'dodge_chain',run()); if(fx.dep.broken)fx.dep.counter('protect_bond'); }
    if(fx.windowT>0)fx.windowT-=dt; };
  function run(){ return {hpFrac:Math.max(0,AR.e.hp)/AR.e.maxHp}; }
  AR.damagePlayer=function(dmg,from){ var fx=V.fx.arena, blocked=AR.P.block; if(AR.e&&AR.e.boss)dmg*=1.15; var st0=Y.profile.data.stamina, actual=_dmg(dmg,from);
    if(fx){ if(!blocked)fx.tookFull=true; if(blocked){ scoreEv(fx,'clean_block',run()); if(Y.profile.data.stamina<=0&&st0>0){ fx.dep.attack(true); scoreEv(fx,'guard_broken',run()); } } }
    return actual; };
  AR.strike=function(){ var fx=V.fx.arena; if(fx&&fx.dep.broken&&AR.P.atkCd<=0){ var l=linked(fx); if(l.reactionMs){ AR.P.atkCd=l.reactionMs/1000; fx.depHits++; return null; } }
    var st=AR.e.st, r=_strike(); if(fx&&r>0&&(st==='recover'||st==='stagger')){ scoreEv(fx,'opening_hit',run()); if(fx.opening&&fx.ra.step===2){ fx.ra.finish(true); fx.opening=false; } } return r; };
  AR.step=function(dt,inp){ var wasOver=AR.over; _step(dt,inp); if(!wasOver&&AR.over){ var s=story(), fx=V.fx.arena;
      if(AR.result==='win'){ if(AR.boss){ s.sikeeDefeated=true; s.sikeeWins=(s.sikeeWins||0)+1; s.challenge=false; if(Y.hud)Y.hud.toast('SIKEE falls. For now.'); } else s.droneBeaten=true; }
      else if(AR.result==='loss'){ if(AR.boss){ s.sikeeLosses=(s.sikeeLosses||0)+1; } if(fx)scoreEv(fx,'knocked_down',run()); }
      if(fx&&fx.ra.step===2)fx.ra.finish(false); Y.profile.save(); } };
  AR.update=function(dt){ if(AR.over&&Y.input.pressed('a')&&Y.game){ finish('arena',{result:AR.result,paid:AR.paid,boss:AR.boss,outcome:AR.result==='win'?1:(1-Math.max(0,AR.e.hp)/AR.e.maxHp)*0.6}); return; } _update(dt); };
  AR.render=function(g){ var P=AR.P,e=AR.e,fx=V.fx.arena,t=Y.core.stats.t;
    g.fillStyle=AR.boss?'#1a1420':'#211d2e'; g.fillRect(0,0,960,540);
    var c=[[0,0],[AR.AW,0],[AR.AW,AR.AH],[0,AR.AH]].map(function(q){return AR.project(q[0],q[1]);}); g.fillStyle=AR.boss?'#3b2a2a':'#3a3550'; g.beginPath(); c.forEach(function(q,i){i?g.lineTo(q.x,q.y):g.moveTo(q.x,q.y);}); g.fill();
    g.strokeStyle='rgba(255,255,255,.15)'; for(var z=0;z<=AR.AH;z+=62){ var a=AR.project(0,z),b=AR.project(AR.AW,z); g.beginPath(); g.moveTo(a.x,a.y); g.lineTo(b.x,b.y); g.stroke(); }
    var rb=artImg('rival_big'),rq=artImg('rival_quick'); if(rb)A.contain(g,'rival_big',40,150,110,150); if(rq)A.contain(g,'rival_quick',820,170,90,130);
    if(rb||rq){ g.fillStyle='rgba(255,255,255,.45)'; g.font='10px system-ui'; g.textAlign='center'; g.fillText('arena rivals (spectating)',480,140); }
    var mel=V.sheet('hero'), sk=e.boss?V.sheet('sikee_fight'):null;
    AR.drawOrder().forEach(function(id){
      if(id==='drone'){ var q=AR.project(e.x,e.y,0),s=q.scale; g.fillStyle='rgba(0,0,0,.35)'; g.beginPath(); g.ellipse(q.x,q.y,30*s,9*s,0,0,7); g.fill();
        if(e.boss){ var an=e.hp<=0?'ko':e.hitFlash>0||e.st==='stagger'?'hit':e.st==='wind'?'wind':e.st==='strike'?'strike':'idle'; V.drawFight(g,sk,an,e.face,t,q.x,q.y,s*1.25); }
        else { var dr=artImg(Math.cos(e.face)>0.5||Math.cos(e.face)<-0.5?'drone_side':'drone_front')||artImg('drone_front');
          if(dr){ var h=70*s,w=dr.width*h/dr.height; g.save(); if(e.hitFlash>0)g.globalAlpha=.6; if(Math.cos(e.face)<0&&dr===artImg('drone_side')){ g.translate(q.x,0); g.scale(-1,1); g.drawImage(dr,-w/2,q.y-h-10*s,w,h); } else g.drawImage(dr,q.x-w/2,q.y-h-10*s,w,h); g.restore();
            if(e.st==='wind'){ g.strokeStyle='#ffb347'; g.lineWidth=3; g.beginPath(); g.arc(q.x,q.y-h/2-10*s,h*0.62,0,7); g.stroke(); } }
          else { g.fillStyle=e.hitFlash>0?'#fff':(e.st==='wind'?'#ffb347':'#8c96b8'); g.beginPath(); g.arc(q.x,q.y-54*s,22*s,0,7); g.fill(); } }
        if(fx&&fx.windowT>0&&e.st==='wind'){ g.strokeStyle='#ffd166'; g.setLineDash([4,4]); g.beginPath(); g.ellipse(q.x,q.y,60*s,18*s,0,0,7); g.stroke(); g.setLineDash([]); } }
      else { var pq=AR.project(P.x,P.y,P.z),ps=pq.scale,gp=AR.project(P.x,P.y,0); g.fillStyle='rgba(0,0,0,.35)'; g.beginPath(); g.ellipse(gp.x,gp.y,18*ps,6*ps,0,0,7); g.fill();
        var pa=(AR.over&&AR.result==='loss')?'ko':P.stun>0?'hit':P.block?'block':P.lunge>0?'strike':P.dodgeT>0?(mel.anims&&mel.anims.fight_dash_right?'dash':'cast'):'idle';   /* v1.2.1: dash frames (25) when the hero sheet has them */
        g.save(); if(P.dodgeT>0)g.globalAlpha=.6; V.drawFight(g,mel,pa,P.face,t,pq.x,pq.y,ps*1.3); g.restore(); } });
    hudBox(g,600,14,346,76); g.fillStyle=e.boss?'#d6963c':'#fff'; g.font='bold 16px system-ui'; g.textAlign='left'; g.fillText(e.name+'  HP '+Math.max(0,Math.round(e.hp))+'/'+e.maxHp,610,36);
    g.fillStyle='#333'; g.fillRect(610,44,326,8); g.fillStyle=e.boss?'#d6963c':'#ff5d73'; g.fillRect(610,44,326*Math.max(0,e.hp)/e.maxHp,8);
    g.fillStyle='#ccd'; g.font='12px system-ui'; g.fillText('A strike · B dash · X block · Y burst ('+Math.round(P0().burst||0)+')',610,72);
    if(fx){ g.fillStyle='#2ec4b6'; g.fillText('Pattern: '+fx.road.seq.slice(0,3).map(function(k){return k==='slam'?'SLAM':'LUNGE';}).join(' · ')+' (reveal)',610,86); }
    if(AR.over){ g.textAlign='center'; hudBox(g,250,230,460,60); g.fillStyle='#ffd166'; g.font='bold 20px system-ui'; g.fillText((AR.result==='win'?e.name+' DEFEATED +$'+AR.paid:AR.result==='loss'?'KNOCKED OUT':'Too tired to fight')+' — A',480,267); }
    fairPanel(g,fx,14,460); g.fillStyle='rgba(255,255,255,.4)'; g.font='10px system-ui'; g.textAlign='left';
    g.fillText((Y.config.hero==='owner'?'Hero fight frames: ChatGPT 20 + 23 (KO / cast native) + 25 (dash) · ':'Mella fight frames: FALLBACK transforms · ')+(e.boss?'SIKEE: '+(sk&&sk.label==='chatgpt_16'?'ChatGPT combat sheet (16)':'derived from owner art'):'drone: '+(artImg('drone_front')?'ChatGPT 10':'shapes')),14,452);
    if(Y.hud)Y.hud.render(g); };
  function P0(){ return Y.profile.data; }
})();
Y.v1=V;
})();
