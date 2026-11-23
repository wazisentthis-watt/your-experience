/* WishBorn -> Mella Passport bridge. Records what the hero did with wild KAW in the shared wir.passport/1 ledger so other worlds can see it.
 * Idempotent event ids (saveId + kind + species); record/upgrade effects only, never a permanent downgrade; unknown worlds/fields untouched.
 * If the passport library is absent or fails, the game carries on and the events wait in S.wishborn.outbox. */
(function () {
  'use strict';
  const PP = () => window.WIR_PASSPORT, W = () => window.WISHBORN;
  function effects(type, d) {
    const n = d.sp && d.sp.name, id = d.sp && d.sp.id;
    if (type === 'observed') return { key: 'observed:' + id + ':' + (d.n || 1), summary: 'Observed ' + n + ' in the wild', eff: [{ layer: 'knowledge', key: 'kaw.observed.' + id, kind: 'record', op: 'delta', amount: 1, text: 'Watched ' + n + ' without startling it.' }] };
    if (type === 'joined') return { key: 'joined:' + id + ':' + (d.n || 1), summary: n + ' chose to walk with Mella', eff: [{ layer: 'relationships', key: 'rel.kaw.' + id, kind: 'upgrade', op: 'delta', amount: 2, text: n + ' chose to walk with you.' }] };
    if (type === 'parted') return { key: 'parted:' + id + ':' + Date.now().toString(36), summary: n + ' went its own way', eff: [{ layer: 'relationships', key: 'rel.kaw.' + id, kind: 'record', op: 'delta', amount: 0, text: n + ' went its own way (' + d.why + ').' }] };
    if (type === 'assist') return { key: 'assist:' + id + ':' + (d.n || 1), summary: n + ' helped Mella in a fight', eff: [{ layer: 'relationships', key: 'rel.kaw.' + id, kind: 'record', op: 'delta', amount: 0, text: n + ' used ' + d.fx + ' to help in a street fight.' }] };
    if (type === 'restored') return { key: 'restored:' + d.kind + ':' + (d.n || 1), summary: n + ' restored a ' + d.kind, eff: [{ layer: 'knowledge', key: 'kaw.fixture.' + d.kind, kind: 'record', op: 'delta', amount: 1, text: n + ' woke a ' + d.kind + (d.asked ? ' because you asked.' : ' on its own.') }] };
    if (type === 'rescue') return { key: 'rescue:' + id + ':' + Date.now().toString(36), summary: 'KAW rescue: ' + n + (d.ok ? ' (correct placement)' : ' (wrong placement)'),
      eff: d.ok ? [{ layer: 'skills', key: 'kaw.catcher', kind: 'upgrade', op: 'delta', amount: 1, text: 'Placed ' + n + ' where its condition needed.' }] : [{ layer: 'knowledge', key: 'kaw.catcher.lesson', kind: 'record', op: 'delta', amount: 1, text: 'Misplaced ' + n + '; check health before choosing.' }] };
    return null;
  }
  function flush() {
    const s = W() && W().state(), pp = PP(); if (!s || !pp || !s.outbox || !s.outbox.length) return;
    try { pp.init(); } catch (e) { s.passportError = String(e); return; }
    s.outbox = s.outbox.filter(ev => { try { const r = pp.applyEvent(ev); if (r && r.ok) { s.passportOk = (s.passportOk || 0) + 1; return false; } s.passportError = r && r.error; return true; } catch (e) { s.passportError = String(e); return true; } });
  }
  function start() {
    if (!W()) return;
    W().on((type, d) => {
      const s = W().state(), e = effects(type, d); if (!s || !e) return; s.outbox = s.outbox || [];
      s.outbox.push({ eventId: 'your:wishborn:' + s.id + ':' + e.key, source: { worldId: 'your', buildVersion: 'v2.4-wishborn', saveVersion: 'wishborn-1' }, at: new Date().toISOString(), summary: e.summary, effects: e.eff });
      if (s.outbox.length > 200) s.outbox.shift(); flush();
    });
    setInterval(flush, 5000);
  }
  window.WISHBORN_PASSPORT = { flush };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
