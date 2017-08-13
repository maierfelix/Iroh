var a = "§$";

Iroh.assert(
  "String context",
  a.charAt(0 + 0) === "§"
);

Iroh.assert(
  "String apply",
  String.fromCharCode(64) === "@"
);

Iroh.assert(
  "String apply",
  String.fromCharCode.apply(null, [64]) === "@"
);

Iroh.assert(
  "String call",
  String.fromCharCode.call(null, 64) === "@"
);

var obj = {
  a: function() { return this; }
};

Iroh.assert(
  "Object context",
  obj.a() === obj
);
