# Social card (public/og.png)

1200×630 Open Graph / Twitter card. Needs `playwright-core` and Chrome.

1. `node cap.mjs <abs path to public/index.html> <abs path to tools/og/done.png> 'step29&still'` captures the finished arm (2800×2200, UI hidden).
2. `node render.mjs <abs path to public/og.png> 1` fills `card.html` (render offset and J1–J6 mark positions live in `render.mjs`) and screenshots it.

`done.png` and `card.out.html` are scratch files and are not committed.
