Iroh.stage8.ThisExpression = function(node) {
  if (node.magic) return;
  node.magic = true;
  node.type = "CallExpression";
  node.callee = {
    magic: true,
    type: "Identifier",
    name: Iroh.getLink("DEBUG_THIS")
  };
  node.arguments = [ Iroh.parseExpression("this") ];
};

Iroh.stage8.BinaryExpression = function(node) {
  if (node.magic) return;
  Iroh.walk(node.left, Iroh.state, Iroh.stage);
  Iroh.walk(node.right, Iroh.state, Iroh.stage);
  node.magic = true;
  node.type = "CallExpression";
  node.callee = {
    magic: true,
    type: "Identifier",
    name: Iroh.getLink("DEBUG_BINARY")
  };
  node.arguments = [
    Iroh.parseExpression(Iroh.OP[node.operator]),
    node.left,
    node.right
  ];
};

Iroh.stage8.LogicalExpression = function(node) {
  if (node.magic) return;
  Iroh.walk(node.left, Iroh.state, Iroh.stage);
  Iroh.walk(node.right, Iroh.state, Iroh.stage);
  node.magic = true;
  node.type = "CallExpression";
  node.callee = {
    magic: true,
    type: "Identifier",
    name: Iroh.getLink("DEBUG_LOGICAL")
  };
  let right = Iroh.parseExpression("() => null");
  right.body = node.right;
  node.arguments = [
    Iroh.parseExpression(Iroh.OP[node.operator]),
    node.left,
    right
  ];
};

Iroh.stage8.UnaryExpression = function(node) {
  if (node.magic) return;
  node.magic = true;
  Iroh.walk(node.argument, Iroh.state, Iroh.stage);
  node.type = "CallExpression";
  node.callee = {
    magic: true,
    type: "Identifier",
    name: Iroh.getLink("DEBUG_UNARY")
  };
  let argument = node.argument;
  // non-trackable yet FIXME
  if (node.operator === "delete") {
    argument = {
      magic: true,
      type: "UnaryExpression",
      operator: node.operator,
      prefix: true,
      argument: argument
    };
  }
  node.arguments = [
    Iroh.parseExpression(Iroh.OP[node.operator]),
    Iroh.parseExpression("this"),
    Iroh.parseExpression(false),
    argument
  ];
  // typeof fixup
  // typeof is a weirdo
  if (node.operator === "typeof" && argument.type === "Identifier") {
    let id = Iroh.reserveTempVarId();
    let patch = Iroh.parseExpressionStatement(`var ${id};`);
    Iroh.injectPatchIntoNode(Iroh.scope.node, patch);
    let name = argument.name;
    // heute sind wir räudig
    let critical = Iroh.parseExpression(
      `(() => { try { ${name}; } catch(e) { ${id} = "undefined"; return true; } ${id} = ${name}; return false; })()`
    );
    node.arguments = [
      Iroh.parseExpression(Iroh.OP[node.operator]),
      Iroh.parseExpression("this"),
      critical,
      Iroh.parseExpression(id)
    ];
  }
};
/*
identifier: #critical

  typeof identifier

  Iroh.DEBUG_UNARY(
    // operator
    typeof,
    // context
    this,
    // critical
    () => { try { ID; } catch(e) { $$tmp = "undefined"; return true; } $$tmp = ID; return false; })(),
    // value
    $$tmp
  );

everything else: #non-critical
  dbg(
    typeof a !== "undefined" ? a : void 0
  )
*/
Iroh.stage8.ConditionalExpression = function(node) {
  if (node.magic) return;
  node.magic = true;
  Iroh.walk(node.test, Iroh.state, Iroh.stage);
  Iroh.walk(node.consequent, Iroh.state, Iroh.stage);
  Iroh.walk(node.alternate, Iroh.state, Iroh.stage);

  let cons = Iroh.parseExpression("() => null");
  cons.body = node.consequent;
  let alt = Iroh.parseExpression("() => null");
  alt.body = node.alternate;

  node.type = "CallExpression";
  node.callee = {
    magic: true,
    type: "Identifier",
    name: Iroh.getLink("DEBUG_TERNARY")
  };
  node.arguments = [
    node.test,
    cons,
    alt
  ];

};

/*
Iroh.stage8.UpdateExpression = function(node) {
  if (node.magic) return;
  node.magic = true;
  Iroh.walk(node.argument, Iroh.state, Iroh.stage);
  console.log(node);
};*/
/*
Iroh.stage8.Literal = function(node) {
  if (node.magic) return;
  let clone = Iroh.cloneNode(node);
  node.magic = true;
  node.type = "CallExpression";
  node.callee = {
    magic: true,
    type: "Identifier",
    name: Iroh.getLink("DEBUG_LITERAL")
  };
  node.arguments = [
    clone
  ];
};

Iroh.stage8.Identifier = function(node) {
  if (node.magic) return;
  node.magic = true;
  let clone = Iroh.cloneNode(node);
  node.type = "CallExpression";
  node.callee = {
    magic: true,
    type: "Identifier",
    name: Iroh.getLink("DEBUG_IDENTIFIER")
  };
  node.arguments = [
    Iroh.parseExpression(`"${node.name}"`),
    clone
  ];
};
*/
/*
var gg = "123";
gg += "1";

(gg = DBG_ASSIGN("+", gg, "1"));

DBG_ASSIGN("+=", gg, "1", null);

var a = {b:"123"};
a.b += c;
a.b = a.b + c;
DBG_ASSIGN("+=", a, b, "b");

"DEBUG_ASSIGN_EXPR";
"DEBUG_UPDATE_EXPR"; argument = dbg(op, argument)

DBG_UPDATE:
  ++
  --

DBG_ASSIGN:
  single id:
    var a = "123";
    var c = "4";
    a += c;
    (a += DBG_ASSIGN("+", a, null, c));
  object:
    var a = { b: "123" };
    var c = "4";
    a.b += c;
    (DBG_ASSIGN("+=", a, "b", c))

Iroh.stage8.ConditionalExpression = function(node) {
  return DBG_TERNARY(
    $$x0 = (a === 1),
    $$x0 ? a = 2 : b = 7
  );
};

Iroh.stage8.LogicalExpression = function(node) {
  return DBG_LOGICAL(
    op,
    a,
    b
  );
};

Iroh.stage8.BinaryExpression = function(node) {
  return DBG_BINARY(
    op,
    a,
    b
  );
};
*/

Iroh.stage8.Program = Iroh.stage1.Program;
Iroh.stage8.BlockStatement = Iroh.stage1.BlockStatement;
Iroh.stage8.MethodDefinition = Iroh.stage1.MethodDefinition;
Iroh.stage8.FunctionDeclaration = Iroh.stage1.FunctionDeclaration;
Iroh.stage8.FunctionExpression = Iroh.stage1.FunctionExpression;
Iroh.stage8.ArrowFunctionExpression = Iroh.stage1.ArrowFunctionExpression;
