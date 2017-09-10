### Getting started

The idea behind Iroh is simple. You attach listeners to your code and as soon as the specified code part is reached, it will fire. You can listen for calls, returns, loops or any other supported code.

Iroh's listeners are named in regard to [EStree](https://github.com/estree/estree/blob/master/es5.md) which is an AST specification format for JavaScript.

The pipeline of Iroh is:

 * Create a stage, pass in your code
 * Add listeners to the stage
 * Run the stage

##### 1. Creating a stage:
We need a stage object to submit our code into and to attach some listeners.

Syntax:
````js
let stage = new Iroh.Stage(code:string)
````
Example:
````js
let code = "console.log({ a:1, b:2 })";
let stage = new Iroh.Stage(code);
````

##### 2. Add listeners
Listeners get triggered while your code is executed. Their purpose is to allow you to listen for runtime data while your script is running, but without changing your script in it's expected behaviour. They just listen and give you insights about your running code.

Syntax:
````js
let listener = stage.addListener(type:number);
listener.on(event:string, trigger:function);
````
Example:
````js
// Let's catch all object and array creations in our code
let listener = stage.addListener(Iroh.ALLOC);
listener.on("fire", (e) => {
  let value = e.value; // {a:1, b:2}
  console.log("Something got created:", value);
});
````

##### 3. Running the stage
After attaching the listeners we now need to run the stage, so our code actually gets executed. Since Iroh has to patch your code first, we need to run the patched version manually afterwards.

Syntax:
````js
stage.script; // this contains the patched code to run
````
Example:
````js
let script = stage.script;
eval(script); // not recommended, but we just use eval here to keep things simple
````

If you are wondering what the patched code looks like:

**Input**:

````js
function add(a, b) {
  return a + b;
};
add(2, 4);
````

**Output**:
````js
const $$STx1 = Iroh.stages["$$STx1"];
var $$frameValue = void 0;
$$STx1.$45(5)
function add(a, b) {
  $$STx1.$4(6, this, add, arguments);
  return $$STx1.$1(1, "add", $$STx1.$32(7, 1, a, b));
  $$STx1.$5(6, this);
}
;
$$STx1.$44($$frameValue = $$STx1.$2(4, this, add, null, [$$STx1.$30(2, 2), $$STx1.$30(3, 4)]));
$$STx1.$46(5, $$frameValue)
````

### API

#### Iroh:

``Stage``: Returns a new stage object to work with after being instantiated.

``stages``: An object which contains references to all running stages.

``parse``: A reference to ``acorn.parse`` to turn source code into an AST.

``generate``: A reference to ``astring.generate`` to turn an AST back into source code.

#### Iroh.Stage:

``key``: The stage's unique key.

``input``: The original submitted code.

``script``: The patched version of the submitted code.

``nodes``: An object which contains references to all AST nodes in the code, indexed by their relative ``hash`` code.

``symbols``: An object which contains references to all functions, indexed by the given function's name.

``addListener``: Takes an numeric listener type as it's first parameter and returns an ``RuntimeListener`` object.

``getFunctionNodeByName``: Returns the raw AST node related to the passed in function name.

#### Iroh.Stage.RuntimeListener:

Each ``RuntimeListener`` event has an ``RuntimeEvent`` argument which contains various event specific properties.

Example:
````js
let listener = stage.addListener(Iroh.ALLOC);
listener.on("fire", (e) => console.log(e.value));
````
``Iroh.ALLOC`` has only one event called ``fire``. This means the listener just fires as soon as the related code get's executed. In this case ``fire`` triggers when an object or array gets created. The event's property ``value`` contains a reference to the allocated object. Since ``fire`` gets triggered before the actual code gets executed, we can even modify the passed in data!

All listener events provide you the following fixed options:

##### Properties:

All ``RuntimeEvents`` come with the following fixed properties:

``hash``: Unique numeric hash which is also a link to the original AST node. The hash is only used once for the specific code location.

``indent``: Numeric indentation level which can be used to model the code's flow. Increases when entering a branch (e.g. ``Iroh.IF.enter``) and decreases after leaving a branch (e.g. ``Iroh.IF.leave``).

##### Methods:

All ``RuntimeEvents`` come with the following fixed methods:

``getASTNode``: Returns the original AST node

``getPosition``: Returns an object with the original source position (``start``, ``end``)

``getLocation``: Returns an object with the original source location, which is better formated than ``getPosition``. The object contains: (``start.line``, ``start.column``), (``end.line``, ``end.column``).

``getSource``: Returns the original (non-patched) relative source code

#### Specification:

Iroh provides the following listeners types, which can be used to listen for specific code types.

````js
Iroh.IF
  if () {}
  else if () {}
Iroh.ELSE
  else {}
Iroh.LOOP
  while () {}
  do {} while ()
  for () {}
  for (a in b) {}
  for (a of b) {}
Iroh.BREAK
  break
Iroh.CONTINUE
  continue
Iroh.SWITCH
  switch () {}
Iroh.CASE
  case :
  default :
Iroh.CALL
  object()
Iroh.FUNCTION
  function() {}
Iroh.VAR
  let
  var
  const
Iroh.OP_NEW
  new object()
Iroh.TRY
  try {}
Iroh.CATCH
  catch(e) {}
Iroh.FINALLY
  finally() {}
