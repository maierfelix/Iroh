"use strict";

// #IF
Iroh.DEBUG_IF_TEST = function(hash, value) {
  return value;
};
Iroh.DEBUG_IF_ENTER = function(hash, value) {
  console.log(Iroh.indentString(Iroh.indent) + "if");
  let instr = Iroh.frame.pushInstruction(Iroh.INSTR.IF_ENTER);
  instr.values = [value];
  Iroh.indent += Iroh.INDENTFACTOR;
  let frame = Iroh.pushFrame(Iroh.INSTR.IF_ENTER, hash);
  frame.values = [hash, value];
  instr.subFrame = Iroh.frame;
};
Iroh.DEBUG_IF_LEAVE = function(hash) {
  let topFrame = Iroh.frame;
  Iroh.indent -= Iroh.INDENTFACTOR;
  console.log(Iroh.indentString(Iroh.indent) + "if end");
  Iroh.popFrame();
  let instr = Iroh.frame.pushInstruction(Iroh.INSTR.IF_LEAVE);
  instr.subFrame = topFrame;
};

// #ELSE
Iroh.DEBUG_ELSE_ENTER = function(hash) {
  console.log(Iroh.indentString(Iroh.indent) + "else");
  let instr = Iroh.frame.pushInstruction(Iroh.INSTR.ELSE_ENTER);
  Iroh.indent += Iroh.INDENTFACTOR;
  let frame = Iroh.pushFrame(Iroh.INSTR.ELSE_ENTER, hash);
  frame.values = [hash];
  instr.subFrame = Iroh.frame;
};
Iroh.DEBUG_ELSE_LEAVE = function(hash) {
  let topFrame = Iroh.frame;
  Iroh.indent -= Iroh.INDENTFACTOR;
  console.log(Iroh.indentString(Iroh.indent) + "else end");
  Iroh.popFrame();
  let instr = Iroh.frame.pushInstruction(Iroh.INSTR.ELSE_LEAVE);
  instr.subFrame = topFrame;
};

// #LOOPS
Iroh.DEBUG_LOOP_TEST = function(hash, value) {
  return value;
};
Iroh.DEBUG_LOOP_ENTER = function(hash) {
  console.log(Iroh.indentString(Iroh.indent) + "loop", hash);
  let instr = Iroh.frame.pushInstruction(Iroh.INSTR.LOOP_ENTER);
  Iroh.indent += Iroh.INDENTFACTOR;
  let frame = Iroh.pushFrame(Iroh.INSTR.LOOP_ENTER, hash);
  frame.values = [hash, 1];
  instr.subFrame = Iroh.frame;
};
Iroh.DEBUG_LOOP_LEAVE = function(hash, entered) {
  // loop never entered, so dont leave it
  if (entered === 0) return;
  let topFrame = Iroh.frame;
  Iroh.indent -= Iroh.INDENTFACTOR;
  console.log(Iroh.indentString(Iroh.indent) + "loop end", hash);
  Iroh.popFrame();
  let instr = Iroh.frame.pushInstruction(Iroh.INSTR.LOOP_LEAVE);
  instr.subFrame = topFrame;
};

// #FLOW
Iroh.DEBUG_BREAK = function(label, ctx) {
  console.log(Iroh.indentString(Iroh.indent) + "break", label ? label : "");
  Iroh.frame.pushInstruction(Iroh.INSTR.BREAK);
  let expect = Iroh.resolveBreakFrame(Iroh.frame, label);
  Iroh.leaveFrameUntil(expect);
  return true;
};
Iroh.DEBUG_CONTINUE = function(label, ctx) {
  console.log(Iroh.indentString(Iroh.indent) + "continue", label ? label : "");
  Iroh.frame.pushInstruction(Iroh.INSTR.CONTINUE);
  return true;
};

