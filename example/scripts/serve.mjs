import esbuild from "esbuild";
import runNodeTest from "esbuild-plugin-run-node-test";

esbuild
  .serve(
    { servedir: "." },
    {
      entryPoints: ["src/app.tsx"],
      outdir: "dist/",
      format: "esm",
      jsxFactory: "h",
      jsxFragment: "Fragment",
      bundle: true,
      plugins: [runNodeTest()],
    },
  )
  .then(result => console.log(`http://localhost:${result.port}`));
