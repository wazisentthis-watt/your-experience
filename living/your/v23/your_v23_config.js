/* Y.O.U.R. v2.3 config · PROPOSAL_HOLD (PUBLISH HOLD).
   Owner request (t74u, verbatim): "Group we're called the Y O U R Experience, Experience Wonders, and you should be able to fight villains
   and survive raids and all of that type of stuff. You're a super powered person as well."
   Tags:  METAL  = value or text copied from METAL: IN DA RIFFT · RIFFT City Siege build
                   (metal-all/files/METAL:_IN_DA_RIFFT/2D/_unversioned/octec_engine_pmk-pnk-camera-shelf_games_rifft-city-siege.html,
                    sha256 6c45eaa8a37699cd62d59cf1470c4f13979fdab3a0cac2a191b40504e115124f; same MACHINE_DEFS in v9/v10/v16/v17 builds).
                   In that file the boss NAMES / tiers / lines are marked "CANON (S1 villain ladder)" and every fight design is marked PROPOSAL.
          NIMBUS = wir_mella_combat.js v1.2.0 (Drive 1OlJ2W4ERednZPKK4Oiyk2DNumV-RwQkG), vendored unchanged at your/v23/vendor/ (sha256 a6aa3384…f517).
          V7     = The First Wish · Mella V7 (via your_v22_config.js).
          PROPOSED = new in v2.3, not owner-approved (how a METAL / Nimbus rule lands in the Valence city, scales, wave order, rewards). */
