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
  //console.log(indentString(this.indent) + "if");
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
  //console.log(indentString(this.indent) + "if end");
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
  //console.log(indentString(this.indent) + "else");
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
  //console.log(indentString(this.indent) + "else end");
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
  //console.log(indentString(this.indent) + "loop", hash);
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
  //console.log(indentString(this.indent) + "loop end", hash);
  // FRAME
  this.popFrame();
  // FRAME END
};

// #FLOW
export function DEBUG_BREAK(hash, label, ctx) {
  // API
  let event = this.createEvent(INSTR.BREAK);
  event.hash = hash;
  event.value = true;
  event.label = label;
  event.indent = this.indent;
  event.trigger("fire");
  // API END
  //console.log(indentString(this.indent) + "break", label ? label : "");
  // FRAME
  let expect = this.resolveBreakFrame(this.frame, label);
  this.leaveFrameUntil(expect);
  // FRAME END
  return event.value;
};
export function DEBUG_CONTINUE(hash, label, ctx) {
  // API
  let event = this.createEvent(INSTR.CONTINUE);
  event.hash = hash;
  event.value = true;
  event.label = label;
  event.indent = this.indent;
  event.trigger("fire");
  // API END
  //console.log(indentString(this.indent) + "continue", label ? label : "");
  // FRAME
  let expect = this.resolveBreakFrame(this.frame, label);
  this.leaveFrameUntil(expect);
  // FRAME END
  return event.value;
};

// # SWITCH
export function DEBUG_SWITCH_TEST(hash, value) {
  // API
  let event = this.createEvent(INSTR.SWITCH_TEST);
  event.hash = hash;
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
  //console.log(indentString(this.indent) + "switch");
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
  //console.log(indentString(this.indent) + "switch end");
  // FRAME
  this.popFrame();
  // FRAME END
};

// #CASE
export function DEBUG_CASE_TEST(hash, value) {
  // API
  let event = this.createEvent(INSTR.CASE_TEST);
  event.hash = hash;
  event.value = value;
  event.indent = this.indent;
  event.trigger("test");
  // API END
  return event.value;
};
export function DEBUG_CASE_ENTER(hash, value, isDefault) {
  // API
  let event = this.createEvent(INSTR.CASE_ENTER);
  event.hash = hash;
  event.value = value;
  event.default = isDefault;
  event.indent = this.indent;
  event.trigger("enter");
  // API END
  //console.log(indentString(this.indent) + (isDefault ? "default" : "case"));
  // FRAME
  let frame = this.pushFrame(INSTR.CASE_ENTER, hash);
  frame.values = [hash, value, isDefault];
  this.frame.isSwitchDefault = isDefault;
  // FRAME END
  this.indent += INDENT_FACTOR;
};
export function DEBUG_CASE_LEAVE(hash) {
  this.indent -= INDENT_FACTOR;
  let isDefault = this.resolveCaseFrame(this.frame).isSwitchDefault;
  // API
  let event = this.createEvent(INSTR.CASE_LEAVE);
  event.hash = hash;
  event.isDefault = isDefault;
  event.indent = this.indent;
  event.trigger("leave");
  // API END
  //console.log(indentString(this.indent) + (isDefault ? "default" : "case") + " end");
  // FRAME
  this.popFrame();
  // FRAME END
};

