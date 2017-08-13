var a = 0;
Iroh.assert("Update base",
  a === 0
);
var b = ++a; // 1
Iroh.assert("Update prefix",
  a === 1 &&
  b === 1
);
var c = a++; // 1
Iroh.assert("Update postfix",
  a === 2 &&
  c === 1
);

a = 1;
Iroh.assert("Update negative",
  (a--) === 1 &&
  (--a) === -1
);
