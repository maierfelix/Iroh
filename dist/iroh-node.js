var acorn = require('acorn');
var astring = require('astring');
var acorn_dist_walk = require('acorn/dist/walk');

/**
 * @param {Class} cls
 * @param {Array} prot
 */
var extend = function(cls, prot) {
  for (let key in prot) {
    if (prot[key] instanceof Function) {
      if (cls.prototype[key] instanceof Function) {
        console.log(`Warning: Overwriting ${cls.name}.prototype.${key}`);
      }
      cls.prototype[key] = prot[key];
    }
  }
};

var version = "0.3.0";

// indent factor
const INDENT_FACTOR = 1;

// minimal debug commands start with this
const DEBUG_KEY = `$`;

// temp variable start with this
const TEMP_VAR_BASE = `Iroh$$x`;

// log all errors, logs also internal errors


// clean or minimal debug command related output
const CLEAN_DEBUG_INJECTION = false;

// detect environment
const IS_NODE = (
  (typeof module !== "undefined" && module.exports) &&
  (typeof require !== "undefined")
);
const IS_BROWSER = !IS_NODE;

const VERSION = version;

let OP = {};
let INSTR = {};
let CATEGORY = {};

(() => {
  let ii = 0;
  INSTR.PROGRAM = ii++;

  INSTR.FUNCTION_RETURN = ii++;
  INSTR.FUNCTION_CALL = ii++;
  INSTR.FUNCTION_CALL_END = ii++;
  INSTR.FUNCTION_ENTER = ii++;
  INSTR.FUNCTION_LEAVE = ii++;

  INSTR.LOOP_TEST = ii++;
  INSTR.LOOP_ENTER = ii++;
  INSTR.LOOP_LEAVE = ii++;

  INSTR.BREAK = ii++;
  INSTR.CONTINUE = ii++;

  INSTR.SWITCH_TEST = ii++;
  INSTR.SWITCH_ENTER = ii++;
  INSTR.SWITCH_LEAVE = ii++;

  INSTR.CASE_TEST = ii++;
  INSTR.CASE_ENTER = ii++;
  INSTR.CASE_LEAVE = ii++;

  INSTR.IF_TEST = ii++;
  INSTR.IF_ENTER = ii++;
  INSTR.IF_LEAVE = ii++;

  INSTR.ELSE_ENTER = ii++;
  INSTR.ELSE_LEAVE = ii++;

  INSTR.VAR_INIT = ii++;
  INSTR.VAR_DECLARE = ii++;

  INSTR.OP_NEW = ii++;
  INSTR.OP_NEW_END = ii++;

  INSTR.UNARY = ii++;
  INSTR.UPDATE = ii++;

  INSTR.SUPER = ii++;

  INSTR.THIS = ii++;

  INSTR.LITERAL = ii++;
  INSTR.IDENTIFIER = ii++;

  INSTR.BINARY = ii++;
  INSTR.LOGICAL = ii++;
  INSTR.TERNARY = ii++;
  INSTR.ASSIGN = ii++;

  INSTR.METHOD_ENTER = ii++;
  INSTR.METHOD_LEAVE = ii++;

  INSTR.TRY_ENTER = ii++;
  INSTR.TRY_LEAVE = ii++;

  INSTR.CATCH_ENTER = ii++;
  INSTR.CATCH_LEAVE = ii++;

  INSTR.FINAL_ENTER = ii++;
  INSTR.FINAL_LEAVE = ii++;

  INSTR.ALLOC = ii++;

  INSTR.MEMBER_EXPR = ii++;

  INSTR.BLOCK_ENTER = ii++;
  INSTR.BLOCK_LEAVE = ii++;

  INSTR.PROGRAM_FRAME_VALUE = ii++;
  INSTR.PROGRAM_ENTER = ii++;
  INSTR.PROGRAM_LEAVE = ii++;

})();

(() => {
  let ii = 0;
  CATEGORY.THIS = ii++;
  CATEGORY.UNARY = ii++;
  CATEGORY.UPDATE = ii++;
  CATEGORY.BINARY = ii++;
  CATEGORY.LOGICAL = ii++;
  CATEGORY.TERNARY = ii++;
  CATEGORY.ASSIGN = ii++;
  CATEGORY.ALLOC = ii++;
  CATEGORY.MEMBER = ii++;
  CATEGORY.LITERAL = ii++;
  CATEGORY.IDENTIFIER = ii++;
  CATEGORY.TRY = ii++;
  CATEGORY.CATCH = ii++;
  CATEGORY.FINALLY = ii++;
  CATEGORY.OP_NEW = ii++;
  CATEGORY.VAR = ii++;
  CATEGORY.IF = ii++;
  CATEGORY.ELSE = ii++;
  CATEGORY.SWITCH = ii++;
  CATEGORY.CASE = ii++;
  CATEGORY.BREAK = ii++;
  CATEGORY.CONTINUE = ii++;
  CATEGORY.LOOP = ii++;
  CATEGORY.CALL = ii++;
  CATEGORY.FUNCTION = ii++;
  CATEGORY.BLOCK = ii++;
  CATEGORY.PROGRAM = ii++;
  CATEGORY.METHOD = ii++;
  CATEGORY.SUPER = ii++;
})();

(() => {
  let ii = 0;  
  OP["="] = ii++;
  OP["+"] = ii++;
  OP["-"] = ii++;
  OP["*"] = ii++;
  OP["/"] = ii++;
  OP["%"] = ii++;
  OP["**"] = ii++;
  OP["<<"] = ii++;
  OP[">>"] = ii++;
  OP[">>>"] = ii++;
  OP["&"] = ii++;
  OP["^"] = ii++;
  OP["|"] = ii++;
  OP["!"] = ii++;
  OP["~"] = ii++;
  OP["in"] = ii++;
  OP["void"] = ii++;
  OP["typeof"] = ii++;
  OP["delete"] = ii++;
  OP["instanceof"] = ii++;
  OP["&&"] = ii++;
  OP["||"] = ii++;
  OP["=="] = ii++;
  OP["==="] = ii++;
  OP["!="] = ii++;
  OP["!=="] = ii++;
  OP[">"] = ii++;
  OP[">="] = ii++;
  OP["<"] = ii++;
  OP["<="] = ii++;
  OP["++"] = ii++;
  OP["--"] = ii++;

})();

// unique temporary variable index
let utvidx = 1;
function reserveTempVarId() {
  return (
    `${TEMP_VAR_BASE}${utvidx++}`
  );
}

// general unique index
let uidx = 1;
function uid() {
  return uidx++;
}

// unique branch index
let ubidx = 1;
function uBranchHash() {
  return ubidx++;
}

function parse$1() {
  return acorn.parse.apply(null, arguments);
}

function generate$1() {
  return astring.generate.apply(null, arguments);
}


var _utils = Object.freeze({
	reserveTempVarId: reserveTempVarId,
	uid: uid,
	uBranchHash: uBranchHash,
	parse: parse$1,
	generate: generate$1
});

function getInheritanceTree(cls) {
  let base$$1 = cls;
  let tree = [cls.name];
  while (true) {
    base$$1 = Object.getPrototypeOf(base$$1);
    if (base$$1 === Function.prototype) break;
    tree.push(base$$1.name);
  }
  return tree;
}

function instructionToString(n) {
  for (let key in INSTR) {
    let value = INSTR[key];
    if (value === n) return key;
  }
  console.warn(`Unexpected instruction value ${n}`);
  return "";
}

function injectPatchIntoNode(node, patch, end) {
  let body = null;
  let type = node.type;
  if (type === "Program") body = node.body;
  else if (type === "BlockStatement") body = node.body;
  else if (type === "ForStatement") body = node.body.body;
  else if (isLoopStatement(type)) body = node.body.body;
  else if (isFunctionNode(type)) {
    body = node.body.body;
  }
  else console.error(`Invalid patch node type ${type}`);
  console.assert(body instanceof Array);
  // force patches to be magic
  patch.magic = true;
  if (end) body.push(patch);
  else body.unshift(patch);
}

function resolveCallee(node) {
  let type = node.type;
  if (node.type === "MemberExpression") {
    return node.object;
  }
  return node;
}

function isFunctionNode(type) {
  return (
    type === "FunctionExpression" ||
    type === "FunctionDeclaration" ||
    type === "ArrowFunctionExpression"
  );
}



function isStatement(type) {
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
}

function isLoopStatement(type) {
  return (
    type === "ForStatement" ||
    type === "ForInStatement" ||
    type === "ForOfStatement" ||
    type === "WhileStatement" ||
    type === "DoWhileStatement"
  );
}

function isSwitchStatement(type) {
  return (
    type === "SwitchStatement"
  );
}

function isTryStatement(type) {
  return (
    type === "TryStatement"
  );
}

function isLabeledStatement(type) {
  return (
    type === "LabeledStatement"
  );
}







function isLoopFrameType(type) {
  return (
    type === INSTR.LOOP_ENTER
  );
}

function isSwitchFrameType(type) {
  return (
    type === INSTR.SWITCH_ENTER
  );
}

function isSwitchCaseFrameType(type) {
  return (
    type === INSTR.CASE_ENTER
  );
}

function isFunctionFrameType(type) {
  return (
    type === INSTR.FUNCTION_CALL
  );
}

function isMethodFrameType(type) {
  return (
    type === INSTR.METHOD_ENTER
  );
}

function isReturnableFrameType(type) {
  return (
    isMethodFrameType(type) ||
    isFunctionFrameType(type)
  );
}

function isBreakableFrameType(type) {
  return (
    isLoopFrameType(type) ||
    isSwitchFrameType(type)
  );
}

function isContinuableFrameType(type) {
  return (
    isLoopFrameType(type)
  );
}

function isTryStatementFrameType(type) {
  return (
    type === INSTR.TRY_ENTER
  );
}

function isCatchClauseFrameType(type) {
  return (
    type === INSTR.CATCH_ENTER
  );
}

function isFinalClauseFrameType(type) {
  return (
    type === INSTR.FINAL_ENTER
  );
}

function isInstantiationFrameType(type) {
  return (
    type === INSTR.OP_NEW
  );
}

function isValidFrameInstruction(frame) {
  console.assert(typeof frame.cleanType === "string");
  let type = frame.cleanType;
  return (
    INSTR[type] >= 0
  );
}

function operatorToString(op) {
  for (let key in OP) {
    if (OP[key] === op) return key;
  }
  return "undefined";
}

function processLabels(node) {
  let labels = [];
  // we can have multiple labels in js
  // *universe collapses*
  while (true) {
    if (node.type === "LabeledStatement") {
      labels.push(node.label.name);
    } else if (isStatement(node.type)) {
      node.labels = labels;
      break;
    }
    node = node.body;
  }
  return node;
}



function getCallee(callee, call) {
  if (call === null) {
    return callee.name;
  }
  return call;
}

function indentString(n) {
  return " ".repeat(n);
}

function cloneNode(node) {
  let clone = JSON.parse(JSON.stringify(node));
  return clone;
}

