/** Shared helpers for driving the preview page (demo/index.html) in headless Chromium. */
import { chromium } from "playwright-core";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";

const TYPES = { ".html": "text/html", ".js": "text/javascript", ".map": "application/json", ".png": "image/png", ".json": "application/json" };

/** Serve the repository root and open a headless browser page with WebGL (SwiftShader). */
export async function openPreview({ width = 1400, height = 800 } = {}) {
  const root = path.resolve(".");
  const server = http.createServer((req, res) => {
    const file = path.join(root, decodeURIComponent(new URL(req.url, "http://x").pathname));
    if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) return res.writeHead(404).end();
    res.writeHead(200, { "content-type": TYPES[path.extname(file)] ?? "application/octet-stream" });
    fs.createReadStream(file).pipe(res);
  });
  await new Promise(r => server.listen(0, "127.0.0.1", r));
  const base = `http://127.0.0.1:${server.address().port}/demo/index.html`;
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH ?? findChromium(),
    args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"]
  });
  const page = await browser.newPage({ viewport: { width, height } });
  const errors = [];
  page.on("pageerror", e => errors.push(e.message));
  page.on("console", m => {
    if (m.type() === "error" && !m.text().includes("404")) errors.push(m.text());
  });

  /** Load a preview URL and wait until it has rendered (and, for rolls, settled). */
  async function load(query) {
    await page.goto(`${base}?${query}`, { waitUntil: "commit", timeout: 180000 });
    await page.waitForFunction(() => window.ready === true, null, { timeout: 180000 });
    if (query.includes("mode=roll")) await page.waitForFunction(() => window.rollSettled === true, null, { timeout: 180000 });
  }

  async function close() {
    await browser.close();
    server.close();
  }
  return { page, errors, load, close };
}

export function findChromium() {
  const dir = "/opt/pw-browsers";
  if (!fs.existsSync(dir)) return undefined;
  const found = fs.readdirSync(dir).filter(d => d.startsWith("chromium")).sort().reverse();
  for (const d of found) {
    for (const rel of ["chrome-linux/chrome", "chrome-linux64/chrome", "chrome-headless-shell-linux64/chrome-headless-shell"]) {
      const p = path.join(dir, d, rel);
      if (fs.existsSync(p)) return p;
    }
  }
  return undefined;
}
