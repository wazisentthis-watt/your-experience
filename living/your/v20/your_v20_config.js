/* Y.O.U.R. v2.0 config · PROPOSAL_HOLD (PUBLISH HOLD).
   Every number marked PROPOSED is new in v2.0 (or carried over as PROPOSED from v1.2.1) and is NOT an owner-approved value.
   Numbers marked V121 are the Y.O.U.R. v1.2.1 values the runner still uses unchanged. Numbers marked VALENCE belong to WIR Valence Life v3. */
window.YOUR_V20_CONFIG = {
  version: 'v2.0', status: 'PROPOSAL_HOLD', base: 'WIR Valence Life v3 (copy) + Y.O.U.R. v1.2.1 systems',
  heroLook: 'owner_starter_v1',            // ChatGPT 18–27 owner starter look (shared WIR hero profile lookId)
  defaultName: 'Hero',                     // placeholder, editable in Settings (never invented)

  /* ---- payouts: v1.2.1 gross pay, then Valence payroll ---- */
  pay: {
    job: 45, arena: 60, skate: 30,          // V121 (Y.O.U.R. slice values; boss win pays the arena amount, as in v1.2.1)
    taxRule: 'PROPOSED: Y.O.U.R. gross pay goes through Valence payroll(), so FICA (VALENCE 7.65%) is withheld like any wage'
  },
  job: { crates: 5, seconds: 90, oncePerDay: true },   // V121 (Corner Store shift); one shift per Valence day (V121 rule)

  /* ---- how a Y.O.U.R. activity touches the Valence sim (all PROPOSED) ---- */
  activityHours: 1,                        // PROPOSED: same as v1.2.1 ACT_MIN 60 game-minutes
  acts: {                                  // PROPOSED needs effects (Valence slots; slots your element lacks are skipped by Valence)
    your_job:   { name: "Dex's Corner Store shift", gain: { Hustle: .3, Purpose: .1 }, drain: { Rest: .06, Fuel: .05 } },
    your_arena: { name: 'Arena: Training Drone',    gain: { Play: .2, Skill: .15 }, drain: { Rest: .1, Fuel: .08, Clean: .12 } },
    your_boss:  { name: 'Arena: SIKEE',             gain: { Play: .25, Purpose: .15 }, drain: { Rest: .14, Fuel: .1, Clean: .15 } },
    your_skate: { name: 'Y.O.U.R. skate park run',  gain: { Play: .32 }, drain: { Rest: .05, Fuel: .04 } }
  },
  xp: { your_job: { tech: 2 }, your_arena: { combat: 4 }, your_boss: { combat: 6 }, your_skate: {} },   // PROPOSED Valence skill xp
  runnerEnergy: 'PROPOSED: Valence needs (Rest, Fuel…) are the stamina system; the v1.2.1 runner starts every activity at full energy',

  /* ---- movement (v1.2.1 PROPOSED values, unchanged) ---- */
  move: { sprint: 1.7, fly: 1.45, dashT: 0.2, crouchT: 0.12, takeoffT: 0.4, landT: 0.22, hoverPx: 15,
          flyOutdoorsOnly: true,          // PROPOSED: no flying inside your place
          flightLabel: 'Flight art: 4-direction flight (front / back / side angles), not true top-down' },

  /* ---- where Y.O.U.R. lives in Savannah (PROPOSED mapping onto existing Valence buildings) ---- */
  places: { job: 'market', arena: 'gym', skate: 'park' },
  npcs: {   // EN values are PROPOSED placeholders so Valence bond math works (no element lore is claimed)
    mara:  { name: 'Mara',  EN: 2.2, day: 'park',   eve: 'venue', col: '#ffd166', role: 'Y.O.U.R. · your neighbor' },
    dex:   { name: 'Dex',   EN: 2.2, day: 'market', eve: 'market', col: '#7dffb0', role: 'Y.O.U.R. · runs the Corner Store shift' },
    sikee: { name: 'SIKEE', EN: 2.2, day: 'gym',    eve: 'gym',    col: '#d6963c', role: 'Authority Form · main villain' }
  },
  mella: { gap: 1.25, snap: 7, label: 'Mella · sidekick' },   // PROPOSED follow distance in tiles
  sprite: { hero: 60, mella: 54, sikee: 72, npc: 58 }          // PROPOSED on-map draw sizes (px per 96 px cell)
};
