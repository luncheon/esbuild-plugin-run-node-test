import { parse as swcParse, parseFile as swcParseFile, print as swcPrint, } from "@swc/core";
import { Visitor as SwcVisitor } from "@swc/core/Visitor.js";
import { createRequire } from "node:module";
import path from "node:path";
import vm from "node:vm";
const name = "esbuild-plugin-run-node-test";
class NodeTestRemovalVisitor extends SwcVisitor {
    removeImports;
    existsNodeTest = false;
    importedNodeTestIdentifier;
    constructor(removeImports) {
        super();
        this.removeImports = removeImports;
    }
    visitModuleItems(items) {
        return super.visitModuleItems(items.filter(m => {
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
        }));
    }
    visitStatement(s) {
        if (this.importedNodeTestIdentifier &&
            s.type === "ExpressionStatement" &&
            s.expression.type === "CallExpression" &&
            s.expression.callee.type === "Identifier" &&
            s.expression.callee.value === this.importedNodeTestIdentifier.value) {
            this.existsNodeTest = true;
            return { type: "EmptyStatement", span: s.span };
        }
        return super.visitStatement(s);
    }
    visitTsType(t) {
        return t;
    }
}
const runNodeTest = ({ filter = /\.[cm]?[jt]sx?$/, run = true, removeImports = ["node:assert", "node:assert/strict"] } = {}) => {
    let testSourceCode = "";
    const resolveDir = process.cwd();
    const transform = async (args, parse) => {
        // use `parse()` + `print()` instead of `transform()` because `transform()` cannot preserve jsx.
        const swcModule = await parse(/tsx?$/.test(args.path)
            ? { syntax: "typescript", tsx: args.path.endsWith("x") }
            : { syntax: "ecmascript", jsx: args.path.endsWith("x") });
        const nodeTestRemovalVisitor = new NodeTestRemovalVisitor(removeImports);
        nodeTestRemovalVisitor.visitModule(swcModule);
        const { code } = await swcPrint(swcModule, { sourceMaps: false });
        nodeTestRemovalVisitor.existsNodeTest && (testSourceCode += `import "./${path.relative(resolveDir, args.path)}";\n`);
        return { contents: code, loader: args.path.replace(/.*\.[cm]?/, "") };
    };
    return {
        name,
        setup: (build, pipe) => {
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
                        write: false,
                    });
                    vm.runInNewContext(outputFiles[0].text, { require: createRequire(import.meta.url) }, { breakOnSigint: true });
                });
        },
    };
};
export default runNodeTest;
export { runNodeTest };
