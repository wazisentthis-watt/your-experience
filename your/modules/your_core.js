/* YOUR core — B01 · PROPOSAL_HOLD · plain canvas 2D, offline.
   Fixed-timestep loop (60 Hz updates, render each rAF, max 5 catch-up steps), scene manager,
   DPR-aware letterboxed 960x540 logical view, pause on blur, asset loader.
   Ported ideas: Y.O.U.R. slice enterScene/buildScene/frame; earlier WIR prototype frame/reset; RIFFT main.js tick/advance/togglePause. */
(function(){
'use strict';
var Y=window.YOUR=window.YOUR||{};
var STEP=1/60, MAX_STEPS=5;
var core={W:960,H:540,STEP:STEP,canvas:null,ctx:null,view:{x:0,y:0,s:1,dpr:1},paused:false,manual:false,
  stats:{updates:0,renders:0,t:0},_last:null,_acc:0,_raf:0,hooks:{pre:[],post:[]}};
var scenes={},cur=null,curName=null;
core.scene={
  register:function(name,s){scenes[name]=s;return s;},
  go:function(name,data){ if(!scenes[name])throw new Error('unknown scene '+name);
    var prev=curName; if(cur&&cur.exit)cur.exit(name); cur=scenes[name]; curName=name;
    if(cur.enter)cur.enter(data||{},prev); return cur;},
  get current(){return cur;}, get name(){return curName;}, has:function(n){return !!scenes[n];}
};
core.resize=function(dprOverride){
  var c=core.canvas; if(!c)return;
  var dpr=dprOverride||window.devicePixelRatio||1;
  var p=c.parentElement, cw=(p&&p!==document.body?p.clientWidth:window.innerWidth)||core.W, ch=(p&&p!==document.body?p.clientHeight:window.innerHeight)||core.H;
  c.style.width=cw+'px'; c.style.height=ch+'px';
  c.width=Math.round(cw*dpr); c.height=Math.round(ch*dpr);
  var s=Math.min(cw/core.W,ch/core.H);
  core.view={s:s,dpr:dpr,x:(cw-core.W*s)/2,y:(ch-core.H*s)/2,cssW:cw,cssH:ch};
};
core.beginRender=function(){ var g=core.ctx,v=core.view; g.setTransform(1,0,0,1,0,0); g.fillStyle='#000'; g.fillRect(0,0,core.canvas.width,core.canvas.height);
  g.setTransform(v.s*v.dpr,0,0,v.s*v.dpr,v.x*v.dpr,v.y*v.dpr); g.save(); g.beginPath(); g.rect(0,0,core.W,core.H); g.clip(); };
core.endRender=function(){ core.ctx.restore(); };
core.toLogical=function(cx,cy){ var r=core.canvas.getBoundingClientRect(),v=core.view; return {x:(cx-r.left-v.x)/v.s,y:(cy-r.top-v.y)/v.s}; };
core.update=function(dt){
  if(Y.input&&Y.input.poll)Y.input.poll();
  core.hooks.pre.forEach(function(f){f(dt);});
  if(cur&&cur.update)cur.update(dt);
  core.hooks.post.forEach(function(f){f(dt);});
  core.stats.updates++; core.stats.t+=dt;
};
core.render=function(){ if(!core.ctx)return; core.beginRender(); if(cur&&cur.render)cur.render(core.ctx); core.endRender(); core.stats.renders++; };
core.tick=function(now){ /* now in ms; may be fed manually by tests */
  if(core._last===null){core._last=now; core.render(); return 0;}
  var dt=Math.min(0.25,(now-core._last)/1000); core._last=now; var n=0;
  if(core.paused){ if(core.onPausedTick){ if(Y.input&&Y.input.poll)Y.input.poll(); core.onPausedTick(dt); } }
  else { core._acc+=dt; while(core._acc>=STEP&&n<MAX_STEPS){core.update(STEP);core._acc-=STEP;n++;} if(n===MAX_STEPS)core._acc=0; }
  core.render(); return n;
};
core.stepFixed=function(n){ for(var i=0;i<n;i++)core.update(STEP); core.render(); };
core.setPaused=function(p,reason){ core.paused=!!p; core._acc=0; core._last=null; core.pauseReason=p?(reason||'manual'):null; };
core.start=function(){ if(core.manual)return; cancelAnimationFrame(core._raf); var loop=function(t){core.tick(t);core._raf=requestAnimationFrame(loop);}; core._raf=requestAnimationFrame(loop); };
core.stop=function(){ cancelAnimationFrame(core._raf); };
core.init=function(canvas,opts){ opts=opts||{}; core.canvas=canvas; core.ctx=canvas.getContext('2d'); core.manual=!!opts.manual;
  core.resize(); window.addEventListener('resize',function(){core.resize();});
  window.addEventListener('blur',function(){ if(!core.paused)core.setPaused(true,'blur'); });
  window.addEventListener('focus',function(){ if(core.pauseReason==='blur')core.setPaused(false); });
  if(!core.manual)core.start(); return core; };
/* assets */
var store={};
core.assets={progress:0,
  load:function(manifest,onProgress){ var ids=Object.keys(manifest||{}),done=0; core.assets.progress=ids.length?0:1;
    return Promise.all(ids.map(function(id){ return new Promise(function(res){ var im=new Image(); im.onload=function(){store[id]=im;fin();}; im.onerror=function(){store[id]=null;fin(true);};
      function fin(err){ done++; core.assets.progress=done/ids.length; if(onProgress)onProgress(core.assets.progress,id,!!err); res(); } im.src=manifest[id]; }); })).then(function(){return store;}); },
  get:function(id){return store[id]||null;}, put:function(id,img){store[id]=img;}, all:store};
Y.core=core;
})();
