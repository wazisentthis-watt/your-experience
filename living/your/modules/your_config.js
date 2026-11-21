/* YOUR config + asset manifest · PROPOSAL_HOLD.
   OPEN DECISIONS kept swappable here: main character (hero), art style, FaFiFi rules outside football.
   All bitmap assets are copies from your-teardown/library (sha256-named); provenance in assets/ASSETS.json.
   Never add third-party / excluded IP art (see AI_COLLABORATOR_GUIDE.md). */
(function(){
var Y=window.YOUR=window.YOUR||{};
var A='../assets/';
Y.config={
  status:'PROPOSAL_HOLD',
  hero:'neutral',          // OPEN DECISION: 'neutral' (procedural placeholder) | 'wishborn' (WishBorn hero sheet placeholder)
  artStyle:'neutral',      // OPEN DECISION: neutral flat placeholders until owner picks pixel / painted / neon
  heroSheets:{
    neutral:{generator:'neutral',cols:4,rows:4,frameW:48,frameH:64,rows4:['down','up','left','right']},
    wishborn:{asset:'hero_wishborn',cols:4,rows:4,frameW:72,frameH:96,rows4:['down','up','left','right']} // verified by eye: row0 down,1 up,2 left,3 right
  },
  assets:{
    hero_wishborn:A+'adda483bc8a7c4b0.png',
    npc_mara:A+'npc0_livingwir.png', npc_dex:A+'npc1_livingwir.png',
    rider_atlas:A+'rider_atlas_rifft.png', board:A+'board_rifft.png', rail:A+'rail_rifft.png', ramp:A+'ramp_rifft.png',
    crowd:A+'crowd_extreme.png'
  },
  rider:{cols:8,rows:6,frame:48,dirs:['east','southeast','south','southwest','west','northwest','north','northeast'],poses:['ride','push','crouch','ollie','kickflip','grind']}, // RIFFT wir100 manifest
  fair:{footballRules:'rulebook_s5',otherActivities:'stub'} // OPEN DECISION: non-football FaFiFi rules are NOT defined
};
})();
