import { uid } from "./utils";

import {
  isFunctionNode,
  isLoopStatement
} from "./helpers";

export default class Scope {
  constructor(node) {
    this.uid = uid();
    this.isLoop = false;
    this.isReturnable = false;
    if (isFunctionNode(node.type)) {
      this.isReturnable = true;
    }
    else if (isLoopStatement(node.type)) {
      this.isLoop = true;
    }
    this.node = node;
    this.parent = null;
  }
  getReturnContext() {
    let ctx = this;
    while (true) {
      if (ctx.isReturnable) break;
      ctx = ctx.parent;
    };
    return ctx;
  }
  getLoopContext() {
    let ctx = this;
    while (true) {
      if (ctx.isLoop) break;
      ctx = ctx.parent;
    };
    return ctx;
  }
};
