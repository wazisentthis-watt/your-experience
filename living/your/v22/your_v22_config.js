/* Y.O.U.R. v2.2 config · PROPOSAL_HOLD (PUBLISH HOLD).
   Owner decisions: "you are the Mella with powers, no side kick, but you do have KAW" (t70u) and the KAW pick "Veyru" (2026-11-16).
   Tags:  V7     = value copied from The First Wish · Mella V7 (Drive 14bFSyCcARdQeQkTkyS5XttrwQfGCmAzu, local kaw-mella/_src/…V7….html)
          NIMBUS = text/value copied from wir_mella_combat.js v1.2.0 (Drive 1OlJ2W4ERednZPKK4Oiyk2DNumV-RwQkG) — reference labels only
          KAWR3  = text from WIR_WISHBORN_KAW_UNIVERSAL_MASTER_R3 (Drive 1t499zFSGiH1ba2s57_WC7g4jsLQzESEt)
          PROPOSED = new in v2.2, not owner-approved (scales, key mapping, how a V7 effect lands in the Valence city). */
window.YOUR_V22_CONFIG = {
  version: 'v2.2', status: 'PROPOSAL_HOLD',
  cast: { hero: 'the MELLA (owner likeness, placeholder name "Hero")', mellaFollower: false, sidekick: 'kaw-veyru-001' },

  /* ---- V7 → Valence scale. V7 run speed 200 px/s (V7) is matched to the Valence walk speed 3.1 tiles/s (VALENCE). PROPOSED. */
  scale: { v7RunPx: 200, valenceWalkTiles: 3.1, get tilePerPx() { return this.valenceWalkTiles / this.v7RunPx; }, jumpLiftK: 0.5 /* PROPOSED: side-view jump height ×0.5 on the top-down map */ },

  /* ---- MELLA kit: First Wish V7 ---- */
  mella: {
    energy: { max: 100, regen: 8, transformedDrain: 5 },          // V7: P.energy +8/s, −5/s while transformed
    stamina: { max: 100, regen: 17 },                               // V7
    jump: { vz: 390, gravity: 930 },                                // V7 jump(): vz 390, P.vz −= 930·dt
    dash: { staminaCost: 20, impulsePx: 690, time: 0.24 },          // V7 dash(): stamina 20, vx 690, timer .24
    hit: { time: 0.42, dmg: 9, dmgTransformed: 15, rangePx: 140 },  // V7 punch(): attacking .42, 9 / 15, d < 140
    blast: { energyCost: 14, speedPx: 650, speedTransformedPx: 850, rPx: 13, rTransformedPx: 19, life: 1.7, time: 0.25 }, // V7 fire()
    transform: { minEnergy: 40, exitCap: 90, runPxTransformed: 255, time: 0.75 },  // V7 transform(); run 200 → 255 while transformed
    calm: { rangePx: 200, bond: 22, energy: 6, bondDone: 86 },      // V7 calm(): KoPani trust +22, energy +6, bond at 86 → used on Veyru (PROPOSED mapping)
    ccr: {
      cost: { root: 13, core: 17, crown: 20 },                      // V7 useCCR()
      stabilityCost: { root: 7, core: 14, crown: 9 },               // V7
      stabilityMin: 16, stabilityRegen: 3.8, stabilityRegenGuardian: 12,   // V7
      chainWindow: 12, chain: ['root', 'core', 'crown'],            // V7: ROOT → CORE → CROWN within 12 s
      root: { offsetPx: 72, sizePx: 76, life: 10, nearStamina: 7, nearEnergy: 2 },          // V7 root cell + standing bonus
      core: { offsetPx: 92, sizePx: 120, life: 7, nearEnergy: 4, nearStabilityDrain: 1.4, kawRangePx: 260, kawBond: 2 },  // V7 core cell; KoPani +2 → Veyru (PROPOSED)
      crown: { reaction: 4.3, kawBond: 8 },                         // V7 CCR.reaction 4.3, KoPani trust +8 → Veyru (PROPOSED)
      circuit: { energy: 25, guardianTime: 5.5, gardenCells: 4, gardenLife: 14, gardenSpacingPx: 62, kawBondFloor: 69,  // V7 lessonDone block
                 oncePerDay: true }                                 // PROPOSED: the circuit bonus pays once per Valence day (V7 pays it once per run)
    },
    text: {                                                        // V7 HUD / tutorial strings (verbatim)
      transformNeed: 'NEED 40 ENERGY TO TRANSFORM', transformOn: '⚡ LIVING REFRACTION AWAKENED', transformOff: 'RESONANCE STABILIZED', transformOut: 'REFRACTION EXHAUSTED',
      lowEnergy: 'NOT ENOUGH ENERGY · WAIT TO RECHARGE', lowStab: 'STABILITY LOW · ALLOW THE CIRCUIT TO SETTLE', circuit: 'CCR SYNERGY · LIVING CIRCUIT COMPLETED',
      root: 'ROOT shapes terrain.', core: 'CORE transfers energy.', crown: 'CROWN reads and calms living systems.'
    },
    /* Nimbus lanes (NIMBUS): names and defaults only. Valence Star shells, Divine-12 and lane damage are NOT active in v2.2 (no owner scope pick). */
    nimbus: {
      root:  { lane: 'A', id: 'ROOT_TERRAIN_TRAVERSE', name: 'Root Terrain / Traverse', node: 'MELLA_ROOT_LEFT', element: 'Ga', valenceCost: 1, baseDamage: 22 },
      core:  { lane: 'X/B', id: 'LEFT_CORE_ANCHOR_PULL + RIGHT_CORE_BIOELECTRIC', name: 'Left-Core Anchor / Right-Core Bioelectric', node: 'MELLA_LEFT_CORE + MELLA_RIGHT_CORE', element: 'Fe / Cu', valenceCost: '2 / 3', baseDamage: '26 / 38' },
      crown: { lane: 'Y', id: 'CROWN_ALLOTROPE_SHIFT', name: 'Crown / Allotrope Shift', node: 'MELLA_CROWN', element: 'Rh', valenceCost: 2, baseDamage: 32 }
    },
    /* Controls. V7 originals in v7; Y.O.U.R. keeps Valence/v2.0 keys, so clashing ones move (PROPOSED). */
    keys: { jump: 'q', hit: 'j', blast: 'l', calm: 'c', transform: 't', root: '1', core: '2', crown: '3', dash: 'shift / k (press; hold = v2.0 sprint)' },
    v7keys: { jump: 'Space', dash: 'Shift', hit: 'J', blast: 'K', calm: 'E', transform: 'T', root: '1', core: '2', crown: '3' },
    pad: { jump: 13, hit: 14, blast: 7, calm: 12, transform: 11, root: 4, core: 6, crown: 15, dash: 1 },   // D-down, D-left, RT, D-up(V7), R3, LB(V7), LT(V7), D-right, B(V7)
    padNote: 'V7 pad: A jump, B dash, X hit, R2 blast, D-up calm, Y transform, L1 ROOT, L2 CORE, R1 CROWN. In Valence A = interact, X = Do tab, Y = ride, RB = fly (v2.0), so jump → D-down, hit → D-left, transform → R3, CROWN → D-right (PROPOSED).',
    hitNote: 'PROPOSED: the Valence city has no enemies, so Hit and Blast are moves with effects only. Arena / SIKEE fights keep the v1.2.1 FaFiFi rules unchanged.'
  },

  /* ---- the KAW sidekick ---- */
  kaw: {
    id: 'kaw-veyru-001', name: 'Veyru', species: 'Rainroot Lynx', elements: ['Water', 'Plant'],   // KAWR3
    lore: ['Forest scout and support', 'Awakens in Rainroot Canopy', 'Loves clean water, canopy cover, and regular player interaction'],   // KAWR3
    abilitiesDesignOnly: ['Rootpaw Rush (physical attack)', 'Rainroot Bloom (water-root area skill)'],   // KAWR3: design only, not coded
    law: 'Rescue alone confers no ownership. Veyru is a bonded companion, not property.',  // KAWR3 rule, wording PROPOSED
    follow: { gap: 1.25, snap: 7 },          // PROPOSED: same follow numbers v2.0 used for Mella
    size: 48,                                // PROPOSED on-map draw size (px) of the 64 px cell
    art: { idle: 'your/assets/kaw/veyru/veyru_idle_64.png', walkR: ['your/assets/kaw/veyru/veyru_walk_r_0_64.png', 'your/assets/kaw/veyru/veyru_walk_r_1_64.png', 'your/assets/kaw/veyru/veyru_walk_r_2_64.png', 'your/assets/kaw/veyru/veyru_walk_r_3_64.png'],
           face: 'your/assets/kaw/veyru/veyru_idle_64.png',
           note: 'TEMP: side-view V9 intake frames scaled to 64 px. Left = mirrored right. Up / down = PLACEHOLDER (side view) until a ChatGPT 4-direction roam sheet exists.' },
    assists: 'PROPOSED: the v1.1 companion assists (job spotter, skate line caller, one protect_bond per run) move from the Mella NPC to Veyru. Same FaFiFi-fair rules.',
    bondStart: 20                            // PROPOSED starting bond (0–100)
  }
};
