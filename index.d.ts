import { OnLoadArgs as EsbuildOnLoadArgs, OnLoadResult as EsbuildOnLoadResult, PluginBuild as EsbuildPluginBuild } from "esbuild";
export interface EsbuildPluginNodeTestOptions {
    readonly filter?: RegExp;
}
declare const runNodeTest: ({ filter }?: EsbuildPluginNodeTestOptions) => {
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
