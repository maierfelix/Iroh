Iroh.stage2.IfStatement = function(node) {
  if (node.magic) {
    Iroh.walk(node.test, Iroh.state, Iroh.stage);
    Iroh.walk(node.consequent, Iroh.state, Iroh.stage);
    if (node.alternate) Iroh.walk(node.alternate, Iroh.state, Iroh.stage);
    return;
  }
  node.magic = true;

  let test = Iroh.cloneNode(node.test);
  // branch hash
  let elseHash = Iroh.uBranchHash();
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
    Iroh.nodes[elseHash] = link;
    link.node = Iroh.cloneNode(node.alternate);
    if (!isBlockedElse) {
      // force else to be blocked
      let alternate = node.alternate;
      node.alternate = Iroh.parseExpressionStatement("{}");
      node.alternate.body.push(alternate);
    }
  }

  // branch hash
  let ifHash = Iroh.uBranchHash();
  // create node link
  Iroh.nodes[ifHash] = {
    hash: ifHash,
    node: Iroh.cloneNode(node)
  };

  Iroh.walk(node.test, Iroh.state, Iroh.stage);
  Iroh.walk(node.consequent, Iroh.state, Iroh.stage);
  if (node.alternate) Iroh.walk(node.alternate, Iroh.state, Iroh.stage);

  let id = `${Iroh.TEMP_VAR_BASE}${Iroh.tmpIfIndex++}`;
  let patch = Iroh.parseExpressionStatement(`var ${id};`);
  Iroh.injectPatchIntoNode(Iroh.scope.node, patch);

  // debug if test
  node.test = {
    magic: true,
    type: "AssignmentExpression",
    operator: "=",
    left: Iroh.parseExpression(id),
    right: {
      magic: true,
      type: "CallExpression",
      callee: {
        type: "Identifier",
        name: Iroh.getLink("DEBUG_IF_TEST")
      },
      arguments: [
        Iroh.parseExpression(ifHash),
        node.test
      ]
    }
  };

  // patch else enter, leave
  if (isElse) {
    let end = Iroh.parseExpressionStatement(Iroh.getLinkCall("DEBUG_ELSE_LEAVE"));
    let start = Iroh.parseExpressionStatement(Iroh.getLinkCall("DEBUG_ELSE_ENTER"));
    end.expression.arguments.push(
      Iroh.parseExpression(elseHash)
    );
    start.expression.arguments.push(
      Iroh.parseExpression(elseHash)
    );
    node.alternate.body.unshift(start);
    node.alternate.body.push(end);
  }

  // debug if body enter, leave
  let end = Iroh.parseExpressionStatement(Iroh.getLinkCall("DEBUG_IF_LEAVE"));
  let start = Iroh.parseExpressionStatement(Iroh.getLinkCall("DEBUG_IF_ENTER"));
  // branch hash
  end.expression.arguments.push(
    Iroh.parseExpression(ifHash)
  );
  // branch hash
  start.expression.arguments.push(
    Iroh.parseExpression(ifHash)
  );
  // pass in condition result into if enter
  start.expression.arguments.push(Iroh.parseExpression(id));
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

Iroh.stage2.Program = Iroh.stage1.Program;
Iroh.stage2.BlockStatement = Iroh.stage1.BlockStatement;
Iroh.stage2.MethodDefinition = Iroh.stage1.MethodDefinition;
Iroh.stage2.FunctionDeclaration = Iroh.stage1.FunctionDeclaration;
Iroh.stage2.FunctionExpression = Iroh.stage1.FunctionExpression;
Iroh.stage2.ArrowFunctionExpression = Iroh.stage1.ArrowFunctionExpression;
