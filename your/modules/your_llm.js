/* YOUR LLM dialogue · PROPOSAL_HOLD — provider-pluggable NPC dialogue with a strict schema and an offline engine.
   Providers (chosen by the PLAYER at runtime in Settings → Dialogue AI; nothing is configured in shipped files):
     offline   – built-in state-aware grammar (default, no network)
     openai    – any OpenAI-compatible POST {baseUrl}/chat/completions (OpenAI, OpenRouter, LM Studio, vLLM, llama.cpp server …)
     anthropic – POST {baseUrl|https://api.anthropic.com}/v1/messages (browser access header set)
     ollama    – POST {baseUrl|http://localhost:11434}/api/chat (stream:false, format:json)
     webllm    – in-browser engine if the player loaded one (window.YOUR_WEBLLM_ENGINE with chat.completions.create)
     (+ YOUR.llm.registerProvider(id,impl) for anything else; QA registers 'mock')
   API key: stored ONLY in this browser's localStorage ("your-llm-settings"), sent only to the endpoint the player typed.
   Output schema (validated; anything else → offline fallback):
     {"line": string ≤ 220 chars, "choices": [ {"label": string ≤ 48, "effect": {"type": EFFECT, "value"?: …}} ×2–3 ], "mood"?: string}
     EFFECT whitelist: none | rel_up | rel_down | hint (value ∈ job,skate,football,arena,sleep) | remember (value ≤ 60 chars) | challenge (Sikee only, story-gated)
     → the model can never touch money, energy, XP, items or flags outside this list.
   Story/character text for Sikee is PROPOSED (no lore beyond "Authority Form"). Mara/Dex facts come from the Y.O.U.R. slice lines. */
