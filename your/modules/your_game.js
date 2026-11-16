/* YOUR game v1 — B16 INTEGRATION · PROPOSAL_HOLD.
   Loop: title → menu → world (Mella) → activities (store job · skate park · Elemental Gridiron football · arena drone / SIKEE boss)
         → results → world … → home (season board · sleep) → day end → next day. Save/continue through YOUR.profile (your-save-v1).
   Story beats for SIKEE (all text PROPOSED, no lore beyond "Authority Form"):
     1 sighting  — after Mella's first finished activity, SIKEE stands by the Arena door (talk = LLM/offline dialogue)
     2 challenge — after the training drone is beaten, the Arena menu (and SIKEE's "I challenge you" choice) opens the boss fight
     3 boss      — SIKEE boss fight (FaFiFi arena rules apply), his line on the results screen
     4 aftermath — he stays by the Arena; rematches allowed.
   PROPOSED v1 numbers: each finished activity advances the clock 60 game-minutes; the clock only runs in the world. */
(function(){
var Y=window.YOUR=window.YOUR||{};
var G={SCREENS:['title','menu','settings','credits','results','home','sleep','townmap','field_menu','arena_menu','boss_intro','football_eg'],ACT_MIN:60,booted:false};
var DOOR_SCENE={home:'home',store:'job',skatepark:'skate',field:'field_menu',arena:'arena_menu'};
var FROM={job:'store',skate:'skatepark',football:'field',arena:'arena'};
function P(){ return Y.profile.data; }
function story(){ var p=P(); return p.story=p.story||{}; }
G.hasSave=function(){ try{ return !!localStorage.getItem(Y.profile.SAVE_KEY); }catch(e){ return false; } };
G.prepare=function(p){ p.story=p.story||{}; p.memory=p.memory||{}; p.settings=p.settings||{reality:Y.config.fair.reality}; p.today=p.today&&p.today.day===p.day?p.today:{day:p.day,earned:0,acts:[]}; if(p.settings.reality==null)p.settings.reality=Y.config.fair.reality; return p; };
G.newGame=function(){ var p=Y.profile.create(window.WIR_HERO?WIR_HERO.get().name:'Hero'); var pre=Y.screens&&Y.screens.last.settings; G.prepare(p); if(pre&&pre.reality!=null)p.settings.reality=pre.reality; Y.day.minutes=Y.day.DAY_START; Y.profile.save(); Y.core.scene.go('world',{from:'home'}); Y.hud.toast('Day 1 — welcome, '+p.name); };
G.continueGame=function(){ var p=Y.profile.load(); if(!p){ G.newGame(); return; } G.prepare(p); Y.day.minutes=p.clock||Y.day.DAY_START; Y.core.scene.go('world',p.pos&&p.pos.x?{x:p.pos.x,y:p.pos.y}:{from:'home'}); Y.hud.toast('Welcome back — Day '+p.day); };
G.snapshot=function(){ var p=P(); if(!p)return; p.clock=Y.day.minutes; var w=Y.core.scene.current; if(Y.core.scene.name==='world'&&w&&w.player)p.pos={x:Math.round(w.player.x),y:Math.round(w.player.y)}; };
/* ---------- activity end → results ---------- */
G.finishActivity=function(act,res){ var p=P(); res=Object.assign({act:act},res); if(res.result==='refused'){ Y.core.scene.go('world',{from:FROM[act]||'home'}); return res; } { Y.day.minutes=Math.min(Y.day.DAY_END-1,Y.day.minutes+G.ACT_MIN); var t=p.today=p.today||{day:p.day,earned:0,acts:[]}; t.earned+=res.paid||0; t.acts.push(act+(res.boss?' (SIKEE)':'')+': '+res.result); }
  G.lastResult=res; G.snapshot(); Y.profile.save(); Y.core.scene.go('results',res); return res; };
G.afterResults=function(d){ Y.core.scene.go('world',{from:FROM[d.act]||'home'}); G.storyCheck(); };
/* ---------- story beats ---------- */
G.storyCheck=function(){ var s=story(), p=P(), w=Y.world, n=Y.npc; if(!n)return;
  var done=(p.today&&p.today.acts||[]).length>0;
  if(!s.sighted&&done){ s.sighted=true; s.sightedDay=p.day; Y.hud.toast('Someone is waiting by the Arena…'); Y.profile.save(); }
  if(s.sighted&&!n.list.some(function(e){return e.id==='sikee';})){ var a=w.spawn('arena'); n.addSikee(a.x+70,a.y+6); } };
G.enterWorld=function(){ G.storyCheck(); };
/* ---------- input glue: Enter / Escape / clicks ---------- */
G.bindKeys=function(){ window.addEventListener('keydown',function(e){ if(e.target&&/INPUT|SELECT|TEXTAREA/.test(e.target.tagName))return; if(e.code==='Enter'||e.code==='NumpadEnter')Y.input.simKey('KeyJ',true); });
  window.addEventListener('keyup',function(e){ if(e.code==='Enter'||e.code==='NumpadEnter')Y.input.simKey('KeyJ',false); });
  Y.core.canvas.addEventListener('pointerdown',function(e){ if(e.pointerType==='touch'&&Y.input.touchVisible&&!G.isScreen())return; var q=Y.core.toLogical(e.clientX,e.clientY), sc=Y.core.scene.current;
    if(Y.core.paused&&Y.hud.pauseOpen){ var i=Math.floor((q.y-218)/36); if(i>=0&&i<Y.hud.items.length)Y.hud.select(i); return; }
    if(sc&&sc.click)sc.click(q.x,q.y); }); };
G.isScreen=function(){ return G.SCREENS.indexOf(Y.core.scene.name)>=0||Y.core.scene.name==='hub'; };
/* ---------- boot ---------- */
G.boot=async function(opts){ opts=opts||{}; if(G.booted)return; G.booted=true;
  Y.core.init(document.getElementById('c'),{manual:!!opts.manual});
  await Promise.all([Y.core.assets.load(Y.config.assets),Y.art?Y.art.load():Promise.resolve()]);
  ['sikee_walk_96','sikee_combat_96'].forEach(function(k){ if(Y.art.get(k))Y.core.assets.put(k,Y.art.get(k)); });
  var ws=Y.world.makeScene({enter:function(){ G.enterWorld(); }}); Y.core.scene.register('world',ws);
  var _we=ws.enter; ws.enter=function(d){ _we(d); if(!Y.npc.list.length)Y.npc.setup(); G.storyCheck(); };
  Y.world.onEnter=function(id){ var sc=DOOR_SCENE[id]; if(!sc)return; G.snapshot(); Y.core.scene.go(sc); };
  /* hub (season board): ChatGPT 12 background under the B13 board; A/B returns home */
  var hs=Y.hub;
  if(hs){ var _hr=hs.render; hs.render=function(g){ var drew=Y.art.cover(g,'hub_bg',0,0,960,540), of=g.fillRect, first=drew;
      if(drew){ g.fillRect=function(x,y,w,h){ if(first&&x===0&&y===0&&w>=900){ first=false; g.save(); g.globalAlpha=.62; of.call(g,x,y,w,h); g.restore(); return; } return of.call(g,x,y,w,h); }; }
      try{ _hr(g); } finally { g.fillRect=of; } };
    hs.update=function(){ var I=Y.input; if(I.pressed('a')||I.pressed('b'))Y.core.scene.go('home'); }; }
  /* hooks: clock only in the world, journal on Y in the world, no pause menu on screens */
  Y.core.hooks.pre.push(function(dt){ var nm=Y.core.scene.name; if(nm==='world'&&P()){ if(Y.input.pressed('y')&&!Y.npc.isOpen())Y.hud.toggleJournal(); Y.day.update(dt); } if(P())Y.hud.update(dt); });
  var _hu=Y.hud.update; Y.hud.update=function(dt){ if(G.isScreen()){ Y.hud.tickToasts(dt); return; } _hu(dt); };
  Y.hud.onQuit=function(){ G.snapshot(); Y.profile.save(); Y.core.scene.go('title'); };
  Y.day.onSleep=function(reason){ if(reason!=='bed'){ G.snapshot(); Y.core.scene.go('sleep',{mode:reason}); } else { var p=P(); p.today={day:p.day,earned:0,acts:[]}; } };
  /* challenge accepted in dialogue → boss intro on next Arena entry is offered by the Arena menu */
  G.bindKeys(); Y.core.scene.go('title');
  window.addEventListener('beforeunload',function(){ if(P()){ G.snapshot(); Y.profile.save(); } });
  return G; };
Y.game=G;
})();
