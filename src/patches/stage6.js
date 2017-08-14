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

export default STAGE6;
