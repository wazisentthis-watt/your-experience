/* YOUR profile — B03 · PROPOSAL_HOLD. Persistent character profile + versioned save.
   Field names/starting values: Y.O.U.R. slice newPlayer (money 20, xp 0, hp 100, stam 100, en 0) + PHATOM Fusion hub fresh()
   (lvl 1, buff null, results [], rival 0) and gainXP need()=100*lvl. Living WIR save/spend/pay shapes.
   PROPOSED constants (not in any source):
     MAX_ENERGY = 100   daily energy pool (Y.O.U.R. "en" is the arena burst meter, kept separately as `burst`)
     LOG_MAX    = 20    events kept
     SAVE_KEY   = "your-save-v1" */
(function(){
'use strict';
var Y=window.YOUR=window.YOUR||{};
var SAVE_KEY='your-save-v1', VERSION=1, LOG_MAX=20, MAX_ENERGY=100; // PROPOSED (see header)
var P={SAVE_KEY:SAVE_KEY,VERSION:VERSION,data:null,warnings:[],storage:null};
function st(){ return P.storage||window.localStorage; }
P.create=function(name){ return P.data={v:VERSION,name:String(name||'You').slice(0,22),
  hp:100,maxHp:100,stamina:100,maxStamina:100,energy:MAX_ENERGY,maxEnergy:MAX_ENERGY,burst:0,
  money:20,xp:0,lvl:1,pow:1,spd:1,day:1,rel:{},buff:null,rival:0,week:0,results:[],flags:{},log:[],pos:{x:0,y:0},
  look:{hero:null,style:null}}; };
P.migrate=function(o){ if(!o||typeof o!=='object')return null;
  if(!o.v){ /* v0 = Y.O.U.R. slice snapshot shape {P:{name,money,xp},flags,day,pos} or bare object */
    var src=o.P||o, n=P.create(src.name||'You'); n.money=+src.money||n.money; n.xp=+src.xp||0; n.flags=o.flags||{}; n.day=o.day||1; if(o.pos)n.pos=o.pos; n.log.unshift({t:'migrated v0→v1'}); return n; }
  if(o.v>VERSION){P.warnings.push('save from newer version '+o.v);}
  var base=P.create(o.name); for(var k in base)if(!(k in o))o[k]=base[k]; return o; };
P.save=function(){ try{ st().setItem(SAVE_KEY,JSON.stringify(P.data)); return true; }catch(e){ P.warnings.push('save failed: '+e.message); return false; } };
P.load=function(){ var raw=null; try{ raw=st().getItem(SAVE_KEY); }catch(e){}
  if(!raw)return null; var o; try{ o=JSON.parse(raw); }catch(e){ var w='corrupt save ignored ('+e.message+')'; P.warnings.push(w); console.warn('[YOUR profile] '+w); return P.create('You'); }
  return P.data=P.migrate(o)||P.create('You'); };
P.loadOrCreate=function(name){ return P.load()||P.create(name); };
P.clear=function(){ try{st().removeItem(SAVE_KEY);}catch(e){} };
P.event=function(t,extra){ var e={t:t,day:P.data.day}; if(extra)for(var k in extra)e[k]=extra[k]; P.data.log.unshift(e); P.data.log.length=Math.min(P.data.log.length,LOG_MAX); return e; };
P.earn=function(amount,reason){ amount=Math.round(+amount||0); P.data.money+=amount; P.event('earn',{amount:amount,reason:reason}); if(Y.hud&&Y.hud.toast)Y.hud.toast('+$'+amount+' '+(reason||'')); return P.data.money; };
P.spend=function(amount,reason){ amount=Math.round(+amount||0); if(amount<0||amount>P.data.money)return false; P.data.money-=amount; P.event('spend',{amount:amount,reason:reason}); return true; };
P.need=function(){ return 100*P.data.lvl; }; /* PHATOM hub need() */
P.gainXP=function(n){ var d=P.data; d.xp+=n; var up=0; while(d.xp>=P.need()){ d.xp-=P.need(); d.lvl++; d.pow+=0.05; d.spd+=0.03; up++; P.event('level',{lvl:d.lvl}); } return up; }; /* PHATOM gainXP */
P.setStat=function(k,v){ var d=P.data,mx={hp:'maxHp',stamina:'maxStamina',energy:'maxEnergy'}[k]; d[k]=Math.max(0,Math.min(mx?d[mx]:Infinity,v)); return d[k]; };
P.add=function(k,dv){ return P.setStat(k,P.data[k]+dv); };
Y.profile=P;
})();
