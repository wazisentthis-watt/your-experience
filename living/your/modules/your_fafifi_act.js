/* YOUR FaFiFi for job / skate / arena — OWNER-DELEGATED DESIGN v1 · PROPOSAL_HOLD.
   Owner (t56u): "You decide with good algorithms." Law: "Do not make the players equal. Make the road fair."
   Player stats (pow, spd, level, buffs) are NEVER adjusted. Only the ROAD (layout, clock, telegraphs) is shaped, and every road is
   built so its modelled expected completion is the same (± TOL) — that is what "fair" means here. Full formulas: FAFIFI_ACTIVITIES.md.
   1. Rolling performance  e ← (1−α)e + α·o   (o ∈ [0,1] outcome of a run, α = 0.3, e₀ = TARGET)
   2. Bounded rubber band  d = clamp(1 + K·(e − TARGET), 1 − B, 1 + B)   (K = 0.6, B = 0.18, TARGET = 0.62)  — d > 1 = tighter road
   3. Road pressure        ρ = ρ₀·d  (job ρ₀ = 0.34, skate ρ₀ = 0.25); the APPROVED clocks stay fixed (job 90 s, skate 45 s); the LAYOUT is
                           redrawn (seeded rejection sampling) until its ideal-play time T_req = ρ·T ± 4 %  → same pressure on every road
   4. Completion model     E(x) = 1/(1 + exp(β(x − 1) + c)), β = 4, c = ln(1/TARGET − 1); x = pressure / baseline pressure (x = 1 ⇒ E = TARGET)
                           arena: x = (Θ/Θ₀)/telegraph, Θ = threat of a 12-attack cycle with slam count fixed by d (≤ 2 slams in a row)
   5. Seeded audit         over N seeds: max |E_i − mean E| ≤ TOL (0.05) and every road satisfied its band
   6. Four roles per activity (Route Attack, Dependency Attack, Equity Line, Fixed Finish / Perfect 30) + Reality slider (Perfect 30 needs Reality ≥ 75).
   Payouts never change (YOUR.fair.applyPayout stays identity). All constants here are PROPOSED v1. */
