Iroh.stage8.ThisExpression = function(node) {
  if (node.magic) return;
  node.magic = true;
  node.type = "CallExpression";
  node.callee = {
    type: "Identifier",
    name: Iroh.getLink("DEBUG_THIS")
  };
  node.arguments = [ Iroh.parseExpression("this") ];
};

/*Iroh.stage8.AssignmentExpression = function(node) {
  let operator = Iroh.getOperatorHash(node.operator);
  let call = {
    magic: true,
    type: "CallExpression",
    callee: {
      type: "Identifier",
      name: Iroh.getLink("DEBUG_ASSIGN")
    },
    arguments: [
      // numeric operator hash
      Iroh.parseExpression(operator),

    ]
  };
};*/

var gg = "123";
gg += "1";

(gg = DBG_ASSIGN("+", gg, "1"));

DBG_ASSIGN("+=", gg, "1", null);

var a = {b:"123"};
a.b += c;
a.b = a.b + c;
DBG_ASSIGN("+=", a, b, "b");

"DEBUG_ASSIGN_EXPR";
"DEBUG_UNARY_EXPR"; dbg(op, argument)
"DEBUG_UPDATE_EXPR"; dbg(op, argument)

// TODO: instanceof, in -> binary

logical operators:
  &&
  ||
  ==
  ===
  !=
  !==
  >
  >=
  <
  <=

DBG_UNARY:
  +
  -
  !
  ~
  void
  typeof
  delete
  var a = false;
  !a;
  (DBG_UNARY("!", a));

DBG_UPDATE:
  ++
  --

DBG_UPDATE:
  ...see above

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
