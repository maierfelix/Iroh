Iroh.stage4.SwitchStatement = function(node) {
  if (node.magic) {
    Iroh.walk(node.discriminant, Iroh.state, Iroh.stage);
    node.cases.map((cs) => {
      Iroh.walk(cs, Iroh.state, Iroh.stage);
    });
    return;
  }
  node.magic = true;

  let hash = Iroh.uBranchHash();
  Iroh.nodes[hash] = {
    hash: hash,
    node: Iroh.cloneNode(node)
  };

  Iroh.walk(node.discriminant, Iroh.state, Iroh.stage);
  node.cases.map((cs) => {
    Iroh.walk(cs, Iroh.state, Iroh.stage);
  });

  let id = `${Iroh.TEMP_VAR_BASE}${Iroh.tmpIfIndex++}`;
  let patch = Iroh.parseExpressionStatement(`var ${id};`);
  Iroh.injectPatchIntoNode(Iroh.scope.node, patch);

  // debug if test
  node.discriminant = {
    magic: true,
    type: "AssignmentExpression",
    operator: "=",
    left: Iroh.parseExpression(id),
    right: node.discriminant
  };

};

Iroh.stage4.SwitchCase = function(node) {
  if (node.magic) {
    if (node.test) Iroh.walk(node.test, Iroh.state, Iroh.stage);
    node.consequent.map((cons) => {
      Iroh.walk(cons, Iroh.state, Iroh.stage);
    });
    return;
  }
  node.magic = true;

  let test = null;
  if (node.test) {
    let id = `${Iroh.TEMP_VAR_BASE}${Iroh.tmpIfIndex++}`;
    let patch = Iroh.parseExpressionStatement(`var ${id};`);
    Iroh.injectPatchIntoNode(Iroh.scope.node, patch);
    test = Iroh.parseExpression(id);
    // debug if test
    node.test = {
      magic: true,
      type: "AssignmentExpression",
      operator: "=",
      left: test,
      right: node.test
    };
  }

  let hash = Iroh.uBranchHash();
  Iroh.nodes[hash] = {
    hash: hash,
    node: Iroh.cloneNode(node)
  };

  // default or case
  let type = (
    test !== null ? test : Iroh.parseExpression("null")
  );

  let start = Iroh.parseExpressionStatement(
    Iroh.getLinkCall("DEBUG_CASE_ENTER")
  );
  // pass case test result
  start.expression.arguments.push(
    Iroh.parseExpression(hash)
  );
  // pass type
  start.expression.arguments.push(type);
  node.consequent.splice(0, 0, start);

  let end = Iroh.parseExpressionStatement(
    Iroh.getLinkCall("DEBUG_CASE_LEAVE")
  );
  end.expression.arguments.push(
    Iroh.parseExpression(hash)
  );
  node.consequent.splice(node.consequent.length, 0, end);

};

Iroh.stage4.Program = Iroh.stage1.Program;
Iroh.stage4.BlockStatement = Iroh.stage1.BlockStatement;
Iroh.stage4.MethodDefinition = Iroh.stage1.MethodDefinition;
Iroh.stage4.FunctionDeclaration = Iroh.stage1.FunctionDeclaration;
Iroh.stage4.FunctionExpression = Iroh.stage1.FunctionExpression;
Iroh.stage4.ArrowFunctionExpression = Iroh.stage1.ArrowFunctionExpression;
