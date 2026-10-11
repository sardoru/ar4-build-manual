// Functional checks in headless Chrome: run a list of actions against the live (non-still) manual.
// node drive.mjs <url> <outdir> <w> <h> '<json actions>'
// actions: ["go", hash] ["wait", ms] ["shot", name] ["eval", expr] ["click", css] ["key", key]
import { spawn } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
const [url, outdir, W, H, json] = process.argv.slice(2);
mkdirSync(outdir, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const profile = mkdtempSync(join(tmpdir(), "ar4-drive-"));
const chrome = spawn(process.env.CHROME_PATH, ["--headless=new", "--remote-debugging-port=0", `--user-data-dir=${profile}`, "--no-first-run", "--hide-scrollbars", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "about:blank"]);
const port = await new Promise((done, fail) => { let t = ""; const timer = setTimeout(() => fail(new Error("no chrome")), 20000); chrome.stderr.on("data", (c) => { t += c; const m = t.match(/DevTools listening on ws:\/\/[^:]+:(\d+)\//); if (m) { clearTimeout(timer); done(+m[1]); } }); });
const finish = (code) => { chrome.kill("SIGKILL"); try { rmSync(profile, { recursive: true, force: true }); } catch {} process.exit(code); };
try {
  const target = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: "PUT" })).json();
  const ws = new WebSocket(target.webSocketDebuggerUrl); let id = 0; const pending = new Map(); const problems = [];
  ws.onmessage = (ev) => { const d = JSON.parse(ev.data); if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); }
    if (d.method === "Runtime.exceptionThrown") problems.push("exception: " + (d.params.exceptionDetails.exception?.description || d.params.exceptionDetails.text).slice(0, 400));
    if (d.method === "Runtime.consoleAPICalled" && /error|warn|info/.test(d.params.type)) problems.push("console." + d.params.type + ": " + d.params.args.map((a) => a.value ?? a.description ?? "").join(" ").slice(0, 300)); };
  await new Promise((r) => (ws.onopen = r));
  const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  const evaluate = async (expr) => { const r = await send("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true }); return r.result?.result?.value ?? r.result?.exceptionDetails?.exception?.description; };
  await send("Runtime.enable"); await send("Page.enable");
  await send("Emulation.setDeviceMetricsOverride", { width: +W, height: +H, deviceScaleFactor: 2, mobile: +W < 600 });
  for (const [op, arg] of JSON.parse(json)) {
    if (op === "go") { await send("Page.navigate", { url: "about:blank" }); await sleep(100); await send("Page.navigate", { url: url + "#" + arg }); }
    else if (op === "wait") await sleep(arg);
    else if (op === "shot") { const s = await send("Page.captureScreenshot", { format: "png" }); writeFileSync(join(outdir, arg + ".png"), Buffer.from(s.result.data, "base64")); console.log("shot", arg); }
    else if (op === "eval") console.log("eval", JSON.stringify(await evaluate(arg)));
    else if (op === "click") console.log("click", arg, await evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(arg)}); if(!e) return 'missing'; e.click(); return 'ok'})()`));
    else if (op === "key") { const K = { Enter: ["Enter", 13, "\r"], " ": ["Space", 32, " "], ArrowRight: ["ArrowRight", 39, ""], ArrowLeft: ["ArrowLeft", 37, ""] }[arg] || [arg.length === 1 ? "Digit" + arg : arg, arg.length === 1 ? arg.charCodeAt(0) : 0, arg.length === 1 ? arg : ""];
      await send("Input.dispatchKeyEvent", { type: K[2] ? "keyDown" : "rawKeyDown", key: arg, code: K[0], windowsVirtualKeyCode: K[1], text: K[2] || undefined }); await send("Input.dispatchKeyEvent", { type: "keyUp", key: arg, code: K[0], windowsVirtualKeyCode: K[1] }); console.log("key", arg); }
    if (problems.length) console.log("  !!", problems.splice(0).join(" | "));
  }
  finish(0);
} catch (e) { console.error(e); finish(1); }
