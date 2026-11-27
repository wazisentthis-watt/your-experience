/* WIR Mella Movement Trial | playable, source-frame-faithful, no save/profile writes.
 * This module adds a small training course inside the existing Sprite Studio.
 * Existing art: your/assets/mella/mella_sheet_96.png (16x7 96px; source metadata SHEETS.json).
 * Left row is a documented duplicate/fallback, NOT newly authored motion.
 */
(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root && root.document) {
    root.WIRMellaTrial = api;
    if (root.document.readyState === 'loading')
      root.document.addEventListener('DOMContentLoaded', function () { api.mount(root.document, root); }, { once:true });
    else api.mount(root.document, root);
  }
})(typeof window !== 'undefined' ? window : null, function () {
  'use strict';
  var SIZE = { w:640, h:400, radius:10, speed:150 };
  var OBSTACLES = Object.freeze([
    Object.freeze({x:190,y:55,w:34,h:210}),
    Object.freeze({x:390,y:152,w:34,h:187}),
    Object.freeze({x:254,y:291,w:125,h:25})
  ]);
  var MARKERS = Object.freeze([{x:115,y:78},{x:300,y:214},{x:518,y:82}]);
  var EXIT = Object.freeze({x:575,y:345});
  var ROW = Object.freeze({down:0,up:1,left:2,right:3});
  var SHEET = 'your/assets/mella/mella_sheet_96.png';
  function initialState() {
    return {x:62,y:335,dir:'down',moving:false,animTime:0,elapsed:0,found:[false,false,false],finished:false};
  }
  function available(x,y) {
    var r = SIZE.radius;
    if (x < 17 + r || x > SIZE.w-17-r || y < 17+r || y > SIZE.h-17-r) return false;
    for (var i=0;i<OBSTACLES.length;i++){
      var o=OBSTACLES[i];
      if (x+r>o.x && x-r<o.x+o.w && y+r>o.y && y-r<o.y+o.h) return false;
    }
    return true;
  }
  function collected(state) { return state.found.filter(Boolean).length; }
  function step(state, inputX, inputY, dt) {
    if (!state || !Number.isFinite(inputX) || !Number.isFinite(inputY) || !Number.isFinite(dt)) throw new Error('invalid trial update');
    if (state.finished) return state;
    dt=Math.max(0,Math.min(.05,dt));
    var length=Math.hypot(inputX,inputY);
    if (length>1) {inputX/=length;inputY/=length;}
    var moving=Math.hypot(inputX,inputY)>.10;
    state.moving=moving;
    if (moving) {
      state.dir=Math.abs(inputX)>Math.abs(inputY)?(inputX<0?'left':'right'):(inputY<0?'up':'down');
      var dx=inputX*SIZE.speed*dt,dy=inputY*SIZE.speed*dt;
      if (available(state.x+dx,state.y)) state.x+=dx;
      if (available(state.x,state.y+dy)) state.y+=dy;
      state.animTime+=dt;
    } else state.animTime=0;
    state.elapsed+=dt;
    for (var k=0;k<MARKERS.length;k++)
      if(!state.found[k] && Math.hypot(state.x-MARKERS[k].x,state.y-MARKERS[k].y)<24)state.found[k]=true;
    if(collected(state)===MARKERS.length && Math.hypot(state.x-EXIT.x,state.y-EXIT.y)<28) {
      state.finished=true;state.moving=false;
    }
    return state;
  }
  function frame(state) {
    if(!state || !Object.prototype.hasOwnProperty.call(ROW,state.dir)) throw new Error('unknown direction');
    var col=state.moving?4+Math.floor(state.animTime*8)%8:0;
    var row=ROW[state.dir];
    return {sx:col*96,sy:row*96,sw:96,sh:96,frame:row*16+col,
      fallback:state.dir==='left'};
  }
  function verifyImage(width,height) {return width===1536 && height===672;}
  function mount(doc,win){
    var studio=doc.getElementById('wirSpriteStudio');
    if (!studio || doc.getElementById('wirMellaTrial')) return false;
    var head=studio.querySelector('.wir-head');
    if (!head) return false;
    var trigger=doc.createElement('button');
    trigger.type='button';trigger.id='wirMellaTrialButton';trigger.textContent='PLAY MELLA';
    trigger.setAttribute('aria-label','Play a Mella movement training course');
    trigger.style.cssText='background:#0d695f;border:1px solid #56dfc9;color:#fff;min-height:38px;padding:7px 10px;border-radius:9px;font:700 11px system-ui';
    head.insertBefore(trigger,head.querySelector('[data-close]') || null);
    var css=doc.createElement('style');css.id='wirMellaTrialStyle';
    css.textContent=[
      '#wirMellaTrial{position:fixed;inset:0;z-index:9100;background:#100d20;color:#f2f4ff;box-sizing:border-box;overflow:auto;padding:12px 12px 24px;font:14px/1.45 system-ui}',
      '#wirMellaTrial[hidden]{display:none!important}',
      '#wirMellaTrial .mt-wrap{max-width:680px;margin:auto}',
      '#wirMellaTrial .mt-head{display:flex;justify-content:space-between;align-items:center;gap:10px}',
      '#wirMellaTrial h2{font-size:17px;margin:0}',
      '#wirMellaTrial p{margin:6px 0;color:#c0b8e3}',
      '#wirMellaTrial button{min-height:40px;padding:8px 13px;border-radius:9px;background:#262043;border:1px solid #716693;color:#fff;font:700 13px system-ui;touch-action:none}',
      '#wirMellaTrial button:focus-visible{outline:2px solid #ffe498;outline-offset:2px}',
      '#wirMellaTrial canvas{display:block;width:100%;aspect-ratio:8/5;image-rendering:pixelated;border-radius:12px;border:1px solid #625983;background:#121a2c;box-sizing:border-box;touch-action:none}',
      '#wirMellaTrial .mt-controls{display:grid;grid-template-columns:repeat(3,58px);gap:5px;justify-content:center;margin:8px auto}',
      '#wirMellaTrial .mt-controls button{font-size:20px;min-height:46px;touch-action:none;user-select:none}',
      '#wirMellaTrial .mt-controls button[aria-pressed=true]{background:#18756b;border-color:#61f5d4}',
      '#wirMellaTrial .mt-status{font-weight:700;color:#f7ebae;margin:7px 0}',
      '#wirMellaTrial .mt-small{font-size:11px}',
      '#wirMellaTrial .mt-controls .mt-blank{visibility:hidden}',
      '@media(max-width:360px){#wirMellaTrial h2{font-size:14px}#wirMellaTrial{padding:9px}}'
    ].join('');
    doc.head.appendChild(css);
    var modal=doc.createElement('section');modal.id='wirMellaTrial';modal.hidden=true;
    modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');
    modal.setAttribute('aria-label','Mella playable movement trial');
    modal.innerHTML=
      '<div class="mt-wrap"><div class="mt-head"><h2>⚡ MELLA MOVEMENT TRIAL</h2><button type="button" data-close>Back to Studio</button></div>'+
      '<p>Collect 3 glowing markers, then reach the exit. Wall collisions and sprite movement are live.</p>'+
      '<canvas width="640" height="400" aria-label="Playable Mella training course"></canvas>'+
      '<p class="mt-status" aria-live="polite">Loading Mella\'s original sheet…</p>'+
      '<div class="mt-controls" aria-label="Touch movement controls">'+
      '<span class="mt-blank"></span><button data-dir="up" aria-label="Move up">▲</button><span class="mt-blank"></span>'+
      '<button data-dir="left" aria-label="Move left">◀</button><button data-dir="down" aria-label="Move down">▼</button><button data-dir="right" aria-label="Move right">▶</button></div>'+
      '<p class="mt-small">Keyboard: WASD / arrows · Gamepad: stick / D-pad · B or Escape: return. Mella LEFT frames are a source fallback, not new art.</p>'+
      '<button type="button" data-replay>Restart course</button></div>';
    doc.body.appendChild(modal);
    var canvas=modal.querySelector('canvas'),ctx=canvas.getContext('2d'),
      status=modal.querySelector('.mt-status'),sprite=null,state=initialState(),active=false,
      raf=0,lastTick=null,lastCollected=0,keyboard=new Set(),touch=new Set(),touchPtrs=new Map(),padWasB=false;
    var dirs={ArrowUp:'up',KeyW:'up',ArrowDown:'down',KeyS:'down',ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right'};
    function showStatus(message){status.textContent=message;}
    function reset(){state=initialState();lastCollected=0;keyboard.clear();touch.clear();touchPtrs.clear();
      showStatus(sprite?'0 / 3 markers collected. Reach the portal after all three.':'Loading Mella sheet…');}
    function close(){if(!active)return;active=false;modal.hidden=true;keyboard.clear();touch.clear();touchPtrs.clear();
      if(raf)win.cancelAnimationFrame(raf);raf=0;lastTick=null;trigger.focus();}
    function open(){if(active)return;active=true;modal.hidden=false;reset();lastTick=null;padWasB=false;
      modal.querySelector('[data-close]').focus();
      if(!sprite){
        var im=new win.Image();
        im.onload=function(){if(verifyImage(im.naturalWidth,im.naturalHeight)){sprite=im;if(active)showStatus('0 / 3 markers collected. Reach the portal after all three.');}
          else if(active)showStatus('Mella image grid mismatch. Movement disabled; use Back.');};
        im.onerror=function(){if(active)showStatus('Mella image missing. Movement disabled; use Back.');};
        im.src=SHEET;
      }
      raf=win.requestAnimationFrame(tick);
    }
    function held(dir){return keyboard.has(dir)||touch.has(dir);}
    function padInput(){
      try{
        var list=win.navigator&&win.navigator.getGamepads&&win.navigator.getGamepads(),p=list&&Array.from(list).find(Boolean);
        if(!p){padWasB=false;return {x:0,y:0};}
        var buttons=p.buttons||[],pressed=function(i){return !!buttons[i] && !!buttons[i].pressed;};
        var b=pressed(1);
        if(b && !padWasB){padWasB=b;close();return {x:0,y:0};}padWasB=b;
        var ax=p.axes||[],x=(ax[0]||0),y=(ax[1]||0);
        if(pressed(14))x=-1;else if(pressed(15))x=1;
        if(pressed(12))y=-1;else if(pressed(13))y=1;
        return {x:Math.abs(x)>.20?x:0,y:Math.abs(y)>.20?y:0};
      }catch(e){return {x:0,y:0};}
    }
    function draw(){
      ctx.fillStyle='#131a2c';ctx.fillRect(0,0,SIZE.w,SIZE.h);
      ctx.strokeStyle='rgba(80,149,175,.14)';ctx.lineWidth=1;
      for(var x=0;x<=SIZE.w;x+=32){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,SIZE.h);ctx.stroke();}
      for(var y=0;y<=SIZE.h;y+=32){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(SIZE.w,y);ctx.stroke();}
      ctx.strokeStyle='#62bcbd';ctx.lineWidth=3;ctx.strokeRect(17,17,SIZE.w-34,SIZE.h-34);
      OBSTACLES.forEach(function(o){ctx.fillStyle='#474063';ctx.fillRect(o.x,o.y,o.w,o.h);
        ctx.fillStyle='#776c92';ctx.fillRect(o.x+4,o.y+4,o.w-8,o.h-8);});
      MARKERS.forEach(function(p,i){if(state.found[i])return;
        ctx.beginPath();ctx.arc(p.x,p.y,12,0,Math.PI*2);ctx.fillStyle='#63e9d6';ctx.fill();
        ctx.beginPath();ctx.arc(p.x,p.y,5,0,Math.PI*2);ctx.fillStyle='#163e41';ctx.fill();});
      ctx.fillStyle=collected(state)===3?'#f3d77d':'#6b667b';ctx.fillRect(EXIT.x-17,EXIT.y-24,34,48);
      ctx.fillStyle='#1d2537';ctx.fillRect(EXIT.x-10,EXIT.y-17,20,34);
      ctx.fillStyle='#e7ebfa';ctx.font='bold 12px system-ui';ctx.fillText('EXIT',EXIT.x-15,EXIT.y-29);
      if(sprite){
        var f=frame(state);
        ctx.fillStyle='rgba(0,0,0,.28)';ctx.beginPath();ctx.ellipse(state.x,state.y,18,5,0,0,Math.PI*2);ctx.fill();
        ctx.imageSmoothingEnabled=false;
        ctx.drawImage(sprite,f.sx,f.sy,f.sw,f.sh,Math.round(state.x-32),Math.round(state.y-60),64,64);
      } else {ctx.fillStyle='#c7c0de';ctx.font='14px system-ui';ctx.fillText('Mella atlas loading…',212,350);}
      ctx.font='bold 13px system-ui';ctx.fillStyle='#f6e1a3';ctx.fillText('MARKERS '+collected(state)+'/3',30,35);
      if(state.finished){ctx.fillStyle='rgba(8,14,25,.85)';ctx.fillRect(126,140,387,110);
        ctx.fillStyle='#79f1d7';ctx.font='bold 23px system-ui';ctx.fillText('COURSE COMPLETE',176,180);
        ctx.font='16px system-ui';ctx.fillStyle='#fff';ctx.fillText('Replay or return to Y.O.U.R.',191,211);}
    }
    function tick(now){
      if(!active)return;
      var dt=lastTick===null?0:Math.max(0,Math.min(.05,(now-lastTick)/1000));lastTick=now;
      var p=padInput();if(!active)return;
      var x=(held('right')?1:0)-(held('left')?1:0)+p.x,
        y=(held('down')?1:0)-(held('up')?1:0)+p.y;
      if(sprite && !doc.hidden){step(state,x,y,dt);var n=collected(state);
        if(n!==lastCollected){lastCollected=n;showStatus(n+'/3 markers collected. '+(n===3?'Exit unlocked!':'Keep moving.'));}
        if(state.finished && status.textContent.indexOf('Complete')<0)
          showStatus('Complete in '+state.elapsed.toFixed(1)+'s! Replay or go Back to Studio.');
      }
      draw();raf=win.requestAnimationFrame(tick);
    }
    trigger.addEventListener('click',open);
    modal.querySelector('[data-close]').addEventListener('click',close);
    modal.querySelector('[data-replay]').addEventListener('click',reset);
    modal.querySelectorAll('[data-dir]').forEach(function(b){
      function set(on,e){if(e){e.preventDefault();e.stopPropagation();}
        var dir=b.getAttribute('data-dir');
        if(on){touchPtrs.set(e.pointerId,dir);touch.add(dir);
          if(b.setPointerCapture)try{b.setPointerCapture(e.pointerId);}catch(err){}
        } else {touchPtrs.delete(e.pointerId);touch.delete(dir);}b.setAttribute('aria-pressed',String(on));}
      b.addEventListener('pointerdown',function(e){set(true,e);});
      ['pointerup','pointercancel','lostpointercapture'].forEach(function(kind){
        b.addEventListener(kind,function(e){if(touchPtrs.get(e.pointerId)===b.getAttribute('data-dir'))set(false,e);});
      });
    });
    doc.addEventListener('keydown',function(e){
      if(!active)return;
      if(e.code==='Escape'){close();e.preventDefault();e.stopImmediatePropagation();return;}
      if(Object.prototype.hasOwnProperty.call(dirs,e.code)){keyboard.add(dirs[e.code]);e.preventDefault();e.stopImmediatePropagation();}
    },true);
    doc.addEventListener('keyup',function(e){
      if(!active)return;
      if(Object.prototype.hasOwnProperty.call(dirs,e.code)){keyboard.delete(dirs[e.code]);e.preventDefault();e.stopImmediatePropagation();}
    },true);
    win.addEventListener('blur',function(){keyboard.clear();touch.clear();});
    return true;
  }
  return Object.freeze({initialState:initialState,step:step,frame:frame,
    available:available,collected:collected,verifyImage:verifyImage,mount:mount,
    SIZE:SIZE,OBSTACLES:OBSTACLES,MARKERS:MARKERS,EXIT:EXIT});
});
