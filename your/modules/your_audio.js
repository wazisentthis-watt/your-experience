/* YOUR audio — B15 · PROPOSAL_HOLD. Procedural WebAudio SFX (no files), mute (persisted), master volume, unlock on first input.
   Sources: PHATOM runtime sfx()/music() (AudioContext + gain chain pattern); CCR Bowl WIRFB.Crowd (sample-free WebAudio).
   Sound recipes below are PROPOSED. */
(function(){
'use strict';
var Y=window.YOUR=window.YOUR||{};
var KEY='your-audio-mute';
var RECIPES={ /* type, f0 → f1 Hz, dur s, gain, noise mix */
  step:{type:'triangle',f0:140,f1:90,dur:0.05,gain:0.25,noise:0.6},
  pickup:{type:'square',f0:520,f1:880,dur:0.09,gain:0.2,noise:0},
  coin:{type:'square',f0:988,f1:1319,dur:0.16,gain:0.2,noise:0,two:true},
  hit:{type:'sawtooth',f0:220,f1:60,dur:0.14,gain:0.35,noise:0.5},
  whistle:{type:'sine',f0:2100,f1:2300,dur:0.45,gain:0.18,noise:0.05,vib:true},
  ollie:{type:'triangle',f0:180,f1:420,dur:0.12,gain:0.3,noise:0.3},
  land:{type:'triangle',f0:120,f1:50,dur:0.1,gain:0.35,noise:0.4},
  bail:{type:'sawtooth',f0:300,f1:40,dur:0.4,gain:0.3,noise:0.7},
  menu:{type:'sine',f0:660,f1:660,dur:0.05,gain:0.2,noise:0}};
var a={RECIPES:RECIPES,ctx:null,unlocked:false,master:0.7,muted:false,played:[]};
try{ a.muted=localStorage.getItem(KEY)==='1'; }catch(e){}
a.unlock=function(){ if(a.unlocked)return true; var AC=window.AudioContext||window.webkitAudioContext; if(!AC)return false;
  try{ a.ctx=a.ctx||new AC(); if(a.ctx.state==='suspended')a.ctx.resume(); a.out=a.ctx.createGain(); a.out.gain.value=a.muted?0:a.master; a.out.connect(a.ctx.destination); a.unlocked=true; }catch(e){ return false; } return true; };
['keydown','pointerdown','touchstart'].forEach(function(ev){ window.addEventListener(ev,function(){a.unlock();},{once:true,passive:true}); });
a.setMuted=function(m){ a.muted=!!m; try{localStorage.setItem(KEY,a.muted?'1':'0');}catch(e){} if(a.out)a.out.gain.value=a.muted?0:a.master; };
a.toggleMute=function(){ a.setMuted(!a.muted); return a.muted; };
a.setVolume=function(v){ a.master=Math.max(0,Math.min(1,v)); if(a.out&&!a.muted)a.out.gain.value=a.master; };
a.sfx=function(name){ var r=RECIPES[name]; if(!r)return false; if(!a.unlocked||!a.ctx||a.muted)return false;
  var c=a.ctx,t=c.currentTime,g=c.createGain(); g.gain.setValueAtTime(r.gain,t); g.gain.exponentialRampToValueAtTime(0.001,t+r.dur); g.connect(a.out);
  var o=c.createOscillator(); o.type=r.type; o.frequency.setValueAtTime(r.f0,t); o.frequency.exponentialRampToValueAtTime(Math.max(20,r.f1),t+r.dur);
  if(r.vib){ var l=c.createOscillator(),lg=c.createGain(); l.frequency.value=28; lg.gain.value=120; l.connect(lg).connect(o.frequency); l.start(t); l.stop(t+r.dur); }
  if(r.two)o.frequency.setValueAtTime(r.f1,t+r.dur*0.4);
  var og=c.createGain(); og.gain.value=1-r.noise*0.6; o.connect(og).connect(g); o.start(t); o.stop(t+r.dur+0.02);
  if(r.noise>0){ var n=Math.floor(c.sampleRate*r.dur),b=c.createBuffer(1,n,c.sampleRate),d=b.getChannelData(0); for(var i=0;i<n;i++)d[i]=(Math.random()*2-1)*(1-i/n);
    var s=c.createBufferSource(); s.buffer=b; var ng=c.createGain(); ng.gain.value=r.noise; s.connect(ng).connect(g); s.start(t); }
  a.played.push(name); return true; };
Y.audio=a;
})();
