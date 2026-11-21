/* Y.O.U.R. · the MELLA V7 kit as wir.power/1 DATA. PROPOSAL_HOLD (PUBLISH HOLD).
   U1 of the unified design (owner go-ahead 21 Nov 2026 4:09 PM ET: "start the unified draft PRs… beginning with U1 = powers as data").
   These nine records describe the kit that v2.2 (your/v22/your_v22.js) and v2.3 (your/v23/your_v23.js) already run. They change NO rule:
   the game still runs the kit through YOUR_V22.power, and damage still comes from the Nimbus module (YOUR_V23.nimbus → YOUR_V23.damage).
   - "v7" holds the exact config block the engine reads (copied from YOUR_V22_CONFIG.mella; tags V7 / PROPOSED there).
   - the schema fields (cost, cast, target, effects) restate those numbers in tiles and seconds: 1 V7 px = 3.1/200 tiles (v2.2 scale, PROPOSED),
     1 METAL px = 1/64 tile (v2.3 scale, PROPOSED). Rounded to 3 decimals.
   - your/powers/tests/powers_core.test.cjs fails if any record drifts from the live configs.
   Pure data file: no functions. */
(function (root) {
  'use strict';
  var K = {
    schema: 'wir.power.kit/1', id: 'core.mella', name: 'The MELLA kit · The First Wish V7', source: 'V7 (your_v22_config.js) + v2.3 Nimbus wiring (your_v23_config.js)',
    resources: { energy: { max: 100, regen: 8, transformedDrain: 5 }, stamina: { max: 100, regen: 17 }, stability: { max: 100, min: 16, regen: 3.8, regenGuardian: 12 } },
    chain: { order: ['core.mella.root', 'core.mella.core', 'core.mella.crown'], window: 12, reward: 'living circuit: +25 energy and Veyru bond ≥ 69 once per day, 4 garden cells, 5.5 s guardian' },
    powers: [
      { schema: 'wir.power/1', id: 'core.mella.jump', name: 'Jump', desc: 'A V7 jump. Clears shockwaves and lands on Glassjaw.', version: '1.0.0', tier: 'core', owner: 'hero',
        base: 'jump', nimbus: null, cost: {}, cooldown: 0, cast: { time: 0.839, anim: 'jump' }, target: { shape: 'self' },
        effects: [{ type: 'jump', airTime: 0.839 }], visual: { icon: [0, 0] }, input: { key: 'q', pad: 13, touch: 'JUMP' }, engine: 'v22:jump',
        v7: { vz: 390, gravity: 930 } },
      { schema: 'wir.power/1', id: 'core.mella.dash', name: 'Dash', desc: 'A burst of speed with a short dodge window. Rams machines in a fight.', version: '1.0.0', tier: 'core', owner: 'hero',
        base: 'dash', nimbus: null, cost: { stamina: 20 }, cooldown: 0, cast: { time: 0.24, anim: 'dash' }, target: { shape: 'self' },
        effects: [{ type: 'move', tiles: 2.567 }, { type: 'shield', seconds: 0.34 }, { type: 'ram', hits: 1 }], visual: { icon: [1, 0] }, input: { key: 'shift / k', pad: 1, touch: 'SPRINT' }, engine: 'v22:dash',
        v7: { staminaCost: 20, impulsePx: 690, time: 0.24 } },
      { schema: 'wir.power/1', id: 'core.mella.hit', name: 'Hit', desc: 'A close strike. Stronger while transformed.', version: '1.0.0', tier: 'core', owner: 'hero',
        base: 'hit', nimbus: 'melee', cost: {}, cooldown: 0, cast: { time: 0.42, anim: 'hit' }, target: { shape: 'front_arc', range: 2.353, arc: 1.7, close: 0.594, maxTargets: 1 },
        effects: [{ type: 'damage', scale: 1, transformedScale: 1.667 }, { type: 'knockback', tiles: 2.5 }], visual: { icon: [2, 0] }, input: { key: 'j', pad: 14, touch: 'HIT' }, engine: 'v22:hit',
        v7: { time: 0.42, dmg: 9, dmgTransformed: 15, rangePx: 140 } },
      { schema: 'wir.power/1', id: 'core.mella.blast', name: 'Blast', desc: 'A fired bolt of energy.', version: '1.0.0', tier: 'core', owner: 'hero',
        base: 'blast', nimbus: 'B', cost: { energy: 14 }, cooldown: 0, cast: { time: 0.25, anim: 'cast_down' }, target: { shape: 'projectile', speed: 10.075, speedTransformed: 13.175, life: 1.7, maxTargets: 1 },
        effects: [{ type: 'damage', scale: 1 }, { type: 'knockback', velocityK: 0.15 }], visual: { sheet: 'hero.vfx', row: 0, frames: [0, 1, 2, 3], icon: [3, 0] }, input: { key: 'l', pad: 7, touch: 'BLAST' }, engine: 'v22:blast',
        v7: { energyCost: 14, speedPx: 650, speedTransformedPx: 850, rPx: 13, rTransformedPx: 19, life: 1.7, time: 0.25 } },
      { schema: 'wir.power/1', id: 'core.mella.transform', name: 'Living Refraction', desc: 'Transform. Needs 40 energy and drains it while it lasts.', version: '1.0.0', tier: 'core', owner: 'hero',
        base: 'transform', nimbus: null, cost: {}, cooldown: 0, cast: { time: 0.75, anim: 'refraction' }, target: { shape: 'self' },
        effects: [{ type: 'transform', minEnergy: 40, drainPerSec: 5, exitCap: 90, runK: 1.275 }], visual: { icon: [5, 0] }, input: { key: 't', pad: 11, touch: '⚡SHIFT' }, engine: 'v22:transform',
        v7: { minEnergy: 40, exitCap: 90, runPxTransformed: 255, time: 0.75 } },
      { schema: 'wir.power/1', id: 'core.mella.calm', name: 'Calm', desc: 'Share energy with Veyru. In a fight Veyru answers with a calm pulse.', version: '1.0.0', tier: 'core', owner: 'hero',
        base: 'calm', nimbus: null, cost: {}, cooldown: 0, cast: { time: 0, anim: 'calm' }, target: { shape: 'circle', radius: 3.1, around: 'kaw' },
        effects: [{ type: 'bond_kaw', amount: 22 }, { type: 'energy_self', amount: 6 }, { type: 'stun', seconds: 1.3, from: 'veyru' }, { type: 'heal_self', hp: 1 }, { type: 'regulate' }],
        visual: { sheet: 'hero.vfx', row: 3, frames: [0, 1, 2, 3, 4, 5], icon: [4, 0] }, input: { key: 'c', pad: 12, touch: 'CALM' }, engine: 'v22:calm',
        v7: { rangePx: 200, bond: 22, energy: 6, bondDone: 86 } },
      { schema: 'wir.power/1', id: 'core.mella.root', name: 'ROOT', desc: 'ROOT shapes terrain.', version: '1.0.0', tier: 'core', owner: 'hero',
        base: 'root', nimbus: 'A', cost: { energy: 13, stability: 7 }, cooldown: 0, cast: { time: 0.28, anim: 'none' }, target: { shape: 'cell', range: 1.116, radius: 0.589, life: 10 },
        effects: [{ type: 'cell', kind: 'root', nearStamina: 7, nearEnergy: 2 }, { type: 'damage', scale: 1 }, { type: 'chain', step: 1 }], visual: { sheet: 'hero.vfx', row: 1, frames: [0, 1, 2, 3, 4, 5], icon: [6, 0] },
        input: { key: '1', pad: 4, touch: '🌱ROOT' }, engine: 'v22:root', v7: { cost: 13, stabilityCost: 7, offsetPx: 72, sizePx: 76, life: 10, nearStamina: 7, nearEnergy: 2 } },
      { schema: 'wir.power/1', id: 'core.mella.core', name: 'CORE', desc: 'CORE transfers energy.', version: '1.0.0', tier: 'core', owner: 'hero',
        base: 'core', nimbus: 'X', cost: { energy: 17, stability: 14 }, cooldown: 0, cast: { time: 0.28, anim: 'cast_down' }, target: { shape: 'cell', range: 1.426, radius: 0.93, life: 7 },
        effects: [{ type: 'cell', kind: 'core', nearEnergy: 4, nearStabilityDrain: 1.4 }, { type: 'damage', scale: 1 }, { type: 'bond_kaw', amount: 2, kawRange: 4.03 }, { type: 'chain', step: 2 }],
        visual: { sheet: 'hero.vfx', row: 2, frames: [0, 1, 2, 3, 4, 5], icon: [0, 1] }, input: { key: '2', pad: 6, touch: '⚡CORE' }, engine: 'v22:core',
        v7: { cost: 17, stabilityCost: 14, offsetPx: 92, sizePx: 120, life: 7, nearEnergy: 4, nearStabilityDrain: 1.4, kawRangePx: 260, kawBond: 2 } },
      { schema: 'wir.power/1', id: 'core.mella.crown', name: 'CROWN', desc: 'CROWN reads and calms living systems.', version: '1.0.0', tier: 'core', owner: 'hero',
        base: 'crown', nimbus: 'Y', cost: { energy: 20, stability: 9 }, cooldown: 0, cast: { time: 0.28, anim: 'none' }, target: { shape: 'circle', radius: 4, maxTargets: 1 },
        effects: [{ type: 'damage', scale: 1 }, { type: 'read', reaction: 4.3 }, { type: 'bond_kaw', amount: 8 }, { type: 'chain', step: 3 }], visual: { icon: [1, 1] },
        input: { key: '3', pad: 15, touch: '✧CROWN' }, engine: 'v22:crown', v7: { cost: 20, stabilityCost: 9, reaction: 4.3, kawBond: 8 } }
    ]
  };
  root.YOUR_POWER_KIT = K;
})(typeof window !== 'undefined' ? window : this);
