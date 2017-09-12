### API

- [Iroh](#iroh)
- [Iroh.Stage](#iroh.stage)
- [Iroh.Stage.RuntimeListener](#iroh.stage.runtimelistener)
- [RuntimeListener.RuntimeEvent](#runtimeevent)
- [Listener Specification](#specification)

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

### RuntimeEvent

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


### Specification:

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