function deepMagicPatch(node) {
  // magic patch the whole ast
  acorn_dist_walk.full(node, function(child) {
    child.magic = true;
  });
}

function parse$2() {
  return acorn.parse.apply(null, arguments);
}

function generate$2() {
  return astring.generate.apply(null, arguments);
}

function parseExpression(input) {
  let node = parse$2(input);
  let result = node.body[0].expression;
  deepMagicPatch(result);
  return result;
}

function parseExpressionStatement(input) {
  let node = parse$2(input);
  let result = node.body[0];
  deepMagicPatch(result);
  return result;
}

function getCategoryFromInstruction(type) {
  type = type | 0;
  switch (type) {
    case INSTR.THIS:
      return CATEGORY.THIS | 0;
    case INSTR.UNARY:
      return CATEGORY.UNARY | 0;
    case INSTR.UPDATE:
      return CATEGORY.UPDATE | 0;
    case INSTR.BINARY:
      return CATEGORY.BINARY | 0;
    case INSTR.LOGICAL:
      return CATEGORY.LOGICAL | 0;
    case INSTR.TERNARY:
      return CATEGORY.TERNARY | 0;
    case INSTR.ASSIGN:
      return CATEGORY.ASSIGN | 0;
    case INSTR.ALLOC:
      return CATEGORY.ALLOC | 0;
    case INSTR.MEMBER_EXPR:
      return CATEGORY.MEMBER | 0;
    case INSTR.LITERAL:
      return CATEGORY.LITERAL | 0;
    case INSTR.IDENTIFIER:
      return CATEGORY.IDENTIFIER | 0;
    case INSTR.TRY_ENTER:
    case INSTR.TRY_LEAVE:
      return CATEGORY.TRY | 0;
    case INSTR.CATCH_ENTER:
    case INSTR.CATCH_LEAVE:
      return CATEGORY.CATCH | 0;
    case INSTR.FINAL_ENTER:
    case INSTR.FINAL_LEAVE:
      return CATEGORY.FINALLY | 0;
    case INSTR.OP_NEW:
    case INSTR.OP_NEW_END:
      return CATEGORY.OP_NEW | 0;
    case INSTR.VAR_INIT:
    case INSTR.VAR_DECLARE:
      return CATEGORY.VAR | 0;
    case INSTR.IF_TEST:
    case INSTR.IF_ENTER:
    case INSTR.IF_LEAVE:
      return CATEGORY.IF | 0;
    case INSTR.ELSE_ENTER:
    case INSTR.ELSE_LEAVE:
      return CATEGORY.ELSE | 0;
    case INSTR.SWITCH_TEST:
    case INSTR.SWITCH_ENTER:
    case INSTR.SWITCH_LEAVE:
      return CATEGORY.SWITCH | 0;
    case INSTR.CASE_TEST:
    case INSTR.CASE_ENTER:
    case INSTR.CASE_LEAVE:
      return CATEGORY.CASE | 0;
    case INSTR.BREAK:
      return CATEGORY.BREAK | 0;
    case INSTR.CONTINUE:
      return CATEGORY.CONTINUE | 0;
    case INSTR.LOOP_TEST:
    case INSTR.LOOP_ENTER:
    case INSTR.LOOP_LEAVE:
      return CATEGORY.LOOP | 0;
    case INSTR.FUNCTION_CALL:
    case INSTR.FUNCTION_CALL_END:
      return CATEGORY.CALL | 0;
    case INSTR.FUNCTION_ENTER:
    case INSTR.FUNCTION_LEAVE:
    case INSTR.FUNCTION_RETURN:
      return CATEGORY.FUNCTION | 0;
    case INSTR.BLOCK_ENTER:
    case INSTR.BLOCK_LEAVE:
      return CATEGORY.BLOCK | 0;
    case INSTR.PROGRAM:
    case INSTR.PROGRAM_ENTER:
    case INSTR.PROGRAM_LEAVE:
    case INSTR.PROGRAM_FRAME_VALUE:
      return CATEGORY.PROGRAM | 0;
    case INSTR.METHOD_ENTER:
    case INSTR.METHOD_LEAVE:
      return CATEGORY.METHOD | 0;
    case INSTR.SUPER:
      return CATEGORY.SUPER | 0;
  }
  return -1;
}

function forceLoopBodyBlocked(node) {
  if (node.body.type !== "BlockStatement") {
    node.body = {
      magic: true,
      type: "BlockStatement",
      body: [node.body]
    };
  }
}

class Frame {
  constructor(type, hash) {
    this.uid = uid();
    this.hash = hash;
    this.type = type;
    this.isSloppy = false;
    this.isBreakable = false;
    this.isReturnable = false;
    this.isCatchClause = false;
    this.isFinalClause = false;
    this.isTryStatement = false;
    this.isSwitchDefault = false;
    this.isInstantiation = false;
    this.cleanType = instructionToString(type);
    this.parent = null;
    this.values = [];
    this.children = [];
    // apply frame flow kinds
    this.isBreakable = isBreakableFrameType(type);
    this.isSwitchCase = isSwitchCaseFrameType(type);
    this.isReturnable = isReturnableFrameType(type);
    this.isCatchClause = isCatchClauseFrameType(type);
    this.isFinalClause = isFinalClauseFrameType(type);
    this.isContinuable = isContinuableFrameType(type);
    this.isTryStatement = isTryStatementFrameType(type);
    this.isInstantiation = isInstantiationFrameType(type);
  }
  isGlobal() {
    return (
      this.parent === null &&
      this.type === INSTR.PROGRAM
    );
  }
  getGlobal() {
    let frame = this;
    while (true) {
      if (frame.isGlobal()) break;
      frame = frame.parent;
    }
    return frame;
  }
  getDepth() {
    let depth = 0;
    let frame = this;
    while (true) {
      if (frame.isGlobal()) break;
      frame = frame.parent;
      depth++;
    }
    return depth;
  }
  equals(frame) {
    return (
      this.uid === frame.uid
    );
  }
}

class Scope {
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
    }
    return ctx;
  }
  getLoopContext() {
    let ctx = this;
    while (true) {
      if (ctx.isLoop) break;
      ctx = ctx.parent;
    }
    return ctx;
  }
}

let STAGE1 = {};

STAGE1.Program = function(node, patcher) {
  //if (node.magic) return;
  node.magic = true;
  patcher.pushScope(node);
  patcher.stage.BlockStatement(node, patcher, patcher.stage);
  if (patcher.stage === STAGE1) {
    let hash = uBranchHash();
    // create node link
    patcher.nodes[hash] = {
      hash: hash,
      node: cloneNode(node)
    };
    // program frame value id
    let frameValueId = "$$frameValue";
    // patch program frame value debug
    let last = null;
    for (let ii = 0; ii < node.body.length; ++ii) {
      let child = node.body[ii];
      if (child.type === "ExpressionStatement" && !child.magic) last = child;
    }
    // only patch the very last expr statement
    if (last !== null) {
      last.expression = {
        magic: true,
        type: "CallExpression",
        callee: {
          magic: true,
          type: "Identifier",
          name: patcher.instance.getLink("DEBUG_PROGRAM_FRAME_VALUE")
        },
        arguments: [
          {
            magic: true,
            type: "AssignmentExpression",
            operator: "=",
            left: parseExpression(frameValueId),
            right: last.expression
          }
        ]
      };
    }
    let end = {
      magic: true,
      type: "CallExpression",
      callee: {
        magic: true,
        type: "Identifier",
        name: patcher.instance.getLink("DEBUG_PROGRAM_LEAVE")
      },
      arguments: [
        parseExpression(hash)
      ]
    };
    let start = {
      magic: true,
      type: "CallExpression",
      callee: {
        magic: true,
        type: "Identifier",
        name: patcher.instance.getLink("DEBUG_PROGRAM_ENTER")
      },
      arguments: [
        parseExpression(hash)
      ]
    };
    let frame = parseExpressionStatement(`var ${frameValueId} = void 0;`);
    end.arguments.push(
      parseExpression(frameValueId)
    );
    node.body.push(end);
    node.body.unshift(start);
    node.body.unshift(frame);
    node.body.unshift(parseExpressionStatement(
      `const ${patcher.instance.key} = Iroh.stages["${patcher.instance.key}"];`
    ));
  }
  patcher.popScope();
};

STAGE1.BlockStatement = function(node, patcher) {
  let body = node.body;
  for (let ii = 0; ii < body.length; ++ii) {
    let child = body[ii];
    //if (child.magic) continue;
    patcher.walk(child, patcher, patcher.stage);
  }
};

STAGE1.MethodDefinition = function(node, patcher) {
  patcher.pushScope(node);
  patcher.walk(node.key, patcher, patcher.stage);
  patcher.walk(node.value, patcher, patcher.stage);
  patcher.popScope();
};

STAGE1.FunctionDeclaration = function(node, patcher) {
  // dont touch
  if (node.magic) {
    patcher.pushScope(node);
    // just walk
    patcher.walk(node.id, patcher, patcher.stage);
    node.params.map((param) => { patcher.walk(param, patcher, patcher.stage); });
    patcher.walk(node.body, patcher, patcher.stage);
    patcher.popScope();
    return;
  }
  node.magic = true;
  patcher.pushScope(node);
  let name = node.id.name;
  patcher.symbols[name] = cloneNode(node);
  patcher.walk(node.id, patcher, patcher.stage);
  node.params.map((param) => { patcher.walk(param, patcher, patcher.stage); });
  patcher.walk(node.body, patcher, patcher.stage);
  patcher.popScope();
};

STAGE1.FunctionExpression = function(node, patcher) {
  // dont touch
  if (node.magic) {
    patcher.pushScope(node);
    // just walk
    if (node.id !== null) patcher.walk(node.id, patcher, patcher.stage);
    node.params.map((param) => { patcher.walk(param, patcher, patcher.stage); });
    patcher.walk(node.body, patcher, patcher.stage);
    patcher.popScope();
    return;
  }
  node.magic = true;
  patcher.pushScope(node);
  let name = "$$ANON_" + uid();
  if (node.id === null) {
    node.id = {
      magic: true,
      type: "Identifier",
      name: name
    };
  }
  name = node.id.name;
  patcher.symbols[name] = cloneNode(node);
  patcher.walk(node.id, patcher, patcher.stage);
  node.params.map((param) => { patcher.walk(param, patcher, patcher.stage); });
  patcher.walk(node.body, patcher, patcher.stage);
  patcher.popScope();
};

