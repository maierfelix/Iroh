Iroh.stage1.Program = function(node) {
  //if (node.magic) return;
  node.magic = true;
  Iroh.pushScope(node);
  Iroh.stage.BlockStatement(node, Iroh.state, Iroh.stage);
  if (Iroh.stage === Iroh.stage1) {
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
          name: Iroh.getLink("DEBUG_PROGRAM_FRAME_VALUE")
        },
        arguments: [
          {
            magic: true,
            type: "AssignmentExpression",
            operator: "=",
            left: Iroh.parseExpression(frameValueId),
            right: last.expression
          }
        ]
      };
    }
    let end = Iroh.parseExpressionStatement(Iroh.getLinkCall("DEBUG_PROGRAM_LEAVE"));
    let start = Iroh.parseExpressionStatement(Iroh.getLinkCall("DEBUG_PROGRAM_ENTER"));
    let frame = Iroh.parseExpressionStatement(`var ${frameValueId} = void 0;`);
    end.expression.arguments.push(
      Iroh.parseExpression(frameValueId)
    );
    node.body.push(end);
    node.body.unshift(start);
    node.body.unshift(frame);
  }
  Iroh.popScope();
};

Iroh.stage1.BlockStatement = function(node) {
  let body = node.body;
  for (let ii = 0; ii < body.length; ++ii) {
    let child = body[ii];
    //if (child.magic) continue;
    Iroh.walk(child, Iroh.state, Iroh.stage);
  };
};

Iroh.stage1.MethodDefinition = function(node) {
  Iroh.pushScope(node);
  Iroh.walk(node.key, Iroh.state, Iroh.stage);
  Iroh.walk(node.value, Iroh.state, Iroh.stage);
  Iroh.popScope();
};

Iroh.stage1.FunctionDeclaration = function(node) {
  // dont touch
  if (node.magic) {
    Iroh.pushScope(node);
    // just walk
    Iroh.walk(node.id, Iroh.state, Iroh.stage);
    node.params.map((param) => { Iroh.walk(param, Iroh.state, Iroh.stage); });
    Iroh.walk(node.body, Iroh.state, Iroh.stage);
    Iroh.popScope();
    return;
  }
  node.magic = true;
  Iroh.pushScope(node);
  let name = node.id.name;
  Iroh.symbols[name] = Iroh.cloneNode(node);
  Iroh.walk(node.id, Iroh.state, Iroh.stage);
  node.params.map((param) => { Iroh.walk(param, Iroh.state, Iroh.stage); });
  Iroh.walk(node.body, Iroh.state, Iroh.stage);
  Iroh.popScope();
};

Iroh.stage1.FunctionExpression = function(node) {
  // dont touch
  if (node.magic) {
    Iroh.pushScope(node);
    // just walk
    if (node.id !== null) Iroh.walk(node.id, Iroh.state, Iroh.stage);
    node.params.map((param) => { Iroh.walk(param, Iroh.state, Iroh.stage); });
    Iroh.walk(node.body, Iroh.state, Iroh.stage);
    Iroh.popScope();
    return;
  }
  node.magic = true;
  Iroh.pushScope(node);
  let name = "$$ANON_" + Iroh.uid();
  if (node.id === null) {
    node.id = Iroh.createIdentifier(name);
  }
  name = node.id.name;
  Iroh.symbols[name] = Iroh.cloneNode(node);
  Iroh.walk(node.id, Iroh.state, Iroh.stage);
  node.params.map((param) => { Iroh.walk(param, Iroh.state, Iroh.stage); });
  Iroh.walk(node.body, Iroh.state, Iroh.stage);
  Iroh.popScope();
};

