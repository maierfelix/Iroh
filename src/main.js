"use strict";

let Iroh = {};

Iroh.INDENTFACTOR = 2;
Iroh.DEBUG_KEY = "$";
Iroh.TEMP_VAR_BASE = "Iroh$$x";
Iroh.CLEAN_DEBUG_INJECTION = true;
Iroh.DEBUG_CALLEE_STRING_LIMIT = 5e3;
Iroh.DEBUG_IF_TEST_STRING_LIMIT = 42;
Iroh.DEBUG_FUNCTION_ARG_LIMIT = 42;
Iroh.ORIGINAL_FUNCTION_TOSTRING = true;

Iroh.ENV = {};
Iroh.ENV.isNode = (
  (typeof module !== "undefined" && module.exports) &&
  (typeof require !== "undefined")
);
Iroh.ENV.isBrowser = !Iroh.ENV.isNode;

Iroh.NOP = function nop() {};

(() => {
  let ii = 0;
  Iroh.INSTR = {

    PROGRAM: ii++,

    FUNCTION_RETURN: ii++,
    FUNCTION_CALL: ii++,
    FUNCTION_CALL_END: ii++,
    FUNCTION_ENTER: ii++,
    FUNCTION_LEAVE: ii++,

    LOOP_TEST: ii++,
    LOOP_ENTER: ii++,
    LOOP_LEAVE: ii++,

    BREAK: ii++,
    CONTINUE: ii++,

    SWITCH_TEST: ii++,
    SWITCH_ENTER: ii++,
    SWITCH_LEAVE: ii++,

    CASE_TEST: ii++,
    CASE_ENTER: ii++,
    CASE_LEAVE: ii++,

    IF_TEST: ii++,
    IF_ENTER: ii++,
    IF_LEAVE: ii++,

    ELSE_ENTER: ii++,
    ELSE_LEAVE: ii++,

    VAR_INIT: ii++,
    VAR_DECLARE: ii++,

    OP_NEW: ii++,
    OP_NEW_END: ii++,

    UNARY: ii++,

    SUPER: ii++,

    THIS: ii++,

    LITERAL: ii++,
    IDENTIFIER: ii++,

    BINARY: ii++,
    LOGICAL: ii++,
    TERNARY: ii++,
    ASSIGN: ii++,

    METHOD_ENTER: ii++,
    METHOD_LEAVE: ii++,

    TRY_ENTER: ii++,
    TRY_LEAVE: ii++,

    ALLOC_OBJECT: ii++,
    ALLOC_ARRAY: ii++,

    MEMBER_EXPR: ii++,

    BLOCK_ENTER: ii++,
    BLOCK_LEAVE: ii++,

    PROGRAM_FRAME_VALUE: ii++,
    PROGRAM_ENTER: ii++,
    PROGRAM_LEAVE: ii++

  };
})();

(() => {
  let ii = 0;
  Iroh.OP = {
    "=": ii++,
    "+": ii++,
    "-": ii++,
    "*": ii++,
    "/": ii++,
    "%": ii++,
    "**": ii++,
    "<<": ii++,
    ">>": ii++,
    ">>>": ii++,
    "&": ii++,
    "^": ii++,
    "|": ii++,
    "!": ii++,
    "~": ii++,
    "in": ii++,
    "void": ii++,
    "typeof": ii++,
    "delete": ii++,
    "instanceof": ii++,
    "&&": ii++,
    "||": ii++,
    "==": ii++,
    "===": ii++,
    "!=": ii++,
    "!==": ii++,
    ">": ii++,
    ">=": ii++,
    "<": ii++,
    "<=": ii++,
  };
})();

Iroh.parse = acorn.parse;
Iroh.generate = escodegen.generate;

Iroh.tmpVarIndex = 0;
Iroh.$$frameHash = 0;
Iroh.uidx = 0;
Iroh.ubidx = 0;
Iroh.indent = 0;
Iroh.code = null;
Iroh.stage = null;
Iroh.scope = null;
Iroh.currentScope = null;
Iroh.previousScope = null;
Iroh.state = {};
Iroh.symbols = {};
Iroh.nodes = {};
Iroh.links = {};

Iroh.stage1 = {};
Iroh.stage2 = {};
Iroh.stage3 = {};
Iroh.stage4 = {};
Iroh.stage5 = {};
Iroh.stage6 = {};
Iroh.stage7 = {};
Iroh.stage8 = {};

