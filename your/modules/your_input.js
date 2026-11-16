/* YOUR input — B02 · PROPOSAL_HOLD. Poll-based unified actions from keyboard, gamepad and touch.
   Sources: Y.O.U.R. slice kd/ku/readInput/layoutTouch/deadzone; Shared 2.5D skating core actionFromKeyboard/actionFromGamepad;
   earlier WIR prototype padButtons/merge. Call YOUR.input.poll() once per update (YOUR.core.update does this). */
(function(){
'use strict';
var Y=window.YOUR=window.YOUR||{};
var DEAD=0.2;
var KEYMAP={KeyW:'up',ArrowUp:'up',KeyS:'down',ArrowDown:'down',KeyA:'left',ArrowLeft:'left',KeyD:'right',ArrowRight:'right',
  KeyJ:'a',KeyK:'b',KeyF:'fly',KeyL:'x',KeyI:'y',Escape:'pause',KeyP:'pause'};
var BTN=['a','b','x','y','pause','fly'];   /* v1.2.1: fly (F / gamepad RB) */
var keys={},touch={sx:0,sy:0,btn:{}},prev={},now={},state={moveX:0,moveY:0};
var inp={DEAD:DEAD,KEYMAP:KEYMAP,source:'keyboard',touchVisible:false,
  gamepadProvider:function(){ try{ var g=navigator.getGamepads?navigator.getGamepads():[]; for(var i=0;i<g.length;i++)if(g[i])return g[i]; }catch(e){} return null; }};
function onKey(e,down){ var a=KEYMAP[e.code]; if(!a)return; keys[e.code]=down; inp.source='keyboard'; if(e.preventDefault&&/Arrow|Space/.test(e.code))e.preventDefault(); }
window.addEventListener('keydown',function(e){onKey(e,true);});
window.addEventListener('keyup',function(e){onKey(e,false);});
window.addEventListener('blur',function(){keys={};});
inp.simKey=function(code,down){ onKey({code:code},down); };
inp.radial=function(x,y,dz){ dz=dz===undefined?DEAD:dz; var m=Math.hypot(x,y); if(m<dz)return {x:0,y:0}; var k=Math.min(1,(m-dz)/(1-dz))/m; return {x:x*k,y:y*k}; };
function kbAxis(){ var x=0,y=0; for(var c in keys){ if(!keys[c])continue; var a=KEYMAP[c]; if(a==='left')x-=1; if(a==='right')x+=1; if(a==='up')y-=1; if(a==='down')y+=1; }
  var m=Math.hypot(x,y); if(m>1){x/=m;y/=m;} return {x:x,y:y}; }
inp.poll=function(){
  prev=now; now={}; var kx=kbAxis(),gx={x:0,y:0};
  for(var c in keys)if(keys[c]){ var a=KEYMAP[c]; if(BTN.indexOf(a)>=0)now[a]=true; }
  var gp=inp.gamepadProvider();
  if(gp){ var ax=gp.axes||[0,0]; gx=inp.radial(ax[0]||0,ax[1]||0); var b=gp.buttons||[];
    var pr=function(i){return b[i]&&(b[i].pressed||b[i].value>0.5);};
    if(pr(0))now.a=true; if(pr(1))now.b=true; if(pr(2))now.x=true; if(pr(3))now.y=true; if(pr(9))now.pause=true; if(pr(5))now.fly=true;
    if(pr(12))gx.y=-1; if(pr(13))gx.y=1; if(pr(14))gx.x=-1; if(pr(15))gx.x=1;
    if(gx.x||gx.y||now.a||now.b||now.x||now.y)inp.source='gamepad'; }
  for(var t in touch.btn)if(touch.btn[t])now[t]=true;
  var x=kx.x+gx.x+touch.sx, y=kx.y+gx.y+touch.sy, m=Math.hypot(x,y); if(m>1){x/=m;y/=m;}
  state.moveX=x; state.moveY=y;
};
inp.held=function(a){ if(a==='moveX')return state.moveX; if(a==='moveY')return state.moveY; return !!now[a]; };
inp.pressed=function(a){ return !!now[a]&&!prev[a]; };
inp.released=function(a){ return !now[a]&&!!prev[a]; };
inp.axis=function(){ return {x:state.moveX,y:state.moveY}; };
inp.reset=function(){ keys={}; touch={sx:0,sy:0,btn:{}}; prev={}; now={}; state.moveX=state.moveY=0; };
/* ---- touch overlay: left virtual stick + 4 buttons, shown only after first touch ---- */
var ov=null,og=null,stickId=null,stickO=null,btnIds={};
function layout(){ var w=window.innerWidth,h=window.innerHeight,r=Math.min(w,h);
  return {stick:{x:r*0.18,y:h-r*0.2,r:r*0.12},btns:[{a:'a',x:w-r*0.12,y:h-r*0.12},{a:'b',x:w-r*0.24,y:h-r*0.06},{a:'x',x:w-r*0.24,y:h-r*0.24},{a:'y',x:w-r*0.36,y:h-r*0.12}],br:r*0.055}; }
function draw(){ if(!og)return; var L=layout(); ov.width=window.innerWidth; ov.height=window.innerHeight; og.clearRect(0,0,ov.width,ov.height);
  og.globalAlpha=0.35; og.fillStyle='#fff'; og.beginPath(); og.arc(L.stick.x,L.stick.y,L.stick.r,0,7); og.fill();
  og.globalAlpha=0.6; og.beginPath(); og.arc(L.stick.x+touch.sx*L.stick.r,L.stick.y+touch.sy*L.stick.r,L.stick.r*0.4,0,7); og.fill();
  L.btns.forEach(function(b){ og.globalAlpha=touch.btn[b.a]?0.8:0.4; og.beginPath(); og.arc(b.x,b.y,L.br,0,7); og.fill(); og.globalAlpha=1; og.fillStyle='#111'; og.font='bold 16px system-ui'; og.textAlign='center'; og.fillText(b.a.toUpperCase(),b.x,b.y+6); og.fillStyle='#fff'; }); og.globalAlpha=1; }
function ensureOverlay(){ if(ov)return; ov=document.createElement('canvas'); ov.id='your-touch'; ov.style.cssText='position:fixed;left:0;top:0;width:100%;height:100%;z-index:50;touch-action:none;';
  document.body.appendChild(ov); og=ov.getContext('2d');
  ov.addEventListener('pointerdown',pdown); ov.addEventListener('pointermove',pmove); ov.addEventListener('pointerup',pup); ov.addEventListener('pointercancel',pup); }
function pdown(e){ var L=layout(); if(Math.hypot(e.clientX-L.stick.x,e.clientY-L.stick.y)<L.stick.r*1.6&&stickId===null){stickId=e.pointerId;stickO=L.stick;pmove(e);}
  else L.btns.forEach(function(b){ if(Math.hypot(e.clientX-b.x,e.clientY-b.y)<L.br*1.4){btnIds[e.pointerId]=b.a;touch.btn[b.a]=true;} }); draw(); }
function pmove(e){ if(e.pointerId!==stickId)return; var dx=(e.clientX-stickO.x)/stickO.r,dy=(e.clientY-stickO.y)/stickO.r,v=inp.radial(Math.max(-1,Math.min(1,dx)),Math.max(-1,Math.min(1,dy))); touch.sx=v.x; touch.sy=v.y; draw(); }
function pup(e){ if(e.pointerId===stickId){stickId=null;touch.sx=touch.sy=0;} var a=btnIds[e.pointerId]; if(a){touch.btn[a]=false;delete btnIds[e.pointerId];} draw(); }
inp.showTouch=function(){ ensureOverlay(); ov.style.display='block'; inp.touchVisible=true; inp.source='touch'; draw(); };
inp.hideTouch=function(){ if(ov)ov.style.display='none'; inp.touchVisible=false; };
window.addEventListener('touchstart',function(){ if(!inp.touchVisible)inp.showTouch(); },{passive:true});
window.addEventListener('resize',draw);
Y.input=inp;
})();
