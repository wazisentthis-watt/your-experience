#!/usr/bin/env python3
"""Y.O.U.R. v2.0 PROPOSAL_HOLD build step.
Reads the ORIGINAL WIR Valence Life v3 files (read-only) from user-closest-your/unpacked/ and writes patched
copies into this build. Every patch asserts it matched exactly once, so a changed source fails loudly.
Never writes to the originals. PUBLISH HOLD: nothing here pushes, deploys or publishes."""
import json, os, re, shutil, sys
HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.abspath(os.path.join(HERE, '..', 'user-closest-your', 'unpacked'))
LOG = []

def sub1(s, old, new, label, count=1):
    n = s.count(old)
    if n != count:
        sys.exit('PATCH FAILED %s: expected %d match(es), found %d' % (label, count, n))
    LOG.append(label)
    return s.replace(old, new)

# ---------------------------------------------------------------- fonts (OFL, from the box's system font dir)
FONT_DIR = '/usr/share/fonts/truetype/sand-box/google'
FONTS = [
    ('Unbounded', 'Unbounded/Unbounded-VariableFont_wght.ttf', '200 900', 'normal'),
    ('Atkinson Hyperlegible', 'Atkinson Hyperlegible/AtkinsonHyperlegible-Regular.ttf', '400', 'normal'),
    ('Atkinson Hyperlegible', 'Atkinson Hyperlegible/AtkinsonHyperlegible-Bold.ttf', '700', 'normal'),
    ('JetBrains Mono', 'JetBrains Mono/JetBrainsMono-VariableFont_wght.ttf', '100 800', 'normal'),
    ('Press Start 2P', 'Press Start 2P/PressStart2P-Regular.ttf', '400', 'normal'),
    ('Barlow Condensed', 'Barlow Condensed/BarlowCondensed-Medium.ttf', '500', 'normal'),
    ('Barlow Condensed', 'Barlow Condensed/BarlowCondensed-Bold.ttf', '700', 'normal'),
]
def build_fonts():
    out = os.path.join(HERE, 'fonts'); os.makedirs(out, exist_ok=True)
    css = ['/* Y.O.U.R. v2.0 offline fonts: copied from the build box system font folder (Google Fonts families, SIL Open Font License 1.1).',
           '   Replaces the Google Fonts CDN links of Valence Life v3 and its football.html. No network. */']
    for fam, rel, wt, st in FONTS:
        src = os.path.join(FONT_DIR, rel); dst = os.path.join(out, os.path.basename(rel))
        shutil.copyfile(src, dst)
        css.append("@font-face{font-family:'%s';src:url('%s') format('truetype');font-weight:%s;font-style:%s;font-display:swap}" % (fam, os.path.basename(rel), wt, st))
    open(os.path.join(out, 'fonts.css'), 'w').write('\n'.join(css) + '\n')
    LOG.append('fonts: %d faces bundled' % len(FONTS))

# ---------------------------------------------------------------- index.html (Valence life sim)
HOOK_NAMES = ['drawPlayer', 'movePlayer', 'speedNow', 'openNpc', 'openObj', 'renderStart', 'newGame', 'resume', 'npcSpot',
              'hitObj', 'interactNear', 'renderPhone', 'doTab', 'paused', 'pollPad', 'enterMap', 'closePhone', 'openPhone',
              'fbOpen', 'fbClose', 'startMG', 'save', 'updateUI', 'toast', 'openSheet', 'closeSheet', 'bigBtn', 'actBtn',
              'fastAct', 'walkable', 'outdoors', 'dirOf', 'useSpot', 'furnOn', 'goDo', 'walkTo', 'nearSpot', 'openLab', 'cycleRide',
              'updateRideBtn', 'loadSave', 'mgClose']
def hook_block():
    gets = ', '.join("%s: () => %s" % (n, n) for n in HOOK_NAMES)
    sets = '\n'.join("    case '%s': %s = fn; break;" % (n, n) for n in HOOK_NAMES)
    return ("/* ===== Y.O.U.R. v2.0 merge hook (PROPOSAL_HOLD): hands Valence internals to your/v20/your_v20.js ===== */\n"
            "if (window.YOUR_V20_INSTALL) { try { window.YOUR_V20_INSTALL({\n"
            "  get S() { return S; }, G, M, P, B, MAPS, NPCS, CITYB, SPECIAL, LABS, FB, MG, TABS, HERO_LEG, HERO_ART, T, cv, cx, $, esc, money, clamp,\n"
            "  fn: { " + gets + " },\n"
            "  set(name, fn) { switch (name) {\n" + sets + "\n    default: throw new Error('YOUR v2.0: no hook for ' + name); } }\n"
            "}); } catch (e) { console.error('YOUR v2.0 install failed', e); } }\n\n")

