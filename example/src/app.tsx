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
