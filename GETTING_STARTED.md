### Getting started

The idea behind Iroh is simple. You attach listeners to your code and as soon as the specified code part is reached, it will fire. You can listen for calls, returns, loops or any other supported code type.

Iroh's listeners are named in regard to [EStree](//github.com/estree/estree/blob/master/es5.md) which is an AST specification format for JavaScript. There is also a list [here](//github.com/maierfelix/Iroh/blob/master/API.md#specification) which gives an simple overview of all code types you can listen for.

## Examples

- [Intro](#intro)
- [Manipulate functions](#manipulate-functions)
- [Visualize code](#visualize-code)

### Intro

This is a short intro about how to use Iroh.

The pipeline of Iroh is simple:

 * Create a stage, pass in your code
 * Add listeners to the stage
 * Run the stage

##### 1. Create a stage

The code of this example is also available on [jsfiddle](//jsfiddle.net/58y7p92v/).

At first we need to create a ``stage``. The stage object is the root connection between us and the running code.

````js
let code = `let foo = 42`;
let stage = new Iroh.Stage(code);
````

``Iroh.Stage`` expects a string which contains the code you want to analyze.

##### 2. Add listeners

After creating a stage, we now need to specify what exactly we want to listen for. Let's listen for all variable declarations in our code. All event listeners provide specific events to listen for, you can find the whole list [here](//github.com/maierfelix/Iroh/blob/master/API.md#runtimeevent).

E.g. ``Iroh.VAR`` has two events:
  * ``before``: What to do before a variable got it's value assigned
  * ``after``: What to do after the variable got it's value assigned

````js
// create a listener
let listener = stage.addListener(Iroh.VAR);
// jump in *after* the variable got created
listener.on("after", (e) => {
  // this logs the variable's 'name' and 'value'
  console.log(e.name, "=>", e.value); // prints "foo => 42"
});
````

##### 3. Run the stage
Our stage is now ready to be executed. Since Iroh patches the code we want to analyze, we need to manually run the patched code afterwards.

````js
// the stage object holds the patched version of our code
// we just use eval here to keep things simple
eval(stage.script);
````

Our console should now show up ``"foo => 42"``.

All right, you did your first magic with Iroh!

### Manipulate functions

Iroh allows to manipulate code while it's running. Most listeners provide values, which directly affect the running code when changing them.

The code used in this example is the following:
````js
function add(a, b) {
  return a + b;
};
````

Our goal is to make the function ``add`` always return ``42`` instead of ``a + b``.

The code of this example is also available on [jsfiddle](//jsfiddle.net/8ycm17uu/1/).

##### Adding the listener
````js
// this creates a listener for all function events
let listener = stage.addListener(Iroh.FUNCTION);
// this specifies to listen for all function returns
listener.on("return", (e) => {
  // make sure we only change the return value of the function 'add'
  if (e.name === "add") e.return = 42;
});
````

Now as soon as a return gets executed in our code, Iroh jumps in between and gives us some useful properties like the function's name and the return value which we can directly change.

So now we just have to run the stage:

````js
eval(stage.script); // we just use eval here to keep things simple
````

When now running ``add`` it should always return ``42``.

### Visualize code

Iroh keeps track of the control-flow of your program, means it generates a numeric indentation value based on when code branches are *entered* and *left*. A code branch can be an ``if``, ``else``, ``call``, ``loop`` and so on. For example, when entering an ``if``, the indentation value goes ``+1``, when leaving it decrements by ``-1``.

This makes it possible to create any kind of model from the running code in realtime. **All** listeners provide an ``RuntimeEvent.indent``!

The code of this example is also available on [jsfiddle](//jsfiddle.net/wwn90rp3/8/).

Input: 
````js
if (true) {
  for (let ii = 0; ii < 3; ++ii) {
    let a = ii * 2;
  };
}
````
So we have 2 branches here, ``if`` and ``for``.

Let's create listeners for all ``if`` and ``loop`` statements in our code.

````js
// while, for etc.
stage.addListener(Iroh.LOOP)
.on("enter", function(e) {
  // we enter the loop
  console.log(" ".repeat(e.indent) + "loop enter");
})
.on("leave", function(e) {
  // we leave the loop
  console.log(" ".repeat(e.indent) + "loop leave");
});

// if, else if
stage.addListener(Iroh.IF)
.on("enter", function(e) {
  // we enter the if
  console.log(" ".repeat(e.indent) + "if enter");
})
.on("leave", function(e) {
  // we leave the if
  console.log(" ".repeat(e.indent) + "if leave");
});
````

You may noticed the ``" ".repeat(e.indent)`` inside all listener events. This just repeats the string on its left (a blank sign here) x times. The higher the ``e.indent`` number is, the more we are padding to the right. This results in a nice effect which directly shows the control-flow of the running code.

After the program finished, your console should come up with something like this:
````
 if enter
  loop enter
  loop leave
 if leave
````
With each branch deepness level we move in by 1 blank sign.

You may noticed the first blank sign which is caused by ``Iroh.PROGRAM`` - when entering a program, the branch level increments by one and after the program is finished it decrements.
