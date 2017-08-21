import { INSTR } from "../labels";

import {
  generate,
  getCategoryFromInstruction
} from "../helpers";

import { parse } from "acorn";

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
    let node = this.instance.nodes[this.hash].node;
    return node;
  }
  getPosition() {
    let node = this.getASTNode();
    return {
      end: node.end,
      start: node.start
    };
  }
  getLocation() {
    let node = this.getASTNode();
    return node.loc;
  }
  getSource() {
    let loc = this.getPosition();
    let input = this.instance.input;
    let output = input.substr(loc.start, loc.end - loc.start);
    return output;
  }
};