(function(){
var Y=window.YOUR=window.YOUR||{};
var KEY='your-llm-settings', ACTS=['job','skate','football','arena','sleep'];
var EFFECTS=['none','rel_up','rel_down','hint','remember','challenge'];
var LIM={line:220,label:48,remember:60,choicesMin:2,choicesMax:3,timeoutMs:15000,maxTokens:300};
var BLOCK=/\b(fuck|shit|bitch|cunt|nigg|fag|retard|kill yourself|suicide|porn|sex|nazi)\w*/i;
var llm={EFFECTS:EFFECTS,LIM:LIM,providers:{},lastError:null,lastPrompt:null,inFlight:false,stats:{llm:0,offline:0,fallback:0,rejected:0}};
/* ---------------- settings (player-owned, localStorage only) ---------------- */
llm.defaults=function(){ return {provider:'offline',baseUrl:'',model:'',apiKey:'',temperature:0.8}; };
llm.settings=function(){ try{ var s=JSON.parse(localStorage.getItem(KEY)||'null'); if(s&&typeof s==='object')return Object.assign(llm.defaults(),s); }catch(e){} return llm.defaults(); };
llm.save=function(s){ var c=Object.assign(llm.defaults(),s||{}); ['provider','baseUrl','model','apiKey'].forEach(function(k){ c[k]=String(c[k]||'').trim().slice(0,400); });
  if(!(c.provider in llm.providers)&&c.provider!=='offline')c.provider='offline'; localStorage.setItem(KEY,JSON.stringify(c)); return c; };
llm.clearKey=function(){ var s=llm.settings(); s.apiKey=''; return llm.save(s); };
llm.registerProvider=function(id,impl){ llm.providers[id]=impl; };
/* ---------------- character sheets ---------------- */
var SHEETS={
 mara:{name:'Mara',role:'neighbor who welcomes the player (called {name}) and points them to the neighborhood activities',
   voice:'warm, encouraging, practical, short sentences',
   facts:['Dex needs help at the Corner Store (5 crates, $45 a shift)','the skate park is open','coaches run practice at the Training Facility','the Arena has a training drone','drone tip: dodge its attacks, then hit it while it recovers; button mashing wears you out'],
   source:'Y.O.U.R. slice lines (facts); voice PROPOSED'},
 dex:{name:'Dex',role:'runs the Corner Store and pays the player (called {name}) for stocking shifts',
   voice:'busy, friendly, quick, a little teasing',
   facts:['the shift is: grab the 5 crates on the floor and stock the shelf on the left','pays $45 for a full shift','one shift per day'],
   source:'Y.O.U.R. slice lines (facts); voice PROPOSED'},
 sikee:{name:'SIKEE',role:'the main villain, in his Authority Form; watches the player (called {name}) and waits for them at the Arena',
   voice:'calm, authoritative, menacing; measured short sentences; never shouts; speaks about rules, order and permission',
   facts:['his name is SIKEE','he appears in his Authority Form','he can be challenged at the Arena once the player has beaten the training drone'],
   never:['no backstory, origin, powers or allies beyond "Authority Form" — do not invent lore'],
   source:'PROPOSED (owner gave name + Authority Form design only)'},
 mella:{name:'Mella',role:'the hero\'s companion who walks alongside {name}, skates and helps out on shifts',
   voice:'upbeat, loyal, playful, short sentences; cheers {name} on',
   facts:['she follows {name} around the neighborhood','at the Corner Store she spots the right shelf slot','at the skate park she calls the next ring of the line and helps {name} shake off a bail once per run','she watches from the stands at the Arena'],
   never:['no backstory, family or powers beyond what is listed — do not invent lore'],
   source:'v1.1 companion role (owner decision t59u/t60u default); voice PROPOSED; art WIR: The Third Door'}
};
llm.SHEETS=SHEETS;
/* ---------------- state + memory ---------------- */
llm.state=function(npc){ var p=(Y.profile&&Y.profile.data)||{},f=p.flags||{},H=Y.hub,wk=H&&H.current&&Y.profile&&Y.profile.data?H.current():null,st=p.story||{};
  return {npc:npc,name:p.name||(window.WIR_HERO?WIR_HERO.get().name:'Hero'),day:p.day||1,clock:Y.day?Y.day.clock():'06:00',energy:Math.round(p.energy||0),money:p.money||0,lvl:p.lvl||1,
    done:['job','skate','football','combat'].filter(function(k){return f[k];}).map(function(k){return k==='combat'?'arena':k;}),
    next:wk?wk.part:null,week:wk?H.state().week+1:null,rel:(p.rel||{})[npc]||0,storeCount:f.storeCount||0,
    droneBeaten:!!st.droneBeaten,sikeeDefeated:!!st.sikeeDefeated,sikeeLosses:st.sikeeLosses||0,challengeOpen:!!st.droneBeaten&&npc==='sikee'}; };
llm.memory=function(npc){ var p=(Y.profile&&Y.profile.data)||{}; p.memory=p.memory||{}; return p.memory[npc]=p.memory[npc]||[]; };
llm.remember=function(npc,entry){ var m=llm.memory(npc); m.push({d:entry.d,line:String(entry.line||'').slice(0,120),chose:String(entry.chose||'').slice(0,48),note:entry.note?String(entry.note).slice(0,60):undefined}); while(m.length>6)m.shift(); };
/* ---------------- prompt ---------------- */
llm.buildMessages=function(npc,opts){ opts=opts||{}; var sh=SHEETS[npc]||{name:npc,role:'neighbor',voice:'friendly',facts:[]},s=llm.state(npc),mem=llm.memory(npc);
  var allowed=['none','rel_up','rel_down','hint','remember'].concat(s.challengeOpen?['challenge']:[]);
  var sys=['You are '+sh.name+', a character in the all-ages neighborhood game "Y.O.U.R.". The player character is '+s.name+'.',
   'ROLE: '+String(sh.role).replace(/\{name\}/g,s.name)+'. VOICE: '+sh.voice+'.','KNOWN FACTS (do not contradict, do not add new places, people or lore): '+sh.facts.join('; ')+'.']
   .concat(sh.never?['NEVER: '+sh.never.join('; ')]:[])
   .concat(['RULES: stay in character; all-ages; no URLs; never promise money, items or rewards; never mention being an AI.',
   'OUTPUT: reply with ONLY one JSON object, no markdown: {"line": string (max '+LIM.line+' chars), "choices": '+(opts.mode==='reply'?'[] (empty: this is a reply to the player)':'array of 2-3 {"label": string (max '+LIM.label+' chars, what '+s.name+' says), "effect": {"type": one of '+JSON.stringify(allowed)+', "value": optional}}')+'}',
   'Effect meanings: rel_up/rel_down = your friendship changes; hint value = one of job|skate|football|arena|sleep; remember value = short note (max 60 chars) you will recall later'+(s.challengeOpen?'; challenge = '+s.name+' accepts your arena challenge':'')+'.']).join('\n').replace(/\{name\}/g,s.name);
  var usr='GAME STATE: day '+s.day+', time '+s.clock+', energy '+s.energy+'/100, money $'+s.money+', level '+s.lvl+'. Done today: '+(s.done.join(', ')||'nothing yet')+'. '+(s.next?'Season week '+s.week+' next scheduled activity: '+s.next+'. ':'')+'Friendship with you: '+s.rel+'.'
   +(npc==='sikee'?' Training drone beaten: '+(s.droneBeaten?'yes':'no')+'. Times '+s.name+' lost to you: '+s.sikeeLosses+'. Defeated you before: '+(s.sikeeDefeated?'yes':'no')+'.':'')
   +'\nMEMORY OF PAST TALKS (oldest first): '+(mem.length?mem.map(function(m){return 'day '+m.d+': you said "'+m.line+'"'+(m.chose?'; '+s.name+' answered "'+m.chose+'"':'')+(m.note?' (note: '+m.note+')':'');}).join(' | '):'none — this is your first talk.')
   +(opts.choice?'\n'+s.name+' JUST SAID: "'+opts.choice+'". Reply to that in one line.':'\nSay your next line to '+s.name+'.');
  return [{role:'system',content:sys},{role:'user',content:usr}]; };
/* ---------------- validation (strict) ---------------- */
function clean(t,max){ t=String(t==null?'':t).replace(/[\u0000-\u001f\u007f]/g,' ').replace(/https?:\/\/\S+|www\.\S+/gi,'').replace(/[*_`#>]/g,'').replace(/\s+/g,' ').trim(); return t.length>max?t.slice(0,max-1).replace(/\s+\S*$/,'')+'…':t; }
llm.validate=function(raw,npc,opts){ opts=opts||{}; var obj=raw;
  if(typeof raw==='string'){ var a=raw.indexOf('{'),b=raw.lastIndexOf('}'); if(a<0||b<=a)return {ok:false,error:'no JSON object'}; try{ obj=JSON.parse(raw.slice(a,b+1)); }catch(e){ return {ok:false,error:'bad JSON'}; } }
  if(!obj||typeof obj!=='object')return {ok:false,error:'not an object'};
  var line=clean(obj.line,LIM.line); if(line.length<2)return {ok:false,error:'empty line'}; if(BLOCK.test(line)||/as an ai|language model/i.test(line))return {ok:false,error:'unsafe line'};
  var s=llm.state(npc), allowed=['none','rel_up','rel_down','hint','remember'].concat(s.challengeOpen?['challenge']:[]);
  var ch=Array.isArray(obj.choices)?obj.choices:[]; var out=[];
  for(var i=0;i<ch.length&&out.length<LIM.choicesMax;i++){ var c=ch[i]; if(!c)continue; var label=clean(typeof c==='string'?c:c.label,LIM.label); if(label.length<1||BLOCK.test(label))continue;
    var ef=(c&&c.effect&&typeof c.effect==='object')?c.effect:{type:'none'}, t=String(ef.type||'none'), v=ef.value;
    if(allowed.indexOf(t)<0)t='none';
    if(t==='hint'){ v=String(v||'').toLowerCase(); if(ACTS.indexOf(v)<0){ t='none'; v=undefined; } }
    else if(t==='remember'){ v=clean(v,LIM.remember); if(!v){ t='none'; v=undefined; } }
    else v=undefined;
    out.push({label:label,effect:v===undefined?{type:t}:{type:t,value:v}}); }
  if(opts.mode==='reply')out=[]; else if(out.length<LIM.choicesMin)return {ok:false,error:'needs 2-3 choices'};
  return {ok:true,data:{line:line,choices:out,mood:clean(obj.mood||'',20)}}; };
/* ---------------- providers ---------------- */
function withTimeout(p,ms){ return Promise.race([p,new Promise(function(_,rej){ setTimeout(function(){ rej(new Error('timeout')); },ms); })]); }
function base(s,def){ return (s.baseUrl||def).replace(/\/+$/,''); }
llm.registerProvider('openai',{label:'OpenAI-compatible',needsKey:true,request:function(msgs,s){ return {url:base(s,'https://api.openai.com/v1')+'/chat/completions',
  init:{method:'POST',headers:Object.assign({'Content-Type':'application/json'},s.apiKey?{'Authorization':'Bearer '+s.apiKey}:{}),body:JSON.stringify({model:s.model||'gpt-4o-mini',messages:msgs,temperature:s.temperature,max_tokens:LIM.maxTokens,response_format:{type:'json_object'}})}}; },
  parse:function(j){ return j&&j.choices&&j.choices[0]&&j.choices[0].message?j.choices[0].message.content:''; }});
llm.registerProvider('anthropic',{label:'Anthropic',needsKey:true,request:function(msgs,s){ return {url:base(s,'https://api.anthropic.com')+'/v1/messages',
  init:{method:'POST',headers:{'Content-Type':'application/json','x-api-key':s.apiKey,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'},
    body:JSON.stringify({model:s.model||'claude-3-5-haiku-latest',max_tokens:LIM.maxTokens,temperature:s.temperature,system:msgs[0].content,messages:msgs.slice(1)})}}; },
  parse:function(j){ return j&&j.content&&j.content[0]?j.content[0].text:''; }});
llm.registerProvider('ollama',{label:'Ollama (local)',needsKey:false,request:function(msgs,s){ return {url:base(s,'http://localhost:11434')+'/api/chat',
  init:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({model:s.model||'llama3.2',messages:msgs,stream:false,format:'json',options:{temperature:s.temperature}})}}; },
  parse:function(j){ return j&&j.message?j.message.content:''; }});
llm.registerProvider('webllm',{label:'WebLLM (in-browser)',needsKey:false,call:function(msgs,s){ var E=window.YOUR_WEBLLM_ENGINE; if(!E)return Promise.reject(new Error('no WebLLM engine loaded'));
  return E.chat.completions.create({messages:msgs,temperature:s.temperature,max_tokens:LIM.maxTokens}).then(function(r){ return r.choices[0].message.content; }); }});
llm.callProvider=function(id,msgs,s){ var P=llm.providers[id]; if(!P)return Promise.reject(new Error('unknown provider '+id));
  if(P.needsKey&&!s.apiKey&&!s.baseUrl)return Promise.reject(new Error('no API key set'));
  if(P.call)return withTimeout(P.call(msgs,s),LIM.timeoutMs);
  var rq=P.request(msgs,s); return withTimeout(fetch(rq.url,rq.init).then(function(r){ if(!r.ok)throw new Error('HTTP '+r.status); return r.json(); }).then(P.parse),LIM.timeoutMs); };
/* ---------------- offline engine: state-aware grammar (deterministic per day/talk) ---------------- */
function hash(s){ var h=2166136261; for(var i=0;i<s.length;i++){ h^=s.charCodeAt(i); h=Math.imul(h,16777619); } return h>>>0; }
function rng(seed){ var a=seed>>>0; return function(){ a=(a+0x6D2B79F5)>>>0; var t=a; t=Math.imul(t^t>>>15,t|1); t^=t+Math.imul(t^t>>>7,t|61); return ((t^t>>>14)>>>0)/4294967296; }; }
function pick(r,a){ return a[Math.floor(r()*a.length)]; }
var ACT_NAME={job:'the Corner Store shift',skate:'the skate park',football:'football at the Training Facility',arena:'the Arena',sleep:'home to sleep'};
var G={
 mara:{
  open:{morning:['Morning, {name}!','Up early, {name}? Good.','Hey {name}, fresh day.'],day:['Hey {name}!','There you are, {name}.','Good to see you, {name}.'],evening:['Evening, {name}.','Long day, {name}?','Still out, {name}?']},
  obs:{tired:['You look worn out. Rest counts as training too.','Your energy is low — home is closer than you think.'],
       rich:['Saving up? Smart.','Dex says you are his best stocker.'],
       allDone:['You did all of it today. Job, skating, practice and the arena.'],
       some:['{doneList} done already. Nice pace.'],none:['Dex needs help at the Corner Store, the skate park is open, coaches run practice, and the Arena has a drone.'],
       sikee:['I saw SIKEE near the Arena again. Keep your head up.','Do not let SIKEE rush you. Dodge first, then hit while he recovers.']},
  sug:{next:['The season board says {nextName} is next.','If it were me, I would try {nextName}.'],tip:['Dodge its attacks, then hit it while it recovers. Button mashing wears you out.']},
  mem:['You told me "{last}" last time. I remember.','Still thinking about what you said: "{last}".'],
  choices:function(s){ var nx=s.energy<20?'sleep':(s.next||'job'); return [{label:'Where should I go next?',effect:{type:'hint',value:nx}},{label:'Thanks, Mara.',effect:{type:'rel_up'}},{label:'Not now.',effect:{type:'none'}}]; },
  reply:{hint:['Try {hintName}. Trust me.'],rel_up:['Any time, {name}.','That is what neighbors are for.'],none:['Go on then. I will be here.'],rel_down:['Hm. Alright.'],remember:['I will remember that.']}},
 dex:{
  open:{morning:['Doors are open, {name}.','Early bird!'],day:['Yo {name}!','Hey, my favorite stocker.'],evening:['Almost closing, {name}.','Late shift energy, huh?']},
  obs:{jobDone:['Shelf looks great today. Thanks again!'],progress:['Keep going, {left} crates left.'],noJob:['Need a hand. Grab the 5 crates on the floor and stock the shelf on the left. $45 for the shift.'],tired:['You are running on fumes. Sleep first, crates tomorrow.']},
  sug:{next:['After this, maybe {nextName}?']},
  mem:['Last time you said "{last}". Still true?'],
  choices:function(s){ return s.done.indexOf('job')>=0?[{label:'See you tomorrow.',effect:{type:'rel_up'}},{label:'Any tips?',effect:{type:'hint',value:s.next||'skate'}}]:[{label:'I am on it.',effect:{type:'rel_up'}},{label:'Maybe later.',effect:{type:'none'}},{label:'What else is going on?',effect:{type:'hint',value:s.next||'skate'}}]; },
  reply:{hint:['Hear {hintName} is good today.'],rel_up:['Love it. Let us go.','That is the spirit.'],none:['No rush. Crates are not going anywhere.'],rel_down:['Okay, okay.'],remember:['Noted.']}},
 mella:{
  open:{morning:['Morning, {name}! Ready?','Up and at it, {name}.'],day:['Hey {name}, where to?','Right behind you, {name}.'],evening:['Long day, {name}. Still going?','Evening, {name}. One more?']},
  obs:{tired:['You are dragging. Home and sleep?','Energy check: low. Let us rest.'],none:['Dex needs crates stocked and the skate park is open. Pick one, I am with you.'],
       some:['{doneList} done. Nice.'],allDone:['We did everything today. Not bad at all.'],sikee:['SIKEE is still by the Arena. I do not like how he watches you.']},
  sug:{next:['Season board says {nextName} next.']},
  mem:['You said "{last}" last time. I remember.'],
  choices:function(s){ var nx=s.energy<20?'sleep':(s.next||'job'); return [{label:'Where to next?',effect:{type:'hint',value:nx}},{label:'Glad you are here.',effect:{type:'rel_up'}},{label:'Let us go.',effect:{type:'none'}}]; },
  reply:{hint:['{hintName}. Let us go!'],rel_up:['Always, {name}.','Same here.'],none:['Lead the way.'],rel_down:['Okay...'],remember:['Got it.']}},
 sikee:{
  open:{morning:['{name}.','You are awake. Good.'],day:['{name}.','Stop there, {name}.'],evening:['Late, {name}.','The day is ending, {name}.']},
  obs:{first:['I am SIKEE. This is my Authority Form. Remember it.'],droneNo:['The drone is still standing. Then you are not ready for me.'],
       droneYes:['You beat the drone. Now the Arena expects more.'],won:['You took one round from me. Rules still hold.'],lost:['Every road here has a rule. You keep breaking against mine.'],tired:['You are tired. Order does not wait for you to rest.']},
  sug:{arena:['The Arena. When you are ready.','I will be at the Arena.']},
  mem:['You said "{last}". I keep a record.','"{last}" — I remember your words, {name}.'],
  choices:function(s){ return s.challengeOpen?[{label:'I challenge you.',effect:{type:'challenge'}},{label:'What do you want?',effect:{type:'none'}},{label:'Not today.',effect:{type:'none'}}]:[{label:'What do you want?',effect:{type:'none'}},{label:'I am not afraid.',effect:{type:'remember',value:'the hero said they are not afraid'}}]; },
  reply:{challenge:['Then come to the Arena. I will be waiting.'],none:['Order is patient, {name}.','Walk on, then.'],remember:['Noted. It changes nothing.'],rel_up:['Hm.'],rel_down:['As expected.'],hint:['The Arena, {name}.']}}
};
llm.GRAMMAR=G;
function fillT(t,s,extra){ return t.replace(/\{(\w+)\}/g,function(_,k){ if(extra&&k in extra)return extra[k]; if(k==='nextName')return ACT_NAME[s.next]||'the Corner Store shift'; if(k==='left')return String(5-(s.storeCount||0)); if(k==='doneList')return s.done.join(', ').replace(/^./,function(c){return c.toUpperCase();}); return s[k]!=null?s[k]:''; }); }
llm.offline=function(npc,opts){ opts=opts||{}; var g=G[npc]||G.mara, s=llm.state(npc), mem=llm.memory(npc), r=rng(hash(npc+'|'+s.day+'|'+mem.length+'|'+(opts.choice||'')));
  var h=parseInt(s.clock,10), tod=h<11?'morning':h<18?'day':'evening';
  if(opts.mode==='reply'){ var ef=(opts.effect&&opts.effect.type)||'none'; var R=g.reply[ef]||g.reply.none; return {line:fillT(pick(r,R),s,{hintName:ACT_NAME[opts.effect&&opts.effect.value]||''}),choices:[],mood:'',source:'offline'}; }
  var parts=[fillT(pick(r,g.open[tod]),s)], O=g.obs;
  if(npc==='mara'){ if(s.energy<20)parts.push(pick(r,O.tired)); else if(s.done.length>=4)parts.push(pick(r,O.allDone)); else if(s.done.length)parts.push(fillT(pick(r,O.some),s)); else parts.push(pick(r,O.none));
    if(s.droneBeaten&&!s.sikeeDefeated&&r()<.5)parts.push(pick(r,O.sikee)); else if(s.next&&s.energy>=20)parts.push(fillT(pick(r,g.sug.next),s)); }
  else if(npc==='dex'){ if(s.energy<20&&s.done.indexOf('job')<0)parts.push(pick(r,O.tired)); else if(s.done.indexOf('job')>=0)parts.push(pick(r,O.jobDone)); else if(s.storeCount>0)parts.push(fillT(pick(r,O.progress),s)); else parts.push(pick(r,O.noJob)); }
  else if(npc==='mella'){ if(s.energy<20)parts.push(pick(r,O.tired)); else if(s.done.length>=4)parts.push(pick(r,O.allDone)); else if(s.done.length)parts.push(fillT(pick(r,O.some),s)); else parts.push(pick(r,O.none));
    if(s.droneBeaten&&!s.sikeeDefeated&&r()<.4)parts.push(pick(r,O.sikee)); else if(s.next&&s.energy>=20)parts.push(fillT(pick(r,g.sug.next),s)); }
  else if(npc==='sikee'){ if(!mem.length)parts.push(O.first[0]); else if(s.sikeeDefeated)parts.push(pick(r,O.won)); else if(s.sikeeLosses)parts.push(pick(r,O.lost)); else parts.push(pick(r,s.droneBeaten?O.droneYes:O.droneNo)); if(s.energy<20&&r()<.5)parts.push(pick(r,O.tired)); else parts.push(pick(r,g.sug.arena)); }
  var last=mem.length&&mem[mem.length-1].chose; if(last&&r()<.6)parts.splice(1,0,fillT(pick(r,g.mem),s,{last:last}));
  var line=parts.join(' '); if(line.length>LIM.line)line=parts.slice(0,2).join(' ');
  var v=llm.validate({line:line,choices:g.choices(s)},npc); return Object.assign(v.data,{source:'offline'}); };
/* ---------------- converse ---------------- */
llm.converse=function(npc,opts){ opts=opts||{}; var s=llm.settings(), id=s.provider;
  if(!id||id==='offline'||!llm.providers[id]){ llm.stats.offline++; return Promise.resolve(llm.offline(npc,opts)); }
  var msgs=llm.buildMessages(npc,opts); llm.lastPrompt=msgs; llm.inFlight=true;
  return llm.callProvider(id,msgs,s).then(function(text){ llm.inFlight=false; var v=llm.validate(text,npc,opts);
      if(!v.ok){ llm.stats.rejected++; throw new Error('schema: '+v.error); } llm.stats.llm++; llm.lastError=null; return Object.assign(v.data,{source:'llm',provider:id}); })
    .catch(function(e){ llm.inFlight=false; llm.lastError=String(e&&e.message||e); llm.stats.fallback++; var o=llm.offline(npc,opts); o.source='offline-fallback'; o.error=llm.lastError; return o; }); };
llm.test=function(){ var s=llm.settings(); if(s.provider==='offline')return Promise.resolve({ok:true,source:'offline'});
  return llm.callProvider(s.provider,llm.buildMessages('mara',{}),s).then(function(t){ var v=llm.validate(t,'mara'); return {ok:v.ok,error:v.error,source:'llm'}; },function(e){ return {ok:false,error:String(e.message||e)}; }); };
Y.llm=llm;
})();