// # SWITCH
Iroh.DEBUG_SWITCH_TEST = function(value) {
  return value;
};
Iroh.DEBUG_SWITCH_ENTER = function(hash) {
  console.log(Iroh.indentString(Iroh.indent) + "switch");
  let instr = Iroh.frame.pushInstruction(Iroh.INSTR.SWITCH_ENTER);
  Iroh.indent += Iroh.INDENTFACTOR;
  let frame = Iroh.pushFrame(Iroh.INSTR.SWITCH_ENTER, hash);
  frame.values = [hash];
  instr.subFrame = Iroh.frame;
};
Iroh.DEBUG_SWITCH_LEAVE = function(hash) {
  let topFrame = Iroh.frame;
  Iroh.indent -= Iroh.INDENTFACTOR;
  console.log(Iroh.indentString(Iroh.indent) + "switch end");
  Iroh.popFrame();
  let instr = Iroh.frame.pushInstruction(Iroh.INSTR.SWITCH_LEAVE);
  instr.subFrame = topFrame;
};

// #CASE
Iroh.DEBUG_CASE_TEST = function(value) {
  return value;
};
Iroh.DEBUG_CASE_ENTER = function(hash, dflt) {
  let isDefault = dflt === null;
  console.log(Iroh.indentString(Iroh.indent) + (isDefault ? "default" : "case"));
  let instr = Iroh.frame.pushInstruction(Iroh.INSTR.CASE_ENTER);
  Iroh.indent += Iroh.INDENTFACTOR;
  let frame = Iroh.pushFrame(Iroh.INSTR.CASE_ENTER, hash);
  frame.values = [hash, dflt];
  Iroh.frame.isSwitchDefault = isDefault;
  instr.subFrame = Iroh.frame;
};
Iroh.DEBUG_CASE_LEAVE = function() {
  let isDefault = Iroh.resolveCaseFrame(Iroh.frame).isSwitchDefault;
  let topFrame = Iroh.frame;
  Iroh.indent -= Iroh.INDENTFACTOR;
  console.log(Iroh.indentString(Iroh.indent) + (isDefault ? "default" : "case") + " end");
  Iroh.popFrame();
  let instr = Iroh.frame.pushInstruction(Iroh.INSTR.CASE_LEAVE);
  instr.subFrame = topFrame;
};

function getCallee(callee, call) {
  if (call === null) {
    return callee.name;
  }
  return call;
};
Iroh.$$frameHash = -1;

// #FUNCTIONS
Iroh.DEBUG_FUNCTION_CALL = function(hash, ctx, object, call, args) {
  let ctor = object.constructor.prototype;
  let callee = getCallee(object, call);
  let previous = Iroh.$$frameHash;
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

  let node = Iroh.nodes[hash].node;
  let isSloppy = Iroh.symbols[name] === void 0;

  node.isSloppy = isSloppy;

  Iroh.indent += Iroh.INDENTFACTOR;
  let frame = Iroh.pushFrame(Iroh.INSTR.FUNCTION_CALL, hash);
  frame.values = [hash, ctx, object, call, args];

  if (isSloppy) {
    console.log(Iroh.indentString(Iroh.indent - Iroh.INDENTFACTOR) + "call", callee, "#external", "(", args, ")");
  } else {
    console.log(Iroh.indentString(Iroh.indent - Iroh.INDENTFACTOR) + "call", callee, "(", args, ")");
  }

  Iroh.$$frameHash = hash;

  // intercept function.toString calls
  // to remain code reification feature
  let fn = null;
  if (
    Iroh.ORIGINAL_FUNCTION_TOSTRING &&
    object instanceof Function &&
    call === "toString" &&
    // native toString
    object[call] === Function.toString &&
    // function is known and patched
    (fn = Iroh.getFunctionNodeByName(object.name)) !== null
  ) {
    // extract original code
    let code = Iroh.code.substr(fn.start, fn.end - fn.start);
    value = code;
  } else {
    // evaluate function
    value = root.apply(proto, args);
  }

  Iroh.indent -= Iroh.INDENTFACTOR;
  if (isSloppy) {
    console.log(Iroh.indentString(Iroh.indent) + "call", callee, "end #external", "->", value);
  } else {
    console.log(Iroh.indentString(Iroh.indent) + "call", callee, "end", "->", value);
  }
  Iroh.popFrame();

  Iroh.$$frameHash = previous;

  return value;
};
Iroh.DEBUG_FUNCTION_RETURN = function(name, value) {
  let expect = Iroh.resolveReturnFrame(Iroh.frame);
  Iroh.leaveFrameUntil(expect);
  let isSloppy = (Iroh.$$frameHash === -1) || Iroh.nodes[Iroh.$$frameHash].node.isSloppy;
  if (isSloppy) {
    Iroh.indent -= Iroh.INDENTFACTOR;
    console.log(Iroh.indentString(Iroh.indent) + "call", name, "end #sloppy", "->", value);
  }
  return value;
};
Iroh.DEBUG_FUNCTION_ENTER = function(hash, ctx, argz) {
  let isSloppy = (Iroh.$$frameHash === -1) || Iroh.nodes[Iroh.$$frameHash].node.isSloppy;
  if (isSloppy) {
    let name = Iroh.nodes[hash].node.id.name;
    let args = Iroh.processArguments(argz);
    console.log(Iroh.indentString(Iroh.indent) + "call", name, "#sloppy", "(", args, ")");
    Iroh.indent += Iroh.INDENTFACTOR;
  }
  //console.log(Iroh.frame.cleanType, Iroh.frame.hash, hash);
  /*if (Iroh.frame.type !== Iroh.INSTR.FUNCTION_CALL) {
    // trace as async
    let args = Iroh.processArguments(argz);
    let node = Iroh.nodes[hash].node;
    let frame = Iroh.getFrameByHash(Iroh.frame, hash);
    // simulate function call
    Iroh.DEBUG_FUNCTION_CALL(hash, ctx, node.id.name, args, true);
    // next operation, dont'move this anywhere else!
    Iroh.frame.isAsync = true;
  }*/
};

