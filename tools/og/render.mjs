import { chromium } from 'playwright-core';
import { readFileSync, writeFileSync } from 'node:fs';
const dir = new URL('.', import.meta.url).pathname;
const [out, scale = '1'] = process.argv.slice(2);
const S = 0.45, X = 335, Y = -118;
const at = (ox, oy) => [Math.round(X + S * ox), Math.round(Y + S * oy)];
// joint points on the 2800x2200 render, and where each mark sits relative to its point
const J = [
  ['J1', 1232, 1302, 70, 60],
  ['J2', 1190, 1148, 90, -10],
  ['J3', 882, 658, 30, -78, true],
  ['J4', 742, 840, -80, -60],
  ['J5', 630, 1008, -86, -10],
  ['J6', 630, 1134, -70, 56],
];
const marks = J.map(([t, ox, oy, dx, dy, hot]) => { const [px, py] = at(ox, oy); return [t, px, py, px + dx, py + dy, !!hot]; });
const html = readFileSync(dir + 'card.html', 'utf8').replace('VARX', X + 'px').replace('VARY', Y + 'px').replace('MARKS', JSON.stringify(marks));
writeFileSync(dir + 'card.out.html', html);
const b = await chromium.launch({ channel: 'chrome' });
const p = await b.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: +scale });
await p.goto('file://' + dir + 'card.out.html');
await p.evaluate(() => document.fonts.ready);
await p.waitForTimeout(800);
await p.screenshot({ path: out });
await b.close();