Iroh.stage1.ArrowFunctionExpression = function(node) {
  // dont touch
  if (node.magic) {
    // just walk
    Iroh.pushScope(node);
    node.params.map((param) => { Iroh.walk(param, Iroh.state, Iroh.stage); });
    Iroh.walk(node.body, Iroh.state, Iroh.stage);
    Iroh.popScope();
    return;
  }
  node.magic = true;
  Iroh.pushScope(node);
  let name = "$$ANON_ARROW_" + Iroh.uid();
  Iroh.symbols[name] = Iroh.cloneNode(node);
  node.id = Iroh.createIdentifier(name);
  // arrow fns auto return, inject return record
  if (node.body.type !== "BlockStatement") {
    let call = Iroh.createDebugCall(
      Iroh.getLink("DEBUG_FUNCTION_RETURN"),
      [Iroh.createStringLiteral(node.id), node.body]
    );
    call.magic = true;
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
  node.params.map((param) => { Iroh.walk(param, Iroh.state, Iroh.stage); });
  Iroh.walk(node.body, Iroh.state, Iroh.stage);
  Iroh.popScope();
};
/*
Iroh.stage1.CallExpression = function(node) {
  // patched in node, ignore
  if (node.magic) {
    Iroh.walk(node.callee, Iroh.state, Iroh.stage);
    node.arguments.map((arg) => {
      Iroh.walk(arg, Iroh.state, Iroh.stage);
    });
    return;
  }
  // dont patch super class calls
  if (node.callee && node.callee.type === "Super") {
    let scope = Iroh.scope.node;
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
    return;
  }
  Iroh.walk(node.callee, Iroh.state, Iroh.stage);
  let callee = Iroh.getCallCallee(node.callee);
  node.arguments.map((arg) => {
    Iroh.walk(arg, Iroh.state, Iroh.stage);
  });
  let real = Iroh.cloneNode(node);
  // only transform if necessary
  // so we save some space
  let hash = Iroh.uBranchHash();
  // create node link
  Iroh.nodes[hash] = {
    hash: hash,
    node: Iroh.cloneNode(node)
  };
  real.arguments = [
    {
      type: "SpreadElement",
      magic: true,
      argument: {
        magic: true,
        type: "CallExpression",
        callee: {
          magic: true,
          type: "Identifier",
          name: Iroh.getLink("DEBUG_FUNCTION_CALL")
        },
        arguments: [
          // branch hash
          Iroh.parseExpression(hash),
          // scope
          Iroh.parseExpression("this"),
          // callee
          Iroh.parseExpression(`"${callee}"`),
          // arguments
          {
            type: "ArrayExpression",
            elements: real.arguments
          }
        ]
      }
    }
  ];

  let index = Iroh.uid();
  let expr = {
    magic: true,
    type: "CallExpression",
    callee: {
      magic: true,
      type: "Identifier",
      name: Iroh.getLink("DEBUG_FUNCTION_CALL_END")
    },
    arguments: [
      // branch hash
      Iroh.parseExpression(hash),
      // context
      Iroh.parseExpression("this"),
      // callee
      Iroh.parseExpression(`"${callee}"`),
      // debug ret value
      real
    ]
  };
  delete node.callee;
  delete node.arguments;
  for (let key in expr) {
    if (!expr.hasOwnProperty(key)) continue;
    node[key] = expr[key];
  };
  node.magic = true;
};
*/
Iroh.stage1.CallExpression = function(node) {
  // patched in node, ignore
  if (node.magic) {
    Iroh.walk(node.callee, Iroh.state, Iroh.stage);
    node.arguments.map((arg) => {
      Iroh.walk(arg, Iroh.state, Iroh.stage);
    });
    return;
  }
  node.magic = true;
  Iroh.walk(node.callee, Iroh.state, Iroh.stage);
  node.arguments.map((arg) => {
    Iroh.walk(arg, Iroh.state, Iroh.stage);
  });
  let hash = Iroh.uBranchHash();
  // create node link
  Iroh.nodes[hash] = {
    hash: hash,
    node: Iroh.cloneNode(node)
  };
  let callee = Iroh.resolveCallee(node.callee);
  let call = {
    magic: true,
    type: "CallExpression",
    callee: {
      magic: true,
      type: "Identifier",
      name: Iroh.getLink("DEBUG_FUNCTION_CALL")
    },
    arguments: [
      Iroh.parseExpression(hash),
      Iroh.parseExpression("this"),
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
        return Iroh.parseExpression("null");
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

Iroh.stage1.ReturnStatement = function(node) {
  if (node.magic) return;
  node.magic = true;
  let arg = Iroh.cloneNode(node.argument);
  if (arg !== null) Iroh.walk(arg, Iroh.state, Iroh.stage);
  let scope = Iroh.scope.getReturnContext();
  let name = Iroh.parseExpression(`"${scope.node.id.name}"`);
  node.argument = {
    magic: true,
    type: "CallExpression",
    callee: {
      magic: true,
      type: "Identifier",
      name: Iroh.getLink("DEBUG_FUNCTION_RETURN")
    },
    arguments: [name]
  };
  if (arg !== null) {
    node.argument.arguments.push(arg);
  }
};

Iroh.stage1.BreakStatement = function(node) {
  if (node.magic) return;
  let label = Iroh.parseExpression(
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
        name: Iroh.getLink("DEBUG_BREAK")
      },
      arguments: [
        label,
        Iroh.parseExpression("this")
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

Iroh.stage1.ContinueStatement = function(node) {
  if (node.magic) return;
  if (node.label) Iroh.walk(node.label, Iroh.state, Iroh.stage);
  let label = Iroh.parseExpression(
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
        name: Iroh.getLink("DEBUG_CONTINUE")
      },
      arguments: [
        label,
        Iroh.parseExpression("this")
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

Iroh.stage1.VariableDeclaration = function(node) {
  if (node.magic) return;
  node.magic = true;
  let decls = node.declarations;
  // walk
  for (let ii = 0; ii < decls.length; ++ii) {
    Iroh.walk(decls[ii], Iroh.state, Iroh.stage);
  };
  // patch
  for (let ii = 0; ii < decls.length; ++ii) {
    let decl = decls[ii];
    if (decl.magic) continue;
    let init = decl.init;
    decl.magic = true;
    decl.init = {
      magic: true,
      type: "CallExpression",
      callee: {
        magic: true,
        type: "Identifier",
        name: Iroh.getLink("DEBUG_VAR_INIT")
      },
      arguments: [
        // fire declaration instant by placing a call wrapper around
        // then assign its value afterwards
        {
          magic: true,
          type: "CallExpression",
          callee: {
            magic: true,
            type: "Identifier",
            name: Iroh.getLink("DEBUG_VAR_DECLARE")
          },
          arguments: [{
            magic: true,
            type: "Literal",
            value: decl.id.name,
            raw: `"${decl.id.name}"`
          }]
        }
      ]
    };
    if (init !== null) decl.init.arguments.push(init);
  };
};

Iroh.stage1.NewExpression = function(node) {
  if (node.magic) return;
  node.magic = true;
  Iroh.walk(node.callee, Iroh.state, Iroh.stage);
  node.arguments.map((arg) => {
    Iroh.walk(arg, Iroh.state, Iroh.stage);
  });
  let callee = Iroh.cloneNode(node.callee);
  let args = [
    callee,
    {
      magic: true,
      type: "ArrayExpression",
      elements: [...node.arguments]
    }
  ];
  let hash = Iroh.uBranchHash();
  // create node link
  Iroh.nodes[hash] = {
    hash: hash,
    node: Iroh.cloneNode(node)
  };

  node.callee = {
    magic: true,
    type: "Identifier",
    name: Iroh.getLink("DEBUG_OP_NEW_END")
  };
  node.arguments = [
    Iroh.parseExpression(hash),
    {
      magic: true,
      type: "CallExpression",
      callee: {
        magic: true,
        type: "Identifier",
        name: Iroh.getLink("DEBUG_OP_NEW")
      },
      arguments: [
        Iroh.parseExpression(hash),
        ...args
      ]
    },
  ];
};

Iroh.stage1.ObjectExpression = function(node) {
  if (node.magic) return;
  node.magic = true;
  node.properties.map((prop) => { Iroh.walk(prop, Iroh.state, Iroh.stage); });
  let call = {
    magic: true,
    type: "CallExpression",
    callee: {
      magic: true,
      type: "Identifier",
      name: Iroh.getLink("DEBUG_ALLOC_OBJECT")
    },
    arguments: [Iroh.cloneNode(node)]
  };
  delete node.properties;
  for (let key in call) {
    if (!call.hasOwnProperty(key)) continue;
    node[key] = call[key];
  };
};

Iroh.stage1.MemberExpression = function(node) {
  if (node.magic) {
    Iroh.walk(node.object, Iroh.state, Iroh.stage);
    Iroh.walk(node.property, Iroh.state, Iroh.stage);
    return;
  }
  node.magic = true;
  Iroh.walk(node.object, Iroh.state, Iroh.stage);
  Iroh.walk(node.property, Iroh.state, Iroh.stage);
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
      name: Iroh.getLink("DEBUG_MEMBER_EXPR")
    },
    arguments: [
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

Iroh.stage1.AssignmentExpression = function(node) {
  if (node.magic) {
    node.left.magic = true;
    Iroh.walk(node.left, Iroh.state, Iroh.stage);
    Iroh.walk(node.right, Iroh.state, Iroh.stage);
    return;
  }
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
    property = Iroh.parseExpression(null);
  }
  let call = {
    magic: true,
    type: "CallExpression",
    callee: {
      magic: true,
      type: "Identifier",
      name: Iroh.getLink("DEBUG_ASSIGN")
    },
    arguments: [
      Iroh.parseExpression(Iroh.OP[operator]),
      (
        left.type === "Identifier" ?
        Iroh.parseExpression(`"${left.name}"`) :
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
  Iroh.walk(node.left, Iroh.state, Iroh.stage);
  Iroh.walk(node.right, Iroh.state, Iroh.stage);
  for (let key in call) {
    if (!call.hasOwnProperty(key)) continue;
    node[key] = call[key];
  };
};

Iroh.stage1.ArrayExpression = function(node) {
  if (node.magic) return;
  node.magic = true;
  node.elements.map((el) => { if (el !== null) Iroh.walk(el, Iroh.state, Iroh.stage); });
  let call = {
    magic: true,
    type: "CallExpression",
    callee: {
      magic: true,
      type: "Identifier",
      name: Iroh.getLink("DEBUG_ALLOC_ARRAY")
    },
    arguments: [Iroh.cloneNode(node)]
  };
  delete node.elements;
  for (let key in call) {
    if (!call.hasOwnProperty(key)) continue;
    node[key] = call[key];
  };
};

Iroh.stage1.ForStatement = function(node) {
  if (!node.hasOwnProperty("labels")) node.labels = [];
  Iroh.pushScope(node);
  if (node.test) Iroh.walk(node.test, Iroh.state, Iroh.stage);
  if (node.init) Iroh.walk(node.init, Iroh.state, Iroh.stage);
  if (node.update) Iroh.walk(node.update, Iroh.state, Iroh.stage);
  Iroh.walk(node.body, Iroh.state, Iroh.stage);
  Iroh.popScope();
};

Iroh.stage1.ForInStatement = function(node) {
  node.left.magic = true;
  Iroh.pushScope(node);
  Iroh.walk(node.left, Iroh.state, Iroh.stage);
  Iroh.walk(node.right, Iroh.state, Iroh.stage);
  Iroh.walk(node.body, Iroh.state, Iroh.stage);
  Iroh.popScope();
};

Iroh.stage1.ForOfStatement = function(node) {
  node.left.magic = true;
  Iroh.pushScope(node);
  Iroh.walk(node.left, Iroh.state, Iroh.stage);
  Iroh.walk(node.right, Iroh.state, Iroh.stage);
  Iroh.walk(node.body, Iroh.state, Iroh.stage);
  Iroh.popScope();
};

Iroh.stage1.WhileStatement = function(node) {
  Iroh.pushScope(node);
  if (node.test) Iroh.walk(node.test, Iroh.state, Iroh.stage);
  Iroh.walk(node.body, Iroh.state, Iroh.stage);
  Iroh.popScope();
};

Iroh.stage1.DoWhileStatement = function(node) {
  Iroh.pushScope(node);
  if (node.test) Iroh.walk(node.test, Iroh.state, Iroh.stage);
  Iroh.walk(node.body, Iroh.state, Iroh.stage);
  Iroh.popScope();
};
