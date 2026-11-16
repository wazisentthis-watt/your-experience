/**
 * WIR LIVING WORLD / IRA-KODI ENGINE EXPANSION — MODULE 2
 * FILE: wir_mella_combat.js
 * VERSION: v1.2.0 (Stay On Page / Nimbus Controller & 5-Node MELLA Integration)
 * AUTHOR: What Is Reality™ (WIR) / AMukkani Wola'Wazai Architecture
 *
 * PURPOSE:
 * 1. Nimbus Controller & Right-Stick Intent Vector Parser:
 *    - Parses world-space directional melee strike vectors from Right-Stick `(rx, ry)` with deadzone,
 *      angular sector quantization (8-way & continuous radians), velocity scaling, and comic-page
 *      RIFFT seam / panel-gutter interaction hooks.
 *    - Maps specialized face-button directed power lanes:
 *      * `Y` -> Crown / Allotrope Shift (Information, sensor perception, structural allotrope phase shift)
 *      * `X` -> Left-Core Anchor / Magnetic Pull (Gravitational/magnetic tether & mass anchoring)
 *      * `B` -> Right-Core Bioelectric Projection (High-flux plasma/bioelectric arc discharge)
 *      * `A` -> Root Terrain / Traverse (G-Lift load-path step, panel-border grind, root shockwave)
 *
 * 2. Valence Star Pac-Man Resource Management System:
 *    - Tracks free charge carriers ("Valence Stars") harvested in the arena and manages shell states:
 *      `Underbalanced`, `Balanced`, and `Overbalanced`.
 *    - Implements Gravitational Charge (`LT + RT`) to attract and compress ambient Valence Stars into shell capacity.
 *    - Implements Valence Regulation (`LB + RB + D-Pad Down`) to vent excess charge, stabilize shell
 *      resonance into the `Balanced` golden zone, and convert vented charge into focus/shield recovery.
 *
 * 3. Divine-12 Elemental Node Cap Enforcer:
 *    - Evaluates the full 14-node combat lattice (5 MELLA Fighter Nodes + 3x3 [9] Companion Squadron Nodes).
 *    - Enforces a strict hard cap of 12 active elemental nodes (`MAX_ACTIVE_NODES = 12`), dynamically
 *      sorting nodes by resonance score and dimming the 2+ lowest-resonance nodes to prevent harmonic overload.
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define(['./wishborn_ecosystem_engine'], factory);
  } else if (typeof module === 'object' && module.exports) {
    let baseEngine = null;
    try {
      baseEngine = require('./wishborn_ecosystem_engine.js');
    } catch (e) {
      baseEngine = null;
    }
    module.exports = factory(baseEngine);
  } else {
    root.WIRMellaCombat = factory(root.WishBornEngine || null);
  }
}(typeof self !== 'undefined' ? self : this, function (BaseEngine) {
  'use strict';

  // ============================================================================
  // 1. CONSTANTS, POWER LANES & VALENCE SHELL DEFINITIONS
  // ============================================================================

  const COMBAT_VERSION = 'WIR-MellaCombat v1.2.0 (Nimbus + Valence Star + Divine-12)';

  const MAX_TOTAL_NODES = 14;   // 5 MELLA nodes + 9 (3x3) Companion nodes
  const DIVINE_12_CAP = 12;     // Hard cap on active elemental nodes

  const VALENCE_STATES = {
    UNDERBALANCED: 'Underbalanced',
    BALANCED: 'Balanced',
    OVERBALANCED: 'Overbalanced'
  };

  // Directed Face-Button Power Lanes
  const POWER_LANES = {
    Y: {
      button: 'Y',
      id: 'CROWN_ALLOTROPE_SHIFT',
      name: 'Crown / Allotrope Shift',
      ccrPillar: 'CROWN',
      nodeSlot: 'MELLA_CROWN',
      valenceCost: 2,
      baseDamage: 32,
      effect: 'Shifts carbon/gallium allotrope phase (Diamond <-> Graphene) & expands sensor perception.'
    },
    X: {
      button: 'X',
      id: 'LEFT_CORE_ANCHOR_PULL',
      name: 'Left-Core Anchor / Magnetic Pull',
      ccrPillar: 'CORE',
      nodeSlot: 'MELLA_LEFT_CORE',
      valenceCost: 2,
      baseDamage: 26,
      effect: 'Projects a high-flux magnetic tether that anchors the fighter or pulls target across panel gutters.'
    },
    B: {
      button: 'B',
      id: 'RIGHT_CORE_BIOELECTRIC',
      name: 'Right-Core Bioelectric Projection',
      ccrPillar: 'CORE',
      nodeSlot: 'MELLA_RIGHT_CORE',
      valenceCost: 3,
      baseDamage: 38,
      effect: 'Fires a directed bioelectric arc along the Right-Stick intent vector.'
    },
    A: {
      button: 'A',
      id: 'ROOT_TERRAIN_TRAVERSE',
      name: 'Root Terrain / Traverse',
      ccrPillar: 'ROOT',
      nodeSlot: 'MELLA_ROOT_LEFT',
      valenceCost: 1,
      baseDamage: 22,
      effect: 'Executes G-Lift load-path traversal, panel-border grind, or seismic root stomp.'
    }
  };

  // 8-Way Directional Melee Strike Table for Right-Stick Intent
  const INTENT_SECTORS = {
    N:  { sector: 'N',  strikeName: 'Rising Uppercut / Crown Splitter', ccrBias: 'CROWN', dmgMult: 1.15 },
    NE: { sector: 'NE', strikeName: 'Diagonal High Slash',               ccrBias: 'CROWN', dmgMult: 1.10 },
    E:  { sector: 'E',  strikeName: 'Right Cross / Side Whip',           ccrBias: 'CORE',  dmgMult: 1.05 },
    SE: { sector: 'SE', strikeName: 'Low Oblique Chop',                  ccrBias: 'ROOT',  dmgMult: 1.10 },
    S:  { sector: 'S',  strikeName: 'Seismic Root Slam / Downspike',     ccrBias: 'ROOT',  dmgMult: 1.20 },
    SW: { sector: 'SW', strikeName: 'Inside Leg Sweep',                  ccrBias: 'ROOT',  dmgMult: 1.10 },
    W:  { sector: 'W',  strikeName: 'Left Hook / Anchor Counter',        ccrBias: 'CORE',  dmgMult: 1.05 },
    NW: { sector: 'NW', strikeName: 'High Guard Piercer',                ccrBias: 'CROWN', dmgMult: 1.10 }
  };

  // ============================================================================
  // 2. NIMBUS CONTROLLER & RIGHT-STICK INTENT PARSER
  // ============================================================================

  /**
   * Parses raw Nimbus controller state (`rightStick: {x, y}`, face buttons `Y, X, B, A`,
   * triggers `LT, RT`, bumpers `LB, RB`, and `dpadDown`) into a normalized world-space
   * melee intent vector and directed power-lane execution plan.
   */
  function parseNimbusIntent(controllerInput, options) {
    controllerInput = controllerInput || {};
    options = options || {};
    const deadzone = options.deadzone !== undefined ? options.deadzone : 0.18;

    const rx = typeof controllerInput.rx === 'number'
      ? controllerInput.rx
      : (controllerInput.rightStick ? (controllerInput.rightStick.x || 0) : 0);
    const ry = typeof controllerInput.ry === 'number'
      ? controllerInput.ry
      : (controllerInput.rightStick ? (controllerInput.rightStick.y || 0) : 0);

    const rawMagnitude = Math.sqrt(rx * rx + ry * ry);
    const clampedMag = Math.min(1.0, rawMagnitude);

    let activeIntent = false;
    let normX = 0;
    let normY = 0;
    let angleRad = 0;
    let angleDeg = 0;
    let sectorKey = 'NEUTRAL';
    let meleeStrike = null;

    if (clampedMag >= deadzone) {
      activeIntent = true;
      // Rescale magnitude smoothly from [deadzone..1.0] -> [0..1.0]
      const scaledMag = (clampedMag - deadzone) / (1.0 - deadzone);
      normX = Number(((rx / rawMagnitude) * scaledMag).toFixed(4));
      normY = Number(((ry / rawMagnitude) * scaledMag).toFixed(4));

      // Standard screen/world coordinates where +X is East, -Y is North (or +Y North depending on convention;
      // here we treat +Y as North/Up and +X as East/Right for intuitive controller stick math)
      angleRad = Math.atan2(ry, rx);
      angleDeg = (angleRad * 180 / Math.PI + 360) % 360;

      // Quantize to 8-way sector (E=0, NE=45, N=90, NW=135, W=180, SW=225, S=270, SE=315)
      const sectorOrder = ['E', 'NE', 'N', 'NW', 'W', 'SW', 'S', 'SE'];
      const index = Math.round(angleDeg / 45) % 8;
      sectorKey = sectorOrder[index];
      meleeStrike = INTENT_SECTORS[sectorKey];
    }

    // Parse Face-Button Power Lanes (Y, X, B, A)
    const buttons = controllerInput.buttons || {};
    const activePowerLanes = [];
    ['Y', 'X', 'B', 'A'].forEach(function (btn) {
      if (buttons[btn] || controllerInput[btn]) {
        const laneSpec = POWER_LANES[btn];
        activePowerLanes.push({
          button: btn,
          id: laneSpec.id,
          name: laneSpec.name,
          ccrPillar: laneSpec.ccrPillar,
          nodeSlot: laneSpec.nodeSlot,
          valenceCost: laneSpec.valenceCost,
          baseDamage: laneSpec.baseDamage,
          directedVector: activeIntent ? { x: normX, y: normY, sector: sectorKey, angleDeg: Number(angleDeg.toFixed(1)) } : { x: 1, y: 0, sector: 'E', angleDeg: 0 },
          effect: laneSpec.effect
        });
      }
    });

    // Check dual-trigger Gravitational Charge (LT + RT) and Valence Regulation (LB + RB + D-Pad Down)
    const lt = Number(controllerInput.LT !== undefined ? controllerInput.LT : (buttons.LT || 0));
    const rt = Number(controllerInput.RT !== undefined ? controllerInput.RT : (buttons.RT || 0));
    const lb = Boolean(controllerInput.LB || buttons.LB);
    const rb = Boolean(controllerInput.RB || buttons.RB);
    const dpadDown = Boolean(controllerInput.dpadDown || (controllerInput.dpad && controllerInput.dpad.down) || buttons.DPAD_DOWN);

    const gravitationalChargeActive = (lt >= 0.5 && rt >= 0.5);
    const valenceRegulationActive = (lb && rb && dpadDown);

    return {
      activeIntent: activeIntent,
      vector: { x: normX, y: normY, magnitude: Number(clampedMag.toFixed(3)) },
      angleRad: Number(angleRad.toFixed(4)),
      angleDeg: Number(angleDeg.toFixed(1)),
      sector: sectorKey,
      meleeStrike: meleeStrike,
      activePowerLanes: activePowerLanes,
      gravitationalChargeActive: gravitationalChargeActive,
      gravitationalChargeIntensity: gravitationalChargeActive ? Number(((lt + rt) * 0.5).toFixed(3)) : 0,
      valenceRegulationActive: valenceRegulationActive
    };
  }

  // ============================================================================
  // 3. VALENCE STAR PAC-MAN SHELL RESOURCE MANAGEMENT SYSTEM
  // ============================================================================

  /**
   * Creates a fighter's Valence Shell state machine:
   * - `stars`: Current free charge carriers ("Valence Stars") held in the outer shell (0 .. maxStars, default 12).
   * - Shell bands:
   *   * `0 .. 3`   -> `Underbalanced` (Low conductivity, sluggish power lanes, +15% incoming core damage)
   *   * `4 .. 8`   -> `Balanced`      (Optimal harmonic resonance, +25% damage & zero self-recoil)
   *   * `9 .. 12+` -> `Overbalanced`  (Volatile plasma shell, +40% burst power but incurs arc-burn strain each beat unless regulated)
   */
  function createValenceShell(options) {
    options = options || {};
    const initialStars = options.stars !== undefined ? options.stars : 6;
    const shell = {
      stars: initialStars,
      maxStars: options.maxStars || 12,
      underThreshold: options.underThreshold || 3, // <= 3 is Underbalanced
      overThreshold: options.overThreshold || 9,   // >= 9 is Overbalanced
      state: VALENCE_STATES.BALANCED,
      gravitationalChargePool: 0,
      harmonicShield: 0,
      overloadStrain: 0,
      allotropeForm: 'Graphene-Standard',
      history: []
    };
    shell.state = evaluateValenceState(shell);
    return shell;
  }

  /**
   * Determines whether the Valence Shell is `Underbalanced`, `Balanced`, or `Overbalanced`.
   */
  function evaluateValenceState(shell) {
    if (!shell) return VALENCE_STATES.BALANCED;
    if (shell.stars <= shell.underThreshold) {
      shell.state = VALENCE_STATES.UNDERBALANCED;
    } else if (shell.stars >= shell.overThreshold) {
      shell.state = VALENCE_STATES.OVERBALANCED;
    } else {
      shell.state = VALENCE_STATES.BALANCED;
    }
    return shell.state;
  }

  /**
   * Pac-Man style harvesting of ambient Valence Stars floating through comic panels/gutters,
   * or spending stars on power lanes.
   */
  function modifyValenceStars(shell, deltaStars, reason) {
    const prevState = shell.state;
    shell.stars = Math.max(0, Math.min(shell.maxStars, shell.stars + deltaStars));
    const nextState = evaluateValenceState(shell);

    const transition = {
      reason: reason || 'STAR_DELTA',
      delta: deltaStars,
      stars: shell.stars,
      previousState: prevState,
      currentState: nextState,
      transitioned: prevState !== nextState
    };

    shell.history.unshift(transition);
    if (shell.history.length > 20) shell.history.pop();
    return transition;
  }

  /**
   * Processes Gravitational Charge (`LT + RT`) and Valence Regulation (`LB + RB + D-Pad Down`)
   * from a parsed Nimbus controller state:
   * - `LT + RT` (Gravitational Charge): Generates a local gravity well that pulls ambient Valence Stars
   *   into the fighter's shell (+2 to +4 stars depending on trigger intensity), potentially pushing
   *   the shell from `Underbalanced` -> `Balanced` or `Balanced` -> `Overbalanced`.
   * - `LB + RB + D-Pad Down` (Valence Regulation): Safely vents excess charge or stabilizes an
   *   `Underbalanced`/`Overbalanced` shell directly to the `Balanced` golden midpoint (6 stars),
   *   converting vented stars into `harmonicShield` and clearing `overloadStrain`.
   */
  function stepValenceControllerActions(shell, parsedIntent, ambientStarsAvailable) {
    parsedIntent = parsedIntent || {};
    const ambient = ambientStarsAvailable !== undefined ? ambientStarsAvailable : 6;
    const prevState = evaluateValenceState(shell);
    let actionTaken = 'NONE';
    let starsDelta = 0;
    let shieldGained = 0;

    if (parsedIntent.valenceRegulationActive) {
      // LB + RB + D-Pad Down: Regulate shell to Balanced midpoint (6 stars)
      actionTaken = 'VALENCE_REGULATION';
      const targetBalancedStars = Math.floor((shell.underThreshold + 1 + shell.overThreshold - 1) / 2); // 6
      if (shell.stars > targetBalancedStars) {
        const vented = shell.stars - targetBalancedStars;
        starsDelta = -vented;
        shieldGained = vented * 8;
        shell.harmonicShield = Math.min(100, (shell.harmonicShield || 0) + shieldGained);
        shell.stars = targetBalancedStars;
      } else if (shell.stars < targetBalancedStars && shell.gravitationalChargePool >= 20) {
        // Compress stored gravitational pool into missing valence stars
        const added = Math.min(targetBalancedStars - shell.stars, Math.floor(shell.gravitationalChargePool / 20));
        starsDelta = added;
        shell.stars += added;
        shell.gravitationalChargePool -= added * 20;
      } else if (shell.stars < targetBalancedStars) {
        starsDelta = (targetBalancedStars - shell.stars);
        shell.stars = targetBalancedStars;
      }
      shell.overloadStrain = 0;
    } else if (parsedIntent.gravitationalChargeActive) {
      // LT + RT: Gravitational Charge pulls free Valence Stars into the shell
      actionTaken = 'GRAVITATIONAL_CHARGE';
      const intensity = parsedIntent.gravitationalChargeIntensity || 0.75;
      const pulledStars = Math.min(ambient, Math.max(1, Math.round(intensity * 3)));
      starsDelta = pulledStars;
      shell.stars = Math.min(shell.maxStars, shell.stars + pulledStars);
      shell.gravitationalChargePool = Math.min(100, (shell.gravitationalChargePool || 0) + Math.round(intensity * 25));
    }

    const currentState = evaluateValenceState(shell);
    if (currentState === VALENCE_STATES.OVERBALANCED && actionTaken !== 'VALENCE_REGULATION') {
      shell.overloadStrain = Math.min(100, (shell.overloadStrain || 0) + 10);
    }

    const result = {
      actionTaken: actionTaken,
      starsDelta: starsDelta,
      stars: shell.stars,
      previousState: prevState,
      currentState: currentState,
      transitioned: prevState !== currentState,
      harmonicShield: shell.harmonicShield,
      overloadStrain: shell.overloadStrain,
      gravitationalChargePool: shell.gravitationalChargePool
    };

    if (actionTaken !== 'NONE') {
      shell.history.unshift({
        reason: actionTaken,
        delta: starsDelta,
        stars: shell.stars,
        previousState: prevState,
        currentState: currentState,
        transitioned: prevState !== currentState
      });
      if (shell.history.length > 20) shell.history.pop();
    }

    return result;
  }

  // ============================================================================
  // 4. DIVINE-12 ELEMENTAL NODE CAP ENFORCER (5 MELLA + 3x3 COMPANION = 14 NODES)
  // ============================================================================

  /**
   * Builds a default 5-Node MELLA fighter rig:
   * - `MELLA_CROWN`      (Y Lane - Crown / Allotrope Shift)
   * - `MELLA_LEFT_CORE`  (X Lane - Left-Core Magnetic Anchor)
   * - `MELLA_RIGHT_CORE` (B Lane - Right-Core Bioelectric Projection)
   * - `MELLA_ROOT_LEFT`  (A Lane - Left Root Prosthetic / Galaxy Gallium Load Path)
   * - `MELLA_ROOT_RIGHT` (A Lane - Right Root Ground Drive)
   */
  function createMellaFiveNodes(customNodes) {
    const defaults = [
      { nodeId: 'MELLA_CROWN',      source: 'MELLA_5', slot: 'CROWN',      element: 'Rh', resonance: 92, pillar: 'CROWN' },
      { nodeId: 'MELLA_LEFT_CORE',  source: 'MELLA_5', slot: 'LEFT_CORE',  element: 'Fe', resonance: 86, pillar: 'CORE' },
      { nodeId: 'MELLA_RIGHT_CORE', source: 'MELLA_5', slot: 'RIGHT_CORE', element: 'Cu', resonance: 88, pillar: 'CORE' },
      { nodeId: 'MELLA_ROOT_LEFT',  source: 'MELLA_5', slot: 'ROOT_LEFT',  element: 'Ga', resonance: 90, pillar: 'ROOT' },
      { nodeId: 'MELLA_ROOT_RIGHT', source: 'MELLA_5', slot: 'ROOT_RIGHT', element: 'C',  resonance: 84, pillar: 'ROOT' }
    ];
    if (Array.isArray(customNodes) && customNodes.length === 5) {
      return customNodes.map(function (n, idx) {
        return Object.assign({}, defaults[idx], n, { source: 'MELLA_5' });
      });
    }
    return defaults;
  }

  /**
   * Builds a 3x3 Companion Squadron Node Grid (3 Companions x 3 CCR Nodes [Crown, Core, Root] = 9 nodes).
   */
  function createCompanion3x3Nodes(companions) {
    const gridNodes = [];
    const defaultElements = [
      ['Au', 'Mg', 'Si'],
      ['H',  'O',  'S'],
      ['A',  'P',  'N']
    ];

    for (let row = 0; row < 3; row++) {
      const comp = (Array.isArray(companions) && companions[row]) ? companions[row] : null;
      const compId = comp ? comp.id : ('COMP-' + (row + 1));
      const baseRes = comp && comp.trust !== undefined ? Math.max(20, comp.trust) : (78 - row * 12);

      const pillars = ['CROWN', 'CORE', 'ROOT'];
      for (let col = 0; col < 3; col++) {
        const pillar = pillars[col];
        let el = defaultElements[row][col];
        if (comp && comp.fiveStack) {
          if (pillar === 'CROWN' && comp.fiveStack.crown) el = comp.fiveStack.crown.element;
          else if (pillar === 'CORE' && comp.fiveStack.core1) el = comp.fiveStack.core1.element;
          else if (pillar === 'ROOT' && comp.fiveStack.root1) el = comp.fiveStack.root1.element;
        } else if (comp && comp.element && comp.element.id) {
          el = comp.element.id;
        }

        gridNodes.push({
          nodeId: 'COMP_' + (row + 1) + '_' + pillar,
          companionId: compId,
          gridCoord: { row: row, col: col },
          source: 'COMPANION_3X3',
          slot: pillar,
          element: el,
          resonance: Math.max(10, Math.min(100, baseRes - col * 4)),
          pillar: pillar
        });
      }
    }
    return gridNodes;
  }

  /**
   * Enforces the Divine-12 Elemental Node Cap across the 5 MELLA fighter nodes + 3x3 (9) Companion nodes:
   * - Total input nodes = 14 (or arbitrary array up to/exceeding 14).
   * - Sorts all nodes by `resonance` descending (with MELLA_5 tie-breaker priority).
   * - Activates the top 12 nodes (`active: true, dimmed: false, status: 'ACTIVE_DIVINE_12'`).
   * - Dims all remaining lower-resonance nodes (`active: false, dimmed: true, status: 'DIMMED_LOW_RESONANCE', powerOutputMultiplier: 0`).
   */
  function enforceDivine12NodeCap(mellaNodes, companion3x3Nodes) {
    const mNodes = Array.isArray(mellaNodes) && mellaNodes.length > 0
      ? mellaNodes
      : createMellaFiveNodes();
    const cNodes = Array.isArray(companion3x3Nodes) && companion3x3Nodes.length > 0
      ? companion3x3Nodes
      : createCompanion3x3Nodes();

    const combined = mNodes.concat(cNodes).map(function (node, index) {
      return Object.assign({}, node, {
        originalIndex: index,
        resonance: typeof node.resonance === 'number' ? node.resonance : 50
      });
    });

    // Sort by resonance descending; on exact tie, MELLA_5 core body nodes take priority
    const ranked = combined.slice().sort(function (a, b) {
      if (b.resonance !== a.resonance) {
        return b.resonance - a.resonance;
      }
      if (a.source === 'MELLA_5' && b.source !== 'MELLA_5') return -1;
      if (b.source === 'MELLA_5' && a.source !== 'MELLA_5') return 1;
      return a.originalIndex - b.originalIndex;
    });

    const activeSet = {};
    for (let i = 0; i < Math.min(DIVINE_12_CAP, ranked.length); i++) {
      activeSet[ranked[i].nodeId] = i + 1; // 1-based Divine-12 rank
    }

    const evaluatedNodes = combined.map(function (node) {
      const rank = activeSet[node.nodeId] || null;
      const isActive = rank !== null;
      return Object.assign({}, node, {
        active: isActive,
        dimmed: !isActive,
        divineRank: rank,
        powerOutputMultiplier: isActive ? 1.0 : 0.0,
        visualOpacity: isActive ? 1.0 : 0.25,
        status: isActive ? 'ACTIVE_DIVINE_12' : 'DIMMED_LOW_RESONANCE'
      });
    });

    const activeNodes = evaluatedNodes.filter(function (n) { return n.active; });
    const dimmedNodes = evaluatedNodes.filter(function (n) { return n.dimmed; });

    return {
      totalNodes: evaluatedNodes.length,
      capLimit: DIVINE_12_CAP,
      activeCount: activeNodes.length,
      dimmedCount: dimmedNodes.length,
      activeNodes: activeNodes,
      dimmedNodes: dimmedNodes,
      allNodes: evaluatedNodes
    };
  }

  // ============================================================================
  // 5. INTEGRATED MELLA COMBAT EXCHANGE & CCR TRIANGLE RESOLVER
  // ============================================================================

  /**
   * Executes a complete MELLA combat frame combining:
   * - Nimbus Right-Stick Intent + Face-Button Power Lane (`Y / X / B / A`)
   * - Valence Shell state multipliers & star expenditure
   * - Divine-12 active node check (if a power lane's node is dimmed, output is blunted by 60%)
   * - CCR Triangle Check (`CROWN` beats `CORE`, `CORE` beats `ROOT`, `ROOT` beats `CROWN`)
   */
  function executeMellaCombatFrame(params) {
    params = params || {};
    const controllerInput = params.controllerInput || {};
    const shell = params.valenceShell || createValenceShell();
    const defenderMove = params.defenderMove || 'Guard';
    const nodeCapState = enforceDivine12NodeCap(params.mellaNodes, params.companion3x3Nodes);

    // 1. Parse controller intent
    const intent = parseNimbusIntent(controllerInput);

    // 2. Process Gravitational Charge (LT+RT) or Valence Regulation (LB+RB+D-Pad Down)
    const shellStep = stepValenceControllerActions(shell, intent, params.ambientStarsAvailable);

    // 3. Determine primary attack pillar and base damage from power lane or right-stick melee
    let chosenLane = intent.activePowerLanes.length > 0 ? intent.activePowerLanes[0] : null;
    let attackPillar = 'ROOT';
    let baseDamage = 18;
    let moveLabel = 'Advance';
    let nodeSlotUsed = 'MELLA_ROOT_RIGHT';

    if (chosenLane) {
      attackPillar = chosenLane.ccrPillar;
      baseDamage = chosenLane.baseDamage;
      nodeSlotUsed = chosenLane.nodeSlot;
      moveLabel = attackPillar === 'CROWN' ? 'Crown' : (attackPillar === 'CORE' ? 'Guard' : 'Flank');

      // Spend Valence Stars for power lane if available
      if (shell.stars >= chosenLane.valenceCost) {
        modifyValenceStars(shell, -chosenLane.valenceCost, 'POWER_LANE_' + chosenLane.button);
      } else {
        baseDamage *= 0.65; // Under-fueled lane penalty
      }

      if (chosenLane.button === 'Y') {
        shell.allotropeForm = shell.allotropeForm === 'Diamond-Hardened' ? 'Graphene-Conductive' : 'Diamond-Hardened';
      }
    } else if (intent.activeIntent && intent.meleeStrike) {
      attackPillar = intent.meleeStrike.ccrBias;
      baseDamage = Math.round(20 * intent.meleeStrike.dmgMult * intent.vector.magnitude);
      moveLabel = attackPillar === 'CROWN' ? 'Crown' : (attackPillar === 'CORE' ? 'Guard' : 'Advance');
    }

    // 4. Check whether the node driving this move is active under the Divine-12 Cap
    const matchingNode = nodeCapState.allNodes.find(function (n) {
      return n.nodeId === nodeSlotUsed;
    });
    const nodeActive = matchingNode ? matchingNode.active : true;
    const nodeMultiplier = nodeActive ? 1.0 : 0.40;

    // 5. Valence Shell multiplier
    let valenceMultiplier = 1.0;
    if (shell.state === VALENCE_STATES.BALANCED) valenceMultiplier = 1.25;
    else if (shell.state === VALENCE_STATES.OVERBALANCED) valenceMultiplier = 1.40;
    else if (shell.state === VALENCE_STATES.UNDERBALANCED) valenceMultiplier = 0.75;

    // 6. Resolve CCR Triangle Check via BaseEngine or native fallback
    let ccrResolution = null;
    if (BaseEngine && typeof BaseEngine.resolveCCRTriangleCheck === 'function') {
      ccrResolution = BaseEngine.resolveCCRTriangleCheck(
        moveLabel,
        defenderMove,
        params.attackerArenaState || { strain: 0, gridPos: { x: 1, y: 1 }, elementId: matchingNode ? matchingNode.element : 'C' },
        params.arenaResidueGrid || []
      );
    } else {
      const defMap = { Crown: 'CROWN', Guard: 'CORE', Withdraw: 'CORE', Advance: 'ROOT', Flank: 'ROOT' };
      const defPillar = defMap[defenderMove] || 'CORE';
      let mult = 1.0;
      let outcome = 'NEUTRAL_EXCHANGE';
      if (
        (attackPillar === 'CROWN' && defPillar === 'CORE') ||
        (attackPillar === 'CORE' && defPillar === 'ROOT') ||
        (attackPillar === 'ROOT' && defPillar === 'CROWN')
      ) {
        mult = 1.40;
        outcome = 'CCR_ADVANTAGE';
      } else if (attackPillar !== defPillar) {
        mult = 0.65;
        outcome = 'CCR_DISADVANTAGE';
      }
      ccrResolution = {
        attackerPillar: attackPillar,
        defenderPillar: defPillar,
        outcome: outcome,
        damageMultiplier: mult
      };
    }

    const finalDamage = Number((baseDamage * valenceMultiplier * nodeMultiplier * ccrResolution.damageMultiplier).toFixed(2));

    return {
      intent: intent,
      valenceStep: shellStep,
      valenceState: shell.state,
      valenceStars: shell.stars,
      allotropeForm: shell.allotropeForm,
      chosenLane: chosenLane,
      nodeSlotUsed: nodeSlotUsed,
      nodeActiveUnderDivine12: nodeActive,
      divine12Summary: {
        totalNodes: nodeCapState.totalNodes,
        activeCount: nodeCapState.activeCount,
        dimmedCount: nodeCapState.dimmedCount
      },
      ccrResolution: ccrResolution,
      finalDamage: finalDamage
    };
  }

  // ============================================================================
  // 6. PUBLIC MODULE EXPORTS
  // ============================================================================

  return {
    COMBAT_VERSION,
    MAX_TOTAL_NODES,
    DIVINE_12_CAP,
    VALENCE_STATES,
    POWER_LANES,
    INTENT_SECTORS,
    parseNimbusIntent,
    createValenceShell,
    evaluateValenceState,
    modifyValenceStars,
    stepValenceControllerActions,
    createMellaFiveNodes,
    createCompanion3x3Nodes,
    enforceDivine12NodeCap,
    executeMellaCombatFrame
  };
}));