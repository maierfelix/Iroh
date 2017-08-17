import { OP, INSTR } from "../labels";

import { uid, uBranchHash } from "../utils";
import {
  cloneNode,
  resolveCallee,
  parseExpression,
  parseExpressionStatement
} from "../helpers";

let STAGE1 = {};

STAGE1.Program = function(node, patcher) {
  //if (node.magic) return;
  node.magic = true;
  patcher.pushScope(node);
  patcher.stage.BlockStatement(node, patcher, patcher.stage);
  if (patcher.stage === STAGE1) {
    // program frame value id
    let frameValueId = "$$frameValue";
    // patch program frame value debug
    let last = null;
    for (let ii = 0; ii < node.body.length; ++ii) {
      let child = node.body[ii];
      if (child.type === "ExpressionStatement" && !child.magic) last = child;
    };
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
      arguments: []
    };
    let start = {
      magic: true,
      type: "CallExpression",
      callee: {
        magic: true,
        type: "Identifier",
        name: patcher.instance.getLink("DEBUG_PROGRAM_ENTER")
      },
      arguments: []
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
  };
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
          if (property.type === "Identifier") return {
            magic: true,
            type: "Literal",
            value: property.name
          };
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
  };
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
  };
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
  };
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
  };
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
  };
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
  };
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
  };
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
  };
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
  };
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

export default STAGE1;
