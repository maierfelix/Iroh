### Getting started

The pipeline consists of three steps.

 * Create a stage, pass in your code
 * Add listeners to the stage
 * Finally run the stage

##### 1. Creating a stage:
````js
let code = `console.log({a:1, b:2})`;
let stage = new Iroh.Stage(code);
````

##### 2. Add listeners
````js
// Let's intercept allocations in the code
stage.addListener(Iroh.ALLOC)
.on("fire", (e) => {
  console.log("Allocated", e.value);
  // we can manipulate something here
  e.value.a = 0;
});
````

##### 3. Running the stage
````js
let script = stage.script; // this is our patched code
eval(script);
````

### API

``Iroh.Stage`` has to get initialised with a string as it's first argument which contains the code you want to intercept.
````js
stage = new Iroh.Stage(string)
````

``stage.addListener(type)`` attaches a new listener to the stage.
````js
let listener = stage.addListener(Iroh.CALL);
listener.on("before", (e) => {
  // what happens before a call
});
listener.on("after", (e) => {
  // what happens after a call
});
````

``listener.on`` allows to create an event listener. E.g. ``Iroh.CALL`` has two events. What happens **before** a call and what happens **after** a call.

``listener.on("before")`` allows us in this case, to track and manipulate the ``arguments`` used for all calls inside our code.
``listener.on("after")`` allows us to track and change the returned value of a call - it's final result.

#### Listener API:

Each listener has an ``RuntimeEvent`` argument which contains various type specific properties.

````js
stage.addListener(Iroh.ALLOC)
  .on("fire", (e) => {
    // e.value contains a reference to the allocated item
    // e.g. we can log all instantiated items in our code
    console.log(e.value); // all arrays and objects logged here
  });
````

All listener events have the following fixed options:

##### Properties:

``hash``: Unique numeric hash which is also a link to the original AST node

``indent``: Numeric indentation level which can be used to model the code's flow. Increases when entering a branch (e.g. ``Iroh.IF.enter``) and decreases after leaving a branch (e.g. ``Iroh.IF.leave``).

##### Methods:

``getASTNode``: Returns the original AST node

``getLocation``: Returns an object with the original source location

``getSource``: Returns the original source code

#### Specification:

Available listeners are:
````js
Iroh.IF
Iroh.ELSE
Iroh.LOOP
Iroh.BREAK
Iroh.CONTINUE
Iroh.SWITCH
Iroh.CASE
Iroh.CALL
Iroh.FUNCTION
Iroh.VAR
Iroh.OP_NEW
Iroh.TRY
Iroh.ALLOC
Iroh.MEMBER
Iroh.THIS
Iroh.ASSIGN
Iroh.TERNARY
Iroh.LOGICAL
Iroh.BINARY
Iroh.UNARY
Iroh.PROGRAM
````

**``Iroh.IF``**:
 * ``test``
    * ``hash``: Unique hash
    * ``value``: The if's condition value
    * ``indent``: Indent level
 * ``enter``
    * ``hash``: Unique hash
    * ``value``: The if's condition value
    * ``indent``: Indent level
 * ``leave``
    * ``hash``: Unique hash
    * ``indent``: Indent level

**``Iroh.ELSE``**:
 * ``enter``
    * ``hash``: Unique hash
    * ``indent``: Indent level
 * ``leave``
    * ``hash``: Unique hash
    * ``indent``: Indent level

**``Iroh.LOOP``**:
 * ``test``
    * ``hash``: Unique hash
    * ``value``: The loop's condition value
    * ``indent``: Indent level
 * ``enter``
    * ``hash``: Unique hash
    * ``indent``: Indent level
 * ``leave``
    * ``hash``: Unique hash
    * ``indent``: Indent level

**``Iroh.BREAK``**:
 * ``fire``
    * ``hash``: Unique hash
    * ``value``: Do break or not
    * ``indent``: Indent level

**``Iroh.CONTINUE``**:
 * ``fire``
    * ``hash``: Unique hash
    * ``value``: Do continue or not
    * ``indent``: Indent level

**``Iroh.SWITCH``**:
 * ``test``
    * ``hash``: Unique hash
    * ``value``: The switch's tested value
    * ``indent``: Indent level
 * ``enter``
    * ``hash``: Unique hash
    * ``indent``: Indent level
 * ``leave``
    * ``hash``: Unique hash
    * ``indent``: Indent level

