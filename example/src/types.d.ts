declare module "node:test" {
  const test: (name: string, fn: () => void) => void;
  export default test;
}
