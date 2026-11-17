/* v2.4 touch clearance check · Playwright, headless Chromium. Run: node your/v24/tests/v24_touch_clearance.cjs
 * Forces the in-play layout (hides #start, shows the touch overlay) and compares real bounding rectangles.
 * Overlay circles use the same formulas as your/modules/your_input.js layout(). Exit code 1 if any overlap. */
'use strict';
const path = require('path');
const { chromium } = require('playwright');
const url = 'file://' + path.resolve(__dirname, '../../../index.html');
// Two cases. 'as shipped': index.html as it is. 'with overlay': your/modules/your_input.js added, which is the
// on-screen stick and X/A/Y/B overlay. index.html does not load that file itself.
const MODES = ['as shipped', 'with overlay'];
const SIZES = [
  { name: 'phone portrait', w: 390, h: 844 },
  { name: 'phone landscape', w: 844, h: 390 },
  { name: 'tablet portrait', w: 768, h: 1024 },
  { name: 'tablet landscape', w: 1024, h: 768 }
];
(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  let bad = 0;
  for (const mode of MODES) for (const s of SIZES) {
    const page = await browser.newPage({ viewport: { width: s.w, height: s.h } });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(url, { waitUntil: 'load' });
    await page.waitForTimeout(600);
    if (mode === 'with overlay') await page.addScriptTag({ path: path.resolve(__dirname, '../../../your/modules/your_input.js') });
    // Forced in-play layout: the start screen is hidden and the touch column is shown. The game's own
    // updateTouch() only shows the column during a live session, which a headless load does not reach.
    await page.addStyleTag({ content: '#start{display:none !important}#yourMoves{display:flex !important}' });
    await page.waitForTimeout(200);
    if (process.env.NO_LIFT) await page.evaluate(() => { window.__NO_LIFT = true; });
    const r = await page.evaluate(() => {
      // Show the overlay the way a phone does: the first touch on the window (your_input.js shows it then).
      window.dispatchEvent(new Event('touchstart'));
      const pw = document.getElementById('yourPowers'); if (pw) pw.hidden = false;   // MELLA power panel, opened
      if (window.__NO_LIFT) { const t = document.getElementById('kaw-v24-touch-clear'); if (t) t.remove(); }   // control run: rule off
      const cv = document.getElementById('your-touch');
      const overlayOn = !!cv && cv.style.display === 'block';
      const w = innerWidth, h = innerHeight, rr = Math.min(w, h);
      const L = { stick: { x: rr * 0.18, y: h - rr * 0.2, r: rr * 0.12 }, br: rr * 0.055,
        btns: [{ a: 'A', x: w - rr * 0.12, y: h - rr * 0.12 }, { a: 'B', x: w - rr * 0.24, y: h - rr * 0.06 },
               { a: 'X', x: w - rr * 0.24, y: h - rr * 0.24 }, { a: 'Y', x: w - rr * 0.36, y: h - rr * 0.12 }] };
      const overlay = [{ name: 'overlay stick', x0: L.stick.x - L.stick.r, y0: L.stick.y - L.stick.r, x1: L.stick.x + L.stick.r, y1: L.stick.y + L.stick.r }]
        .concat(L.btns.map(b => ({ name: 'overlay ' + b.a, x0: b.x - L.br, y0: b.y - L.br, x1: b.x + L.br, y1: b.y + L.br })));
      const seen = new Set(), dom = [];
      document.querySelectorAll('button, [role=button]').forEach(el => {
        if (seen.has(el)) return; seen.add(el);
        const cs = getComputedStyle(el), b = el.getBoundingClientRect();
        if (cs.display === 'none' || cs.visibility === 'hidden' || el.hidden || b.width < 2 || b.height < 2) return;
        if (b.right < 0 || b.bottom < 0 || b.left > w || b.top > h) return;
        dom.push({ name: (el.id ? '#' + el.id : el.tagName.toLowerCase()) + (el.textContent ? ' "' + el.textContent.trim().slice(0, 12) + '"' : ''),
          x0: b.left, y0: b.top, x1: b.right, y1: b.bottom });
      });
      return { w, h, overlay, dom, overlayOn };
    });
    const hits = [];
    const ov = (a, b) => { const x = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0), y = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0); return x > 0.5 && y > 0.5 ? x * y : 0; };
    // Overlay circles count only when the overlay canvas is really shown; otherwise they are not on screen.
    if (r.overlayOn) for (const d of r.dom) for (const o of r.overlay) { const area = ov(d, o); if (area) hits.push([d.name, o.name, Math.round(area)]); }
    // Every control must stay on screen (the lifted column must not run off the top edge).
    for (const d of r.dom) if (d.y0 < 0 || d.x0 < 0 || d.x1 > r.w || d.y1 > r.h) hits.push([d.name, 'viewport edge', 0]);
    const kaw = r.dom.filter(d => /kaw-touch/.test(d.name));
    for (let i = 0; i < r.dom.length; i++) for (let j = i + 1; j < r.dom.length; j++) {
      const area = ov(r.dom[i], r.dom[j]); if (area) hits.push([r.dom[i].name, r.dom[j].name, Math.round(area)]);
    }
    console.log(`\n== [${mode}] ${s.name} ${r.w}x${r.h}: ${r.dom.length} visible controls, VEYRU/STAY visible: ${kaw.length === 2}, overlay canvas shown: ${r.overlayOn}`);
    if (mode === 'with overlay' && !r.overlayOn) { console.log('   FAIL overlay not shown; the check is not measuring the in-play overlay'); bad++; }
    if (!hits.length) console.log('   no overlaps');
    for (const h of hits) { console.log(`   OVERLAP ${h[0]} x ${h[1]} (${h[2]} px²)`); }
    if (errors.length) console.log('   page errors: ' + errors.join(' | '));
    bad += hits.length;
    await page.close();
  }
  await browser.close();
  console.log(`\n${bad ? bad + ' overlap(s) found' : 'no overlaps in any size'}`);
  process.exit(bad ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
