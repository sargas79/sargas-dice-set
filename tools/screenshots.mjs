/**
 * Render the preview page headlessly and save screenshots.
 *   node tools/screenshots.mjs [outDir] [query...]
 * Default: a gallery of every style plus a per-kind sheet for each style.
 */
import { chromium } from "playwright-core";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(".");
const outDir = path.resolve(process.argv[2] ?? "screenshots");
const queries = process.argv.slice(3);
fs.mkdirSync(outDir, { recursive: true });

const types = { ".html": "text/html", ".js": "text/javascript", ".map": "application/json", ".png": "image/png", ".json": "application/json" };
const server = http.createServer((req, res) => {
  const file = path.join(root, decodeURIComponent(new URL(req.url, "http://x").pathname));
  if (!file.startsWith(root) || !fs.existsSync(file)) return res.writeHead(404).end();
  res.writeHead(200, { "content-type": types[path.extname(file)] ?? "application/octet-stream" });
  fs.createReadStream(file).pipe(res);
});
await new Promise(r => server.listen(0, r));
const base = `http://127.0.0.1:${server.address().port}/demo/index.html`;

const executablePath = process.env.CHROMIUM_PATH ?? findChromium();
const browser = await chromium.launch({ executablePath, args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const page = await browser.newPage({ viewport: { width: 1400, height: 800 } });
page.on("console", m => m.type() === "error" && console.error("page:", m.text()));
page.on("pageerror", e => console.error("pageerror:", e.message));

const shots = queries.length ? queries : ["mode=gallery"];
for (const q of shots) {
  await page.goto(`${base}?${q}`, { waitUntil: "commit", timeout: 120000 });
  await page.waitForFunction(() => window.ready === true, null, { timeout: 120000 });
  if (q.includes("mode=roll")) await page.waitForFunction(() => window.rollSettled === true, null, { timeout: 120000 });
  await page.waitForTimeout(300);
  const name = q.replace(/[^a-z0-9]+/gi, "_") + ".png";
  await page.screenshot({ path: path.join(outDir, name), fullPage: true });
  console.log("saved", name);
}
await browser.close();
server.close();

function findChromium() {
  const dir = "/opt/pw-browsers";
  const found = fs.readdirSync(dir).filter(d => d.startsWith("chromium")).sort().reverse();
  for (const d of found) {
    for (const rel of ["chrome-linux/chrome", "chrome-linux64/chrome", "chrome-headless-shell-linux64/chrome-headless-shell"]) {
      const p = path.join(dir, d, rel);
      if (fs.existsSync(p)) return p;
    }
  }
  return undefined;
}
