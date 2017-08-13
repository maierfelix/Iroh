function Human(name) {
  this.age = 0;
  this.name = name;
  this.init();
};

Human.prototype.init = function() {
  Iroh.log("Bearded drug addict with name", this.name, "created!");
  this.age = ((Math.random() * 1e3) + 1) | 0;
};

Human.prototype.shout = function() {
  Iroh.log("Hello, I'am", this.name);
};

let human = new Human("Gandalf");
let human2 = new Human("Gandalf");

Iroh.assert(
  "Correct prototype",
  Human.prototype.constructor.name === "Human"
);

Iroh.assert(
  "Instances have different addresses",
  human !== human2
);

Iroh.assert(
  "Correct constructor",
  Object.getPrototypeOf(human).constructor.name === "Human"
);

Iroh.assert(
  "Instantiated properties setted",
  human.hasOwnProperty("age") &&
  human.hasOwnProperty("name")
);

Iroh.assert(
  "This on instantiated Function",
  human.name === "Gandalf"
);

Iroh.assert(
  "Instantiated properties correctly filled",
  human.name === "Gandalf" &&
  human.age > 0
);
