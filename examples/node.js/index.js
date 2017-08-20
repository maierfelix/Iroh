const Iroh = require("iroh");

let stage = new Iroh.Stage(`
function factorial(n) {
  if (n === 0) return 1;
  return n * factorial(n - 1);
};
factorial(3);
`);

// function call
stage.addListener(Iroh.CALL)
.on("before", (e) => {
  let external = e.external ? "#external" : "";
  console.log(" ".repeat(e.indent) + "call", e.name, external, "(", e.arguments, ")");
  //console.log(e.getSource());
})
.on("after", (e) => {
  let external = e.external ? "#external" : "";
  console.log(" ".repeat(e.indent) + "call", e.name, "end", external, "->", [e.return]);
  //console.log(e.getSource());
});

// function
stage.addListener(Iroh.FUNCTION)
.on("enter", (e) => {
  let sloppy = e.sloppy ? "#sloppy" : "";
  if (e.sloppy) {
    console.log(" ".repeat(e.indent) + "call", e.name, sloppy, "(", e.arguments, ")");
    //console.log(e.getSource());
  }
})
.on("leave", (e) => {
  let sloppy = e.sloppy ? "#sloppy" : "";
  if (e.sloppy) {
    console.log(" ".repeat(e.indent) + "call", e.name, "end", sloppy, "->", [void 0]);
    //console.log(e.getSource());
  }
})
.on("return", (e) => {
  let sloppy = e.sloppy ? "#sloppy" : "";
  if (e.sloppy) {
    console.log(" ".repeat(e.indent) + "call", e.name, "end", sloppy, "->", [e.return]);
    //console.log(e.getSource());
  }
});

// program
stage.addListener(Iroh.PROGRAM)
.on("enter", (e) => {
  console.log(" ".repeat(e.indent) + "Program");
})
.on("leave", (e) => {
  console.log(" ".repeat(e.indent) + "Program end", "->", e.return);
});

eval(stage.script);
