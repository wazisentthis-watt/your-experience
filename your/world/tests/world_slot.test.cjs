/* World-module slot tests · Node only. Run: node your/world/tests/world_slot.test.cjs
 * Reads index.html, checks each hook site sits next to its Sikee call, and runs the real wmCall helper against fake modules. */
'use strict';
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', '..', '..', 'index.html'), 'utf8');
let pass = 0, fail = 0;
function check(name, cond) { if (cond) { pass++; console.log('ok - ' + name); } else { fail++; console.log('not ok - ' + name); } }
const sites = [
  ['enterMap after SIKEE.enterMap', /SIKEE\.enterMap\(id\);\n\s*wmCall\('enterMap', id\);/],
  ['drawList after SIKEE.drawList', /SIKEE\.drawList\(m, t\)\) draws\.push\(d\);\n\s*for \(const l of wmCall\('drawList', m, t\)\)/],
  ['keydown blocking after SIKEE.blocking', /SIKEE\.blocking\(\)\) return;\n\s*if \(wmCall\('blocking'\)\.some\(Boolean\)\) return;/],
  ['paused() includes module blocking', /function paused\(\) \{[^\n]*SIKEE\.blocking\(\)\) \|\| wmCall\('blocking'\)\.some\(Boolean\); \}/],
  ['tick after SIKEE.tick', /SIKEE\.tick\(dt\);\n\s*if \(S\) wmCall\('tick', dt\);/],
  ['movePlayer speed multiplies wreckSlow', /SIKEE\.wreckSlow\(\) : 1\) \* wmCall\('wreckSlow'\)\.reduce/]];
for (const [n, re] of sites) check('site: ' + n, re.test(html));
check('Sikee calls unchanged (6 references kept)', (html.match(/window\.SIKEE/g) || []).length === 6);
const m = html.match(/function wmCall\(name, \.\.\.a\) \{[^\n]*\n/);
check('wmCall helper present', !!m);
const window = {}; const logged = []; const console_ = { error: (...a) => logged.push(a.join(' ')) };
const wmCall = new Function('window', 'console', m[0] + '; return wmCall;')(window, console_);
check('no list: returns []', Array.isArray(wmCall('tick', 1)) && wmCall('tick', 1).length === 0);
window.WIR_WORLD_MODULES = 'not an array'; check('non-array list ignored', wmCall('tick', 1).length === 0);
const calls = [];
window.WIR_WORLD_MODULES = [
  { id: 'a', tick: dt => calls.push('a' + dt), drawList: () => [{ y: 1, f() {} }], wreckSlow: () => .5, blocking: () => false },
  { id: 'b', tick: dt => calls.push('b' + dt), wreckSlow: () => 'x' },
  null,
  { id: 'bad', tick: () => { throw new Error('boom'); }, blocking: () => true }];
wmCall('tick', 2);
check('tick reaches modules in order', calls.join(',') === 'a2,b2');
check('throwing hook logged once', logged.length === 1 && /bad\.tick/.test(logged[0]));
wmCall('tick', 3); check('throwing hook switched off (no second log)', logged.length === 1 && calls.join(',') === 'a2,b2,a3,b3');
check('drawList returns module lists', wmCall('drawList', {}, 0).length === 1);
check('blocking: any true blocks', wmCall('blocking').some(Boolean) === true);
check('wreckSlow: invalid values count as 1', wmCall('wreckSlow').reduce((a, v) => a * (v > 0 ? v : 1), 1) === .5);
console.log('\n' + pass + ' passed, ' + fail + ' failed'); process.exit(fail ? 1 : 0);
