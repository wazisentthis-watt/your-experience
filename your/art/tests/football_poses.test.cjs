// node your/art/tests/football_poses.test.cjs · native football poses (your/art/eg_hero_poses.js). Drafted by WIR Recovery for owner review.
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..', '..', '..'); let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('ok - ' + m); } else { fail++; console.log('FAIL - ' + m); } };
const imgs = []; function Image() { imgs.push(this); }
const POSE = { ready: { side: [[4, 1]], si: 'stance' }, carry: { side: [[7, 0]], si: 'carry' }, backflip: { side: [[7, 11]], si: 'celebrate' }, run: { side: [[7, 0]] } };
const g2d = { drawImage() { }, getImageData: () => ({ data: new Uint8ClampedArray(96 * 96 * 4) }), putImageData() { } };
const document = { createElement: () => ({ getContext: () => g2d }) };
let nextFrame = null; function hdFrame() { return nextFrame; }
const ctx = vm.createContext({ window: { __V21: { POSE, img: {} }, YOUR_V21_CONFIG: { football: {} } }, Image, Math, document, hdFrame, TEAMS: { a: { c1: '#ff0000', c2: '#550000' } }, G: { t: 0 } });
vm.runInContext(fs.readFileSync(path.join(ROOT, 'your/art/eg_hero_poses.js'), 'utf8'), ctx);
const V = ctx.window.__V21, FB = V.fb;
ok(FB && FB.map, '__V21.fb exists'); ok(imgs.length === 1 && fs.existsSync(path.join(ROOT, imgs[0].src)), 'native sheet exists: ' + (imgs[0] && imgs[0].src));
ok(typeof ctx.hdFrame === 'function' && ctx.hdFrame !== hdFrame, 'hdFrame wrapped');
const orig = { img: 'old', hero: true, nf: false, nm: 'carry' }; nextFrame = Object.assign({}, orig);
ok(ctx.hdFrame({ team: 'a', anim: 0 }).img === 'old', 'sheet not loaded → eg_hero frame untouched');
ok(POSE.ready.si === 'stance', 'stand-in labels stay until the sheet loads');
imgs[0].onload(); ok(FB.ready, 'onload → ready');
ok(!POSE.ready.si && !POSE.carry.si, 'poses with native art lose the stand-in flag'); ok(POSE.backflip.si === 'celebrate', 'backflip has no native art → still a stand-in');
nextFrame = Object.assign({}, orig); const f = ctx.hdFrame({ team: 'a', anim: 0 }); ok(f.img !== 'old' && f.native === true, 'side-view hero carry → native frame');
nextFrame = Object.assign({}, orig, { nf: true }); ok(ctx.hdFrame({ team: 'a', anim: 0 }).img === 'old', 'front/back view → hero_sheet_96 frame kept');
nextFrame = Object.assign({}, orig, { hero: false }); ok(ctx.hdFrame({ team: 'a', anim: 0 }).img === 'old', 'not the hero → untouched');
nextFrame = Object.assign({}, orig, { nm: 'run' }); ok(ctx.hdFrame({ team: 'a', anim: 0 }).img === 'old', 'pose without native art (run) → untouched');
nextFrame = null; ok(ctx.hdFrame({ team: 'a' }) === null, 'null frame passes through');
ok(Object.values(FB.map).every(l => l.every(([r, c]) => r >= 0 && r < 9 && c >= 0 && c < 6)), 'every mapped frame is inside the 6×9 sheet');
const html = fs.readFileSync(path.join(ROOT, 'football.html'), 'utf8');
ok(html.indexOf('your/art/eg_hero_poses.js') > html.indexOf('your/v21/eg_hero.js'), 'football.html loads it after eg_hero.js');
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
