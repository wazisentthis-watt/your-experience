/* YOUR character — B04 · PROPOSAL_HOLD. Top-down 4-direction controller + generic sprite-sheet animator.
   Sources: WishBorn createPlayer/move/heroSprite/drawActors (row-per-direction sheet, y-sorted draw).
   Placeholder art is swappable via YOUR.config.hero ('neutral' procedural | 'wishborn' library sheet 4x4 of 72x96).
   PROPOSED: SPEED=140 px/s, ANIM_FPS=8, feet box 20x10. */
(function(){
'use strict';
var Y=window.YOUR=window.YOUR||{};
var SPEED=140, ANIM_FPS=8; // PROPOSED
function SpriteSheet(o){ this.img=o.img; this.cols=o.cols; this.rows=o.rows;
  this.frameW=o.frameW||Math.floor(o.img.width/o.cols); this.frameH=o.frameH||Math.floor(o.img.height/o.rows);
  this.anims=o.anims||{}; this.fps=o.fps||ANIM_FPS; this.label=o.label||''; }
SpriteSheet.prototype.frameRect=function(anim,t){ var a=this.anims[anim]||this.anims.idle_down; var i=a.frames.length>1?Math.floor(t*this.fps)%a.frames.length:0; var f=a.frames[i];
  return {sx:(f%this.cols)*this.frameW,sy:Math.floor(f/this.cols)*this.frameH,sw:this.frameW,sh:this.frameH,index:f,i:i}; };
SpriteSheet.prototype.draw=function(g,anim,t,x,y,scale){ var r=this.frameRect(anim,t),s=(scale||1)*(this.scale||1); g.drawImage(this.img,r.sx,r.sy,r.sw,r.sh,Math.round(x-r.sw*s/2),Math.round(y-r.sh*s),r.sw*s,r.sh*s); return r; };
SpriteSheet.fourDir=function(cols,rows4){ var an={}; rows4.forEach(function(d,ri){ var fr=[]; for(var c=0;c<cols;c++)fr.push(ri*cols+c); an['walk_'+d]={frames:fr}; an['idle_'+d]={frames:[ri*cols]}; }); return an; };
/* neutral procedural placeholder: grey figure, no identity, 4 dirs x 4 frames */
SpriteSheet.neutralCanvas=function(fw,fh,body){ var c=document.createElement('canvas'); c.width=fw*4; c.height=fh*4; var g=c.getContext('2d'); body=body||'#9aa3b5';
  ['down','up','left','right'].forEach(function(d,ri){ for(var f=0;f<4;f++){ var ox=f*fw+fw/2, oy=ri*fh, sw=[0,1,0,-1][f]*4;
    g.fillStyle='rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(ox,oy+fh-4,12,4,0,0,7); g.fill();
    g.fillStyle='#4a5160'; g.fillRect(ox-7+(d==='left'?-sw/2:d==='right'?sw/2:0),oy+fh-22+(d==='down'||d==='up'?Math.max(0,sw):0),5,16); g.fillRect(ox+2-(d==='left'?-sw/2:d==='right'?sw/2:0),oy+fh-22+(d==='down'||d==='up'?Math.max(0,-sw):0),5,16);
    g.fillStyle=body; g.fillRect(ox-10,oy+fh-42,20,22); g.beginPath(); g.arc(ox,oy+fh-50,9,0,7); g.fill();
    g.fillStyle='#2b2f3a'; if(d==='down'){g.fillRect(ox-5,oy+fh-52,3,3);g.fillRect(ox+2,oy+fh-52,3,3);} else if(d==='left')g.fillRect(ox-7,oy+fh-52,3,3); else if(d==='right')g.fillRect(ox+4,oy+fh-52,3,3);
  }}); return c; };
SpriteSheet.fromConfig=function(key){ var cfg=Y.config.heroSheets[key||Y.config.hero]; var img=cfg.generator==='neutral'?SpriteSheet.neutralCanvas(cfg.frameW,cfg.frameH):Y.core.assets.get(cfg.asset);
  if(!img)throw new Error('hero sheet not loaded: '+key); var sh=new SpriteSheet({img:img,cols:cfg.cols,rows:cfg.rows,frameW:cfg.frameW,frameH:cfg.frameH,anims:cfg.anims||SpriteSheet.fourDir(cfg.cols,cfg.rows4),label:key||Y.config.hero}); if(cfg.scale)sh.scale=cfg.scale; return sh; };
function Character(o){ o=o||{}; this.x=o.x||0; this.y=o.y||0; this.vx=0; this.vy=0; this.face='down'; this.state='idle'; this.t=0; this.speed=o.speed||SPEED;
  this.feet={w:20,h:10}; this.sheet=o.sheet||null; this.frozen=false; this.scale=o.scale||1; }
Character.prototype.blocked=function(x,y,solid){ var w=this.feet.w/2,h=this.feet.h; return solid(x-w,y-h)||solid(x+w,y-h)||solid(x-w,y)||solid(x+w,y); };
Character.prototype.update=function(dt,ax,ay,solid){ solid=solid||function(){return false;};
  if(this.frozen){ax=0;ay=0;}
  var m=Math.hypot(ax,ay); if(m>1){ax/=m;ay/=m;}
  this.vx=ax*this.speed; this.vy=ay*this.speed;
  if(m>0.05){ this.state='walk'; this.face=Math.abs(ax)>Math.abs(ay)?(ax<0?'left':'right'):(ay<0?'up':'down'); } else this.state='idle';
  var nx=this.x+this.vx*dt; if(!this.blocked(nx,this.y,solid))this.x=nx; /* axis-separated → slides along walls */
  var ny=this.y+this.vy*dt; if(!this.blocked(this.x,ny,solid))this.y=ny;
  this.t+=dt; };
Character.prototype.anim=function(){ return this.state+'_'+this.face; };
Character.prototype.draw=function(g,ox,oy){ if(this.sheet)return this.sheet.draw(g,this.anim(),this.t,this.x-(ox||0),this.y-(oy||0),this.scale); };
Y.SpriteSheet=SpriteSheet; Y.Character=Character; Y.Character.SPEED=SPEED; Y.Character.ANIM_FPS=ANIM_FPS;
})();
