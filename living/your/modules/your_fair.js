/* YOUR FaFiFi fairness layer — B12 · PROPOSAL_HOLD.
   Law: "Do not make the players equal. Make the road fair."
   FOOTBALL rules implemented verbatim from WIR_RETRO_BOWL_Elemental_Gridiron_Gameplay_Power_Interaction_Rulebook.md §5 (lines 453–513):
   - Equity Line: names one unequal road (short field, weak-side coverage, tired anchor, route family, weather/terrain cue); both sides see it;
     never grants a catch, speed boost or score — only a visible choice and a recorded consequence.
   - Fixed Finish / Perfect 30 (Q4, Reality 75+): +3 line to gain, +2 correct pre-snap shell read, +1 positive play w/ ball security,
     +1 bond exchange (max 2 per drive), -3 sack/TFL/offensive penalty, -5 turnover; cap 30; at 30 → one finish window on next legal snap:
     primary route readable +180 ms; meter resets to 0 after the snap. Defense can earn its own Perfect 30.
   - Route Attack: 3-down sequence (reveal → safer branch only if read → finish route or forced checkdown); first down ends it preserving the
     consequence; sack/turnover/penalty ends it against the offense; reward = route option/information, never an automatic first down.
   - Dependency Attack: broken bond → next linked action +120 ms reaction load or +2 energy; counters: change concept, protect bond, accept checkdown.
   NON-FOOTBALL activities (job, skate, arena): OPEN DECISION — not defined by any source. Pluggable stub only (YOUR.fair.registerRules).
   PROPOSED: meter floor 0 (rulebook gives only the cap). */
(function(){
'use strict';
var Y=window.YOUR=window.YOUR||{};
var LAW='Do not make the players equal. Make the road fair.';
var POINTS={line_to_gain:3,shell_read:2,positive_secure:1,bond_exchange:1,sack:-3,tfl:-3,off_penalty:-3,turnover:-5};
var CAP=30, WINDOW_MS=180, BOND_MAX=2, DEP_MS=120, DEP_ENERGY=2;
var EQUITY={football:[{id:'short_field',label:'Short field'},{id:'weak_side',label:'Weak-side coverage'},{id:'tired_anchor',label:'Tired anchor'},{id:'route_family',label:'Route family'},{id:'weather',label:'Weather/terrain cue'}]};
var F={LAW:LAW,POINTS:POINTS,CAP:CAP,WINDOW_MS:WINDOW_MS,EQUITY:EQUITY,rules:{},log:[]};
function rec(t,o){ var e={t:t}; for(var k in o)e[k]=o[k]; F.log.push(e); return e; }
/* --- Equity Line --- */
F.equity={ pick:function(activity,rng){ var r=F.rules[activity]; if(r&&r.stub)return {stub:true,activity:activity,label:'FaFiFi rules for '+activity+': PENDING OWNER DECISION'};
    var L=EQUITY[activity]; if(!L)return null; var c=L[Math.floor((rng||Math.random)()*L.length)]; return rec('equity',{activity:activity,id:c.id,label:c.label,visibleToBoth:true}); },
  choose:function(cond,choice,consequence){ return rec('equity_choice',{id:cond.id,choice:choice,consequence:consequence||null}); } };
F.applyPayout=function(activity,amount){ return amount; }; /* Equity Line never changes payouts (asserted in tests) */
/* --- Fixed Finish / Perfect 30 --- */
F.Meter=function(side){ this.side=side||'offense'; this.value=0; this.armed=false; this.bonds=0; this.history=[]; };
F.Meter.prototype.eligible=function(ctx){ return !!ctx&&ctx.quarter===4&&ctx.reality>=75; };
F.Meter.prototype.add=function(ev,ctx){ if(!this.eligible(ctx))return this.value; var p=POINTS[ev]; if(p===undefined)throw new Error('unknown event '+ev);
  if(ev==='bond_exchange'){ if(this.bonds>=BOND_MAX)return this.value; this.bonds++; }
  this.value=Math.max(0,Math.min(CAP,this.value+p)); this.history.push([ev,p,this.value]); if(this.value>=CAP)this.armed=true; return this.value; };
F.Meter.prototype.newDrive=function(){ this.bonds=0; };
F.Meter.prototype.snap=function(){ var w=this.armed?{readableMs:WINDOW_MS,firstBreakHidden:false}:null; if(this.armed){ this.value=0; this.armed=false; rec('finish_window',{side:this.side}); } return w; };
/* --- Route Attack --- */
F.RouteAttack=function(){ this.down=1; this.active=true; this.read=false; this.outcome=null; this.consequence=null; };
F.RouteAttack.prototype.play=function(r){ /* r: {firstDown, negative:'sack'|'turnover'|'penalty', read:bool} */
  if(!this.active)return this;
  if(r.negative){ this.active=false; this.outcome='ended_against_offense'; return this; }
  if(r.firstDown){ this.active=false; this.outcome='first_down'; this.consequence=this.consequence||'route_consequence_preserved'; return this; }
  if(this.down===1){ this.consequence='route_problem_revealed'; this.down=2; }
  else if(this.down===2){ this.read=!!r.read; this.branch=this.read?'safer_branch_offered':'no_branch'; this.down=3; }
  else { this.active=false; this.outcome=r.finishRoute?'finish_route':'forced_checkdown'; this.reward='route_option_or_information'; }
  return this; };
/* --- Dependency Attack --- */
F.Dependency=function(){ this.broken=false; };
F.Dependency.prototype.attack=function(success){ if(success)this.broken=true; return this.broken; };
F.Dependency.prototype.counter=function(kind){ if(['change_concept','protect_bond','accept_checkdown'].indexOf(kind)>=0){ this.broken=false; return true; } return false; };
F.Dependency.prototype.nextLinkedAction=function(mode){ if(!this.broken)return {reactionMs:0,energy:0}; this.broken=false; return mode==='energy'?{reactionMs:0,energy:DEP_ENERGY}:{reactionMs:DEP_MS,energy:0}; };
/* --- pluggable rules for other activities (OPEN DECISION) --- */
F.registerRules=function(activity,impl){ F.rules[activity]=impl; };
['job','skate','arena'].forEach(function(a){ F.registerRules(a,{stub:true,label:'PENDING OWNER DECISION — no FaFiFi rule defined for '+a}); });
F.rulesFor=function(activity){ return activity==='football'?{source:'rulebook_s5',stub:false}:(F.rules[activity]||{stub:true}); };
Y.fair=F;
})();