def patch_index():
    s = open(os.path.join(SRC, 'index.html'), encoding='utf-8').read()
    s = sub1(s, '<title>', '<title>Y.O.U.R. v2.0 · PROPOSAL_HOLD · ', 'index: title prefix') if '<title>' in s else s
    # offline: Google Fonts → bundled fonts
    s = re.sub(r'<link rel="preconnect" href="https://fonts\.googleapis\.com">\s*', '', s, count=1)
    s = re.sub(r'<link rel="preconnect" href="https://fonts\.gstatic\.com" crossorigin>\s*', '', s, count=1)
    m = re.search(r'<link rel="stylesheet" href="https://fonts\.googleapis\.com/css2[^"]*">', s)
    if not m: sys.exit('PATCH FAILED index fonts link')
    s = s[:m.start()] + '<link rel="stylesheet" href="fonts/fonts.css">' + s[m.end():]
    LOG.append('index: Google Fonts CDN → fonts/fonts.css')
    if 'googleapis' in s or 'gstatic' in s: sys.exit('fonts still referenced')
    # offline: claude.ai artifact links (external) removed
    i = s.index('const WIR_LINKS = ['); j = s.index('];', i) + 2
    s = s[:i] + 'const WIR_LINKS = [];   // Y.O.U.R. v2.0 offline: the six claude.ai artifact links were removed (no outside hosts)' + s[j:]
    LOG.append('index: WIR_LINKS claude.ai links removed')
    s = sub1(s, "Online play lights up when this page is opened from its claude.ai link. Everyone with the link walks the same five cities: you\\'ll see each other, chat, share city treasuries, and own each other\\'s favorite stores.",
             "Online play is off in this offline Y.O.U.R. v2.0 build (it needed the claude.ai host). Everything else plays offline.", 'index: online tab text')
    # IP: Silicon hero name and Kito art
    s = sub1(s, "hero: 'K-I-T-O',", "hero: 'Silicon',", 'index: ELEMENTS.Si hero name')
    s = sub1(s, "{ id: 'Si', name: 'K-I-T-O',", "{ id: 'Si', name: 'Silicon',", 'index: NPC Si name')
    s = sub1(s, "Si: 'kito',", "Si: null,", 'index: HERO_ART.Si (no kito art)')
    # IP: Stay On Page lab (Dragon Ball-style WIR KI WAR + Kito content) is not shipped
    s = sub1(s, "  sop: { name: 'Stay On Page · Body Engine', file: 'games/stayonpage.html', skill: 'combat', blurb: 'WIR RENDERZ with the real-physics Body Engine' },\n", '', 'index: LABS.sop removed')
    s = sub1(s, "acts: ['lab:sop']", "acts: []", 'index: lab:sop building act removed')
    # load the Y.O.U.R. layer before the main Valence script, and hook it inside the IIFE before boot
    main = "<script>\n(() => {\n'use strict';\n/* ===== WIR VALENCE LIFE v3 · core"
    s = sub1(s, main, ('<script src="your/modules/wir_hero_profile.js"></script>\n<script src="your/v20/your_v20_config.js"></script>\n'
                       '<script src="your/v20/your_llm_shim.js"></script>\n<script src="your/modules/your_llm.js"></script>\n'
                       '<script src="your/v20/your_v20.js"></script>\n') + main, 'index: Y.O.U.R. scripts before Valence core')
    s = sub1(s, "/* ---- boot ---- */", hook_block() + "/* ---- boot ---- */", 'index: install hook before boot')
    for bad in ['K-I-T-O', 'kito', 'claude.ai/artifact', 'fonts.googleapis']:
        if bad in s: sys.exit('index still contains ' + bad)
    open(os.path.join(HERE, 'index.html'), 'w', encoding='utf-8').write(s)

