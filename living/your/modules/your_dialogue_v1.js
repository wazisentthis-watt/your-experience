/* YOUR dialogue v1 · PROPOSAL_HOLD — wires YOUR.llm into the B06 NPC dialogue box.
   - The verbatim Y.O.U.R. first line of Mara / Dex is kept the first time you meet them; every later line + all choices come from
     YOUR.llm (player-chosen provider) or its offline grammar. The old "[TODO choice A/B]" placeholders are gone.
   - Choice effects go through a whitelist executor (rel ±1, hint, remember, story-gated challenge) — never money / energy / XP.
   - After a choice, the NPC replies with one more line (mode 'reply'), then the box closes. Memory of each talk is saved in the profile.
   - Portraits: ChatGPT slots (08 Mara, 09 Dex, 14 Sikee) when present; else Living WIR sprite (Mara/Dex) or Sikee owner-art cut. */
(function(){
var Y=window.YOUR=window.YOUR||{}, n=Y.npc;
if(!n)return;
var REL_MIN=-5, REL_MAX=10;
var d={pending:0,lastTurn:null,applied:[]};
function P(){ return Y.profile.data; }
d.applyEffect=function(npc,ef){ ef=ef||{type:'none'}; var p=P(),r=p.rel=p.rel||{};
  switch(ef.type){
   case 'rel_up': r[npc]=Math.min(REL_MAX,(r[npc]||0)+1); break;
   case 'rel_down': r[npc]=Math.max(REL_MIN,(r[npc]||0)-1); break;
   case 'hint': p.flags.hint=ef.value; if(Y.hud)Y.hud.toast('Hint: '+({job:'Corner Store',skate:'Skate park',football:'Training Facility',arena:'Arena',sleep:'Home — sleep'}[ef.value]||ef.value)); break;
   case 'remember': break;
   case 'challenge': if(npc==='sikee'&&p.story&&p.story.droneBeaten){ p.story.challenge=true; if(Y.hud)Y.hud.toast('SIKEE accepts. Go to the Arena.'); } else ef={type:'none'}; break;
   default: ef={type:'none'}; }
  d.applied.push({npc:npc,type:ef.type,value:ef.value}); Y.profile.event('talk',{npc:npc,d:ef.type==='rel_up'?1:ef.type==='rel_down'?-1:0,effect:ef.type}); return ef; };
function lineFrom(turn){ return {text:turn.line,choices:(turn.choices||[]).map(function(c){ return {label:c.label,effect:c.effect,rel:c.effect&&c.effect.type==='rel_up'?1:0}; }),source:turn.source,provider:turn.provider}; }
function request(o,opts,slot){ d.pending++; return Y.llm.converse(o.npc,opts).then(function(turn){ d.pending--; d.lastTurn=turn; if(n.open!==o)return;
    var L=lineFrom(turn); o.lines[slot]=L; if(o.i===slot){ o.full=n.fill(L.text); o.shown=0; o.sel=0; } }); }
n.talk=function(id){ var e=n.list.filter(function(x){return x.id===id;})[0], p=P(), first=!(p.flags['met_'+id]||(p.memory&&p.memory[id]&&p.memory[id].length));
  var lines=[]; if(first&&n.DIALOG[id]){ var intro=id==='mara'?n.DIALOG.mara.intro[0]:n.DIALOG.dex.intro[0]; lines.push({text:intro.text,verbatim:true}); }
  lines.push({text:'…',pending:true});
  n.open={npc:id,name:e?e.name:(Y.llm.SHEETS[id]||{}).name||id,lines:lines,i:0,shown:0,sel:0,lastY:0}; n.open.full=n.fill(lines[0].text);
  p.flags['met_'+id]=true; request(n.open,{},lines.length-1); return n.open; };
n.choose=function(idx){ var o=n.open,L=o.lines[o.i],c=L.choices[idx]; var ef=d.applyEffect(o.npc,c.effect);
  Y.llm.remember(o.npc,{d:P().day,line:L.text,chose:c.label,note:ef.type==='remember'?ef.value:undefined}); Y.profile.save();
  o.lines.push({text:'…',pending:true}); var slot=o.lines.length-1; o.i=slot; o.shown=0; o.sel=0; o.full='…'; request(o,{mode:'reply',choice:c.label,effect:ef},slot); };
var _next=n.next;
n.next=function(){ var o=n.open; if(!o)return; var L=o.lines[o.i]; if(L&&L.pending)return; _next(); };
var _update=n.update;
n.update=function(dt,p){ var o=n.open; if(o){ var L=o.lines[o.i]; if(L&&L.pending){ o.shown=o.full.length; return; } } return _update(dt,p); };
n.portrait=function(id){ var A=Y.art, slot={mara:'mara',dex:'dex',sikee:'sikee_portrait'}[id]; if(A&&slot&&A.get(slot))return {img:A.get(slot),src:'chatgpt'};
  if(id==='sikee')return {img:Y.core.assets.get('sikee_front'),src:'owner-art'}; var e=n.list.filter(function(x){return x.id===id;})[0]; return {img:e&&e.img,src:'livingwir'}; };
var _render=n.renderDialog;
n.renderDialog=function(g){ var o=n.open; if(!o)return; _render(g); var W=Y.core.W,H=Y.core.H,bx=40,by=H-150, pt=n.portrait(o.npc);
  if(pt.img){ var ph=120,s=ph/pt.img.height,pw=Math.min(120,pt.img.width*s); g.save(); g.fillStyle='rgba(12,14,22,.92)'; g.fillRect(bx,by-128,128,124); g.strokeStyle=o.npc==='sikee'?'#d6963c':'#ffd166'; g.lineWidth=2; g.strokeRect(bx,by-128,128,124);
    g.drawImage(pt.img,bx+4+(120-pw)/2,by-126,pw,ph); g.restore(); }
  var L=o.lines[o.i]; g.save(); g.font='10px system-ui'; g.textAlign='right'; g.fillStyle='#778';
  g.fillText(L&&L.pending?'thinking…':(L&&L.verbatim?'Y.O.U.R. line':(L&&L.source==='llm'?'AI · '+(L.provider||''):'offline dialogue')),W-50,by+14); g.restore(); };
/* Sikee as a world NPC (story beats decide when he is present) */
n.addSikee=function(x,y){ n.removeSikee(); var e=n.add({id:'sikee',name:'SIKEE',x:x,y:y,r:0,col:'#d6963c'}); e.sheetKey='sikee'; e.face='down'; return e; };
n.removeSikee=function(){ n.list=n.list.filter(function(e){return e.id!=='sikee';}); };
var _draw=n.drawables;
n.drawables=function(){ var ds=_draw(); n.list.forEach(function(e,i){ if(!e.sheetKey)return; ds[i]={y:e.y,draw:function(g,ox,oy){ var sh=e._sheet||(e._sheet=Y.SpriteSheet.fromConfig(e.sheetKey));
      g.fillStyle='rgba(0,0,0,.3)'; g.beginPath(); g.ellipse(e.x-ox,e.y-oy,16,5,0,0,7); g.fill(); sh.draw(g,'idle_'+(e.face||'down'),Y.core.stats.t,e.x-ox,e.y-oy);
      g.font='bold 11px system-ui'; g.textAlign='center'; g.fillStyle='#000'; g.fillText(e.name,e.x-ox+1,e.y-oy-77); g.fillStyle=e.col; g.fillText(e.name,e.x-ox,e.y-oy-78); }}; }); return ds; };
Y.dialogue=d;
})();
