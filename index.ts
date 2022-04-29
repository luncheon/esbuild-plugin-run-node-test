import {
  Module as SwcModule,
  parse as swcParse,
  parseFile as swcParseFile,
  ParseOptions as SwcParseOptions,
  print as swcPrint,
} from "@swc/core";
import { OnLoadArgs as EsbuildOnLoadArgs, OnLoadResult as EsbuildOnLoadResult, PluginBuild as EsbuildPluginBuild } from "esbuild";
import { createRequire } from "node:module";
import path from "node:path";
import vm from "node:vm";

export interface EsbuildPluginNodeTestOptions {
  readonly filter?: RegExp;
}

const name = "esbuild-plugin-run-node-test";

const stripNodeTest = (script: SwcModule): [SwcModule, boolean] => {
  let existsNodeTest = false;
  let importedNodeTestIdentifier: string | undefined;
  const body = script.body.filter(m => {
    if (m.type === "ImportDeclaration" && !m.typeOnly) {
      if (m.source.value === "node:test" && m.specifiers.length === 1 && m.specifiers[0].type === "ImportDefaultSpecifier") {
        importedNodeTestIdentifier = m.specifiers[0].local.value;
        return false;
      }
      if (m.source.value === "node:assert" || m.source.value === "node:assert/strict") {
        return false;
      }
    }
    if (
      importedNodeTestIdentifier &&
      m.type === "ExpressionStatement" &&
      m.expression.type === "CallExpression" &&
      m.expression.callee.type === "Identifier" &&
      m.expression.callee.value === importedNodeTestIdentifier
    ) {
      existsNodeTest = true;
      return false;
    }
    return true;
  });
  return [{ ...script, body }, existsNodeTest];
};

const runNodeTest = ({ filter }: EsbuildPluginNodeTestOptions = {}) => {
  let testSourceCode = "";
  const resolveDir = process.cwd();

  const transform = async (
    args: EsbuildOnLoadArgs,
    parse: (swcParseOptions: SwcParseOptions) => Promise<SwcModule>,
  ): Promise<EsbuildOnLoadResult> => {
    const sourceScript = await parse(
      /\.[cm]?tsx?$/.test(args.path)
        ? { syntax: "typescript", tsx: args.path.endsWith("x") }
        : { syntax: "ecmascript", jsx: args.path.endsWith("x") },
    );
    const [testStrippedScript, existsNodeTest] = stripNodeTest(sourceScript);
    const { code } = await swcPrint(testStrippedScript, { sourceMaps: false });
    existsNodeTest && (testSourceCode += `import "./${path.relative(resolveDir, args.path)}";\n`);
    return { contents: code, loader: args.path.replace(/.*\.[cm]?/, "") as "js" | "jsx" | "ts" | "tsx" };
  };

  return {
    name,
    setup: (build: EsbuildPluginBuild, pipe?: { transform: { readonly args: EsbuildOnLoadArgs; readonly contents: string } }) => {
      if (pipe?.transform) {
        return build.initialOptions.stdin?.contents === testSourceCode
          ? { contents: pipe.transform.contents, loader: pipe.transform.args.path.replace(/.*\.[cm]?/, "") }
          : transform(pipe.transform.args, swcParseOptions => swcParse(pipe.transform.contents, swcParseOptions));
      }

      build.onStart(() => {
        testSourceCode = "";
      });

      build.onLoad({ filter: filter ?? /\.[mc]?[jt]sx?$/ }, args =>
        transform(args, swcParseOptions => swcParseFile(args.path, swcParseOptions)),
      );

      build.onEnd(async () => {
        const resolveDir = process.cwd();
        const { outputFiles } = await build.esbuild.build({
          ...build.initialOptions,
          entryPoints: undefined,
          format: "cjs",
          platform: "node",
          plugins: build.initialOptions.plugins?.filter(plugin => plugin.name !== name),
          stdin: { contents: testSourceCode, resolveDir, loader: "ts" },
          sourcemap: false,
          write: false,
        });
        vm.runInNewContext(outputFiles[0].text, { require: createRequire(import.meta.url) }, { breakOnSigint: true });
      });
    },
  };
};

export default runNodeTest;
export { runNodeTest };