# ---------------------------------------------------------------- football.html (Elemental Gridiron in Valence)
BRIDGE_FIX = """
  /* Y.O.U.R. v2.0 bridge fix (PROPOSAL_HOLD · bridge only, no game logic changed):
     QA saw a focus hand-off between Valence and this frame fire 'blur' about 0.2 s after a drill command, and autoPause()
     then opened the PAUSED menu over the drill. For 1.5 s after a bridge command that blur is ignored, and an auto-pause
     screen that still slipped in during that window is closed again. A real blur later still pauses as before. */
  let __v20BridgeT = -1e9, __v20UserT = -1e9;
  ['keydown', 'pointerdown'].forEach(n => window.addEventListener(n, () => { __v20UserT = performance.now(); }, true));
  window.addEventListener('blur', e => { if (window.parent !== window && TM && performance.now() - __v20BridgeT < 1500) e.stopImmediatePropagation(); }, true);
  window.addEventListener('message', e => { const d = e.data; if (!d || !d.wirCmd || d.wirCmd === 'end' || d.wirCmd === 'export' || d.wirCmd === 'import') return; __v20BridgeT = performance.now();
    setTimeout(() => { try { if (TM && G.paused && curScr && curScr.classList.contains('title') && /PAUSED/.test(curScr.textContent) && __v20UserT < __v20BridgeT) { closeScreen(); window.__v20PauseClosed = (window.__v20PauseClosed | 0) + 1; } } catch (err) { } }, 1600); }, true);
"""
def patch_football():
    s = open(os.path.join(SRC, 'football.html'), encoding='utf-8').read()
    m = re.search(r'<link rel="preconnect" href="https://fonts\.googleapis\.com">\s*', s)
    if m: s = s[:m.start()] + s[m.end():]
    m = re.search(r'<link[^>]*href="https://fonts\.googleapis\.com/css2[^"]*"[^>]*>', s)
    if not m: sys.exit('PATCH FAILED football fonts link')
    s = s[:m.start()] + '<link rel="stylesheet" href="fonts/fonts.css">' + s[m.end():]
    LOG.append('football: Google Fonts CDN → fonts/fonts.css')
    if 'googleapis' in s or 'gstatic' in s: sys.exit('football fonts still referenced')
    # bridge fix 2 (embed only): opened from file://, Chromium blocks navigator.getGamepads() inside the iframe by permissions
    # policy and throws. Return no pads instead, so the engine keeps keyboard/touch. No game logic changes.
    s = sub1(s, '<head>\n<meta charset="utf-8">', '<head>\n<meta charset="utf-8">\n<script>/* Y.O.U.R. v2.0 BRIDGE_FIX_GAMEPAD */(function(){try{var n=navigator,g=n.getGamepads&&n.getGamepads.bind(n);if(g)n.getGamepads=function(){try{return g();}catch(e){return [];}};}catch(e){}})();</script>', 'football gamepad guard')
    # bridge fix, inserted right after the Valence command listener (bridge section)
    anchor = "  // embedded in Valence Life: the standalone game's debug and phone buttons stay out of the way\n"
    s = sub1(s, anchor, BRIDGE_FIX + anchor, 'football: bridge auto-pause fix')
    # IP: K-I-T-O / Kito content (data only: art + display names). Card ids stay so roster logic is untouched.
    i = s.index('const WIRART='); j = s.index('\n', i)
    line = s[i:j]; body = line[len('const WIRART='):].rstrip().rstrip(';')
    art = json.loads(body); removed = art.pop('kito', None) is not None
    s = s[:i] + 'const WIRART=' + json.dumps(art, separators=(',', ':')) + ';' + s[j:]
    LOG.append('football: WIRART.kito art removed=%s (%d legends left)' % (removed, len(art)))
    s = sub1(s, "const ART_NAME={kito:'K-I-T-O',", "const ART_NAME={", 'football: ART_NAME.kito removed')
    s = sub1(s, "const ART_CARD={kito:'kito',", "const ART_CARD={", 'football: ART_CARD.kito removed')
    s = sub1(s, "const ART_COL={kito:'#c55bff',", "const ART_COL={", 'football: ART_COL.kito removed')
    s = sub1(s, '{"id":"kito","name":"Kito",', '{"id":"kito","name":"Silicon",', 'football: roster card display name')
    left = [m.start() for m in re.finditer(r'K-I-T-O|\bKito\b', s)]
    if left: sys.exit('football still shows Kito at %s' % left[:5])
    open(os.path.join(HERE, 'football.html'), 'w', encoding='utf-8').write(s)

# ---------------------------------------------------------------- runner page (v1.2.1 activities inside Valence)
def build_runner():
    g = open(os.path.join(HERE, 'your', 'game', 'index.html'), encoding='utf-8').read()
    g = sub1(g, '<title>Y.O.U.R. — v1.2.1 (PROPOSAL_HOLD)</title>', '<title>Y.O.U.R. v2.0 activity runner (PROPOSAL_HOLD)</title>', 'runner: title')
    i = g.index('<script>\n  var q=new URLSearchParams'); j = g.index('</script>', i) + len('</script>')
    g = g[:i] + '<script src="../v20/your_v20_runner.js"></script>' + g[j:]
    open(os.path.join(HERE, 'your', 'game', 'v20_runner.html'), 'w', encoding='utf-8').write(g)
    LOG.append('runner: your/game/v20_runner.html written')

if __name__ == '__main__':
    build_fonts(); patch_index(); patch_football(); build_runner()
    print('\n'.join('ok · ' + l for l in LOG))
