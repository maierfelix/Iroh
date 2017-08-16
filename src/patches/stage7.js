import {
  uBranchHash,
  reserveTempVarId
} from "../utils";

import {
  cloneNode,
  processLabels,
  parseExpression,
  isLoopStatement,
  isSwitchStatement,
  isLabeledStatement,
  injectPatchIntoNode,
  forceLoopBodyBlocked,
  parseExpressionStatement
} from "../helpers";

import STAGE1 from "./stage1";

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
          )
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
              parseExpression(`${id} = 1`)
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
            parseExpression(id)
          ]
        }
      };
      body.splice(ii + 1, 0, end);
      ii++;
    }
  };
};

STAGE7.Program = STAGE1.Program;
STAGE7.MethodDefinition = STAGE1.MethodDefinition;
STAGE7.FunctionDeclaration = STAGE1.FunctionDeclaration;
STAGE7.FunctionExpression = STAGE1.FunctionExpression;
STAGE7.ArrowFunctionExpression = STAGE1.ArrowFunctionExpression;

export default STAGE7;