STAGE1.ArrowFunctionExpression = function(node, patcher) {
  // dont touch
  if (node.magic) {
    // just walk
    patcher.pushScope(node);
    node.params.map((param) => { patcher.walk(param, patcher, patcher.stage); });
    patcher.walk(node.body, patcher, patcher.stage);
    patcher.popScope();
    return;
  }
  node.magic = true;
  patcher.pushScope(node);
  let name = "$$ANON_ARROW_" + uid();
  patcher.symbols[name] = cloneNode(node);
  node.id = {
    magic: true,
    type: "Identifier",
    name: name
  };
  // arrow fns auto return, inject return record
  if (node.body.type !== "BlockStatement") {
    let call = {
      magic: true,
      type: "CallExpression",
      callee: {
        magic: true,
        type: "Identifier",
        name: patcher.instance.getLink("DEBUG_FUNCTION_RETURN")
      },
      arguments: [
        parseExpression(`"${node.id}"`),
        node.body
      ]
    };
    node.argument = call;
  }
  // give a body
  if (node.body.type !== "BlockStatement") {
    node.expression = false;
    node.body = {
      magic: true,
      type: "BlockStatement",
      body: [node.body]
    };
  }
  node.params.map((param) => { patcher.walk(param, patcher, patcher.stage); });
  patcher.walk(node.body, patcher, patcher.stage);
  patcher.popScope();
};

STAGE1.CallExpression = function(node, patcher) {
  // patched in node, ignore
  if (node.magic) {
    patcher.walk(node.callee, patcher, patcher.stage);
    node.arguments.map((arg) => {
      patcher.walk(arg, patcher, patcher.stage);
    });
    return;
  }
  node.magic = true;
  patcher.walk(node.callee, patcher, patcher.stage);
  node.arguments.map((arg) => {
    patcher.walk(arg, patcher, patcher.stage);
  });
  let hash = uBranchHash();
  // create node link
  patcher.nodes[hash] = {
    hash: hash,
    node: cloneNode(node)
  };
  let callee = resolveCallee(node.callee);
  let call = {
    magic: true,
    type: "CallExpression",
    callee: {
      magic: true,
      type: "Identifier",
      name: patcher.instance.getLink("DEBUG_FUNCTION_CALL")
    },
    arguments: [
      parseExpression(hash),
      parseExpression("this"),
      callee,
      (() => {
        if (node.callee.type === "MemberExpression") {
          let property = node.callee.property;
          // identifier
          if (property.type === "Identifier") {
            if (node.callee.computed) {
              return {
                magic: true,
                type: "Identifier",
                name: property.name
              };
            }
            return ({
              magic: true,
              type: "Literal",
              value: property.name
            });
          }
          return property;
        }
        return parseExpression("null");
      })(),
      {
        magic: true,
        type: "ArrayExpression",
        elements: [...node.arguments]
      }
    ]
  };
  for (let key in call) {
    if (!call.hasOwnProperty(key)) continue;
    node[key] = call[key];
  }
};

STAGE1.ReturnStatement = function(node, patcher) {
  if (node.magic) return;
  let hash = uBranchHash();
  // create node link
  patcher.nodes[hash] = {
    hash: hash,
    node: cloneNode(node)
  };
  node.magic = true;
  let arg = cloneNode(node.argument);
  if (arg !== null) patcher.walk(arg, patcher, patcher.stage);
  let scope = patcher.scope.getReturnContext();
  let name = parseExpression(`"${scope.node.id.name}"`);
  node.argument = {
    magic: true,
    type: "CallExpression",
    callee: {
      magic: true,
      type: "Identifier",
      name: patcher.instance.getLink("DEBUG_FUNCTION_RETURN")
    },
    arguments: [
      parseExpression(hash),
      name
    ]
  };
  if (arg !== null) {
    node.argument.arguments.push(arg);
  }
};

STAGE1.BreakStatement = function(node, patcher) {
  if (node.magic) return;
  let hash = uBranchHash();
  // create node link
  patcher.nodes[hash] = {
    hash: hash,
    node: cloneNode(node)
  };
  let label = parseExpression(
    node.label ? `"${node.label.name}"` : "null"
  );
  let expr = {
    magic: true,
    start: 0, end: 0,
    type: "IfStatement",
    test: {
      magic: true,
      type: "CallExpression",
      callee: {
        magic: true,
        type: "Identifier",
        name: patcher.instance.getLink("DEBUG_BREAK")
      },
      arguments: [
        parseExpression(hash),
        label,
        parseExpression("this")
      ]
    },
    consequent: {
      magic: true,
      type: "BreakStatement",
      label: node.label
    },
    alternate: null
  };
  for (let key in expr) {
    if (!expr.hasOwnProperty(key)) continue;
    node[key] = expr[key];
  }
  node.magic = true;
};

STAGE1.ContinueStatement = function(node, patcher) {
  if (node.magic) return;
  let hash = uBranchHash();
  // create node link
  patcher.nodes[hash] = {
    hash: hash,
    node: cloneNode(node)
  };
  if (node.label) patcher.walk(node.label, patcher, patcher.stage);
  let label = parseExpression(
    node.label ? `"${node.label.name}"` : "null"
  );
  let expr = {
    magic: true,
    start: 0, end: 0,
    type: "IfStatement",
    test: {
      type: "CallExpression",
      callee: {
        magic: true,
        type: "Identifier",
        name: patcher.instance.getLink("DEBUG_CONTINUE")
      },
      arguments: [
        parseExpression(hash),
        label,
        parseExpression("this")
      ]
    },
    consequent: {
      magic: true,
      type: "ContinueStatement",
      label: node.label
    },
    alternate: null
  };
  for (let key in expr) {
    if (!expr.hasOwnProperty(key)) continue;
    node[key] = expr[key];
  }
  node.magic = true;
};

STAGE1.VariableDeclaration = function(node, patcher) {
  if (node.magic) return;
  let ihash = uBranchHash();
  // create node link
  let clone = cloneNode(node);
  patcher.nodes[ihash] = {
    hash: ihash,
    node: clone
  };
  node.magic = true;
  let decls = node.declarations;
  // walk
  for (let ii = 0; ii < decls.length; ++ii) {
    patcher.walk(decls[ii], patcher, patcher.stage);
  }
  // patch
  for (let ii = 0; ii < decls.length; ++ii) {
    let decl = decls[ii];
    let declClone = clone.declarations[ii];
    if (decl.magic) continue;
    let init = decl.init;
    decl.magic = true;
    let dhash = uBranchHash();
    // create node link
    patcher.nodes[dhash] = {
      hash: dhash,
      node: declClone
    };
    decl.init = {
      magic: true,
      type: "CallExpression",
      callee: {
        magic: true,
        type: "Identifier",
        name: patcher.instance.getLink("DEBUG_VAR_INIT")
      },
      arguments: [
        parseExpression(ihash),
        // fire declaration instant by placing a call wrapper around
        // then assign its value afterwards
        {
          magic: true,
          type: "CallExpression",
          callee: {
            magic: true,
            type: "Identifier",
            name: patcher.instance.getLink("DEBUG_VAR_DECLARE")
          },
          arguments: [
            parseExpression(dhash),
            {
              magic: true,
              type: "Literal",
              value: decl.id.name,
              raw: `"${decl.id.name}"`
            }
          ]
        }
      ]
    };
    if (init !== null) decl.init.arguments.push(init);
  }
};

STAGE1.NewExpression = function(node, patcher) {
  if (node.magic) return;
  node.magic = true;
  patcher.walk(node.callee, patcher, patcher.stage);
  node.arguments.map((arg) => {
    patcher.walk(arg, patcher, patcher.stage);
  });
  let callee = cloneNode(node.callee);
  let args = [
    callee,
    {
      magic: true,
      type: "ArrayExpression",
      elements: [...node.arguments]
    }
  ];
  let hash = uBranchHash();
  // create node link
  patcher.nodes[hash] = {
    hash: hash,
    node: cloneNode(node)
  };

  node.callee = {
    magic: true,
    type: "Identifier",
    name: patcher.instance.getLink("DEBUG_OP_NEW_END")
  };
  node.arguments = [
    parseExpression(hash),
    parseExpression(patcher.instance.key),
    {
      magic: true,
      type: "CallExpression",
      callee: {
        magic: true,
        type: "Identifier",
        name: patcher.instance.getLink("DEBUG_OP_NEW")
      },
      arguments: [
        parseExpression(hash),
        ...args
      ]
    },
  ];
};

STAGE1.ObjectExpression = function(node, patcher) {
  if (node.magic) return;
  let hash = uBranchHash();
  // create node link
  patcher.nodes[hash] = {
    hash: hash,
    node: cloneNode(node)
  };
  node.magic = true;
  node.properties.map((prop) => { patcher.walk(prop, patcher, patcher.stage); });
  let call = {
    magic: true,
    type: "CallExpression",
    callee: {
      magic: true,
      type: "Identifier",
      name: patcher.instance.getLink("DEBUG_ALLOC")
    },
    arguments: [
      parseExpression(hash),
      cloneNode(node)
    ]
  };
  delete node.properties;
  for (let key in call) {
    if (!call.hasOwnProperty(key)) continue;
    node[key] = call[key];
  }
};

STAGE1.MemberExpression = function(node, patcher) {
  if (node.magic) {
    patcher.walk(node.object, patcher, patcher.stage);
    patcher.walk(node.property, patcher, patcher.stage);
    return;
  }
  let hash = uBranchHash();
  // create node link
  patcher.nodes[hash] = {
    hash: hash,
    node: cloneNode(node)
  };
  node.magic = true;
  patcher.walk(node.object, patcher, patcher.stage);
  patcher.walk(node.property, patcher, patcher.stage);
  let property = node.property;
  if (node.property.type === "Identifier") {
    property = {
      magic: true,
      type: "Literal",
      value: property.name
    };
  }
  let call = {
    magic: true,
    type: "CallExpression",
    callee: {
      magic: true,
      type: "Identifier",
      name: patcher.instance.getLink("DEBUG_MEMBER_EXPR")
    },
    arguments: [
      parseExpression(hash),
      node.object,
      property
    ]
  };
  call = {
    magic: true,
    type: "MemberExpression",
    object: call,
    property: node.property
  };
  for (let key in call) {
    if (!call.hasOwnProperty(key)) continue;
    node[key] = call[key];
  }
};

STAGE1.AssignmentExpression = function(node, patcher) {
  if (node.magic) {
    node.left.magic = true;
    patcher.walk(node.left, patcher, patcher.stage);
    patcher.walk(node.right, patcher, patcher.stage);
    return;
  }
  let hash = uBranchHash();
  // create node link
  patcher.nodes[hash] = {
    hash: hash,
    node: cloneNode(node)
  };
  node.magic = true;
  node.left.magic = true;
  let left = node.left;
  let right = node.right;
  let operator = node.operator;
  if (operator !== "=") {
    operator = operator.substr(0, operator.length - 1);
  }
  // #object assignment
  let object = null;
  let property = null;
  // skip the last property and manually
  // access it inside the debug function
  if (left.type === "MemberExpression") {
    if (left.property.type === "Identifier") {
      if (left.computed) {
        property = left.property;
      } else {
        property = {
          magic: true,
          type: "Literal",
          value: left.property.name
        };
      }
    } else {
      property = left.property;
    }
    object = left.object;
  }
  // identifier based assignment
  // fixed up below by turning into assign expr again
  else if (left.type === "Identifier") {
    object = left;
    property = parseExpression(null);
  }
  let call = {
    magic: true,
    type: "CallExpression",
    callee: {
      magic: true,
      type: "Identifier",
      name: patcher.instance.getLink("DEBUG_ASSIGN")
    },
    arguments: [
      parseExpression(hash),
      parseExpression(OP[operator]),
      (
        left.type === "Identifier" ?
        parseExpression(`"${left.name}"`) :
        object
      ),
      property,
      right
    ]
  };
  // #identifier assignment
  if (left.type === "Identifier") {
    call = {
      magic: true,
      type: "AssignmentExpression",
      operator: node.operator,
      left: object,
      right: call
    };
  }
  patcher.walk(node.left, patcher, patcher.stage);
  patcher.walk(node.right, patcher, patcher.stage);
  for (let key in call) {
    if (!call.hasOwnProperty(key)) continue;
    node[key] = call[key];
  }
};

