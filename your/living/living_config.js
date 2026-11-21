/* Y.O.U.R. Living District in root · config · PROPOSAL (draft PR for owner review). Drafted by WIR Recovery for owner review.
   The Living District is a district of a host city. To move it to another city, change hostCity below (one line); every other
   value has a default, and the gate finds a free spot in any host map if that city has no entry in hostGates. */
(function (W) {
  'use strict';
  W.YOUR_LIVING_CONFIG = {
    hostCity: 'SAV',   // OWNER (21 Nov 2026): "The Living District is a Savannah district" · the one line to change

    mapId: 'LIV',                       // root MAPS key for the district (no root city uses it)
    name: 'Living District',
    // PROPOSED: gate in the host city's back lot, east of the R-I-F-F-T station (tiles; x, y, w, h). Cities without an entry get an auto spot.
    hostGates: { SAV: [38, 24, 3, 2] },
    // PROPOSED: the district's west edge faces the host city. Arrive on the sidewalk south of the middle road; leave by walking into the west gate.
    entry: [3.5, 24.5],
    exitZone: [0, 21.5, 1.75, 4],        // x, y, w, h in tiles (the border column x = 0 is wall, so the hero reaches x ≈ 1.3)
    westGate: [1.4, 24.2],               // where the gate art stands
    // Handoff (your/integration/section_handoff.js): root's existing world (HOME + cities) counts as section HOME.
    handoff: { worldSection: 'HOME', districtSection: 'LIVING_DISTRICT', hostExitId: 'host_living_gate', districtEntryId: 'liv_west_gate' },
    // PR 1 (first playable) runs the sim with incidents, Iteron patrols, the Vesper calendar and The Divider switched off.
    quiet: true,
    art: 'your/living/assets/'
  };
})(typeof window !== 'undefined' ? window : globalThis);
