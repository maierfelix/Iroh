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

export default STAGE5;
