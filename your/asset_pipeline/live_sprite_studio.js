/* WIR Y.O.U.R. Live Sprite Studio | source-preview-only, no save or combat hooks.
 * Uses existing published images; keeps original image bytes and authored frame sequence.
 * Sheet metadata: your/assets/hero/HERO_SHEET.json and your/assets/SHEETS.json.
 */
(function (root, factory) {
  'use strict';
  var studio = factory();
  if (typeof module === 'object' && module.exports) module.exports = studio;
  if (root && root.document) {
    root.WIRSpriteStudio = studio;
    if (root.document.readyState === 'loading')
      root.document.addEventListener('DOMContentLoaded', function () { studio.mount(root.document, root); }, { once: true });
    else studio.mount(root.document, root);
  }
})(typeof window !== 'undefined' ? window : null, function () {
  'use strict';
  var SHEETS = {
    hero: { label: 'YOUR HERO', path: 'your/assets/hero/hero_sheet_96.png',
      cols: 16, rows: 11, cell: 96, fps: 8, directions: { down: 0, left: 1, right: 2, up: 3 },
      walk: [0, 1, 2, 3], idle: [0], description: 'Four native walk directions, source: HERO_SHEET.json.' },
    mella: { label: 'MELLA', path: 'your/assets/mella/mella_sheet_96.png',
      cols: 16, rows: 7, cell: 96, fps: 8, directions: { down: 0, up: 1, left: 2, right: 3 },
      walk: [4, 5, 6, 7, 8, 9, 10, 11], idle: [0], cast: [12, 13, 14, 15],
      description: 'Native down/up/right walk from SHEETS.json. Left row is a documented fallback duplicate of right; fight/skate rows are excluded.' }
  };
  function has(obj, key) { return Object.prototype.hasOwnProperty.call(obj, key); }
  function frameFor(character, direction, action, seconds) {
    var sheet = SHEETS[character];
    if (!sheet || !has(sheet.directions, direction) || !has(sheet, action) ||
        !Number.isFinite(seconds) || seconds < 0) throw new Error('invalid sprite preview selection');
    var frames = sheet[action], i = action === 'idle' ? 0 : Math.floor(seconds * sheet.fps) % frames.length;
    var col = frames[i], row = sheet.directions[direction];
    if (col < 0 || col >= sheet.cols || row < 0 || row >= sheet.rows) throw new Error('sprite frame out of range');
    return { sx: col * sheet.cell, sy: row * sheet.cell, sw: sheet.cell, sh: sheet.cell,
      col: col, row: row, frame: row * sheet.cols + col, fallback: character === 'mella' && direction === 'left' };
  }
  function geometryMatches(character, w, h) {
    var s = SHEETS[character]; return !!s && w === s.cols * s.cell && h === s.rows * s.cell;
  }
  function mount(doc, win) {
    var phone = doc.getElementById('phone'), top = phone && phone.querySelector('.ptop');
    if (!top || doc.getElementById('wirSpriteOpen')) return false;
    var trigger = doc.createElement('button');
    trigger.type = 'button'; trigger.id = 'wirSpriteOpen'; trigger.textContent = 'SPRITES';
    trigger.setAttribute('aria-label', 'Open the WIR character animation studio');
    trigger.style.cssText = 'border:1px solid #756ab3;border-radius:8px;background:#282343;color:#f2edff;padding:7px 9px;font:700 11px system-ui;letter-spacing:.03em;';
    var closePhone = doc.getElementById('pClose');
    top.insertBefore(trigger, closePhone || null);
    var style = doc.createElement('style');
    style.id = 'wirSpriteStudioStyle';
    style.textContent = [
      '#wirSpriteStudio{position:fixed;inset:0;z-index:9000;margin:auto;max-width:760px;overflow-y:auto;box-sizing:border-box;background:#100d22;color:#f6f2ff;font:14px/1.45 system-ui;padding:18px 16px 28px}',
      '#wirSpriteStudio[hidden]{display:none!important}',
      '#wirSpriteStudio .wir-head{display:flex;align-items:center;justify-content:space-between;gap:12px}',
      '#wirSpriteStudio .wir-head h2{margin:0;font-size:19px}',
      '#wirSpriteStudio .wir-muted{color:#bcb3dc;font-size:12px;margin:7px 0}',
      '#wirSpriteStudio .wir-controls{display:flex;gap:7px;flex-wrap:wrap;margin:10px 0}',
      '#wirSpriteStudio button{font:700 13px system-ui;min-height:38px;padding:8px 12px;background:#292346;color:#f6f2ff;border:1px solid #635889;border-radius:9px}',
      '#wirSpriteStudio button[aria-pressed=true]{background:#166d68;border-color:#5ff2d4}',
      '#wirSpriteStudio button:disabled{opacity:.35}',
      '#wirSpriteStudio button:focus-visible{outline:2px solid #ffe185;outline-offset:2px}',
      '#wirSpriteStudio canvas{width:min(78vw,256px);height:min(78vw,256px);display:block;image-rendering:pixelated;background:#151b30;border:1px solid #5c5685;border-radius:12px;margin:14px auto}',
      '#wirSpriteStudio .wir-foot{text-align:center;color:#c8c2e1;max-width:350px;margin:0 auto}',
      '@media(max-width:440px){#wirSpriteStudio{padding:12px 12px 26px}#wirSpriteStudio .wir-head h2{font-size:16px}}'
    ].join('');
    doc.head.appendChild(style);
    var modal = doc.createElement('section');
    modal.id = 'wirSpriteStudio'; modal.hidden = true;
    modal.setAttribute('role', 'dialog'); modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-label', 'WIR Sprite Studio');
    modal.innerHTML =
      '<div class="wir-head"><h2>🎮 WIR ANIMATION STUDIO</h2><button type="button" data-close="1">Close</button></div>' +
      '<p class="wir-muted">Live in-game preview of existing original WIR art. This is a viewer, not yet a player-skin switch.</p>' +
      '<div class="wir-controls" aria-label="Choose character"><button type="button" data-character="hero">YOUR HERO</button><button type="button" data-character="mella">MELLA</button></div>' +
      '<div class="wir-controls" aria-label="Choose movement direction"><button type="button" data-direction="down">DOWN</button><button type="button" data-direction="left">LEFT</button><button type="button" data-direction="right">RIGHT</button><button type="button" data-direction="up">UP</button></div>' +
      '<div class="wir-controls" aria-label="Choose animation"><button type="button" data-action="idle">IDLE</button><button type="button" data-action="walk">WALK</button><button type="button" data-action="cast">CAST</button></div>' +
      '<canvas width="256" height="256" aria-label="Original WIR sprite-sheet frame preview"></canvas>' +
      '<p class="wir-foot" aria-live="polite" data-status>Open a character to preview.</p>' +
      '<p class="wir-muted" data-source></p>' +
      '<p class="wir-muted">Touch buttons, arrows/WASD, or gamepad D-pad/left stick. Space switches idle/walk. B/Escape closes. Metadata is not a rights approval.</p>';
    doc.body.appendChild(modal);
    var canvas = modal.querySelector('canvas'), ctx = canvas.getContext('2d');
    var status = modal.querySelector('[data-status]'), source = modal.querySelector('[data-source]');
    var st = { open: false, character: 'hero', direction: 'down', action: 'walk', image: null,
      loaded: null, error: null, start: 0, raf: 0, lastPad: '', lastPadAt: 0 };
    function controls() {
      Array.from(modal.querySelectorAll('button[data-character],button[data-direction],button[data-action]')).forEach(function (b) {
        var type = b.hasAttribute('data-character') ? 'character' : b.hasAttribute('data-direction') ? 'direction' : 'action';
        b.setAttribute('aria-pressed', String(b.getAttribute('data-' + type) === st[type]));
        if (type === 'action') b.disabled = !has(SHEETS[st.character], b.getAttribute('data-action'));
      });
      source.textContent = SHEETS[st.character].description +
        (st.character === 'mella' && st.direction === 'left' ? ' LEFT VIEW IS FALLBACK ART.' : '');
    }
    function choose(kind, val) {
      if (!st.open) return;
      if (kind === 'character' && has(SHEETS, val)) {
        st.character = val; st.image = null; st.loaded = null; st.error = null;
        if (!has(SHEETS[val], st.action)) st.action = 'walk';
        var im = new win.Image(), requested = val;
        im.onload = function () {
          if (!st.open || st.character !== requested) return;
          if (!geometryMatches(requested, im.naturalWidth, im.naturalHeight))
            st.error = 'Atlas dimensions do not match documented grid: ' + requested;
          else { st.image = im; st.loaded = requested; }
        };
        im.onerror = function () { if (st.open && st.character === requested) st.error = 'Sprite image not available'; };
        im.src = SHEETS[val].path;
      } else if (kind === 'direction' && has(SHEETS[st.character].directions, val)) st.direction = val;
      else if (kind === 'action' && has(SHEETS[st.character], val)) st.action = val;
      st.start = 0; controls();
    }
    function close() {
      if (!st.open) return; st.open = false; modal.hidden = true;
      if (st.raf) win.cancelAnimationFrame(st.raf); st.raf = 0;
      trigger.focus();
    }
    function render(now) {
      if (!st.open) return;
      if (!st.start) st.start = now;
      ctx.clearRect(0,0,256,256);
      ctx.fillStyle = '#151b30'; ctx.fillRect(0,0,256,256);
      var tm = Math.max(0,(now-st.start)/1000);
      if (st.image && st.loaded === st.character) {
        var f = frameFor(st.character, st.direction, st.action, tm);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(st.image, f.sx, f.sy, f.sw, f.sh, 16,16,224,224);
        status.textContent = SHEETS[st.character].label + ' · ' + st.action.toUpperCase() +
          ' ' + st.direction.toUpperCase() + ' · sheet frame ' + f.frame +
          (f.fallback ? ' · FALLBACK LEFT' : '');
      } else status.textContent = st.error || 'Loading existing sprite image…';
      var pads = win.navigator && win.navigator.getGamepads && win.navigator.getGamepads();
      if (pads && pads[0]) {
        var p = pads[0], buttons = p.buttons || [], axes = p.axes || [];
        var pressed = function (i) { return buttons[i] && buttons[i].pressed; };
        var choice = pressed(1) ? 'close' : pressed(12) || axes[1] < -.65 ? 'up' :
          pressed(13) || axes[1] > .65 ? 'down' : pressed(14) || axes[0] < -.65 ? 'left' :
          pressed(15) || axes[0] > .65 ? 'right' : '';
        if (choice && choice !== st.lastPad && now - st.lastPadAt > 120) {
          st.lastPadAt = now;
          if (choice === 'close') { close(); return; } choose('direction', choice);
        }
        st.lastPad = choice;
      }
      st.raf = win.requestAnimationFrame(render);
    }
    function open() {
      if (st.open) return;
      st.open = true; modal.hidden = false; st.start = 0;
      choose('character', st.character);
      modal.querySelector('[data-close]').focus();
      st.raf = win.requestAnimationFrame(render);
    }
    trigger.addEventListener('click', open);
    modal.addEventListener('click', function (e) {
      var b = e.target && e.target.closest && e.target.closest('button');
      if (!b) return;
      if (b.hasAttribute('data-close')) close();
      else ['character','direction','action'].forEach(function (kind) {
        if (b.hasAttribute('data-' + kind)) choose(kind, b.getAttribute('data-' + kind));
      });
    });
    doc.addEventListener('keydown', function (e) {
      if (!st.open) return;
      var map = { ArrowUp:'up', ArrowDown:'down', ArrowLeft:'left', ArrowRight:'right',
        KeyW:'up',KeyS:'down',KeyA:'left',KeyD:'right' };
      if (e.code === 'Escape') close();
      else if (e.code === 'Space') choose('action', st.action === 'walk' ? 'idle' : 'walk');
      else if (has(map, e.code)) choose('direction', map[e.code]);
      else return;
      e.preventDefault(); e.stopImmediatePropagation();
    }, true);
    return true;
  }
  return Object.freeze({ SHEETS: SHEETS, frameFor: frameFor,
    geometryMatches: geometryMatches, mount: mount });
});