Iroh.ALLOC
  {},
  []
Iroh.MEMBER
  a.b
  a[b]
Iroh.THIS
  this
Iroh.LITERAL
  ""
  1
  true
  ..
Iroh.ASSIGN
  a = 2
  a += 2
  ..
Iroh.TERNARY
  true ? 1 : 0
Iroh.LOGICAL
  &&,
  ||
Iroh.BINARY
  +,
  -,
  *
  ..
Iroh.UNARY
  +0,
  -0,
  !true
  typeof a
  ..
Iroh.UPDATE
  ++object
  --object
  object++
  object--
  ..
Iroh.PROGRAM
  Code enter,
  Code exit
````

This list gives you an overview, which events a listener supports and which properties come along with it.

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
    * ``indent``: Indent level
    * ``value``: The loop's condition value
    * ``kind``: Indicates the loop kind e.g. ``WhileStatement``
 * ``enter``
    * ``hash``: Unique hash
    * ``indent``: Indent level
    * ``kind``: Indicates the loop kind e.g. ``DoWhileStatement``
 * ``leave``
    * ``hash``: Unique hash
    * ``indent``: Indent level
    * ``kind``: Indicates the loop kind e.g. ``ForStatement``

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
    * ``arguments``: The call's arguments
    * ``context``: The context the call is performed in
    * ``object``: The call's object
    * ``call``: Called function if object is null
    * ``callee``: String version of the called function name
    * ``external``: E.g. ``Array.map`` and ``eval`` are external calls
 * ``after``
    * ``hash``: Unique hash
    * ``indent``: Indent level
    * ``arguments``: The call's arguments
    * ``return``: The returned value after the call is performed
    * ``context``: The context the call is performed in
    * ``object``: The call's object
    * ``call``: Called function if object is null
    * ``callee``: String version of the called function name
    * ``external``: E.g. ``Array.map`` and ``eval`` are external calls

**``Iroh.FUNCTION``**:
 * ``enter``
    * ``hash``: Unique hash
    * ``indent``: Indent level
    * ``scope``: The function's inner scope
    * ``sloppy``: Got called from outside
    * ``arguments``: The function's arguments
    * ``name``: The function's name
 * ``leave``
    * ``hash``: Unique hash
    * ``indent``: Indent level
    * ``sloppy``: Got called from outside
    * ``name``: The function's name
 * ``return``
    * ``hash``: Unique hash
    * ``indent``: Indent level
    * ``sloppy``: Got called from outside
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

**``Iroh.CATCH``**:
 * ``enter``
    * ``hash``: Unique hash
    * ``indent``: Indent level
 * ``leave``
    * ``hash``: Unique hash
    * ``indent``: Indent level

**``Iroh.FINALLY``**:
 * ``enter``
    * ``hash``: Unique hash
    * ``indent``: Indent level
 * ``leave``
    * ``hash``: Unique hash
    * ``indent``: Indent level

**``Iroh.ALLOC``**:
 * ``fire``
    * ``hash``: Unique hash
    * ``indent``: Indent level
    * ``value``: The passed value (``object`` or ``array``)

**``Iroh.MEMBER``**:
 * ``fire``
    * ``hash``: Unique hash
    * ``indent``: Indent level
    * ``object``: The member expression's object
    * ``property``: The member expression's property

**``Iroh.THIS``**:
 * ``fire``
    * ``hash``: Unique hash
    * ``indent``: Indent level
    * ``context``: The context

**``Iroh.LITERAL``**:
 * ``fire``
    * ``hash``: Unique hash
    * ``indent``: Indent level
    * ``value``: The literal's value

**``Iroh.ASSIGN``**:
 * ``fire``
    * ``hash``: Unique hash
    * ``indent``: Indent level
    * ``op``: The used operator
    * ``object``: The left value
    * ``property``: The right value, ``null`` if ``object`` is an identifier
    * ``value``: The value to assign with

**``Iroh.TERNARY``**:
 * ``fire``
    * ``hash``: Unique hash
    * ``indent``: Indent level
    * ``test``: The tested condition
    * ``truthy``: The truth trigger
    * ``falsy``: The falsy trigger
    * ``result``: The returned value

**``Iroh.LOGICAL``**:
 * ``fire``
    * ``hash``: Unique hash
    * ``indent``: Indent level
    * ``op``: The used operator
    * ``left``: The left value
    * ``right``: The right value
    * ``result``: The result

**``Iroh.BINARY``**:
 * ``fire``
    * ``hash``: Unique hash
    * ``indent``: Indent level
    * ``op``: The used operator
    * ``left``: The left value
    * ``right``: The right value
    * ``result``: The result

**``Iroh.UNARY``**:
 * ``fire``
    * ``hash``: Unique hash
    * ``indent``: Indent level
    * ``op``: The used operator
    * ``value``: The unary's value
    * ``result``: The result

**``Iroh.UPDATE``**:
 * ``fire``
    * ``hash``: Unique hash
    * ``indent``: Indent level
    * ``op``: The used operator
    * ``prefix``: Prefix or postfix indicator
    * ``result``: The result

**``Iroh.PROGRAM``**:
 * ``enter``
    * ``hash``: Unique hash
    * ``indent``: Indent level
 * ``leave``
    * ``hash``: Unique hash
    * ``indent``: Indent level
    * ``return``: The program's returned frame value
