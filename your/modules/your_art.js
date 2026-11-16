/* YOUR art slots · PROPOSAL_HOLD — ChatGPT screen/art images with drawn fallbacks.
   Drop-in: put the PNGs in /workspace/game-recovery/your-art/chatgpt/ (names per your-art/ART_REQUESTS.md) and run
     python3 tools/sync_chatgpt_art.py
   That copies/derives them into assets/chatgpt/ and rewrites assets/chatgpt/manifest.js. Only files listed in the manifest are
   requested, so a missing image never triggers a file:// load error; every slot falls back to a drawn placeholder. */
(function(){
var Y=window.YOUR=window.YOUR||{};
var SLOTS={title:'01_TITLE_SCREEN',menu_bg:'02_MAIN_MENU_BG',panel:'03_PAUSE_AND_RESULTS_PANEL',map:'04_NEIGHBORHOOD_TOP_DOWN_MAP',tileset:'05_NEIGHBORHOOD_TILESET',
  store:'06_STORE_INTERIOR',crates:'07_CRATES_AND_SHELVES_SPRITES',mara:'08_MARA_PORTRAIT',dex:'09_DEX_PORTRAIT',drone:'10_TRAINING_DRONE',rivals:'11_ARENA_RIVALS',
  hub_bg:'12_HUB_BG',sleep_bg:'13_SLEEP_DAY_END_BG',sikee_portrait:'14_SIKEE_PORTRAIT',sikee_walk:'15_SIKEE_WALK_SHEET',sikee_combat:'16_SIKEE_COMBAT_SHEET',sikee_intro:'17_SIKEE_BOSS_INTRO',
  hero_portrait:'18_OWNER_STARTER_PORTRAIT',hero_walk:'19_OWNER_STARTER_WALK_SHEET',hero_fight:'20_OWNER_STARTER_FIGHT_SHEET',cover:'21_OFFICIAL_COVER',hero_skate:'22_OWNER_STARTER_SKATE_SHEET',hero_ko_cast:'23_OWNER_STARTER_KO_CAST_SHEET',hero_run_jump:'24_OWNER_RUN_JUMP_SHEET',hero_climb_dash:'25_OWNER_CLIMB_DASH_SLIDE_SHEET',hero_fly:'26_OWNER_FLY_SHEET',hero_swim_special:'27_OWNER_SWIM_SPECIAL_SHEET'};
var art={SLOTS:SLOTS,img:{},base:'../assets/chatgpt/',loaded:false};
art.manifest=function(){ return window.YOUR_ART_MANIFEST||{files:{}}; };
art.has=function(slot){ return !!art.img[slot]; };
art.get=function(slot){ return art.img[slot]||null; };
art.load=function(){ var m=art.manifest().files||{}, jobs=[];
  Object.keys(m).forEach(function(slot){ var f=m[slot]; if(!f)return; jobs.push(new Promise(function(res){ var im=new Image(); im.onload=function(){ art.img[slot]=im; res(); }; im.onerror=function(){ res(); }; im.src=art.base+f; })); });
  return Promise.all(jobs).then(function(){ art.loaded=true; return Object.keys(art.img); }); };
/* draw an image to cover a rect (crop to fill), returns false when the slot is empty so callers draw their placeholder */
art.cover=function(g,slot,x,y,w,h,alpha){ var im=art.img[slot]; if(!im)return false; var s=Math.max(w/im.width,h/im.height),sw=w/s,sh=h/s;
  g.save(); if(alpha!=null)g.globalAlpha=alpha; g.drawImage(im,(im.width-sw)/2,(im.height-sh)/2,sw,sh,x,y,w,h); g.restore(); return true; };
art.contain=function(g,slot,x,y,w,h){ var im=art.img[slot]; if(!im)return false; var s=Math.min(w/im.width,h/im.height); g.drawImage(im,x+(w-im.width*s)/2,y+(h-im.height*s)/2,im.width*s,im.height*s); return true; };
/* panel: ChatGPT panel frame stretched, else drawn rounded panel with teal trim */
art.roundRect=function(g,x,y,w,h,r){ g.beginPath(); g.moveTo(x+r,y); g.arcTo(x+w,y,x+w,y+h,r); g.arcTo(x+w,y+h,x,y+h,r); g.arcTo(x,y+h,x,y,r); g.arcTo(x,y,x+w,y,r); g.closePath(); };
/* panel: dark fill + ChatGPT frame drawn 9-slice (corners kept square-scaled), else a drawn rounded panel with teal trim */
art.panel=function(g,x,y,w,h){ g.save(); g.fillStyle='rgba(14,18,28,.94)'; art.roundRect(g,x,y,w,h,16); g.fill();
  var im=art.img.panel; if(im){ var c=Math.round(im.width*0.16),d=Math.min(44,w/3,h/3),W=im.width,H=im.height;
    var sx=[0,c,W-c,W],sy=[0,c,H-c,H],dx=[x-8,x-8+d,x+w+8-d,x+w+8],dy=[y-8,y-8+d,y+h+8-d,y+h+8];
    for(var i=0;i<3;i++)for(var j=0;j<3;j++){ if(i===1&&j===1)continue; g.drawImage(im,sx[i],sy[j],sx[i+1]-sx[i],sy[j+1]-sy[j],dx[i],dy[j],dx[i+1]-dx[i],dy[j+1]-dy[j]); } }
  else { g.strokeStyle='#2ec4b6'; g.lineWidth=3; art.roundRect(g,x,y,w,h,16); g.stroke(); }
  g.restore(); };
/* placeholder label so every fallback is obviously a fallback */
art.placeholderTag=function(g,slot,x,y){ g.save(); g.font='11px system-ui'; g.textAlign='left'; g.fillStyle='rgba(255,255,255,.45)'; g.fillText('[placeholder · drop '+SLOTS[slot]+'.png]',x,y); g.restore(); };
Y.art=art;
})();
