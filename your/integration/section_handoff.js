/* WIR Y.O.U.R. section handoff · Sprint 01 · PROPOSAL / PUBLISH HOLD.
 * Original-WIR code. No direct dependency on DOM, map engine, or Morrow sources.
 * This is an ARRIVAL CHECKPOINT, not the wir.passport/1 event ledger.
 * A destination must verify arrival after resolving a real walkable spawn.
 * Veyru is never spawned, teleported, granted permission, or commanded here.
 * This file is intentionally NOT loaded by index.html until integration QA passes.
 */
(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.WIRSectionHandoff = api;
})(typeof window !== 'undefined' ? window : null, function () {
  'use strict';
  var SCHEMA = 'wir.your-handoff/1';
  var GAME_ID = 'your_universe'; // existing wir.hero/1 games namespace, never a new localStorage key
  var SECTIONS = ['HOME', 'LIVING_DISTRICT', 'MORROW_CITY'];
  var EDGES = {
    HOME: ['LIVING_DISTRICT'],
    LIVING_DISTRICT: ['HOME', 'MORROW_CITY'],
    MORROW_CITY: ['LIVING_DISTRICT']
  };
  function identifier(s) { return typeof s === 'string' && /^[a-zA-Z0-9_:-]{1,64}$/.test(s); }
  function section(s) { return SECTIONS.indexOf(s) >= 0; }
  function edge(from, to) { return section(from) && section(to) && EDGES[from].indexOf(to) >= 0; }
  function coordinates(at) {
    return at && typeof at.x === 'number' && Number.isFinite(at.x) &&
      typeof at.y === 'number' && Number.isFinite(at.y);
  }
  function create(heroApi) {
    if (!heroApi || typeof heroApi.get !== 'function' ||
        typeof heroApi.exists !== 'function' || typeof heroApi.gameData !== 'function') {
      throw new Error('WIR_HERO API required; cannot create another hero or save');
    }
    function hero() {
      if (!heroApi.exists()) throw new Error('No existing WIR hero profile');
      var h = heroApi.get();
      if (!h || h.schema !== 'wir.hero/1' || !identifier(h.id)) {
        throw new Error('Unsupported WIR hero profile');
      }
      return h;
    }
    function prepare(o) {
      if (!o || !edge(o.from, o.to)) throw new Error('Section route not approved');
      if (!identifier(o.exitId) || !identifier(o.entryId)) throw new Error('World entry/exit anchors required');
      var h = hero();
      if (o.heroId !== undefined && o.heroId !== h.id) throw new Error('Hero identity changed');
      // No save here. The destination may fail to load or spawn.
      return Object.freeze({ schema: SCHEMA, heroId: h.id, from: o.from, to: o.to,
        exitId: o.exitId, entryId: o.entryId });
    }
    function confirmArrival(ticket, at) {
      if (!ticket || ticket.schema !== SCHEMA || !edge(ticket.from, ticket.to) ||
          !identifier(ticket.exitId) || !identifier(ticket.entryId)) throw new Error('Invalid handoff');
      if (!at || at.arrived !== true || at.section !== ticket.to ||
          at.entryId !== ticket.entryId || !coordinates(at)) {
        throw new Error('Destination has not confirmed a walkable arrival');
      }
      var h = hero();
      if (ticket.heroId !== h.id) throw new Error('Hero identity changed during travel');
      // checkpoint only. Do not duplicate Mella Passport events or Veyru saves.
      var previous = heroApi.gameData(GAME_ID);
      var data = Object.assign({}, previous && previous.data ? previous.data : {});
      data.checkpoint = { section: ticket.to, entryId: ticket.entryId, x: at.x, y: at.y };
      if (JSON.stringify(data).length > 4096) throw new Error('Hero gameData would exceed its 4 KB limit');
      var result = heroApi.gameData(GAME_ID, { data: data });
      if (!result || !result.data || !result.data.checkpoint ||
          result.data.checkpoint.section !== ticket.to) throw new Error('Handoff checkpoint was not saved');
      return result.data.checkpoint;
    }
    function resume() {
      hero();
      var g = heroApi.gameData(GAME_ID);
      var p = g && g.data && g.data.checkpoint;
      return p && section(p.section) && identifier(p.entryId) && coordinates(p) ?
        { section: p.section, entryId: p.entryId, x: p.x, y: p.y } : null;
    }
    return { prepare: prepare, confirmArrival: confirmArrival, resume: resume };
  }
  return Object.freeze({ SCHEMA: SCHEMA, GAME_ID: GAME_ID, SECTIONS: SECTIONS.slice(),
    isAllowed: edge, create: create });
});
