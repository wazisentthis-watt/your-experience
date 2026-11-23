/* WISHBORN WORLD for Y.O.U.R. — wild KAW creatures with real behavior, the 4-beat voluntary bond (Accord),
 * the KAW Catcher rescue flow, and Accord followers with needs. Ported from the Living World MELLA'z build
 * (V9 behavior engine, V10 Accord) and the KAW Catcher field-test rules.
 * Rules kept: no capture, no forced recruitment; wrong food is refused and kept; refusal is data; an Accord
 * follower is free to leave (max 2); Kito/Maji is never catchable; saves are only ever added to (S.wishborn).
 * Keys: E / A near a wild opens its panel · Whistle button calls followers · state in GM().S.wishborn. */
(function () {
  'use strict';
  const GM = () => window.WIR_GAME;
  const SP = window.WB_SPECIES || [];
  const ACCORD_MAX = 2, FEED_GAP_MS = 8000, HUNGRY_MS = 15 * 60000, WILD_CAP = 6, SPAWN_EVERY = 12;
  // temperament -> speed (tiles/s), flee radius, stress (lowers friendliness), calm-state rotation
  const TEMP = {
    skittish:    { spd: 1.5, flee: 4.2, stress: .12, rest: ['graze', 'wander', 'hide'] },
    grazer:      { spd: .9,  flee: 2.2, stress: 0,   rest: ['graze', 'graze', 'nap', 'wander'] },
    curious:     { spd: 1.1, flee: 1.8, stress: 0,   rest: ['wander', 'circle', 'graze'] },
    territorial: { spd: 1.3, flee: 1.2, stress: .2,  rest: ['patrol', 'graze', 'warn'] },
    trickster:   { spd: 1.6, flee: 2.5, stress: .05, rest: ['wander', 'dash', 'groom', 'circle'] },
    dasher:      { spd: 2.0, flee: 3.2, stress: .08, rest: ['dash', 'wander', 'graze'] },
  };
  const FEED = sp => /rain|kelp/.test(sp.food) ? 'water' : /halite|crystal/.test(sp.food) ? 'crystal' : 'berry';
  const FEED_TXT = { berry: 'Berry (Root)', water: 'Water (Core)', crystal: 'Crystal (Crown)' };
  const REALM_LAW = { meadow: 'Meadow Law: observe first, never corner.', woods: 'Woods Law: keep the canopy quiet.',
    shore: 'Shore Law: never pull from the water.', highlands: 'Highland Law: no chasing on ledges.' };
  const listeners = [];
  const emit = (type, d) => { for (const f of listeners) { try { f(type, d || {}); } catch (e) { } } };
  const R = { wilds: [], map: null, spawnT: 3, uid: 1, panel: null, hud: null, followers: [], hx: 0, hy: 0, hint: null };

  function st() {
    const S = GM().S; if (!S) return null;
    if (!S.wishborn) S.wishborn = { id: Math.random().toString(36).slice(2, 10), items: { berry: 3, water: 2, crystal: 1 }, accord: [], log: [], species: {}, rescue: { rep: 0, credits: 0, done: 0, wrong: 0 }, parted: 0 };
    return S.wishborn;
  }
  const rec = id => { const s = st(); return s.species[id] || (s.species[id] = { seen: 0, observed: 0, offers: 0, refusals: 0, invites: 0, declined: 0, joined: 0, faced: 0, lvl: 0 }); };
  const log = m => { const s = st(); s.log.unshift(m); if (s.log.length > 40) s.log.length = 40; };
  const toast = (m, c) => GM().toast(m, c || 'dim');
  const H = (a, b) => Math.hypot(a, b);
  const rnd = (a, b) => a + Math.random() * (b - a);

  // ---- art ----
  const IMG = new Image(); IMG.src = 'your/wishborn/art/wilds_atlas.png';
  const ready = () => IMG.complete && IMG.naturalWidth > 0;

  // ---- spawning: each wild belongs to a realm; the city picks a realm by name hash so every city feels different ----
  const REALMS = ['meadow', 'woods', 'shore', 'highlands'];
  function realmFor(mapId) { let h = 0; for (const c of mapId) h = (h * 31 + c.charCodeAt(0)) >>> 0; return REALMS[h % 4]; }
  function pool(mapId) { const rl = realmFor(mapId), a = SP.filter(s => s.region === rl), b = SP.filter(s => s.region !== rl); return Math.random() < .75 ? a : b; }
  function freeTile(cx0, cy0, minD, maxD) {
    const m = GM().G.map;
    for (let i = 0; i < 80; i++) {
      const a = Math.random() * 6.283, d = rnd(minD, maxD), x = Math.floor(cx0 + Math.cos(a) * d), y = Math.floor(cy0 + Math.sin(a) * d);
      if (GM().walkable(m, x, y)) return [x + .5, y + .5];
    }
    return null;
  }
  function spawn(sp, pos, hurt) {
    const t = TEMP[sp.beh] || TEMP.grazer, w = { id: R.uid++, sp, map: GM().G.map.id, x: pos[0], y: pos[1], hx: pos[0], hy: pos[1], dir: 1, anim: Math.random() * 9,
      st: 'graze', stT: rnd(2, 5), tx: pos[0], ty: pos[1], moving: false, emote: '', emoteT: 0, watch: 0, offers: 0, lastFeed: -1e9, gone: false,
      // KAW Catcher fields: fear / trust / health, assessed, region law
      fear: hurt ? 70 : rnd(35, 60), trust: hurt ? 5 : 10, health: hurt ? rnd(25, 55) : 100, assessed: false, hurt: !!hurt, rescued: false };
    R.wilds.push(w); rec(sp.id).seen++; return w;
  }
  function seedMap() {
    const G = GM().G; if (!G.map || G.map.id === 'HOME') return;
    R.wilds = R.wilds.filter(w => w.map === G.map.id);
    while (R.wilds.length < 3) { const p = freeTile(G.px, G.py, 5, 14), sp = pool(G.map.id); if (!p || !sp.length) break; spawn(sp[Math.floor(Math.random() * sp.length)], p, Math.random() < .25); }
  }

  // ---- behavior: perception -> state; one state at a time, 12 states ----
  function setSt(w, s, t) { w.st = s; w.stT = t === undefined ? rnd(2, 5) : t; }
  function moveTo(w, x, y, spd, dt) {
    const m = GM().G.map, dx = x - w.x, dy = y - w.y, d = H(dx, dy); if (d < .12) { w.moving = false; return true; }
    const sx = dx / d * spd * dt, sy = dy / d * spd * dt;
    if (GM().walkable(m, Math.floor(w.x + sx), Math.floor(w.y))) w.x += sx;
    if (GM().walkable(m, Math.floor(w.x), Math.floor(w.y + sy))) w.y += sy;
    if (Math.abs(sx) > .001) w.dir = sx > 0 ? 1 : -1; w.moving = true; return false;
  }
  function pickSpot(w, r) { for (let i = 0; i < 10; i++) { const x = w.hx + rnd(-r, r), y = w.hy + rnd(-r, r); if (GM().walkable(GM().G.map, Math.floor(x), Math.floor(y))) return [x, y]; } return [w.x, w.y]; }
  function thinkWild(w, dt) {
    const G = GM().G, t = TEMP[w.sp.beh] || TEMP.grazer, dh = H(G.px - w.x, G.py - w.y), moving = G.moving, body = rec(w.sp.id);
    w.anim += dt * (w.moving ? 7 : 1.5); if (w.emoteT > 0) w.emoteT -= dt; else w.emote = '';
    w.stT -= dt;
    // hurt creatures do not run far; they limp and hide
    const fleeR = w.hurt && !w.rescued ? t.flee * .5 : t.flee;
    const threat = dh < fleeR && (moving || dh < fleeR * .45) && w.trust < 40 && w.st !== 'held';
    if (threat && w.st !== 'flee' && w.st !== 'warn' && w.st !== 'charge') {
      if (w.sp.beh === 'territorial' && !w.hurt) { setSt(w, 'warn', 1.2); w.emote = '!'; w.emoteT = 1; body.faced++; }
      else { setSt(w, 'flee', 1.6); w.emote = '!'; w.emoteT = 1; }
    }
    if (w.st === 'warn' && w.stT <= 0) setSt(w, dh < t.flee ? 'charge' : 'patrol', 1);
    if (w.st === 'flee') {
      const a = Math.atan2(w.y - G.py, w.x - G.px) + rnd(-.4, .4); moveTo(w, w.x + Math.cos(a) * 3, w.y + Math.sin(a) * 3, t.spd * 2.1 * (w.hurt ? .55 : 1), dt);
      w.fear = Math.min(100, w.fear + dt * 3); if (w.stT <= 0 || dh > fleeR * 2) setSt(w, w.sp.beh === 'skittish' ? 'hide' : 'wander', 3); return;
    }
    if (w.st === 'charge') { moveTo(w, G.px, G.py, t.spd * 2.2, dt); if (w.stT <= 0 || dh < .7) { setSt(w, 'wander', 3); w.fear = Math.min(100, w.fear + 8); if (dh < .7) toast(w.sp.name + ' shoved past you. Back off and let it settle.'); } return; }
    // watched: stand still nearby and it records you as calm
    if (dh < 4 && !moving && w.st !== 'flee') { w.watch += dt; if (w.watch > 2.2 && rec(w.sp.id).observed < 3) { rec(w.sp.id).observed++; w.watch = 0; w.trust = Math.min(100, w.trust + 6); w.emote = '·'; w.emoteT = 1.2; if (rec(w.sp.id).observed === 1) { toast('Observed: ' + w.sp.name + '. New field note.'); rec(w.sp.id).lvl = Math.max(rec(w.sp.id).lvl, 1); emit('observed', { sp: w.sp, n: rec(w.sp.id).observed }); } } }
    else w.watch = Math.max(0, w.watch - dt);
    if (w.st === 'held') { w.moving = false; return; }
    if (w.stT <= 0) { const pickS = t.rest[Math.floor(Math.random() * t.rest.length)]; setSt(w, pickS, rnd(2, 6)); if (pickS === 'wander' || pickS === 'patrol' || pickS === 'dash' || pickS === 'circle') { const p = pickSpot(w, pickS === 'dash' ? 6 : 3.5); w.tx = p[0]; w.ty = p[1]; } }
    switch (w.st) {
      case 'wander': case 'patrol': if (moveTo(w, w.tx, w.ty, t.spd * (w.hurt ? .5 : 1), dt)) setSt(w, 'graze', rnd(2, 4)); break;
      case 'dash': if (moveTo(w, w.tx, w.ty, t.spd * 2.4, dt)) setSt(w, 'groom', 2); break;
      case 'circle': { const a = w.anim * .35; moveTo(w, G.px + Math.cos(a) * 2.6, G.py + Math.sin(a) * 2.6, t.spd, dt); if (dh > 7) setSt(w, 'wander', 3); break; }
      case 'hide': moveTo(w, w.hx, w.hy, t.spd, dt); break;
      case 'call': case 'groom': case 'warn': case 'nap': case 'graze': default: w.moving = false;
    }
    // injured wild: slow health loss until helped, so rescue matters
    if (w.hurt && !w.rescued) w.health = Math.max(5, w.health - dt * .05);
    // calm creatures with high trust come to you
    if (w.trust >= 60 && dh > 1.6 && dh < 6) moveTo(w, G.px, G.py, t.spd * .6, dt);
    // trust and fear drift back over time
    w.fear = Math.max(0, w.fear - dt * .4); if (w.trust > 10) w.trust = Math.max(10, w.trust - dt * .05);
  }

  // ---- Accord followers: needs, follow/return/wander/investigate/nap/lost ----
  function followerObjs() {
    const s = st(), G = GM().G;
    R.followers = s.accord.map((a, i) => R.followers.find(f => f.a === a) || { a, sp: SP.find(x => x.id === a.sp), x: G.px - .8 - i * .6, y: G.py + .8, dir: 1, anim: 0, moving: false, st: 'follow', stT: 0, emote: '', emoteT: 0, tx: 0, ty: 0 }).filter(f => f.sp);
  }
  function tickFollowers(dt) {
    const s = st(), G = GM().G, m = G.map; if (G.map.id === 'HOME') return;
    if (R.followers.length !== s.accord.length) followerObjs();
    const inFight = performance.now() - (R.fightAt || -1e9) < 400;
    R.followers.forEach((f, i) => {
      if (inFight) return;
      f.anim += dt * (f.moving ? 7 : 1.5); f.stT -= dt; if (f.emoteT > 0) f.emoteT -= dt; else f.emote = '';
      const dh = H(G.px - f.x, G.py - f.y), hung = Date.now() - (f.a.fedAt || 0) > HUNGRY_MS * .66;
      if (dh > 14) { f.x = G.px - .8; f.y = G.py + .8; f.st = 'follow'; }
      if (f.st === 'idle' || f.st === 'nap') { if (f.stT <= 0 || (G.moving && dh > 2.5)) f.st = 'follow'; f.moving = false; return; }
      if (f.st === 'investigate') { if (GM().walkable(m, Math.floor(f.tx), Math.floor(f.ty))) { if (moveTo(f, f.tx, f.ty, 1.6, dt) || f.stT <= 0) { f.st = 'idle'; f.stT = 2; f.emote = '?'; f.emoteT = 1.5; } } else f.st = 'follow'; return; }
      const tgt = [G.px - .8 - i * .7, G.py + .7]; const d = H(tgt[0] - f.x, tgt[1] - f.y);
      if (d > .9) moveTo(f, tgt[0], tgt[1], d > 5 ? 3.4 : 1.9, dt); else { f.moving = false; if (!G.moving && Math.random() < dt * .08) { const r = Math.random(); if (r < .35) { f.st = 'nap'; f.stT = rnd(4, 8); } else if (r < .7) { f.st = 'investigate'; f.stT = 5; const p = [f.x + rnd(-3, 3), f.y + rnd(-3, 3)]; f.tx = p[0]; f.ty = p[1]; } else { f.st = 'idle'; f.stT = 3; } } }
      if (hung && Math.random() < dt * .1) { f.emote = '~'; f.emoteT = 1.5; }
    });
    // an Accord follower that has not been fed for a long while may part ways — it was never captured
    R.partT = (R.partT || 0) + dt; if (R.partT > 240) { R.partT = 0; for (const a of s.accord.slice()) if (Date.now() - (a.fedAt || 0) > HUNGRY_MS && Math.random() < .3) part(a.sp, 'nobody shared food with it for a long while'); }
  }
  function part(id, why) { const s = st(), sp = SP.find(x => x.id === id); s.accord = s.accord.filter(a => a.sp !== id); R.followers = R.followers.filter(f => f.sp.id !== id); s.parted++; if (sp) { emit('parted', { sp, why }); log(sp.name + ' went its own way — ' + why + '.'); toast(sp.name + ' went its own way.', 'dim'); } GM().save(); render(); }
  function whistle() { R.followers.forEach(f => { f.st = 'follow'; f.emote = '♪'; f.emoteT = 1.2; const G = GM().G; if (H(G.px - f.x, G.py - f.y) > 4) { f.x = G.px - .8; f.y = G.py + .8; } }); toast(R.followers.length ? 'You whistle. Your Accord comes in.' : 'Nobody is walking with you yet.'); }

  // ---- the 4-beat bond ----
  function pFriendly(w) {
    const t = TEMP[w.sp.beh] || TEMP.grazer, r = rec(w.sp.id);
    return Math.max(0, Math.min(.95, .15 + .1 * r.lvl + .12 * w.offers + .04 * Math.min(5, r.offers) - t.stress - Math.min(.2, r.faced * .05) - (w.fear > 60 ? .15 : 0) + (w.trust > 40 ? .1 : 0)));
  }
  const beat = w => { const r = rec(w.sp.id); return r.lvl < 2 ? 1 : w.offers < 1 ? 2 : w.offers < 2 ? 3 : 4; };
  function offer(w, item) {
    const s = st(), r = rec(w.sp.id), want = FEED(w.sp);
    if (!s.items[item]) return;
    if (item !== want || w.st === 'flee') { r.refusals++; w.emote = 'x'; w.emoteT = 1.5; log(w.sp.name + ' turned down ' + item + ' (refusal is data).'); toast(w.sp.name + ' sniffs the ' + item + ' and turns away. You keep it.'); GM().save(); render(); return; }
    if (performance.now() - w.lastFeed < FEED_GAP_MS) { toast(w.sp.name + ' is still eating. Give it a moment.'); return; }
    s.items[item]--; w.offers++; w.lastFeed = performance.now(); r.offers++; r.lvl = Math.max(2, r.lvl); w.trust = Math.min(100, w.trust + 14); w.fear = Math.max(0, w.fear - 12); setSt(w, 'graze', 4); w.emote = '♥'; w.emoteT = 2;
    toast(w.sp.name + ' took the ' + item + '.' + (w.offers === 1 ? ' Offer again in a little while.' : ' It watches you differently now.'), 'gold'); GM().save(); render();
  }
  function invite(w) {
    const s = st(), r = rec(w.sp.id), p = pFriendly(w); if (s.accord.length >= ACCORD_MAX || beat(w) < 4) return;
    r.invites++;
    if (p < .55 || Math.random() > p) { r.declined++; w.offers = 1; setSt(w, 'wander', 3); w.emote = '…'; w.emoteT = 2; log(w.sp.name + ' declined to walk with you (pFriendly ' + p.toFixed(2) + ').'); toast(w.sp.name + ' considers it… and stays. Maybe another day.'); GM().save(); R.panel = null; render(); return; }
    r.joined++; r.lvl = Math.max(3, r.lvl); s.accord.push({ sp: w.sp.id, since: new Date().toISOString(), fedAt: Date.now() }); w.gone = true; R.wilds = R.wilds.filter(x => x !== w);
    log(w.sp.name + ' chose to walk with you. It can leave whenever it wants.'); emit('joined', { sp: w.sp, n: r.joined }); toast(w.sp.name + ' chose to walk with you.', 'gold'); followerObjs(); GM().save(); R.panel = null; render();
  }
  function feedFollower(id, item) {
    const s = st(), a = s.accord.find(x => x.sp === id), sp = SP.find(x => x.id === id); if (!a || !s.items[item]) return;
    if (item !== FEED(sp)) { toast(sp.name + ' turns it down. You keep it.'); return; }
    s.items[item]--; a.fedAt = Date.now(); toast(sp.name + ' eats and settles.', 'gold'); GM().save(); render();
  }

  // ---- KAW Catcher rescue: calm -> assess -> contain -> release (healthy) or care (hurt / realm 8) ----
  const clamp = v => Math.max(0, Math.min(100, v));
  const rescue = {
    calm(w) { w.fear = clamp(w.fear - 19); w.trust = clamp(w.trust + 17); toast('You stay low and slow. Fear ' + Math.round(w.fear) + ' · Trust ' + Math.round(w.trust)); },
    assess(w) { w.assessed = true; w.fear = clamp(w.fear - 5); toast(w.sp.name + ': health ' + Math.round(w.health) + (w.health < 65 ? ' — needs care.' : ' — fine, can be released.')); },
    contain(w) {
      if (!w.assessed || w.fear > 45 || w.trust < 30) { w.fear = clamp(w.fear + 7); setSt(w, 'flee', 1.2); toast('Too soon. It bolts. (Assess first, fear 45 or less, trust 30 or more.)', 'bad'); return; }
      w.st = 'held'; w.held = true; toast(w.sp.name + ' is safely contained. Choose where it goes.', 'gold');
    },
    resolve(w, place) {
      const s = st(), needsCare = w.health < 65, ok = needsCare ? place === 'care' : place === 'release';
      if (ok) { s.rescue.rep += 6; s.rescue.credits += 120; s.rescue.done++; GM().S.cash = (GM().S.cash || 0) + 120; toast((needsCare ? 'Brought to care' : 'Released') + '. Rep +6 · $120.', 'gold'); w.rescued = true; w.hurt = false; w.health = needsCare ? 100 : w.health; }
      else { s.rescue.rep -= 9; s.rescue.credits += 20; s.rescue.wrong++; GM().S.cash = (GM().S.cash || 0) + 20; toast('Wrong place for its condition. Rep -9 · $20.', 'bad'); w.rescued = true; }
      log('Rescue: ' + w.sp.name + ' → ' + place + (ok ? ' (correct)' : ' (wrong)')); emit('rescue', { sp: w.sp, place, ok, needsCare }); w.held = false; setSt(w, 'wander', 2); w.fear = 30; w.trust = Math.max(w.trust, 40);
      if (needsCare) { R.wilds = R.wilds.filter(x => x !== w); } GM().save(); R.panel = null; render();
    },
  };


  // ---- fights: allies help with their own power, on their own timing, and may say no ----
  const FX_COL = { shock: '#7fd7ff', burn: '#ff8a3d', snare: '#6fcf7a', stagger: '#e8f0ff', heal: '#76e086' };
  const FX_NAME = { shock: 'Zap', burn: 'Ember', snare: 'Root', stagger: 'Shove', heal: 'Mend' };
  const ASSIST_CD = 7, ASSIST_NEAR = 9;
  const clampN = (v, a, b) => Math.max(a, Math.min(b, v));
  // Veyru (Water + Plant) joins through his own brain state: willingness uses the same inputs as his recall rule.
  function veyru() {
    const V = window.YOUR_V24, G = GM().G; if (!V || !V.state) return null; let v; try { v = V.state(); } catch (e) { return null; }
    if (!v || !v.accompanied || v.currentMap !== G.map.id) return null;
    const n = v.needs || {}, t = v.traits || {};
    const will = clampN(.32 + (v.bond || 0) * .006 + (t.sociability || 0) * .0025 - (n.restNeed || 0) * .003 - (n.fear || 0) * .003 - ((n.hunger || 0) > 70 ? .15 : 0), .04, .96);
    return { key: 'veyru', name: v.name || 'Veyru', fx: 'veyru', will, v, get cd() { return R.vcd || 0; }, set cd(x) { R.vcd = x; } };
  }
  function assistants() {
    const out = R.followers.filter(f => f.st !== 'power').map(f => {
      const hungry = Date.now() - (f.a.fedAt || 0) > HUNGRY_MS * .66, tired = (f.a.energy == null ? 1 : f.a.energy) < .25;
      return { key: f.sp.id, name: f.sp.name, fx: f.sp.fx, f, will: clampN(.62 + Math.min(3, f.a.restores || 0) * .06 - (hungry ? .3 : 0) - (tired ? .3 : 0), .05, .95), hungry, tired, get cd() { return f.fcd || 0; }, set cd(x) { f.fcd = x; } };
    });
    const vy = veyru(); if (vy) out.push(vy); return out;
  }
  const posOf = a => a.f ? { x: a.f.x, y: a.f.y } : (() => { const h = GM().G; return { x: h.px - 1.1, y: h.py + .4 }; })();
  function cast(a, api, why) {
    const foe = api.foe(), hero = api.hero(), pos = posOf(a); if (!foe) return false;
    let fx = a.fx; if (fx === 'veyru') fx = api.hp() < api.maxHp() * .55 ? 'heal' : (foe.st === 'wind' ? 'snare' : 'heal'); // Water mends, Plant roots
    const col = FX_COL[fx], dfoe = H(foe.x - hero.x, foe.y - hero.y);
    if (fx === 'heal') { api.beam(pos.x, pos.y, hero.x, hero.y, col); api.heal(12); }
    else if (fx === 'shock') { api.beam(pos.x, pos.y, foe.x, foe.y, col); api.hit(8, col); api.stagger(.6); api.burst(foe.x, foe.y - .4, col, 10); }
    else if (fx === 'burn') { api.beam(pos.x, pos.y, foe.x, foe.y, col); api.hit(6, col); api.burn(3, 3.0); }
    else if (fx === 'snare') { api.beam(pos.x, pos.y, foe.x, foe.y, col); api.root(1.8); if (foe.st === 'wind') { foe.st = 'idle'; foe.atk = null; foe.cd = 1.2; } }
    else if (fx === 'stagger') { api.beam(pos.x, pos.y, foe.x, foe.y, col); api.push(1.4); if (foe.st === 'wind') { foe.st = 'stagger'; foe.stT = .7; foe.atk = null; } api.hit(5, col); }
    api.text(pos.x, pos.y - 1, FX_NAME[fx] + '!', col); api.shake(.1);
    a.cd = ASSIST_CD + Math.random() * 2;
    if (a.f) { a.f.st = 'call'; a.f.stT = .5; a.f.emote = '✦'; a.f.emoteT = 1; a.f.a.energy = Math.max(0, (a.f.a.energy == null ? 1 : a.f.a.energy) - .1); a.f.dir = foe.x > a.f.x ? 1 : -1; }
    else if (a.v && a.v.needs) a.v.needs.restNeed = Math.min(100, (a.v.needs.restNeed || 0) + 6);
    api.log(a.name + ' used ' + FX_NAME[fx] + (why === 'called' ? ' (you called)' : ' (its own call)') + '.'); st().assists = (st().assists || 0) + 1;
    if (a.f) emit('assist', { sp: a.f.sp, fx, n: st().assists });
    return true;
  }
  // each ally decides by itself every beat: help only when its power fits the moment
  function wantsToHelp(a, api) {
    const foe = api.foe(), hero = api.hero(), d = H(foe.x - hero.x, foe.y - hero.y), hurt = api.hp() < api.maxHp() * .45, wind = foe.st === 'wind' && foe.atk;
    const fx = a.fx === 'veyru' ? (hurt ? 'heal' : wind ? 'snare' : null) : a.fx;
    if (fx === 'heal') return hurt;
    if (fx === 'snare' || fx === 'stagger') return !!wind && d < 4.5;
    if (fx === 'shock') return !!wind && d < 7;
    if (fx === 'burn') return !foe.burn && d < 7 && foe.st !== 'stagger';
    return false;
  }
  function fightTick(dt, api) {
    R.fightAt = performance.now(); const hero = api.hero(), foe = api.foe(); if (!foe) return;
    const list = assistants();
    for (const a of list) {
      a.cd = Math.max(0, a.cd - dt);
      if (a.f) { // stand off to the side at a safe distance and face the foe
        const f = a.f, ang = Math.atan2(foe.y - hero.y, foe.x - hero.x) + (R.followers.indexOf(f) ? -1.9 : 1.9), tx = hero.x + Math.cos(ang) * 2.4, ty = hero.y + Math.sin(ang) * 2.4;
        if (f.st === 'call') { f.stT -= dt; if (f.stT <= 0) f.st = 'follow'; } else { f.st = 'follow'; if (H(tx - f.x, ty - f.y) > .5) moveTo(f, tx, ty, 3, dt); else f.moving = false; }
        if (H(foe.x - f.x, foe.y - f.y) < 1.4) { const ax = f.x - foe.x, ay = f.y - foe.y, l = H(ax, ay) || 1; moveTo(f, f.x + ax / l * 2, f.y + ay / l * 2, 3.4, dt); } // keeps clear of the foe
        f.anim += dt * (f.moving ? 7 : 1.5);
      }
      a.think = (a.think || 0) - dt; if (a.cd > 0 || (a.think || 0) > 0) continue; a.think = .5 + Math.random() * .3;
      if (a.f && a.f.shy > 0) { a.f.shy -= dt; continue; }
      if (H(posOf(a).x - hero.x, posOf(a).y - hero.y) > ASSIST_NEAR) continue;
      if (a.tired || !wantsToHelp(a, api)) continue;
      if (Math.random() < a.will * .6) cast(a, api, 'own'); else { a.cd = 2; if (a.f) { a.f.emote = '…'; a.f.emoteT = 1; } }
    }
  }
  function fightCall(api) {
    const foe = api.foe(), hero = api.hero(); if (!foe) return;
    const list = assistants(); if (!list.length) { api.log('Nobody is walking with you to call.'); GM().toast('Nobody is walking with you. Bond with a KAW first.'); return; }
    const near = list.filter(a => H(posOf(a).x - hero.x, posOf(a).y - hero.y) <= ASSIST_NEAR); if (!near.length) { api.log('Nobody is close enough to hear you.'); return; }
    const ready = near.filter(a => a.cd <= 0); if (!ready.length) { api.log('They need a moment.'); return; }
    const a = ready.sort((x, y) => (wantsToHelp(y, api) ? 1 : 0) - (wantsToHelp(x, api) ? 1 : 0))[0];
    if (Math.random() < a.will) cast(a, api, 'called');
    else { a.cd = 3; if (a.f) { a.f.emote = '…'; a.f.emoteT = 1.5; } api.log(a.name + ' heard you and holds back' + (a.hungry ? ' (hungry)' : a.tired ? ' (tired)' : '') + '.'); GM().toast(a.name + ' holds back. ' + (a.hungry ? 'It seems hungry.' : a.tired ? 'It seems tired.' : 'Not now.')); }
  }

  // ---- UI ----
  function css() {
    const c = document.createElement('style');
    c.textContent = '#wbHud{position:absolute;left:10px;bottom:56px;z-index:4;display:flex;gap:6px;align-items:center}#wbHud button,#wbPanel button{border:1px solid #b99cff;background:rgba(23,20,44,.92);color:#d9c8ff;border-radius:10px;padding:8px 10px;font:800 11px system-ui,sans-serif;cursor:pointer}#wbHud button:disabled,#wbPanel button:disabled{opacity:.4}' +
      '#wbPanel{position:fixed;left:50%;top:12%;transform:translateX(-50%);z-index:58;width:min(92vw,380px);background:rgba(20,16,38,.96);border:2px solid #b99cff;border-radius:14px;padding:12px;font:600 12px system-ui,sans-serif;color:#f4eadb}#wbPanel[hidden]{display:none}#wbPanel h3{margin:0 0 6px;font-size:14px;color:#d9c8ff}#wbPanel p{margin:6px 0}#wbPanel .row{display:flex;gap:6px;flex-wrap:wrap}#wbPanel .bar{height:6px;background:#2d2748;border-radius:4px;overflow:hidden;margin:2px 0 6px}#wbPanel .bar i{display:block;height:100%}' +
      '.wbBeat{display:inline-block;padding:2px 6px;margin-right:4px;border-radius:8px;background:#2d2748;font-size:10px}.wbBeat.now{background:#b99cff;color:#1a1230}.wbBeat.done{background:#3f8a5f}';
    document.head.appendChild(c);
    R.hud = document.createElement('div'); R.hud.id = 'wbHud'; R.hud.innerHTML = '<button id="wbWhistle">Whistle</button><button id="wbAccord">Accord</button><span id="wbHint" style="font:700 11px system-ui;color:#d9c8ff;background:rgba(23,20,44,.85);padding:6px 8px;border-radius:10px" hidden></span>';
    document.body.appendChild(R.hud);
    R.panelEl = document.createElement('div'); R.panelEl.id = 'wbPanel'; R.panelEl.hidden = true; document.body.appendChild(R.panelEl);
    R.hud.querySelector('#wbWhistle').onclick = whistle;
    R.hud.querySelector('#wbAccord').onclick = () => { R.panel = { kind: 'accord' }; render(); };
  }
  const bar = (v, col) => '<div class="bar"><i style="width:' + Math.round(v) + '%;background:' + col + '"></i></div>';
  function render() {
    const el = R.panelEl; if (!el) return; const p = R.panel, s = st();
    if (!p || !s) { el.hidden = true; return; }
    el.hidden = false; const it = s.items;
    const items = k => '<button data-f="' + k + '" ' + (it[k] < 1 ? 'disabled' : '') + '>' + FEED_TXT[k] + ' · ' + it[k] + '</button>';
    if (p.kind === 'accord') {
      el.innerHTML = '<h3>Your Accord (' + s.accord.length + '/' + ACCORD_MAX + ')</h3><p>No capture. They walk with you by choice and can leave.</p>' +
        (s.accord.map(a => { const sp = SP.find(x => x.id === a.sp), hu = Math.min(100, (Date.now() - a.fedAt) / HUNGRY_MS * 100); return '<p><b>' + sp.name + '</b> · ' + sp.beh + ' · eats ' + sp.food + bar(100 - hu, hu > 66 ? '#ff7d6b' : '#6fcf7a') + '<span class="row">' + ['berry', 'water', 'crystal'].map(k => '<button data-fa="' + a.sp + ':' + k + '" ' + (it[k] < 1 ? 'disabled' : '') + '>Feed ' + k + '</button>').join('') + '<button data-part="' + a.sp + '">Part ways</button></span></p>'; }).join('') || '<p>Nobody yet. Observe a wild creature, offer what it eats, offer again, then invite.</p>') +
        '<p>Rescues done ' + s.rescue.done + ' · Rep ' + s.rescue.rep + '</p><p><button id="wbClose">Close</button></p>';
    } else {
      const w = p.w; if (!w || w.gone) { el.hidden = true; R.panel = null; return; } const r = rec(w.sp.id), b = beat(w), pf = pFriendly(w);
      const steps = ['Observe', 'Offer', 'Offer again', 'Invite'].map((t, i) => '<span class="wbBeat ' + (i + 1 < b ? 'done' : i + 1 === b ? 'now' : '') + '">' + (i + 1) + '. ' + t + '</span>').join('');
      el.innerHTML = '<h3>' + w.sp.name + (w.hurt ? ' · injured' : '') + '</h3><p>' + w.sp.fam + ' · ' + w.sp.beh + ' · ' + w.sp.pers + '</p><p>Fear' + bar(w.fear, '#ff7d6b') + 'Trust' + bar(w.trust, '#6fcf7a') + (w.assessed ? 'Health' + bar(w.health, '#55ddff') : '') + '</p>' +
        '<p>' + steps + '</p>' +
        (b === 1 ? '<p>Watch it first. Stand still nearby until it is Observed.</p>' : '<p>' + (r.lvl >= 2 ? 'It eats ' + w.sp.food + '.' : '') + ' Offer what it actually eats. The wrong thing is refused and kept.</p><p class="row">' + ['berry', 'water', 'crystal'].map(items).join('') + '</p>') +
        (b === 4 ? '<p><button id="wbInvite" ' + (s.accord.length >= ACCORD_MAX ? 'disabled' : '') + '>Invite it to walk with you</button> <small>' + (s.accord.length >= ACCORD_MAX ? 'Accord full. Part ways with one first.' : (pf >= .7 ? 'It seems at ease.' : pf >= .55 ? 'It seems open to it.' : 'It seems unsure.')) + '</small></p>' : '') +
        '<p><b>KAW Catcher</b> · ' + REALM_LAW[w.sp.region] + '</p><p class="row"><button data-r="calm">Calm</button><button data-r="assess">Assess</button><button data-r="contain">Contain</button></p>' +
        (w.held ? '<p class="row"><button data-p="release">Release it</button><button data-p="care">Take to care</button></p>' : '') +
        '<p><button id="wbClose">Back</button></p><small>No capture. If it comes, it can leave whenever it wants.</small>';
    }
    el.querySelectorAll('[data-f]').forEach(b => b.onclick = () => offer(p.w, b.dataset.f));
    el.querySelectorAll('[data-fa]').forEach(b => b.onclick = () => { const [i, k] = b.dataset.fa.split(':'); feedFollower(i, k); });
    el.querySelectorAll('[data-part]').forEach(b => b.onclick = () => part(b.dataset.part, 'you parted as friends'));
    el.querySelectorAll('[data-r]').forEach(b => b.onclick = () => { rescue[b.dataset.r](p.w); render(); });
    el.querySelectorAll('[data-p]').forEach(b => b.onclick = () => rescue.resolve(p.w, b.dataset.p));
    const iv = el.querySelector('#wbInvite'); if (iv) iv.onclick = () => invite(p.w);
    el.querySelector('#wbClose').onclick = () => { R.panel = null; render(); };
  }

  // ---- world hooks ----
  function nearestWild(maxD) { const G = GM().G; let best = null, bd = maxD; for (const w of R.wilds) { if (w.map !== G.map.id || w.gone) continue; const d = H(w.x - G.px, w.y - G.py); if (d < bd) { bd = d; best = w; } } return best; }
  function use() { const w = nearestWild(1.8); if (!w) return null; return () => { R.panel = { kind: 'wild', w }; render(); }; }
  function tick(dt) {
    const s = st(), G = GM().G; if (!s || !G.map) return; if (!R.hud && document.body) css();
    if (R.map !== G.map.id) { R.map = G.map.id; R.wilds = R.wilds.filter(w => w.map === G.map.id); R.spawnT = 2; R.followers.forEach(f => { f.x = G.px - .8; f.y = G.py + .8; }); if (G.map.id !== 'HOME') seedMap(); }
    if (G.map.id === 'HOME') { if (R.panel && R.panel.kind === 'wild') { R.panel = null; render(); } return; }
    R.spawnT -= dt; if (R.spawnT <= 0) { R.spawnT = SPAWN_EVERY; if (R.wilds.length < WILD_CAP) { const p = freeTile(G.px, G.py, 7, 15), sp = pool(G.map.id); if (p && sp.length) spawn(sp[Math.floor(Math.random() * sp.length)], p, Math.random() < .2); } }
    for (const w of R.wilds) if (!w.gone && w.map === G.map.id) thinkWild(w, dt);
    // wilds that drift far are recycled
    R.wilds = R.wilds.filter(w => !w.gone && H(w.x - G.px, w.y - G.py) < 40);
    tickFollowers(dt);
    const near = nearestWild(1.8); if (R.hud) { const h = R.hud.querySelector('#wbHint'); h.hidden = !near; if (near) h.textContent = near.sp.name + (near.hurt ? ' (hurt)' : '') + ' · press E'; }
    if (R.panel && R.panel.kind === 'wild' && (R.panel.w.gone || H(R.panel.w.x - G.px, R.panel.w.y - G.py) > 4)) { R.panel = null; render(); }
  }
  function drawCreature(c, t, hurt) {
    const T = GM().T, cx = GM().cx, X = c.x * T, Y = c.y * T; if (!ready()) return;
    const f = c.st === 'charge' ? 3 : c.st === 'call' || c.st === 'groom' || c.st === 'warn' ? 5 : c.moving ? 1 + (Math.floor(c.anim) % 2) : 0, s = 40;
    cx.save(); cx.translate(X, Y + (c.st === 'nap' ? 5 : 0)); cx.fillStyle = 'rgba(0,0,0,.3)'; cx.beginPath(); cx.ellipse(0, 3, 11, 4, 0, 0, 7); cx.fill();
    cx.scale(c.dir, 1); cx.imageSmoothingEnabled = false; if (hurt) cx.globalAlpha = .75; cx.drawImage(IMG, f * 64, c.sp.row * 64, 64, 64, -s / 2, -s + 4, s, s); cx.restore();
    if (c.emote) { cx.font = 'bold 13px system-ui'; cx.textAlign = 'center'; cx.fillStyle = c.emote === '!' ? '#ff7d6b' : '#fff'; cx.fillText(c.emote, X, Y - 44); }
    if (c.watch > .2) { cx.strokeStyle = '#b99cff'; cx.lineWidth = 2; cx.beginPath(); cx.arc(X, Y - 20, 22, -1.57, -1.57 + 6.283 * Math.min(1, c.watch / 2.2)); cx.stroke(); }
    if (c.hurt && !c.rescued) { cx.fillStyle = '#ff7d6b'; cx.font = 'bold 11px system-ui'; cx.textAlign = 'center'; cx.fillText('+', X + 14, Y - 30); }
  }
  function drawList(m, t) {
    const out = []; if (!m || !GM().S || m.id === 'HOME') return out;
    for (const w of R.wilds) if (w.map === m.id && !w.gone) out.push({ y: w.y + .1, f: () => drawCreature(w, t, w.hurt && !w.rescued) });
    for (const f of R.followers) out.push({ y: f.y + .1, f: () => drawCreature(f, t, false) });
    return out;
  }
  function enterMap() { R.map = null; R.panel = null; if (R.panelEl) render(); }

  window.WISHBORN = { fightTick, fightCall, assistants, on: f => listeners.push(f), tick, drawList, use, enterMap, state: st, species: SP, get wilds() { return R.wilds; }, get followers() { return R.followers; },
    _t: { thinkWild, offer, invite, rescue, pFriendly, beat, spawn, part, feedFollower, whistle, R, rec, FEED, TEMP, followerObjs } };
})();
