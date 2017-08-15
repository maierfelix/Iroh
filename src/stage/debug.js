import {
  INDENT_FACTOR,
  ORIGINAL_FUNCTION_TOSTRING
} from "../cfg";

import { OP, INSTR } from "../labels";

import {
  getCallee,
  indentString,
  operatorToString,
  processArguments,
  getInheritanceTree
} from "../helpers";

import {
  evalUnaryExpression,
  evalBinaryExpression,
  evalObjectAssignmentExpression
} from "../eval";

// #IF
export function DEBUG_IF_TEST(hash, value) {
  // API
  let event = this.createEvent(INSTR.IF_TEST);
  event.hash = hash;
  event.value = value;
  event.indent = this.indent;
  event.trigger("test");
  // API END
  return event.value;
};
export function DEBUG_IF_ENTER(hash, value) {
  console.log(indentString(this.indent) + "if");
  // FRAME
  let frame = this.pushFrame(INSTR.IF_ENTER, hash);
  frame.values = [hash, value];
  // FRAME END
  // API
  let event = this.createEvent(INSTR.IF_ENTER);
  event.hash = hash;
  event.value = value;
  event.indent = this.indent;
  event.trigger("enter");
  // API END
  this.indent += INDENT_FACTOR;
};
export function DEBUG_IF_LEAVE(hash) {
  this.indent -= INDENT_FACTOR;
  // API
  let event = this.createEvent(INSTR.IF_LEAVE);
  event.hash = hash;
  event.indent = this.indent;
  event.trigger("leave");
  // API END
  console.log(indentString(this.indent) + "if end");
  // FRAME
  this.popFrame();
  // FRAME END
};

// #ELSE
export function DEBUG_ELSE_ENTER(hash) {
  // API
  let event = this.createEvent(INSTR.ELSE_ENTER);
  event.hash = hash;
  event.indent = this.indent;
  event.trigger("enter");
  // API END
  console.log(indentString(this.indent) + "else");
  // FRAME
  let frame = this.pushFrame(INSTR.ELSE_ENTER, hash);
  frame.values = [hash];
  // FRAME END
  this.indent += INDENT_FACTOR;
};
export function DEBUG_ELSE_LEAVE(hash) {
  this.indent -= INDENT_FACTOR;
  // API
  let event = this.createEvent(INSTR.ELSE_LEAVE);
  event.hash = hash;
  event.indent = this.indent;
  event.trigger("leave");
  // API END
  console.log(indentString(this.indent) + "else end");
  // FRAME
  this.popFrame();
  // FRAME END
};

// #LOOPS
export function DEBUG_LOOP_TEST(hash, value) {
  // API
  let event = this.createEvent(INSTR.LOOP_TEST);
  event.hash = hash;
  event.value = value;
  event.indent = this.indent;
  event.trigger("test");
  // API END
  return event.value;
};
export function DEBUG_LOOP_ENTER(hash) {
  // API
  let event = this.createEvent(INSTR.LOOP_ENTER);
  event.hash = hash;
  event.indent = this.indent;
  event.trigger("enter");
  // API END
  console.log(indentString(this.indent) + "loop", hash);
  // FRAME
  let frame = this.pushFrame(INSTR.LOOP_ENTER, hash);
  frame.values = [hash, 1];
  // FRAME END
  this.indent += INDENT_FACTOR;
};
export function DEBUG_LOOP_LEAVE(hash, entered) {
  // loop never entered, so dont leave it
  if (entered === 0) return;
  this.indent -= INDENT_FACTOR;
  // API
  let event = this.createEvent(INSTR.LOOP_LEAVE);
  event.hash = hash;
  event.indent = this.indent;
  event.trigger("leave");
  // API END
  console.log(indentString(this.indent) + "loop end", hash);
  // FRAME
  this.popFrame();
  // FRAME END
};

