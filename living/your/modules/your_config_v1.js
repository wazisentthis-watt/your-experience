/* YOUR config v1 overlay · PROPOSAL_HOLD — owner decisions of 2026-11-14 (t56u) applied on top of your_config.js.
   - Main character = MELLA (WIR Third Door frames). Villain = SIKEE (Authority Form), sprites DERIVED FROM OWNER ART.
   - FaFiFi for job / skate / arena = OWNER-DELEGATED DESIGN v1 (see FAFIFI_ACTIVITIES.md). Football = Elemental Gridiron v44 via bridge.
   - All PROPOSED numbers from B01–B15 approved and kept.
   Load after your_config.js. B01–B15 tests do not load this file, so they keep testing the neutral defaults. */
(function(){
var Y=window.YOUR=window.YOUR||{}, C=Y.config, A='../assets/';
function mellaAnims(){ var an={},dirs=['down','up','left','right'],cols=16;
  dirs.forEach(function(d,r){ var b=r*cols, R=function(a,n){var o=[];for(var i=0;i<n;i++)o.push(a+i);return o;};
    an['idle_'+d]={frames:R(b,4)}; an['walk_'+d]={frames:R(b+4,8)}; an['cast_'+d]={frames:R(b+12,4)}; });
  var F={idle:[0,1],strike:[2,3,4],block:[5,6],hit:[7,8],cast:[9,10,11,12],ko:[13,14,15]};
  Object.keys(F).forEach(function(k){ an['fight_'+k+'_right']={frames:F[k].map(function(i){return 4*cols+i;})}; an['fight_'+k+'_left']={frames:F[k].map(function(i){return 5*cols+i;})}; });
  return an; }
C.version='v1'; C.status='PROPOSAL_HOLD';
C.hero='mella'; C.artStyle='mella_third_door';   // decided by owner (t56u)
C.heroSheets.mella={asset:'mella_sheet',cols:16,rows:7,frameW:96,frameH:96,rows4:['down','up','left','right'],anims:mellaAnims(),scale:0.62,
  note:'native idle/walk/cast; LEFT idle/walk mirrored from EAST (source west frames duplicate east); fight + skate rows are FALLBACK transforms'};
C.heroSheets.sikee={asset:'sikee_sheet',cols:16,rows:6,frameW:96,frameH:96,rows4:['down','up','left','right'],anims:mellaAnims(),scale:0.78,
  note:'DERIVED FROM OWNER ART (sikee_authority_form_turnaround.jpg)'};
C.assets.mella_sheet=A+'mella/mella_sheet_96.png'; C.assets.mella_portrait=A+'mella/mella_portrait.png';
C.assets.sikee_sheet=A+'sikee/sikee_sheet_96.png'; C.assets.sikee_front=A+'sikee/ref/sikee_front.png'; C.assets.sikee_right34=A+'sikee/ref/sikee_right34.png';
C.skateRow=6; C.skatePoses=['ride','push','crouch','ollie','kickflip','grind','bail'];
C.fair={footballRules:'rulebook_s5 via Elemental Gridiron v44',otherActivities:'OWNER-DELEGATED DESIGN v1',reality:75};
C.football={mode:'eg44',url:'../football/eg44/index.html#your-bridge',practiceFallback:true};
C.villain={id:'sikee',name:'SIKEE',form:'Authority Form',bossHp:160,storyStatus:'PROPOSED'};
})();
