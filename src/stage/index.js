import extend from "../extend";

import { INSTR } from "../labels";
import {
  DEBUG_KEY,
  CLEAN_DEBUG_INJECTION
} from "../cfg";

import { uid } from "../utils";
import {
  parse,
  generate,
  isReturnableFrameType,
  isValidFrameInstruction,
  isInstantiationFrameType
} from "../helpers";

import Frame from "../frame";
import Patcher from "../patcher/index";

import * as _debug from "./debug";

export default class Stage {
  constructor(input) {
    // validate
    if (typeof input !== "string") {
      throw new Error(`Expected input type string, but got ${typeof input}`);
    }
    this.input = input;
    // unique session key
    this.key = `$$STx${uid()}`;
    this.links = {};
    this.nodes = null;
    this.symbols = null;
    this.indent = 0;
    this.frame = null;
    this.$$frameHash = 0;
    this.currentScope = null;
    this.previousScope = null;
    this.generateLinks();
    this.script = this.patch(input);
  }
};

extend(Stage, _debug);

Stage.prototype.addListener = function() {
  return {
    on: function() { }
  };
};

Stage.prototype.generateLinks = function() {
  let ihdx = 0;
  for (let callee in INSTR) {
    if (!INSTR.hasOwnProperty(callee)) continue;
    let name = "$DEBUG_" + callee;
    let key = DEBUG_KEY + ihdx++;
    this.links[name] = {
      // link function, escape dollar sign
      fn: this[name.substr(1, name.length)],
      key
    };
    if (CLEAN_DEBUG_INJECTION) {
      this[name] = this.links[name].fn;
    } else {
      this[key] = this.links[name].fn;
    }
  };
};

Stage.prototype.getLink = function(name) {
  if (CLEAN_DEBUG_INJECTION) name = "$" + name;
  let key = this.links[name].key;
  if (CLEAN_DEBUG_INJECTION) return `${this.key}.${name}`;
  return `${this.key}.${key}`;
};

Stage.prototype.getLinkCall = function(name) {
  return this.getLink(name) + "()";
};

Stage.prototype.getFunctionNodeByName = function(name) {
  return (
    this.symbols[name] || null
  );
};

Stage.prototype.getInverseInstruction = function(frame) {
  let type = frame.type;
  switch (type) {
    case INSTR.FUNCTION_ENTER: return this.$DEBUG_FUNCTION_LEAVE;
    case INSTR.IF_ENTER:       return this.$DEBUG_IF_LEAVE;
    case INSTR.ELSE_ENTER:     return this.$DEBUG_ELSE_LEAVE;
    case INSTR.LOOP_ENTER:     return this.$DEBUG_LOOP_LEAVE;
    case INSTR.SWITCH_ENTER:   return this.$DEBUG_SWITCH_LEAVE;
    case INSTR.CASE_ENTER:     return this.$DEBUG_CASE_LEAVE;
    case INSTR.METHOD_ENTER:   return this.$DEBUG_METHOD_LEAVE;
    case INSTR.OP_NEW:         return this.$DEBUG_OP_NEW_END;
    case INSTR.TRY_ENTER:      return this.$DEBUG_TRY_LEAVE;
    case INSTR.BLOCK_ENTER:    return this.$DEBUG_BLOCK_LEAVE;
    default:
      throw new Error(`Unexpected frame type ${frame.cleanType}`);
    break;
  };
  return null;
};

Stage.prototype.manuallyLeaveFrame = function(frame) {
  console.assert(isValidFrameInstruction(frame));
  let args = frame.values;
  //console.log("Manually leaving", frame.cleanType);
  let inverse = this.getInverseInstruction(frame);
  inverse.apply(this, args);
};

Stage.prototype.leaveFrameUntil = function(target) {
  while (true) {
    if (this.frame.equals(target)) break;
    this.manuallyLeaveFrame(this.frame);
  };
};

