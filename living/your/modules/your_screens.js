/* YOUR screens v1 · PROPOSAL_HOLD — title, main menu, settings (+ Dialogue-AI provider setup), credits, results, home, sleep / day-end,
   Sikee boss intro, field + arena menus, town map. Every screen draws its ChatGPT art slot when present (01 title, 02 menu bg, 03 panel,
   04 map, 12 hub, 13 sleep, 17 boss intro) and a labelled drawn placeholder otherwise. Keyboard (WASD/arrows + J/Enter, K/Esc back),
   gamepad and mouse/touch (click an item) all work. */
(function(){
var Y=window.YOUR=window.YOUR||{}, A=Y.art;
var S={formOpen:false,last:{}};
function P(){ return Y.profile.data; }
function txt(g,t,x,y,font,col,align){ g.font=font; g.fillStyle=col; g.textAlign=align||'center'; g.fillText(t,x,y); }
function wrapTxt(g,t,x,y,w,lh,font,col){ g.font=font; g.fillStyle=col; g.textAlign='center'; var words=String(t).split(' '),line='',n=0; words.forEach(function(wd){ var tr=line?line+' '+wd:wd; if(g.measureText(tr).width>w&&line){ g.fillText(line,x,y+n*lh); n++; line=wd; } else line=tr; }); g.fillText(line,x,y+n*lh); return n+1; }
function bg(g,slot,fallback){ if(!A.cover(g,slot,0,0,960,540)){ fallback(g); A.placeholderTag(g,slot,12,530); } }
function sky(g,top,bot){ var gr=g.createLinearGradient(0,0,0,540); gr.addColorStop(0,top); gr.addColorStop(1,bot); g.fillStyle=gr; g.fillRect(0,0,960,540); }
/* ---------- generic menu scene ---------- */
S.menu=function(name,o){ var sc={name:name,sel:0,lastY:0,items:[],rects:[],o:o};
  sc.enter=function(d){ sc.data=d||{}; sc.sel=0; sc.lastY=0; sc.items=(typeof o.items==='function'?o.items(sc.data):o.items).filter(function(it){return !it.hidden;}); if(o.enter)o.enter(sc,sc.data); };
  sc.exit=function(){ if(o.exit)o.exit(sc); };
  sc.choose=function(i){ var it=sc.items[i]; if(!it||it.disabled)return; if(Y.audio)Y.audio.sfx('menu'); it.go(sc); };
  sc.update=function(dt){ if(S.formOpen)return; var I=Y.input, my=I.held('moveY'), dir=my>0.5?1:my<-0.5?-1:0, mx=I.held('moveX'), dx=mx>0.5?1:mx<-0.5?-1:0;
    if(dir&&dir!==sc.lastY){ sc.sel=(sc.sel+dir+sc.items.length)%sc.items.length; } sc.lastY=dir;
    var it=sc.items[sc.sel]; if(it&&it.adjust&&dx&&dx!==sc.lastX)it.adjust(dx); sc.lastX=dx;
    if(I.pressed('a'))sc.choose(sc.sel); else if(I.pressed('b')&&o.back)o.back(sc); if(o.update)o.update(sc,dt); };
  sc.click=function(x,y){ for(var i=0;i<sc.rects.length;i++){ var r=sc.rects[i]; if(x>=r.x&&x<=r.x+r.w&&y>=r.y&&y<=r.y+r.h){ sc.sel=i; sc.choose(i); return true; } } return false; };
  sc.render=function(g){ o.draw(g,sc); var L=o.layout||{x:330,y:250,w:300,h:42,gap:10,panel:true}; var n=sc.items.length, ph=n*(L.h+L.gap)+30;
    if(L.panel)A.panel(g,L.x-20,L.y-20,L.w+40,ph+10); sc.rects=[];
    sc.items.forEach(function(it,i){ var y=L.y+i*(L.h+L.gap), on=i===sc.sel; sc.rects.push({x:L.x,y:y,w:L.w,h:L.h});
      g.fillStyle=on?'rgba(46,196,182,.92)':'rgba(255,255,255,.08)'; A.roundRect(g,L.x,y,L.w,L.h,10); g.fill();
      txt(g,(typeof it.label==='function'?it.label():it.label),L.x+L.w/2,y+L.h/2+6,'bold 17px system-ui',it.disabled?'#667':on?'#062':'#eef'); });
    if(o.after)o.after(g,sc); if(Y.hud&&o.hud)Y.hud.render(g); };
  if(Y.core)Y.core.scene.register(name,sc); return sc; };
/* ---------- title ---------- */
S.titleMode=function(){ var p=Y.profile&&Y.profile.data, s=p&&p.settings||S.last.settings||{}; var v=s.titleArt||(function(){ try{ return localStorage.getItem('your-title-art'); }catch(e){ return null; } })(); return v||Y.config.titleArt||'classic'; };
var T={name:'title',t:0};
T.enter=function(){ T.t=0; }; T.exit=function(){};
T.update=function(dt){ T.t+=dt; if(Y.input.pressed('a')||Y.input.pressed('pause')){ if(Y.audio)Y.audio.sfx('menu'); Y.core.scene.go('menu'); } };
T.click=function(){ Y.core.scene.go('menu'); return true; };
T.render=function(g){ if(S.titleMode()==='cover'&&A.get('cover')){ A.cover(g,'title',0,0,960,540); g.fillStyle='rgba(6,8,14,.62)'; g.fillRect(0,0,960,540); A.contain(g,'cover',300,0,360,540); txt(g,'cover: ChatGPT 21 · classic title (01) in Settings',948,516,'10px system-ui','rgba(255,255,255,.55)','right'); }
  else bg(g,'title',function(g){ sky(g,'#f6a35b','#3b2a4a'); var m=Y.core.assets.get('hero_portrait')||Y.core.assets.get('mella_portrait'); if(m)g.drawImage(m,330,170,300,300);
    txt(g,'Y.O.U.R.',480,130,'900 84px system-ui','#2ec4b6'); });
  var a=0.55+0.45*Math.sin(T.t*3); g.save(); g.globalAlpha=a; txt(g,'Press A · Enter · Click to start',480,505,'bold 20px system-ui','#fff'); g.restore();
  txt(g,'PROPOSAL_HOLD · v1',948,530,'11px system-ui','rgba(255,255,255,.6)','right'); };
Y.core.scene.register('title',T);
/* ---------- main menu ---------- */
S.menu('menu',{layout:{x:330,y:196,w:300,h:42,gap:10,panel:true},
  items:function(){ return [{label:'New Game',go:function(){ Y.game.newGame(); }},{label:'Continue',disabled:!Y.game.hasSave(),go:function(){ Y.game.continueGame(); }},
    {label:'Settings',go:function(){ Y.core.scene.go('settings',{back:'menu'}); }},{label:'Cover',hidden:!A.get('cover'),go:function(){ Y.core.scene.go('cover'); }},{label:'Credits',go:function(){ Y.core.scene.go('credits'); }}]; },
  back:function(){ Y.core.scene.go('title'); },
  draw:function(g){ bg(g,'menu_bg',function(g){ sky(g,'#88b7d5','#38506b'); }); txt(g,'Y.O.U.R.',480,140,'900 56px system-ui','#fff'); txt(g,(window.WIR_HERO?WIR_HERO.get().name:'Hero')+' · the neighborhood',480,172,'16px system-ui','#e8f6f4'); }});
/* ---------- settings (+ LLM provider form) ---------- */
function settings(){ var p=Y.profile&&Y.profile.data; return p?(p.settings=p.settings||{}):(S.last.settings=S.last.settings||{}); }
S.menu('settings',{layout:{x:270,y:132,w:420,h:38,gap:8,panel:true},
  items:function(d){ return [
    {label:function(){ return 'Volume  ◀ '+Math.round((Y.audio?Y.audio.master:1)*100)+'% ▶'; },adjust:function(dx){ if(Y.audio)Y.audio.setVolume(Math.round((Y.audio.master+dx*0.1)*10)/10); },go:function(){}},
    {label:function(){ return 'Sound: '+(Y.audio&&Y.audio.muted?'OFF':'ON'); },go:function(){ if(Y.audio)Y.audio.toggleMute(); }},
    {label:function(){ return 'Reality (FaFiFi)  ◀ '+Y.fafifi.reality()+' ▶'; },adjust:function(dx){ var s=settings(); s.reality=Math.max(0,Math.min(100,Y.fafifi.reality()+dx*5)); if(Y.profile.data)Y.profile.save(); },go:function(){}},
    {label:function(){ var s=Y.llm.settings(); return 'Dialogue AI: '+(s.provider==='offline'?'Offline (built-in)':(Y.llm.providers[s.provider]||{}).label||s.provider); },go:function(){ S.openLLMForm(); }},
    {label:function(){ return 'Hero: '+(window.WIR_HERO?WIR_HERO.get().name:'Hero')+'  (name · export · import)'; },go:function(){ S.openHeroForm(); }},
    {label:function(){ return 'Title art: '+(S.titleMode()==='cover'?'Cover (21)':'Classic (01)'); },go:function(){ var v=S.titleMode()==='cover'?'classic':'cover'; try{ localStorage.setItem('your-title-art',v); }catch(e){} var st=settings(); st.titleArt=v; if(Y.profile.data)Y.profile.save(); }},
    {label:'Back',go:function(sc){ Y.core.scene.go(sc.data.back||'menu',sc.data.backData||{}); }}]; },
  back:function(sc){ Y.core.scene.go(sc.data.back||'menu',sc.data.backData||{}); },
  draw:function(g){ bg(g,'menu_bg',function(g){ sky(g,'#506a84','#1d2733'); }); txt(g,'Settings',480,100,'800 34px system-ui','#fff');
    txt(g,'Reality ≥ 75 turns on FaFiFi Perfect 30 in every activity. Lower Reality shows more route hints.',480,500,'13px system-ui','#e8f6f4'); }});
S.openLLMForm=function(){ S.closeLLMForm(); var s=Y.llm.settings(), st=Y.core.canvas.parentElement||document.body, f=document.createElement('div'); f.id='your-llm-form';
  f.style.cssText='position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);z-index:20;background:#0e121c;color:#e8f6f4;border:2px solid #2ec4b6;border-radius:14px;padding:18px 20px;width:min(520px,92%);font:14px system-ui;box-shadow:0 8px 40px rgba(0,0,0,.6)';
  var opts=['offline'].concat(Object.keys(Y.llm.providers).filter(function(k){return k!=='mock'||s.provider==='mock';})).map(function(k){ return '<option value="'+k+'"'+(k===s.provider?' selected':'')+'>'+(k==='offline'?'Offline (built-in, no network)':(Y.llm.providers[k].label||k))+'</option>'; }).join('');
  f.innerHTML='<div style="font:700 18px system-ui;margin-bottom:8px">Dialogue AI provider</div>'+
   '<label>Provider<br><select id="llm-provider" style="width:100%;padding:6px">'+opts+'</select></label><br><br>'+
   '<label>Base URL (optional)<br><input id="llm-base" style="width:100%;padding:6px" placeholder="e.g. https://api.openai.com/v1 · http://localhost:11434"></label><br><br>'+
   '<label>Model<br><input id="llm-model" style="width:100%;padding:6px" placeholder="your model id"></label><br><br>'+
   '<label>API key (stays in this browser only)<br><input id="llm-key" type="password" autocomplete="off" style="width:100%;padding:6px"></label>'+
   '<div style="font-size:12px;color:#9ab;margin:8px 0">Key is saved to this browser\'s localStorage and sent only to the endpoint above. It is never written into game files. Offline dialogue is used whenever the AI is unavailable or replies outside the rules.</div>'+
   '<div id="llm-status" style="min-height:18px;color:#ffd166;font-size:12px"></div>'+
   '<div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap"><button data-k="save">Save</button><button data-k="test">Test</button><button data-k="clear">Clear key</button><button data-k="close">Close</button></div>';
  st.appendChild(f); f.querySelector('#llm-base').value=s.baseUrl; f.querySelector('#llm-model').value=s.model; f.querySelector('#llm-key').value=s.apiKey;
  Array.prototype.forEach.call(f.querySelectorAll('button'),function(b){ b.style.cssText='padding:7px 14px;border-radius:8px;border:0;background:#2ec4b6;color:#062;font-weight:700;cursor:pointer'; });
  var read=function(){ return {provider:f.querySelector('#llm-provider').value,baseUrl:f.querySelector('#llm-base').value,model:f.querySelector('#llm-model').value,apiKey:f.querySelector('#llm-key').value}; }, status=f.querySelector('#llm-status');
  f.addEventListener('keydown',function(e){ e.stopPropagation(); }); f.addEventListener('keyup',function(e){ e.stopPropagation(); });
  f.addEventListener('click',function(e){ var b=e.target.closest('button'); if(!b)return; var k=b.dataset.k;
    if(k==='save'){ Y.llm.save(read()); status.textContent='Saved.'; }
    else if(k==='test'){ Y.llm.save(read()); status.textContent='Testing…'; Y.llm.test().then(function(r){ status.textContent=r.ok?'OK — provider replied within the dialogue rules.':'Not working: '+(r.error||'invalid reply')+' (offline dialogue will be used).'; }); }
    else if(k==='clear'){ Y.llm.clearKey(); f.querySelector('#llm-key').value=''; status.textContent='Key removed from this browser.'; }
    else if(k==='close')S.closeLLMForm(); });
  S.formOpen=true; return f; };
S.openHeroForm=function(){ S.closeLLMForm(); var H=window.WIR_HERO, h=H.get(), st=Y.core.canvas.parentElement||document.body, f=document.createElement('div'); f.id='your-llm-form'; f.dataset.kind='hero';
  f.style.cssText='position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);z-index:20;background:#0e121c;color:#e8f6f4;border:2px solid #2ec4b6;border-radius:14px;padding:18px 20px;width:min(520px,92%);font:14px system-ui;box-shadow:0 8px 40px rgba(0,0,0,.6)';
  f.innerHTML='<div style="font:700 18px system-ui;margin-bottom:8px">Shared hero (all WIR games)</div>'+
   '<label>Hero name<br><input id="hero-name" maxlength="22" style="width:100%;padding:6px"></label>'+
   '<div style="font-size:12px;color:#9ab;margin:6px 0">Look: <b id="hero-look"></b> · Level <b id="hero-lvl"></b> · Unlocks <b id="hero-unl"></b><br>Saved in this browser under <code>'+H.KEY+'</code>. Other WIR games read the same hero. Use Export / Import to move it to another device or game page.</div>'+
   '<textarea id="hero-json" rows="5" style="width:100%;font:11px monospace" placeholder="Paste exported hero JSON here, then Import"></textarea>'+
   '<div id="hero-status" style="min-height:18px;color:#ffd166;font-size:12px"></div>'+
   '<div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap"><button data-k="save">Save name</button><button data-k="export">Export</button><button data-k="import">Import</button><button data-k="close">Close</button></div>';
  st.appendChild(f); var fill=function(){ var h=H.get(); f.querySelector('#hero-name').value=h.name; f.querySelector('#hero-look').textContent=h.lookId; f.querySelector('#hero-lvl').textContent=h.level; f.querySelector('#hero-unl').textContent=h.unlocks.length; }; fill();
  Array.prototype.forEach.call(f.querySelectorAll('button'),function(b){ b.style.cssText='padding:7px 14px;border-radius:8px;border:0;background:#2ec4b6;color:#062;font-weight:700;cursor:pointer'; });
  var status=f.querySelector('#hero-status'); f.addEventListener('keydown',function(e){ e.stopPropagation(); }); f.addEventListener('keyup',function(e){ e.stopPropagation(); });
  f.addEventListener('click',function(e){ var b=e.target.closest('button'); if(!b)return; var k=b.dataset.k;
    if(k==='save'){ var n=H.setName(f.querySelector('#hero-name').value); if(Y.profile.data){ Y.profile.data.name=n; Y.profile.save(); } fill(); status.textContent='Hero name saved: '+n; }
    else if(k==='export'){ var j=H.export(); f.querySelector('#hero-json').value=j; try{ var a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([j],{type:'application/json'})); a.download='wir_hero_profile.json'; a.click(); setTimeout(function(){ URL.revokeObjectURL(a.href); },1000); }catch(_){} status.textContent='Exported (also shown above).'; }
    else if(k==='import'){ var r=H.import(f.querySelector('#hero-json').value); if(r.ok){ if(Y.profile.data){ Y.profile.data.name=r.profile.name; Y.profile.save(); } fill(); status.textContent='Imported hero: '+r.profile.name; } else status.textContent='Import failed: '+r.error; }
    else if(k==='close')S.closeLLMForm(); });
  S.formOpen=true; return f; };
S.closeLLMForm=function(){ var f=document.getElementById('your-llm-form'); if(f)f.parentNode.removeChild(f); S.formOpen=false; };
/* ---------- cover (ChatGPT 21) ---------- */
S.menu('cover',{layout:{x:700,y:470,w:200,h:40,gap:8,panel:false},items:[{label:'Back',go:function(){ Y.core.scene.go('menu'); }}],back:function(){ Y.core.scene.go('menu'); },
  draw:function(g){ sky(g,'#10141e','#05070b'); if(!A.contain(g,'cover',0,0,960,540)){ txt(g,'Cover art (21) not added yet',480,270,'18px system-ui','#fff'); A.placeholderTag(g,'cover',12,530); } txt(g,'Official cover · ChatGPT 21',948,24,'11px system-ui','rgba(255,255,255,.6)','right'); }});
/* ---------- credits ---------- */
S.menu('credits',{layout:{x:380,y:440,w:200,h:40,gap:8,panel:false},items:[{label:'Back',go:function(){ Y.core.scene.go('menu'); }}],back:function(){ Y.core.scene.go('menu'); },
  draw:function(g){ sky(g,'#1d2733','#0b0f16'); A.panel(g,120,50,720,370); txt(g,'Credits & sources (PROPOSAL_HOLD)',480,90,'800 22px system-ui','#ffd166');
    ['Hero — the owner\'s likeness: ChatGPT 18 portrait, 19 walk, 20 fight, 21 cover. Skate / KO / cast poses are FALLBACK transforms.','Mella (companion) — WIR: The Third Door studio frames.','SIKEE (Authority Form) — owner design sheet; in-game frames derived from it; ChatGPT sheets 15/16 when present.',
     'Screens & props — ChatGPT images 01–17 (your-art/chatgpt), drawn placeholders otherwise.','Football — Elemental Gridiron v44 (copy, bridged). Skate physics — RIFFT. Season — PHATOM Fusion hub.',
     'Mara/Dex first lines — Y.O.U.R. slice. NPCs — Living WIR. Drone AI — Y.O.U.R. FaFiFi — rulebook §5 + OWNER-DELEGATED DESIGN v1.',
     'All story text for SIKEE is PROPOSED. Nothing here is published.'].forEach(function(l,i){ txt(g,l,480,130+i*44,'14px system-ui','#e8f6f4'); }); }});
/* ---------- results ---------- */
var NAMES={job:'Corner Store shift',skate:'Skate run',football:'Elemental Gridiron',arena:'Arena'};
S.menu('results',{layout:{x:380,y:452,w:200,h:42,gap:8,panel:false},items:[{label:'Continue',go:function(sc){ Y.game.afterResults(sc.data); }}],back:function(sc){ Y.game.afterResults(sc.data); },
  enter:function(sc,d){ sc.line=null; if(d.act==='arena'&&d.boss)Y.llm.converse('sikee',{mode:'reply',choice:d.result==='win'?'(the hero '+P().name+' just defeated you in the Arena)':'(the hero '+P().name+' just lost to you in the Arena)'}).then(function(t){ sc.line=t; }); },
  draw:function(g,sc){ var d=sc.data; bg(g,d.act==='arena'&&d.boss&&A.get('sikee_intro')?'sikee_intro':'menu_bg',function(g){ sky(g,'#24324a','#0d121c'); });
    A.panel(g,180,40,600,400); var win=d.result==='win'||d.result==='done'||d.result==='complete';
    txt(g,(NAMES[d.act]||d.act).toUpperCase(),480,82,'800 22px system-ui','#9ef0e6'); txt(g,(d.boss?'SIKEE — ':'')+String(d.result||'').toUpperCase(),480,120,'900 34px system-ui',win?'#ffd166':'#ff8a8a');
    var lines=['Paid: $'+(d.paid||0)+'   ·   Money: $'+P().money+'   ·   Energy: '+Math.round(P().energy)+'/100'];
    if(d.eg&&!d.eg.forfeit)lines.push(d.eg.team+' '+d.eg.us+' – '+d.eg.them+' '+d.eg.opp+'   (TDs '+d.eg.stats.tds+', yds '+d.eg.stats.yds+', sacks '+d.eg.stats.sacks+', INT '+d.eg.stats.ints+')');
    if(d.count!=null)lines.push('Crates stocked: '+d.count+'/5'); if(d.rings!=null)lines.push('Rings: '+d.rings+'/8   ·   Score: '+(d.score||0));
    if(d.fair)lines.push('FaFiFi: '+d.fair.equity,'Route Attack: '+(d.fair.route||'—')+'   ·   Perfect 30: '+d.fair.meter+'/30   ·   road d='+d.fair.d);
    var wk=Y.hub&&Y.hub.state?Y.hub.state():null; if(wk)lines.push('Season: week '+(wk.week+1)+'   ·   rival '+wk.rival+(wk.buff?'   ·   buff +'+Math.round(wk.buff.val*100)+'% '+wk.buff.kind:''));
    lines.forEach(function(l,i){ txt(g,l,480,168+i*28,'15px system-ui','#e8f6f4'); });
    if(sc.line){ txt(g,'SIKEE: “'+sc.line.line+'”',480,410,'italic 14px system-ui','#d6963c'); } }});
/* ---------- home ---------- */
S.menu('home',{layout:{x:330,y:150,w:300,h:42,gap:10,panel:true},
  items:[{label:'Sleep (end day)',go:function(){ Y.core.scene.go('sleep',{mode:'bed'}); }},{label:'Season board',go:function(){ Y.core.scene.go('hub'); }},{label:'Town map',go:function(){ Y.core.scene.go('townmap'); }},
    {label:'Journal',go:function(){ Y.core.scene.go('world',{from:'home'}); Y.hud.toggleJournal(); }},{label:'Save game',go:function(){ Y.profile.save(); Y.hud.toast('Saved'); }},{label:'Settings',go:function(){ Y.core.scene.go('settings',{back:'home'}); }},{label:'Leave',go:function(){ Y.core.scene.go('world',{from:'home'}); }}],
  back:function(){ Y.core.scene.go('world',{from:'home'}); },hud:true,
  draw:function(g){ bg(g,'sleep_bg',function(g){ sky(g,'#3b3155','#15111f'); }); g.fillStyle='rgba(0,0,0,.35)'; g.fillRect(0,0,960,540); txt(g,'Home',480,120,'800 30px system-ui','#fff'); }});
/* ---------- sleep / day end ---------- */
S.menu('sleep',{layout:{x:380,y:440,w:200,h:42,gap:8,panel:false},
  items:function(d){ return [{label:d.mode==='bed'?'Sleep':'Wake up',go:function(sc){ if(sc.data.mode==='bed')Y.day.sleep('bed'); Y.core.scene.go('world',{from:'home'}); }},{label:'Back',hidden:d.mode!=='bed',go:function(){ Y.core.scene.go('home'); }}]; },
  enter:function(sc,d){ var t=P().today||{}; sc.sum={day:d.mode==='bed'?P().day:P().day-1,earned:t.earned||0,acts:(t.acts||[]).slice(),forced:d.mode!=='bed'?d.mode:null}; if(d.mode!=='bed')P().today={day:P().day,earned:0,acts:[]}; },
  draw:function(g,sc){ bg(g,'sleep_bg',function(g){ sky(g,'#1b2140','#06070d'); g.fillStyle='#fff'; for(var i=0;i<60;i++)g.fillRect((i*157)%960,(i*89)%300,2,2); });
    A.panel(g,250,90,460,320); var s=sc.sum; txt(g,'Day '+s.day+' — '+(s.forced?(s.forced==='midnight'?'midnight, you fell asleep':'out of energy, you passed out'):'good night'),480,135,'800 20px system-ui','#ffd166');
    txt(g,'Earned today: $'+s.earned,480,180,'16px system-ui','#e8f6f4'); var nl=wrapTxt(g,'Done: '+(s.acts.length?s.acts.join(', '):'nothing'),480,210,420,20,'15px system-ui','#e8f6f4');
    var wk=Y.hub.current(), y2=210+nl*20+10; txt(g,'Next on the season board: '+(wk?wk.part+' vs '+wk.vs+' (week '+(Y.hub.state().week+1)+')':'season complete'),480,y2,'15px system-ui','#e8f6f4');
    txt(g,'Sleeping restores HP, stamina and energy and saves the game.',480,y2+40,'13px system-ui','#9ab'); }});
/* ---------- town map (ChatGPT 04) ---------- */
S.menu('townmap',{layout:{x:380,y:470,w:200,h:40,gap:8,panel:false},items:[{label:'Back',go:function(){ Y.core.scene.go('home'); }}],back:function(){ Y.core.scene.go('home'); },
  draw:function(g){ if(!A.contain(g,'map',0,0,960,460)){ sky(g,'#2d4a3a','#1a2a22'); Y.world.minimap&&txt(g,'Town map art not added yet',480,240,'18px system-ui','#fff'); A.placeholderTag(g,'map',12,530); } }});
/* ---------- field + arena menus ---------- */
S.menu('field_menu',{layout:{x:290,y:200,w:380,h:46,gap:12,panel:true},
  items:[{label:'Play Elemental Gridiron (full game)',go:function(){ Y.core.scene.go('football_eg'); }},{label:'Practice drill (B10 fallback)',go:function(){ if(Y.day.start('football'))Y.core.scene.go('football',{free:true}); else Y.core.scene.go('world',{from:'field'}); }},{label:'Leave',go:function(){ Y.core.scene.go('world',{from:'field'}); }}],
  back:function(){ Y.core.scene.go('world',{from:'field'}); },hud:true,
  draw:function(g){ sky(g,'#2e6b3a','#10261a'); g.strokeStyle='rgba(255,255,255,.25)'; for(var i=0;i<12;i++){ g.beginPath(); g.moveTo(0,40+i*45); g.lineTo(960,40+i*45); g.stroke(); } txt(g,'Training Facility',480,140,'800 30px system-ui','#fff'); }});
S.menu('arena_menu',{layout:{x:310,y:210,w:340,h:46,gap:12,panel:true},
  items:function(){ var s=P().story||{}; return [{label:'Training Drone',go:function(){ Y.core.scene.go('arena'); }},{label:s.droneBeaten?'Face SIKEE':'SIKEE (beat the drone first)',disabled:!s.droneBeaten,go:function(){ Y.core.scene.go('boss_intro'); }},{label:'Leave',go:function(){ Y.core.scene.go('world',{from:'arena'}); }}]; },
  back:function(){ Y.core.scene.go('world',{from:'arena'}); },hud:true,
  draw:function(g){ bg(g,'sikee_intro',function(g){ sky(g,'#3a2433','#120b12'); }); g.fillStyle='rgba(0,0,0,.45)'; g.fillRect(0,0,960,540); txt(g,'The Arena',480,150,'800 30px system-ui','#fff'); }});
/* ---------- Sikee boss intro ---------- */
S.menu('boss_intro',{layout:{x:380,y:430,w:200,h:40,gap:8,panel:false},
  items:[{label:'Fight',go:function(){ Y.core.scene.go('arena',{boss:'sikee'}); }},{label:'Not yet',go:function(){ Y.core.scene.go('world',{from:'arena'}); }}],
  back:function(){ Y.core.scene.go('world',{from:'arena'}); },
  enter:function(sc){ sc.line=null; Y.llm.converse('sikee',{mode:'reply',choice:'(the hero '+P().name+' stepped into the Arena to challenge you)'}).then(function(t){ sc.line=t; }); },
  draw:function(g,sc){ bg(g,'sikee_intro',function(g){ sky(g,'#5a2f2a','#0d0708'); var s=Y.core.assets.get('sikee_front'); if(s){ var h=420,w=s.width*h/s.height; g.drawImage(s,480-w/2,20,w,h); } });
    g.fillStyle='rgba(0,0,0,.55)'; g.fillRect(0,330,960,90); txt(g,'SIKEE — Authority Form',480,362,'900 26px system-ui','#d6963c');
    txt(g,sc.line?'“'+sc.line.line+'”':'…',480,396,'italic 16px system-ui','#f2e6d6'); txt(g,'story text: PROPOSED',948,530,'10px system-ui','rgba(255,255,255,.5)','right'); }});
Y.screens=S;
})();
