/* WIR shared hero profile · v1.2 · PROPOSAL_HOLD (v1.2 = Y.O.U.R. v2.2: optional kaw sidekick field, still schema wir.hero/1) — ONE hero across every WIR game (owner, t59u/t60u: "same person connected through all").
   Standalone: no dependency on YOUR. Any WIR game includes this file and reads / writes the same localStorage key.
   Storage key : "wir-hero-profile-v1"        (same origin only — file:// pages share it per browser profile; export/import moves it between origins/devices)
   Schema      : "wir.hero/1"  (documented in HERO_PROFILE_SCHEMA.md)
     { schema:"wir.hero/1", id:string, name:string(1..22, default "Hero" — placeholder, never invented),
       lookId:string ("owner_starter_v1" = ChatGPT 18/19/20 owner starter look), level:int>=1, xp:int>=0,
       unlocks:[string "<game>:<unlock>"] (unique, ≤200), games:{ <gameId>: { lastPlayed:ISO, level?:int, data?:object(≤4 KB JSON) } },
       kaw?:{ id:'kaw-…', name?, species?, elements?[], bond?:0..100, since?:ISO }  (v1.2, optional: the hero's bonded KAW sidekick; older readers ignore it)
       createdAt:ISO, updatedAt:ISO }
   API (window.WIR_HERO): get() · save(p) · update(patch) · setName(s) · unlock(id) · has(id) · gameData(gameId[,data]) · syncLevel(level,xp)
                          export() → JSON string · import(json) → {ok,error?,profile?} · reset() · onChange(fn) · validate(obj) */