Iroh.DEBUG_FUNCTION_LEAVE = function(hash, ctx) {
  let isSloppy = (Iroh.$$frameHash === -1) || Iroh.nodes[Iroh.$$frameHash].node.isSloppy;
  if (isSloppy) {
    Iroh.indent -= Iroh.INDENTFACTOR;
    let name = Iroh.nodes[hash].node.id.name;
    console.log(Iroh.indentString(Iroh.indent) + "call", name, "end #sloppy", "->", void 0);
  }
  /*if (Iroh.frame.isAsync) {
    let node = Iroh.nodes[hash].node;
    Iroh.DEBUG_FUNCTION_CALL_END(hash, ctx, node.id.name, void 0, true);
    // reset async frame state
    Iroh.frame.isAsync = false;
  }*/
};

// # DECLS
Iroh.DEBUG_VAR_DECLARE = function(name) {
  //console.log(Iroh.indentString(Iroh.indent) + "▶️ Declare " + name);
  return name;
};
Iroh.DEBUG_VAR_INIT = function(name, value) {
  //let instr = Iroh.frame.pushInstruction(Iroh.INSTR.VAR_DECLARE);
  //instr.values = [name, value];
  //console.log(Iroh.indentString(Iroh.indent) + "⏩ Initialise " + name + "::" + value);
  return value;
};

Iroh.DEBUG_OP_NEW = function(hash, ctor, args) {
  let isClass = ctor.toString().substr(0, 5) === "class";
  let name = ctor.constructor.name;
  let methods = Object.getPrototypeOf(ctor);
  let properties = Object.getOwnPropertyNames(ctor);
  console.log(Iroh.indentString(Iroh.indent) + "new " + ctor.name);
  Iroh.indent += Iroh.INDENTFACTOR;
  let frame = Iroh.pushFrame(Iroh.INSTR.OP_NEW, hash);
  frame.values = [hash, ctor, args];
  return new ctor(...args);
};
Iroh.DEBUG_OP_NEW_END = function(hash, ret) {
  Iroh.indent -= Iroh.INDENTFACTOR;
  Iroh.popFrame();
  console.log(Iroh.indentString(Iroh.indent) + "new end");
  return ret;
};

Iroh.DEBUG_SUPER = function(cls, args) {
  return args;
};

// method enter not available before super
// super_fix is injected after super
Iroh.DEBUG_SUPER_FIX = function(ctx) {

};

