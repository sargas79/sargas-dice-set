/**
 * Render the preview page headlessly and save screenshots.
 *   node tools/screenshots.mjs [outDir] [query...]
 * Default: a gallery of every style.
 */
import fs from "node:fs";
import path from "node:path";
import { openPreview } from "./browser.mjs";

const outDir = path.resolve(process.argv[2] ?? "screenshots");
const queries = process.argv.slice(3);
fs.mkdirSync(outDir, { recursive: true });

const { page, errors, load, close } = await openPreview();
for (const q of queries.length ? queries : ["mode=gallery"]) {
  await load(q);
  await page.waitForTimeout(300);
  const name = q.replace(/[^a-z0-9]+/gi, "_") + ".png";
  await page.screenshot({ path: path.join(outDir, name), fullPage: true });
  console.log("saved", name);
}
for (const e of errors) console.error("page error:", e);
await close();