STAGE1.UpdateExpression = function(node, patcher) {
  if (node.magic) {
    patcher.walk(node.argument, patcher, patcher.stage);
    return;
  }
  node.magic = true;
  patcher.walk(node.argument, patcher, patcher.stage);
  let hash = uBranchHash();
  // create node link
  let clone = cloneNode(node);
  patcher.nodes[hash] = {
    hash: hash,
    node: clone
  };
  let arg = node.argument;
  let operator = node.operator;
  // #object assignment
  let object = null;
  let property = null;
  // skip the last property and manually
  // access it inside the debug function
  if (arg.type === "MemberExpression") {
    if (arg.property.type === "Identifier") {
      if (arg.computed) {
        property = arg.property;
      } else {
        property = {
          magic: true,
          type: "Literal",
          value: arg.property.name
        };
      }
    } else {
      property = arg.property;
    }
    object = arg.object;
  }
  // identifier based assignment
  // fixed up below by turning into assign expr again
  else if (arg.type === "Identifier") {
    object = arg;
    property = parseExpression(null);
  }
  let call = {
    magic: true,
    type: "CallExpression",
    callee: {
      magic: true,
      type: "Identifier",
      name: patcher.instance.getLink("DEBUG_UPDATE")
    },
    arguments: [
      parseExpression(hash),
      parseExpression(OP[operator]),
      clone,
      parseExpression(node.prefix)
    ]
  };
  for (let key in call) {
    if (!call.hasOwnProperty(key)) continue;
    node[key] = call[key];
  }
};

STAGE1.ArrayExpression = function(node, patcher) {
  if (node.magic) return;
  let hash = uBranchHash();
  // create node link
  patcher.nodes[hash] = {
    hash: hash,
    node: cloneNode(node)
  };
  node.magic = true;
  node.elements.map((el) => { if (el !== null) patcher.walk(el, patcher, patcher.stage); });
  let call = {
    magic: true,
    type: "CallExpression",
    callee: {
      magic: true,
      type: "Identifier",
      name: patcher.instance.getLink("DEBUG_ALLOC")
    },
    arguments: [
      parseExpression(hash),
      cloneNode(node)
    ]
  };
  delete node.elements;
  for (let key in call) {
    if (!call.hasOwnProperty(key)) continue;
    node[key] = call[key];
  }
};

STAGE1.Literal = function(node, patcher) {
  if (node.magic) return;
  let hash = uBranchHash();
  let clone = cloneNode(node);
  // create node link
  patcher.nodes[hash] = {
    hash: hash,
    node: clone
  };
  node.magic = true;
  let call = {
    magic: true,
    type: "CallExpression",
    callee: {
      magic: true,
      type: "Identifier",
      name: patcher.instance.getLink("DEBUG_LITERAL")
    },
    arguments: [
      parseExpression(hash),
      clone
    ]
  };
  for (let key in call) {
    if (!call.hasOwnProperty(key)) continue;
    node[key] = call[key];
  }
};

STAGE1.ForStatement = function(node, patcher) {
  if (!node.hasOwnProperty("labels")) node.labels = [];
  patcher.pushScope(node);
  if (node.test) patcher.walk(node.test, patcher, patcher.stage);
  if (node.init) patcher.walk(node.init, patcher, patcher.stage);
  if (node.update) patcher.walk(node.update, patcher, patcher.stage);
  patcher.walk(node.body, patcher, patcher.stage);
  patcher.popScope();
};

STAGE1.ForInStatement = function(node, patcher) {
  node.left.magic = true;
  patcher.pushScope(node);
  patcher.walk(node.left, patcher, patcher.stage);
  patcher.walk(node.right, patcher, patcher.stage);
  patcher.walk(node.body, patcher, patcher.stage);
  patcher.popScope();
};

STAGE1.ForOfStatement = function(node, patcher) {
  node.left.magic = true;
  patcher.pushScope(node);
  patcher.walk(node.left, patcher, patcher.stage);
  patcher.walk(node.right, patcher, patcher.stage);
  patcher.walk(node.body, patcher, patcher.stage);
  patcher.popScope();
};

STAGE1.WhileStatement = function(node, patcher) {
  patcher.pushScope(node);
  if (node.test) patcher.walk(node.test, patcher, patcher.stage);
  patcher.walk(node.body, patcher, patcher.stage);
  patcher.popScope();
};

STAGE1.DoWhileStatement = function(node, patcher) {
  patcher.pushScope(node);
  if (node.test) patcher.walk(node.test, patcher, patcher.stage);
  patcher.walk(node.body, patcher, patcher.stage);
  patcher.popScope();
};

let STAGE2 = {};

STAGE2.IfStatement = function(node, patcher) {
  if (node.magic) {
    patcher.walk(node.test, patcher, patcher.stage);
    patcher.walk(node.consequent, patcher, patcher.stage);
    if (node.alternate) patcher.walk(node.alternate, patcher, patcher.stage);
    return;
  }
  node.magic = true;

  let test = cloneNode(node.test);
  // branch hash
  let elseHash = uBranchHash();
  let isElse = (
    node.alternate &&
    node.alternate.type !== "IfStatement"
  );
  let isBlockedElse = (
    isElse &&
    node.alternate.body === "BlockStatement"
  );

  if (isElse) {
    // create node link
    let link = {
      hash: elseHash,
      node: null
    };
    patcher.nodes[elseHash] = link;
    link.node = cloneNode(node.alternate);
    if (!isBlockedElse) {
      // force else to be blocked
      let alternate = node.alternate;
      node.alternate = parseExpressionStatement("{}");
      node.alternate.body.push(alternate);
    }
  }

  // branch hash
  let ifHash = uBranchHash();
  // create node link
  patcher.nodes[ifHash] = {
    hash: ifHash,
    node: cloneNode(node)
  };

  patcher.walk(node.test, patcher, patcher.stage);
  patcher.walk(node.consequent, patcher, patcher.stage);
  if (node.alternate) patcher.walk(node.alternate, patcher, patcher.stage);

  let id = reserveTempVarId();
  let patch = parseExpressionStatement(`var ${id};`);
  injectPatchIntoNode(patcher.scope.node, patch);

  // debug if test
  node.test = {
    magic: true,
    type: "AssignmentExpression",
    operator: "=",
    left: parseExpression(id),
    right: {
      magic: true,
      type: "CallExpression",
      callee: {
        magic: true,
        type: "Identifier",
        name: patcher.instance.getLink("DEBUG_IF_TEST")
      },
      arguments: [
        parseExpression(ifHash),
        node.test
      ]
    }
  };

  // patch else enter, leave
  if (isElse) {
    let end = parseExpressionStatement(patcher.instance.getLinkCall("DEBUG_ELSE_LEAVE"));
    let start = parseExpressionStatement(patcher.instance.getLinkCall("DEBUG_ELSE_ENTER"));
    end.expression.arguments.push(
      parseExpression(elseHash)
    );
    start.expression.arguments.push(
      parseExpression(elseHash)
    );
    node.alternate.body.unshift(start);
    node.alternate.body.push(end);
  }

  // debug if body enter, leave
  let end = parseExpressionStatement(patcher.instance.getLinkCall("DEBUG_IF_LEAVE"));
  let start = parseExpressionStatement(patcher.instance.getLinkCall("DEBUG_IF_ENTER"));
  // branch hash
  end.expression.arguments.push(
    parseExpression(ifHash)
  );
  // branch hash
  start.expression.arguments.push(
    parseExpression(ifHash)
  );
  // pass in condition result into if enter
  start.expression.arguments.push(parseExpression(id));
  if (node.consequent.type === "BlockStatement") {
    node.consequent.body.unshift(start);
    node.consequent.body.push(end);
  } else {
    node.consequent = {
      type: "BlockStatement",
      body: [start, node.consequent, end]
    };
  }

};

STAGE2.Program = STAGE1.Program;
STAGE2.BlockStatement = STAGE1.BlockStatement;
STAGE2.MethodDefinition = STAGE1.MethodDefinition;
STAGE2.FunctionDeclaration = STAGE1.FunctionDeclaration;
STAGE2.FunctionExpression = STAGE1.FunctionExpression;
STAGE2.ArrowFunctionExpression = STAGE1.ArrowFunctionExpression;

let STAGE3 = {};

STAGE3.BlockStatement = function(node, patcher) {
  let body = node.body;
  // transform try, switch and labels here
  for (let ii = 0; ii < body.length; ++ii) {
    let child = body[ii];
    //if (child.magic) continue;
    // labeled statement
    let isLabeledStmt = isLabeledStatement(child.type);
    if (isLabeledStmt) {
      child = processLabels(child);
    }
    let isTryStmt = isTryStatement(child.type);
    let isSwitchStmt = isSwitchStatement(child.type);
    let hash = -1;
    let isHashBranch = (
      isTryStmt ||
      isSwitchStmt
    );
    // only generate hash if necessary
    if (isHashBranch) hash = uBranchHash();
    // #ENTER
    if (isHashBranch) {
      let link = patcher.instance.getLinkCall(
        isTryStmt ? "DEBUG_TRY_ENTER" :
        isSwitchStmt ? "DEBUG_SWITCH_ENTER" :
        "" // throws error
      );
      let start = parseExpressionStatement(link);
      patcher.nodes[hash] = {
        hash: hash,
        node: cloneNode(child)
      };
      start.expression.arguments.push(
        parseExpression(hash)
      );
      body.splice(ii, 0, start);
      ii++;
    }
    // switch test
    if (isSwitchStmt) {
      let test = {
        magic: true,
        type: "CallExpression",
        callee: {
          magic: true,
          type: "Identifier",
          name: patcher.instance.getLink("DEBUG_SWITCH_TEST")
        },
        arguments: [
          parseExpression(hash),
          child.discriminant
        ]
      };
      child.discriminant = test;
    }
    patcher.walk(child, patcher, patcher.stage);
    // #LEAVE
    if (isHashBranch) {
      let link = patcher.instance.getLinkCall(
        isTryStmt ? "DEBUG_TRY_LEAVE" :
        isSwitchStmt ? "DEBUG_SWITCH_LEAVE" :
        "" // throws error
      );
      let end = parseExpressionStatement(link);
      end.expression.arguments.push(
        parseExpression(hash)
      );
      body.splice(ii + 1, 0, end);
      ii++;
      if (isTryStmt) {
        if (child.finalizer) STAGE3.FinalClause(child.finalizer, patcher);
      }
    }
  }
};

