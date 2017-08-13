var a = 1;
var b = 0;
(a === 1 ? a = 2 : b = 7);

Iroh.assert("Ternary true",
  a === 2 &&
  b === 0
);

var a = 1;
var b = 0;
(a === 0 ? a = 2 : b = 7);

Iroh.assert("Ternary false",
  a !== 2 &&
  b === 7
);
