import esbuild from "esbuild";
import pipe from "esbuild-plugin-pipe";
import runNodeTest from "esbuild-plugin-run-node-test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
const __dirname = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const __resolve = filename => path.resolve(__dirname, filename);

fs.rmSync(__resolve("dist"), { recursive: true, force: true });

/** @type esbuild.BuildOptions */
const commonOptions = { outdir: __resolve("dist/"), format: "esm", jsxFactory: "h", jsxFragment: "Fragment", bundle: true };

test("plugins: [runNodeTest()]", async () => {
  const { errors } = await esbuild.build({
    ...commonOptions,
    entryPoints: [__resolve("src/app.tsx")],
    plugins: [runNodeTest()],
  });
  assert.equal(errors.length, 0);
  assert(!fs.readFileSync("dist/app.js", "utf8").includes("node:test"));
});

test("plugins: [runNodeTest({ run: false })]", async () => {
  const { errors } = await esbuild.build({
    ...commonOptions,
    entryPoints: { "run-false": __resolve("src/app.tsx") },
    plugins: [runNodeTest({ run: false })],
  });
  assert.equal(errors.length, 0);
  assert(!fs.readFileSync("dist/run-false.js", "utf8").includes("node:test"));
});

test("plugins: [runNodeTest({ filter: /add.ts/ })]", async () => {
  const { errors } = await esbuild.build({
    ...commonOptions,
    entryPoints: { "filter-add": __resolve("src/app.tsx") },
    platform: "node",
    plugins: [runNodeTest({ filter: /add\.ts/ })],
  });
  assert.equal(errors.length, 0);
  assert(fs.readFileSync("dist/filter-add.js", "utf8").includes("node:test"));
  assert(fs.readFileSync("dist/filter-add.js", "utf8").includes("mul.js"));
});

test('plugins: [runNodeTest({ removeImports: ["./mul"] })]', async () => {
  const { errors } = await esbuild.build({
    ...commonOptions,
    entryPoints: { "remove-mul": __resolve("src/app.tsx") },
    plugins: [runNodeTest({ removeImports: ["node:assert/strict", "./mul"] })],
  });
  assert.equal(errors.length, 0);
  assert(!fs.readFileSync("dist/remove-mul.js", "utf8").includes("node:test"));
  assert(!fs.readFileSync("dist/remove-mul.js", "utf8").includes("mul.js"));
});

test("plugins: [pipe({ filter: /.[cm]?[jt]sx?$/, plugins: [runNodeTestInstance] }), runNodeTestInstance]", async () => {
  const runNodeTestInstance = runNodeTest({ filter: /^$/ });
  const { errors } = await esbuild.build({
    ...commonOptions,
    entryPoints: { pipe: __resolve("src/app.tsx") },
    plugins: [pipe({ filter: /\.[cm]?[jt]sx?$/, plugins: [runNodeTestInstance] }), runNodeTestInstance],
  });
  assert.equal(errors.length, 0);
  assert(!fs.readFileSync("dist/pipe.js", "utf8").includes("node:test"));
});