Stage.prototype.leaveFrameUntilHash = function(hash) {
  while (true) {
    if (this.frame.hash === hash) break;
    this.manuallyLeaveFrame(this.frame);
  };
};

Stage.prototype.pushFrame = function(type, hash) {
  let parent = this.frame;
  let frame = new Frame(type, hash);
  frame.parent = parent;
  frame.node = this.nodes[hash].node;
  frame.location = frame.node.loc;
  this.frame = frame;
  return frame;
};

Stage.prototype.popFrame = function() {
  // out of bounds check
  console.assert(this.frame !== null);
  this.frame = this.frame.parent;
};

Stage.prototype.resolveBreakFrame = function(frm, label) {
  let frame = frm;
  while (true) {
    // TODO: isContinuable stable?
    if (frame.isBreakable || frame.isContinuable) {
      if (label !== null) {
        let node = this.nodes[frame.hash].node;
        if (
          node.labels !== void 0 &&
          node.labels.indexOf(label) > -1
        ) break;
      } else {
        break;
      }
    } else if (label !== null) {
      let node = this.nodes[frame.hash].node;
      if (
        node.labels !== void 0 &&
        node.labels.indexOf(label) > -1
      ) break;
    }
    if (frame.isGlobal()) break;
    frame = frame.parent;
  };
  return frame;
};

Stage.prototype.resolveReturnFrame = function(frm) {
  let frame = frm;
  while (true) {
    // break on instantiation calls
    if (frame.isInstantiation) break;
    // break on function call frames
    if (frame.isReturnable) break;
    if (frame.isGlobal()) break;
    frame = frame.parent;
  };
  if (
    !isReturnableFrameType(frame.type) &&
    !isInstantiationFrameType(frame.type)
  ) {
    // only beef if frame hashes doesn't match
    if (frame.hash !== this.$$frameHash) {
      console.error(frame);
    }
  }
  return frame;
};

Stage.prototype.resolveCaseFrame = function(frm) {
  let frame = frm;
  while (true) {
    if (frame.isSwitchCase) break;
    if (frame.isGlobal()) break;
    frame = frame.parent;
  };
  console.assert(
    frame.type === INSTR.CASE_ENTER
  );
  return frame;
};

Stage.prototype.resolveTryFrame = function(frm) {
  let frame = frm;
  while (true) {
    if (frame.isTryStatement) break;
    if (frame.isGlobal()) break;
    frame = frame.parent;
  };
  console.assert(
    frame.type === INSTR.TRY_ENTER
  );
  return frame;
};

Stage.prototype.resolveProgramFrame = function(frm) {
  let frame = frm;
  while (true) {
    if (frame.isGlobal()) break;
    frame = frame.parent;
  };
  console.assert(
    frame.type === INSTR.PROGRAM
  );
  return frame;
};

Stage.prototype.resolveLeftFrames = function(frm) {
  let frame = frm;
  while (true) {
    // break on instantiation calls
    if (frame.isInstantiation) break;
    // break on function call frames
    if (frame.isReturnable) break;
    // frame is super sloppy (possibly async), break out of everything
    if (frame.isGlobal()) break;
    frame = frame.parent;
  };
  return frame;
};

Stage.prototype.getFrameByHashFrom = function(frm, hash) {
  let frame = frm;
  while (true) {
    if (frame.hash === hash) break;
    if (frame.isGlobal()) return null;
    frame = frame.parent;
  };
  return frame;
};

Stage.prototype.patch = function(input) {
  let patcher = new Patcher(this);
  let ast = parse(input, { locations: true });
  this.frame = new Frame(INSTR.PROGRAM, this.$$frameHash);
  patcher.applyPatches(ast);
  // link walk things to stage
  this.nodes = patcher.nodes;
  this.symbols = patcher.symbols;
  return generate(ast, {
    format: {
      indent: {
        style: "  "
      }
    }
  });
};
