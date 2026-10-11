// Capture several pages of the manual in one headless Chrome session.
// node shoot.mjs <url-without-hash> <outdir> <w> <h> <scale> <wait-ms> <hash> [<hash> ...]
// A hash may carry a zoom: "step4&still@x,y,w,h" saves an extra 4x close-up of that CSS-px region.
import { spawn } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const [url, outdir, W, H, SC, WAIT, ...hashes] = process.argv.slice(2);
mkdirSync(outdir, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const profile = mkdtempSync(join(tmpdir(), "ar4-shoot-"));
const chrome = spawn(process.env.CHROME_PATH, ["--headless=new", "--remote-debugging-port=0", `--user-data-dir=${profile}`, "--no-first-run",
  "--hide-scrollbars", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "about:blank"]);
const port = await new Promise((done, fail) => { let t = ""; const timer = setTimeout(() => fail(new Error("Chrome did not start")), 20000);
  chrome.stderr.on("data", (c) => { t += c; const m = t.match(/DevTools listening on ws:\/\/[^:]+:(\d+)\//); if (m) { clearTimeout(timer); done(+m[1]); } }); });
const finish = (code) => { chrome.kill("SIGKILL"); try { rmSync(profile, { recursive: true, force: true }); } catch {} process.exit(code); };
try {
  const target = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: "PUT" })).json();
  const ws = new WebSocket(target.webSocketDebuggerUrl); let id = 0; const pending = new Map(); const problems = [];
  ws.onmessage = (ev) => { const d = JSON.parse(ev.data); if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); }
    if (d.method === "Runtime.exceptionThrown") problems.push("exception: " + (d.params.exceptionDetails.exception?.description || d.params.exceptionDetails.text).slice(0, 300));
    if (d.method === "Runtime.consoleAPICalled" && (d.params.type === "error" || d.params.type === "warning")) problems.push("console." + d.params.type + ": " + d.params.args.map((a) => a.value ?? a.description ?? "").join(" ").slice(0, 300)); };
  await new Promise((r) => (ws.onopen = r));
  const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  const evaluate = async (expr) => (await send("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true })).result?.result?.value;
  await send("Runtime.enable"); await send("Page.enable");
  await send("Emulation.setDeviceMetricsOverride", { width: +W, height: +H, deviceScaleFactor: +SC, mobile: +W < 600 });
  for (const raw of hashes) {
    const [hash, zoom] = raw.split("@");
    await send("Page.navigate", { url: "about:blank" }); await sleep(100);
    await send("Page.navigate", { url: url + "#" + hash });
    await sleep(+WAIT);
    const info = await evaluate(`JSON.stringify({ih: innerHeight, iw: innerWidth, app: document.querySelector('.app')?.getBoundingClientRect().height, sw: document.documentElement.scrollWidth})`);
    const name = hash.replace(/&still/, "").replace(/[^\w-]/g, "_");
    const shot = await send("Page.captureScreenshot", { format: "png" });
    writeFileSync(join(outdir, name + ".png"), Buffer.from(shot.result.data, "base64"));
    if (zoom) { const [x, y, w, h] = zoom.split(",").map(Number);
      const z = await send("Page.captureScreenshot", { format: "png", clip: { x, y, width: w, height: h, scale: 4 / +SC } });
      writeFileSync(join(outdir, name + "-zoom.png"), Buffer.from(z.result.data, "base64")); }
    console.log(name, info, problems.splice(0).join(" | ") || "clean");
  }
  finish(0);
} catch (e) { console.error(e); finish(1); }
