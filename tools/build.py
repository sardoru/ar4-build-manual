"""Assemble the AR4 manual from the 3d-assembly-manual starter.

The engine stays the starter's own code; this replaces only the CONFIG block and the PROJECT SCENE block,
adds the overlay markup and CSS, the metric scale-bar hook, a few named engine fixes, and the CAD data.

Usage: build.py <starter.html> <src dir> <data dir> <out.html> [--standalone] [--local-three <script url>]
  (default)       page body for a claude.ai artifact: the host wraps it in <!doctype html><head>...<body>
  --standalone    a complete HTML document for any static host (Vercel, GitHub Pages, a local server)
  --local-three   load three.js from this URL instead of cdnjs (the Vercel build serves its own copy)
Every build carries the third-party licence notices (THIRD_PARTY_NOTICES.md next to src/) as a comment at the end.
"""
import sys, os, json, base64, re

starter, src, data, out = sys.argv[1:5]
local_three = sys.argv[sys.argv.index('--local-three') + 1] if '--local-three' in sys.argv else None
s = open(starter).read()

def swap(old, new, count=1):
    global s
    if s.count(old) != count:
        raise SystemExit('starter changed: expected %d of %r, found %d' % (count, old[:60], s.count(old)))
    s = s.replace(old, new)

# head: the page's own name and the artifact contract (light drawing sheet on purpose; explicit colours)
swap('<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n<title>Assembly Manual Starter</title>\n',
     '<title>AR4 build manual</title>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n')
swap('html,body{height:100%}', 'html{height:100%;box-sizing:border-box;color-scheme:light;background:var(--paper)}body{height:100%}')
css = open(src + '/extra.css').read()
swap('</style>', css + '</style>')
swap('    <button class="replay" id="replay" type="button">Replay</button>\n',
     '    <button class="replay" id="replay" type="button">Replay</button>\n' + open(src + '/overlay.html').read())

swap('<span id="scaleTxt">1 ft</span>', '<span id="scaleTxt"></span>')   # the bar's label is set on the first frame

# engine hook: metric scale bar from CONFIG.scaleOpts
swap("var opts = [[10, '10 ft'], [5, '5 ft'], [2, '2 ft'], [1, '1 ft'], [0.5, '6 in'], [1 / 12, '1 in']];",
     "var opts = CONFIG.scaleOpts || [[10, '10 ft'], [5, '5 ft'], [2, '2 ft'], [1, '1 ft'], [0.5, '6 in'], [1 / 12, '1 in']];")

# engine fixes found in review (each a minimal, named patch; the rest of the engine is the starter's own)
# 1. marks: only clamp below the parts tray where they overlap it, keep clear of the plan inset and Replay, and pull apart marks that land on each other
swap("y = Math.max(top + eh / 2, Math.min(h - 4 - eh / 2, y)); L.el.style.transform",
     "y = Math.max(4 + eh / 2, Math.min(h - 4 - eh / 2, y)); var bx = clearOf(x, y, ew, eh, w, h, L); x = bx[0]; y = bx[1]; L.el.style.transform")
swap("function placeLabels(w, h){ var top = calloutEl.hidden ? 4 : calloutEl.offsetTop + calloutEl.offsetHeight + 6; labels.forEach(function(L){",
     "function placeLabels(w, h){ var top = calloutEl.hidden ? 4 : calloutEl.offsetTop + calloutEl.offsetHeight + 6; PLACED.length = 0; OBST = obstacles(); labels.forEach(function(L){")