STAGE3.CatchClause = function(node, patcher) {
  if (node.magic) return;
  patcher.pushScope(node);
  patcher.walk(node.param, patcher, patcher.stage);
  patcher.walk(node.body, patcher, patcher.stage);

  let hash = uBranchHash();
  // create node link
  patcher.nodes[hash] = {
    hash: hash,
    node: cloneNode(node)
  };
  let hashExpr = parseExpression(hash);
  let end = parseExpressionStatement(patcher.instance.getLinkCall("DEBUG_CATCH_LEAVE"));
  let start = parseExpressionStatement(patcher.instance.getLinkCall("DEBUG_CATCH_ENTER"));
  end.expression.arguments.push(hashExpr);
  start.expression.arguments.push(hashExpr);
  node.body.body.unshift(start);
  node.body.body.push(end);

  patcher.popScope();
};

STAGE3.FinalClause = function(node, patcher) {
  if (node.magic) return;
  patcher.pushScope(node);
  patcher.walk(node, patcher, patcher.stage);

  let hash = uBranchHash();
  // create node link
  patcher.nodes[hash] = {
    hash: hash,
    node: cloneNode(node)
  };
  let hashExpr = parseExpression(hash);
  let end = parseExpressionStatement(patcher.instance.getLinkCall("DEBUG_FINAL_LEAVE"));
  let start = parseExpressionStatement(patcher.instance.getLinkCall("DEBUG_FINAL_ENTER"));
  end.expression.arguments.push(hashExpr);
  start.expression.arguments.push(hashExpr);
  node.body.unshift(start);
  node.body.push(end);

  patcher.popScope();
};

STAGE3.Program = STAGE1.Program;
STAGE3.MethodDefinition = STAGE1.MethodDefinition;
STAGE3.FunctionDeclaration = STAGE1.FunctionDeclaration;
STAGE3.FunctionExpression = STAGE1.FunctionExpression;
STAGE3.ArrowFunctionExpression = STAGE1.ArrowFunctionExpression;

let STAGE4 = {};

STAGE4.SwitchStatement = function(node, patcher) {
  if (node.magic) {
    patcher.walk(node.discriminant, patcher, patcher.stage);
    node.cases.map((cs) => {
      patcher.walk(cs, patcher, patcher.stage);
    });
    return;
  }
  node.magic = true;

  let hash = uBranchHash();
  patcher.nodes[hash] = {
    hash: hash,
    node: cloneNode(node)
  };

  patcher.walk(node.discriminant, patcher, patcher.stage);
  node.cases.map((cs) => {
    patcher.walk(cs, patcher, patcher.stage);
  });

  let id = reserveTempVarId();
  let patch = parseExpressionStatement(`var ${id};`);
  injectPatchIntoNode(patcher.scope.node, patch);

  // debug if test
  node.discriminant = {
    magic: true,
    type: "AssignmentExpression",
    operator: "=",
    left: parseExpression(id),
    right: node.discriminant
  };

};

STAGE4.SwitchCase = function(node, patcher) {
  if (node.magic) {
    if (node.test) patcher.walk(node.test, patcher, patcher.stage);
    node.consequent.map((cons) => {
      patcher.walk(cons, patcher, patcher.stage);
    });
    return;
  }
  node.magic = true;

  let hash = uBranchHash();

  patcher.nodes[hash] = {
    hash: hash,
    node: cloneNode(node)
  };

  let test = null;
  if (node.test) {
    let id = reserveTempVarId();
    let patch = parseExpressionStatement(`var ${id};`);
    injectPatchIntoNode(patcher.scope.node, patch);
    test = parseExpression(id);
    // debug if test
    node.test = {
      magic: true,
      type: "AssignmentExpression",
      operator: "=",
      left: test,
      right: node.test
    };
    node.test = {
      magic: true,
      type: "CallExpression",
      callee: {
        magic: true,
        type: "Identifier",
        name: patcher.instance.getLink("DEBUG_CASE_TEST")
      },
      arguments: [
        parseExpression(hash),
        node.test
      ]
    };
  }

  // default or case
  let type = (
    test !== null ? test : parseExpression("null")
  );

  let start = parseExpressionStatement(
    patcher.instance.getLinkCall("DEBUG_CASE_ENTER")
  );
  // pass case test result
  start.expression.arguments.push(
    parseExpression(hash)
  );
  // pass case value
  start.expression.arguments.push(test || parseExpression(null));
  // trace default case
  start.expression.arguments.push(
    parseExpression(test === null)
  );
  node.consequent.splice(0, 0, start);

  let end = parseExpressionStatement(
    patcher.instance.getLinkCall("DEBUG_CASE_LEAVE")
  );
  end.expression.arguments.push(
    parseExpression(hash)
  );
  node.consequent.splice(node.consequent.length, 0, end);

};

STAGE4.Program = STAGE1.Program;
STAGE4.BlockStatement = STAGE1.BlockStatement;
STAGE4.MethodDefinition = STAGE1.MethodDefinition;
STAGE4.FunctionDeclaration = STAGE1.FunctionDeclaration;
STAGE4.FunctionExpression = STAGE1.FunctionExpression;
STAGE4.ArrowFunctionExpression = STAGE1.ArrowFunctionExpression;

let STAGE5 = {};

STAGE5.ClassDeclaration = function(node, patcher) {
  patcher.pushScope(node);
  patcher.walk(node.id, patcher, patcher.stage);
  patcher.walk(node.body, patcher, patcher.stage);
  patcher.popScope();
};

STAGE5.MethodDefinition = function(node, patcher) {
  if (node.magic) {
    patcher.pushScope(node);
    patcher.walk(node.key, patcher, patcher.stage);
    patcher.walk(node.value, patcher, patcher.stage);
    patcher.popScope();
    return;
  }

  let scope = patcher.scope;
  // branch hash
  let hash = uBranchHash();
  // create node link
  patcher.nodes[hash] = {
    hash: hash,
    node: cloneNode(node)
  };

  node.magic = true;
  node.value.superIndex = -1;
  node.value.superNode = null;
  patcher.pushScope(node);
  patcher.walk(node.key, patcher, patcher.stage);
  patcher.walk(node.value, patcher, patcher.stage);

  let isConstructor = node.kind === "constructor";

  let end = parseExpressionStatement(patcher.instance.getLinkCall("DEBUG_METHOD_LEAVE"));
  let start = parseExpressionStatement(patcher.instance.getLinkCall("DEBUG_METHOD_ENTER"));
  let body = node.value.body.body;

  start.expression.arguments.push(parseExpression("this"));
  start.expression.arguments.push(parseExpression("arguments"));

  // patch constructor
  if (isConstructor) {
    if (node.value.superNode !== null) {
      // only function expressions supported for now
      console.assert(node.value.type === "FunctionExpression");
      // find super class call
      // patch in ctor enter, leave afterwards
      let index = node.value.superIndex;
      body.splice(index + 1, 0, start);
      body.splice(index + body.length, 0, end);
    } else {
      body.splice(0, 0, start);
      body.splice(body.length, 0, end);
    }
  } else {
    body.splice(0, 0, start);
    body.splice(body.length, 0, end);
  }

  // constructor state
  end.expression.arguments.unshift(parseExpression(isConstructor));
  start.expression.arguments.unshift(parseExpression(isConstructor));

  // class name
  end.expression.arguments.unshift(scope.node.id);
  start.expression.arguments.unshift(scope.node.id);

  // hash
  end.expression.arguments.unshift(parseExpression(hash));
  start.expression.arguments.unshift(parseExpression(hash));

  patcher.popScope();
};

STAGE5.CallExpression = function(node, patcher) {
  if (node.magic) return;
  // dont patch super class calls
  if (node.callee && node.callee.type === "Super") {
    let scope = patcher.scope.node;
    let index = -1;
    console.assert(scope.type === "FunctionExpression");
    scope.body.body.map((child, idx) => {
      console.assert(child.type === "ExpressionStatement");
      if (child.expression === node) {
        index = idx;
      }
    });
    console.assert(index !== -1);
    scope.superIndex = index;
    scope.superNode = node;

    // patch debug super
    node.arguments = [
      {
        magic: true,
        type: "CallExpression",
        callee: {
          magic: true,
          type: "Identifier",
          name: patcher.instance.getLink("DEBUG_SUPER")
        },
        arguments: [
          // class ctor
          patcher.scope.parent.parent.node.id,
          {
            magic: true,
            type: "SpreadElement",
            argument: {
              magic: true,
              type: "ArrayExpression",
              elements: node.arguments
            }
          }
        ]
      }
    ];
  }
};

STAGE5.Program = STAGE1.Program;
STAGE5.BlockStatement = STAGE1.BlockStatement;
STAGE5.FunctionDeclaration = STAGE1.FunctionDeclaration;
STAGE5.FunctionExpression = STAGE1.FunctionExpression;
STAGE5.ArrowFunctionExpression = STAGE1.ArrowFunctionExpression;

let STAGE6 = {};

STAGE6.FunctionDeclaration = function(node, patcher) {
  patcher.pushScope(node);
  patcher.walk(node.id, patcher, patcher.stage);
  node.params.map((param) => { patcher.walk(param, patcher, patcher.stage); });
  patcher.walk(node.body, patcher, patcher.stage);

  let hash = uBranchHash();
  // create node link
  patcher.nodes[hash] = {
    hash: hash,
    node: cloneNode(node)
  };
  let hashExpr = parseExpression(hash);
  let end = parseExpressionStatement(patcher.instance.getLinkCall("DEBUG_FUNCTION_LEAVE"));
  let start = parseExpressionStatement(patcher.instance.getLinkCall("DEBUG_FUNCTION_ENTER"));
  end.expression.arguments.push(hashExpr);
  end.expression.arguments.push(parseExpression("this"));
  start.expression.arguments.push(hashExpr);
  start.expression.arguments.push(parseExpression("this"));
  start.expression.arguments.push(parseExpression(node.id.name));
  start.expression.arguments.push(parseExpression("arguments"));
  node.body.body.unshift(start);
  node.body.body.push(end);

  patcher.popScope();
};