**``Iroh.CASE``**:
 * ``test``
    * ``hash``: Unique hash
    * ``value``: The case's tested value
    * ``indent``: Indent level
 * ``enter``
    * ``hash``: Unique hash
    * ``indent``: Indent level
    * ``default``: Default case or not
 * ``leave``
    * ``hash``: Unique hash
    * ``indent``: Indent level
    * ``default``: Default case or not

**``Iroh.CALL``**:
 * ``before``
    * ``hash``: Unique hash
    * ``indent``: Indent level
    * ``context``: The context (e.g. ``Function``)
    * ``callee``: The callee (e.g. ``toString``)
    * ``name``: An auto generated name
    * ``arguments``: The call's arguments
    * ``external``: E.g. Array.map is external
 * ``after``
    * ``hash``: Unique hash
    * ``indent``: Indent level
    * ``context``: The context (e.g. ``Function``)
    * ``callee``: The callee (e.g. ``toString``)
    * ``name``: An auto generated name
    * ``arguments``: The call's arguments
    * ``return``: The call's return value
    * ``external``: E.g. Array.map is external

**``Iroh.FUNCTION``**:
 * ``enter``
    * ``hash``: Unique hash
    * ``indent``: Indent level
    * ``scope``: The function's inner scope
    * ``sloppy``: Got called from outside (e.g. setTimeout's parameter)
    * ``arguments``: The function's arguments
    * ``name``: The function's name
 * ``leave``
    * ``hash``: Unique hash
    * ``indent``: Indent level
    * ``sloppy``: Got called from outside (e.g. setTimeout's parameter)
    * ``name``: The function's name
 * ``return``
    * ``indent``: Indent level
    * ``sloppy``: Got called from outside (e.g. setTimeout's parameter)
    * ``return``: The return statement's value
    * ``name``: The function's name

**``Iroh.VAR``**:
 * ``before``
    * ``hash``: Unique hash
    * ``indent``: Indent level
    * ``name``: The variable's name
 * ``after``
    * ``hash``: Unique hash
    * ``indent``: Indent level
    * ``name``: The variable's name
    * ``value``: The variable's value

**``Iroh.NEW``**:
 * ``before``
    * ``hash``: Unique hash
    * ``indent``: Indent level
    * ``ctor``: The passed constructor
    * ``name``: Auto-generated constructor name
    * ``arguments``: The passed constructor arguments
 * ``after``
    * ``hash``: Unique hash
    * ``indent``: Indent level
    * ``return``: The new's returned value

**``Iroh.TRY``**:
 * ``enter``
    * ``hash``: Unique hash
    * ``indent``: Indent level
 * ``leave``
    * ``hash``: Unique hash
    * ``indent``: Indent level

**``Iroh.ALLOC``**:
 * ``fire``
    * ``indent``: Indent level
    * ``value``: The passed value (``object`` or ``array``)

**``Iroh.MEMBER``**:
 * ``fire``
    * ``indent``: Indent level
    * ``object``: The member expression's object
    * ``property``: The member expression's property

**``Iroh.THIS``**:
 * ``fire``
    * ``indent``: Indent level
    * ``context``: The context

**``Iroh.ASSIGN``**:
 * ``fire``
    * ``indent``: Indent level
    * ``op``: The used operator
    * ``object``: The left value
    * ``property``: The right value, ``null`` if ``object`` is an identifier
    * ``value``: The value to assign with

**``Iroh.TERNARY``**:
 * ``fire``
    * ``indent``: Indent level
    * ``test``: The tested condition
    * ``truthy``: The truth trigger
    * ``falsy``: The falsy trigger
    * ``result``: The returned value

**``Iroh.LOGICAL``**:
 * ``fire``
    * ``indent``: Indent level
    * ``op``: The used operator
    * ``left``: The left value
    * ``right``: The right value
    * ``result``: The result

**``Iroh.BINARY``**:
 * ``fire``
    * ``indent``: Indent level
    * ``op``: The used operator
    * ``left``: The left value
    * ``right``: The right value
    * ``result``: The result

**``Iroh.UNARY``**:
 * ``fire``
    * ``indent``: Indent level
    * ``op``: The used operator
    * ``value``: The unary's value
    * ``result``: The result

**``Iroh.PROGRAM``**:
 * ``enter``
    * ``indent``: Indent level
 * ``leave``
    * ``indent``: Indent level
    * ``return``: The program's returned frame value