window.YOUR_V23_CONFIG = {
  version: 'v2.3', status: 'PROPOSAL_HOLD',
  brand: { name: 'Y.O.U.R. Experience', tagline: 'Experience Wonders', full: 'Y.O.U.R. Experience — Experience Wonders',
    ownerWords: "Group we're called the Y O U R Experience, Experience Wonders", ownerMsg: 't74u', note: 'Exact punctuation/casing of the group name is UNCONFIRMED: owner dictated "Y O U R Experience, Experience Wonders".' },

  /* ---- scale: METAL world px → Valence tiles. METAL TUNE.TILE = 64 px (METAL); Valence T = 32 px per tile. 1 METAL tile = 1 Valence tile (PROPOSED). */
  scale: { metalTilePx: 64, drawK: 0.75 /* PROPOSED sprite draw scale on the 32 px Valence map */ },

  /* ---- hero survivability (METAL TUNE.HP 5, hurtMetal inv 1.1 s, knock 240 px/s; transformed = hits absorbed (METAL "PROPOSAL armour");
          dodge i-frames .34 s (METAL partner dodge); knocked-out recovery 2.4 s then full HP + 1.5 s grace (METAL "ALLY DOWN · RECOVERING")) */
  hero: { hp: 5, invHit: 1.1, knockPx: 240, dodgeInv: .34, koTime: 2.4, koGrace: 1.5, airDodgeZ: 50 /* METAL |p.z-m.z|<50 */, transformAbsorbs: true },

  /* ---- enemies: METAL MACHINE_DEFS, verbatim (px, s). hp = METAL hits. "Metal doesn't destroy people: he isolates machines." */
  machines: {
    loader:   { name: 'GHOSTED LOADER', hp: 3, speed: 150, r: 20, tele: .55, atk: .45, dash: 400, reach: 34 },
    lifter:   { name: 'GHOSTED LIFTER', hp: 5, speed: 75,  r: 26, tele: .75, atk: .35, sweep: 78, reach: 78 },
    walker:   { name: 'WALKER',         hp: 2, speed: 190, r: 16, tele: .4,  atk: .3,  dash: 460, reach: 30, spr: 1.05 },
    scout:    { name: 'SCOUT BOT',      hp: 1, speed: 160, r: 14, tele: .5,  atk: .35, dash: 520, reach: 40, hover: 46, spr: 1 },
    breacher: { name: 'BREACHER',       hp: 6, speed: 60,  r: 24, tele: .7,  atk: .35, sweep: 70, reach: 70, shield: true, spr: 1.15 }
  },
  machineRules: { wake: .8, wakeStep: .2, stun: .45, recover: [.9, .6] /* chase again after .9+rand*.6 s */, downFade: 2.2, turn: 3, accel: 4, shieldDot: .35 },  // METAL
  hpUnit: 18,          // PROPOSED: 1 METAL hit = 18 Nimbus damage (18 = Nimbus default unarmed baseDamage), so enemy HP = METAL hp × 18
  defender: { loader: 'Advance', lifter: 'Guard', walker: 'Flank', scout: 'Crown', breacher: 'Guard', ballast: 'Guard', glassjaw: 'Crown' },  // PROPOSED CCR stance per enemy (Nimbus defMap)
  /* METAL MACHINE_SITES compositions n:[loader,lifter,walker,scout,breacher] + the METAL escalation rule (lvl = clears, +1 loader if lvl>1, +1 lifter if lvl>2) */
  sites: {
    fab:     { name: 'FOUNDRY YARD',      n: [2, 1, 0, 0, 1] },
    transit: { name: 'TRANSIT DEPOT',     n: [2, 0, 1, 1, 0] },
    gyre:    { name: 'GYRE PLATFORM',     n: [1, 1, 2, 0, 1] },
    flood:   { name: 'FLOOD PUMPHOUSE',   n: [2, 1, 0, 2, 0] },
    bowls:   { name: 'BOWLS SERVICE LOT', n: [1, 1, 2, 1, 0] }
  },
  siteCool: 150, siteAbandonPx: 1600,  // METAL: site cool-down after a clear; walking 1600 px away powers the machines down

  /* ---- free-roam work site in the Valence city (PROPOSED placement; METAL wakes a site at 560 px — here the hero must step onto the marker) */
  citySite: { id: 'plaza', label: 'Plaza work site · LABOR GHOSTING', comp: 'transit', x: 21.5, y: 6.5, startTiles: 1.3 },

  /* ---- bosses: names, tiers, episode, lessons, lines = METAL CANON (S1 villain ladder). Fight numbers = METAL PROPOSAL fight design. No sprite exists → placeholder art. */
  bosses: {
    ballast: { name: 'BALLAST', tier: 'Daily · 3/10', ep: 'S1E1 · Concrete Has a Tempo', lesson: 'A harness shifts dense mass. He can’t make infinite weight.',
      intro: '"You can’t move me."', outro: ['BALLAST: "You can’t move me."', 'METAL: "Didn’t plan to."'],
      cycle: { firstFree: 2.2, tele: .8, braced: [1.3, 1.5, 1.7], free: [2.8, 2.2, 1.7] }, wave: { speed: 470, max: 560, band: 14, groundZ: 8 }, phases: [66, 33],
      how: 'You can’t move him. Move what he’s standing on: ROOT / CORE / CROWN under him between shifts. After every KA CHUNK his harness braces. JUMP the shockwaves.' },
    glassjaw: { name: 'GLASSJAW', tier: 'Daily · 3.5/10', lesson: 'Metastable coatings: stiff, brittle — structural fraud.', intro: 'Direct hits fail.',
      outro: ['"Strong ain’t the same thing as tough."'], landR: 190, stressN: 3, stressDmg: 10, torsionT: .9, torsionDmg: 11, torsionR: 260,
      charge: { first: 4, tele: .7, speed: 300, max: 1.5, cool: 2.6, contact: 40 }, drift: [30, 22, .4, .53], phases: [66, 33],
      unlock: { needs: 'ballast', eventsDone: 3 },   // METAL: Glassjaw appears after Ballast is stopped and 3 events are done
      how: 'Direct hits fail. Off-axis pressure (ROOT / CORE under him) and repeated landings (JUMP near him) crack the coating. Phase 3: he charges.' }
  },
  winCard: 'Contained — not killed. Nobody gets killed here.',    // METAL
  retreatLine: 'RETREATED — {name} will be waiting',               // METAL

  /* ---- raid: PROPOSED wave order using METAL site compositions; boss wave last */
  raid: { name: 'RAID ON THE STARTER FLAT BLOCK', beacon: { x: 7.5, y: 13.5 }, waves: ['transit', 'fab', 'gyre', 'flood'], rest: 4, spawnMin: 5, spawnMax: 8,
    reward: { gross: 60 /* v2.0 arena/boss rate */, oncePerDay: true, bond: 2 }, abandonTiles: 25 /* = METAL 1600 px */ },

  /* ---- Nimbus wiring (PROPOSED mapping of the V7 kit onto Nimbus lanes; damage = WIRMellaCombat.executeMellaCombatFrame) */
  nimbus: { hit: 'melee', blast: 'B', root: 'A', core: 'X', crown: 'Y', transformHitK: 15 / 9 /* V7 hit 15 vs 9 */,
    hitRangePx: 125 /* METAL STRIKE_RANGE */, hitArc: 1.7, hitClosePx: 38 /* METAL Siege */, crownRangeTiles: 4, dashRamDmgHits: 1 /* METAL Boost Ram */,
    starOnIsolate: 1, calmRegulates: true, circuitChargeIntensity: 1 },

  /* ---- Veyru assists (PROPOSED, Water+Plant KAW): auto snare every 6.2 s (V7 CCR enemy beat), calm pulse stuns 1.3 s (FaFiFi arena stagger) */
  veyru: { snareEvery: 6.2, snareStun: .45, snareRangePx: 200, calmStun: 1.3, calmHeal: 1, neverHurt: true }
};