STAGE6.FunctionExpression = function(node, patcher) {
  if (patcher.scope.node.type === "MethodDefinition") return;
  patcher.pushScope(node);
  patcher.walk(node.id, patcher, patcher.stage);
  node.params.map((param) => { patcher.walk(param, patcher, patcher.stage); });
  patcher.walk(node.body, patcher, patcher.stage);

  let hash = uBranchHash();
  // create node link
  patcher.nodes[hash] = {
    hash: hash,
    node: cloneNode(node)
  };
  let hashExpr = parseExpression(hash);
  let end = parseExpressionStatement(patcher.instance.getLinkCall("DEBUG_FUNCTION_LEAVE"));
  let start = parseExpressionStatement(patcher.instance.getLinkCall("DEBUG_FUNCTION_ENTER"));
  end.expression.arguments.push(hashExpr);
  end.expression.arguments.push(parseExpression("this"));
  start.expression.arguments.push(hashExpr);
  start.expression.arguments.push(parseExpression("this"));
  start.expression.arguments.push(parseExpression(node.id.name));
  start.expression.arguments.push(parseExpression("arguments"));
  node.body.body.unshift(start);
  node.body.body.push(end);

  patcher.popScope();
};

STAGE6.ArrowFunctionExpression = function(node, patcher) {
  patcher.pushScope(node);
  node.params.map((param) => { patcher.walk(param, patcher, patcher.stage); });
  patcher.walk(node.body, patcher, patcher.stage);

  let hash = uBranchHash();
  // create node link
  patcher.nodes[hash] = {
    hash: hash,
    node: cloneNode(node)
  };
  let hashExpr = parseExpression(hash);
  let end = parseExpressionStatement(patcher.instance.getLinkCall("DEBUG_FUNCTION_LEAVE"));
  let start = parseExpressionStatement(patcher.instance.getLinkCall("DEBUG_FUNCTION_ENTER"));
  end.expression.arguments.push(hashExpr);
  end.expression.arguments.push(parseExpression("this"));
  start.expression.arguments.push(hashExpr);
  start.expression.arguments.push(parseExpression("this"));
  start.expression.arguments.push(parseExpression(node.id.name));
  let args = {
    magic: true,
    type: "ArrayExpression",
    elements: []
  };
  node.params.map((param) => {
    args.elements.push(param);
  });
  start.expression.arguments.push(args);
  node.body.body.unshift(start);
  node.body.body.push(end);

  patcher.popScope();
};

STAGE6.Program = STAGE1.Program;
STAGE6.BlockStatement = STAGE1.BlockStatement;
STAGE6.MethodDefinition = STAGE1.MethodDefinition;

let STAGE7 = {};

STAGE7.BlockStatement = function(node, patcher) {
  let body = node.body;
  for (let ii = 0; ii < body.length; ++ii) {
    let child = body[ii];
    //if (child.magic) continue;
    //child.magic = true;

    // labeled statement
    let isLabeledStmt = isLabeledStatement(child.type);
    if (isLabeledStmt) {
      child = processLabels(child);
    }

    let isLazyBlock = (
      child.type === "BlockStatement"
    );
    let isLoopStmt = isLoopStatement(child.type);
    let isSwitchStmt = isSwitchStatement(child.type);
    let isHashBranch = (
      isLoopStmt ||
      isLazyBlock
    );
    let hash = -1;
    let id = null;
    if (isHashBranch) {
      // generate hash
      hash = uBranchHash();
      id = reserveTempVarId();
      patcher.nodes[hash] = {
        hash: hash,
        node: cloneNode(child)
      };
    }

    if (isLazyBlock) {
      let start = {
        magic: true,
        type: "ExpressionStatement",
        expression: {
          magic: true,
          type: "CallExpression",
          callee: {
            magic: true,
            type: "Identifier",
            name: patcher.instance.getLink("DEBUG_BLOCK_ENTER")
          },
          arguments: [
            parseExpression(hash)
          ]
        }
      };
      let end = {
        magic: true,
        type: "ExpressionStatement",
        expression: {
          magic: true,
          type: "CallExpression",
          callee: {
            magic: true,
            type: "Identifier",
            name: patcher.instance.getLink("DEBUG_BLOCK_LEAVE")
          },
          arguments: [ parseExpression(hash) ]
        }
      };
      child.body.unshift(start);
      child.body.push(end);
      patcher.walk(child, patcher, patcher.stage);
      continue;
    }

    if (isLoopStmt) {
      forceLoopBodyBlocked(child);
      console.assert(child.body.type === "BlockStatement");

      let patch = parseExpressionStatement(`var ${id} = 0;`);
      body.splice(ii, 0, patch);
      ii++;

      let test = {
        magic: true,
        type: "CallExpression",
        callee: {
          magic: true,
          type: "Identifier",
          name: patcher.instance.getLink("DEBUG_LOOP_TEST")
        },
        arguments: [
          parseExpression(hash),
          child.test ? child.test : (
            // empty for test means infinite
            child.type === "ForStatement" ?
            parseExpression(true) :
            "" // throws error
          ),
          parseExpression(`"${child.type}"`)
        ]
      };
      child.test = test;

      let start = {
        magic: true,
        type: "IfStatement",
        test: parseExpression(`${id} === 0`),
        alternate: null,
        consequent: {
          magic: true,
          type: "ExpressionStatement",
          expression: {
            magic: true,
            type: "CallExpression",
            callee: {
              magic: true,
              type: "Identifier",
              name: patcher.instance.getLink("DEBUG_LOOP_ENTER")
            },
            arguments: [
              parseExpression(hash),
              // set the loop enter state to fullfilled
              parseExpression(`${id} = 1`),
              parseExpression(`"${child.type}"`)
            ]
          }
        }
      };
      child.body.body.unshift(start);
    }
    patcher.walk(child, patcher, patcher.stage);
    if (isLoopStmt) {
      let end = {
        magic: true,
        type: "ExpressionStatement",
        expression: {
          magic: true,
          type: "CallExpression",
          callee: {
            magic: true,
            type: "Identifier",
            name: patcher.instance.getLink("DEBUG_LOOP_LEAVE")
          },
          arguments: [
            parseExpression(hash),
            parseExpression(id),
            parseExpression(`"${child.type}"`),
          ]
        }
      };
      body.splice(ii + 1, 0, end);
      ii++;
    }
  }
};

STAGE7.Program = STAGE1.Program;
STAGE7.MethodDefinition = STAGE1.MethodDefinition;
STAGE7.FunctionDeclaration = STAGE1.FunctionDeclaration;
STAGE7.FunctionExpression = STAGE1.FunctionExpression;
STAGE7.ArrowFunctionExpression = STAGE1.ArrowFunctionExpression;

let STAGE8 = {};

STAGE8.ThisExpression = function(node, patcher) {
  if (node.magic) return;
  let hash = uBranchHash();
  // create node link
  patcher.nodes[hash] = {
    hash: hash,
    node: cloneNode(node)
  };
  node.magic = true;
  node.type = "CallExpression";
  node.callee = {
    magic: true,
    type: "Identifier",
    name: patcher.instance.getLink("DEBUG_THIS")
  };
  node.arguments = [
    parseExpression(hash),
    parseExpression("this")
  ];
};

STAGE8.BinaryExpression = function(node, patcher) {
  if (node.magic) return;
  let hash = uBranchHash();
  // create node link
  patcher.nodes[hash] = {
    hash: hash,
    node: cloneNode(node)
  };
  patcher.walk(node.left, patcher, patcher.stage);
  patcher.walk(node.right, patcher, patcher.stage);
  node.magic = true;
  node.type = "CallExpression";
  node.callee = {
    magic: true,
    type: "Identifier",
    name: patcher.instance.getLink("DEBUG_BINARY")
  };
  node.arguments = [
    parseExpression(hash),
    parseExpression(OP[node.operator]),
    node.left,
    node.right
  ];
};

STAGE8.LogicalExpression = function(node, patcher) {
  if (node.magic) return;
  let hash = uBranchHash();
  // create node link
  patcher.nodes[hash] = {
    hash: hash,
    node: cloneNode(node)
  };
  patcher.walk(node.left, patcher, patcher.stage);
  patcher.walk(node.right, patcher, patcher.stage);
  node.magic = true;
  node.type = "CallExpression";
  node.callee = {
    magic: true,
    type: "Identifier",
    name: patcher.instance.getLink("DEBUG_LOGICAL")
  };
  let right = parseExpression("(function() { }).bind(this)");
  // enter bind expression to get the binded function
  let fn = right.callee.object;
  fn.body.body.push({
    magic: true,
    type: "ReturnStatement",
    argument: node.right
  });
  node.arguments = [
    parseExpression(hash),
    parseExpression(OP[node.operator]),
    node.left,
    right
  ];
};

STAGE8.UnaryExpression = function(node, patcher) {
  if (node.magic) return;
  let hash = uBranchHash();
  // create node link
  patcher.nodes[hash] = {
    hash: hash,
    node: cloneNode(node)
  };
  node.magic = true;
  patcher.walk(node.argument, patcher, patcher.stage);
  node.type = "CallExpression";
  node.callee = {
    magic: true,
    type: "Identifier",
    name: patcher.instance.getLink("DEBUG_UNARY")
  };
  let argument = node.argument;
  // non-trackable yet FIXME
  if (node.operator === "delete") {
    argument = {
      magic: true,
      type: "UnaryExpression",
      operator: node.operator,
      prefix: true,
      argument: argument
    };
  }
  node.arguments = [
    parseExpression(hash),
    parseExpression(OP[node.operator]),
    parseExpression("this"),
    parseExpression(false),
    argument
  ];
  // typeof fixup
  // typeof is a weirdo
  if (node.operator === "typeof" && argument.type === "Identifier") {
    let id = reserveTempVarId();
    let patch = parseExpressionStatement(`var ${id};`);
    injectPatchIntoNode(patcher.scope.node, patch);
    let name = argument.name;
    // heute sind wir räudig
    let critical = parseExpression(
      `(function() { try { ${name}; } catch(e) { ${id} = "undefined"; return true; } ${id} = ${name}; return false; }).bind(this)()`
    );
    node.arguments = [
      parseExpression(hash),
      parseExpression(OP[node.operator]),
      parseExpression("this"),
      critical,
      parseExpression(id)
    ];
  }
};

STAGE8.ConditionalExpression = function(node, patcher) {
  if (node.magic) return;
  let hash = uBranchHash();
  // create node link
  patcher.nodes[hash] = {
    hash: hash,
    node: cloneNode(node)
  };
  node.magic = true;
  patcher.walk(node.test, patcher, patcher.stage);
  patcher.walk(node.consequent, patcher, patcher.stage);
  patcher.walk(node.alternate, patcher, patcher.stage);

  let cons = parseExpression("(function() { }).bind(this)");
  cons.callee.object.body.body.push({
    magic: true,
    type: "ReturnStatement",
    argument: node.consequent
  });
  let alt = parseExpression("(function() { }).bind(this)");
  alt.callee.object.body.body.push({
    magic: true,
    type: "ReturnStatement",
    argument: node.alternate
  });

  node.type = "CallExpression";
  node.callee = {
    magic: true,
    type: "Identifier",
    name: patcher.instance.getLink("DEBUG_TERNARY")
  };
  node.arguments = [
    parseExpression(hash),
    node.test,
    cons,
    alt
  ];
};

