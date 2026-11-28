/* WIR Y.O.U.R. Mission Pack 02 | live episode layer
 * Additive to Mission Board v1: world markers, staged radio dialogue, and
 * guarded two-machine Ghost Sweep encounter. No original files or saves changed.
 * Dialogue is new playable PROPOSAL, not a replacement for established canon.
 */
(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root && root.document) {
    root.WIRMissionEpisodes = api;
    if (root.document.readyState === 'loading')
      root.document.addEventListener('DOMContentLoaded', function () { api.mount(root.document, root); }, { once: true });
    else api.mount(root.document, root);
  }
})(typeof window !== 'undefined' ? window : null, function () {
  'use strict';
  var TILE = 32;
  var DIALOGUE = Object.freeze({
    street_watch: {
      start: ['MARA', 'Dex flagged unusual signals near three landmarks. Check the market, field, and gym before the trail goes cold.'],
      steps: [
        ['DEX', 'Market is open, but the dock sensors keep flickering. Check the next location.'],
        ['COACH FLO', 'The field is clear. Whatever stirred up the city was not one of my players.'],
        ['MARA', 'The gym entrance is secure. Now we can compare all three readings.']
      ],
      finish: ['MELLA', 'Street Watch complete. We have a clearer picture of what is moving through Savannah.']
    },
    veyru_signal: {
      start: ['MARA', 'Veyru is picking up an unfamiliar pulse near the skate park. Follow the trail.'],
      steps: [
        ['VEYRU', 'A short chirr breaks into an alert purr. Veyru watches the path ahead.'],
        ['MARA', 'Good. The Calm signal is steady again. Your bond is doing real work.']
      ],
      finish: ['MELLA', 'Veyru Signal contained. Keep listening to your companion.']
    },
    first_wish: {
      start: ['MELLA', 'A crown cannot stand without roots. Find a stable place and let the circuit teach you its rhythm.'],
      steps: [
        ['COACH FLO', 'The gym floor is steady. Set your feet and work through the complete chain.'],
        ['MARA', 'Root. Core. Crown. Three signals, one continuous circuit.']
      ],
      finish: ['MELLA', 'The Three-Layer Circuit held. Technique gives your power a direction.']
    },
    ghost_sweep: {
      start: ['MARA', 'Two rogue ghost machines split away from the raids. If you want to intercept them, activate the Ghost Sweep encounter.'],
      steps: [
        ['METAL', 'Ghost signatures have gone quiet. Both machines are isolated.']
      ],
      encounter: ['MELLA', 'Contact! Two machines in the street. Protect the block and isolate both targets.'],
      finish: ['MARA', 'Ghost Sweep cleared. The neighborhood is safer because you stopped them.']
    }
  });
  function finite(n) { return typeof n === 'number' && Number.isFinite(n); }
  function own(o, k) { return Object.prototype.hasOwnProperty.call(o || {}, k); }
  function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
  function activeState(win) {
    try {
      var H = win && win.WIR_HERO, M = win && win.WIRMissions;
      if (!H || !M || typeof H.get !== 'function' || typeof M.valid !== 'function') return null;
      if (!win.__VL || !win.__VL.S) return null;
      var profile = H.get(), saved = profile && profile.games && profile.games.your_missions;
      return M.valid(saved && saved.data);
    } catch (e) { return null; }
  }
  function currentTarget(state, snapshot) {
    if (!state || !state.active || !snapshot || snapshot.map !== 'SAV' ||
        !Array.isArray(snapshot.objects)) return null;
    var m = state.active, mission = null;
    for (var i = 0; i < ['street_watch','veyru_signal','first_wish'].length; i++)
      if (m === ['street_watch','veyru_signal','first_wish'][i]) { mission = m; break; }
    if (!mission) return null;
    var steps = mission === 'street_watch'
      ? [{key:'market',label:'SAHELATRIX MARKET'},{key:'field',label:'GRIDIRON BOLT FIELD'},{key:'gym',label:'CORNER GYM'}]
      : mission === 'veyru_signal' ? [{key:'park',label:'SKATE PARK'}]
      : [{key:'gym',label:'CORNER GYM'}];
    for (var n = 0; n < steps.length; n++) {
      if (state.progress && state.progress[n] === true) continue;
      var target = steps[n];
      var obj = snapshot.objects.find(function (o) { return o && o.id === target.key; });
      if (obj && Array.isArray(obj.use) && finite(obj.use[0]) && finite(obj.use[1]))
        return {x:obj.use[0],y:obj.use[1],label:target.label,key:target.key};
    }
    return null;
  }
  function screenPoint(target, camera, width, height) {
    if (!target || !camera || !finite(target.x) || !finite(target.y) ||
        !finite(camera.x) || !finite(camera.y) || !finite(camera.s) ||
        camera.s <= 0 || !finite(width) || !finite(height) || width <= 0 || height <= 0) return null;
    var x = width / 2 + (target.x - camera.x) * TILE * camera.s;
    var y = height / 2 + (target.y - camera.y) * TILE * camera.s;
    var margin = Math.min(44, width/4, height/4);
    return {x:clamp(x,margin,width-margin),y:clamp(y,margin,height-margin),
      offscreen:x<margin || x>width-margin || y<margin || y>height-margin,
      direction:Math.atan2(y-height/2,x-width/2)};
  }
  function arrowForDirection(angle) {
    if(!finite(angle))return '⌖';
    var arrows=['→','↘','↓','↙','←','↖','↑','↗'];
    return arrows[(Math.round(angle/(Math.PI/4))+8)%8];
  }
  function worldSnapshot(win) {
    var V=win&&win.__VL, G=V&&V.G;
    if (!V || !V.S || !G || !G.map || !finite(G.px) || !finite(G.py)) return null;
    return {map:G.map.id,x:G.px,y:G.py,objects:G.map.objs||[],w:G.w,h:G.h,cam:G.cam,mapData:G.map};
  }
  function spawnPositions(map, px, py, count) {
    count = count || 2;
    if (!map || !Number.isSafeInteger(map.w) || !Number.isSafeInteger(map.h) ||
        !map.block || map.block.length !== map.w*map.h ||
        map.w*map.h > 100000 || !finite(px) || !finite(py) ||
        count < 1 || count > 4) return [];
    var sx=Math.floor(px),sy=Math.floor(py),w=map.w,h=map.h;
    if(sx<0||sy<0||sx>=w||sy>=h||map.block[sy*w+sx])return [];
    var visited=new Uint8Array(w*h), queue=[sy*w+sx], candidates=[];
    visited[queue[0]]=1;
    for(var qi=0;qi<queue.length;qi++) {
      var id=queue[qi], x=id%w,y=(id/w)|0, dist=Math.hypot(x+.5-px,y+.5-py);
      if(dist>=3.5&&dist<=8.5)candidates.push({x:x+.5,y:y+.5,dist:dist});
      if(dist>12)continue;
      var adj=[[x-1,y],[x+1,y],[x,y-1],[x,y+1]];
      for(var k=0;k<adj.length;k++) {
        var nx=adj[k][0],ny=adj[k][1],j=ny*w+nx;
        if(nx<1||ny<1||nx>=w-1||ny>=h-1||visited[j]||map.block[j])continue;
        visited[j]=1;queue.push(j);
      }
    }
    candidates.sort(function(a,b){return Math.abs(a.dist-5.5)-Math.abs(b.dist-5.5);});
    var chosen=[];
    for(var q=0;q<candidates.length;q++){
      var p=candidates[q],ok=chosen.every(function(o){return Math.hypot(p.x-o.x,p.y-o.y)>=5;});
      if(ok){chosen.push({x:p.x,y:p.y});if(chosen.length===count)break;}
    }
    return chosen.length===count?chosen:[];
  }
  function encounterPlan(win, state) {
    if (!state || state.active!=='ghost_sweep') return {ok:false,reason:'Accept GHOST SWEEP first.'};
    var snap=worldSnapshot(win);
    if (!snap||snap.map!=='SAV')return {ok:false,reason:'Return to Savannah before starting this encounter.'};
    var V=win.YOUR_V23, C=win.YOUR_V23_CONFIG, G=win.__VL.G;
    if(!V||typeof V.spawn!=='function'||!Array.isArray(V.foes)||
       !C||!C.machines||!C.machines.loader||!C.machines.lifter)
       return {ok:false,reason:'The METAL combat module is not ready.'};
    if(G.fade||G.fb||G.lab||G.sheet||G.yourAct||win.__VL.S.busy||
       (V.raid)||(V.site&&V.site.state==='live')||(V.boss&&!V.boss.done))
       return {ok:false,reason:'Finish the current activity or combat event first.'};
    if(V.foes.some(function(f){return f && f.st!=='down';}))
       return {ok:false,reason:'Clear the current machines before launching another encounter.'};
    var spots=spawnPositions(snap.mapData,snap.x,snap.y,2);
    if(spots.length!==2)return {ok:false,reason:'Move to an open Savannah street to start the encounter.'};
    return {ok:true,spots:spots};
  }
  function spawnEncounter(win, state) {
    var plan=encounterPlan(win,state);
    if(!plan.ok)return plan;
    var V=win.YOUR_V23, foes=[];
    try {
      ['loader','lifter'].forEach(function(kind,i) {
        var pos=plan.spots[i], foe=V.spawn(kind,pos.x,pos.y);
        if (!foe) throw new Error('spawn returned no enemy');
        foe.src='mission_ghost_sweep';
        foes.push(foe);
      });
    } catch(e) {
      foes.forEach(function(foe){var i=V.foes.indexOf(foe);if(i>=0)V.foes.splice(i,1);});
      return {ok:false,reason:'Encounter could not start. Try another street.'};
    }
    return {ok:true,foes:foes,spots:plan.spots};
  }
  function dialogueEvents(before, after) {
    var events=[];
    if(!before||!after)return events;
    if(before && after.active && before.active!==after.active && DIALOGUE[after.active])
      events.push(DIALOGUE[after.active].start);
    if(before && before.active && before.active===after.active) {
      var lines=DIALOGUE[after.active]&&DIALOGUE[after.active].steps||[];
      (after.progress||[]).forEach(function(value,i){
        if(value===true && !((before.progress||[])[i]) && lines[i])events.push(lines[i]);
      });
    }
    var old=before&&before.completed||[],now=after.completed||[];
    now.forEach(function(id){
      if(old.indexOf(id)<0 && DIALOGUE[id])events.push(DIALOGUE[id].finish);
    });
    return events;
  }
  function mount(doc,win) {
    var board=doc.getElementById('wirMissionBoard'),stage=doc.getElementById('stage'),
      inner=board&&board.querySelector('.wm-content');
    if(!board||!stage||!inner||doc.getElementById('wirMissionEpisodeTools'))return false;
    var css=doc.createElement('style');css.id='wirMissionEpisodeCSS';
    css.textContent=[
      '#wirMissionEpisodeTools{padding:10px;border:1px solid #4a546b;border-radius:10px;margin:12px 0;background:#19283a}',
      '#wirMissionEpisodeTools[hidden],#wirMissionPin[hidden],#wirMissionRadio[hidden]{display:none!important}',
      '#wirMissionEpisodeTools button,#wirMissionRadio button{border:1px solid #78d5c7;background:#145c57;color:white;font:700 12px system-ui;border-radius:9px;padding:8px 11px;min-height:38px;margin:3px}',
      '#wirMissionEpisodeTools .wm-hint{font:12px/1.4 system-ui;color:#c8deec}',
      '#wirMissionPin{position:absolute;z-index:7;pointer-events:none;text-align:center;max-width:155px;transform:translate(-50%,-100%);transition:left .12s linear,top .12s linear}',
      '#wirMissionPin .wm-beacon{display:inline-block;background:#10a997;color:#071915;border:2px solid #e5fdf7;border-radius:50%;width:29px;height:29px;font:900 19px/27px system-ui;box-shadow:0 0 0 4px rgba(21,208,176,.19)}',
      '#wirMissionPin .wm-place{display:block;margin:3px auto 0;background:rgba(15,25,38,.91);border:1px solid #67e6d6;border-radius:6px;padding:3px 5px;color:white;font:800 10px system-ui}',
      '#wirMissionRadio{position:absolute;z-index:12;bottom:9px;left:9px;width:min(310px,72%);box-sizing:border-box;background:#121d2d;color:#f4fcff;border:1px solid #6dd5c9;border-radius:12px;padding:10px 11px;box-shadow:0 6px 20px rgba(0,0,0,.5)}',
      '#wirMissionRadio .wm-speaker{font:900 12px system-ui;letter-spacing:.07em;color:#68e5d2}',
      '#wirMissionRadio .wm-line{font:13px/1.4 system-ui;margin:6px 0;color:#f4f5ff}',
      '#wirMissionRadio .wm-foot{display:flex;justify-content:flex-end;gap:4px}',
      '@media(max-width:360px){#wirMissionPin .wm-place{font-size:9px}#wirMissionRadio{bottom:5px;left:5px;width:min(290px,80%);padding:7px}}',
      '@media(prefers-reduced-motion:reduce){#wirMissionPin{transition:none}}'
    ].join('');
    doc.head.appendChild(css);
    var extra=doc.createElement('div');extra.id='wirMissionEpisodeTools';extra.hidden=true;
    extra.innerHTML='<strong>📡 MISSION COMMS</strong><p class="wm-hint">Hear the mission briefing or launch a two-machine Ghost Sweep encounter.</p>'+
      '<button type="button" data-wm-replay>Replay briefing</button>'+
      '<button type="button" data-wm-encounter hidden>Launch Ghost Sweep encounter</button>'+
      '<p class="wm-hint" data-wm-status aria-live="polite"></p>';
    inner.appendChild(extra);
    var marker=doc.createElement('div');marker.id='wirMissionPin';marker.hidden=true;
    marker.setAttribute('aria-label','Mission objective waypoint');
    marker.innerHTML='<span class="wm-beacon">⌖</span><span class="wm-place"></span>';
    stage.appendChild(marker);
    var radio=doc.createElement('aside');radio.id='wirMissionRadio';radio.hidden=true;
    radio.setAttribute('aria-live','polite');radio.setAttribute('aria-label','Mission story dialogue');
    radio.innerHTML='<div class="wm-speaker"></div><p class="wm-line"></p><div class="wm-foot"><button type="button" data-wm-next>Continue</button><button type="button" data-wm-dismiss>Dismiss</button></div>';
    stage.appendChild(radio);
    var queue=[],prev=null,hasPrior=false,shown=false,currentLine=null,latest=null,lastLaunch=0;
    var message=extra.querySelector('[data-wm-status]');
    function putDialogue(line) {
      if(!Array.isArray(line)||line.length!==2)return;
      queue.push(line);
      if(queue.length>7)queue.shift();
    }
    function canShow() {
      var phone=doc.getElementById('phone'),start=doc.getElementById('start');
      var G=win.__VL&&win.__VL.G;
      return !!(win.__VL&&win.__VL.S&&!G?.fade&&!G?.sheet&&!G?.fb&&!G?.lab &&
        (!phone||phone.hidden)&&(!start||start.hidden)&&board.hidden);
    }
    function advance() {
      if(!canShow()||!queue.length)return;
      var line=queue.shift();currentLine=line;
      radio.querySelector('.wm-speaker').textContent=line[0];
      radio.querySelector('.wm-line').textContent=line[1];
      radio.hidden=false;shown=true;
    }
    radio.querySelector('[data-wm-next]').addEventListener('click',function(){
      radio.hidden=true;shown=false;currentLine=null;advance();
    });
    radio.querySelector('[data-wm-dismiss]').addEventListener('click',function(){
      queue.length=0;radio.hidden=true;shown=false;currentLine=null;
    });
    extra.querySelector('[data-wm-replay]').addEventListener('click',function(){
      var s=activeState(win);if(!s||!s.active)return;
      putDialogue(DIALOGUE[s.active].start);
      message.textContent='Briefing queued. Close the phone and resume the city.';
    });
    extra.querySelector('[data-wm-encounter]').addEventListener('click',function(){
      var state=activeState(win);
      var p=encounterPlan(win,state);
      if(!p.ok){message.textContent=p.reason;return;}
      // Close mission and phone overlays before creating enemies, so the game can process inputs immediately.
      var back=board.querySelector('button[data-action="close"]'),phoneBack=doc.getElementById('pClose');
      if(back&&typeof back.click==='function')back.click();
      if(phoneBack&&typeof phoneBack.click==='function')phoneBack.click();
      var result=spawnEncounter(win,state);
      if(!result.ok){message.textContent=result.reason;return;}
      lastLaunch=Date.now();
      putDialogue(DIALOGUE.ghost_sweep.encounter);
      message.textContent='Two original ghost machines deployed. Use the current combat controls.';
    });
    function tick(){
      var state=activeState(win),snapshot=worldSnapshot(win);
      if(!state||!snapshot) {marker.hidden=true;extra.hidden=true;radio.hidden=true;shown=false;return;}
      latest=state;
      if(!hasPrior) {prev=state;hasPrior=true;}
      else {
        var events=dialogueEvents(prev,state);
        events.forEach(putDialogue);
        prev=state;
      }
      extra.hidden=!state.active;
      var encounter=extra.querySelector('[data-wm-encounter]');
      encounter.hidden=state.active!=='ghost_sweep';
      if(state.active==='ghost_sweep' && !board.hidden) {
        var plan=encounterPlan(win,state);
        message.textContent=plan.ok?'Deploy two ghost machines in reachable city streets.':plan.reason;
      }
      var target=currentTarget(state,snapshot),cam=snapshot.cam,pos=target&&screenPoint(target,cam,snapshot.w,snapshot.h);
      var gameOpen=canShow();
      if(pos&&gameOpen) {
        marker.hidden=false;marker.style.left=pos.x+'px';marker.style.top=pos.y+'px';
        marker.querySelector('.wm-place').textContent=(pos.offscreen?arrowForDirection(pos.direction)+' ':'')+target.label;
      } else marker.hidden=true;
      if(!gameOpen){if(shown&&currentLine)queue.unshift(currentLine);currentLine=null;radio.hidden=true;shown=false;}
      else if(!shown)advance();
    }
    var timer=win.setInterval(tick,120);
    tick();
    return {tick:tick,dispose:function(){win.clearInterval(timer);},play:function(line){putDialogue(line);},
      getState:function(){return latest;},getQueued:function(){return queue.slice();},lastLaunch:function(){return lastLaunch;}};
  }
  return Object.freeze({DIALOGUE:DIALOGUE,activeState:activeState,currentTarget:currentTarget,screenPoint:screenPoint,
    spawnPositions:spawnPositions,encounterPlan:encounterPlan,spawnEncounter:spawnEncounter,arrowForDirection:arrowForDirection,
    dialogueEvents:dialogueEvents,worldSnapshot:worldSnapshot,mount:mount});
});
