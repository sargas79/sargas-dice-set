import * as esbuild from "esbuild";

const args = new Set(process.argv.slice(2));
const common = { bundle: true, format: "esm", target: "es2022", sourcemap: true, legalComments: "none", logLevel: "info" };

const builds = args.has("--demo")
  ? [{ ...common, entryPoints: ["src/demo.js"], outfile: "demo/dist/demo.js", minify: false }]
  : [{ ...common, entryPoints: ["src/main.js"], outfile: "dist/sargas-dice-set.js", minify: !args.has("--dev") }];

if (args.has("--watch")) {
  for (const b of builds) await (await esbuild.context(b)).watch();
} else {
  await Promise.all(builds.map(b => esbuild.build(b)));
}
