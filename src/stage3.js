Iroh.stage3.BlockStatement = function(node) {
  let body = node.body;
  // transform try, switch and labels here
  for (let ii = 0; ii < body.length; ++ii) {
    let child = body[ii];
    //if (child.magic) continue;
    // labeled statement
    let isLabeledStatement = Iroh.isLabeledStatement(child.type);
    if (isLabeledStatement) {
      child = Iroh.processLabels(child);
    }
    let isTryStatement = Iroh.isTryStatement(child.type);
    let isSwitchStatement = Iroh.isSwitchStatement(child.type);
    let hash = -1;
    let isHashBranch = (
      isTryStatement ||
      isSwitchStatement
    );
    // only generate hash if necessary
    if (isHashBranch) hash = Iroh.uBranchHash();
    // #ENTER
    if (isHashBranch) {
      let link = Iroh.getLinkCall(
        isTryStatement ? "DEBUG_TRY_ENTER" :
        isSwitchStatement ? "DEBUG_SWITCH_ENTER" :
        "" // throws error
      );
      let start = Iroh.parseExpressionStatement(link);
      Iroh.nodes[hash] = {
        hash: hash,
        node: Iroh.cloneNode(child)
      };
      start.expression.arguments.push(
        Iroh.parseExpression(hash)
      );
      body.splice(ii, 0, start);
      ii++;
    }
    Iroh.walk(child, Iroh.state, Iroh.stage);
    // #LEAVE
    if (isHashBranch) {
      let link = Iroh.getLinkCall(
        isTryStatement ? "DEBUG_TRY_LEAVE" :
        isSwitchStatement ? "DEBUG_SWITCH_LEAVE" :
        "" // throws error
      );
      let end = Iroh.parseExpressionStatement(link);
      end.expression.arguments.push(
        Iroh.parseExpression(hash)
      );
      body.splice(ii + 1, 0, end);
      ii++;
    }
  };
};

Iroh.stage3.Program = Iroh.stage1.Program;
Iroh.stage3.MethodDefinition = Iroh.stage1.MethodDefinition;
Iroh.stage3.FunctionDeclaration = Iroh.stage1.FunctionDeclaration;
Iroh.stage3.FunctionExpression = Iroh.stage1.FunctionExpression;
Iroh.stage3.ArrowFunctionExpression = Iroh.stage1.ArrowFunctionExpression;
