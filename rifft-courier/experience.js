/* PHATOM RIFFT COURIER • presentation director • PROPOSAL / PUBLISH HOLD */
(()=>{'use strict';
const api=window.PHATOM;if(!api)throw Error('PHATOM bridge missing');
const scene=document.createElement('section');scene.id='experience';scene.setAttribute('role','dialog');scene.setAttribute('aria-modal','true');scene.setAttribute('aria-labelledby','x-title');
scene.innerHTML='<div class="x-card"><div class="x-kicker" id="x-kicker">WHAT IS REALITY • PHATOM</div><h2 id="x-title">RIFFT COURIER</h2><p id="x-body"></p><div class="x-steps" id="x-steps" aria-hidden="true"></div><div class="x-actions"><button type="button" id="x-back">Back</button><button type="button" id="x-next">Begin</button><button type="button" id="x-skip">Skip</button></div><small>WIR-inspired experimental story • Not canon locked</small></div>';document.body.append(scene);
const title=scene.querySelector('#x-title'),body=scene.querySelector('#x-body'),kicker=scene.querySelector('#x-kicker'),steps=scene.querySelector('#x-steps'),nextButton=scene.querySelector('#x-next'),backButton=scene.querySelector('#x-back'),skipButton=scene.querySelector('#x-skip');
const prologue=[
['THE SILVER RAIN','Morrow City experiences a metallic storm. Little Heavy detects six objects dropping through a fresh RIFFT. Something between the worlds has come loose.'],
['THREE WORLDS, ONE WOUND','The fragments scatter from Morrow City to the living roots of WishBorn and the charged field of Elemental Gridiron. Each district starts shifting.'],
['THE COURIER CONTRACT','Recover the fragments and carry them back to the relay. You are not conquering these places. You are keeping their stories connected.']
];
const tutorial=[
['MOVE WITH INTENTION','Walk with the left stick, WASD or arrow keys. On mobile, hold the four direction buttons. Touch a glowing fragment to collect it.'],
['SHAPE THE ELEMENTS','Press A or CAST to use an elemental pulse. Press Y, E or Power to switch between ROOT, METAL and ION. Pulses push anomalies away.'],
['BRING IT HOME','Return to the central relay once both fragments in a district are collected. Press B, Shift or DASH to move quickly. Pause with Start, P or Escape.']
];
const crossings=[
['ROOTS BEHIND THE RAIN','WishBorn is listening. Its living garden remembers routes that maps have forgotten. Gather two more fragments.'],
['THE FIELD IS CHARGED','The Gridiron has become an ion field. Two final fragments remain in a stadium where the sky will not sit still.']
];
let view='title',step=0,previousConfirm=false,previousStart=false,previousSkip=false;
function paint(){
 const status=api.snapshot();let item,header='PHATOM • RIFFT COURIER',advance='Continue',back=false,skip=false,list=null;
 if(view==='title'){item=['RIFFT COURIER','Silver rain over Morrow City. Six unstable fragments. Three connected WIR districts. One courier who can keep their stories from collapsing.'];advance=status.done?'New Run':status.fragments.length?'Continue Saved Run':'Accept Contract'}
 if(view==='intro'){list=prologue;item=list[step];header='PROLOGUE • STORY EXPERIMENT';advance=step===list.length-1?'Learn Controls':'Continue';back=true;skip=true}
 if(view==='tutorial'){list=tutorial;item=list[step];header='COURIER TRAINING';advance=step===list.length-1?'Start Playing':'Next Tip';back=true;skip=true}
 if(view==='pause'){item=['MISSION PAUSED','Your collected fragments and district progress are safely stored on this device. Return whenever you are ready.'];header='SYSTEM MENU';advance='Resume Mission';back=true}
 if(view==='crossing'){item=crossings[Math.min(crossings.length-1,Math.max(0,status.zone-1))];header='RIFFT CROSSING • DISTRICT '+(status.zone+1);advance='Enter District'}
 if(view==='victory'){item=['REALITY RESTORED','All six fragments recovered. Three districts stabilized. The courier returns home, but the RIFFT remembers every world you visited.'];header='MISSION COMPLETE';advance='Play Again'}
 if(view==='restart'){item=['START A NEW RUN?','This replaces the saved courier position, hearts, fragments and selected power on this device.'];header='CONFIRM RESET';advance='Confirm New Run';back=true}
 if(!item)return;
 kicker.textContent=header;title.textContent=item[0];body.textContent=item[1];nextButton.textContent=advance;backButton.hidden=!back;backButton.textContent=view==='pause'||view==='restart'?'Cancel':'Title';skipButton.hidden=!skip;skipButton.textContent='Skip Intro';steps.replaceChildren();
 if(list)list.forEach((_,i)=>{const dot=document.createElement('i');if(i<=step)dot.className='active';steps.append(dot)})
}
function show(nextView){view=nextView;step=0;api.pause();scene.hidden=false;paint();nextButton.focus()}
function play(){api.resume();scene.hidden=true;document.querySelector('#game').focus({preventScroll:true})}
function advance(){
 const state=api.snapshot();
 if(view==='title'){if(state.done)api.reset();if(state.fragments.length&&!state.done){play();return}show('intro');return}
 if(view==='intro'){if(++step<prologue.length){paint();return}show('tutorial');return}
 if(view==='tutorial'){if(++step<tutorial.length){paint();return}play();return}
 if(view==='pause'||view==='crossing'){play();return}
 if(view==='victory'){api.reset();show('title');return}
 if(view==='restart'){api.reset();show('title')}
}
nextButton.addEventListener('click',advance);
backButton.addEventListener('click',()=>{if(view==='pause'||view==='restart')play();else show('title')});
skipButton.addEventListener('click',play);
const pauseButton=document.createElement('button');pauseButton.id='pause';pauseButton.type='button';pauseButton.textContent='Pause';pauseButton.setAttribute('aria-label','Pause the courier mission');document.querySelector('#reset').before(pauseButton);
pauseButton.addEventListener('click',()=>{if(api.active)show('pause');else if(view==='pause')play()});
document.querySelector('#reset').addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();show('restart')},true);
document.querySelector('#log').setAttribute('role','status');document.querySelector('#log').setAttribute('aria-live','polite');
window.addEventListener('rifft-zone',()=>show('crossing'));
window.addEventListener('rifft-victory',()=>show('victory'));
window.addEventListener('keydown',e=>{if(e.key!=='Escape'&&e.key.toLowerCase()!=='p')return;e.preventDefault();if(e.repeat)return;if(api.active)show('pause');else if(view==='pause')play()});
function menuGamepad(){const pads=navigator.getGamepads?.()||[];const p=Array.from(pads).find(Boolean);const start=!!p?.buttons?.[9]?.pressed,confirm=!!p?.buttons?.[0]?.pressed,skip=!!p?.buttons?.[1]?.pressed;if(scene.hidden){if(start&&!previousStart)show('pause')}else{if((start||confirm)&&!previousConfirm)advance();if(skip&&!previousSkip&&(view==='intro'||view==='tutorial'))play()}previousConfirm=start||confirm;previousStart=start;previousSkip=skip;requestAnimationFrame(menuGamepad)}
requestAnimationFrame(menuGamepad);
show(api.snapshot().done?'victory':'title');
})();