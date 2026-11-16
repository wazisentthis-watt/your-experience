/* YOUR Fusion hub — B13 · PROPOSAL_HOLD. Port of PHATOM Fusion hub 1.0 (phatom_bay.html <script id="hubrt">):
   season of weeks rotating through the parts, ending in a final; one shared profile (lvl, coins→money, record); a buff earned in one part
   carried into the next (one use, +15% pow|spd); a rival that grows on losses; speedFor() clamp 0.75–1.3.
   PHATOM values kept: week xp 40+12k, coins 15+6k; win → rival -0.5 (min 0), buff {val .15, uses 1}; loss → xp/4, rival +1;
   free play (unscheduled) → +15 xp win / +5 loss; speedFor = 1 + .04*rival - .02*(lvl-1) - (.08 if buff) ; levels need 100*lvl.
   Adaptation: parts = job, skate, football, arena; order rotates those 4 for 9 weeks + final (PHATOM used k%3==2 for its "mix" part — YOUR has none).
   Rival names: PHATOM RIVALS list. Results only through YOUR.hub.report(activity,{win,score}). */
(function(){
'use strict';
var Y=window.YOUR=window.YOUR||{};
var PARTS=['job','skate','football','arena'];
var RIVALS=['Iron Tide','Night Owls','Red Static','Gold Rush','Storm Kings','Ghost Line','Ember Crew','Black Lotus','Thunder Row','The Hollow']; // PHATOM
var WEEKS=[]; (function(){ for(var k=0;k<10;k++){ var part=PARTS[k%PARTS.length], fin=k===9; WEEKS.push({part:part,name:part,vs:(fin?'Championship: ':'')+RIVALS[k%RIVALS.length],xp:40+12*k,coins:15+6*k,final:fin}); } })();
var H={WEEKS:WEEKS,PARTS:PARTS};
function S(){ var d=Y.profile.data; if(!d.hub)d.hub={week:0,results:[],rec:{},rival:0,buff:null,trophies:[],log:[]}; return d.hub; }
H.state=function(){ return S(); };
H.speedFor=function(){ var s=S(),d=Y.profile.data,t=1+0.04*s.rival-0.02*(d.lvl-1)-(s.buff&&s.buff.uses>0?0.08:0); return Math.max(0.75,Math.min(1.3,Math.round(t*100)/100)); };
H.current=function(){ return WEEKS[S().week]||null; };
H.activeBuff=function(activity){ var b=S().buff; return (b&&b.uses>0&&b.from!==activity)?b:null; };
H.report=function(activity,res){ var s=S(),d=Y.profile.data,won=!!(res&&res.win), wk=WEEKS[s.week], out={activity:activity,won:won};
  var r=s.rec[activity]||{w:0,l:0}; won?r.w++:r.l++; s.rec[activity]=r;
  var b=s.buff; if(b&&b.uses>0&&b.from!==activity){ b.uses--; out.buffUsed=b.kind; s.log.unshift('Buff used in '+activity+': +15% '+b.kind); if(b.uses<=0)s.buff=null; }
  var scheduled=wk&&wk.part===activity;
  if(!scheduled){ Y.profile.gainXP(won?15:5); s.log.unshift('Free play — '+activity+': '+(won?'won':'lost')); out.scheduled=false; Y.profile.save(); return out; }
  s.results[s.week]=won?'W':'L'; out.scheduled=true; out.week=s.week;
  if(won){ Y.profile.gainXP(wk.xp); d.money+=wk.coins; s.rival=Math.max(0,s.rival-0.5); var kind=(res&&res.buffKind)||((s.week%2)?'spd':'pow'); s.buff={kind:kind,val:0.15,uses:1,from:activity}; out.buffEarned=kind;
    s.log.unshift('Week '+(s.week+1)+': beat '+wk.vs+' in '+activity+'. +'+wk.xp+' XP, +'+wk.coins+' coins, +15% '+kind+' next activity.'); if(wk.final)s.trophies.push('Champion'); if(r.w===3)s.trophies.push('3 wins in '+activity); }
  else { Y.profile.gainXP(Math.round(wk.xp/4)); s.rival+=1; s.log.unshift('Week '+(s.week+1)+': lost to '+wk.vs+' in '+activity+'. The rival gets tougher.'); }
  s.week=Math.min(WEEKS.length,s.week+1); Y.profile.save(); return out; };
/* hub scene: shared profile + season board */
H.enter=function(){}; H.exit=function(){};
H.update=function(){ var I=Y.input; if(I.pressed('a')&&Y.core.scene.has('world'))Y.core.scene.go('world',{from:'home'}); };
H.render=function(g){ var s=S(),d=Y.profile.data,W=Y.core.W; g.fillStyle='#14161f'; g.fillRect(0,0,W,540);
  g.fillStyle='#ffb347'; g.font='bold 24px system-ui'; g.textAlign='left'; g.fillText('FUSION HUB — Season',230,44);
  g.fillStyle='#dde'; g.font='15px system-ui'; g.fillText(d.name+' · Lv '+d.lvl+' · $'+d.money+' · rival '+s.rival+' · speed x'+H.speedFor()+(s.buff?' · buff +15% '+s.buff.kind+' (from '+s.buff.from+')':''),230,72);
  WEEKS.forEach(function(w,i){ var x=40+(i%5)*176,y=110+Math.floor(i/5)*120,res=s.results[i]; g.fillStyle=i===s.week?'#2a3350':'#1d2130'; g.fillRect(x,y,164,100);
    g.fillStyle=res==='W'?'#7dffb0':res==='L'?'#ff5d73':'#889'; g.font='bold 14px system-ui'; g.fillText('Week '+(i+1)+(w.final?' FINAL':'')+(res?' · '+res:''),x+10,y+22);
    g.fillStyle='#ccd'; g.font='13px system-ui'; g.fillText(w.part.toUpperCase(),x+10,y+44); g.fillText('vs '+w.vs.replace('Championship: ',''),x+10,y+64); g.fillText('+'+w.xp+' XP · +$'+w.coins,x+10,y+84); });
  g.fillStyle='#aab'; g.font='13px system-ui'; s.log.slice(0,5).forEach(function(l,i){ g.fillText(l,40,380+i*20); });
  if(Y.hud)Y.hud.render(g); };
Y.hub=H; if(Y.core)Y.core.scene.register('hub',H);
})();