// debug link list
(() => {
  let ihdx = 0;
  Iroh.createLink = function(name) {
    let key = Iroh.DEBUG_KEY + ihdx++;
    Iroh.links[name] = {
      fn: Iroh[name],
      key
    };
    Iroh[key] = Iroh.links[name].fn;
  };
})();

// generate links
(() => {
  let key = "DEBUG_";
  let instrs = Iroh.INSTR;
  for (let callee in instrs) {
    if (!instrs.hasOwnProperty(callee)) continue;
    Iroh.createLink(key + callee);
  };
})();

Iroh.reserveTempVarId = function() {
  return (
    `${Iroh.TEMP_VAR_BASE}${Iroh.tmpVarIndex++}`
  );
};

Iroh.Scope = class Scope {
  constructor(node) {
    this.isLoop = false;
    this.isReturnable = false;
    if (Iroh.isFunctionNode(node.type)) {
      this.isReturnable = true;
    }
    else if (Iroh.isLoopStatement(node.type)) {
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

class JSONFrame {
  constructor(hash, type, cleanType) {
    this.hash = hash;
    this.type = type;
    this.cleanType = cleanType;
    this.children = [];
  }
};

class JSONInstruction {
  constructor(top, bottom, type, cleanType) {
    this.top = top;
    this.bottom = bottom;
    this.type = type;
    this.cleanType = cleanType;
    this.children = [];
  }
};

Iroh.Instruction = class Instruction {
  constructor(type) {
    this.uid = Iroh.uid();
    this.type = type;
    this.cleanType = Iroh.instructionToString(type);
    this.level = Iroh.indent / Iroh.INDENTFACTOR;
    this.values = [];
    this.subFrame = null;
    this.localFrame = Iroh.frame;
  }
  isBranch() {
    return this.subFrame !== null;
  }
  toJSON(frame) {
    let subFrame = (
      this.subFrame ? this.subFrame.toJSON() : null
    );
    let instr = new JSONInstruction(
      frame.hash,
      subFrame,
      this.type,
      this.cleanType
    );
    return instr;
  }
};

Iroh.Frame = class Frame {
  constructor(type, hash) {
    this.uid = Iroh.uid();
    this.hash = hash;
    this.type = type;
    this.isAsync = false;
    this.isSloppy = false;
    this.isBreakable = false;
    this.isReturnable = false;
    this.isTryStatement = false;
    this.isSwitchDefault = false;
    this.isInstantiation = false;
    this.cleanType = Iroh.instructionToString(type);
    this.parent = null;
    this.values = [];
    this.children = [];
    // apply frame flow kinds
    this.isBreakable = Iroh.isBreakableFrameType(type);
    this.isSwitchCase = Iroh.isSwitchCaseFrameType(type);
    this.isReturnable = Iroh.isReturnableFrameType(type);
    this.isContinuable = Iroh.isContinuableFrameType(type);
    this.isTryStatement = Iroh.isTryStatementFrameType(type);
    this.isInstantiation = Iroh.isInstantiationFrameType(type);
  }
  pushInstruction(type) {
    let instr = new Iroh.Instruction(type);
    this.children.push(instr);
    return instr;
  }
  isGlobal() {
    return (
      this.parent === null &&
      this.type === Iroh.INSTR.PROGRAM
    );
  }
  getGlobal() {
    let frame = this;
    while (true) {
      if (frame.isGlobal()) break;
      frame = frame.parent;
    };
    return frame;
  }
  getDepth() {
    let depth = 0;
    let frame = this;
    while (true) {
      if (frame.isGlobal()) break;
      frame = frame.parent;
      depth++;
    };
    return depth;
  }
  equals(frame) {
    return (
      this.uid === frame.uid
    );
  }
  toJSON() {
    let hash = this.hash;
    let frame = new JSONFrame(
      hash,
      this.type,
      this.cleanType
    );
    for (let ii = 0; ii < this.children.length; ++ii) {
      let instr = this.children[ii].toJSON(frame);
      frame.children.push(instr);
    };
    return frame;
  }
};

Iroh.toJSON = function(frame) {
  if (!frame.isGlobal()) {
    let left = frame.getDepth();
    console.warn(`Turning unfinished call tree into JSON, ${left} backtraces left!`);
  }
  let json = frame.toJSON();
  return json;
};

Iroh.uid = () => { return Iroh.uidx++; };

Iroh.uBranchHash = function() {
  return Iroh.ubidx++;
};

Iroh.walk = function(ast, state, visitors) {
  return acorn.walk.recursive(ast, state, visitors, acorn.walk.base);
};

Iroh.getInheritanceTree = function(cls) {
  let base = cls;
  let tree = [cls.name];
  while (true) {
    base = Object.getPrototypeOf(base);
    if (base === Function.prototype) break;
    tree.push(base.name);
  };
  return tree;
};

Iroh.instructionToString = function(n) {
  for (let key in Iroh.INSTR) {
    let value = Iroh.INSTR[key];
    if (value === n) return key;
  };
  console.warn(`Unexpected instruction value ${n}`);
  return "";
};

Iroh.injectPatchIntoNode = function(node, patch, end) {
  let body = null;
  let type = node.type;
  if (type === "Program") body = node.body;
  else if (type === "BlockStatement") body = node.body;
  else if (type === "ForStatement") body = node.body.body;
  else if (Iroh.isLoopStatement(type)) body = node.body.body;
  else if (Iroh.isFunctionNode(type)) {
    body = node.body.body;
  }
  else console.error(`Invalid patch node type ${type}`);
  console.assert(body instanceof Array);
  // force patches to be magic
  patch.magic = true;
  if (end) body.push(patch);
  else body.unshift(patch);
};

Iroh.resolveCallee = function(node) {
  let type = node.type;
  if (node.type === "MemberExpression") {
    return node.object;
  }
  return node;
};

Iroh.getCallCallee = function(node) {
  let type = node.type;
  if (type === "Literal") {
    return node.value;
  }
  if (type === "Identifier") {
    return node.name;
  }
  if (type === "FunctionExpression") {
    return node.id.name;
  }
  else if (type === "MemberExpression") {
    let object = node.object;
    let property = node.property;
    let obj = Iroh.getCallCallee(object);
    let prop = Iroh.getCallCallee(property);
    // fully resolvable
    if (
      object.type === "Identifier" &&
      property.type === "Identifier"
    ) {
      return `${obj}.${prop}`;
    }
    // full resolvable
    if (
      object.type === "Identifier" &&
      property.type === "Literal"
    ) {
      return `${obj}.${prop}`;
    }
    // only the object is resolvable
    if (object.type === "Identifier") {
      return `${obj}[${property.type}]`;
    }
    if (
      object.type === "ThisExpression" &&
      property.type === "Identifier"
    ) {
      return `this.${prop}`;
    }
    // unknown
    return `${object.type}->${property.type}`;
  }
  // unknown
  //console.warn(`Uncommon expression callee ${type}`);
  return type;
};

Iroh.isFunctionNode = function(type) {
  return (
    type === "FunctionExpression" ||
    type === "FunctionDeclaration" ||
    type === "ArrowFunctionExpression"
  );
};

Iroh.isExpression = function(type) {
  return (
    type === "ArrayExpression" ||
    type === "AssignmentExpression" ||
    type === "BinaryExpression" ||
    type === "CallExpression" ||
    type === "ConditionalExpression" ||
    type === "FunctionExpression" ||
    type === "Identifier" ||
    type === "Literal" ||
    type === "LogicalExpression" ||
    type === "MemberExpression" ||
    type === "NewExpression" ||
    type === "ObjectExpression" ||
    type === "SequenceExpression" ||
    type === "ThisExpression" ||
    type === "UnaryExpression" ||
    type === "UpdateExpression"
  );
};

Iroh.isStatement = function(type) {
  return (
    type === "BlockStatement" ||
    type === "BreakStatement" ||
    type === "ContinueStatement" ||
    type === "DebuggerStatement" ||
    type === "DoWhileStatement" ||
    type === "EmptyStatement" ||
    type === "ExpressionStatement" ||
    type === "ForInStatement" ||
    type === "ForStatement" ||
    type === "IfStatement" ||
    type === "LabeledStatement" ||
    type === "ReturnStatement" ||
    type === "SwitchStatement" ||
    type === "ThrowStatement" ||
    type === "TryStatement" ||
    type === "VariableDeclaration" ||
    type === "WhileStatement" ||
    type === "WithStatement"
  );
};

Iroh.isLoopStatement = function(type) {
  return (
    type === "ForStatement" ||
    type === "ForInStatement" ||
    type === "ForOfStatement" ||
    type === "WhileStatement" ||
    type === "DoWhileStatement"
  );
};

Iroh.isSwitchStatement = function(type) {
  return (
    type === "SwitchStatement"
  );
};

Iroh.isTryStatement = function(type) {
  return (
    type === "TryStatement"
  );
};

Iroh.isLabeledStatement = function(type) {
  return (
    type === "LabeledStatement"
  );
};

Iroh.isPrimitive = function(value) {
  let type = Iroh.getValueType(value);
  return (
    type === "number" ||
    type === "string" ||
    type === "boolean" ||
    type === "undefined" ||
    type === "null" ||
    type === "symbol"
  );
};

Iroh.getFunctionNodeByName = function(name) {
  return (
    Iroh.symbols[name] || null
  );
};

Iroh.isAbstract = function(value) {
  return !Iroh.isPrimitive(value);
};

Iroh.getValueType = function(value) {
  if (value === null) return "null";
  return typeof value;
};

Iroh.isLoopFrameType = function(type) {
  return (
    type === Iroh.INSTR.LOOP_ENTER
  );
};

Iroh.isSwitchFrameType = function(type) {
  return (
    type === Iroh.INSTR.SWITCH_ENTER
  );
};

Iroh.isSwitchCaseFrameType = function(type) {
  return (
    type === Iroh.INSTR.CASE_ENTER
  );
};

Iroh.isFunctionFrameType = function(type) {
  return (
    type === Iroh.INSTR.FUNCTION_CALL
  );
};

Iroh.isMethodFrameType = function(type) {
  return (
    type === Iroh.INSTR.METHOD_ENTER
  );
};

Iroh.isReturnableFrameType = function(type) {
  return (
    Iroh.isMethodFrameType(type) ||
    Iroh.isFunctionFrameType(type)
  );
};

Iroh.isBreakableFrameType = function(type) {
  return (
    Iroh.isLoopFrameType(type) ||
    Iroh.isSwitchFrameType(type)
  );
};

Iroh.isContinuableFrameType = function(type) {
  return (
    Iroh.isLoopFrameType(type)
  );
};

Iroh.isTryStatementFrameType = function(type) {
  return (
    type === Iroh.INSTR.TRY_ENTER
  );
};

Iroh.isInstantiationFrameType = function(type) {
  return (
    type === Iroh.INSTR.OP_NEW
  );
};

Iroh.isValidFrameInstruction = function(frame) {
  console.assert(typeof frame.cleanType === "string");
  let type = frame.cleanType;
  return (
    Iroh.INSTR[type] >= 0
  );
};

Iroh.operatorToString = function(op) {
  let OP = Iroh.OP;
  for (let key in OP) {
    if (OP[key] === op) return key;
  };
  return "undefined";
};

Iroh.evalUnaryExpression = function(op, ctx, a) {
  let OP = Iroh.OP;
  switch (op) {
    case OP["+"]:      return +a;
    case OP["-"]:      return -a;
    case OP["!"]:      return !a;
    case OP["~"]:      return ~a;
    case OP["void"]:   return void a;
    case OP["typeof"]: return typeof a;
    // handled outside
    case OP["delete"]: return a;
    default:
      throw new Error(`Invalid operator ${op}`);
    break;
  };
};

Iroh.evalBinaryExpression = function(op, a, b) {
  let OP = Iroh.OP;
  switch (op) {
    case OP["+"]:          return a + b;
    case OP["-"]:          return a - b;
    case OP["*"]:          return a * b;
    case OP["/"]:          return a / b;
    case OP["%"]:          return a % b;
    case OP["**"]:         return a ** b;
    case OP["<<"]:         return a << b;
    case OP[">>"]:         return a >> b;
    case OP[">>>"]:        return a >>> b;
    case OP["&"]:          return a & b;
    case OP["^"]:          return a ^ b;
    case OP["|"]:          return a | b;
    case OP["in"]:         return a in b;
    case OP["=="]:         return a == b;
    case OP["==="]:        return a === b;
    case OP["!="]:         return a != b;
    case OP["!=="]:        return a !== b;
    case OP[">"]:          return a > b;
    case OP[">="]:         return a >= b;
    case OP["<"]:          return a < b;
    case OP["<="]:         return a <= b;
    case OP["instanceof"]: return a instanceof b;
    default:
      throw new Error(`Invalid operator ${op}`);
    break;
  };
};

Iroh.evalObjectAssignmentExpression = function(op, obj, prop, value) {
  let OP = Iroh.OP;
  switch (op) {
    case OP["="]:   return obj[prop] =    value;
    case OP["+"]:   return obj[prop] +=   value;
    case OP["-"]:   return obj[prop] -=   value;
    case OP["*"]:   return obj[prop] *=   value;
    case OP["/"]:   return obj[prop] /=   value;
    case OP["%"]:   return obj[prop] %=   value;
    case OP["**"]:  return obj[prop] **=  value;
    case OP["<<"]:  return obj[prop] <<=  value;
    case OP[">>"]:  return obj[prop] >>=  value;
    case OP[">>>"]: return obj[prop] >>>= value;
    case OP["&"]:   return obj[prop] &=   value;
    case OP["^"]:   return obj[prop] ^=   value;
    case OP["|"]:   return obj[prop] |=   value;
    default:
      throw new Error(`Invalid operator ${op}`);
    break;
  };
};

Iroh.getInverseInstruction = function(frame) {
  let type = frame.type;
  switch (type) {
    // a function call is never left
    // e.g. failed inside a try statement
    /*case Iroh.INSTR.FUNCTION_CALL: {
      Iroh.indent -= Iroh.INDENTFACTOR;
      //console.log(Iroh.indentString(Iroh.indent) + "call", callee, "end", "->", [value]);
      let callee = frame.values[2].name;
      let value = void 0;
      console.log(Iroh.indentString(Iroh.indent) + "call FIX", callee, "end", "->", [value]);
      //console.log(Iroh.frame);
      Iroh.popFrame();
      let expect = Iroh.resolveTryFrame(Iroh.frame);
      Iroh.leaveFrameUntil(expect);
      return Iroh.NOP;
    }*/
    // a broken function call
    // means we called sth but it failed afterwards
    case Iroh.INSTR.FUNCTION_ENTER: return Iroh.DEBUG_FUNCTION_LEAVE;
    case Iroh.INSTR.IF_ENTER:       return Iroh.DEBUG_IF_LEAVE;
    case Iroh.INSTR.ELSE_ENTER:     return Iroh.DEBUG_ELSE_LEAVE;
    case Iroh.INSTR.LOOP_ENTER:     return Iroh.DEBUG_LOOP_LEAVE;
    case Iroh.INSTR.SWITCH_ENTER:   return Iroh.DEBUG_SWITCH_LEAVE;
    case Iroh.INSTR.CASE_ENTER:     return Iroh.DEBUG_CASE_LEAVE;
    case Iroh.INSTR.METHOD_ENTER:   return Iroh.DEBUG_METHOD_LEAVE;
    case Iroh.INSTR.OP_NEW:         return Iroh.DEBUG_OP_NEW_END;
    case Iroh.INSTR.TRY_ENTER:      return Iroh.DEBUG_TRY_LEAVE;
    case Iroh.INSTR.BLOCK_ENTER:    return Iroh.DEBUG_BLOCK_LEAVE;
    default:
      throw new Error(`Unexpected frame type ${frame.cleanType}`);
    break;
  };
  return null;
};

Iroh.manuallyLeaveFrame = function(frame) {
  console.assert(Iroh.isValidFrameInstruction(frame));
  let args = frame.values;
  //console.log("Manually leaving", frame.cleanType);
  // fill leave calls with frame things
  let inverse = Iroh.getInverseInstruction(frame);
  inverse(...args);
};

Iroh.leaveFrameUntil = function(target) {
  while (true) {
    if (Iroh.frame.equals(target)) break;
    Iroh.manuallyLeaveFrame(Iroh.frame);
  };
};

Iroh.leaveFrameUntilHash = function(hash) {
  while (true) {
    if (Iroh.frame.hash === hash) break;
    Iroh.manuallyLeaveFrame(Iroh.frame);
  };
};

Iroh.pushFrame = function(type, hash) {
  let parent = Iroh.frame;
  let frame = new Iroh.Frame(type, hash);
  frame.parent = parent;
  frame.node = Iroh.nodes[hash].node;
  frame.location = frame.node.loc;
  Iroh.frame = frame;
  return frame;
};

Iroh.popFrame = function() {
  /*console.assert(
    Iroh.frame &&
    Iroh.frame.type !== "PROGRAM"
  );*/
  Iroh.frame = Iroh.frame.parent;
};

Iroh.processLabels = function(node) {
  let labels = [];
  // we can have multiple labels
  // *universe collapses*
  while (true) {
    if (node.type === "LabeledStatement") {
      labels.push(node.label.name);
    } else if (Iroh.isStatement(node.type)) {
      node.labels = labels;
      break;
    }
    node = node.body;
  };
  return node;
};

Iroh.resolveBreakFrame = function(frm, label) {
  let frame = frm;
  while (true) {
    // TODO: isContinuable stable?
    if (frame.isBreakable || frame.isContinuable) {
      if (label !== null) {
        let node = Iroh.nodes[frame.hash].node;
        if (
          node.labels !== void 0 &&
          node.labels.indexOf(label) > -1
        ) break;
      } else {
        break;
      }
    } else if (label !== null) {
      let node = Iroh.nodes[frame.hash].node;
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

Iroh.resolveReturnFrame = function(frm) {
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
    !Iroh.isReturnableFrameType(frame.type) &&
    !Iroh.isInstantiationFrameType(frame.type)
  ) {
    // only beef if frame hashes doesn't match
    if (frame.hash !== Iroh.$$frameHash) {
      console.error(frame);
    }
  }
  return frame;
};

Iroh.resolveCaseFrame = function(frm) {
  let frame = frm;
  while (true) {
    if (frame.isSwitchCase) break;
    if (frame.isGlobal()) break;
    frame = frame.parent;
  };
  console.assert(
    frame.type === Iroh.INSTR.CASE_ENTER
  );
  return frame;
};

Iroh.resolveTryFrame = function(frm) {
  let frame = frm;
  while (true) {
    if (frame.isTryStatement) break;
    if (frame.isGlobal()) break;
    frame = frame.parent;
  };
  console.assert(
    frame.type === Iroh.INSTR.TRY_ENTER
  );
  return frame;
};

Iroh.resolveProgramFrame = function(frm) {
  let frame = frm;
  while (true) {
    if (frame.isGlobal()) break;
    frame = frame.parent;
  };
  console.assert(
    frame.type === Iroh.INSTR.PROGRAM
  );
  return frame;
};

Iroh.resolveLeftFrames = function(frm) {
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

/*
Iroh.getFrameByHash = function(frame, hash) {
  if (frame.hash === hash) return frame;
  for (let ii = 0; ii < frame.children.length; ++ii) {
    let child = frame.children[ii];
    if (child.subFrame !== null) {
      let sub = Iroh.getFrameByHash(child.subFrame, hash);
      if (sub !== null) return child.subFrame;
    }
  };
  return null;
};
*/

Iroh.getFrameByHashFrom = function(frm, hash) {
  let frame = frm;
  while (true) {
    if (frame.hash === hash) break;
    if (frame.isGlobal()) return null;
    frame = frame.parent;
  };
  return frame;
};

Iroh.pushScope = function(node) {
  let tmp = Iroh.scope;
  Iroh.scope = new Iroh.Scope(node);
  Iroh.scope.parent = tmp;
};

Iroh.popScope = function(node) {
  Iroh.scope = Iroh.scope.parent;
};

Iroh.processArguments = function(args) {
  let values = [];
  for (let ii = 0; ii < args.length; ++ii) {
    values.push(args[ii]);
  };
  return values;
};

Iroh.forceLoopBodyBlocked = function(node) {
  if (node.body.type !== "BlockStatement") {
    node.body = {
      magic: true,
      type: "BlockStatement",
      body: [node.body]
    };
  }
};

Iroh.createDebugExpr = function(kind, args) {
  let node = {
    type: "ExpressionStatement",
    start: 0, end: 0,
    expression: Iroh.createDebugCall(kind, args)
  };
  return ({
    node: node,
    arguments: node.expression.arguments
  });
};

Iroh.createDebugCall = function(kind, args) {
  let node = {
    type: "CallExpression",
    start: 0, end: 0,
    magic: true,
    callee: {
      type: "Identifier",
      start: 0, end: 0,
      name: kind
    },
    arguments: args
  };
  return node;
};

Iroh.getLink = function(name) {
  let key = Iroh.links[name].key;
  if (Iroh.CLEAN_DEBUG_INJECTION) return `Iroh.${name}`;
  return `Iroh.${key}`;
};

Iroh.getLinkCall = function(name) {
  return Iroh.getLink(name) + "()";
};

Iroh.createReturn = function(argument) {
  return Iroh.parseExpression(`return (${argument})`);
};

Iroh.createThis = function() {
  return Iroh.parseExpression("this");
};

Iroh.parseExpression = function(input) {
  let node = Iroh.parse(input);
  let result = node.body[0].expression;
  Iroh.deepMagicPatch(result);
  return result;
};

Iroh.parseExpressionStatement = function(input) {
  let node = Iroh.parse(input);
  let result = node.body[0];
  Iroh.deepMagicPatch(result);
  return result;
};

Iroh.deepMagicPatch = function(node) {
  // magic patch the whole ast
  acorn.walk.full(node, function(child) {
    child.magic = true;
  });
};

Iroh.processFunctionArgs = function(argz) {
  let args = argz.slice(0);
  for (let ii = 0; ii < args.length; ++ii) {
    let arg = args[ii];
    args[ii] = Iroh.beautifyRuntimeValue(args[ii]);
  };
  return args;
};

Iroh.processFunctionReturn = function(ret) {
  return Iroh.beautifyRuntimeValue(ret);
};

Iroh.beautifyRuntimeValue = function(value) {
  // stringify raw functions
  if (value instanceof Function) {
    return `[function ${value.name}]`;
  }
  /*else if (str.length > Iroh.DEBUG_FUNCTION_ARG_LIMIT) {
    args[ii] = Iroh.beautifyStringValue(value);
  }*/
  // beautify strings
  if (typeof value === "string") {
    return `"${value}"`;
  }
  // beautify unknowns
  /*else if (!String(value).length) {
    let a = (typeof value).toLowerCase();
    let b = a[0].toUpperCase() + a.slice(1);
    args[ii] = `[${a} ${b}]`;
  }*/
  return value;
};

// arguments.callee.name
Iroh.createArgsCalleeName = function() {
  return Iroh.parseExpression(`arguments.callee.name`);
};

Iroh.createIdentifier = function(value) {
  return Iroh.parseExpression(value);
};

Iroh.createLiteral = function(value) {
  return Iroh.parseExpression(value);
};

Iroh.createStringLiteral = function(value) {
  return Iroh.parseExpression(`"${value}"`);
};

Iroh.assert = function(descr, test) {
  console.log("Testing:", `"${descr}"`);
  if (test !== true) console.error(`"${descr}" failed`);
  return test;
};

Iroh.getGlobalContext = function() {
  if (typeof module !== "undefined" && module.exports) {
    return this;
  }
  return window;
};

Iroh.indentString = function(n) {
  let str = "";
  for (let ii = 0; ii < n; ++ii) {
    str += " ";
  };
  return str;
};

Iroh.isAnonCall = function(name) {
  return (Iroh.symbols[name] === void 0);
};

Iroh.getDebugContext = function(node) {
  let type = node.type;
  if (type === "MemberExpression") {
    return node.object;
  }
  if (type === "Identifier") {
    return node;
  }
  return node;
};

Iroh.cloneNode = function(node) {
  let clone = JSON.parse(JSON.stringify(node));
  return clone;
};

Iroh.applyStagePatch = function(ast, stage) {
  Iroh.stage = stage;
  Iroh.walk(ast, Iroh.state, Iroh.stage);
};

Iroh.start = function() {

};
Iroh.stop = function() {

};

Iroh.listeners = {};
Iroh.on = function(event, handler) {
  Iroh.listeners[event] = handler;
};

Iroh.patch = function(code) {
  Iroh.code = code;
  let ast = Iroh.parse(code, { locations: true });
  Iroh.frame = new Iroh.Frame(Iroh.INSTR.PROGRAM, Iroh.$$frameHash);
  Iroh.applyStagePatch(ast, Iroh.stage2);
  Iroh.applyStagePatch(ast, Iroh.stage7);
  Iroh.applyStagePatch(ast, Iroh.stage4);
  Iroh.applyStagePatch(ast, Iroh.stage5);
  Iroh.applyStagePatch(ast, Iroh.stage1);
  Iroh.applyStagePatch(ast, Iroh.stage3);
  Iroh.applyStagePatch(ast, Iroh.stage6);
  Iroh.applyStagePatch(ast, Iroh.stage8);
  return Iroh.generate(ast, {
    format: {
      indent: {
        style: "  "
      }
    }
  });
};
