var a = !true;
var b = typeof a; // "boolean"
var c = typeof d; // "undefined"
var z = typeof {}; // "object"

Iroh.assert(
  "typeof declared, boolean",
  a === false
);

Iroh.assert(
  "typeof primitive",
  b === "boolean"
);

Iroh.assert(
  "typeof undeclared",
  c === "undefined"
);

Iroh.assert(
  "typeof direct value",
  z === "object"
);

Iroh.assert(
  "typeof parenthesed primitive",
  typeof (2) === "number"
);

Iroh.assert(
  "typeof sequence expression",
  typeof ("a", 3) === "number"
);

Iroh.assert(
  "typeof expression",
  typeof (1 + 1) === "number"
);
