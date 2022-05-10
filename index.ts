import {
  Identifier as SwcIdentifier,
  Module as SwcModule,
  ModuleItem as SwcModuleItem,
  parse as swcParse,
  parseFile as swcParseFile,
  ParseOptions as SwcParseOptions,
  print as swcPrint,
  Statement as SwcStatement,
  TsType as SwcTsType,
} from "@swc/core";
import { Visitor as SwcVisitor } from "@swc/core/Visitor.js";
import {
  BuildOptions as EsbuildBuildOptions,
  OnLoadArgs as EsbuildOnLoadArgs,
  OnLoadResult as EsbuildOnLoadResult,
  PluginBuild as EsbuildPluginBuild,
} from "esbuild";
import { createRequire } from "node:module";
import path from "node:path";
import vm from "node:vm";

const name = "esbuild-plugin-run-node-test";

class NodeTestRemovalVisitor extends SwcVisitor {
  existsNodeTest = false;
  importedNodeTestIdentifier?: SwcIdentifier;

  constructor(private readonly removeImports: readonly string[]) {
    super();
  }

  override visitModuleItems(items: SwcModuleItem[]): SwcModuleItem[] {
    return super.visitModuleItems(
      items.filter(m => {
        if (m.type !== "ImportDeclaration" || m.typeOnly) {
          return true;
        }
        if (m.source.value === "node:test" && m.specifiers.length === 1 && m.specifiers[0].type === "ImportDefaultSpecifier") {
          this.importedNodeTestIdentifier = m.specifiers[0].local;
          return false;
        }
        if (this.removeImports.includes(m.source.value)) {
          return false;
        }
        return true;
      }),
    );
  }

  override visitStatement(s: SwcStatement): SwcStatement {
    if (
      this.importedNodeTestIdentifier &&
      s.type === "ExpressionStatement" &&
      s.expression.type === "CallExpression" &&
      s.expression.callee.type === "Identifier" &&
      s.expression.callee.value === this.importedNodeTestIdentifier.value
    ) {
      this.existsNodeTest = true;
      return { type: "EmptyStatement", span: s.span };
    }
    return super.visitStatement(s);
  }

  override visitTsType(t: SwcTsType): SwcTsType {
    return t;
  }
}

interface RunNodeTestOptions {
  readonly filter?: RegExp;
  readonly run?: boolean;
  readonly removeImports?: readonly string[];
  readonly testBuildOptions?: Readonly<EsbuildBuildOptions>;
}

const runNodeTest = ({
  filter = /\.[cm]?[jt]sx?$/,
  run = true,
  removeImports = ["node:assert", "node:assert/strict"],
  testBuildOptions,
}: RunNodeTestOptions = {}) => {
  let testSourceCode = "";
  const resolveDir = process.cwd();

  const transform = async (
    args: EsbuildOnLoadArgs,
    parse: (swcParseOptions: SwcParseOptions) => Promise<SwcModule>,
  ): Promise<EsbuildOnLoadResult> => {
    // use `parse()` + `print()` instead of `transform()` because `transform()` cannot preserve jsx.
    const swcModule: SwcModule = await parse(
      /tsx?$/.test(args.path)
        ? { syntax: "typescript", tsx: args.path.endsWith("x"), target: "es2022" }
        : { syntax: "ecmascript", jsx: args.path.endsWith("x"), target: "es2022" },
    );
    const nodeTestRemovalVisitor = new NodeTestRemovalVisitor(removeImports);
    nodeTestRemovalVisitor.visitModule(swcModule);
    const { code } = await swcPrint(swcModule, { sourceMaps: false });
    nodeTestRemovalVisitor.existsNodeTest && (testSourceCode += `import "./${path.relative(resolveDir, args.path)}";\n`);
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

      build.onLoad({ filter }, args => transform(args, swcParseOptions => swcParseFile(args.path, swcParseOptions)));

      run &&
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
            watch: false,
            ...testBuildOptions,
            write: false,
          });
          vm.runInNewContext(outputFiles[0].text, { require: createRequire(import.meta.url) }, { breakOnSigint: true });
        });
    },
  };
};

export default runNodeTest;
export { runNodeTest };
