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

export default STAGE4;
