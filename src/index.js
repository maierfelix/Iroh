import extend from "./extend";

import Stage from "./stage/index";
import Scope from "./scope";
import Frame from "./frame";

import * as _utils from "./utils";
import * as _setup from "./setup";
import * as _patch from "./patch";

class Iroh {
  constructor() {
    // patch AST scope
    this.scope = null;
    // patch stage
    this.stage = null;
    // patch state
    this.state = null;
    // stage instance
    this.instance = null;
    // container for all stages
    this.stages = {};
    // enter setup phase
    this.setup();
    // say hello
    //this.greet();
  }
};

// link methods to main class
extend(Iroh, _utils);
extend(Iroh, _setup);
extend(Iroh, _patch);

const iroh = new Iroh();

// intercept Stage instantiations
let _Stage = function() {
  let stage = new Stage(...arguments);
  // register stage to iroh stages
  // so we can keep track of it
  iroh.stages[stage.key] = stage;
  return stage;
};
_Stage.prototype = Object.create(Stage.prototype);
iroh.Stage = _Stage;

// link to outer space
if (typeof window !== "undefined") {
  window.Iroh = iroh;
}

export default iroh;
