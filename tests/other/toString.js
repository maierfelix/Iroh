function main() { return 42; };
let mainString = "function main() { return 42; }";

Iroh.assert(
  "intercept toString",
  main.toString() === mainString
);

