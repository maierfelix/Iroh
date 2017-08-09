Iroh.stage7.BlockStatement = function(node) {
  let body = node.body;
  for (let ii = 0; ii < body.length; ++ii) {
    let child = body[ii];
    //if (child.magic) continue;
    //child.magic = true;

    // labeled statement
    let isLabeledStatement = Iroh.isLabeledStatement(child.type);
    if (isLabeledStatement) {
      child = Iroh.processLabels(child);
    }

    let isLazyBlock = (
      child.type === "BlockStatement"
    );
    let isLoopStatement = Iroh.isLoopStatement(child.type);
    let isSwitchStatement = Iroh.isSwitchStatement(child.type);
    let isHashBranch = (
      isLoopStatement ||
      isLazyBlock
    );
    let hash = -1;
    let id = null;
    if (isHashBranch) {
      // generate hash
      hash = Iroh.uBranchHash();
      id = `${Iroh.TEMP_VAR_BASE}${Iroh.tmpIfIndex++}`;
      Iroh.nodes[hash] = {
        hash: hash,
        node: Iroh.cloneNode(child)
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
            type: "Identifier",
            name: Iroh.getLink("DEBUG_BLOCK_ENTER")
          },
          arguments: [
            Iroh.parseExpression(hash)
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
            type: "Identifier",
            name: Iroh.getLink("DEBUG_BLOCK_LEAVE")
          },
          arguments: [ Iroh.parseExpression(hash) ]
        }
      };
      child.body.unshift(start);
      child.body.push(end);
      Iroh.walk(child, Iroh.state, Iroh.stage);
      continue;
    }

    if (isSwitchStatement) {
      let test = {
        magic: true,
        type: "CallExpression",
        callee: {
          type: "Identifier",
          name: Iroh.getLink("DEBUG_SWITCH_TEST")
        },
        arguments: [ child.discriminant ]
      };
      child.discriminant = test;
    }

    if (isLoopStatement) {
      Iroh.forceLoopBodyBlocked(child);
      console.assert(child.body.type === "BlockStatement");

      let patch = Iroh.parseExpressionStatement(`var ${id} = 0;`);
      body.splice(ii, 0, patch);
      ii++;

      let test = {
        magic: true,
        type: "CallExpression",
        callee: {
          type: "Identifier",
          name: Iroh.getLink("DEBUG_LOOP_TEST")
        },
        arguments: [
          Iroh.parseExpression(hash),
          child.test
        ]
      };
      child.test = test;

      let start = {
        magic: true,
        type: "IfStatement",
        test: Iroh.parseExpression(`${id} === 0`),
        alternate: null,
        consequent: {
          magic: true,
          type: "ExpressionStatement",
          expression: {
            magic: true,
            type: "CallExpression",
            callee: {
              type: "Identifier",
              name: Iroh.getLink("DEBUG_LOOP_ENTER")
            },
            arguments: [
              Iroh.parseExpression(hash),
              // set the loop enter state to fullfilled
              Iroh.parseExpression(`${id} = 1`)
            ]
          }
        }
      };
      child.body.body.unshift(start);
    }
    Iroh.walk(child, Iroh.state, Iroh.stage);
    if (isLoopStatement) {
      let end = {
        magic: true,
        type: "ExpressionStatement",
        expression: {
          magic: true,
          type: "CallExpression",
          callee: {
            type: "Identifier",
            name: Iroh.getLink("DEBUG_LOOP_LEAVE")
          },
          arguments: [
            Iroh.parseExpression(hash),
            Iroh.parseExpression(id)
          ]
        }
      };
      body.splice(ii + 1, 0, end);
      ii++;
    }
  };
};

Iroh.stage7.Program = Iroh.stage1.Program;
Iroh.stage7.MethodDefinition = Iroh.stage1.MethodDefinition;
Iroh.stage7.FunctionDeclaration = Iroh.stage1.FunctionDeclaration;
Iroh.stage7.FunctionExpression = Iroh.stage1.FunctionExpression;
Iroh.stage7.ArrowFunctionExpression = Iroh.stage1.ArrowFunctionExpression;
