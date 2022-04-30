import esbuild from "esbuild";
import pipe from "esbuild-plugin-pipe";
import runNodeTest from "esbuild-plugin-run-node-test";
import test from "node:test";
import { setTimeout } from "node:timers/promises";

test("dummy");
await setTimeout(100);

console.log("\n\nplugins: [runNodeTest()]\n");
await esbuild.build({
  entryPoints: ["src/app.tsx"],
  outdir: "dist/",
  format: "esm",
  jsxFactory: "h",
  jsxFragment: "Fragment",
  bundle: true,
  plugins: [runNodeTest()],
});

console.log("\n\nplugins: [runNodeTest({ run: false })]\n");
await esbuild.build({
  entryPoints: { "run-false": "src/app.tsx" },
  outdir: "dist/",
  format: "esm",
  jsxFactory: "h",
  jsxFragment: "Fragment",
  bundle: true,
  plugins: [runNodeTest({ run: false })],
});

console.log("\n\nplugins: [runNodeTest({ filter: /add.ts/ })]\n");
await esbuild.build({
  entryPoints: { "filter-add": "src/app.tsx" },
  outdir: "dist/",
  format: "esm",
  platform: "node",
  jsxFactory: "h",
  jsxFragment: "Fragment",
  bundle: true,
  plugins: [runNodeTest({ filter: /add\.ts/ })],
});

console.log('\n\nplugins: [runNodeTest({ removeImports: ["./mul"] })]\n');
await esbuild.build({
  entryPoints: { "remove-mul": "src/app.tsx" },
  outdir: "dist/",
  format: "esm",
  jsxFactory: "h",
  jsxFragment: "Fragment",
  bundle: true,
  plugins: [runNodeTest({ removeImports: ["node:assert/strict", "./mul"] })],
});

console.log("\n\nplugins: [pipe({ filter: /.[cm]?[jt]sx?$/, plugins: [runNodeTestInstance] }), runNodeTestInstance]\n");
const runNodeTestInstance = runNodeTest({ filter: /^$/ });
await esbuild.build({
  entryPoints: { pipe: "src/app.tsx" },
  outdir: "dist/",
  format: "esm",
  jsxFactory: "h",
  jsxFragment: "Fragment",
  bundle: true,
  plugins: [pipe({ filter: /\.[cm]?[jt]sx?$/, plugins: [runNodeTestInstance] }), runNodeTestInstance],
});
