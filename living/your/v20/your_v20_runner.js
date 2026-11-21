/* Y.O.U.R. v2.0 activity runner · PROPOSAL_HOLD — boots the unchanged v1.2.1 game (your/game/*) straight into one activity for
   Valence Life, then reports the result to the parent page with postMessage and stops. Nothing in the v1.2.1 modules is edited:
   this file only wraps YOUR.core.scene.go and YOUR.game.finishActivity from the outside.
   URL: v20_runner.html?act=job|arena|boss|skate&day=<Valence day>&min=<minute of day>&story=<json>[&manual]
   Sync rules (PROPOSED): Valence owns the calendar and the story flags; the runner's own save keeps v1.2.1 per-day flags in step with
   the Valence day and starts each activity at full v1.2.1 energy (Valence needs are the stamina system in v2.0). */
(function () {
  var Y = window.YOUR, q = new URLSearchParams(location.search), act = q.get('act') || 'job', vday = Math.max(1, parseInt(q.get('day'), 10) || 1);
  var story = {}; try { story = JSON.parse(q.get('story') || '{}') || {}; } catch (e) { story = {}; }
  var R = window.YOUR_V20_RUNNER = { act: act, ready: false, exited: false, results: [], started: false };
  function post(m) { m.yourV20 = 1; try { if (window.parent && window.parent !== window) window.parent.postMessage(m, '*'); } catch (e) {} R.lastPost = m; }
  function clean(r) { var o = {}; ['act', 'result', 'paid', 'boss', 'count', 'score', 'rings', 'outcome'].forEach(function (k) { if (r && r[k] !== undefined) o[k] = r[k]; });
    if (r && r.fair) o.fair = { equity: r.fair.equity, route: r.fair.route, meter: r.fair.meter, seed: r.fair.seed }; return o; }
  Y.game.boot({ manual: q.has('manual') }).then(function () {
    var G = Y.game, sc = Y.core.scene, go = sc.go;
    var name = 'Hero'; try { name = window.WIR_HERO.get().name; } catch (e) {}
    var p = Y.profile.load() || Y.profile.create(name); G.prepare(p); p.name = name;
    if (p.day !== vday) { ['job', 'skate', 'football', 'combat', 'storeCount', 'talk_mara', 'talk_dex'].forEach(function (k) { delete p.flags[k]; }); p.day = vday; p.today = { day: vday, earned: 0, acts: [] }; }
    p.energy = p.maxEnergy; p.stamina = p.maxStamina; p.hp = p.maxHp; p.story = Object.assign({}, story);
    var mn = parseInt(q.get('min'), 10); Y.day.minutes = Math.max(Y.day.DAY_START, Math.min(Y.day.DAY_END - 61, isFinite(mn) ? mn : 600));
    Y.profile.save();
    var _fa = G.finishActivity;
    G.finishActivity = function (a, res) { var out = _fa.apply(this, arguments); var c = clean(Object.assign({ act: a }, res)); R.results.push(c); post({ type: 'result', act: a, res: c, story: p.story, lvl: p.lvl, xp: p.xp }); return out; };
    function exit(why) { if (R.exited) return; R.exited = true; try { Y.profile.save(); } catch (e) {} post({ type: 'exit', act: act, why: why || 'done', results: R.results, story: p.story, lvl: p.lvl, xp: p.xp, flags: p.flags }); try { Y.core.stop(); } catch (e) {} }
    R.exit = exit;
    sc.go = function (nm, data) { if (R.started && (nm === 'world' || nm === 'title' || nm === 'home' || nm === 'sleep' || nm === 'menu')) { exit(nm); return sc.current; } return go.call(sc, nm, data); };
    window.addEventListener('message', function (e) { if (e.data && e.data.yourV20Cmd === 'leave') exit('leave'); });
    var target = { job: 'job', skate: 'skate', arena: 'arena_menu', boss: 'boss_intro' }[act] || 'job';
    R.started = true; go.call(sc, target, {}); R.ready = true; window.YOUR_READY = true;
    try { window.focus(); } catch (e) {}
    post({ type: 'ready', act: act, scene: sc.name });
  }).catch(function (e) { console.error('runner boot failed', e); post({ type: 'exit', act: act, why: 'boot-failed', results: [] }); });
})();
