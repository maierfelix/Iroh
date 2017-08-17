import { INSTR } from "../labels";

import {
  generate,
  getCategoryFromInstruction
} from "../helpers";

export default class RuntimeEvent {
  constructor(type, instance) {
    this.type = type;
    this.category = getCategoryFromInstruction(type);
    // base properties
    this.hash = -1;
    this.indent = -1;
    this.node = null;
    this.location = null;
    this.instance = instance;
    // TODO
    // turn all events into seperate classes
    // so we can save a lot memory
  }
  trigger(trigger) {
    // trigger all attached listeners
    this.instance.triggerListeners(this, trigger);
  }
  getASTNode() {
    let source = this.getSource();
    let ast = acorn.parse(source, {
      allowReturnOutsideFunction: true
    });
    return ast;
  }
  getLocation() {
    let node = this.instance.nodes[this.hash].node;
    return {
      end: node.end,
      start: node.start
    };
  }
  getSource() {
    let loc = this.getLocation();
    let input = this.instance.input;
    let output = input.substr(loc.start, loc.end - loc.start);
    return output;
  }
};
