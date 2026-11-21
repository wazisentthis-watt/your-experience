/* YOUR world — B05 · PROPOSAL_HOLD. Neighborhood tilemap (data string array), camera follow w/ dead-zone + clamp,
   POI doors → onEnter(poiId), minimap, off-screen tile culling.
   Sources: Living WIR canMoveEntity/nearestPOIId/poi/mapGo/openPOI (POI model); WishBorn createWorld/zoneGround/renderTile (tile render);
   Lil Heavy minimap/road. POI names from the Y.O.U.R. slice (home, Corner Store, skate park, Training Facility field, Arena).
   Art: neutral flat-colour tiles (OPEN DECISION: art style). PROPOSED: map layout, colours, dead-zone 160x100. */
(function(){
'use strict';
var Y=window.YOUR=window.YOUR||{};
var TILE=32;
var MAP=
[
  'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT',
  'T..................==..................T',
  'T..................==..................T',
  'T..#######.........==....#########.....T',
  'T..#######.........==....#########.....T',
  'T..#######.........==....#########.....T',
  'T..#######....T....==....#########.....T',
  'T..#######.........==....#########.....T',
  'T..###H###.........==....####S####.....T',
  'T.....:........T...==........:.........T',
  'T.....:............==........:~~~~.....T',
  'T.....:.T..........==........:~~~~.....T',
  'T.....:............==........:~~~~.....T',
  'T.....:............==........:.........T',
  'T======================================T',
  'T======================================T',
  'T...T..:.....:.....==..........:....T..T',
  'T......:.....:.....==..........:.......T',
  'T......:..###K###..==..........:.......T',
  'T..####A###........==.....#####F####...T',
  'T..########........==.....##########...T',
  'T..########........==.....##########...T',
  'T..########........==.....##########...T',
  'T..########........==.....##########...T',
  'T..########........==.....##########...T',
  'T..................==..T..##########...T',
  'T............T.....==..................T',
  'T..................==..................T',
  'T..................==..................T',
  'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT'
];
var LEGEND={'.':{c:'#5f8f5a'},'=':{c:'#4a4d57'},':':{c:'#b9ae94'},'#':{c:'#7a6a73',solid:true},'T':{c:'#2f5e37',solid:true,tree:true},'~':{c:'#3b6fa0',solid:true},
  'H':{c:'#e0c36a',door:'home'},'S':{c:'#e0c36a',door:'store'},'K':{c:'#e0c36a',door:'skatepark'},'F':{c:'#e0c36a',door:'field'},'A':{c:'#e0c36a',door:'arena'}};
var POI_LABEL={home:'Home',store:'Corner Store',skatepark:'Skate Park',field:'Training Facility',arena:'Arena'};
var w={TILE:TILE,MAP:MAP,LEGEND:LEGEND,POI_LABEL:POI_LABEL,cols:MAP[0].length,rows:MAP.length,cam:{x:0,y:0},dead:{w:160,h:100},onEnter:null,pois:{},stats:{tilesDrawn:0}};
w.pw=w.cols*TILE; w.ph=w.rows*TILE;
for(var r=0;r<MAP.length;r++)for(var c=0;c<MAP[r].length;c++){ var L=LEGEND[MAP[r][c]]; if(L&&L.door)w.pois[L.door]={id:L.door,tx:c,ty:r,x:c*TILE+TILE/2,y:r*TILE+TILE/2,label:POI_LABEL[L.door]}; }
w.charAt=function(tx,ty){ return (MAP[ty]||'')[tx]||'T'; };
w.tileAt=function(x,y){ return w.charAt(Math.floor(x/TILE),Math.floor(y/TILE)); };
w.solid=function(x,y){ var L=LEGEND[w.tileAt(x,y)]; return !L||!!L.solid; };
w.doorAt=function(x,y){ var L=LEGEND[w.tileAt(x,y)]; return L&&L.door||null; };
w.spawn=function(id){ var p=w.pois[id]; var below=LEGEND[w.charAt(p.tx,p.ty+1)]; var dy=(below&&!below.solid)?1:-1; return {x:p.x,y:(p.ty+dy)*TILE+TILE*0.75}; };
w.follow=function(t,snap){ var W=Y.core.W,H=Y.core.H,cx=w.cam.x+W/2,cy=w.cam.y+H/2,dx=t.x-cx,dy=t.y-cy,hw=w.dead.w/2,hh=w.dead.h/2;
  if(snap){w.cam.x=t.x-W/2;w.cam.y=t.y-H/2;} else { if(dx>hw)w.cam.x+=dx-hw; if(dx<-hw)w.cam.x+=dx+hw; if(dy>hh)w.cam.y+=dy-hh; if(dy<-hh)w.cam.y+=dy+hh; }
  w.cam.x=Math.max(0,Math.min(w.pw-W,w.cam.x)); w.cam.y=Math.max(0,Math.min(w.ph-H,w.cam.y)); };
w.checkEnter=function(ch,input){ if(!input.pressed('a'))return null; var d=w.doorAt(ch.x,ch.y-4)||w.doorAt(ch.x,ch.y-TILE*0.6); if(d){ if(w.onEnter)w.onEnter(d); return d; } return null; };
w.drawTiles=function(g){ var W=Y.core.W,H=Y.core.H,x0=Math.max(0,Math.floor(w.cam.x/TILE)),y0=Math.max(0,Math.floor(w.cam.y/TILE)),x1=Math.min(w.cols-1,Math.floor((w.cam.x+W)/TILE)),y1=Math.min(w.rows-1,Math.floor((w.cam.y+H)/TILE)),n=0;
  for(var ty=y0;ty<=y1;ty++)for(var tx=x0;tx<=x1;tx++){ var ch=MAP[ty][tx],L=LEGEND[ch],sx=tx*TILE-w.cam.x,sy=ty*TILE-w.cam.y; n++;
    g.fillStyle=L.tree?LEGEND['.'].c:L.c; g.fillRect(Math.floor(sx),Math.floor(sy),TILE+1,TILE+1);
    if(L.tree){ g.fillStyle=L.c; g.beginPath(); g.arc(sx+16,sy+14,13,0,7); g.fill(); g.fillStyle='#5a3d2b'; g.fillRect(sx+13,sy+22,6,9); }
    else if(ch==='#'){ g.fillStyle='rgba(0,0,0,.18)'; g.fillRect(sx,sy+TILE-4,TILE,4); }
    else if(L.door){ g.fillStyle='#3a2e22'; g.fillRect(sx+8,sy+4,16,26); }
    else if(ch==='='&&(tx%4===0)&&MAP[ty-1]&&MAP[ty-1][tx]==='='){ g.fillStyle='#d9d27a'; g.fillRect(sx,sy-1,14,2); } }
  w.stats.tilesDrawn=n;
  g.font='bold 12px system-ui'; g.textAlign='center';
  for(var id in w.pois){ var p=w.pois[id],lx=p.x-w.cam.x,ly=p.ty*TILE-w.cam.y-6; if(lx<-80||lx>W+80||ly<-20||ly>H+20)continue; g.fillStyle='rgba(0,0,0,.55)'; var tw=g.measureText(p.label).width+10; g.fillRect(lx-tw/2,ly-13,tw,17); g.fillStyle='#fff'; g.fillText(p.label,lx,ly); } };
w.render=function(g,drawables){ w.drawTiles(g); (drawables||[]).slice().sort(function(a,b){return a.y-b.y;}).forEach(function(d){d.draw(g,w.cam.x,w.cam.y);}); };
w.minimap=function(g,t,others){ var s=4,mw=w.cols*s,mh=w.rows*s,ox=Y.core.W-mw-10,oy=10; g.globalAlpha=0.85; g.fillStyle='#111'; g.fillRect(ox-2,oy-2,mw+4,mh+4);
  for(var ty=0;ty<w.rows;ty++)for(var tx=0;tx<w.cols;tx++){ g.fillStyle=LEGEND[MAP[ty][tx]].c; g.fillRect(ox+tx*s,oy+ty*s,s,s); }
  g.globalAlpha=1; (others||[]).forEach(function(o){g.fillStyle=o.col||'#7df'; g.fillRect(ox+o.x/TILE*s-2,oy+o.y/TILE*s-2,4,4);});
  var px=ox+t.x/TILE*s, py=oy+t.y/TILE*s; g.fillStyle='#fff'; g.beginPath(); g.arc(px,py,3,0,7); g.fill(); w.lastMinimapDot={x:px,y:py,ox:ox,oy:oy,s:s}; return w.lastMinimapDot; };
/* world scene: player walks the neighborhood; NPCs (B06) and HUD (B14) plug in if loaded */
w.makeScene=function(opts){ opts=opts||{}; var sc={player:null,
  enter:function(d){ if(!sc.player){ sc.player=new Y.Character({x:0,y:0}); try{sc.player.sheet=Y.SpriteSheet.fromConfig();}catch(e){sc.player.sheet=Y.SpriteSheet.fromConfig('neutral');} }
    var sp=d&&d.from?w.spawn(d.from):(d&&d.x?d:w.spawn('home')); sc.player.x=sp.x; sc.player.y=sp.y; w.follow(sc.player,true); if(opts.enter)opts.enter(sc,d); },
  update:function(dt){ var I=Y.input,busy=(Y.npc&&Y.npc.isOpen())||(Y.hud&&Y.hud.blocking());
    sc.player.frozen=!!busy; sc.player.update(dt,I.held('moveX'),I.held('moveY'),w.solid);
    if(Y.npc)Y.npc.update(dt,sc.player); if(!busy){ var talked=Y.npc&&Y.npc.tryTalk(sc.player,I); if(!talked)w.checkEnter(sc.player,I); }
    w.follow(sc.player); if(opts.update)opts.update(sc,dt); },
  render:function(g){ var ds=[{y:sc.player.y,draw:function(g,ox,oy){sc.player.draw(g,ox,oy);}}]; if(Y.npc)ds=ds.concat(Y.npc.drawables()); w.render(g,ds);
    w.minimap(g,sc.player,Y.npc?Y.npc.list.map(function(n){return {x:n.x,y:n.y,col:n.col};}):[]); if(Y.npc)Y.npc.renderDialog(g); if(opts.render)opts.render(sc,g); if(Y.hud)Y.hud.render(g); } };
  return sc; };
Y.world=w;
})();