// #CALL
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

  // API
  let before = this.createEvent(INSTR.FUNCTION_CALL);
  before.hash = hash;
  before.context = ctx;
  before.object = object;
  before.callee = call;
  before.name = callee;
  before.arguments = args;
  before.external = isSloppy;
  before.indent = this.indent;
  before.trigger("before");
  // API END

  // FRAME
  let frame = this.pushFrame(INSTR.FUNCTION_CALL, hash);
  frame.values = [hash, ctx, before.object, before.callee, before.arguments];
  this.$$frameHash = Math.abs(hash);
  // FRAME END

  /*if (isSloppy) {
    console.log(indentString(this.indent - INDENT_FACTOR) + "call", callee, "#external", "(", args, ")");
  } else {
    console.log(indentString(this.indent - INDENT_FACTOR) + "call", callee, "(", args, ")");
  }*/

  this.indent += INDENT_FACTOR; 

  // intercept function.toString calls
  // to remain code reification feature
  let fn = null;
  if (
    ORIGINAL_FUNCTION_TOSTRING &&
    before.object instanceof Function &&
    before.callee === "toString" &&
    // native toString
    before.object[before.callee] === Function.toString &&
    // function is known and patched
    (fn = this.getFunctionNodeByName(before.object.name)) !== null
  ) {
    // extract original code
    let code = this.input.substr(fn.start, fn.end - fn.start);
    value = code;
  // intercept require
  // untested but could work in theory
  } else if (
    (Iroh.isNode) &&
    (before.object === require ||
      before.object[before.callee] === require)
  ) {
    let path = require.resolve(before.arguments[0]);
    console.log(`Intercepting require for ${path}`);
    let code = require("fs").readFileSync(path, "utf-8");
    let script = this.patch(code);
    value = script;
  } else {
    // evaluate function bully protected
    try {
      value = root.apply(proto, before.arguments);
    } catch (e) {
      //console.error(e);
      // function knocked out :(
    }
  }

  this.indent -= INDENT_FACTOR;

  // API
  let after = this.createEvent(INSTR.FUNCTION_CALL_END);
  after.hash = hash;
  after.context = before.context;
  after.object = before.object;
  after.callee = before.callee;
  after.name = callee;
  after.arguments = before.arguments;
  after.return = value;
  after.external = isSloppy;
  after.indent = this.indent;
  after.trigger("after");
  // API END

  /*if (isSloppy) {
    console.log(indentString(this.indent) + "call", after.callee, "end #external", "->", [after.return]);
  } else {
    console.log(indentString(this.indent) + "call", after.callee, "end", "->", [after.return]);
  }*/

  // FRAME
  this.popFrame();
  this.$$frameHash = previous;
  // FRAME END

  return after.return;
};

// #FUNCTION
export function DEBUG_FUNCTION_ENTER(hash, ctx, scope, args) {
  this.previousScope = this.currentScope;
  this.currentScope = scope;
  // function sloppy since called with invalid call hash
  let isSloppy = (
    (this.$$frameHash <= 0) ||
    this.nodes[this.$$frameHash].node.isSloppy
  );

  // API
  let event = this.createEvent(INSTR.FUNCTION_ENTER);
  event.hash = hash;
  event.indent = this.indent;
  event.scope = scope;
  event.sloppy = isSloppy;
  event.arguments = args;
  event.name = this.nodes[hash].node.id.name;
  event.trigger("enter");
  // API END

  if (isSloppy) {
    //console.log(indentString(this.indent) + "call", name, "#sloppy", "(", args, ")");
    this.indent += INDENT_FACTOR;
  }
};
export function DEBUG_FUNCTION_LEAVE(hash, ctx) {
  this.currentScope = this.previousScope;
  let isSloppy = (this.$$frameHash <= 0) || this.nodes[this.$$frameHash].node.isSloppy;

  // API
  let event = this.createEvent(INSTR.FUNCTION_LEAVE);
  event.hash = hash;
  event.indent = this.indent - (isSloppy ? INDENT_FACTOR : 0);
  event.sloppy = isSloppy;
  event.name = this.nodes[hash].node.id.name;
  event.trigger("leave");
  // API END

  if (isSloppy) {
    this.indent -= INDENT_FACTOR;
    //console.log(indentString(this.indent) + "call", name, "end #sloppy", "->", [void 0]);
  }
};
export function DEBUG_FUNCTION_RETURN(hash, name, value) {
  // FRAME
  let expect = this.resolveReturnFrame(this.frame);
  this.leaveFrameUntil(expect);
  // FRAME END
  this.currentScope = this.previousScope;
  let isSloppy = (this.$$frameHash <= 0) || this.nodes[this.$$frameHash].node.isSloppy;

  // API
  let event = this.createEvent(INSTR.FUNCTION_RETURN);
  event.hash = hash;
  event.name = name;
  event.return = value;
  event.indent = this.indent - (isSloppy ? INDENT_FACTOR : 0);
  event.sloppy = isSloppy;
  event.trigger("return");
  // API END

  if (isSloppy) {
    this.indent -= INDENT_FACTOR;
    //console.log(indentString(this.indent) + "call", name, "end #sloppy", "->", [value]);
  }
  return event.return;
};