(function(){
'use strict';
var KEY='wir-hero-profile-v1', SCHEMA='wir.hero/1', LOOKS=['owner_starter_v1'], DEFAULT_NAME='Hero';
var subs=[];
function now(){ return new Date().toISOString(); }
function rid(){ var a='',c='abcdefghijklmnopqrstuvwxyz0123456789'; for(var i=0;i<12;i++)a+=c[Math.floor(Math.random()*c.length)]; return 'hero_'+a; }
function cleanName(s){ s=String(s==null?'':s).replace(/[\u0000-\u001f<>{}\\]/g,'').replace(/\s+/g,' ').trim().slice(0,22); return s||DEFAULT_NAME; }
function fresh(){ var t=now(); return {schema:SCHEMA,id:rid(),name:DEFAULT_NAME,lookId:LOOKS[0],level:1,xp:0,unlocks:[],games:{},createdAt:t,updatedAt:t}; }
function validate(o){
  if(!o||typeof o!=='object'||Array.isArray(o))return {ok:false,error:'not an object'};
  if(o.schema!==SCHEMA)return {ok:false,error:'schema must be '+SCHEMA};
  var p=fresh(); p.id=typeof o.id==='string'&&/^[\w-]{3,40}$/.test(o.id)?o.id:p.id; p.name=cleanName(o.name);
  p.lookId=typeof o.lookId==='string'&&/^[\w-]{1,40}$/.test(o.lookId)?o.lookId:LOOKS[0];
  p.level=Math.max(1,Math.min(999,Math.floor(+o.level)||1)); p.xp=Math.max(0,Math.min(1e9,Math.floor(+o.xp)||0));
  p.unlocks=Array.isArray(o.unlocks)?o.unlocks.filter(function(u){return typeof u==='string'&&/^[\w-]{1,24}:[\w.-]{1,48}$/.test(u);}).filter(function(u,i,a){return a.indexOf(u)===i;}).slice(0,200):[];
  p.games={}; if(o.games&&typeof o.games==='object')Object.keys(o.games).slice(0,80).forEach(function(k){ if(!/^[\w-]{1,24}$/.test(k))return; var g=o.games[k]||{},e={lastPlayed:typeof g.lastPlayed==='string'?g.lastPlayed.slice(0,30):null};
      if(g.level!=null)e.level=Math.max(1,Math.floor(+g.level)||1); if(g.data&&typeof g.data==='object'){ try{ var j=JSON.stringify(g.data); if(j.length<=4096)e.data=JSON.parse(j); }catch(_){} } p.games[k]=e; });
  if(o.kaw&&typeof o.kaw==='object'&&!Array.isArray(o.kaw)&&typeof o.kaw.id==='string'&&/^kaw-[\w-]{1,40}$/.test(o.kaw.id)){ var k=o.kaw,cs=function(v,n){ return String(v==null?'':v).replace(/[\u0000-\u001f<>{}\\]/g,'').trim().slice(0,n); };
    p.kaw={id:k.id}; if(k.name)p.kaw.name=cs(k.name,22); if(k.species)p.kaw.species=cs(k.species,40); if(Array.isArray(k.elements))p.kaw.elements=k.elements.slice(0,4).map(function(e){return cs(e,12);}).filter(Boolean);
    if(k.bond!=null)p.kaw.bond=Math.max(0,Math.min(100,Math.round(+k.bond)||0)); if(typeof k.since==='string')p.kaw.since=k.since.slice(0,30); }
  p.createdAt=typeof o.createdAt==='string'?o.createdAt.slice(0,30):p.createdAt; p.updatedAt=typeof o.updatedAt==='string'?o.updatedAt.slice(0,30):p.updatedAt;
  return {ok:true,profile:p}; }
function read(){ try{ var raw=localStorage.getItem(KEY); if(!raw)return null; var v=validate(JSON.parse(raw)); return v.ok?v.profile:null; }catch(e){ return null; } }
var H={KEY:KEY,SCHEMA:SCHEMA,LOOKS:LOOKS,DEFAULT_NAME:DEFAULT_NAME,validate:validate};
H.get=function(){ var p=read(); if(!p){ p=fresh(); H.save(p); } return p; };
H.exists=function(){ return !!read(); };
H.save=function(p){ var v=validate(p); if(!v.ok)return false; v.profile.updatedAt=now(); try{ localStorage.setItem(KEY,JSON.stringify(v.profile)); }catch(e){ return false; } subs.forEach(function(f){ try{f(v.profile);}catch(_){} }); return v.profile; };
H.update=function(patch){ var p=H.get(); Object.keys(patch||{}).forEach(function(k){ if(k!=='schema'&&k!=='id'&&k!=='createdAt')p[k]=patch[k]; }); return H.save(p); };
H.setName=function(s){ return H.update({name:cleanName(s)}).name; };
H.unlock=function(id){ var p=H.get(); if(p.unlocks.indexOf(id)<0){ p.unlocks.push(id); H.save(p); return true; } return false; };
H.has=function(id){ return H.get().unlocks.indexOf(id)>=0; };
H.gameData=function(gameId,data){ var p=H.get(), g=p.games[gameId]||{}; if(data===undefined)return g; g.lastPlayed=now(); if(data&&data.level!=null)g.level=data.level; if(data&&data.data)g.data=data.data; p.games[gameId]=g; H.save(p); return p.games[gameId]; };
H.syncLevel=function(level,xp){ var p=H.get(); var l=Math.max(p.level,Math.floor(+level)||1); if(l!==p.level||(xp!=null&&+xp>p.xp)){ p.level=l; if(xp!=null)p.xp=Math.max(p.xp,Math.floor(+xp)||0); H.save(p); } return p; };
H.export=function(){ return JSON.stringify(H.get(),null,1); };
H.import=function(json){ var o; try{ o=typeof json==='string'?JSON.parse(json):json; }catch(e){ return {ok:false,error:'invalid JSON'}; } var v=validate(o); if(!v.ok)return v; var s=H.save(v.profile); return s?{ok:true,profile:s}:{ok:false,error:'storage failed'}; };
H.reset=function(){ try{ localStorage.removeItem(KEY); }catch(e){} return H.get(); };
H.onChange=function(f){ subs.push(f); };
window.WIR_HERO=H;
})();
