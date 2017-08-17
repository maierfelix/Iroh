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
    if (this.hash === -1 || !this.instance.nodes[this.hash]) {
      console.error(this, this.hash, this.instance.nodes[this.hash]);
    }
    return this.instance.nodes[this.hash].node;
  }
  getLocation() {
    let node = this.getASTNode();
    return node.loc;
  }
  getSource() {
    let node = this.getASTNode();
    let source = generate(node);
    return "";
  }
};