// # DECLS
export function DEBUG_VAR_DECLARE(hash, name) {
  //console.log(indentString(this.indent) + "▶️ Declare " + name);

  // API
  let event = this.createEvent(INSTR.VAR_DECLARE);
  event.hash = hash;
  event.name = name;
  event.indent = this.indent;
  event.trigger("before");
  // API END

  return name;
};
export function DEBUG_VAR_INIT(hash, name, value) {
  //console.log(indentString(this.indent) + "⏩ Initialise " + name + "::" + value);

  // API
  let event = this.createEvent(INSTR.VAR_INIT);
  event.hash = hash;
  event.name = name;
  event.value = value;
  event.indent = this.indent;
  event.trigger("after");
  // API END

  return event.value;
};

// #NEW
export function DEBUG_OP_NEW(hash, ctor, args) {

  // API
  let event = this.createEvent(INSTR.OP_NEW);
  event.hash = hash;
  event.ctor = ctor;
  event.name = ctor.name || ctor.constructor.name;
  event.arguments = args;
  event.indent = this.indent;
  event.trigger("before");
  // API END

  //console.log(indentString(this.indent) + "new " + ctor.name);

  this.indent += INDENT_FACTOR;

  // FRAME
  let frame = this.pushFrame(INSTR.OP_NEW, hash);
  frame.values = [hash, event.ctor, event.arguments];
  // FRAME END

  return new event.ctor(...event.arguments);
};
export function DEBUG_OP_NEW_END(hash, self, ret) {
  self.indent -= INDENT_FACTOR;

  // FRAME
  self.popFrame();
  // FRAME END

  // API
  let event = self.createEvent(INSTR.OP_NEW_END);
  event.hash = hash;
  event.return = ret;
  event.indent = self.indent;
  event.trigger("after");
  // API END

  //console.log(indentString(self.indent) + "new end");

  return event.return;
};

// #SUPER
export function DEBUG_SUPER(cls, args) {
  // API TODO
  return args;
};
// method enter not available before super
// super_fix is injected after super
export function DEBUG_SUPER_FIX(ctx) {
  // API TODO
};

// # CLASS METHOD
export function DEBUG_METHOD_ENTER(hash, cls, isConstructor, args) {
  // API TODO
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
  // API TODO
  this.indent -= INDENT_FACTOR;
  console.log(indentString(this.indent) + (isConstructor ? "ctor" : "method") + " end");
  this.popFrame();
};

// #TRY
export function DEBUG_TRY_ENTER(hash) {
  console.log(indentString(this.indent) + "try");

  // API
  let event = this.createEvent(INSTR.TRY_ENTER);
  event.hash = hash;
  event.indent = this.indent;
  event.trigger("enter");
  // API END

  this.indent += INDENT_FACTOR;
  // FRAME
  let frame = this.pushFrame(INSTR.TRY_ENTER, hash);
  frame.values = [hash];
  // FRAME END
};
export function DEBUG_TRY_LEAVE(hash) {
  this.indent -= INDENT_FACTOR;

  // API
  let event = this.createEvent(INSTR.TRY_LEAVE);
  event.hash = hash;
  event.indent = this.indent;
  event.trigger("leave");
  // API END

  // FRAME
  // fix up missing left frames until try_leave
  // e.g. a call inside try, but never finished because it failed
  if (this.frame.type !== INSTR.TRY_ENTER) {
    let expect = this.resolveTryFrame(this.frame);
    this.leaveFrameUntil(expect);
  }
  this.popFrame();
  // FRAME END

  //console.log(indentString(this.indent) + "try end");
};

// #ALLOC
export function DEBUG_ALLOC(hash, value) {
  //console.log(indentString(this.indent) + "#Allocated", value);

  // API
  let event = this.createEvent(INSTR.ALLOC);
  event.hash = hash;
  event.value = value;
  event.indent = this.indent;
  event.trigger("fire");
  // API END

  return event.value;
};

