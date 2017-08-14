import { OP } from "../labels";

import {
  uBranchHash,
  reserveTempVarId
} from "../utils";

import {
  cloneNode,
  parseExpression,
  injectPatchIntoNode,
  parseExpressionStatement
} from "../helpers";

import STAGE1 from "./stage1";

let STAGE8 = {};

STAGE8.ThisExpression = function(node, patcher) {
  if (node.magic) return;
  node.magic = true;
  node.type = "CallExpression";
  node.callee = {
    magic: true,
    type: "Identifier",
    name: patcher.instance.getLink("DEBUG_THIS")
  };
  node.arguments = [ parseExpression("this") ];
};

STAGE8.BinaryExpression = function(node, patcher) {
  if (node.magic) return;
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
    parseExpression(OP[node.operator]),
    node.left,
    node.right
  ];
};

STAGE8.LogicalExpression = function(node, patcher) {
  if (node.magic) return;
  patcher.walk(node.left, patcher, patcher.stage);
  patcher.walk(node.right, patcher, patcher.stage);
  node.magic = true;
  node.type = "CallExpression";
  node.callee = {
    magic: true,
    type: "Identifier",
    name: patcher.instance.getLink("DEBUG_LOGICAL")
  };
  let right = parseExpression("() => null");
  right.body = node.right;
  node.arguments = [
    parseExpression(OP[node.operator]),
    node.left,
    right
  ];
};

STAGE8.UnaryExpression = function(node, patcher) {
  if (node.magic) return;
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
      `(() => { try { ${name}; } catch(e) { ${id} = "undefined"; return true; } ${id} = ${name}; return false; })()`
    );
    node.arguments = [
      parseExpression(OP[node.operator]),
      parseExpression("this"),
      critical,
      parseExpression(id)
    ];
  }
};
/*
identifier: #critical

  typeof identifier

  Iroh.DEBUG_UNARY(
    // operator
    typeof,
    // context
    this,
    // critical
    () => { try { ID; } catch(e) { $$tmp = "undefined"; return true; } $$tmp = ID; return false; })(),
    // value
    $$tmp
  );

everything else: #non-critical
  dbg(
    typeof a !== "undefined" ? a : void 0
  )
*/
STAGE8.ConditionalExpression = function(node, patcher) {
  if (node.magic) return;
  node.magic = true;
  patcher.walk(node.test, patcher, patcher.stage);
  patcher.walk(node.consequent, patcher, patcher.stage);
  patcher.walk(node.alternate, patcher, patcher.stage);

  let cons = parseExpression("() => null");
  cons.body = node.consequent;
  let alt = parseExpression("() => null");
  alt.body = node.alternate;

  node.type = "CallExpression";
  node.callee = {
    magic: true,
    type: "Identifier",
    name: patcher.instance.getLink("DEBUG_TERNARY")
  };
  node.arguments = [
    node.test,
    cons,
    alt
  ];

};

/*
STAGE8.UpdateExpression = function(node) {
  if (node.magic) return;
  node.magic = true;
  Iroh.walk(node.argument, Iroh.state, Iroh.stage);
  console.log(node);
};*/
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
/*
var gg = "123";
gg += "1";

(gg = DBG_ASSIGN("+", gg, "1"));

DBG_ASSIGN("+=", gg, "1", null);

var a = {b:"123"};
a.b += c;
a.b = a.b + c;
DBG_ASSIGN("+=", a, b, "b");

"DEBUG_ASSIGN_EXPR";
"DEBUG_UPDATE_EXPR"; argument = dbg(op, argument)

DBG_UPDATE:
  ++
  --

DBG_ASSIGN:
  single id:
    var a = "123";
    var c = "4";
    a += c;
    (a += DBG_ASSIGN("+", a, null, c));
  object:
    var a = { b: "123" };
    var c = "4";
    a.b += c;
    (DBG_ASSIGN("+=", a, "b", c))

STAGE8.ConditionalExpression = function(node) {
  return DBG_TERNARY(
    $$x0 = (a === 1),
    $$x0 ? a = 2 : b = 7
  );
};

STAGE8.LogicalExpression = function(node) {
  return DBG_LOGICAL(
    op,
    a,
    b
  );
};

STAGE8.BinaryExpression = function(node) {
  return DBG_BINARY(
    op,
    a,
    b
  );
};
*/

STAGE8.Program = STAGE1.Program;
STAGE8.BlockStatement = STAGE1.BlockStatement;
STAGE8.MethodDefinition = STAGE1.MethodDefinition;
STAGE8.FunctionDeclaration = STAGE1.FunctionDeclaration;
STAGE8.FunctionExpression = STAGE1.FunctionExpression;
STAGE8.ArrowFunctionExpression = STAGE1.ArrowFunctionExpression;

export default STAGE8;
