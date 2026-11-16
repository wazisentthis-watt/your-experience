/* YOUR config v1.1 overlay · PROPOSAL_HOLD — owner decision t59u/t60u: the OWNER'S OWN LIKENESS is the playable hero in every game.
   - hero = 'owner' (ChatGPT 18 portrait / 19 walk 4x4 / 20 fight 8 frames → assets/hero/hero_sheet_96.png, built by tools/make_hero.py)
     name placeholder "Hero" (editable in Settings; never invented), stored in the shared WIR hero profile (modules/wir_hero_profile.js).
   - MELLA = companion NPC: follows the hero in the world, talks through the LLM/offline dialogue, small FaFiFi-fair assists in job + skate.
   - v1.2: skate poses (22) and KO / cast frames (23) are native ChatGPT frames; only GRIND reuses the crouch frame.
   Load after your_config_v1.js. */
(function(){
var Y=window.YOUR=window.YOUR||{}, C=Y.config, A='../assets/';
C.version='v1.1';
C.hero='owner'; C.artStyle='owner_starter_v1';
C.heroSheets.owner={asset:'hero_sheet',cols:16,rows:11,frameW:96,frameH:96,rows4:['down','up','left','right'],anims:C.heroSheets.mella.anims,scale:0.62,
  note:'ChatGPT 19 (walk) + 20 (fight) + 22 (skate) + 23 (KO/cast) owner starter look; v1.2: skate/KO/cast native',skateNative:true};
C.assets.hero_sheet=A+'hero/hero_sheet_96.png'; C.assets.hero_portrait=A+'hero/hero_portrait_256.png';
C.companion={id:'mella',name:'Mella',sheet:'mella',followGap:46,trail:90,catchUp:260,
  assist:{job:'spotter: highlights the correct (next in-order empty) slot while you carry a crate',skate:'line caller: points to the next ring of the revealed line; once per run she cancels a Dependency delay after a bail'}};
C.titleArt='cover';   // 'cover' (ChatGPT 21) | 'classic' (ChatGPT 01) — switchable in Settings
})();
