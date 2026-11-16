import os
T='/workspace/game-recovery/your-build/tests'
HEAD='''<!doctype html><html><head><meta charset="utf-8"><title>{id} {name} — YOUR · PROPOSAL_HOLD</title>
<style>body{{margin:0;background:#0b0c10;color:#ddd;font:13px system-ui}}#stage{{width:960px;height:540px;position:relative;background:#000}}#results{{padding:8px 12px;max-width:940px;line-height:1.5}}.p{{color:#7dffb0}}.f{{color:#ff5d73}}</style>
<script>window.__g0=Object.keys(window);</script></head>
<body><div id="stage"><canvas id="c"></canvas></div><div id="results">running…</div>
'''
def page(id,name,mods,body):
    s=HEAD.format(id=id,name=name)
    for m in ['your_config','your_core','your_testkit']+mods: s+=f'<script src="../modules/{m}.js"></script>\n'
    lines=body.rstrip('\n').split('\n'); last=max(i for i,l in enumerate(lines) if l.startswith('YT.test(') or l.startswith('  ') and False)
    # frame = trailing lines after the last test block (lines not starting with YT.test and not continuation)
    j=len(lines)
    while j>0 and not lines[j-1].startswith('YT.test(') and not lines[j-1].startswith('  '): j-=1
    tests='\n'.join(lines[:j]); frame='\n'.join(lines[j:])
    s+='<script>\n(async function(){\n"use strict";\nvar Y=window.YOUR;\ntry{\n'+tests+'\n/* representative frame for the screenshot (runs after tests) */\nvar frameFn=function(){\n'+frame+'\n};\n}catch(e){ console.error("test page setup failed",e); YT.test("page setup",function(){throw e;}); }\nawait YT.run();\ntry{ if(typeof frameFn==="function")frameFn(); }catch(e){ console.error("frame render failed",e); }\nwindow.__frameDone=true;\n})();\n</script>\n</body></html>\n'
    open(f'{T}/{id}_test.html','w').write(s)
