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

export default STAGE8;
