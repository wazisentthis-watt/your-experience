/* PHATOM | RIFFT COURIER original procedural soundscape. No sound assets, CDN or tracking. */
(function bootRifftAudio(root){
  'use strict';
  const KEY='rifft-courier-audio-v2';
  const clamp=(n,min,max)=>Math.min(max,Math.max(min,Number.isFinite(Number(n))?Number(n):min));
  let stored={};
  try{stored=JSON.parse(root.localStorage?.getItem(KEY)||'{}')||{}}catch(e){}
  let volume=clamp(stored.volume===undefined?78:stored.volume,0,100);
  let muted=stored.muted===true;
  let active=false,zone=0,step=0,ctx=null,master=null,loop=null;
  const melody=[
    [48,55,60,67,60,55,51,58],  // Morrow: metallic rain and suspended tension
    [45,52,57,64,57,52,48,55],  // WishBorn: roots, growth and memory
    [40,47,52,59,52,47,55,62]   // Gridiron: charged rhythms
  ];
  function remember(){try{root.localStorage?.setItem(KEY,JSON.stringify({volume,muted}))}catch(e){}}
  function audioReady(){
    try{
      if(!ctx){
        const Audio=root.AudioContext||root.webkitAudioContext;
        if(!Audio)return false;
        ctx=new Audio();
        master=ctx.createGain();
        const limiter=ctx.createDynamicsCompressor();
        limiter.threshold.value=-20;
        limiter.knee.value=12;
        limiter.ratio.value=12;
        limiter.attack.value=.003;
        limiter.release.value=.16;
        master.connect(limiter);
        limiter.connect(ctx.destination);
      }
      if(ctx.state==='suspended')ctx.resume()?.catch?.(()=>{});
      updateGain();
      return true;
    }catch(e){return false}
  }
  function updateGain(){
    if(!ctx||!master)return;
    const target=muted||volume===0?0:Math.pow(volume/100,1.3)*.72;
    master.gain.setTargetAtTime(target,ctx.currentTime,.035);
  }
  function voice(hz,seconds=.14,type='triangle',level=.15,offset=0,bend=1){
    if(!ctx||!master||muted||volume===0||root.document?.hidden)return;
    try{
      const t=ctx.currentTime+offset;
      const source=ctx.createOscillator(),envelope=ctx.createGain();
      source.type=type;
      source.frequency.setValueAtTime(Math.max(30,hz),t);
      if(bend!==1)source.frequency.exponentialRampToValueAtTime(Math.max(30,hz*bend),t+seconds);
      envelope.gain.setValueAtTime(.0001,t);
      envelope.gain.exponentialRampToValueAtTime(Math.max(.0002,level),t+.01);
      envelope.gain.exponentialRampToValueAtTime(.0001,t+seconds);
      source.connect(envelope);envelope.connect(master);
      source.start(t);source.stop(t+seconds+.015);
      source.onended=()=>{source.disconnect();envelope.disconnect()};
    }catch(e){}
  }
  function noise(seconds=.15,level=.13,offset=0){
    if(!ctx||!master||muted||volume===0||root.document?.hidden)return;
    try{
      const buffer=ctx.createBuffer(1,Math.ceil(ctx.sampleRate*seconds),ctx.sampleRate);
      const data=buffer.getChannelData(0);
      for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*(1-i/data.length);
      const source=ctx.createBufferSource(),envelope=ctx.createGain(),filter=ctx.createBiquadFilter();
      filter.type='lowpass';filter.frequency.value=zone===0?2300:zone===1?1200:3600;
      source.buffer=buffer;envelope.gain.value=level;
      source.connect(filter);filter.connect(envelope);envelope.connect(master);
      source.start(ctx.currentTime+offset);source.stop(ctx.currentTime+offset+seconds);
      source.onended=()=>{source.disconnect();filter.disconnect();envelope.disconnect()};
    }catch(e){}
  }
  const midi=n=>440*Math.pow(2,(n-69)/12);
  function tick(){
    if(!active||muted||volume===0||root.document?.hidden||!audioReady())return;
    const row=melody[zone],n=row[step%row.length];
    voice(midi(n),.19,zone===1?'sine':'triangle',.042);
    if(step%4===0)voice(midi(n-12),.31,'sine',.065);
    if(zone===0&&step%4===3)noise(.09,.019);
    if(zone===2&&step%2===1)voice(midi(n+12),.07,'square',.028);
    step++;
  }
  function startMusic(){if(loop!==null||!active||muted||volume===0)return;loop=root.setInterval(tick,380)}
  function stopMusic(){if(loop!==null){root.clearInterval(loop);loop=null}}
  function setActive(value){active=!!value;if(active){if(audioReady())startMusic()}else stopMusic();return active}
  function setZone(value){zone=clamp(Math.trunc(value),0,2);step=0}
  function setVolume(value){volume=clamp(value,0,100);remember();updateGain();if(volume===0)stopMusic();else if(active)startMusic();return volume}
  function setMuted(value){muted=!!value;remember();updateGain();if(muted)stopMusic();else if(active)startMusic();return muted}
  function play(kind,power=0){
    if(muted||volume===0||!audioReady())return false;
    const p=clamp(Math.trunc(power),0,2);
    switch(kind){
      case 'cast':
        voice([165,245,350][p],.26,p===2?'sawtooth':'triangle',.27,0,2.3);
        voice([330,410,560][p],.2,'square',.13,.04,.8);
        noise(.14,.09);break;
      case 'hit':voice(170,.36,'sawtooth',.29,0,.3);noise(.27,.22);break;
      case 'collect':voice(540,.13,'sine',.19);voice(810,.16,'triangle',.16,.09);voice(1080,.23,'sine',.18,.18);break;
      case 'switch':voice(360+p*100,.10,'triangle',.15,0,1.6);break;
      case 'dash':noise(.18,.17);voice(240,.17,'sawtooth',.13,0,2.8);break;
      case 'portal':voice(140,.62,'sine',.23,0,3);voice(220,.58,'triangle',.16,.10,2);noise(.4,.12);break;
      case 'victory':for(let i=0;i<6;i++)voice(midi(60+[0,4,7,12,16,19][i]),.4,'triangle',.13,i*.13);break;
      case 'start':voice(330,.16,'triangle',.13);voice(495,.24,'sine',.18,.10);break;
      default:voice(440,.11,'sine',.1);break;
    }
    return true;
  }
  function snapshot(){return Object.freeze({volume,muted,active,zone})}
  root.RifftAudio=Object.freeze({play,setActive,setZone,setVolume,setMuted,toggleMuted:()=>setMuted(!muted),snapshot});
  root.document?.addEventListener?.('visibilitychange',()=>{if(root.document.hidden)stopMusic();else if(active&&!muted)startMusic()});
})(window);