// #FLOW
export function DEBUG_BREAK(label, ctx) {
  // API
  let event = this.createEvent(INSTR.BREAK);
  event.value = true;
  event.indent = this.indent;
  event.trigger("fire");
  // API END
  console.log(indentString(this.indent) + "break", label ? label : "");
  // FRAME
  let expect = this.resolveBreakFrame(this.frame, label);
  this.leaveFrameUntil(expect);
  // FRAME END
  return event.value;
};
export function DEBUG_CONTINUE(label, ctx) {
  // API
  let event = this.createEvent(INSTR.CONTINUE);
  event.value = true;
  event.indent = this.indent;
  event.trigger("fire");
  // API END
  console.log(indentString(this.indent) + "continue", label ? label : "");
  // FRAME
  let expect = this.resolveBreakFrame(this.frame, label);
  this.leaveFrameUntil(expect);
  // FRAME END
  return event.value;
};

// # SWITCH
export function DEBUG_SWITCH_TEST(value) {
  // API
  let event = this.createEvent(INSTR.SWITCH_TEST);
  event.value = value;
  event.indent = this.indent;
  event.trigger("test");
  // API END
  return event.value;
};
export function DEBUG_SWITCH_ENTER(hash) {
  // API
  let event = this.createEvent(INSTR.SWITCH_ENTER);
  event.hash = hash;
  event.indent = this.indent;
  event.trigger("enter");
  // API END
  console.log(indentString(this.indent) + "switch");
  // FRAME
  let frame = this.pushFrame(INSTR.SWITCH_ENTER, hash);
  frame.values = [hash];
  // FRAME END
  this.indent += INDENT_FACTOR;
};
export function DEBUG_SWITCH_LEAVE(hash) {
  this.indent -= INDENT_FACTOR;
  // API
  let event = this.createEvent(INSTR.SWITCH_LEAVE);
  event.hash = hash;
  event.indent = this.indent;
  event.trigger("leave");
  // API END
  console.log(indentString(this.indent) + "switch end");
  // FRAME
  this.popFrame();
  // FRAME END
};

// #CASE
export function DEBUG_CASE_TEST(value) {
  return value;
};
export function DEBUG_CASE_ENTER(hash, dflt) {
  let isDefault = dflt === null;
  console.log(indentString(this.indent) + (isDefault ? "default" : "case"));
  this.indent += INDENT_FACTOR;
  let frame = this.pushFrame(INSTR.CASE_ENTER, hash);
  frame.values = [hash, dflt];
  this.frame.isSwitchDefault = isDefault;
};
export function DEBUG_CASE_LEAVE() {
  let isDefault = this.resolveCaseFrame(this.frame).isSwitchDefault;
  this.indent -= INDENT_FACTOR;
  console.log(indentString(this.indent) + (isDefault ? "default" : "case") + " end");
  this.popFrame();
};

