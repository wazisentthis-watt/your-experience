/* YOUR test kit · PROPOSAL_HOLD — tiny in-page test runner; results in window.__results, window.__done */
(function(){
var list=[],out=[];
window.YT={
  test:function(name,fn){list.push({name:name,fn:fn});},
  eq:function(a,b,msg){ if(JSON.stringify(a)!==JSON.stringify(b))throw new Error((msg||'eq')+': got '+JSON.stringify(a)+' want '+JSON.stringify(b)); },
  ok:function(c,msg){ if(!c)throw new Error(msg||'assertion failed'); },
  near:function(a,b,tol,msg){ if(Math.abs(a-b)>tol)throw new Error((msg||'near')+': '+a+' vs '+b+' ±'+tol); },
  wait:function(ms){return new Promise(function(r){setTimeout(r,ms);});},
  run:async function(){ var pass=0,fail=0;
    for(var i=0;i<list.length;i++){ var t=list[i],r={name:t.name};
      try{ await t.fn(); r.ok=true; pass++; }catch(e){ r.ok=false; r.err=String(e&&e.message||e); fail++; }
      out.push(r); }
    window.__results={pass:pass,fail:fail,total:list.length,tests:out};
    var el=document.getElementById('results'); if(el){ el.innerHTML='<b>'+document.title+'</b> — '+pass+'/'+list.length+' PASS'+out.map(function(r){return '<div class="'+(r.ok?'p':'f')+'">'+(r.ok?'PASS':'FAIL')+' · '+r.name+(r.err?' — '+r.err:'')+'</div>';}).join(''); }
    window.__done=true; return window.__results; }
};
})();
(function(){
YT.down=function(code){ YOUR.input.simKey(code,true); };
YT.up=function(code){ YOUR.input.simKey(code,false); };
YT.step=function(n){ YOUR.core.stepFixed(n||1); };
YT.tap=function(code,hold){ YT.down(code); YT.step(hold||1); YT.up(code); YT.step(1); };
YT.secs=function(s){ YT.step(Math.round(s*60)); };
YT.freshProfile=function(name){ try{localStorage.clear();}catch(e){} var p=YOUR.profile.create(name||'Tester'); return p; };
YT.boot=async function(opts){ opts=opts||{}; YOUR.core.init(document.getElementById('c'),{manual:true}); if(opts.assets!==false&&YOUR.config)await YOUR.core.assets.load(YOUR.config.assets); };
})();
