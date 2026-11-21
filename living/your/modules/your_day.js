/* YOUR day / economy — B07 · PROPOSAL_HOLD.
   Payouts + XP per activity are the Y.O.U.R. slice values (job +$45/+20xp, skate +$30/+25xp, football +$50/+30xp, arena +$60/+40xp).
   Sources: Living WIR advance/onNewDay/grantWork (clock + new-day reset), WishBorn nextDay, Y.O.U.R. jobDone/snapshot/sleep.
   PROPOSED (no source value): RATE 2 game-min per real second, day 06:00→24:00, energy COST table, forced sleep at 0 energy or 24:00. */
(function(){
'use strict';
var Y=window.YOUR=window.YOUR||{};
var PAY={job:45,skate:30,football:50,arena:60};          // Y.O.U.R. slice
var XP={job:20,skate:25,football:30,arena:40};            // Y.O.U.R. slice
var FLAG={job:'job',skate:'skate',football:'football',arena:'combat'}; // Y.O.U.R. flag names
var COST={job:20,skate:15,football:20,arena:25};          // PROPOSED
var RATE=2, DAY_START=360, DAY_END=1440;                  // PROPOSED
var d={PAY:PAY,XP:XP,COST:COST,RATE:RATE,DAY_START:DAY_START,DAY_END:DAY_END,minutes:DAY_START,menuOpen:false,onSleep:null,lastRefusal:null};
function P(){ return Y.profile.data; }
d.pausedReason=function(){ if(Y.npc&&Y.npc.isOpen())return 'dialogue'; if(d.menuOpen)return 'menu'; if(Y.hud&&Y.hud.blocking&&Y.hud.blocking())return 'menu'; return null; };
d.clock=function(){ var m=Math.floor(d.minutes),h=Math.floor(m/60)%24; return (h<10?'0':'')+h+':'+((m%60)<10?'0':'')+(m%60); };
d.canStart=function(a){ return P().energy>=COST[a]; };
d.start=function(a){ if(!(a in COST))throw new Error('unknown activity '+a);
  if(!d.canStart(a)){ d.lastRefusal=a; if(Y.hud)Y.hud.toast('Too tired for '+a+' (needs '+COST[a]+' energy). Sleep at home.'); return false; }
  Y.profile.add('energy',-COST[a]); Y.profile.event('start',{a:a}); return true; };
d.complete=function(a,opts){ opts=opts||{}; var amt=PAY[a]; if(Y.fair&&Y.fair.applyPayout)amt=Y.fair.applyPayout(a,amt);
  Y.profile.earn(amt,a); Y.profile.gainXP(XP[a]); P().flags[FLAG[a]]=true; if(Y.hub&&opts.report!==false)Y.hub.report(a,{win:true,score:opts.score||0}); Y.profile.save(); return amt; };
d.fail=function(a,extraEnergy){ if(extraEnergy)Y.profile.add('energy',-extraEnergy); if(Y.hub)Y.hub.report(a,{win:false,score:0}); Y.profile.save(); };
d.sleep=function(reason){ var p=P(); p.day+=1; p.energy=p.maxEnergy; p.stamina=p.maxStamina; p.hp=p.maxHp; d.minutes=DAY_START;
  ['job','skate','football','combat','storeCount','talk_mara','talk_dex'].forEach(function(k){delete p.flags[k];});
  Y.profile.event('sleep',{reason:reason||'bed'}); Y.profile.save(); if(Y.hud)Y.hud.toast('Day '+p.day+' — saved'); if(d.onSleep)d.onSleep(reason); return p.day; };
d.update=function(dt){ if(d.pausedReason())return false; d.minutes+=RATE*dt;
  if(d.minutes>=DAY_END){ d.sleep('midnight'); return true; } if(P().energy<=0){ d.sleep('exhausted'); return true; } return false; };
Y.day=d;
})();
