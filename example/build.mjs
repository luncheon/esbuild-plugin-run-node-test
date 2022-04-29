import esbuild from "esbuild";
import pipe from "esbuild-plugin-pipe";
import runNodeTest from "../index.js";

await esbuild.build({
  entryPoints: { "app1.js": "src/app.tsx" },
  outdir: "dist/",
  format: "esm",
  jsxFactory: "h",
  jsxFragment: "Fragment",
  bundle: true,
  plugins: [runNodeTest()],
});

const runNodeTestInstance = runNodeTest({ filter: /^$/ });

await esbuild.build({
  entryPoints: { "app2.js": "src/app.tsx" },
  outdir: "dist/",
  format: "esm",
  jsxFactory: "h",
  jsxFragment: "Fragment",
  bundle: true,
  plugins: [
    pipe({
      filter: /\.[cm]?[jt]sx?$/,
      plugins: [runNodeTestInstance],
    }),
    runNodeTestInstance,
  ],
});