/*
STAGE8.Literal = function(node) {
  if (node.magic) return;
  let clone = Iroh.cloneNode(node);
  node.magic = true;
  node.type = "CallExpression";
  node.callee = {
    magic: true,
    type: "Identifier",
    name: Iroh.getLink("DEBUG_LITERAL")
  };
  node.arguments = [
    clone
  ];
};

STAGE8.Identifier = function(node) {
  if (node.magic) return;
  node.magic = true;
  let clone = Iroh.cloneNode(node);
  node.type = "CallExpression";
  node.callee = {
    magic: true,
    type: "Identifier",
    name: Iroh.getLink("DEBUG_IDENTIFIER")
  };
  node.arguments = [
    Iroh.parseExpression(`"${node.name}"`),
    clone
  ];
};
*/

STAGE8.Program = STAGE1.Program;
STAGE8.BlockStatement = STAGE1.BlockStatement;
STAGE8.MethodDefinition = STAGE1.MethodDefinition;
STAGE8.FunctionDeclaration = STAGE1.FunctionDeclaration;
STAGE8.FunctionExpression = STAGE1.FunctionExpression;
STAGE8.ArrowFunctionExpression = STAGE1.ArrowFunctionExpression;

class Patcher {
  constructor(instance) {
    this.uid = uid();
    // patch AST scope
    this.scope = null;
    // patch stage
    this.stage = null;
    // patch state
    this.state = null;
    // node symbols
    this.symbols = {};
    // node clones
    this.nodes = {};
    // stage instance
    this.instance = instance;
  }
}

Patcher.prototype.walk = function(ast, state, visitors) {
  return acorn_dist_walk.recursive(ast, state, visitors, acorn_dist_walk.base);
};

Patcher.prototype.pushScope = function(node) {
  let tmp = this.scope;
  this.scope = new Scope(node);
  this.scope.parent = tmp;
};

Patcher.prototype.popScope = function(node) {
  this.scope = this.scope.parent;
};

Patcher.prototype.applyStagePatch = function(ast, stage) {
  this.stage = stage;
  this.walk(ast, this, this.stage);
};

Patcher.prototype.applyPatches = function(ast) {
  this.applyStagePatch(ast, STAGE2);
  this.applyStagePatch(ast, STAGE7);
  this.applyStagePatch(ast, STAGE4);
  this.applyStagePatch(ast, STAGE5);
  this.applyStagePatch(ast, STAGE1);
  this.applyStagePatch(ast, STAGE3);
  this.applyStagePatch(ast, STAGE6);
  this.applyStagePatch(ast, STAGE8);
};

class RuntimeEvent {
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
}

class RuntimeListenerEvent {
  constructor(type, callback) {
    this.type = type;
    this.callback = callback;
  }
}

class RuntimeListener {
  constructor(category) {
    this.category = category;
    this.triggers = {};
  }
  on(type, callback) {
    let event = new RuntimeListenerEvent(type, callback);
    // not registered yet
    if (this.triggers[type] === void 0) {
      this.triggers[type] = [];
    }
    this.triggers[type].push(event);
    // allow stream calls
    return this;
  }
  trigger(event, trigger) {
    // any triggers registered?
    if (!this.triggers.hasOwnProperty(trigger)) return;
    let triggers = this.triggers[trigger];
    for (let ii = 0; ii < triggers.length; ++ii) {
      triggers[ii].callback(event);
    }
  }
}

function evalUnaryExpression(op, ctx, a) {
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
  }
}

function evalBinaryExpression(op, a, b) {
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
  }
}

function evalObjectAssignmentExpression(op, obj, prop, value) {
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
  }
}

// #IF
function DEBUG_IF_TEST(hash, value) {
  // API
  let event = this.createEvent(INSTR.IF_TEST);
  event.hash = hash;
  event.value = value;
  event.indent = this.indent;
  event.trigger("test");
  // API END
  return event.value;
}
function DEBUG_IF_ENTER(hash, value) {
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
}
function DEBUG_IF_LEAVE(hash) {
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
}

// #ELSE
function DEBUG_ELSE_ENTER(hash) {
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
}
function DEBUG_ELSE_LEAVE(hash) {
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
}

// #LOOPS
function DEBUG_LOOP_TEST(hash, value, kind) {
  // API
  let event = this.createEvent(INSTR.LOOP_TEST);
  event.hash = hash;
  event.indent = this.indent;
  event.value = value;
  event.kind = kind;
  event.trigger("test");
  // API END
  return event.value;
}
function DEBUG_LOOP_ENTER(hash, id, kind) {
  // API
  let event = this.createEvent(INSTR.LOOP_ENTER);
  event.hash = hash;
  event.indent = this.indent;
  event.kind = kind;
  event.trigger("enter");
  // API END
  //console.log(indentString(this.indent) + "loop", hash);
  // FRAME
  let frame = this.pushFrame(INSTR.LOOP_ENTER, hash);
  frame.values = [hash, 1];
  // FRAME END
  this.indent += INDENT_FACTOR;
}
function DEBUG_LOOP_LEAVE(hash, entered, kind) {
  // loop never entered, so dont leave it
  if (entered === 0) return;
  this.indent -= INDENT_FACTOR;
  // API
  let event = this.createEvent(INSTR.LOOP_LEAVE);
  event.hash = hash;
  event.indent = this.indent;
  event.kind = kind;
  event.trigger("leave");
  // API END
  //console.log(indentString(this.indent) + "loop end", hash);
  // FRAME
  this.popFrame();
  // FRAME END
}

// #FLOW
function DEBUG_BREAK(hash, label, ctx) {
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
}
function DEBUG_CONTINUE(hash, label, ctx) {
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
}

// # SWITCH
function DEBUG_SWITCH_TEST(hash, value) {
  // API
  let event = this.createEvent(INSTR.SWITCH_TEST);
  event.hash = hash;
  event.value = value;
  event.indent = this.indent;
  event.trigger("test");
  // API END
  return event.value;
}
function DEBUG_SWITCH_ENTER(hash) {
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
}
function DEBUG_SWITCH_LEAVE(hash) {
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
}

// #CASE
function DEBUG_CASE_TEST(hash, value) {
  // API
  let event = this.createEvent(INSTR.CASE_TEST);
  event.hash = hash;
  event.value = value;
  event.indent = this.indent;
  event.trigger("test");
  // API END
  return event.value;
}
function DEBUG_CASE_ENTER(hash, value, isDefault) {
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
}
function DEBUG_CASE_LEAVE(hash) {
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
}