swap("var current = -1, rotUser = 0;",
     """var PLACED = [], OBST = [];
function obstacles(){ var r = []; [calloutEl, planEl, $('#replay')].forEach(function(el){ if (el && !el.hidden && el.offsetWidth) r.push([el.offsetLeft - 3, el.offsetTop - 3, el.offsetLeft + el.offsetWidth + 3, el.offsetTop + el.offsetHeight + 3]); }); return r; }
function clearOf(x, y, ew, eh, w, h, L){ /* push a label out of the overlay boxes, then away from labels already placed */
  for (var pass = 0; pass < 4; pass++){ var moved = false;
    OBST.forEach(function(o){ if (x + ew / 2 > o[0] && x - ew / 2 < o[2] && y + eh / 2 > o[1] && y - eh / 2 < o[3]){ var ny = o[3] + eh / 2 + 2; if (ny < h - 4 - eh / 2){ y = ny; moved = true; } } });
    if (L.ln) PLACED.forEach(function(q){ if (Math.abs(q[0] - x) < 24 && Math.abs(q[1] - y) < 24){ var d = Math.hypot(L.dx || 0, L.dy || 0) || 1; x += (L.dx || 0) / d * 26 || 26; y += (L.dy || 0) / d * 26; x = Math.max(4 + ew / 2, Math.min(w - 4 - ew / 2, x)); y = Math.max(4 + eh / 2, Math.min(h - 4 - eh / 2, y)); moved = true; } });
    if (!moved) break; }
  if (L.ln) PLACED.push([x, y]); return [x, y]; }
var current = -1, rotUser = 0;""")
# 2. keyboard: Space/Enter on a focused button presses that button; no modifier shortcuts; ArrowRight/Space do not wrap from the last page
swap("document.addEventListener('keydown', function(e){ if (e.key === 'ArrowRight' || e.key === ' '){",
     "document.addEventListener('keydown', function(e){ if (e.altKey || e.ctrlKey || e.metaKey) return; if ((e.key === ' ' || e.key === 'Enter') && e.target.closest && e.target.closest('button')) return; if ((e.key === 'ArrowRight' || e.key === ' ') && current === LAST){ e.preventDefault(); return; } if (e.key === 'ArrowRight' || e.key === ' '){")
# 3. callout: only parts drawn in the model are tappable; short names on phone, full name as the tooltip
swap("  if (cls === 'callout'){ li.innerHTML = '<div class=\"th\"><img alt=\"\"><span class=\"q\"></span></div><span class=\"nm\"></span>'; li.addEventListener('click', function(){ pulse(key); }); }",
     "  if (cls === 'callout'){ li.innerHTML = '<div class=\"th\"><img alt=\"\"><span class=\"q\"></span></div><span class=\"nm\"></span>'; if (order.some(function(k){ return objs[k].userData.part === key; })){ li.tabIndex = 0; li.setAttribute('role', 'button'); li.addEventListener('click', function(){ pulse(key); }); li.addEventListener('keydown', function(e){ if (e.key === 'Enter' || e.key === ' '){ e.preventDefault(); e.stopPropagation(); pulse(key); } }); } else li.className = 'static'; li.title = NAMES[key] || key; }")
swap("li.querySelector('.nm').textContent = NAMES[key] || key; return li; }",
     "li.querySelector('.nm').textContent = (cls === 'callout' && CONFIG.SHORT && CONFIG.SHORT[key]) || NAMES[key] || key; return li; }")
swap("Parts for this step · tap one to find it", "Parts for this step · tap a part to find it")
# 4a. tap-to-find under reduced motion: a steady accent outline for a moment instead of a blink that collapses to nothing
swap("    tween(900, function(e, k){ setOpacity(o, b * (1 - 0.75 * Math.abs(Math.sin(k * Math.PI * 2))));",
     "    if (reduce){ var pg = current; setOpacity(o, b * 0.5); inks.forEach(function(m){ m.color.setHex(ACCENT); }); setTimeout(function(){ if (current !== pg) return; setOpacity(o, b); inks.forEach(function(m){ m.color.setHex(INK); }); }, 1200); return; }\n    tween(900, function(e, k){ setOpacity(o, b * (1 - 0.75 * Math.abs(Math.sin(k * Math.PI * 2))));")
