/**
 * Browser smoke test: renders every style and die kind in headless Chromium,
 * throws real dice through the WebGL renderer and checks that every die
 * shows the requested value on top. Fails on any page error.
 *   node tools/smoke.mjs [screenshotDir]
 */
import fs from "node:fs";
import path from "node:path";
import { openPreview } from "./browser.mjs";

const outDir = path.resolve(process.argv[2] ?? "smoke-screenshots");
fs.mkdirSync(outDir, { recursive: true });
const { page, errors, load, close } = await openPreview();
const failures = [];
const shot = async name => page.screenshot({ path: path.join(outDir, `${name}.png`), fullPage: true });

try {
  await load("mode=gallery&size=160");
  await shot("gallery");
  for (const style of ["vintage-bone", "smoke-glass", "oil-slick"]) {
    await load(`mode=kinds&style=${style}`);
    await shot(`kinds-${style}`);
  }

  // Oracle d6 textures must be the design's own face artwork (only resampling noise allowed).
  await load("mode=faces");
  const faces = await page.evaluate(() => window.facesReport);
  const worst = Math.max(...faces.map(r => r.meanDiff));
  const oracleCount = await page.evaluate(() => window.oracleStyleCount);
  const facesOk = faces.length === oracleCount * 6 && oracleCount >= 7 && worst < 4;
  console.log(`${facesOk ? "ok  " : "FAIL"} oracle face artwork: ${faces.length} faces, worst mean colour difference ${worst} / 255`);
  if (!facesOk) failures.push(`Oracle textures differ from the design (worst ${worst}, ${faces.length} faces)`);
  await shot("oracle-faces");
  // The design's number font ships with the module and must be loaded before numbers are painted.
  const fontOk = await page.evaluate(() => document.fonts.check('700 20px "Cormorant SC"'));
  console.log(`${fontOk ? "ok  " : "FAIL"} Cormorant SC number font loaded`);
  if (!fontOk) failures.push("the Cormorant SC font was not loaded");

  const dice = "2d6,1d20,1d100,1d4,1d8,1d10,1d12,2dF,2dc,1d3,1d2";
  const rolls = [
    ["walnut", 1, "1"],
    ["amber-moth", 2, "1"],
    ["riveted-steel", 3, "0"],
    ["obsidian-gold", 4, "1"],
    ["classic-red", 5, "1"],
    ["oracle-sigil", 6, "1"],
    ["oracle-resin", 7, "0"],
    ["oracle-drowned", 8, "1"]
  ];
  for (const [style, seed, fit] of rolls) {
    await load(`mode=roll&style=${style}&dice=${dice}&seed=${seed}&speed=4&quality=low&fit=${fit}`);
    const { expected, shown } = await page.evaluate(() => window.rollResult);
    const same = expected.length === shown.length && expected.every((v, i) => v === shown[i]);
    console.log(`${same ? "ok  " : "FAIL"} ${style} seed ${seed}: expected ${expected.join(",")} shown ${shown.join(",")}`);
    if (!same) failures.push(`${style}/${seed}: expected ${expected} but the dice show ${shown}`);
    await shot(`roll-${style}-${seed}`);
  }

  await load(`mode=roll&style=frost&dice=1d20,1d6&seed=5&speed=4&quality=low&hidden=1`);
  await shot("roll-hidden");

  // Simulate the GPU dropping the WebGL context, then check the next roll rebuilds the renderer.
  await load(`mode=roll&style=concrete&dice=2d6,1d20&seed=6&speed=4&quality=low`);
  const recovered = await page.evaluate(async () => {
    const canvas = window.box.renderer.domElement;
    canvas.getContext("webgl2").getExtension("WEBGL_lose_context").loseContext();
    await new Promise(r => setTimeout(r, 200));
    const lostCleanly = !window.box.renderer && !document.contains(canvas);
    const result = await window.throwAgain(7);
    return { lostCleanly, ...result, canvases: document.querySelectorAll("#sargas-dice-canvas").length };
  });
  const recoveredOk = recovered.lostCleanly && recovered.canvases === 1 && recovered.expected.every((v, i) => v === recovered.shown[i]);
  console.log(`${recoveredOk ? "ok  " : "FAIL"} context loss: ${JSON.stringify(recovered)}`);
  if (!recoveredOk) failures.push(`renderer did not recover from a lost WebGL context: ${JSON.stringify(recovered)}`);
  await shot("roll-after-context-loss");

  // With "reduce motion" on, the roll finishes at once and nothing is drawn.
  await page.emulateMedia({ reducedMotion: "reduce" });
  await load(`mode=roll&style=walnut&dice=3d6&seed=9&quality=low`);
  const still = await page.evaluate(() => ({ throws: window.box.throws.size, canvas: !!document.querySelector("#sargas-dice-canvas") }));
  const stillOk = still.throws === 0 && !still.canvas;
  console.log(`${stillOk ? "ok  " : "FAIL"} reduced motion: ${JSON.stringify(still)}`);
  if (!stillOk) failures.push(`dice were animated with reduced motion on: ${JSON.stringify(still)}`);
  await page.emulateMedia({ reducedMotion: "no-preference" });
} catch (err) {
  failures.push(err.message);
}

for (const e of errors) failures.push(`page error: ${e}`);
await close();
if (failures.length) {
  console.error(`\n${failures.length} problem(s):\n- ${failures.join("\n- ")}`);
  process.exit(1);
}
console.log("\nBrowser smoke test passed.");