// #CALL
function DEBUG_FUNCTION_CALL(hash, ctx, object, call, args) {
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
    proto = null;
  }
  name = root.name;

  let node = this.nodes[hash].node;
  // external functions are traced as sloppy
  let isSloppy = this.symbols[name] === void 0;

  node.isSloppy = isSloppy;

  // API
  let before = this.createEvent(INSTR.FUNCTION_CALL);
  before.hash = hash;
  before.context = ctx;
  before.object = proto;
  before.callee = call;
  before.name = callee;
  before.call = root;
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

  this.indent += INDENT_FACTOR; 
  // evaluate function bully protected
  try {
    value = before.call.apply(before.object, before.arguments);
  } catch (e) {
    let tryFrame = this.resolveTryFrame(this.frame, true);
    // error isn't try-catch wrapped
    if (tryFrame === null) {
      this.reset();
      throw e;
    // error is try-catch wrapped
    } else {
      let catchFrame = this.resolveCatchClauseFrame(this.frame, true);
      let finalFrame = this.resolveFinalClauseFrame(this.frame, true);
      // something failed inside the catch frame
      if (catchFrame !== null || finalFrame !== null) {
        this.reset();
        throw e;
      }
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
  after.call = root;
  after.arguments = before.arguments;
  after.return = value;
  after.external = isSloppy;
  after.indent = this.indent;
  after.trigger("after");
  // API END

  // FRAME
  this.popFrame();
  this.$$frameHash = previous;
  // FRAME END

  return after.return;
}

// #FUNCTION
function DEBUG_FUNCTION_ENTER(hash, ctx, scope, args) {
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
}
function DEBUG_FUNCTION_LEAVE(hash, ctx) {
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
}
function DEBUG_FUNCTION_RETURN(hash, name, value) {

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

  // FRAME
  let expect = this.resolveReturnFrame(this.frame);
  this.leaveFrameUntil(expect);
  // FRAME END
  this.currentScope = this.previousScope;

  if (isSloppy) {
    this.indent -= INDENT_FACTOR;
    //console.log(indentString(this.indent) + "call", name, "end #sloppy", "->", [value]);
  }
  return event.return;
}

// # DECLS
function DEBUG_VAR_DECLARE(hash, name) {
  //console.log(indentString(this.indent) + "▶️ Declare " + name);

  // API
  let event = this.createEvent(INSTR.VAR_DECLARE);
  event.hash = hash;
  event.name = name;
  event.indent = this.indent;
  event.trigger("before");
  // API END

  return name;
}
function DEBUG_VAR_INIT(hash, name, value) {
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
}

// #NEW
function DEBUG_OP_NEW(hash, ctor, args) {

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
}
function DEBUG_OP_NEW_END(hash, self, ret) {
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
}

// #SUPER
function DEBUG_SUPER(cls, args) {
  // API TODO
  return args;
}
// method enter not available before super
// super_fix is injected after super
function DEBUG_SUPER_FIX(ctx) {
  // API TODO
}

// # CLASS METHOD
function DEBUG_METHOD_ENTER(hash, cls, isConstructor, args) {
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
}
function DEBUG_METHOD_LEAVE(hash, cls, isConstructor) {
  // API TODO
  this.indent -= INDENT_FACTOR;
  console.log(indentString(this.indent) + (isConstructor ? "ctor" : "method") + " end");
  this.popFrame();
}

// #TRY
function DEBUG_TRY_ENTER(hash) {
  //console.log(indentString(this.indent) + "try");

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
}
function DEBUG_TRY_LEAVE(hash) {

  // FRAME
  // fix up missing left frames until try_leave
  // e.g. a call inside try, but never finished because it failed
  if (this.frame.type !== INSTR.TRY_ENTER) {
    let expect = this.resolveTryFrame(this.frame);
    this.leaveFrameUntil(expect);
  }
  this.popFrame();
  // FRAME END

  this.indent -= INDENT_FACTOR;

  // API
  let event = this.createEvent(INSTR.TRY_LEAVE);
  event.hash = hash;
  event.indent = this.indent;
  event.trigger("leave");
  // API END

  //console.log(indentString(this.indent) + "try end");
}

// #CATCH
function DEBUG_CATCH_ENTER(hash) {

  // API
  let event = this.createEvent(INSTR.CATCH_ENTER);
  event.hash = hash;
  event.indent = this.indent;
  event.trigger("enter");
  // API END

  this.indent += INDENT_FACTOR;
  // FRAME
  let frame = this.pushFrame(INSTR.CATCH_ENTER, hash);
  frame.values = [hash];
  // FRAME END
}
function DEBUG_CATCH_LEAVE(hash) {
  this.indent -= INDENT_FACTOR;

  // API
  let event = this.createEvent(INSTR.CATCH_LEAVE);
  event.hash = hash;
  event.indent = this.indent;
  event.trigger("leave");
  // API END

  this.popFrame();
  // FRAME END
}

// #FINALLY
function DEBUG_FINAL_ENTER(hash) {

  // API
  let event = this.createEvent(INSTR.FINAL_ENTER);
  event.hash = hash;
  event.indent = this.indent;
  event.trigger("enter");
  // API END

  this.indent += INDENT_FACTOR;
  // FRAME
  let frame = this.pushFrame(INSTR.FINAL_ENTER, hash);
  frame.values = [hash];
  // FRAME END
}
function DEBUG_FINAL_LEAVE(hash) {
  this.indent -= INDENT_FACTOR;

  // API
  let event = this.createEvent(INSTR.FINAL_LEAVE);
  event.hash = hash;
  event.indent = this.indent;
  event.trigger("leave");
  // API END

  this.popFrame();
  // FRAME END
}

// #ALLOC
function DEBUG_ALLOC(hash, value) {
  //console.log(indentString(this.indent) + "#Allocated", value);

  // API
  let event = this.createEvent(INSTR.ALLOC);
  event.hash = hash;
  event.value = value;
  event.indent = this.indent;
  event.trigger("fire");
  // API END

  return event.value;
}

// #MEMBER
function DEBUG_MEMBER_EXPR(hash, object, property) {
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
}

// fix for lazy blocks
function DEBUG_BLOCK_ENTER(hash) {
  let frame = this.pushFrame(INSTR.BLOCK_ENTER, hash);
  frame.values = [hash];
}
function DEBUG_BLOCK_LEAVE(hash) {
  this.popFrame();
}

// #THIS
function DEBUG_THIS(hash, ctx) {
  // API
  let event = this.createEvent(INSTR.THIS);
  event.hash = hash;
  event.context = ctx;
  event.indent = this.indent;
  event.trigger("fire");
  // API END
  return event.context;
}

// #LITERAL
function DEBUG_LITERAL(hash, value) {
  // API
  let event = this.createEvent(INSTR.LITERAL);
  event.hash = hash;
  event.value = value;
  event.indent = this.indent;
  event.trigger("fire");
  // API END
  return event.value;
}

// #EXPRESSIONS
function DEBUG_ASSIGN(hash, op, obj, prop, value) {
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
}

function DEBUG_TERNARY(hash, test, truthy, falsy) {
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
}

function DEBUG_LOGICAL(hash, op, a, b) {
  let result = null;
  // API: add before, after
  switch (op) {
    case OP["&&"]:
      result = a ? b() : a;
    break;
    case OP["||"]:
      result = a ? a : b();
    break;
  }
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
}

function DEBUG_BINARY(hash, op, a, b) {
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
}

function DEBUG_UNARY(hash, op, ctx, critical, value) {
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
}

function DEBUG_UPDATE(hash, op, value, prefix) {
  let result = value;
  // API
  let event = this.createEvent(INSTR.UPDATE);
  event.op = operatorToString(op);
  event.result = result;
  event.hash = hash;
  event.prefix = prefix;
  event.indent = this.indent;
  event.trigger("fire");
  // API END
  return event.result;
}

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

function DEBUG_PROGRAM_ENTER(hash) {
  //console.log(indentString(this.indent) + "Program");
  // API
  let event = this.createEvent(INSTR.PROGRAM_ENTER);
  event.hash = hash;
  event.indent = this.indent;
  event.trigger("enter");
  // API END
  this.indent += INDENT_FACTOR;
}
function DEBUG_PROGRAM_LEAVE(hash, ret) {
  this.indent -= INDENT_FACTOR;
  //console.log(indentString(this.indent) + "Program end ->", ret);
  // API
  let event = this.createEvent(INSTR.PROGRAM_LEAVE);
  event.hash = hash;
  event.indent = this.indent;
  event.return = ret;
  event.trigger("leave");
  // API END
  return event.return;
}
function DEBUG_PROGRAM_FRAME_VALUE(value) {
  //console.log(value);
}


var _debug = Object.freeze({
	DEBUG_IF_TEST: DEBUG_IF_TEST,
	DEBUG_IF_ENTER: DEBUG_IF_ENTER,
	DEBUG_IF_LEAVE: DEBUG_IF_LEAVE,
	DEBUG_ELSE_ENTER: DEBUG_ELSE_ENTER,
	DEBUG_ELSE_LEAVE: DEBUG_ELSE_LEAVE,
	DEBUG_LOOP_TEST: DEBUG_LOOP_TEST,
	DEBUG_LOOP_ENTER: DEBUG_LOOP_ENTER,
	DEBUG_LOOP_LEAVE: DEBUG_LOOP_LEAVE,
	DEBUG_BREAK: DEBUG_BREAK,
	DEBUG_CONTINUE: DEBUG_CONTINUE,
	DEBUG_SWITCH_TEST: DEBUG_SWITCH_TEST,
	DEBUG_SWITCH_ENTER: DEBUG_SWITCH_ENTER,
	DEBUG_SWITCH_LEAVE: DEBUG_SWITCH_LEAVE,
	DEBUG_CASE_TEST: DEBUG_CASE_TEST,
	DEBUG_CASE_ENTER: DEBUG_CASE_ENTER,
	DEBUG_CASE_LEAVE: DEBUG_CASE_LEAVE,
	DEBUG_FUNCTION_CALL: DEBUG_FUNCTION_CALL,
	DEBUG_FUNCTION_ENTER: DEBUG_FUNCTION_ENTER,
	DEBUG_FUNCTION_LEAVE: DEBUG_FUNCTION_LEAVE,
	DEBUG_FUNCTION_RETURN: DEBUG_FUNCTION_RETURN,
	DEBUG_VAR_DECLARE: DEBUG_VAR_DECLARE,
	DEBUG_VAR_INIT: DEBUG_VAR_INIT,
	DEBUG_OP_NEW: DEBUG_OP_NEW,
	DEBUG_OP_NEW_END: DEBUG_OP_NEW_END,
	DEBUG_SUPER: DEBUG_SUPER,
	DEBUG_SUPER_FIX: DEBUG_SUPER_FIX,
	DEBUG_METHOD_ENTER: DEBUG_METHOD_ENTER,
	DEBUG_METHOD_LEAVE: DEBUG_METHOD_LEAVE,
	DEBUG_TRY_ENTER: DEBUG_TRY_ENTER,
	DEBUG_TRY_LEAVE: DEBUG_TRY_LEAVE,
	DEBUG_CATCH_ENTER: DEBUG_CATCH_ENTER,
	DEBUG_CATCH_LEAVE: DEBUG_CATCH_LEAVE,
	DEBUG_FINAL_ENTER: DEBUG_FINAL_ENTER,
	DEBUG_FINAL_LEAVE: DEBUG_FINAL_LEAVE,
	DEBUG_ALLOC: DEBUG_ALLOC,
	DEBUG_MEMBER_EXPR: DEBUG_MEMBER_EXPR,
	DEBUG_BLOCK_ENTER: DEBUG_BLOCK_ENTER,
	DEBUG_BLOCK_LEAVE: DEBUG_BLOCK_LEAVE,
	DEBUG_THIS: DEBUG_THIS,
	DEBUG_LITERAL: DEBUG_LITERAL,
	DEBUG_ASSIGN: DEBUG_ASSIGN,
	DEBUG_TERNARY: DEBUG_TERNARY,
	DEBUG_LOGICAL: DEBUG_LOGICAL,
	DEBUG_BINARY: DEBUG_BINARY,
	DEBUG_UNARY: DEBUG_UNARY,
	DEBUG_UPDATE: DEBUG_UPDATE,
	DEBUG_PROGRAM_ENTER: DEBUG_PROGRAM_ENTER,
	DEBUG_PROGRAM_LEAVE: DEBUG_PROGRAM_LEAVE,
	DEBUG_PROGRAM_FRAME_VALUE: DEBUG_PROGRAM_FRAME_VALUE
});

class Stage {
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
}

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
  }
  let listeners = this.listeners[category];
  // no listeners are attached
  if (listeners.length <= 0) return;
  for (let ii = 0; ii < listeners.length; ++ii) {
    let listener = listeners[ii];
    listener.trigger(event, trigger);
  }
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
  }
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
  }
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
  }
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
  }
};

Stage.prototype.leaveFrameUntilHash = function(hash) {
  while (true) {
    if (this.frame.hash === hash) break;
    this.manuallyLeaveFrame(this.frame);
  }
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
  }
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
  }
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
  }
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
  }
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
  }
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
  }
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
  }
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
  }
  return frame;
};

Stage.prototype.getFrameByHashFrom = function(frm, hash) {
  let frame = frm;
  while (true) {
    if (frame.hash === hash) break;
    if (frame.isGlobal()) return null;
    frame = frame.parent;
  }
  return frame;
};

Stage.prototype.patch = function(input) {
  let patcher = new Patcher(this);
  let ast = parse$2(input, { locations: true });
  this.frame = new Frame(INSTR.PROGRAM, this.$$frameHash);
  patcher.applyPatches(ast);
  // link walk things to stage
  this.nodes = patcher.nodes;
  this.symbols = patcher.symbols;
  return generate$2(ast, {
    format: {
      indent: {
        style: "  "
      }
    }
  });
};

function setup() {
  this.generateCategoryBits();
}

function generateCategoryBits() {
  for (let key in CATEGORY) {
    this[key] = CATEGORY[key] | 0;
  }
}

function greet() {
  if (
    IS_BROWSER &&
    typeof navigator !== "undefined" &&
    navigator.userAgent.toLowerCase().indexOf("chrome") > -1
  ) {
    console.log(`%c ☕ Iroh.js - ${VERSION} `, "background: #2e0801; color: #fff; padding:1px 0;");
  }
}


var _setup = Object.freeze({
	setup: setup,
	generateCategoryBits: generateCategoryBits,
	greet: greet
});

class Iroh {
  constructor() {
    // patch AST scope
    this.scope = null;
    // patch stage
    this.stage = null;
    // patch state
    this.state = null;
    // stage instance
    this.instance = null;
    // container for all stages
    this.stages = {};
    // enter setup phase
    this.setup();
    // say hello
    this.greet();
  }
}

// link methods to main class
extend(Iroh, _utils);
extend(Iroh, _setup);

const iroh = new Iroh();

// intercept Stage instantiations
let _Stage = function() {
  let stage = new Stage(...arguments);
  // register stage to iroh stages
  // so we can keep track of it
  iroh.stages[stage.key] = stage;
  return stage;
};
_Stage.prototype = Object.create(Stage.prototype);
iroh.Stage = _Stage;

// link to outer space
if (typeof window !== "undefined") {
  window.Iroh = iroh;
}

module.exports = iroh;
