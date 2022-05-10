import esbuild from "esbuild";
import runNodeTest from "esbuild-plugin-run-node-test";
import path from "node:path";
import { fileURLToPath } from "node:url";
const __dirname = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const __resolve = filename => path.resolve(__dirname, filename);

esbuild.build({
  entryPoints: { watch: __resolve("src/app.tsx") },
  outdir: __resolve("dist/"),
  format: "esm",
  jsxFactory: "h",
  jsxFragment: "Fragment",
  bundle: true,
  plugins: [runNodeTest()],
  watch: true,
});