pages={}
pages['B01']=('core_shell',[],r'''
await YT.boot();
var log=window.__log=[];
var mk=function(n,col){ return {enter:function(){log.push('enter:'+n);},exit:function(){log.push('exit:'+n);},update:function(){},render:function(g){g.fillStyle=col;g.fillRect(0,0,960,540);g.fillStyle='#fff';g.font='bold 48px system-ui';g.textAlign='center';g.fillText('Scene '+n.toUpperCase(),480,250);g.font='18px system-ui';g.fillText('press N to switch · fixed 60 Hz · letterboxed 960x540',480,300);}}; };
Y.core.scene.register('a',mk('a','#24476b')); Y.core.scene.register('b',mk('b','#6b2447'));
window.addEventListener('keydown',function(e){ if(e.code==='KeyN')Y.core.scene.go(Y.core.scene.name==='a'?'b':'a'); });
Y.core.scene.go('a');
YT.test('offline: every loaded resource is local (file:)',function(){ var bad=performance.getEntriesByType('resource').filter(function(r){return !/^(file|data|blob):/.test(r.name);}); YT.eq(bad.length,0,'external resources'); });
YT.test('scene.go("b") calls exit(a) then enter(b) exactly once each',function(){ log.length=0; Y.core.scene.go('b'); YT.eq(log,['exit:a','enter:b']); YT.eq(window.__log.filter(function(x){return x==='enter:b';}).length,1); });
YT.test('key N switches scenes',function(){ window.dispatchEvent(new KeyboardEvent('keydown',{code:'KeyN'})); YT.eq(Y.core.scene.name,'a'); });
YT.test('at 30 fps throttle update() still runs ~60/s (55–65)',function(){ Y.core._last=null; var u0=Y.core.stats.updates,t=1000; Y.core.tick(t); for(var i=0;i<60;i++){t+=1000/30;Y.core.tick(t);} var ups=(Y.core.stats.updates-u0)/2; window.__ups=ups; YT.ok(ups>=55&&ups<=65,'ups '+ups); });
YT.test('max 5 catch-up steps per frame',function(){ Y.core._last=null; Y.core.tick(0); var n=Y.core.tick(200); YT.ok(n<=5,'steps '+n); });
YT.test('resize keeps 16:9 logical view and full-res backing store at DPR 2',function(){ Y.core.resize(2); var c=Y.core.canvas,v=Y.core.view; YT.eq(c.width,Math.round(v.cssW*2)); YT.near((960*v.s)/(540*v.s),16/9,1e-9); YT.ok(960*v.s<=v.cssW+0.01&&540*v.s<=v.cssH+0.01,'fits'); Y.core.resize(); });
YT.test('blur pauses; focus resumes without a time jump >100 ms',function(){ window.dispatchEvent(new Event('blur')); YT.ok(Y.core.paused,'paused'); var u0=Y.core.stats.updates; Y.core.tick(5000); Y.core.tick(9000); YT.eq(Y.core.stats.updates,u0,'no updates while paused');
  window.dispatchEvent(new Event('focus')); YT.ok(!Y.core.paused,'resumed'); Y.core.tick(20000); var n=Y.core.tick(20000+1000/60); YT.ok(n<=1,'steps after resume '+n); YT.ok((Y.core.stats.updates-u0)*1000/60<=100,'time jump'); });
YT.test('asset loader reports progress to 1 and returns images',async function(){ var p=[]; await Y.core.assets.load({rider_atlas:Y.config.assets.rider_atlas},function(x){p.push(x);}); YT.eq(p[p.length-1],1); YT.ok(Y.core.assets.get('rider_atlas').width===384,'atlas width'); });
Y.core.scene.go('a'); Y.core.stepFixed(1);
''')
pages['B02']=('input',['your_input'],r'''
await YT.boot({assets:false});
var vis={enter:function(){},update:function(){},render:function(g){ var I=Y.input; g.fillStyle='#16202c';g.fillRect(0,0,960,540); g.strokeStyle='#4ecdc4';g.lineWidth=3;g.beginPath();g.arc(240,270,110,0,7);g.stroke();
  g.fillStyle='#ffd166';g.beginPath();g.arc(240+I.held('moveX')*100,270+I.held('moveY')*100,22,0,7);g.fill(); ['a','b','x','y','pause'].forEach(function(b,i){ g.fillStyle=I.held(b)?'#7dffb0':'#334'; g.beginPath(); g.arc(560+i*80,270,30,0,7); g.fill(); g.fillStyle='#fff'; g.font='bold 16px system-ui'; g.textAlign='center'; g.fillText(b.toUpperCase(),560+i*80,276); });
  g.fillStyle='#ccd'; g.font='16px system-ui'; g.fillText('source: '+I.source+' · move ('+I.held('moveX').toFixed(2)+', '+I.held('moveY').toFixed(2)+')',480,420); }};
Y.core.scene.register('vis',vis); Y.core.scene.go('vis');
YT.test('hold J 1 s → pressed("a") on exactly one poll, held("a") on all polls',function(){ var pc=0,hc=0; YT.down('KeyJ'); for(var i=0;i<60;i++){ YT.step(1); if(Y.input.pressed('a'))pc++; if(Y.input.held('a'))hc++; } YT.up('KeyJ'); YT.step(1); YT.eq(pc,1,'pressed'); YT.eq(hc,60,'held'); YT.ok(Y.input.released('a'),'released edge'); });
YT.test('diagonal keyboard move is normalized (length ≤ 1)',function(){ YT.down('KeyW'); YT.down('KeyD'); YT.step(1); var x=Y.input.held('moveX'),y=Y.input.held('moveY'); YT.near(Math.hypot(x,y),1,1e-9); YT.ok(x>0&&y<0,'direction'); YT.up('KeyW'); YT.up('KeyD'); YT.step(1); YT.eq(Y.input.held('moveX'),0); });
YT.test('gamepad stick inside 0.2 deadzone returns 0,0; buttons map to actions',function(){ var pad={axes:[0.15,-0.1],buttons:[]}; Y.input.gamepadProvider=function(){return pad;}; YT.step(1); YT.eq([Y.input.held('moveX'),Y.input.held('moveY')],[0,0]);
  pad={axes:[1,0],buttons:[{pressed:true},{pressed:false},{pressed:false},{pressed:true}]}; YT.step(1); YT.near(Y.input.held('moveX'),1,1e-9); YT.ok(Y.input.held('a')&&Y.input.held('y')&&!Y.input.held('b'),'buttons'); YT.eq(Y.input.source,'gamepad'); Y.input.gamepadProvider=function(){return null;}; YT.step(1); });
YT.test('touch overlay hidden on desktop, visible after first touchstart; stick drives move',function(){ var ov=document.getElementById('your-touch'); YT.ok(!ov||ov.style.display==='none','hidden initially'); YT.ok(!Y.input.touchVisible);
  window.dispatchEvent(new Event('touchstart')); ov=document.getElementById('your-touch'); YT.ok(ov&&ov.style.display==='block','visible'); var h=window.innerHeight,r=Math.min(window.innerWidth,h),sx=r*0.18,sy=h-r*0.2;
  ov.dispatchEvent(new PointerEvent('pointerdown',{pointerId:7,pointerType:'touch',clientX:sx,clientY:sy})); ov.dispatchEvent(new PointerEvent('pointermove',{pointerId:7,pointerType:'touch',clientX:sx+r*0.12,clientY:sy})); YT.step(1);
  YT.ok(Y.input.held('moveX')>0.9,'stick x '+Y.input.held('moveX')); });
YT.test('no globals other than window.YOUR (plus test harness)',function(){ var allowed=['YOUR','YT','__g0','__results','__done']; var extra=Object.keys(window).filter(function(k){return window.__g0.indexOf(k)<0&&allowed.indexOf(k)<0;}); YT.eq(extra,[]); });
YT.down('KeyD'); YT.down('KeyJ'); YT.step(2);
''')
pages['B03']=('profile_save',['your_profile'],r'''
await YT.boot({assets:false});
var phase=sessionStorage.getItem('b03phase');
if(!phase){ localStorage.clear(); var p=Y.profile.create('Reload Test'); Y.profile.earn(45,'job'); Y.profile.gainXP(130); p.rel.mara=2; p.flags.job=true; Y.profile.save();
  sessionStorage.setItem('b03expect',JSON.stringify(Y.profile.data)); sessionStorage.setItem('b03phase','2'); location.reload(); await new Promise(function(){}); }
sessionStorage.removeItem('b03phase');
var expect=JSON.parse(sessionStorage.getItem('b03expect'));
YT.test('create → save → reload page → load returns deep-equal object',function(){ var got=Y.profile.load(); YT.eq(got,expect); YT.eq(got.money,65); YT.eq(got.lvl,2,'gainXP(130) crosses need 100'); });
YT.test('spend(999999) returns false and money unchanged',function(){ var m=Y.profile.data.money; YT.eq(Y.profile.spend(999999),false); YT.eq(Y.profile.data.money,m); YT.eq(Y.profile.spend(5),true); YT.eq(Y.profile.data.money,m-5); });
YT.test('corrupt JSON in storage → load() returns fresh profile, logs warning, no throw',function(){ localStorage.setItem(Y.profile.SAVE_KEY,'{not json'); var w0=Y.profile.warnings.length,got=Y.profile.load(); YT.eq(got.money,20); YT.eq(got.v,1); YT.ok(Y.profile.warnings.length===w0+1,'warning'); });
YT.test('a v0 object without v (Y.O.U.R. snapshot shape) is migrated to v:1',function(){ localStorage.setItem(Y.profile.SAVE_KEY,JSON.stringify({P:{name:'Ana',money:85,xp:40},flags:{job:true},day:3,pos:{x:270,y:380}})); var got=Y.profile.load(); YT.eq(got.v,1); YT.eq([got.name,got.money,got.xp,got.day,got.flags.job],['Ana',85,40,3,true]); YT.ok('energy' in got&&'rel' in got,'new fields'); });
YT.test('starting values come from Y.O.U.R. newPlayer (money 20, hp 100, stamina 100) + PHATOM fresh (lvl 1)',function(){ var p=Y.profile.create('X'); YT.eq([p.money,p.hp,p.stamina,p.lvl,p.xp,p.burst],[20,100,100,1,0,0]); });
YT.test('event log keeps last 20',function(){ for(var i=0;i<30;i++)Y.profile.earn(1,'t'); YT.eq(Y.profile.data.log.length,20); });
sessionStorage.removeItem('b03expect');
var g=Y.core.ctx; Y.core.beginRender(); g.fillStyle='#14161f'; g.fillRect(0,0,960,540); g.fillStyle='#ffd166'; g.font='bold 22px system-ui'; g.fillText('YOUR.profile (B03)',30,40); g.fillStyle='#dde'; g.font='14px monospace';
JSON.stringify(Y.profile.data,null,1).split('\n').slice(0,26).forEach(function(l,i){g.fillText(l,30,72+i*17);}); Y.core.endRender();
''')
pages['B04']=('character_animator',['your_input','your_character'],r'''
await YT.boot();
var ch=new Y.Character({x:300,y:300}); ch.sheet=Y.SpriteSheet.fromConfig();
var ch2=new Y.Character({x:600,y:300}); var sc={update:function(dt){ ch.update(dt,Y.input.held('moveX'),Y.input.held('moveY')); ch2.update(dt,Y.input.held('moveX'),Y.input.held('moveY')); },
 render:function(g){ g.fillStyle='#3c5a3a'; g.fillRect(0,0,960,540); ch.draw(g); if(ch2.sheet)ch2.draw(g); g.fillStyle='#fff'; g.font='14px system-ui'; g.fillText('left: neutral placeholder · right: WishBorn hero sheet (library) — PROPOSAL_HOLD placeholder, main character undecided',20,520); g.fillText('anim '+ch.anim(),20,30); }};
Y.core.scene.register('t',sc); Y.core.scene.go('t');
YT.test('walking in each of 4 directions shows that direction row; idle shows frame 0',function(){ var rows={down:0,up:1,left:2,right:3},keys={down:'KeyS',up:'KeyW',left:'KeyA',right:'KeyD'};
  Object.keys(keys).forEach(function(d){ YT.down(keys[d]); YT.step(10); YT.eq(ch.face,d); YT.eq(ch.state,'walk'); var r=ch.sheet.frameRect(ch.anim(),ch.t); YT.eq(Math.floor(r.index/4),rows[d],'row '+d); YT.up(keys[d]); YT.step(1);
    YT.eq(ch.state,'idle'); YT.eq(ch.sheet.frameRect(ch.anim(),ch.t).index,rows[d]*4,'idle frame 0'); }); });
YT.test('animation runs at 8 fps independent of update rate',function(){ var a=new Y.Character(),b=new Y.Character(); a.sheet=b.sheet=ch.sheet; for(var i=0;i<50;i++)a.update(1/60,1,0); for(var j=0;j<25;j++)b.update(1/30,1,0); YT.eq(a.sheet.frameRect(a.anim(),a.t).i,2,'t=0.833 s → frame 6%4');
  YT.eq(a.sheet.frameRect(a.anim(),a.t).i,b.sheet.frameRect(b.anim(),b.t).i); YT.eq(ch.sheet.frameRect('walk_down',0.125+1e-6).i,1); YT.eq(ch.sheet.frameRect('walk_down',0.5+1e-6).i,0); });
YT.test('cannot enter a solid tile; slides along walls',function(){ var c=new Y.Character({x:150,y:200}),solid=function(x,y){return x>=200;}; for(var i=0;i<120;i++)c.update(1/60,1,0,solid); YT.ok(c.x<200-c.feet.w/2+0.001,'stopped at wall x='+c.x);
  var y0=c.y; for(var k=0;k<30;k++)c.update(1/60,0.7,0.7,solid); YT.ok(c.y>y0+20,'slid along wall'); YT.ok(c.x<200,'still outside'); });
YT.test('speed is 140 px/s (PROPOSED)',function(){ var c=new Y.Character({x:0,y:0}); for(var i=0;i<60;i++)c.update(1/60,1,0); YT.near(c.x,140,0.01); });
YT.test('swapping the sheet (config.hero = "wishborn" library sheet) works without code changes',function(){ Y.config.hero='wishborn'; ch2.sheet=Y.SpriteSheet.fromConfig(); YT.eq([ch2.sheet.frameW,ch2.sheet.frameH],[72,96]); var r=ch2.draw(Y.core.ctx); YT.ok(r&&r.sw===72,'draw'); Y.config.hero='neutral'; });
YT.test('placeholder art is labelled PROPOSAL_HOLD (config.status) and swappable label recorded',function(){ YT.eq(Y.config.status,'PROPOSAL_HOLD'); YT.eq(ch.sheet.label,'neutral'); });
ch.x=300; ch.y=320; ch2.x=620; ch2.y=340; ch2.scale=1.5; YT.down('KeyS'); YT.step(9); YT.up('KeyS'); YT.step(1);
''')
WORLD_SETUP=r'''
YT.freshProfile('Walker');
var sc=Y.core.scene.register('world',Y.world.makeScene()); Y.core.scene.go('world');
var P=sc.player;
'''
pages['B05']=('neighborhood_map',['your_input','your_character','your_profile','your_world'],r'''
await YT.boot();
'''+WORLD_SETUP+r'''
var W=Y.world, enters=[]; W.onEnter=function(id){enters.push(id);};
YT.test('map is data: 40x30 string array with 5 POIs (Y.O.U.R. places)',function(){ YT.ok(Array.isArray(W.MAP)&&typeof W.MAP[0]==='string'); YT.eq([W.cols,W.rows],[40,30]); YT.eq(Object.keys(W.pois).sort(),['arena','field','home','skatepark','store']); });
YT.test('camera never shows outside map bounds',function(){ [[0,0],[W.pw,W.ph],[W.pw,0],[0,W.ph],[640,480]].forEach(function(q){ P.x=q[0];P.y=q[1]; W.follow(P,true); for(var i=0;i<5;i++)W.follow(P); YT.ok(W.cam.x>=0&&W.cam.y>=0&&W.cam.x<=W.pw-960&&W.cam.y<=W.ph-540,'cam '+JSON.stringify(W.cam)); });
  var sp=W.spawn('home'); P.x=sp.x; P.y=sp.y; YT.down('KeyD'); for(var i=0;i<240;i++){ YT.step(1); YT.ok(W.cam.x>=0&&W.cam.x<=W.pw-960,'walking cam'); } YT.up('KeyD'); });
YT.test('each of 5 POIs triggers onEnter exactly once per press (held A does not repeat)',function(){ Object.keys(W.pois).forEach(function(id){ var p=W.pois[id]; P.x=p.x; P.y=p.y+8; enters.length=0; YT.down('KeyJ'); YT.step(30); YT.up('KeyJ'); YT.step(1); YT.eq(enters,[id],'POI '+id); YT.tap('KeyJ'); YT.eq(enters.length,2,'second press'); }); });
YT.test('minimap shows player dot within 1 tile',function(){ P.x=700; P.y=500; YT.step(1); var d=W.lastMinimapDot, ex=d.ox+P.x/32*d.s, ey=d.oy+P.y/32*d.s; YT.ok(Math.abs(d.x-ex)<=d.s&&Math.abs(d.y-ey)<=d.s,'dot'); });
YT.test('character collides with buildings/trees (solid tiles)',function(){ var p=W.pois.home; P.x=p.x; P.y=p.y-40; YT.ok(W.solid(P.x,P.y),'inside building is solid'); P.x=W.TILE*1.5; P.y=W.TILE*1.5; YT.down('KeyA'); YT.step(60); YT.up('KeyA'); YT.ok(P.x>W.TILE,'stopped by border trees'); });
YT.test('60 fps budget: 1280x720 canvas, full redraw avg < 16.7 ms with off-screen culling',function(){ var st=document.getElementById('stage'); st.style.width='1280px'; st.style.height='720px'; Y.core.resize(); var t0=performance.now(); for(var i=0;i<300;i++){ P.x=200+i*3; Y.core.render(); } var avg=(performance.now()-t0)/300; window.__avgMs=avg;
  st.style.width='960px'; st.style.height='540px'; Y.core.resize(); YT.ok(avg<16.7,'avg '+avg.toFixed(2)+' ms'); YT.ok(W.stats.tilesDrawn<W.cols*W.rows,'culled: '+W.stats.tilesDrawn); });
var sp=W.spawn('store'); P.x=sp.x-120; P.y=sp.y+90; W.follow(P,true); YT.down('KeyS'); YT.step(6); YT.up('KeyS'); YT.step(1);
''')
pages['B06']=('npc_dialogue',['your_input','your_character','your_world','your_profile','your_npc'],r'''
await YT.boot();
'''+WORLD_SETUP+r'''
var N=Y.npc; N.setup(); var mara=N.list[0];
function nearMara(){ P.x=mara.x-30; P.y=mara.y; mara.home.r=0; mara.tx=mara.x; mara.ty=mara.y; }
YT.test('talking freezes player movement and resumes after close',function(){ nearMara(); YT.tap('KeyJ'); YT.ok(N.isOpen(),'open'); var x0=P.x; YT.down('KeyD'); YT.step(30); YT.up('KeyD'); YT.eq(P.x,x0,'frozen');
  var guard=0; while(N.isOpen()&&guard++<20){ YT.tap('KeyJ'); YT.tap('KeyJ'); } YT.ok(!N.isOpen(),'closed'); P.x-=0; var x1=P.x; YT.down('KeyA'); YT.step(20); YT.up('KeyA'); YT.ok(P.x<x1-20,'moves again'); });
YT.test('typewriter: first A mid-line shows full line, second A advances',function(){ nearMara(); YT.tap('KeyJ'); var o=N.open; YT.ok(o.shown<o.full.length,'partial'); YT.tap('KeyJ'); YT.eq(o.i,0); YT.eq(Math.floor(o.shown),o.full.length); YT.tap('KeyJ'); YT.eq(o.i,1,'advanced'); });
YT.test('choice changes profile.rel and persists via YOUR.profile.save()',function(){ var o=N.open; YT.ok(o.lines[o.i].choices,'choice line'); YT.step(400); var r0=Y.profile.data.rel.mara||0; YT.tap('KeyJ'); YT.eq(Y.profile.data.rel.mara,r0+1); YT.eq(JSON.parse(localStorage.getItem(Y.profile.SAVE_KEY)).rel.mara,r0+1); YT.ok(!N.isOpen()); });
YT.test('choice cursor moves with up/down',function(){ nearMara(); YT.tap('KeyJ'); YT.tap('KeyJ'); YT.tap('KeyJ'); YT.step(400); YT.tap('KeyS'); YT.eq(N.open.sel,1); var r0=Y.profile.data.rel.mara||0; YT.tap('KeyJ'); YT.eq(Y.profile.data.rel.mara,r0,'choice B is rel +0'); });
YT.test('no dialogue text beyond the Y.O.U.R. excerpt; extra choices are [TODO ...] placeholders',function(){ var allowed=["Hey {name}! Welcome to the neighborhood. Dex needs help at the Corner Store, the skate park is open, coaches run practice at the Training Facility, and the Arena has a drone that needs a lesson.","Dodge its attacks, then hit it while it recovers. Button mashing wears you out.","You did all of it, {name}. Job, skating, practice and the arena. Go home and sleep, the neighborhood will remember.","Need a hand. Grab the 5 crates on the floor and stock the shelf on the left. $45 for the shift.","Keep going, {left} crates left.","Thanks again! Come back tomorrow."];
  Object.keys(N.DIALOG).forEach(function(n){ Object.keys(N.DIALOG[n]).forEach(function(k){ N.DIALOG[n][k].forEach(function(L){ YT.ok(allowed.indexOf(L.text)>=0,'unexpected text: '+L.text); (L.choices||[]).forEach(function(c){ YT.ok(/^\[TODO/.test(c.label),'choice '+c.label); }); }); }); }); });
YT.test('Dex line reflects crate progress (Y.O.U.R. storeCount)',function(){ Y.profile.data.flags.storeCount=2; N.talk('dex'); YT.eq(N.open.full,'Keep going, 3 crates left.'); N.close(); delete Y.profile.data.flags.storeCount; });
nearMara(); Y.world.follow(P,true); YT.tap('KeyJ'); YT.step(90);
''')
pages['B07']=('day_economy',['your_input','your_profile','your_npc','your_hud','your_day'],r'''
await YT.boot();
YT.freshProfile('Day Tester'); var D=Y.day;
var sc={update:function(dt){D.update(dt);},render:function(g){ g.fillStyle='#1b2433'; g.fillRect(0,0,960,540); g.fillStyle='#ffd166'; g.font='bold 22px system-ui'; g.fillText('Day / economy (B07) — clock '+D.clock(),30,120); g.font='15px system-ui'; g.fillStyle='#dde';
  Object.keys(D.PAY).forEach(function(a,i){ g.fillText(a+': pay $'+D.PAY[a]+' (Y.O.U.R.) · xp '+D.XP[a]+' · energy cost '+D.COST[a]+' (PROPOSED)',30,160+i*24); }); Y.hud.render(g); }};
Y.core.scene.register('d',sc); Y.core.scene.go('d');
YT.test('payout table equals {job:45,skate:30,football:50,arena:60}',function(){ YT.eq(D.PAY,{job:45,skate:30,football:50,arena:60}); });
YT.test('sleep() increments day by exactly 1, restores energy and saves',function(){ var d0=Y.profile.data.day; Y.profile.data.energy=3; D.sleep(); YT.eq(Y.profile.data.day,d0+1); YT.eq(Y.profile.data.energy,100); YT.eq(JSON.parse(localStorage.getItem(Y.profile.SAVE_KEY)).day,d0+1); YT.eq(D.clock(),'06:00'); });
YT.test('activity start is refused with a toast if energy < cost',function(){ Y.profile.data.energy=5; YT.eq(D.start('arena'),false); YT.ok(Y.hud.visible.concat(Y.hud.queue).some(function(t){return /Too tired/.test(t.msg);}),'toast'); Y.profile.data.energy=100; YT.eq(D.start('arena'),true); YT.eq(Y.profile.data.energy,75); });
YT.test('complete() pays the table amount and sets the Y.O.U.R. flag',function(){ var m=Y.profile.data.money; YT.eq(D.complete('football'),50); YT.eq(Y.profile.data.money,m+50); YT.ok(Y.profile.data.flags.football); D.complete('arena'); YT.ok(Y.profile.data.flags.combat,'arena→combat flag'); });
YT.test('clock pauses while a dialogue or menu is open',function(){ var m0=D.minutes; YT.step(60); YT.near(D.minutes,m0+2,1e-6,'advances 2 game-min / s'); Y.npc.talk('mara'); var m1=D.minutes; YT.step(120); YT.eq(D.minutes,m1,'dialogue'); Y.npc.close(); D.menuOpen=true; YT.step(60); YT.eq(D.minutes,m1,'menu'); D.menuOpen=false; YT.step(60); YT.ok(D.minutes>m1); });
YT.test('forced sleep at 24:00 and at 0 energy',function(){ var d0=Y.profile.data.day; D.minutes=1439.9; YT.step(5); YT.eq(Y.profile.data.day,d0+1,'midnight'); Y.profile.data.energy=0; YT.step(1); YT.eq(Y.profile.data.day,d0+2,'exhausted'); });
D.minutes=17*60+20; Y.profile.data.energy=55; Y.hud.toast('Day '+Y.profile.data.day+' — saved'); YT.step(1);
''')
pages['B08']=('job_store',['your_input','your_character','your_world','your_profile','your_hud','your_day','your_job'],r'''
await YT.boot();
YT.freshProfile('Clerk'); Y.core.scene.register('world',Y.world.makeScene()); var J=Y.job;
function goto(x,y){ J.player.x=x; J.player.y=y; }
Y.core.scene.go('job');
YT.test('exactly 5 crates at the Y.O.U.R. positions; each slot accepts one crate',function(){ YT.eq(J.crates.length,5); YT.eq(J.crates.map(function(c){return [c.x,c.y];}),[[260,200],[340,260],[200,280],[420,230],[300,150]]);
  goto(260,200); YT.eq(J.act(),'pick'); goto(80,J.slots[0].y); YT.eq(J.act(),'drop'); YT.ok(J.slots[0].crate);
  goto(340,260); YT.eq(J.act(),'pick'); goto(80,J.slots[0].y); YT.eq(J.act(),null,'full slot refuses'); goto(80,J.slots[1].y); YT.eq(J.act(),'drop'); YT.eq(J.count(),2); });
YT.test('completion pays 45 once (+20 xp); re-entering same day shows "shift done"',function(){ var m=Y.profile.data.money; [[200,280],[420,230],[300,150]].forEach(function(c,i){ goto(c[0],c[1]); J.act(); goto(80,J.slots[2+i].y); J.act(); });
  YT.eq(J.state,'done'); YT.eq(Y.profile.data.money,m+45); YT.ok(Y.profile.data.flags.job); YT.step(30); YT.eq(Y.profile.data.money,m+45,'once');
  Y.core.scene.go('job'); YT.eq(J.state,'done'); YT.eq(J.crates.length,0); YT.ok(/Shift done/.test(J.msg)); YT.eq(Y.profile.data.money,m+45); });
YT.test('timeout ends shift with partial pay 9 per crate (PROPOSED) and logs it',function(){ Y.day.sleep(); Y.core.scene.go('job'); YT.eq(J.state,'shift'); [[260,200],[340,260]].forEach(function(c,i){ goto(c[0],c[1]); J.act(); goto(80,J.slots[i].y); J.act(); });
  var m=Y.profile.data.money; YT.secs(91); YT.eq(J.state,'timeout'); YT.eq(J.paid,18); YT.eq(Y.profile.data.money,m+18); YT.ok(Y.profile.data.log.some(function(e){return e.t==='job_timeout'&&e.amount===18;}),'logged'); });
YT.test('pick-up uses Y.O.U.R. radius 44 (no pick from 60 px)',function(){ Y.day.sleep(); Y.core.scene.go('job'); goto(260+60,200); YT.eq(J.act(),null); goto(260+40,200); YT.eq(J.act(),'pick'); });
YT.test('scene exits back to world at the store door',function(){ J.carry.placed=true; J.carry=null; goto(J.EXIT.x,J.EXIT.y); YT.tap('KeyJ'); YT.eq(Y.core.scene.name,'world'); var sp=Y.world.spawn('store'),pl=Y.core.scene.current.player; YT.ok(Math.hypot(pl.x-sp.x,pl.y-sp.y)<1,'at store door'); });
Y.day.sleep(); Y.core.scene.go('job'); goto(260,200); J.act(); goto(80,J.slots[0].y); J.act(); goto(330,250); J.act(); goto(300,200); YT.step(20);
''')
pages['B09']=('skate_run',['your_input','your_profile','your_hud','your_day','your_skate'],r'''
await YT.boot();
YT.freshProfile('Skater'); var S=Y.skate,C=S.C;
Y.core.scene.go('skate',{free:true});
function fall(r){ for(var g=0;g<300&&!r.grounded;g++)S.step(r,1/60,{}); return r; }
YT.test('timer ends run at 45.0 s ±0.1 (no rings → timeout, no pay)',function(){ var m=Y.profile.data.money; YT.step(45*60+6); YT.eq(S.run.result,'timeout'); YT.near(S.run.endedAt,45,0.1); YT.eq(Y.profile.data.money,m); });
YT.test('landing sideways beyond LAND_ALIGN (50°) bails and resets combo',function(){ Y.core.scene.go('skate',{free:true}); var r=S.r; r.bailT=0; r.slide=null; r.flip=-1; r.grounded=false; r.z=1; r.vz=-60; r.vx=150; r.vy=0; r.heading=Math.PI/2; S.addTrick(r,'OLLIE',25); fall(r);
  YT.eq(r.state,'BAIL'); YT.eq(r.lastBail,'LANDED SIDEWAYS'); YT.eq(r.combo.list.length,0); });
YT.test('hard landing (impact > 300) and incomplete flip bail; aligned landing does not',function(){ var r=S.newRider(400,300); r.grounded=false; r.z=1; r.vz=-350; r.vx=100; fall(r); YT.eq(r.lastBail,'HARD LANDING');
  r=S.newRider(400,300); r.grounded=false; r.z=0.5; r.vz=-60; r.flip=0.3; fall(r); YT.eq(r.lastBail,'INCOMPLETE FLIP');
  r=S.newRider(400,300); r.grounded=false; r.z=0.5; r.vz=-60; r.vx=150; r.heading=Math.PI+0.3; fall(r); YT.ok(r.state==='LAND','fakie within 50° lands: '+r.state); });
YT.test('rail grind adds 50-50 to combo; combo banks on clean landing',function(){ var L=S.RAILS[0],r=S.newRider(L.x1+20,L.y1); r.grounded=false; r.z=L.h+6; r.vz=-20; r.vx=180; r.heading=0; S.addTrick(r,'OLLIE',25);
  for(var i=0;i<3;i++)S.step(r,1/60,{}); YT.ok(r.slide,'sliding'); var guard=0; while(r.slide&&guard++<300)S.step(r,1/60,{}); YT.ok(r.combo.list.some(function(t){return t.name==='50-50';}),'50-50 in combo');
  var expect=S.comboTotal(r),s0=r.score; guard=0; while((!r.grounded||r.landT>0||r.combo.list.length)&&guard++<300)S.step(r,1/60,{}); YT.eq(r.score,s0+expect,'banked'); YT.ok(expect>=Math.round((25+100)*1.25),'multiplier applied'); });
YT.test('ollie from A release pops POP_BASE..POP_BASE+POP_CHARGE; kickflip (X in air) scores 240 on clean landing',function(){ Y.core.scene.go('skate',{free:true}); var r=S.r; YT.down('KeyJ'); YT.step(30); YT.up('KeyJ'); YT.step(1); YT.ok(!r.grounded,'airborne'); YT.ok(r.vz<=C.POP_BASE+C.POP_CHARGE,'vz');
  YT.tap('KeyL'); YT.ok(r.flip>=0,'flip started'); var g=0; while(!r.grounded&&g++<200)YT.step(1); YT.ok(r.combo.list.some(function(t){return t.name==='KICKFLIP'&&t.pts===240;}),JSON.stringify(r.combo.list)); });
YT.test('payout 30 exactly once per run completion (all 8 Y.O.U.R. rings)',function(){ Y.core.scene.go('skate',{free:true}); var m=Y.profile.data.money; S.run.rings.forEach(function(q){ S.r.x=q.x; S.r.y=q.y; S.r.z=q.z; S.r.grounded=q.z===0; YT.step(1); }); YT.eq(S.run.result,'complete'); YT.eq(Y.profile.data.money,m+30); YT.step(120); YT.eq(Y.profile.data.money,m+30,'once'); YT.ok(Y.profile.data.flags.skate); });
YT.test('rider atlas frame chosen by state and heading (RIFFT rows ride/push/crouch/ollie/kickflip/grind)',function(){ var f=function(st,h){return S.frameFor({state:st,heading:h});};
  YT.eq([f('RIDE',0).row,f('PUSH',0).row,f('CROUCH',0).row,f('OLLIE',0).row,f('KICKFLIP',0).row,f('GRIND',0).row,f('BAIL',0).row],[0,1,2,3,4,5,2]); YT.eq(f('RIDE',Math.PI/2).dir,'south'); YT.eq(f('RIDE',Math.PI).dir,'west'); });
Y.core.scene.go('skate',{free:true}); S.run.rings[0].got=true; S.run.rings[1].got=true; S.run.got=2; YT.down('KeyW'); YT.step(40); YT.up('KeyW'); YT.down('KeyJ'); YT.step(10); YT.up('KeyJ'); YT.step(8);
''')
pages['B10']=('football_practice',['your_input','your_character','your_world','your_profile','your_hud','your_day','your_fair','your_football'],r'''
await YT.boot();
YT.freshProfile('Runner'); Y.core.scene.register('world',Y.world.makeScene()); var F=Y.football;
Y.core.scene.go('football');
YT.test('2 touchdowns → payout 50 once, then back to world',function(){ var m=Y.profile.data.money; F.P.y=59; YT.step(1); YT.eq(F.td,1); F.P.y=59; YT.step(1); YT.eq(F.td,2); YT.ok(F.over); YT.eq(Y.profile.data.money,m+50); YT.step(30); YT.eq(Y.profile.data.money,m+50,'once'); YT.tap('KeyJ'); YT.eq(Y.core.scene.name,'world'); });
YT.test('defenders never overlap (min separation ≥ 30 px every frame)',function(){ Y.day.sleep(); Y.core.scene.go('football',{free:true}); var minSep=1e9; YT.down('KeyW'); for(var i=0;i<600;i++){ YT.step(1); if(i%90===0){YT.up('KeyW');YT.down(i%180?'KeyA':'KeyD');} minSep=Math.min(minSep,F.minSeparation()); } ['KeyW','KeyA','KeyD'].forEach(YT.up); YT.ok(minSep>=F.SEP-0.5,'min '+minSep.toFixed(2)); });
YT.test('tackle resets the drill (Y.O.U.R. 28 px rule)',function(){ Y.core.scene.go('football',{free:true}); var d=F.def[0]; F.P.x=d.x; F.P.y=d.y+10; var t0=F.tries; YT.step(1); YT.eq(F.tries,t0+1); YT.eq([F.P.x,F.P.y],[210,940]); });
YT.test('juke has a 0.6 s cooldown and costs 20 stamina (Y.O.U.R. dodge cost)',function(){ Y.core.scene.go('football',{free:true}); Y.profile.data.stamina=100; YT.ok(F.juke('juke')); YT.eq(Y.profile.data.stamina,80); YT.eq(F.juke('juke'),false,'cooldown'); YT.secs(0.62); YT.ok(F.juke('spin'),'after cooldown'); YT.ok(Y.profile.data.stamina<95); Y.profile.data.stamina=5; YT.secs(0.62); Y.profile.data.stamina=5; YT.eq(F.juke('juke'),false,'no stamina'); });
YT.test('project() maps field → screen with depth scaling (far players smaller)',function(){ F.cam.y=900; var near=F.project(210,900),far=F.project(210,300); YT.ok(near.scale>far.scale,'scale'); YT.ok(near.y>far.y,'far is higher on screen'); YT.ok(Math.abs(F.project(0,600).x-F.project(420,600).x)>Math.abs(F.project(0,200).x-F.project(420,200).x),'perspective width'); });
YT.test('only library sprites without flags are configured (no excluded-IP sheets)',function(){ Object.values(Y.config.assets).forEach(function(p){ YT.ok(!/flag|galaxy|green_?22|jacksonville|static|fusion|kito|beerus/i.test(p),p); }); });
YT.test('Equity Line (rulebook §5) shown for football, payout unchanged',function(){ YT.ok(F.equity&&F.equity.visibleToBoth&&/field|coverage|anchor|route|weather/i.test(F.equity.label),JSON.stringify(F.equity)); YT.eq(Y.fair.applyPayout('football',50),50); });
Y.core.scene.go('football',{free:true}); YT.down('KeyW'); YT.down('KeyD'); YT.step(40); YT.up('KeyD'); YT.step(15); YT.tap('KeyL'); YT.step(3); YT.up('KeyW');
''')
pages['B11']=('arena_fight',['your_input','your_profile','your_hud','your_day','your_hub','your_arena'],r'''
await YT.boot();
YT.freshProfile('Fighter'); var A=Y.arena;
Y.core.scene.go('arena',{free:true});
function setup(px,py,face,ex,ey){ A.P.x=px; A.P.y=py; A.P.face=face; A.P.atkCd=0; A.P.stun=0; A.e.x=ex; A.e.y=ey; A.e.st='idle'; A.e.t=5; Y.profile.data.stamina=100; }
YT.test('strike only connects when in range + facing + canContact (FaFiFi depth lane)',function(){ setup(300,400,-Math.PI/2,300,200); YT.eq(A.strike(),0,'far'); setup(300,400,-Math.PI/2,300,350); var hp=A.e.hp; YT.ok(A.strike()>0,'adjacent'); YT.ok(A.e.hp<hp);
  setup(300,400,Math.PI/2,300,350); YT.eq(A.strike(),0,'facing away'); YT.ok(A.canContact({x:0,y:0},{x:90,y:60})&&!A.canContact({x:0,y:0},{x:0,y:80}),'canContact lanes'); });
YT.test('block multiplies damage by the FaFiFi constant 0.13',function(){ YT.eq(A.BLOCK_MUL,0.13); setup(300,400,0,300,350); A.P.block=true; Y.profile.data.hp=100; var d=A.damagePlayer(18,A.e); YT.near(d,18*0.13,1e-9); A.P.block=false; YT.eq(A.damagePlayer(18,A.e),18); });
YT.test('opening (recover/stagger) x2.2 and flank x1.5 multipliers (Y.O.U.R.)',function(){ setup(300,400,-Math.PI/2,300,350); A.e.face=Math.PI/2; A.e.st='recover'; var h=A.e.hp; A.strike(); YT.near(h-A.e.hp,9*2.2,1e-6);
  setup(300,400,-Math.PI/2,300,350); A.e.face=-Math.PI/2; h=A.e.hp; A.strike(); YT.near(h-A.e.hp,9*1.5,1e-6); });
YT.test('drone defeated → payout 60 exactly once',function(){ setup(300,400,-Math.PI/2,300,350); A.e.hp=1; var m=Y.profile.data.money; YT.tap('KeyJ'); YT.eq(A.result,'win'); YT.eq(Y.profile.data.money,m+60); YT.step(60); YT.eq(Y.profile.data.money,m+60); YT.ok(Y.profile.data.flags.combat); });
YT.test('depth sorting: nearer fighter (larger z) drawn last',function(){ Y.core.scene.go('arena',{free:true}); A.P.y=500; A.e.y=200; YT.eq(A.drawOrder(),['drone','player']); A.P.y=150; A.e.y=400; YT.eq(A.drawOrder(),['player','drone']); YT.ok(A.project(310,500).scale>A.project(310,100).scale); });
YT.test('drone AI (Y.O.U.R. lunge/slam cycle) lands hits when the player idles; loss pays 0 and costs +10 energy',function(){ Y.core.scene.go('arena',{free:true}); Y.profile.data.hp=100; var states={}; for(var i=0;i<60*20&&!A.over;i++){ YT.step(1); states[A.e.st]=1; } YT.ok(states.chase&&states.wind&&states.strike&&states.recover,'cycle '+Object.keys(states));
  YT.ok(Y.profile.data.hp<100,'hit'); Y.profile.data.hp=1; A.over=false; var m=Y.profile.data.money,e=Y.profile.data.energy; A.e.st='strike'; A.e.kind='slam'; A.e.hit=false; A.e.t=0.1; A.e.x=A.P.x; A.e.y=A.P.y-50; A.P.dodgeT=0; A.P.z=0; YT.step(1); YT.eq(A.result,'loss'); YT.eq(Y.profile.data.money,m); YT.eq(Y.profile.data.energy,e-10); });
YT.test('no excluded-IP art configured (logic-only reuse)',function(){ Object.keys(Y.config.assets).forEach(function(k){ YT.ok(!/kito|beerus|fusion|static/i.test(k+Y.config.assets[k]),k); }); });
Y.core.scene.go('arena',{free:true}); Y.profile.data.hp=100; Y.profile.data.stamina=100; A.P.x=330; A.P.y=360; A.e.x=300; A.e.y=290; A.e.st='wind'; A.e.t=0.5; A.P.block=true; YT.down('KeyL'); YT.step(2);
''')
pages['B12']=('fafifi_rules',['your_input','your_profile','your_hud','your_day','your_fair'],r'''
await YT.boot();
YT.freshProfile('Fair'); var F=Y.fair, Q4={quarter:4,reality:80};
YT.test('Perfect-30 meter math matches rulebook §5 table exactly',function(){ YT.eq(F.POINTS,{line_to_gain:3,shell_read:2,positive_secure:1,bond_exchange:1,sack:-3,tfl:-3,off_penalty:-3,turnover:-5}); var m=new F.Meter();
  var seq=[['line_to_gain',3],['shell_read',5],['positive_secure',6],['bond_exchange',7],['bond_exchange',8],['bond_exchange',8],['sack',5],['turnover',0]]; seq.forEach(function(s){ YT.eq(m.add(s[0],Q4),s[1],s[0]); });
  m.newDrive(); YT.eq(m.add('bond_exchange',Q4),1,'bond cap resets per drive'); for(var i=0;i<20;i++)m.add('line_to_gain',Q4); YT.eq(m.value,30,'cap 30'); });
YT.test('meter only builds in Q4 at Reality 75+',function(){ var m=new F.Meter(); YT.eq(m.add('line_to_gain',{quarter:3,reality:90}),0); YT.eq(m.add('line_to_gain',{quarter:4,reality:74}),0); YT.eq(m.add('line_to_gain',Q4),3); });
YT.test('full meter → one finish window (+180 ms readable) on next snap, then resets to 0',function(){ var m=new F.Meter('defense'); for(var i=0;i<10;i++)m.add('line_to_gain',Q4); YT.ok(m.armed); YT.eq(m.snap(),{readableMs:180,firstBreakHidden:false}); YT.eq(m.value,0); YT.eq(m.snap(),null); YT.eq(m.side,'defense'); });
YT.test('Equity Line never changes payout amounts',function(){ ['job','skate','football','arena'].forEach(function(a){ [0,45,50,999].forEach(function(v){ YT.eq(F.applyPayout(a,v),v); }); }); var m=Y.profile.data.money; YT.eq(Y.day.complete('football'),50); YT.eq(Y.profile.data.money,m+50); var c=F.equity.pick('football',function(){return 0;}); YT.eq([c.id,c.visibleToBoth],['short_field',true]); });
YT.test('Dependency broken → next linked action +120 ms or +2 energy (once); counters restore',function(){ var d=new F.Dependency(); YT.eq(d.nextLinkedAction(),{reactionMs:0,energy:0}); d.attack(true); YT.eq(d.nextLinkedAction(),{reactionMs:120,energy:0}); YT.eq(d.nextLinkedAction(),{reactionMs:0,energy:0},'once');
  d.attack(true); YT.eq(d.nextLinkedAction('energy'),{reactionMs:0,energy:2}); d.attack(true); YT.ok(d.counter('protect_bond')); YT.eq(d.nextLinkedAction(),{reactionMs:0,energy:0}); });
YT.test('Route Attack: reveal → branch only if read → finish/checkdown; first down preserves, sack ends against offense',function(){ var r=new F.RouteAttack(); r.play({}); YT.eq(r.consequence,'route_problem_revealed'); r.play({read:true}); YT.eq(r.branch,'safer_branch_offered'); r.play({finishRoute:false}); YT.eq([r.outcome,r.active],['forced_checkdown',false]); YT.ok(r.reward!=='first_down');
  r=new F.RouteAttack(); r.play({}); r.play({firstDown:true}); YT.eq([r.outcome,r.consequence],['first_down','route_problem_revealed']); r=new F.RouteAttack(); r.play({negative:'sack'}); YT.eq(r.outcome,'ended_against_offense'); });
YT.test('non-football activities are clearly-labelled pluggable stubs (no invented rules)',function(){ ['job','skate','arena'].forEach(function(a){ YT.ok(F.rulesFor(a).stub,a); YT.ok(/PENDING OWNER DECISION/.test(F.equity.pick(a).label)); }); YT.eq(F.rulesFor('football').source,'rulebook_s5'); F.registerRules('skate',{stub:false,custom:true}); YT.ok(F.rulesFor('skate').custom,'pluggable'); F.registerRules('skate',{stub:true,label:'PENDING OWNER DECISION'}); });
var m=new F.Meter(); [ 'line_to_gain','shell_read','positive_secure','bond_exchange','line_to_gain','line_to_gain','line_to_gain' ].forEach(function(e){m.add(e,Q4);});
var g=Y.core.ctx; Y.core.beginRender(); g.fillStyle='#14161f'; g.fillRect(0,0,960,540); g.fillStyle='#ffd166'; g.font='bold 22px system-ui'; g.fillText('FaFiFi — '+F.LAW,30,44);
g.fillStyle='#dde'; g.font='15px system-ui'; g.fillText('Football (rulebook §5): Perfect 30 meter '+m.value+'/30',30,90); g.fillStyle='#333'; g.fillRect(30,104,600,22); g.fillStyle='#ffd166'; g.fillRect(30,104,600*m.value/30,22);
g.fillStyle='#dde'; Object.keys(F.POINTS).forEach(function(k,i){ g.fillText(k+': '+(F.POINTS[k]>0?'+':'')+F.POINTS[k],30,160+i*22); }); g.fillText('Equity Line choices: '+F.EQUITY.football.map(function(c){return c.label;}).join(' · '),30,350);
g.fillStyle='#ff9f6b'; ['job','skate','arena'].forEach(function(a,i){ g.fillText(a+': '+F.rulesFor(a).label,30,400+i*24); }); Y.core.endRender();
''')
pages['B13']=('fusion_hub',['your_input','your_profile','your_hud','your_hub'],r'''
await YT.boot();
YT.freshProfile('Season'); var H=Y.hub;
YT.test('report() for 4 activities advances exactly one week and records W/L',function(){ YT.eq(H.current().part,'job'); H.report('skate',{win:true}); H.report('football',{win:true}); H.report('arena',{win:false}); YT.eq(H.state().week,0,'free play does not advance'); var r=H.report('job',{win:true}); YT.ok(r.scheduled); YT.eq(H.state().week,1); YT.eq(H.state().results,['W']); YT.eq(H.state().rec.arena,{w:0,l:1}); });
YT.test('PHATOM week rewards: xp 40+12k, coins 15+6k',function(){ YT.eq([H.WEEKS[0].xp,H.WEEKS[0].coins,H.WEEKS[3].xp,H.WEEKS[3].coins],[40,15,76,33]); YT.ok(H.WEEKS[9].final); });
YT.test('a buff earned in skate is consumed by the next (different) activity only',function(){ YT.eq(H.current().part,'skate'); var r=H.report('skate',{win:true,buffKind:'pow'}); YT.eq(r.buffEarned,'pow'); YT.eq(H.state().buff.from,'skate'); H.report('skate',{win:true}); YT.ok(H.state().buff&&H.state().buff.uses===1,'not consumed by skate'); YT.ok(H.activeBuff('arena'),'visible to next activity');
  var r2=H.report('arena',{win:true}); YT.eq(r2.buffUsed,'pow'); YT.eq(H.state().buff,null); });
YT.test('rival +1 on a scheduled loss; difficulty multiplier stays within 0.75–1.3',function(){ var s=H.state(),r0=s.rival; YT.eq(H.current().part,'football'); H.report('football',{win:false}); YT.eq(s.rival,r0+1); YT.eq(s.results[2],'L'); s.rival=100; YT.eq(H.speedFor(),1.3); s.rival=0; Y.profile.data.lvl=40; YT.eq(H.speedFor(),0.75); Y.profile.data.lvl=1; YT.ok(H.speedFor()>=0.75&&H.speedFor()<=1.3); });
YT.test('state persists through YOUR.profile.save()',function(){ Y.profile.save(); var s=JSON.parse(localStorage.getItem(Y.profile.SAVE_KEY)).hub; YT.eq(s.week,H.state().week); YT.eq(s.results,H.state().results); });
YT.test('scheduled win pays PHATOM coins into money and XP into the shared profile',function(){ var m=Y.profile.data.money,wk=H.current(); H.report(wk.part,{win:true}); YT.eq(Y.profile.data.money,m+wk.coins); });
Y.core.scene.go('hub'); YT.step(1);
''')
pages['B14']=('hud_journal',['your_input','your_profile','your_hud','your_day'],r'''
await YT.boot();
YT.freshProfile('HUD'); var Hd=Y.hud;
var sc={update:function(dt){Y.day.update(dt);},render:function(g){ g.fillStyle='#2d4a3a'; g.fillRect(0,0,960,540); Hd.render(g); }};
Y.core.scene.register('h',sc); Y.core.scene.go('h');
YT.test('bars reflect profile values within one frame',function(){ Y.profile.data.hp=40; Y.profile.data.stamina=61; Y.profile.data.energy=12; Y.profile.data.money=345; YT.step(1); YT.eq(Hd.last,{hp:40,stamina:61,energy:12,money:345}); });
YT.test('toasts never overlap (max 3); 4th waits, shows after 2.5 s',function(){ ['one','two','three','four'].forEach(Hd.toast); YT.eq(Hd.visible.length,3); YT.eq(Hd.queue.length,1); YT.step(1); var ys=Hd.lastToastYs; YT.ok(Math.abs(ys[0]-ys[1])>=26&&Math.abs(ys[1]-ys[2])>=26,'spacing'); YT.secs(2.6); YT.ok(Hd.visible.some(function(t){return t.msg==='four';}),'4th shown'); YT.secs(3); YT.eq(Hd.visible.length,0); });
YT.test('pause stops core updates (YOUR.core paused flag)',function(){ YT.tap('Escape'); YT.ok(Hd.pauseOpen&&Y.core.paused,'paused'); var u=Y.core.stats.updates,t=1000; for(var i=0;i<30;i++){t+=16.7;Y.core.tick(t);} YT.eq(Y.core.stats.updates,u); window.__t=t; });
YT.test('Save from pause writes storage and toasts "Saved"',function(){ localStorage.removeItem(Y.profile.SAVE_KEY); var t=window.__t; function k(code){ YOUR.input.simKey(code,true); t+=16.7; Y.core.tick(t); YOUR.input.simKey(code,false); t+=16.7; Y.core.tick(t); }
  k('KeyS'); YT.eq(Hd.sel,1); k('KeyJ'); YT.ok(localStorage.getItem(Y.profile.SAVE_KEY),'saved'); YT.ok(Hd.visible.some(function(x){return x.msg==='Saved';}),'toast'); k('Escape'); YT.ok(!Hd.pauseOpen&&!Y.core.paused,'resumed'); });
YT.test('journal overlay lists profile log and blocks gameplay',function(){ Y.profile.earn(45,'job'); Hd.toggleJournal(); YT.ok(Hd.blocking()); YT.step(1); Hd.toggleJournal(); YT.ok(!Hd.blocking()); });
YT.test('respects safe-area insets (layout inside canvas minus margins)',function(){ Hd.safe={t:30,r:0,b:20,l:24}; var L=Hd.layout(); YT.ok(L.x>=12+24/Y.core.view.s-1e-9&&L.y>=12+30/Y.core.view.s-1e-9,'insets'); Hd.safe={t:0,r:0,b:0,l:0}; });
Y.profile.data.hp=72; Y.profile.data.stamina=40; Y.profile.data.energy=58; Hd.toast('+$45 job'); Hd.toast('Stocked 5/5'); YT.step(1); Hd.openPause(); Y.core.render();
''')
pages['B15']=('audio',['your_audio'],r'''
await YT.boot({assets:false});
var A=Y.audio;
YT.test('sfx() before unlock is a silent no-op (no errors)',function(){ YT.eq(A.unlocked,false); Object.keys(A.RECIPES).forEach(function(n){ YT.eq(A.sfx(n),false); }); YT.eq(A.played.length,0); });
YT.test('unlock on first input, then every named sfx plays',function(){ window.dispatchEvent(new KeyboardEvent('keydown',{code:'KeyJ'})); YT.ok(A.unlocked,'unlocked'); A.setMuted(false); ['step','pickup','coin','hit','whistle','ollie','land','bail','menu'].forEach(function(n){ YT.ok(A.sfx(n),n); }); YT.eq(A.played.length,9); });
YT.test('mute persists in localStorage and silences sfx',function(){ A.setMuted(true); YT.eq(localStorage.getItem('your-audio-mute'),'1'); YT.eq(A.sfx('coin'),false); A.toggleMute(); YT.eq(localStorage.getItem('your-audio-mute'),'0'); YT.ok(A.sfx('coin')); });
YT.test('each named sfx has a distinct recipe (automated) — audible check listed in BUILDS_REPORT',function(){ var sig=Object.keys(A.RECIPES).map(function(n){var r=A.RECIPES[n];return [r.type,r.f0,r.f1,r.dur,r.noise,!!r.vib,!!r.two].join('|');}); YT.eq(new Set(sig).size,sig.length); YT.eq(Object.keys(A.RECIPES).length,9); });
YT.test('no network or audio-file loads (procedural only)',function(){ var res=performance.getEntriesByType('resource'); YT.ok(res.every(function(r){return /^file:/.test(r.name)&&/\.js$/.test(r.name);}),res.map(function(r){return r.name;}).join(',')); });
YT.test('master volume clamps 0..1',function(){ A.setVolume(3); YT.eq(A.master,1); A.setVolume(-1); YT.eq(A.master,0); A.setVolume(0.7); });
var g=Y.core.ctx; Y.core.beginRender(); g.fillStyle='#14161f'; g.fillRect(0,0,960,540); g.fillStyle='#ffd166'; g.font='bold 22px system-ui'; g.fillText('YOUR.audio (B15) — procedural WebAudio, no files',30,44); g.font='15px monospace'; g.fillStyle='#dde';
Object.keys(A.RECIPES).forEach(function(n,i){ var r=A.RECIPES[n]; g.fillText(n.padEnd(8)+' '+r.type.padEnd(9)+' '+r.f0+'→'+r.f1+' Hz  '+r.dur+' s  noise '+r.noise,30,90+i*26); }); g.fillText('muted: '+A.muted+'  master: '+A.master+'  unlocked: '+A.unlocked,30,350); Y.core.endRender();
''')
for k,(name,mods,body) in pages.items(): page(k,name,mods,body)
print(len(pages))
