/* WIR Y.O.U.R. | Savannah Mission Board v1
 * LIVE gameplay-tracked quests. No changes to existing Valence, V20-24, Nimbus,
 * sprite art or controller inputs. Progress under wir.hero/1 games.your_missions.
 * Each condition reads actual player/map/power/combat state; no fake completions.
 */
(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root && root.document) {
    root.WIRMissions = api;
    if (root.document.readyState === 'loading')
      root.document.addEventListener('DOMContentLoaded', function () { api.mount(root.document, root); }, { once:true });
    else api.mount(root.document, root);
  }
})(typeof window !== 'undefined' ? window : null, function () {
  'use strict';
  var MISSIONS = Object.freeze([
    { id:'street_watch', name:'STREET WATCH', tag:'Exploration', blurb:'Someone is watching the neighborhood. Check the places people depend on before the streets get quiet.',
      steps:[{kind:'visit',key:'market',name:'Reach Sahelatrix Market'},
        {kind:'visit',key:'field',name:'Reach Gridiron Bolt Field'},
        {kind:'visit',key:'gym',name:'Reach Sahelatrix Corner Gym'}],
      help:'Walk around Savannah. Get close to each building entrance. All stops count in any order.', reward:'Neighborhood Watch badge' },
    { id:'veyru_signal', name:'VEYRU SIGNAL', tag:'Companion', blurb:'Veyru notices a ripple around the park. Check the site and calm your companion to steady your bond.',
      steps:[{kind:'visit',key:'park',name:'Investigate the Savannah skate park'},
        {kind:'counter',key:'calm',amount:1,name:'Successfully use CALM near Veyru'}],
      help:'Walk to the park, then use the MELLA CALM power near Veyru (C / power pad).', reward:'Veyru Signal badge' },
    { id:'first_wish', name:'THREE-LAYER CIRCUIT', tag:'Powers', blurb:'The First Wish responds to precise order, not raw force. Prove your technique at the gym.',
      steps:[{kind:'visit',key:'gym',name:'Visit Sahelatrix Corner Gym'},
        {kind:'counter',key:'circuit',amount:1,name:'Complete ROOT → CORE → CROWN circuit'}],
      help:'Visit the gym. Outdoors, use ROOT, CORE, CROWN in sequence within the circuit window (1 / 2 / 3 or MELLA pad).',reward:'Living Circuit badge' },
    { id:'ghost_sweep', name:'GHOST SWEEP', tag:'Combat', blurb:'Labor Ghosting machines are moving through Savannah. Stop two before they reach the next block.',
      steps:[{kind:'counter',key:'isolated',amount:2,name:'Isolate two METAL ghost machines'}],
      help:'In Savannah, start the existing raid with the button below (or the city raid beacon). Use combat powers to isolate two machines.',reward:'Ghost Sweep badge' }
  ]);
  var MISSION_IDS = MISSIONS.map(function (m) { return m.id; });
  var SCHEMA = 'wir.missions/1', SESSION = String(Date.now()) + ':' + Math.random().toString(36).slice(2);
  function mission(id) { return MISSIONS.find(function (m) { return m.id === id; }) || null; }
  function empty() { return {schema:SCHEMA, active:null, completed:[], progress:[], baseline:{}, session:''}; }
  function valid(raw) {
    if (!raw || raw.schema !== SCHEMA) return empty();
    var state = empty();
    state.completed = Array.isArray(raw.completed) ? raw.completed.filter(function (id,i,a) {return MISSION_IDS.indexOf(id)>=0 && a.indexOf(id)===i;}) : [];
    state.active = mission(raw.active) && state.completed.indexOf(raw.active)<0 ? raw.active : null;
    state.progress = state.active && Array.isArray(raw.progress) ? mission(state.active).steps.map(function (_,i) {return raw.progress[i]===true;}) : [];
    state.baseline = {};
    ['calm','circuit','isolated'].forEach(function (k) { var n=raw.baseline && raw.baseline[k];state.baseline[k]=Number.isFinite(n)&&n>=0?Math.floor(n):0; });
    state.session = typeof raw.session === 'string' && raw.session.length<90 ? raw.session : '';
    return state;
  }
  function context(snap) {
    if (!snap || !snap.ready) return null;
    return {ready:true, map:snap.map, x:snap.x, y:snap.y, objects:snap.objects || [],
      calm:Math.max(0,Math.floor(snap.calm||0)),circuit:Math.max(0,Math.floor(snap.circuit||0)),
      isolated:Math.max(0,Math.floor(snap.isolated||0))};
  }
  function counters(ctx) {return {calm:ctx.calm,circuit:ctx.circuit,isolated:ctx.isolated};}
  function begin(raw,id,ctx,session) {
    var r=valid(raw), m=mission(id), c=context(ctx);
    if (!m || !c || r.active || r.completed.indexOf(id)>=0) return null;
    r.active=id;r.progress=m.steps.map(function () {return false;});
    r.baseline=counters(c);r.session=session || SESSION;return r;
  }
  function abandon(raw) {var r=valid(raw);r.active=null;r.progress=[];r.baseline={};r.session='';return r;}
  function next(raw,snap,session) {
    var r=valid(raw),ctx=context(snap);
    if (!r.active || !ctx) return {state:r,changed:false,finished:null};
    var m=mission(r.active),changed=false;
    if (r.session !== (session||SESSION)) {
      // Nonpersistent V22 use counters reset when the game is reloaded; persistent combat totals do not.
      // Keep already achieved objectives, but require new successful actions for unfinished steps.
      r.session=session||SESSION;r.baseline.calm=ctx.calm;r.baseline.circuit=ctx.circuit;changed=true;
    }
    m.steps.forEach(function (step,i) {
      if (r.progress[i]) return;
      var ok=false;
      if (step.kind === 'visit') {
        if (ctx.map !== 'SAV') return;
        var obj=ctx.objects.find(function (o) {return o && o.id === step.key;});
        var spot=obj && obj.use;
        ok=Array.isArray(spot) && spot.length>=2 && Number.isFinite(spot[0]) &&
          Number.isFinite(spot[1]) && Math.hypot(ctx.x-spot[0],ctx.y-spot[1])<=1.8;
      } else if (step.kind === 'counter') ok=ctx[step.key]-r.baseline[step.key]>=step.amount;
      if (ok) {r.progress[i]=true;changed=true;}
    });
    var finished=null;
    if (r.progress.every(Boolean)) {
      finished=r.active;r.completed.push(finished);r.active=null;r.progress=[];
      r.baseline={};r.session='';changed=true;
    }
    return {state:r,changed:changed,finished:finished};
  }
  function totalIsolated(record) {
    var map=record && record.isolated;
    return map && typeof map === 'object' ? Object.keys(map).reduce(function (sum,k) {
      var n=Number(map[k]);return sum+(Number.isFinite(n)&&n>0?Math.floor(n):0);
    },0) : 0;
  }
  function getSnapshot(win) {
    var world=win.__VL, h=world && world.G, s=world && world.S;
    if (!h || !s || !h.map || !Number.isFinite(h.px) || !Number.isFinite(h.py)) return {ready:false};
    var v22=win.YOUR_V22, v23=win.YOUR_V23, counts=v22 && v22.P && v22.P.uses || {};
    var rec=null;
    try { rec=v23 && typeof v23.rec==='function' ? v23.rec() : null; } catch (e) { /* unavailable before combat installs */ }
    return {ready:true,map:h.map.id,x:h.px,y:h.py,objects:h.map.objs || [],
      calm:counts.calm||0,circuit:counts.circuit||0,isolated:totalIsolated(rec)};
  }
  function mount(doc,win) {
    var phone=doc.getElementById('phone'),head=phone && phone.querySelector('.ptop');
    if (!head || doc.getElementById('wirMissionBoard')) return false;
    var trigger=doc.createElement('button');trigger.id='wirMissionOpen';trigger.type='button';
    trigger.textContent='MISSIONS';trigger.setAttribute('aria-label','Open Savannah story missions');
    trigger.style.cssText='min-height:32px;border:1px solid #74c9be;border-radius:9px;background:#14534c;color:#fafffa;padding:6px 8px;font:700 11px system-ui';
    head.insertBefore(trigger,doc.getElementById('pClose')||null);
    var css=doc.createElement('style');css.id='wirMissionsCSS';
    css.textContent=[
      '#phone .ptop h2{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '#wirMissionBoard{position:fixed;inset:0;z-index:8900;overflow:auto;box-sizing:border-box;padding:14px;background:#100e22;color:#f1f6ff;font:14px/1.4 system-ui}',
      '#wirMissionBoard[hidden]{display:none!important}',
      '#wirMissionBoard .wm-content{max-width:670px;margin:0 auto}',
      '#wirMissionBoard h2{font-size:19px;margin:0}',
      '#wirMissionBoard .wm-top{display:flex;justify-content:space-between;align-items:center;gap:12px}',
      '#wirMissionBoard .wm-card{border:1px solid #4e4a79;background:#1b1834;border-radius:12px;padding:13px;margin:10px 0}',
      '#wirMissionBoard .wm-card.selected{border-color:#69d5ba}',
      '#wirMissionBoard .wm-card h3{margin:2px 0 5px;font-size:16px}',
      '#wirMissionBoard p{margin:5px 0;color:#d4cde8}',
      '#wirMissionBoard .wm-muted{color:#b9b0d2;font-size:12px}',
      '#wirMissionBoard .wm-step{padding:5px 0;border-bottom:1px solid #393554}',
      '#wirMissionBoard button{font:700 13px system-ui;background:#1c6761;border:1px solid #7bd4c8;color:#fff;padding:9px 13px;border-radius:9px;min-height:41px;cursor:pointer}',
      '#wirMissionBoard button:disabled{opacity:.5;cursor:default}',
      '#wirMissionBoard button:focus-visible{outline:2px solid #ffe0a0;outline-offset:2px}',
      '#wirMissionBoard button.wm-secondary{background:#312947;border-color:#7c7197}',
      '#wirMissionBoard .wm-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:9px}',
      '#wirMissionHUD{position:absolute;right:8px;top:8px;z-index:6;pointer-events:none;max-width:min(46%,265px);background:rgba(12,32,39,.92);color:#fff;border:1px solid #50cfbb;border-radius:10px;padding:7px 10px;font:700 11px/1.35 system-ui;box-sizing:border-box}',
      '#wirMissionHUD[hidden]{display:none!important}',
      '@media(max-width:380px){#wirMissionBoard{padding:9px}#wirMissionBoard h2{font-size:16px}#wirMissionHUD{font-size:10px}}'
    ].join('');
    doc.head.appendChild(css);
    var board=doc.createElement('section');board.id='wirMissionBoard';board.hidden=true;
    board.setAttribute('role','dialog');board.setAttribute('aria-modal','true');
    board.setAttribute('aria-label','Y.O.U.R. Mission Board');
    board.innerHTML='<div class="wm-content"><div class="wm-top"><h2>🗺️ SAVANNAH MISSIONS</h2><button type="button" data-action="close" class="wm-secondary">Back</button></div>'+
      '<p class="wm-muted">Play missions in the real city. Progress is earned through movement, CALM, powers, and ghost-machine combat. Completed missions unlock permanent hero badges.</p>'+
      '<div id="wirMissionCards"></div></div>';
    doc.body.appendChild(board);
    var stage=doc.getElementById('stage'),hud=doc.createElement('div');hud.id='wirMissionHUD';hud.hidden=true;
    if(stage)stage.appendChild(hud);
    var state=empty(),heroId=null,open=false,lastHUD='',toastBox=doc.getElementById('toasts');
    function saveState() {
      var H=win.WIR_HERO;
      if (!H || typeof H.gameData!=='function') return false;
      try {return !!H.gameData('your_missions',{data:state});} catch(e){return false;}
    }
    function loadState() {
      var H=win.WIR_HERO;
      if(!H)return;
      try {
        var player=H.get();
        if (!player || player.id===heroId) return;
        heroId=player.id;state=valid((player.games.your_missions||{}).data);
      } catch(e){/* leave state unchanged if storage unavailable */}
    }
    function message(text) {
      if(!toastBox)return;
      var t=doc.createElement('div');t.className='toast gold';t.textContent=text;
      toastBox.appendChild(t);win.setTimeout(function(){if(t.parentNode)t.remove();},3400);
    }
    function paintHUD() {
      var m=mission(state.active),ready=!!m && !!(win.__VL && win.__VL.S);
      if(!hud || !ready){if(hud)hud.hidden=true;return;}
      var n=state.progress.filter(Boolean).length;
      var nextStep=m.steps.find(function (_,i){return !state.progress[i];});
      var label=m.name+' · '+n+'/'+m.steps.length+' · '+(nextStep?nextStep.name:'Clear!');
      if(label!==lastHUD){hud.textContent=label;lastHUD=label;}
      hud.hidden=!!(doc.getElementById('start') && !doc.getElementById('start').hidden);
    }
    function draw() {
      loadState();
      var wrap=doc.getElementById('wirMissionCards');if(!wrap)return;
      var html='';
      MISSIONS.forEach(function(m) {
        var done=state.completed.indexOf(m.id)>=0,active=state.active===m.id,
          occupied=!!state.active;
        var steps=active?state.progress:done?m.steps.map(function(){return true;}):m.steps.map(function(){return false;});
        html+='<div class="wm-card'+(active?' selected':'')+'"><p class="wm-muted">'+m.tag+' · '+(done?'CLEARED':active?'ACTIVE':'AVAILABLE')+'</p>'+
          '<h3>'+m.name+'</h3><p>'+m.blurb+'</p>';
        m.steps.forEach(function(s,i){html+='<div class="wm-step">'+(steps[i]?'✅ ':'○ ')+s.name+'</div>';});
        html+='<p class="wm-muted">'+m.help+'</p><p class="wm-muted">Reward: '+m.reward+'</p><div class="wm-actions">';
        if(!done && !active)html+='<button type="button" data-action="accept" data-mission="'+m.id+'"'+(occupied?' disabled':'')+'>Accept mission</button>';
        if(active){html+='<button type="button" data-action="resume">Return to game</button>';
          if(m.id==='street_watch'||m.id==='veyru_signal'||m.id==='first_wish')
            html+='<button type="button" data-action="navigate">Navigate to objective</button>';
          if(m.id==='ghost_sweep')html+='<button type="button" data-action="raid">Start existing raid</button>';
          html+='<button type="button" data-action="abandon" class="wm-secondary">Abandon</button>';}
        html+='</div></div>';
      });
      wrap.innerHTML=html;
    }
    function close(leavePhone) {
      open=false;board.hidden=true;
      if(leavePhone){var phoneClose=doc.getElementById('pClose');if(phoneClose&&phoneClose.click)phoneClose.click();}
      if(trigger.focus&&!leavePhone)trigger.focus();
    }
    function navigate() {
      var m=mission(state.active),world=win.__VL;
      if(!m||!world||!world.G||world.G.map.id!=='SAV') {message('Go outside to Savannah before navigating.');return;}
      var step=m.steps.find(function(s,i){return !state.progress[i]&&s.kind==='visit';});
      if(!step){message('This objective uses powers or combat. Return to the city to continue.');return;}
      var obj=world.G.map.objs.find(function(o){return o.id===step.key;});
      if(!obj||!Array.isArray(obj.use)){message('Destination unavailable.');return;}
      close(true);
      if(!world.walkTo(obj.use[0],obj.use[1])) message('No walking route found. Try another street.');
    }
    function raid() {
      var v23=win.YOUR_V23,world=win.__VL;
      if(!v23||typeof v23.startRaid!=='function'||!world||!world.G||world.G.map.id!=='SAV') {
        message('Raids can only begin outside in Savannah.');return;
      }
      close(true);
      if(!v23.startRaid('wir_mission_board'))message('Raid unavailable. Finish your current activity first.');
    }
    function tick(){
      if(!win.__VL||!win.__VL.S)return;
      loadState();
      var result=next(state,getSnapshot(win),SESSION);
      if(result.changed){
        state=result.state;saveState();
        if(result.finished){
          var m=mission(result.finished);try{win.WIR_HERO.unlock('your:mission_'+result.finished);}catch(e){}
          message('MISSION CLEARED: '+m.name+' · '+m.reward);
        } else message('Mission objective complete!');
        if(open)draw();
      }
      paintHUD();
    }
    trigger.addEventListener('click',function(){loadState();open=true;board.hidden=false;draw();board.querySelector('[data-action="close"]').focus();});
    board.addEventListener('click',function(e){
      var btn=e.target&&e.target.closest&&e.target.closest('button[data-action]');
      if(!btn||btn.disabled)return;
      var act=btn.getAttribute('data-action');
      if(act==='close')close(false);
      else if(act==='resume')close(true);
      else if(act==='navigate')navigate();
      else if(act==='raid')raid();
      else if(act==='accept'){
        var id=btn.getAttribute('data-mission'),fresh=begin(state,id,getSnapshot(win),SESSION);
        if(fresh){state=fresh;saveState();message('MISSION ACCEPTED: '+mission(id).name);draw();paintHUD();}
      }else if(act==='abandon'){state=abandon(state);saveState();draw();paintHUD();}
    });
    doc.addEventListener('keydown',function(e){
      if(open&&e.code==='Escape'){close(false);e.preventDefault();e.stopImmediatePropagation();}
    },true);
    loadState();paintHUD();
    var interval=win.setInterval(tick,250);
    return {tick:tick,dispose:function(){win.clearInterval(interval);},getState:function(){return valid(state);}};
  }
  return Object.freeze({MISSIONS:MISSIONS,SCHEMA:SCHEMA,empty:empty,valid:valid,begin:begin,next:next,
    abandon:abandon,totalIsolated:totalIsolated,getSnapshot:getSnapshot,mount:mount});
});
