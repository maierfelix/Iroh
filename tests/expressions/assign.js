var obj = {
  a: {
    b: 42
  }
};

var prop = "";
prop += "b";

Iroh.assert(
  "Assignment expression test start",
  prop === "b"
);

Iroh.assert(
  "",
  obj.a.b === 42
);

Iroh.assert(
  "",
  obj["a"].b === 42
);

Iroh.assert(
  "",
  obj["a"]["b"] === 42
);

Iroh.assert(
  "",
  obj.a[prop] === 42
);

obj.a[prop] = 666;
Iroh.assert(
  "",
  obj.a.b === 666
);

obj.a["" + "b"] = 777;
Iroh.assert(
  "",
  obj.a.b === 777
);

obj.a["b"] = 888;
Iroh.assert(
  "",
  obj.a.b === 888
);

obj.a.b = 888;
Iroh.assert(
  "",
  obj.a.b === 888
);

obj["" + "a"].b = 1337;
Iroh.assert(
  "",
  obj.a.b === 1337
);

obj.a["b"] += 44;
Iroh.assert(
  "Assignment expression test end",
  obj.a.b === 1381
);

x = xx = 42;
Iroh.assert(
  "Multiple undeclared variable assignment",
  x === xx && x === 42
);
