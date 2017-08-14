import { OP, INSTR } from "../labels";

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

export default STAGE2;
