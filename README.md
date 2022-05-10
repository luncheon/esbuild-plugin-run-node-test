# esbuild-plugin-run-node-test

Please write tests in your source file.  
This [`esbuild`](https://esbuild.github.io/) plugin runs the tests and remove them from the bundle.

## Installation

```
npm i -D esbuild esbuild-plugin-run-node-test
```

## Usage Example

The following example uses [`Preact`](https://preactjs.com/), but this plugin is framework-agnostic.

### Source Code

- src/app.tsx

```tsx
import { Fragment, h, render } from "preact";
import { add } from "./add";
import { mul } from "./mul";

const App = () => (
  <>
    <p>20 + 22 = {add(20, 22)}</p>
    <p>6 × 7 = {mul(6, 7)}</p>
  </>
);

render(<App />, document.body);
```

- src/add.ts

```ts
import assert from "node:assert/strict";
import test from "node:test";

export const add = (x: number, y: number) => x + y;

test("add(1, 2) should be 3", () => {
  assert.equal(add(1, 2), 3);
});
```

- src/mul.js

```ts
import assert from "node:assert/strict";
import test from "node:test";

export const mul = (x, y) => x * y;

test("mul(3, 2) should be 6", () => {
  assert.equal(mul(3, 2), 6);
});
```

### Build Script

- build.mjs

```js
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
});
```

### Execution

```js
$ node build.mjs

ok 1 - mul(3, 2) should be 6
  ---
  duration_ms: 0.000448975
  ...
ok 2 - add(1, 2) should be 3
  ---
  duration_ms: 0.00015755
  ...
1..2
# tests 2
# pass 2
# fail 0
# skipped 0
# todo 0
# duration_ms 0.133946737
```

```js
$ cat dist/app.js

// node_modules/preact/dist/preact.module.js
/* ... */

// src/add.ts
var add = (x2, y2) => x2 + y2;

// src/mul.ts
var mul = (x2, y2) => x2 * y2;

// src/app.tsx
var App = () => /* @__PURE__ */ v(d, null, /* @__PURE__ */ v("div", null, "20 + 22 = ", add(20, 22)), /* @__PURE__ */ v("div", null, "6 \xD7 7 = ", mul(6, 7)));
S(/* @__PURE__ */ v(App, null), document.body);
```

## Behavior

When bundling source files using `esbuild` with this plugin,

<!-- prettier-ignore -->
1. `let testSourceCode = ""`
1. each source file to be bundled is parsed using [`swc`](https://swc.rs/)
    - if a source file includes `import test from "node:test"` and the imported `test` is called:
        - remove all `test(...)`
        - `` testSourceCode += `import "${the source file path}";` ``
    - remove the following import statements (by default):
        - `"node:test"`
        - `"node:assert"`
        - `"node:assert/strict"`
1. finally, when the bundling is complete, `testSourceCode` is also bundled using `esbuild` and run

## Options

The options for this plugin and their default values are as follows:

```js
runNodeTest({
  // narrow down the files to which this plugin should be applied.
  // https://esbuild.github.io/plugins/#filters
  filter: /\.[cm]?[jt]sx?$/,

  // if `false`, just remove import statements and `test(...)`, and tests are not run.
  run: true,

  // modules to be removed.
  removeImports: [
    // "node:test" is removed even if not specified.
    "node:assert",
    "node:assert/strict",
  ],

  // esbuild options used to bundle tests.
  // https://esbuild.github.io/api/
  testBuildOptions: {
    // define, external, loader, target, etc.
  },
});
```

## Limitations

<!-- prettier-ignore -->
- Currently, the module format of the test bundle is CommonJS, not ES Module. This imposes some limitations (e.g., top-level `await` cannot be used).
- Currently, tests are not run in [`esbuild serve mode`](https://esbuild.github.io/api/#serve). Test code removal is fine.
    - Plugins' onEnd callback isn't triggerred in serve mode · Issue #1384 · evanw/esbuild  
      https://github.com/evanw/esbuild/issues/1384
- Regardless of scope, function call statements whose names match the default import from `"node:test"` are removed.
    ```js
    import foo from "node:test";

    {
      const foo = () => {};
      foo(); // will be removed
    }
    ```

## With `esbuild-plugin-pipe`

If you use this plugin with [`esbuild-plugin-pipe`](https://github.com/nativew/esbuild-plugin-pipe), pass the same plugin instance to both `esbuild-plugin-pipe` and `esbuild`.

```js
import esbuild from "esbuild";
import pipe from "esbuild-plugin-pipe";
import runNodeTest from "esbuild-plugin-run-node-test";

const runNodeTestInstance = runNodeTest({ filter: /^$/ });

esbuild.build({
  entryPoints: ["src/app.ts"],
  outdir: "dist/",
  bundle: true,
  minify: true,
  plugins: [
    pipe({
      filter: /\.[cm]?[jt]sx?$/,
      plugins: [runNodeTestInstance],
    }),
    runNodeTestInstance,
  ],
});
```

## License

[WTFPL](http://www.wtfpl.net/)
