/* YOUR NPCs + dialogue — B06 · PROPOSAL_HOLD.
   Sources: Y.O.U.R. slice npcTalk/say/renderDialog/advanceDialog (ALL Mara/Dex lines below are verbatim from the slice);
   Living WIR openNPC/updateRelation (relationship counter). Choice labels are "[TODO ...]" placeholders — no new story written.
   Sprites: Living WIR npc0/npc1 (64x64) as PLACEHOLDERS. PROPOSED: typewriter 40 chars/s, talk radius 56 px, wander speed 30 px/s. */
(function(){
'use strict';
var Y=window.YOUR=window.YOUR||{};
var CPS=40, TALK_R=56, WANDER=30; // PROPOSED
var DIALOG={
 mara:{
  intro:[{text:"Hey {name}! Welcome to the neighborhood. Dex needs help at the Corner Store, the skate park is open, coaches run practice at the Training Facility, and the Arena has a drone that needs a lesson."},
         {text:"Dodge its attacks, then hit it while it recovers. Button mashing wears you out.",choices:[{label:'[TODO choice A]',rel:1},{label:'[TODO choice B]',rel:0}]}],
  allDone:[{text:"You did all of it, {name}. Job, skating, practice and the arena. Go home and sleep, the neighborhood will remember."}]},
 dex:{
  intro:[{text:"Need a hand. Grab the 5 crates on the floor and stock the shelf on the left. $45 for the shift.",choices:[{label:'[TODO choice A]',rel:1},{label:'[TODO choice B]',rel:0}]}],
  progress:[{text:"Keep going, {left} crates left."}],
  done:[{text:"Thanks again! Come back tomorrow."}]}
};
var n={DIALOG:DIALOG,CPS:CPS,list:[],open:null,images:{}};
n.add=function(o){ var e={id:o.id,name:o.name,x:o.x,y:o.y,home:{x:o.x,y:o.y,r:o.r||48},col:o.col||'#ffd166',img:o.img||null,tx:o.x,ty:o.y,t:0,facing:1}; n.list.push(e); return e; };
n.setup=function(){ n.list=[]; var W=Y.world; var hm=W?W.spawn('home'):{x:200,y:300}, st=W?W.spawn('store'):{x:600,y:300};
  n.add({id:'mara',name:'Mara',x:hm.x+70,y:hm.y+20,col:'#ffd166',img:Y.core.assets.get('npc_mara')});  /* Y.O.U.R.: Mara near home */
  n.add({id:'dex',name:'Dex',x:st.x+60,y:st.y+20,col:'#7dffb0',img:Y.core.assets.get('npc_dex')}); };  /* Y.O.U.R.: Dex at the store */
n.scriptFor=function(id){ var f=(Y.profile&&Y.profile.data&&Y.profile.data.flags)||{};
  if(id==='mara')return (f.job&&f.skate&&f.football&&f.combat)?DIALOG.mara.allDone:DIALOG.mara.intro;
  if(id==='dex'){ if(f.job)return DIALOG.dex.done; if((f.storeCount||0)>0)return DIALOG.dex.progress; return DIALOG.dex.intro; } return [{text:'[TODO line]'}]; };
n.fill=function(t){ var d=(Y.profile&&Y.profile.data)||{}; return t.replace('{name}',d.name||'You').replace('{left}',5-((d.flags||{}).storeCount||0)); };
n.talk=function(id){ var e=n.list.filter(function(x){return x.id===id;})[0]; n.open={npc:id,name:e?e.name:id,lines:n.scriptFor(id),i:0,shown:0,sel:0,lastY:0}; n.open.full=n.fill(n.open.lines[0].text); return n.open; };
n.isOpen=function(){ return !!n.open; };
n.close=function(){ n.open=null; };
n.tryTalk=function(p,I){ if(n.open||!I.pressed('a'))return false; var best=null,bd=TALK_R; n.list.forEach(function(e){var d=Math.hypot(e.x-p.x,e.y-p.y); if(d<bd){bd=d;best=e;}}); if(best){n.talk(best.id); return true;} return false; };
n.choose=function(idx){ var o=n.open,L=o.lines[o.i],c=L.choices[idx]; if(Y.profile&&Y.profile.data){ var r=Y.profile.data.rel; r[o.npc]=(r[o.npc]||0)+(c.rel||0); Y.profile.event('rel',{npc:o.npc,d:c.rel||0}); Y.profile.save(); } n.next(); };
n.next=function(){ var o=n.open; o.i++; if(o.i>=o.lines.length){ n.close(); if(Y.profile&&Y.profile.data){ Y.profile.data.flags['talk_'+o.npc]=true; } return; } o.shown=0; o.sel=0; o.full=n.fill(o.lines[o.i].text); };
n.update=function(dt,p){ var I=Y.input,o=n.open;
  if(o){ o.shown=Math.min(o.full.length,o.shown+CPS*dt); var L=o.lines[o.i];
    var my=I.held('moveY'),dir=my>0.5?1:my<-0.5?-1:0; if(L.choices&&o.shown>=o.full.length&&dir!==0&&dir!==o.lastY)o.sel=(o.sel+dir+L.choices.length)%L.choices.length; o.lastY=dir;
    if(I.pressed('a')){ if(o.shown<o.full.length)o.shown=o.full.length; else if(L.choices)n.choose(o.sel); else n.next(); }
    return; }
  n.list.forEach(function(e){ e.t-=dt; if(e.t<=0){ e.t=1.5+Math.random()*2; var a=Math.random()*6.283,r=Math.random()*e.home.r; e.tx=e.home.x+Math.cos(a)*r; e.ty=e.home.y+Math.sin(a)*r; }
    var dx=e.tx-e.x,dy=e.ty-e.y,l=Math.hypot(dx,dy); if(l>2){ var s=Math.min(l,WANDER*dt); e.x+=dx/l*s; e.y+=dy/l*s; if(Math.abs(dx)>1)e.facing=dx<0?-1:1; } }); };
n.drawables=function(){ return n.list.map(function(e){ return {y:e.y,draw:function(g,ox,oy){ var x=e.x-ox,y=e.y-oy;
  g.fillStyle='rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(x,y,12,4,0,0,7); g.fill();
  if(e.img){ g.drawImage(e.img,Math.round(x-24),Math.round(y-46),48,48); } else { g.fillStyle=e.col; g.fillRect(x-9,y-38,18,30); g.beginPath(); g.arc(x,y-44,8,0,7); g.fill(); }
  g.font='bold 11px system-ui'; g.textAlign='center'; g.fillStyle='#000'; g.fillText(e.name,x+1,y-49); g.fillStyle=e.col; g.fillText(e.name,x,y-50); }}; }); };
n.renderDialog=function(g){ var o=n.open; if(!o)return; var W=Y.core.W,H=Y.core.H,bx=40,by=H-150,bw=W-80,bh=130;
  g.fillStyle='rgba(12,14,22,.92)'; g.fillRect(bx,by,bw,bh); g.strokeStyle='#ffd166'; g.lineWidth=2; g.strokeRect(bx,by,bw,bh);
  g.fillStyle='#ffd166'; g.font='bold 15px system-ui'; g.textAlign='left'; g.fillText(o.name,bx+14,by+22);
  g.fillStyle='#fff'; g.font='15px system-ui'; var txt=o.full.slice(0,Math.floor(o.shown)), words=txt.split(' '), line='', yy=by+46;
  words.forEach(function(wd){ if(g.measureText(line+wd).width>bw-28){ g.fillText(line,bx+14,yy); yy+=20; line=''; } line+=wd+' '; }); g.fillText(line,bx+14,yy);
  var L=o.lines[o.i]; if(L.choices&&o.shown>=o.full.length)L.choices.forEach(function(c,i){ g.fillStyle=i===o.sel?'#ffd166':'#aab'; g.fillText((i===o.sel?'▶ ':'  ')+c.label,bx+bw-260,by+60+i*22); });
  g.fillStyle='#889'; g.font='11px system-ui'; g.fillText('A: '+(o.shown<o.full.length?'skip':'next'),bx+bw-70,by+bh-10); };
Y.npc=n;
})();
