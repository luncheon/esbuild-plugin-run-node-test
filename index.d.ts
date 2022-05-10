import { BuildOptions as EsbuildBuildOptions, OnLoadArgs as EsbuildOnLoadArgs, OnLoadResult as EsbuildOnLoadResult, PluginBuild as EsbuildPluginBuild } from "esbuild";
interface RunNodeTestOptions {
    readonly filter?: RegExp;
    readonly run?: boolean;
    readonly removeImports?: readonly string[];
    readonly testBuildOptions?: Readonly<EsbuildBuildOptions>;
}
declare const runNodeTest: ({ filter, run, removeImports, testBuildOptions, }?: RunNodeTestOptions) => {
    name: string;
    setup: (build: EsbuildPluginBuild, pipe?: {
        transform: {
            readonly args: EsbuildOnLoadArgs;
            readonly contents: string;
        };
    } | undefined) => Promise<EsbuildOnLoadResult> | {
        contents: string;
        loader: string;
    } | undefined;
};
export default runNodeTest;
export { runNodeTest };