(function(){
var Y=window.YOUR=window.YOUR||{};
var F={VERSION:'OWNER-DELEGATED DESIGN v1',LAW:'Do not make the players equal. Make the road fair.',
  ALPHA:0.3,K:0.6,BAND:0.18,TARGET:0.62,TOL:0.05,BETA:4,RHO0:{job:0.34,skate:0.25},
  REACT_MS:120,ENERGY_COST:2,FINISH_MS:180,REALITY_GATE:75};
function clamp(v,a,b){return Math.max(a,Math.min(b,v));}
function hash(s){ var h=2166136261; for(var i=0;i<s.length;i++){ h^=s.charCodeAt(i); h=Math.imul(h,16777619); } return h>>>0; }
function rng(seed){ var a=seed>>>0; return function(){ a=(a+0x6D2B79F5)>>>0; var t=a; t=Math.imul(t^t>>>15,t|1); t^=t+Math.imul(t^t>>>7,t|61); return ((t^t>>>14)>>>0)/4294967296; }; }
F.rng=rng; F.hash=hash;
/* ---------- performance + rubber band ---------- */
F.state=function(act){ var p=Y.profile.data; p.fafifi=p.fafifi||{}; return p.fafifi[act]=p.fafifi[act]||{e:F.TARGET,n:0,hist:[]}; };
F.record=function(act,o){ var s=F.state(act); o=clamp(+o||0,0,1); s.e=(1-F.ALPHA)*s.e+F.ALPHA*o; s.n++; s.hist.push(Math.round(o*100)/100); if(s.hist.length>10)s.hist.shift(); return s.e; };
F.difficulty=function(act,e){ if(e==null)e=F.state(act).e; return clamp(1+F.K*(e-F.TARGET),1-F.BAND,1+F.BAND); };
F.reality=function(){ var p=Y.profile&&Y.profile.data; var r=p&&p.settings&&p.settings.reality; if(r==null&&!p&&Y.screens&&Y.screens.last.settings)r=Y.screens.last.settings.reality; return r==null?((Y.config.fair&&Y.config.fair.reality)||75):r; };
F.seedFor=function(act){ var p=Y.profile.data,s=F.state(act); return hash(act+'|'+(p.day||1)+'|'+s.n+'|'+(p.name||'')); };
/* ---------- shared completion model (PROPOSED, calibrate with playtests) ----------
   E(x) = 1 / (1 + exp(β·(x − 1) + c)),  c = ln(1/TARGET − 1)   where x = road pressure relative to the baseline road (x = 1 ⇒ E = TARGET).
   job/skate: x = ρ/ρ₀ with ρ = T_req/T (T = the APPROVED clock: 90 s shift, 45 s run — clocks are never changed)
   arena:     x = (Θ/Θ₀)·(1/telegraph)  (Θ = threat of the attack sequence) */
F.model=function(x){ return 1/(1+Math.exp(F.BETA*(x-1)+Math.log(1/F.TARGET-1))); };
/* ---------- JOB road: approved 90 s clock fixed; crate layout drawn until its ideal time T_req = ρ·T (±BAND_REL) ---------- */
var JOB={V:140*0.85,HANDLE:0.6,SHELF_X:74,SPAWN:{x:310,y:370},T:90,X:[120,570],Y:[100,350],BAND_REL:0.04};
F.jobPath=function(crates,slots){ var x=JOB.SPAWN.x,y=JOB.SPAWN.y,L=0,left=crates.slice(),free=slots.slice();
  while(left.length){ var bi=0,bd=1e9; left.forEach(function(c,i){ var dd=Math.hypot(c.x-x,c.y-y); if(dd<bd){bd=dd;bi=i;} }); var c=left.splice(bi,1)[0]; L+=bd;
    var si=0,sd=1e9; free.forEach(function(s,i){ var dd=Math.hypot(c.x-s.x,c.y-s.y); if(dd<sd){sd=dd;si=i;} }); var s=free.splice(si,1)[0]; L+=sd; x=s.x; y=s.y; }
  return L; };
F.jobRoad=function(seed,d,equity){ var r=rng(seed),rho=F.RHO0.job*d,want=rho*JOB.T,slots=[0,1,2,3,4].map(function(i){return {x:JOB.SHELF_X,y:90+i*62};}),tries=0,crates,L,Treq,mul=equity&&equity.speedMul||1,best=null;
  do{ tries++; crates=[]; var g=0; while(crates.length<5&&g++<500){ var c={x:Math.round(JOB.X[0]+r()*(JOB.X[1]-JOB.X[0])),y:Math.round(JOB.Y[0]+r()*(JOB.Y[1]-JOB.Y[0]))};
      if(equity&&equity.farFromDoor&&c.y>250)continue;
      if(crates.every(function(o){return Math.hypot(o.x-c.x,o.y-c.y)>64;})&&Math.hypot(c.x-310,c.y-400)>80)crates.push(c); }
    L=F.jobPath(crates,slots); Treq=L/(JOB.V*mul)+5*JOB.HANDLE+(equity&&equity.extraS||0);
    var err=Math.abs(Treq-want)/want; if(!best||err<best.err)best={crates:crates,L:L,Treq:Treq,err:err}; }
  while(best.err>JOB.BAND_REL&&tries<3000);
  var x=(best.Treq/JOB.T)/F.RHO0.job;
  return {act:'job',seed:seed,d:d,rho:rho,crates:best.crates,path:Math.round(best.L),Treq:Math.round(best.Treq*10)/10,T:JOB.T,x:x,E:F.model(x/d),Ed:F.model(x),tries:tries,priority:Math.floor(r()*5),ok:best.err<=JOB.BAND_REL}; };
/* ---------- SKATE road: approved 45 s clock fixed; 8 Y.O.U.R. rings jittered until T_req = ρ·T (±BAND_REL) ---------- */
var SK={V:150,AIR:0.8,START:{x:410,y:470},T:45,BASE:[[120,650,0],[300,640,0],[460,720,0],[420,880,40],[260,900,0],[110,820,0],[200,760,50],[330,780,0]],OX:200,OY:-470,J:95,BAND_REL:0.04};
F.skatePath=function(rings){ var x=SK.START.x,y=SK.START.y,L=0,left=rings.slice(); while(left.length){ var bi=0,bd=1e9; left.forEach(function(c,i){ var dd=Math.hypot(c.x-x,c.y-y); if(dd<bd){bd=dd;bi=i;} }); var c=left.splice(bi,1)[0]; L+=bd; x=c.x; y=c.y; } return L; };
F.skateRoad=function(seed,d,equity){ var r=rng(seed),rho=F.RHO0.skate*d,want=rho*SK.T,tries=0,rings,L,Treq,mul=equity&&equity.speedMul||1,best=null;
  do{ tries++; rings=SK.BASE.map(function(q){ return {x:Math.round(clamp(q[0]+SK.OX+(r()*2-1)*SK.J,40,920)),y:Math.round(clamp(q[1]+SK.OY+(r()*2-1)*SK.J,70,500)),z:q[2]}; });
    L=F.skatePath(rings); var air=rings.filter(function(q){return q.z>0;}).length; Treq=L/(SK.V*mul)+air*SK.AIR+(equity&&equity.extraS||0);
    var err=Math.abs(Treq-want)/want; if(!best||err<best.err)best={rings:rings,L:L,Treq:Treq,err:err}; }
  while(best.err>SK.BAND_REL&&tries<3000);
  var line=[]; while(line.length<3){ var k=Math.floor(r()*8); if(line.indexOf(k)<0)line.push(k); }
  var x=(best.Treq/SK.T)/F.RHO0.skate;
  return {act:'skate',seed:seed,d:d,rho:rho,rings:best.rings,path:Math.round(best.L),Treq:Math.round(best.Treq*10)/10,T:SK.T,x:x,E:F.model(x/d),Ed:F.model(x),tries:tries,line:line,ok:best.err<=SK.BAND_REL}; };
/* ---------- ARENA road: 12-attack cycle; slam count fixed by d (equal threat on every seed); order random with ≤2 slams in a row ---------- */
var AR={N:12,THREAT:{lunge:1.0,slam:1.3},WIND:{lunge:0.75,slam:0.95},WIND_FLOOR:0.45,MAX_RUN:2};
F.arenaRoad=function(seed,d,boss,equity){ var r=rng(seed),f=clamp(0.33+0.9*(d-1)+(equity&&equity.id==='low_ceiling'?0.08:0),0.1,0.6),slams=Math.round(f*AR.N),tries=0,seq;
  do{ tries++; seq=[]; for(var i=0;i<AR.N;i++)seq.push(i<slams?'slam':'lunge'); for(var j=seq.length-1;j>0;j--){ var k=Math.floor(r()*(j+1)),t=seq[j]; seq[j]=seq[k]; seq[k]=t; } }
  while(maxRun(seq)>AR.MAX_RUN&&tries<500);
  var th=seq.reduce(function(a,k){return a+AR.THREAT[k];},0), th0=AR.N*(AR.THREAT.lunge*(1-0.33)+AR.THREAT.slam*0.33), tele=clamp(1/Math.sqrt(d),0.8,1.25);
  var x=(th/th0)/tele;
  return {act:'arena',seed:seed,d:d,boss:!!boss,seq:seq,slams:slams,threat:Math.round(th*100)/100,telegraph:tele,windFloor:AR.WIND_FLOOR,x:x,E:F.model(x/d),Ed:F.model(x),tries:tries,ok:maxRun(seq)<=AR.MAX_RUN}; };
function maxRun(seq){ var m=0,c=0; seq.forEach(function(k){ c=k==='slam'?c+1:0; m=Math.max(m,c); }); return m; }
F.maxRun=maxRun; F.AR=AR; F.JOB=JOB; F.SK=SK;
/* ---------- Equity Line (one visible unequal road; both sides see it; payout never changes) ---------- */
F.EQUITY={
 job:[{id:'wet_aisle',label:'Wet aisle: you move 15% slower — the clock is set for it',speedMul:0.85},
      {id:'stuck_door',label:'Back door stuck: crates start far from the door — the clock is set for it',farFromDoor:true},
      {id:'tall_slot',label:'Top shelf slot needs an extra lift (+1.5 s) — the clock is set for it',extraS:1.5}],
 skate:[{id:'cracked_lane',label:'Cracked lane: 10% slower pushing — the clock is set for it',speedMul:0.9},
        {id:'wind',label:'Cross-wind: air rings need an extra second — the clock is set for it',extraS:1.0},
        {id:'fresh_wax',label:'Fresh wax on rail 1: grinds are longer, rings sit farther — the clock is set for it',extraS:0.5}],
 arena:[{id:'left_lean',label:'Opponent leans left: attacks from that side telegraph +120 ms',side:-1,ms:120},
        {id:'right_lean',label:'Opponent leans right: attacks from that side telegraph +120 ms',side:1,ms:120},
        {id:'low_ceiling',label:'Low ceiling: slams come 20% more often — the threat budget is unchanged'}]};
F.equity=function(act,seed){ var L=F.EQUITY[act]; var e=Object.assign({},L[seed%L.length]); e.visibleToBoth=true; e.changesPayout=false; return e; };
/* ---------- Route Attack: reveal → branch only if read → finish or forced checkdown; reward = information, never money ---------- */
function RA(act){ this.act=act; this.step=0; this.read=false; this.outcome=null; this.reward=null; this.log=[]; }
RA.prototype.reveal=function(what){ this.step=1; this.revealed=what; this.log.push('reveal'); return this; };
RA.prototype.readIt=function(ok){ if(this.step!==1)return this; this.read=!!ok; this.step=2; this.branch=ok?'safer_branch_offered':'no_branch'; this.log.push(ok?'read':'missed'); if(!ok){ this.outcome='forced_checkdown'; this.step=3; } return this; };
RA.prototype.finish=function(ok){ if(this.step!==2)return this; this.step=3; this.outcome=ok?'route_finished':'forced_checkdown'; this.reward=ok?'information':null; this.log.push(this.outcome); return this; };
F.RouteAttack=RA;
/* ---------- Dependency Attack: broken bond → next linked action +120 ms OR +2 energy (once); counter restores ---------- */
F.Dependency=function(){ var D=new Y.fair.Dependency(); return D; };
/* ---------- Fixed Finish / Perfect 30: same table as football, activity events mapped onto it; "Q4" = last 25% ---------- */
F.MAP={
 job:{crate_in_order:'line_to_gain',priority_read:'shell_read',clean_drop:'positive_secure',bond_chain:'bond_exchange',bump:'off_penalty',drop_wrong:'tfl',timeout:'turnover'},
 skate:{ring_in_line:'line_to_gain',line_read:'shell_read',clean_land:'positive_secure',grind_chain:'bond_exchange',bail:'sack',timeout:'turnover'},
 arena:{opening_hit:'line_to_gain',pattern_read:'shell_read',clean_block:'positive_secure',dodge_chain:'bond_exchange',guard_broken:'sack',knocked_down:'turnover'}};
F.meter=function(act){ var m=new Y.fair.Meter('offense'); m.act=act; return m; };
F.q4=function(act,run){ if(act==='arena')return run.hpFrac<=0.25; return run.left/run.total<=0.25; };
F.score=function(m,act,ev,run){ var key=F.MAP[act][ev]; if(!key)return m.value; return m.add(key,{quarter:F.q4(act,run)?4:3,reality:F.reality()}); };
/* ---------- Seeded fairness audit ---------- */
F.audit=function(act,n,d){ n=n||200; d=d||1; var Es=[],T=[],bad=0,eq;
  for(var i=0;i<n;i++){ var seed=hash(act+'#audit#'+i); eq=F.equity(act,seed); var road=act==='job'?F.jobRoad(seed,d,eq):act==='skate'?F.skateRoad(seed,d,eq):F.arenaRoad(seed,d,false,eq);
    if(!road.ok)bad++; Es.push(road.E); T.push(act==='arena'?road.threat:road.Treq); }
  var mean=Es.reduce(function(a,b){return a+b;},0)/n, sd=Math.sqrt(Es.reduce(function(a,b){return a+(b-mean)*(b-mean);},0)/n), dev=Math.max.apply(null,Es.map(function(x){return Math.abs(x-mean);}));
  var tol=F.TOL;
  return {act:act,n:n,d:d,metric:'E(completion)',mean:+mean.toFixed(4),sd:+sd.toFixed(4),maxDev:+dev.toFixed(4),tol:tol,unsatisfied:bad,ok:dev<=tol&&bad===0,
    spread:{min:Math.min.apply(null,T),max:Math.max.apply(null,T),of:act==='arena'?'threat':'T_req s'}}; };
/* ---------- registration into the B12 pluggable rule registry ---------- */
['job','skate','arena'].forEach(function(a){ if(Y.fair&&Y.fair.registerRules)Y.fair.registerRules(a,{stub:false,label:F.VERSION,source:'owner-delegated (t56u)',road:a==='job'?F.jobRoad:a==='skate'?F.skateRoad:F.arenaRoad,map:F.MAP[a]}); });
Y.fafifi=F;
})();