// #FUNCTIONS
export function DEBUG_FUNCTION_CALL(hash, ctx, object, call, args) {
  let ctor = object.constructor.prototype;
  let callee = getCallee(object, call);
  let previous = this.$$frameHash;
  let value = null;
  let root = null;
  let name = null;
  let proto = null;

  // create function
  if (call !== null) {
    root = object[call];
    proto = object;
  } else {
    root = object;
    proto = ctx;
  };
  name = root.name;

  let node = this.nodes[hash].node;
  // external functions are traced as sloppy
  let isSloppy = this.symbols[name] === void 0;

  node.isSloppy = isSloppy;

  this.indent += INDENT_FACTOR;
  let frame = this.pushFrame(INSTR.FUNCTION_CALL, hash);
  frame.values = [hash, ctx, object, call, args];

  if (isSloppy) {
    console.log(indentString(this.indent - INDENT_FACTOR) + "call", callee, "#external", "(", args, ")");
  } else {
    console.log(indentString(this.indent - INDENT_FACTOR) + "call", callee, "(", args, ")");
  }

  this.$$frameHash = Math.abs(hash);
  // intercept function.toString calls
  // to remain code reification feature
  let fn = null;
  if (
    ORIGINAL_FUNCTION_TOSTRING &&
    object instanceof Function &&
    call === "toString" &&
    // native toString
    object[call] === Function.toString &&
    // function is known and patched
    (fn = this.getFunctionNodeByName(object.name)) !== null
  ) {
    // extract original code
    let code = this.input.substr(fn.start, fn.end - fn.start);
    value = code;
  // intercept require
  // untested but could work in theory
  } else if (
    (Iroh.isNode) &&
    (object === require ||
    object[call] === require)
  ) {
    let path = require.resolve(args[0]);
    console.log(`Intercepting require for ${path}`);
    let code = require("fs").readFileSync(path, "utf-8");
    let script = this.patch(code);
    value = script;
  } else {
    // evaluate function bully protected
    try {
      value = root.apply(proto, args);
    } catch (e) {
      console.error(e);
      // function knocked out :(
    }
  }

  this.indent -= INDENT_FACTOR;
  if (isSloppy) {
    console.log(indentString(this.indent) + "call", callee, "end #external", "->", [value]);
  } else {
    console.log(indentString(this.indent) + "call", callee, "end", "->", [value]);
  }
  this.popFrame();

  this.$$frameHash = previous;

  return value;
};
export function DEBUG_FUNCTION_ENTER(hash, ctx, scope, argz) {
  this.previousScope = this.currentScope;
  this.currentScope = scope;
  // function sloppy since called with invalid call hash
  let isSloppy = (
    (this.$$frameHash <= 0) ||
    this.nodes[this.$$frameHash].node.isSloppy
  );
  if (isSloppy) {
    let name = this.nodes[hash].node.id.name;
    let args = processArguments(argz);
    console.log(indentString(this.indent) + "call", name, "#sloppy", "(", args, ")");
    this.indent += INDENT_FACTOR;
  }
};
export function DEBUG_FUNCTION_LEAVE(hash, ctx) {
  this.currentScope = this.previousScope;
  let isSloppy = (this.$$frameHash <= 0) || this.nodes[this.$$frameHash].node.isSloppy;
  if (isSloppy) {
    let name = this.nodes[hash].node.id.name;
    this.indent -= INDENT_FACTOR;
    console.log(indentString(this.indent) + "call", name, "end #sloppy", "->", [void 0]);
  }
};
export function DEBUG_FUNCTION_RETURN(name, value) {
  let expect = this.resolveReturnFrame(this.frame);
  this.leaveFrameUntil(expect);
  this.currentScope = this.previousScope;
  let isSloppy = (this.$$frameHash <= 0) || this.nodes[this.$$frameHash].node.isSloppy;
  if (isSloppy) {
    this.indent -= INDENT_FACTOR;
    console.log(indentString(this.indent) + "call", name, "end #sloppy", "->", [value]);
  }
  return value;
};

// # DECLS
export function DEBUG_VAR_DECLARE(name) {
  //console.log(indentString(this.indent) + "▶️ Declare " + name);
  return name;
};
export function DEBUG_VAR_INIT(name, value) {
  //console.log(indentString(this.indent) + "⏩ Initialise " + name + "::" + value);

  return value;
};

export function DEBUG_OP_NEW(hash, ctor, args) {
  let isClass = ctor.toString().substr(0, 5) === "class";
  let name = ctor.constructor.name;
  let methods = Object.getPrototypeOf(ctor);
  let properties = Object.getOwnPropertyNames(ctor);
  console.log(indentString(this.indent) + "new " + ctor.name);
  this.indent += INDENT_FACTOR;
  let frame = this.pushFrame(INSTR.OP_NEW, hash);
  frame.values = [hash, ctor, args];

  return new ctor(...args);
};
export function DEBUG_OP_NEW_END(hash, self, ret) {
  self.indent -= INDENT_FACTOR;
  self.popFrame();
  console.log(indentString(self.indent) + "new end");

  return ret;
};

export function DEBUG_SUPER(cls, args) {
  return args;
};
// method enter not available before super
// super_fix is injected after super
export function DEBUG_SUPER_FIX(ctx) {

};

