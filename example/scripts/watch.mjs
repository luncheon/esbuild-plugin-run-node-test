import esbuild from "esbuild";
import runNodeTest from "esbuild-plugin-run-node-test";

esbuild.build({
  entryPoints: ["src/app.tsx"],
  outdir: "dist/",
  format: "esm",
  jsxFactory: "h",
  jsxFragment: "Fragment",
  bundle: true,
  plugins: [runNodeTest()],
  watch: true,
});
