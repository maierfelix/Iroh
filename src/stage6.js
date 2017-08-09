Iroh.stage6.FunctionDeclaration = function(node) {
  Iroh.pushScope(node);
  Iroh.walk(node.id, Iroh.state, Iroh.stage);
  node.params.map((param) => { Iroh.walk(param, Iroh.state, Iroh.stage); });
  Iroh.walk(node.body, Iroh.state, Iroh.stage);

  let hash = Iroh.uBranchHash();
  // create node link
  Iroh.nodes[hash] = {
    hash: hash,
    node: Iroh.cloneNode(node)
  };
  let hashExpr = Iroh.parseExpression(hash);
  let end = Iroh.parseExpressionStatement(Iroh.getLinkCall("DEBUG_FUNCTION_LEAVE"));
  let start = Iroh.parseExpressionStatement(Iroh.getLinkCall("DEBUG_FUNCTION_ENTER"));
  end.expression.arguments.push(hashExpr);
  end.expression.arguments.push(Iroh.parseExpression("this"));
  start.expression.arguments.push(hashExpr);
  start.expression.arguments.push(Iroh.parseExpression("this"));
  start.expression.arguments.push(Iroh.parseExpression("arguments"));
  node.body.body.unshift(start);
  node.body.body.push(end);

  Iroh.popScope();
};

Iroh.stage6.FunctionExpression = function(node) {
  if (Iroh.scope.node.type === "MethodDefinition") return;
  Iroh.pushScope(node);
  Iroh.walk(node.id, Iroh.state, Iroh.stage);
  node.params.map((param) => { Iroh.walk(param, Iroh.state, Iroh.stage); });
  Iroh.walk(node.body, Iroh.state, Iroh.stage);

  let hash = Iroh.uBranchHash();
  // create node link
  Iroh.nodes[hash] = {
    hash: hash,
    node: Iroh.cloneNode(node)
  };
  let hashExpr = Iroh.parseExpression(hash);
  let end = Iroh.parseExpressionStatement(Iroh.getLinkCall("DEBUG_FUNCTION_LEAVE"));
  let start = Iroh.parseExpressionStatement(Iroh.getLinkCall("DEBUG_FUNCTION_ENTER"));
  end.expression.arguments.push(hashExpr);
  end.expression.arguments.push(Iroh.parseExpression("this"));
  start.expression.arguments.push(hashExpr);
  start.expression.arguments.push(Iroh.parseExpression("this"));
  start.expression.arguments.push(Iroh.parseExpression("arguments"));
  node.body.body.unshift(start);
  node.body.body.push(end);

  Iroh.popScope();
};

Iroh.stage6.ArrowFunctionExpression = function(node) {
  Iroh.pushScope(node);
  node.params.map((param) => { Iroh.walk(param, Iroh.state, Iroh.stage); });
  Iroh.walk(node.body, Iroh.state, Iroh.stage);

  let hash = Iroh.uBranchHash();
  // create node link
  Iroh.nodes[hash] = {
    hash: hash,
    node: Iroh.cloneNode(node)
  };
  let hashExpr = Iroh.parseExpression(hash);
  let end = Iroh.parseExpressionStatement(Iroh.getLinkCall("DEBUG_FUNCTION_LEAVE"));
  let start = Iroh.parseExpressionStatement(Iroh.getLinkCall("DEBUG_FUNCTION_ENTER"));
  end.expression.arguments.push(hashExpr);
  end.expression.arguments.push(Iroh.parseExpression("this"));
  start.expression.arguments.push(hashExpr);
  start.expression.arguments.push(Iroh.parseExpression("this"));
  let args = {
    type: "ArrayExpression",
    elements: []
  };
  node.params.map((param) => {
    args.elements.push(param);
  });
  start.expression.arguments.push(args);
  node.body.body.unshift(start);
  node.body.body.push(end);

  Iroh.popScope();
};

Iroh.stage6.Program = Iroh.stage1.Program;
Iroh.stage6.BlockStatement = Iroh.stage1.BlockStatement;
Iroh.stage6.MethodDefinition = Iroh.stage1.MethodDefinition;
