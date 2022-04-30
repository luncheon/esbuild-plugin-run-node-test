import { OnLoadArgs as EsbuildOnLoadArgs, OnLoadResult as EsbuildOnLoadResult, PluginBuild as EsbuildPluginBuild } from "esbuild";
declare const runNodeTest: ({ filter, run, removeImports }?: {
    filter?: RegExp | undefined;
    run?: boolean | undefined;
    removeImports?: string[] | undefined;
}) => {
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