// #MEMBER
export function DEBUG_MEMBER_EXPR(hash, object, property) {
  //console.log(indentString(this.indent), object, "[" + property + "]");

  // API
  let event = this.createEvent(INSTR.MEMBER_EXPR);
  event.hash = hash;
  event.object = object;
  event.property = property;
  event.indent = this.indent;
  event.trigger("fire");
  // API END

  return event.object;
};

// fix for lazy blocks
export function DEBUG_BLOCK_ENTER(hash) {
  let frame = this.pushFrame(INSTR.BLOCK_ENTER, hash);
  frame.values = [hash];
};
export function DEBUG_BLOCK_LEAVE(hash) {
  this.popFrame();
};

// #THIS
export function DEBUG_THIS(hash, ctx) {
  // API
  let event = this.createEvent(INSTR.THIS);
  event.hash = hash;
  event.context = ctx;
  event.indent = this.indent;
  event.trigger("fire");
  // API END
  return event.context;
};

// #EXPRESSIONS
export function DEBUG_ASSIGN(hash, op, obj, prop, value) {
  let result = null;
  // API: add before, after
  if (prop === null) {
    if (op === OP["="]) result = value;
    else result = value;
  } else {
    result = evalObjectAssignmentExpression(op, obj, prop, value);
  }
  // API
  let event = this.createEvent(INSTR.ASSIGN);
  event.op = operatorToString(op) + "=";
  event.hash = hash;
  event.object = obj;
  event.property = prop;
  event.value = value;
  event.result = result;
  event.indent = this.indent;
  event.trigger("fire");
  // API END
  return event.result;
};

export function DEBUG_TERNARY(hash, test, truthy, falsy) {
  let result = null;
  // API: add before, after
  if (test) result = truthy();
  else result = falsy();
  // API
  let event = this.createEvent(INSTR.TERNARY);
  event.hash = hash;
  event.test = test;
  event.falsy = falsy;
  event.truthy = truthy;
  event.result = result;
  event.indent = this.indent;
  event.trigger("fire");
  // API END
  return event.result;
};

export function DEBUG_LOGICAL(hash, op, a, b) {
  let result = null;
  // API: add before, after
  switch (op) {
    case OP["&&"]:
      result = a ? b() : a;
    break;
    case OP["||"]:
      result = a ? a : b();
    break;
  };
  // API
  let event = this.createEvent(INSTR.LOGICAL);
  event.op = operatorToString(op);
  event.hash = hash;
  event.left = a;
  event.right = b;
  event.result = result;
  event.indent = this.indent;
  event.trigger("fire");
  // API END
  return event.result;
};

export function DEBUG_BINARY(hash, op, a, b) {
  let result = evalBinaryExpression(op, a, b);
  // API
  let event = this.createEvent(INSTR.BINARY);
  event.op = operatorToString(op);
  event.hash = hash;
  event.left = a;
  event.right = b;
  event.result = result;
  event.indent = this.indent;
  event.trigger("fire");
  // API END
  return event.result;
};

export function DEBUG_UNARY(hash, op, ctx, critical, value) {
  let result = null;
  // typeof argument is not defined
  if (op === OP["typeof"] && critical) {
    result = value;
  } else {
    result = evalUnaryExpression(op, ctx, value);
  }
  // API
  let event = this.createEvent(INSTR.UNARY);
  event.op = operatorToString(op);
  event.hash = hash;
  event.value = value;
  event.result = result;
  event.indent = this.indent;
  event.trigger("fire");
  // API END
  //console.log(indentString(this.indent) + operatorToString(op), value, "->", result, critical);
  return event.result;
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
  //console.log(indentString(this.indent) + "Program");
  // API
  let event = this.createEvent(INSTR.PROGRAM_ENTER);
  event.indent = this.indent;
  event.trigger("enter");
  // API END
  this.indent += INDENT_FACTOR;
};
export function DEBUG_PROGRAM_LEAVE(ret) {
  this.indent -= INDENT_FACTOR;
  //console.log(indentString(this.indent) + "Program end ->", ret);
  // API
  let event = this.createEvent(INSTR.PROGRAM_LEAVE);
  event.indent = this.indent;
  event.return = ret;
  event.trigger("leave");
  // API END
  return event.return;
};
export function DEBUG_PROGRAM_FRAME_VALUE(value) {
  //console.log(value);
};