export function DEBUG_METHOD_ENTER(hash, cls, isConstructor, args) {
  if (isConstructor) {
    let tree = getInheritanceTree(cls);
    console.log(indentString(this.indent) + "ctor", tree.join("->"));
  } else {
    console.log(indentString(this.indent) + "method");
  }
  this.indent += INDENT_FACTOR;
  let frame = this.pushFrame(INSTR.METHOD_ENTER, hash);
  frame.values = [hash, cls, isConstructor, args];
};
export function DEBUG_METHOD_LEAVE(hash, cls, isConstructor) {
  this.indent -= INDENT_FACTOR;
  console.log(indentString(this.indent) + (isConstructor ? "ctor" : "method") + " end");
  this.popFrame();
};

export function DEBUG_TRY_ENTER(hash) {
  console.log(indentString(this.indent) + "try");
  this.indent += INDENT_FACTOR;
  let frame = this.pushFrame(INSTR.TRY_ENTER, hash);
  frame.values = [hash];
};
export function DEBUG_TRY_LEAVE(hash) {
  this.indent -= INDENT_FACTOR;
  // fix up missing left frames until try_leave
  // e.g. a call inside try, but never finished because it failed
  if (this.frame.type !== INSTR.TRY_ENTER) {
    let expect = this.resolveTryFrame(this.frame);
    this.leaveFrameUntil(expect);
  }
  console.log(indentString(this.indent) + "try end");
  this.popFrame();
};

export function DEBUG_ALLOC(value) {
  //console.log(indentString(this.indent) + "#Allocated", array);

  return value;
};

export function DEBUG_MEMBER_EXPR(object, property) {
  //console.log(indentString(this.indent), object, "[" + property + "]", "->", value);
  return object;
};

// fix for lazy blocks
export function DEBUG_BLOCK_ENTER(hash) {
  let frame = this.pushFrame(INSTR.BLOCK_ENTER, hash);
  frame.values = [hash];
};
export function DEBUG_BLOCK_LEAVE(hash) {
  this.popFrame();
};

export function DEBUG_THIS(ctx) {
  return ctx;
};

export function DEBUG_ASSIGN(op, obj, prop, value) {
  let result = null;
  if (prop === null) {
    if (op === OP["="]) result = value;
    else result = value;
  } else {
    result = evalObjectAssignmentExpression(op, obj, prop, value);
  }
  return result;
};

export function DEBUG_TERNARY(test, truthy, falsy) {
  let result = null;
  if (test) result = truthy();
  else result = falsy();

  return result;
};

export function DEBUG_LOGICAL(op, a, b) {
  let result = null;
  switch (op) {
    case OP["&&"]:
      result = a ? b() : a;
    break;
    case OP["||"]:
      result = a ? a : b();
    break;
  };

  return result;
};

export function DEBUG_BINARY(op, a, b) {
  let result = evalBinaryExpression(op, a, b);

  return result;
};

export function DEBUG_UNARY(op, ctx, critical, value) {
  let result = null;
  // typeof argument is not defined
  if (op === OP["typeof"] && critical) {
    result = value;
  } else {
    result = evalUnaryExpression(op, ctx, value);
  }
  console.log(indentString(this.indent) + operatorToString(op), value, "->", result, critical);
  return result;
};

// deprecated
/*
export function DEBUG_LITERAL = function(value) {
  console.log("Literal:", value);
  return value;
};
export function DEBUG_IDENTIFIER = function(id, value) {
  console.log("Identifier:", id, value);
  return value;
};*/

export function DEBUG_PROGRAM_ENTER() {
  console.log(indentString(this.indent) + "Program");
  this.indent += INDENT_FACTOR;
};
export function DEBUG_PROGRAM_LEAVE(ret) {
  this.indent -= INDENT_FACTOR;
  console.log(indentString(this.indent) + "Program end ->", ret);
  console.log(this.frame.type, this.frame.cleanType, this.frame.hash);
  return ret;
};
export function DEBUG_PROGRAM_FRAME_VALUE(value) {
  //console.log(value);
};
