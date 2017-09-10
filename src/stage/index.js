import extend from "../extend";

import { INSTR, CATEGORY } from "../labels";
import {
  DEBUG_KEY,
  CLEAN_DEBUG_INJECTION
} from "../cfg";

import { uid } from "../utils";
import {
  parse,
  generate,
  isBreakableFrameType,
  isReturnableFrameType,
  isValidFrameInstruction,
  isInstantiationFrameType,
  getCategoryFromInstruction
} from "../helpers";

import Frame from "../frame";
import Patcher from "../patcher/index";

import RuntimeEvent from "./event";
import RuntimeListener from "./listener";

import * as _debug from "./debug";

export default class Stage {
  constructor(input, opt = {}) {
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
    this.options = {};
    this.indent = 0;
    this.frame = null;
    this.$$frameHash = 0;
    this.currentScope = null;
    this.previousScope = null;
    this.listeners = {};
    this.generateLinks();
    this.generateListeners();
    this.script = this.patch(input);
  }
};

extend(Stage, _debug);

Stage.prototype.reset = function() {
  this.indent = 0;
};

Stage.prototype.triggerListeners = function(event, trigger) {
  let type = event.type;
  let category = event.category;
  // invalid listener
  if (!this.listeners.hasOwnProperty(category)) {
    console.error(`Unexpected trigger category ${category}`);
    return;
  };
  let listeners = this.listeners[category];
  // no listeners are attached
  if (listeners.length <= 0) return;
  for (let ii = 0; ii < listeners.length; ++ii) {
    let listener = listeners[ii];
    listener.trigger(event, trigger);
  };
};

Stage.prototype.createEvent = function(type) {
  let event = new RuntimeEvent(type, this);
  return event;
};

Stage.prototype.addListener = function(category) {
  // validate
  if (!this.listeners.hasOwnProperty(category)) {
    console.error(`Unexpected listener category`);
    return null;
  }
  let listener = new RuntimeListener(category);
  this.listeners[category].push(listener);
  return listener;
};

Stage.prototype.generateListeners = function() {
  for (let key in CATEGORY) {
    let bit = CATEGORY[key];
    this.listeners[bit] = [];
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
  name = "$" + name;
  if (CLEAN_DEBUG_INJECTION) {
    return `${this.key}.${name}`;
  }
  let key = this.links[name].key;
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
  let links = this.links;
  switch (type) {
    case INSTR.FUNCTION_ENTER: return links.$DEBUG_FUNCTION_LEAVE.fn;
    case INSTR.IF_ENTER:       return links.$DEBUG_IF_LEAVE.fn;
    case INSTR.ELSE_ENTER:     return links.$DEBUG_ELSE_LEAVE.fn;
    case INSTR.LOOP_ENTER:     return links.$DEBUG_LOOP_LEAVE.fn;
    case INSTR.SWITCH_ENTER:   return links.$DEBUG_SWITCH_LEAVE.fn;
    case INSTR.CASE_ENTER:     return links.$DEBUG_CASE_LEAVE.fn;
    case INSTR.METHOD_ENTER:   return links.$DEBUG_METHOD_LEAVE.fn;
    case INSTR.OP_NEW:         return links.$DEBUG_OP_NEW_END.fn;
    case INSTR.TRY_ENTER:      return links.$DEBUG_TRY_LEAVE.fn;
    case INSTR.CATCH_ENTER:    return links.$DEBUG_CATCH_LEAVE.fn;
    case INSTR.FINAL_ENTER:    return links.$DEBUG_FINAL_LEAVE.fn;
    case INSTR.BLOCK_ENTER:    return links.$DEBUG_BLOCK_LEAVE.fn;
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
  console.assert(
    isBreakableFrameType(frame.type)
  );
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

Stage.prototype.resolveTryFrame = function(frm, silent) {
  let frame = frm;
  while (true) {
    if (frame.isTryStatement) break;
    if (frame.isGlobal()) break;
    frame = frame.parent;
  };
  if (silent) return (frame.type === INSTR.TRY_ENTER ? frame : null);
  console.assert(
    frame.type === INSTR.TRY_ENTER
  );
  return frame;
};

Stage.prototype.resolveCatchClauseFrame = function(frm, silent) {
  let frame = frm;
  while (true) {
    if (frame.isCatchClause) break;
    if (frame.isGlobal()) break;
    frame = frame.parent;
  };
  if (silent) return (frame.type === INSTR.CATCH_ENTER ? frame : null);
  console.assert(
    frame.type === INSTR.CATCH_ENTER
  );
  return frame;
};

Stage.prototype.resolveFinalClauseFrame = function(frm, silent) {
  let frame = frm;
  while (true) {
    if (frame.isFinalClause) break;
    if (frame.isGlobal()) break;
    frame = frame.parent;
  };
  if (silent) return (frame.type === INSTR.FINAL_ENTER ? frame : null);
  console.assert(
    frame.type === INSTR.FINAL_ENTER
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
