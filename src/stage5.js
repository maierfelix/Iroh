Iroh.stage5.ClassDeclaration = function(node) {
  Iroh.pushScope(node);
  Iroh.walk(node.id, Iroh.state, Iroh.stage);
  Iroh.walk(node.body, Iroh.state, Iroh.stage);
  Iroh.popScope();
};

Iroh.stage5.MethodDefinition = function(node) {
  if (node.magic) {
    Iroh.pushScope(node);
    Iroh.walk(node.key, Iroh.state, Iroh.stage);
    Iroh.walk(node.value, Iroh.state, Iroh.stage);
    Iroh.popScope();
    return;
  }

  let scope = Iroh.scope;
  // branch hash
  let hash = Iroh.uBranchHash();
  // create node link
  Iroh.nodes[hash] = {
    hash: hash,
    node: Iroh.cloneNode(node)
  };

  node.magic = true;
  node.value.superIndex = -1;
  node.value.superNode = null;
  Iroh.pushScope(node);
  Iroh.walk(node.key, Iroh.state, Iroh.stage);
  Iroh.walk(node.value, Iroh.state, Iroh.stage);

  let isConstructor = node.kind === "constructor";

  let end = Iroh.parseExpressionStatement(Iroh.getLinkCall("DEBUG_METHOD_LEAVE"));
  let start = Iroh.parseExpressionStatement(Iroh.getLinkCall("DEBUG_METHOD_ENTER"));
  let body = node.value.body.body;

  start.expression.arguments.push(Iroh.parseExpression("this"));
  start.expression.arguments.push(Iroh.parseExpression("arguments"));

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
  end.expression.arguments.unshift(Iroh.parseExpression(isConstructor));
  start.expression.arguments.unshift(Iroh.parseExpression(isConstructor));

  // class name
  end.expression.arguments.unshift(scope.node.id);
  start.expression.arguments.unshift(scope.node.id);

  // hash
  end.expression.arguments.unshift(Iroh.parseExpression(hash));
  start.expression.arguments.unshift(Iroh.parseExpression(hash));

  Iroh.popScope();
};

Iroh.stage5.CallExpression = function(node) {
  if (node.magic) return;
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
    scope.superNode = node;

    // patch debug super
    node.arguments = [
      {
        magic: true,
        type: "CallExpression",
        callee: {
          magic: true,
          type: "Identifier",
          name: Iroh.getLink("DEBUG_SUPER")
        },
        arguments: [
          // class ctor
          Iroh.scope.parent.parent.node.id,
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

Iroh.stage5.Program = Iroh.stage1.Program;
Iroh.stage5.BlockStatement = Iroh.stage1.BlockStatement;
Iroh.stage5.FunctionDeclaration = Iroh.stage1.FunctionDeclaration;
Iroh.stage5.FunctionExpression = Iroh.stage1.FunctionExpression;
Iroh.stage5.ArrowFunctionExpression = Iroh.stage1.ArrowFunctionExpression;
