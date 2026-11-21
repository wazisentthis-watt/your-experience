/* Y.O.U.R. v2.4-living · CCE 2.0 Living District config · PROPOSAL_HOLD (PUBLISH HOLD)
   Owner spec: "YOUR: Living City Chaos Engine · CCE 2.0" (title emoji removed in this root copy) (t83u, 2026-11-16).
   Tags:  OWNER    = number/text taken from the owner spec t83u (it labels its own numbers "Proposed gameplay tuning values").
          METAL    = copied from METAL MACHINE_DEFS via your_v23_config.js (v2.3).
          V23      = reused from Y.O.U.R. v2.3 config.
          PROPOSED = new in v2.4-living, not owner-approved. Every villain, super and civilian here is a PROPOSED ORIGINAL character, not existing canon. */
(function (root) {
var CFG = {
  version: 'v2.4-living', status: 'PROPOSAL_HOLD', saveKey: 'wir-your-living-v24', saveSchema: 'wir.your-living/1',
  /* ---------------- time (PROPOSED). sim runs in fixed steps; 1 real second = 0.25 game minutes, so the owner's
     2:17 PM -> 2:35 PM incident (18 game min) lasts ~72 real seconds. A game day is 96 real minutes. */
  clock: { stepSec: 0.05, gameMinPerSec: 0.25, startDay: 1, startMinute: 14 * 60 + 14 /* OWNER: "2:14 PM · Normal afternoon" */,
           weekdays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'], startWeekday: 1 /* Tuesday: OWNER "an ordinary Tuesday" */ },
  /* ---------------- event director (OWNER = Living City column; Relaxed + Chaos columns PROPOSED). Intervals are REAL play minutes. */
  director: {
    defaultMode: 'living',
    modes: {
      relaxed: { label: 'Relaxed',     minorMin: [6, 12], majorMin: [45, 75], patrols: [1, 2], intensity: .30, tag: 'PROPOSED' },
      living:  { label: 'Living City', minorMin: [3, 7],  majorMin: [20, 40], patrols: [2, 4], intensity: .55, tag: 'OWNER' },
      chaos:   { label: 'Chaos',       minorMin: [1, 3],  majorMin: [8, 15],  patrols: [4, 6], intensity: .85, tag: 'PROPOSED' }
    },
    firstMinorSec: [60, 120], firstMajorSec: [600, 900],   // PROPOSED: grace period after a fresh city so the first minutes are ordinary life
    maxActive: { minor: 2, major: 1 },
    cooldownMin: { vehicle_chase: 8, bank_robbery: 45, robot_ambush: 10, scout_sighting: 4 },   // PROPOSED same-type cooldown (real min)
    repeatPenalty: [0.25, 0.55],     // PROPOSED weight multiplier if the type was the last / second-last incident
    zonePenalty: 0.4,                // PROPOSED weight multiplier for a zone used by one of the last 2 incidents
    minSpawnDistTiles: 15,           // PROPOSED: no incident origin or unit spawn closer than 15 tiles (480 px) to Mella
    deferSec: 10,                    // PROPOSED: retry when no plausible origin is far enough away
    minorTypes: { vehicle_chase: 1, robot_ambush: 1, scout_sighting: .7 },
    majorTypes: { bank_robbery: .6, robot_ambush: 1, vehicle_chase: .6 }
  },
  /* ---------------- story calendar (OWNER ideas: "A bank-heist operation could develop over seven in-game days, Iteron could deploy a robot
     generation weekly"; day numbers PROPOSED). Runs in every director mode. */
  calendar: {
    iteronGenerationEveryDays: 7, iteronDeployMinute: 6 * 60,
    vesperPlan: [ { day: 1, stage: 'casing',  text: 'Unfamiliar scout drones keep circling First Ledger Bank.' },
                  { day: 3, stage: 'supply',  text: 'Iteron parts go missing from the Old Foundry: someone is buying robbery drones.' },
                  { day: 5, stage: 'recruit', text: 'A getaway van has been seen parked behind the Transit Depot two nights running.' },
                  { day: 7, stage: 'strike',  text: 'Vault Vesper\'s crew hits First Ledger Bank.', minute: 15 * 60 } ]
  },
  /* ---------------- district map (PROPOSED). Units are tiles (32 px). Roads are 2 tiles wide. */
  map: { W: 64, H: 44, tile: 32, roadsY: [10, 22, 34], roadsX: [12, 32, 52] },
  zones: {
    civic:     { name: 'Civic Square' },  ledger: { name: 'Ledger Row' },   market: { name: 'Market Street' },
    foundry:   { name: 'Foundry Edge' },  plaza:  { name: 'Skate Plaza' },  riverside: { name: 'Riverside' }
  },
  zoneGrid: [ ['civic', 'ledger', 'market', 'foundry'], ['civic', 'ledger', 'market', 'foundry'], ['civic', 'plaza', 'riverside', 'foundry'], ['civic', 'plaza', 'riverside', 'foundry'] ],
  buildings: [
    { id: 'bank',       name: 'First Ledger Bank', zone: 'ledger',    r: [16, 13, 8, 7], door: [20, 20], kind: 'bank', color: '#6d7fa8' },
    { id: 'office',     name: 'Ledger Offices',    zone: 'ledger',    r: [25, 13, 6, 7], door: [27, 20], kind: 'work', color: '#7b8496' },
    { id: 'substation', name: 'Substation 4',      zone: 'ledger',    r: [15, 2, 7, 7],  door: [18, 9],  kind: 'infra', color: '#8a8f5a' },
    { id: 'aptD',       name: 'Hollis Flats',      zone: 'ledger',    r: [24, 2, 7, 7],  door: [27, 9],  kind: 'home', color: '#a7735a' },
    { id: 'store',      name: 'Corner Market',     zone: 'market',    r: [35, 13, 7, 7], door: [38, 20], kind: 'shop', color: '#4f9a6a' },
    { id: 'cafe',       name: 'Steamline Café',    zone: 'market',    r: [44, 13, 7, 6], door: [47, 19], kind: 'food', color: '#b5804d' },
    { id: 'workshop',   name: 'Tinker Workshop',   zone: 'market',    r: [35, 2, 9, 7],  door: [39, 9],  kind: 'work', color: '#7f6a9e' },
    { id: 'aptC',       name: 'Ninefold Apartments', zone: 'market',  r: [46, 2, 5, 7],  door: [48, 9],  kind: 'home', color: '#9e6f62' },
    { id: 'foundry',    name: 'Old Foundry',       zone: 'foundry',   r: [55, 1, 8, 8],  door: [58, 9],  kind: 'villain', color: '#5b4b4b' },
    { id: 'depot',      name: 'Transit Depot',     zone: 'foundry',   r: [55, 13, 8, 7], door: [58, 20], kind: 'work', color: '#5d7680' },
    { id: 'repair',     name: 'Repair Depot',      zone: 'foundry',   r: [55, 25, 8, 7], door: [58, 32], kind: 'repair', color: '#c49a3c' },
    { id: 'garage',     name: 'Eastside Garage',   zone: 'foundry',   r: [55, 37, 8, 6], door: [58, 36], kind: 'work', color: '#6b6b6b' },
    { id: 'hq',         name: 'Hero Hall',         zone: 'civic',     r: [1, 13, 10, 7], door: [6, 20],  kind: 'hq', color: '#3f6fb5' },
    { id: 'clinic',     name: 'Civic Clinic',      zone: 'civic',     r: [1, 25, 10, 6], door: [6, 31],  kind: 'clinic', color: '#d9e3ea' },
    { id: 'aptE',       name: 'Elm Court',         zone: 'civic',     r: [1, 37, 10, 6], door: [6, 36],  kind: 'home', color: '#a8806a' },
    { id: 'aptA',       name: 'Riverside A',       zone: 'riverside', r: [35, 25, 7, 7], door: [38, 32], kind: 'home', color: '#9a6b55' },
    { id: 'aptB',       name: 'Riverside B',       zone: 'riverside', r: [44, 25, 7, 7], door: [47, 32], kind: 'home', color: '#8f6a5c' },
    { id: 'aptF',       name: 'Lowline Lofts',     zone: 'riverside', r: [35, 38, 16, 5], door: [42, 37], kind: 'home', color: '#a2745e' },
    { id: 'mural',      name: 'Mural Wall',        zone: 'plaza',     r: [15, 41, 16, 2], door: [22, 40], kind: 'mural', color: '#7d5c8f' }
  ],
  places: {   // non-building destinations (tile coords)
    park: [5, 5], plaza: [22, 28], muralSpot: [22, 40], civicSquare: [6, 23.5], parkBench: [8, 7]
  },
  plaza: { ramps: [[17, 26, 3, 2], [26, 30, 3, 2]], rails: [[19, 31, 6, 'h'], [29, 25, 4, 'v'], [15, 38, 8, 'h']] },
  grates: [[13, 40], [33, 6], [53, 41], [3, 23]],           // PROPOSED sewer grates: plausible robot origins besides the Old Foundry door
  parkedCar: [44.5, 35.2],
  playerStart: [22, 28],
  discoveries: [   // PROPOSED "discoveries unrelated to combat" (owner rule): hidden street-art tags
    { id: 'd1', at: [2, 2],   text: 'A tiny painted octopus under the park bench.' },
    { id: 'd2', at: [30, 1],  text: 'Coins pressed into the pavement spell "WAKE UP WIR".' },
    { id: 'd3', at: [62, 11.5], text: 'A chalk map of the old tram line.' },
    { id: 'd4', at: [14, 33], text: 'A skate-wax stash with a thank-you note.' },
    { id: 'd5', at: [51, 21], text: 'A café receipt with a poem on the back.' },
    { id: 'd6', at: [0.8, 43], text: 'Somebody planted sunflowers in a pothole.' },
    { id: 'd7', at: [31, 43], text: 'The mural painter\'s first sketch, taped to the wall.' },
    { id: 'd8', at: [53.5, 0.8], text: 'Scorch marks shaped like a gear: Iteron was here.' },
    { id: 'd9', at: [42, 33], text: 'A lost house key with a teal ribbon.' },
    { id: 'd10', at: [11.5, 11.5], text: 'A busker\'s setlist: 41 songs, all about the river.' }
  ],
  /* ---------------- hero (V23 / METAL numbers reused) + controls (PROPOSED) */
  hero: { hp: 5, invHit: 1.1, koTime: 2.4, koGrace: 1.5, walk: 4.2, run: 6.4, skateMax: 9.5, skateAccel: 7, skateFric: 1.6,
          ollieT: .55, rampT: .95, grindSpeed: 8, hitRange: 1.5, blastRange: 7, blastSpeed: 14, dashDist: 3.2, dashCd: .8, calmRadius: 3, actRange: 1.6 },
  car: { accel: 9, max: 13, brake: 14, turn: 2.6, fric: 1.2, enterRange: 2.2 },
  nimbus: { hit: 'melee', blast: 'B' },          // V23 lanes into the byte-identical wir_mella_combat.js v1.2.0
  hpUnit: 18,                                     // V23: 1 METAL hit = 18 Nimbus damage
  /* ---------------- Dr. Iteron's three robot classes. METAL: hp (hits) and speed/dash (METAL px/s ÷ 64 px tiles) from MACHINE_DEFS scout / walker / breacher;
     tele from METAL; ROLES, ranges, shield, artillery and grab numbers PROPOSED. */
  robots: {
    scout:       { name: 'ITERON SCOUT',       role: 'scout / observer',      sprite: 'scout',    hp: 1, speed: 2.5, r: .45, defender: 'Crown',
                   observe: 6, keep: [4.5, 7.5], note: 'observes Mella and reports her habits; flees at low HP (track the signal)' },
    interceptor: { name: 'ITERON INTERCEPTOR', role: 'interceptor / grappler', sprite: 'walker',  hp: 2, speed: 3.0, r: .5, defender: 'Flank',
                   tele: .4, dash: 7.2, reach: 1.1, grabT: 3, note: 'dashes at Mella, heroes or civilians; grabs civilians' },
    commander:   { name: 'ITERON SHIELD COMMANDER', role: 'shield unit / commander / artillery', sprite: 'breacher', hp: 6, speed: 0.94, r: .7, defender: 'Guard',
                   shieldR: 3.2, shieldK: .5, coordSpeedK: 1.2, artilleryEvery: 7, artilleryDmg: 6, note: 'shields allies, coordinates them, shells buildings; drops a capturable prototype core' }
  },
  patrolDrone: { name: 'DELIVERY DRONE?', sprite: 'scout' },
  iteron: { baseResources: 100, perGenResources: 60, adaptCap: .45, disguiseBase: .15, disguisePerGen: .1 },
  /* ---------------- incidents (PROPOSED) */
  incidents: {
    vehicle_chase:  { tier: 'minor', label: 'Vehicle chase',  deadlineSec: 150, drones: [2, 4], truckHp: 6, truckSpeed: 4.6 },
    bank_robbery:   { tier: 'major', label: 'Bank robbery',   deadlineSec: 300, robTime: 75, crew: { interceptor: [2, 3], commander: [1, 1] }, vanHp: 8, vanSpeed: 6 },
    robot_ambush:   { tier: 'any',   label: 'Robot ambush',   deadlineSec: 240, minor: { scout: [1, 2], interceptor: [1, 2], commander: [0, 0] }, major: { scout: [2, 3], interceptor: [3, 5], commander: [1, 1] } },
    scout_sighting: { tier: 'minor', label: 'Scout sighting', deadlineSec: 90 },
    frame_up:       { tier: 'minor', label: 'Frame-up',       deadlineSec: 240 },   // The Divider (PROPOSED)
    staged_fight:   { tier: 'major', label: 'Staged hero fight', deadlineSec: 300 }   // The Divider (PROPOSED)
  },
  /* ---------------- objective -> consequence table (OWNER objective list §5; numbers PROPOSED) */
  objectives: {
    protect_civilians: { label: 'Protect civilians',            done: { confidence: +8 },  failed: { confidence: -10 }, ownerConsequence: 'Improves public trust' },
    stop_commander:    { label: 'Stop the robot commander',     done: { crime: -4 },       failed: { crime: +3 },       ownerConsequence: 'Disrupts enemy coordination' },
    capture_prototype: { label: 'Capture a prototype',          done: { research: +1 },    failed: {},                  ownerConsequence: 'Unlocks technology research' },
    save_hero:         { label: 'Save an injured hero',         done: { heroRel: +15 },    failed: { heroRel: -5 },     ownerConsequence: 'Builds a relationship' },
    prevent_damage:    { label: 'Prevent infrastructure damage', done: { infrastructure: +3 }, failed: { infrastructure: -8 }, ownerConsequence: 'Keeps neighborhood services operating' },
    track_signal:      { label: 'Track the robot signal',       done: { labReveal: 1 },    failed: {},                  ownerConsequence: "Reveals Iteron's next laboratory" },
    stop_vehicle:      { label: 'Stop the vehicle safely',      done: { crime: -3 },       failed: { crime: +4, confidence: -3 } },
    recover_loot:      { label: 'Recover the stolen money',     done: { confidence: +6, economy: +5 }, failed: { economy: -8, security: +1 } },
    disable_drones:    { label: 'Disable the drones',           done: { crime: -2 },       failed: {} },
    expose_evidence:   { label: 'Expose the forged evidence',   done: { confidence: +6 },  failed: { confidence: -4 }, ownerConsequence: 'The Divider: plants false evidence' },
    deescalate_heroes: { label: 'De-escalate the heroes',       done: { confidence: +5 },  failed: { infrastructure: -3 }, ownerConsequence: 'The Divider: turns heroes against one another' },
    protect_reputation:{ label: 'Protect the framed hero\'s reputation', done: { confidence: +4 }, failed: { confidence: -6 }, ownerConsequence: 'The Divider: manipulates public opinion' }
  },
  damage: { closeAt: 60, reopenAt: 30, roadCloseAt: 50, repairPerGameHour: 6, repairStart: 7 * 60, repairEnd: 19 * 60, protestBelow: 35 },
  /* ---------------- civilians: 20 PROPOSED original NPCs (names invented for this slice) */
  civilians: [
    ['c01', 'Imani Reyes',     'aptA', 'bank',     'teller',          { brave: .3, curious: .5, social: .7 }],
    ['c02', 'Theo Marchetti',  'aptA', 'cafe',     'barista',         { brave: .5, curious: .6, social: .9 }],
    ['c03', 'Priya Okafor',    'aptB', 'clinic',   'nurse',           { brave: .8, curious: .4, social: .6 }],
    ['c04', 'Dana Whitlock',   'aptB', 'store',    'shopkeeper',      { brave: .4, curious: .3, social: .6 }],
    ['c05', 'Marcus Bell',     'aptC', 'workshop', 'inventor',        { brave: .5, curious: .95, social: .4 }],
    ['c06', 'Lena Sato',       'aptC', 'office',   'accountant',      { brave: .2, curious: .3, social: .5 }],
    ['c07', 'Ozzie Grant',     'aptD', 'depot',    'bus driver',      { brave: .6, curious: .5, social: .7 }],
    ['c08', 'Ruth Abernathy',  'aptD', 'park',     'retired teacher', { brave: .3, curious: .8, social: .8 }],
    ['c09', 'Kofi Mensah',     'aptE', 'repair',   'repair crew',     { brave: .7, curious: .4, social: .6 }],
    ['c10', 'Sol Ferreira',    'aptE', 'mural',    'mural painter',   { brave: .5, curious: .7, social: .5 }],
    ['c11', 'Jada Kim',        'aptF', 'plaza',    'skate coach',     { brave: .8, curious: .6, social: .9 }],
    ['c12', 'Victor Hale',     'aptF', 'bank',     'bank guard',      { brave: .9, curious: .3, social: .4 }],
    ['c13', 'Amara Diallo',    'aptA', 'hq',       'hall dispatcher', { brave: .6, curious: .6, social: .7 }],
    ['c14', 'Nico Brandt',     'aptB', 'garage',   'mechanic',        { brave: .6, curious: .5, social: .4 }],
    ['c15', 'Hana Morales',    'aptF', 'cafe',     'baker',           { brave: .3, curious: .5, social: .8 }],
    ['c16', 'Eli Thornton',    'aptE', 'substation', 'line tech',     { brave: .7, curious: .4, social: .3 }],
    ['c17', 'Bea Lindqvist',   'aptC', 'store',    'stock clerk',     { brave: .4, curious: .6, social: .6 }],
    ['c18', 'Rafi Haddad',     'aptD', 'office',   'paralegal',       { brave: .3, curious: .5, social: .7 }],
    ['c19', 'Tamsin Rowe',     'aptF', 'clinic',   'doctor',          { brave: .7, curious: .6, social: .5 }],
    ['c20', 'Gus Petrov',      'aptA', 'park',     'hot-dog vendor',  { brave: .5, curious: .7, social: .9 }]
  ],
  /* ---------------- 5 superpowered NPCs (PROPOSED originals). objective preferences drive independent (and conflicting) choices. */
  supers: [
    { id: 'kestrel', codename: 'Kestrel Ray', color: '#ffd166', power: { speed: 9, dps: 7, range: 1.4, heal: 0, shield: 0 }, hp: 120, base: 'hq', home: 'aptD',
      motivation: 'Prove she can be everywhere at once.', temperament: 'reckless', prefs: ['stop_vehicle', 'disable_drones', 'stop_commander', 'track_signal'], rel: { anvil: 20, riotgale: -10 } },
    { id: 'anvil', codename: 'Anvil Mae', color: '#ef8354', power: { speed: 4.5, dps: 10, range: 1.3, heal: 0, shield: .5 }, hp: 220, base: 'hq', home: 'aptE',
      motivation: 'Nobody gets hurt on her block.', temperament: 'protective', prefs: ['protect_vehicle', 'protect_civilians', 'prevent_damage', 'stop_commander'], rel: { kestrel: 20, riotgale: -25 } },
    { id: 'mendwell', codename: 'Mendwell', color: '#8ce99a', power: { speed: 5, dps: 3, range: 1.2, heal: 18, shield: 0 }, hp: 110, base: 'clinic', home: 'aptB',
      motivation: 'Patch up everyone, including the people who started it.', temperament: 'cautious', prefs: ['save_hero', 'protect_civilians'], rel: { anvil: 15, quillshot: 10 } },
    { id: 'quillshot', codename: 'Quillshot', color: '#74c0fc', power: { speed: 5.5, dps: 7, range: 6, heal: 0, shield: 0 }, hp: 100, base: 'hq', home: 'aptC',
      motivation: 'Collect proof on Iteron and get the city to act.', temperament: 'analytical', prefs: ['track_signal', 'capture_prototype', 'stop_commander', 'disable_drones'], rel: { mendwell: 10 } },
    { id: 'riotgale', codename: 'Riotgale', color: '#da77f2', power: { speed: 6.5, dps: 12, range: 3, heal: 0, shield: 0, collateral: .35 }, hp: 150, base: 'plaza', home: 'aptF',
      motivation: 'End every fight fast, whatever breaks.', temperament: 'destructive', prefs: ['destroy_vehicle', 'stop_commander', 'disable_drones'], rel: { anvil: -25, kestrel: -10 } }
  ],
  /* ---------------- the six owner villains (t83u, verbatim roles). Only Dr. Iteron is active in this slice; Vault Vesper runs as an
     off-screen planner that drives the bank robbery with Iteron-supplied robots. The other four are data only. */
  villains: {
    iteron:  { name: 'DR. ITERON',       title: 'THE WEEKLY ROBOT EXPERIMENTER', slice: 'ACTIVE: 3 robot classes, weekly generations, learns from Mella' },
    vesper:  { name: 'VAULT VESPER',     title: 'THE HEIST ARCHITECT',          slice: 'PARTIAL: 7-day heist plan + bank robbery (buys robots from Iteron); no sprite, never appears on screen' },
    sprawl:  { name: 'DR. SPRAWL',       title: 'THE UNCONTROLLED CREATOR',     slice: 'NOT BUILT (design only)' },
    vorax:   { name: 'COMMANDER VORAX',  title: 'THE EXTRATERRESTRIAL STRATEGIST', slice: 'NOT BUILT (design only)' },
    rampage: { name: 'RAMPAGE',          title: 'THE EMOTIONAL CATASTROPHE',    slice: 'NOT BUILT (design only)' },
    divider: { name: 'THE DIVIDER',      title: 'THE HERO MANIPULATOR',         slice: 'ACTIVE (v2.4 owner pick): plans on a resource budget, frame-ups with forged evidence + rented Iteron broadcast drones, staged hero fights (super vs super, or a super vs Mella) with rented Iteron interceptors, rival-team recruiting, public opinion (hero reputation + zone confidence); adapts to how he is beaten. No sprite, never appears on screen.' }
  },
  traffic: { cars: 8, lightCycleSec: 14 },
  /* ---------------- THE DIVIDER (PROPOSED original; owner roles t83u; owner chose him next t88s472). Every number PROPOSED. */
  divider: { baseResources: 60, dailyResources: 45, maxResources: 200, cost: { frame_up: 30, staged_fight: 55, recruit: 20 }, winBonus: 25, iteronFee: 12,
    planMinute: 10 * 60, delayMin: [90, 420], opsPerDay: { relaxed: .5, living: 1, chaos: 1 },
    repStart: 60, repDrainPerGameMin: .35, confDrainPerGameMin: .05, turnPerGameMin: .08, repLossOK: 10, repRestore: 12,
    forgeryMax: 2.5, targetMellaBase: .2, heroExamineSec: 6, exposeGain: 34, exposureAfterBust: 20, dormantDays: 3,
    feudDps: .5, feudCollateral: .25, feudRelHit: 20, mellaCalm: .5, mellaTalk: .34, rivalTeamName: 'The Clean Sweep', rivalDays: 2 },
};
root.CCE_CONFIG = CFG;
if (typeof module === 'object' && module.exports) module.exports = CFG;
})(typeof self !== 'undefined' ? self : this);