# 4. focus stays on a button when Back disables itself on the parts page; Replay only where something replays
swap("  $('#replay').hidden = !(i > 0 && i < LAST);",
     "  $('#replay').hidden = !(i > 0 && i < LAST && ((s.parts && s.parts.length) || s.kind || (s.acts || []).some(function(a){ return a[1]; })));\n  if (i === 0 && document.activeElement === $('#prev')) $('#next').focus();")
# 5. the step's warning sits above the reference line, so it is in view before the sheet scrolls
swap('      <div class="meta" id="meta"></div>\n      <p class="tip" id="tip"></p>', '      <p class="tip" id="tip"></p>\n      <div class="meta" id="meta"></div>')
swap('<div class="body" id="body">', '<div class="body" id="body" aria-live="polite">')
swap('<canvas id="c"></canvas>', '<canvas id="c" role="img" aria-label="3D view of the AR4"></canvas>')

# CONFIG block
a = s.index('var CONFIG = {'); b = s.index('\n};\n', a) + 4
s = s[:a] + open(src + '/config.js').read().rstrip() + '\n' + s[b:]

# PROJECT SCENE block
a = s.index('var BOARD = 0.06')
b = s.index('/* ===================== end of PROJECT SCENE ===================== */')
s = s[:a] + open(src + '/proc.js').read() + '\n' + open(src + '/scene.js').read().replace('/*__KITS__*/', open(src + '/kits.js').read()) + s[b:]

# CAD data: the bodies' index inline, the packed geometry as base64 in a data block
index = json.load(open(data + '/parts.json'))
keep = ['f', 'i', 'link', 'min', 'max', 'vOff', 'vCount', 'iOff', 'iCount', 'idx32', 'cyl']
index = [{k: e[k] for k in keep if k in e} for e in index]
b64 = base64.b64encode(open(data + '/parts.bin', 'rb').read()).decode()
b64 = '\n'.join(b64[i:i + 120] for i in range(0, len(b64), 120))
three = '<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>\n'
blob = ('<script id="ar4-mesh" type="application/octet-stream">\n' + b64 + '\n</script>\n'
        '<script>var AR4_INDEX = ' + json.dumps(index, separators=(',', ':')) + ';</script>\n')
swap(three, (three if not local_three else '<script src="%s"></script>\n' % local_three) + blob)
if '--standalone' in sys.argv or '--skeleton' in sys.argv:
    # a complete document: the same small reset the artifact host adds, then the page's own head (title, fonts, styles) and body
    head_end = s.index('</style>') + len('</style>')
    top = '<title>AR4 build manual</title>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
    if not s.startswith(top):
        raise SystemExit('unexpected page head')
    s = ('<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n'
         '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n<title>AR4 build manual</title>\n'
         '<meta name="description" content="An unofficial, animated 3D build companion for the Annin Robotics AR4 six-axis robot arm, following the AR4 Robot Manual v1.5.">\n'
         '<style>:root{color-scheme:light;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0;font:14px system-ui}img{max-width:100%}[hidden]{display:none!important}</style>\n'
         + s[len(top):head_end] + '\n</head>\n<body>\n' + s[head_end:].lstrip('\n') + '\n</body>\n</html>\n')
# licence notices: the page redistributes MIT-licensed work (the starter engine, geometry derived from ar4_ros_driver)
notices = os.path.join(os.path.dirname(os.path.abspath(src)), 'THIRD_PARTY_NOTICES.md')
if os.path.exists(notices):
    text = open(notices).read()
    if '--' in text:
        raise SystemExit('THIRD_PARTY_NOTICES.md must not contain "--" (it is embedded in an HTML comment)')
    note = '\n<!--\n' + text.rstrip() + '\n-->\n'
    s = s.replace('\n</body>\n</html>\n', note + '</body>\n</html>\n') if s.endswith('</html>\n') else s + note
os.makedirs(os.path.dirname(out) or '.', exist_ok=True)
open(out, 'w').write(s)
print('wrote', out, len(s) // 1024, 'KB')