Iroh.DEBUG_METHOD_ENTER = function(hash, cls, isConstructor, args) {
  if (isConstructor) {
    let tree = Iroh.getInheritanceTree(cls);
    console.log(Iroh.indentString(Iroh.indent) + "ctor", tree.join("->"));
  } else {
    console.log(Iroh.indentString(Iroh.indent) + "method");
  }
  let instr = Iroh.frame.pushInstruction(Iroh.INSTR.METHOD_ENTER);
  Iroh.indent += Iroh.INDENTFACTOR;
  let frame = Iroh.pushFrame(Iroh.INSTR.METHOD_ENTER, hash);
  frame.values = [hash, cls, isConstructor, args];
  instr.subFrame = Iroh.frame;
};
Iroh.DEBUG_METHOD_LEAVE = function(hash, cls, isConstructor) {
  let topFrame = Iroh.frame;
  Iroh.indent -= Iroh.INDENTFACTOR;
  console.log(Iroh.indentString(Iroh.indent) + (isConstructor ? "ctor" : "method") + " end");
  Iroh.popFrame();
  let instr = Iroh.frame.pushInstruction(Iroh.INSTR.METHOD_LEAVE);
  instr.subFrame = topFrame;
};

Iroh.DEBUG_TRY_ENTER = function(hash) {
  console.log(Iroh.indentString(Iroh.indent) + "try");
  Iroh.indent += Iroh.INDENTFACTOR;
  let frame = Iroh.pushFrame(Iroh.INSTR.TRY_ENTER, hash);
  frame.values = [hash];
};
Iroh.DEBUG_TRY_LEAVE = function(hash) {
  let expect = Iroh.resolveTryFrame(Iroh.frame);
  console.log(Iroh.frame, expect);
  Iroh.leaveFrameUntil(expect);
  Iroh.indent -= Iroh.INDENTFACTOR;
  console.log(Iroh.indentString(Iroh.indent) + "try end");
};

Iroh.DEBUG_ALLOC_OBJECT = function(object) {
  //console.log(Iroh.indentString(Iroh.indent) + "#Allocated", object);
  return object;
};
Iroh.DEBUG_ALLOC_ARRAY = function(array) {
  //console.log(Iroh.indentString(Iroh.indent) + "#Allocated", array);
  return array;
};

Iroh.DEBUG_MEMBER_EXPR = function(object, property) {
  let value = object[property];
  //console.log(Iroh.indentString(Iroh.indent), object, "[" + property + "]", "->", value);
  return object;
};

// fix for lazy blocks
Iroh.DEBUG_BLOCK_ENTER = function(hash) {
  let frame = Iroh.pushFrame(Iroh.INSTR.BLOCK_ENTER, hash);
  frame.values = [hash];
};
Iroh.DEBUG_BLOCK_LEAVE = function(hash) {
  Iroh.popFrame();
};

Iroh.DEBUG_THIS = function(ctx) {
  Iroh.frame.pushInstruction(Iroh.INSTR.THIS);
  return ctx;
};

Iroh.DEBUG_ASSIGN = function(op, obj, prop, value) {
  if (prop === null) {
    result = Iroh.evalBinaryExpression(op, obj, value);
  } else {
    result = Iroh.evalObjectAssignmentExpression(op, obj, prop, value);
  }
  // trigger events here

  // return original value for non object assignments
  // the original assignment is performed outside!
  if (prop === null) result = value;
  return result;
};

Iroh.DEBUG_BINARY = function(op, a, b) {
  let result = Iroh.evalBinaryExpression(op, a, b);
  return result;
};

Iroh.DEBUG_PROGRAM_ENTER = function() {
  console.log(Iroh.indentString(Iroh.indent) + "Program");
  Iroh.indent += Iroh.INDENTFACTOR;
};
Iroh.DEBUG_PROGRAM_LEAVE = function(ret) {
  Iroh.indent -= Iroh.INDENTFACTOR;
  console.log(Iroh.indentString(Iroh.indent) + "Program end ->", ret);
  return ret;
};
Iroh.DEBUG_PROGRAM_FRAME_VALUE = function(value) {
  //console.log(value);
};

"DEBUG_LITERAL"; // TODO
"DEBUG_IDENTIFIER"; // TODO
