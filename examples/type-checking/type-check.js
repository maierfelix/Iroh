/*
  This example is about type checking
  and detecting polymorphic types
  Polymorphism slows your javascript!
  We detect when:
    - A function's argument type changed
    - A function's argument count changed
    - A function's argument or return value is NaN
    - A function's return type changed
*/

// runStage gets called as soon as
// we change the code in the editor
function runStage(input) {

  // initialise
  let stage = new Iroh.Stage(input);

  // here we save all functions
  let functions = {};

  function getType(value) {
    // typeof null is "object", so return "null" instead
    if (value === null) return "null";
    // typeof NaN is "number", but we want to warn on NaN
    if (Number.isNaN(value)) return "NaN";
    return typeof value;
  };

  // Iroh allows to intercept all calls in our code
  stage.addListener(Iroh.CALL)
  // what happens before the call gets executed
  .on("before", (e) => {
    // take the raw function to call
    let fn = (
      e.object instanceof Function ? e.object :
      e.call
    );
    // get the calls source code location
    let loc = e.getLocation();
    // our function object
    let func = null;
    // the called function isn't registered yet
    // let's register it and register the initial
    // argument types as a absolute base
    if (!functions[fn.name]) {
      func = functions[fn.name] = {
        name: fn.name,
        arguments: []
      };
      // assign the function's argument types
      // so we can beef in as soon as they turn polymorphic
      for (let ii = 0; ii < e.arguments.length; ++ii) {
        func.arguments.push(getType(e.arguments[ii]));
      };
    // function already registered
    // so take the registered object
    } else {
      func = functions[fn.name];
    }
    // take the greatest argument count and loop it
    let argCount = Math.max(func.arguments.length, e.arguments.length);
    let msg = "";
    for (let ii = 0; ii < argCount; ++ii) {
      if (func.arguments[ii] !== getType(e.arguments[ii])) {
        msg += (`(${func.arguments[ii]}!=${getType(e.arguments[ii])})`);
        if (ii < argCount - 1) msg += ", ";
      }
    };
    if (msg.length > 0) {
      msg = `Arguments ${msg}`;
      console.warn(`${func.name}: ${msg} in ${loc.start.line}:${loc.start.column}`);
    }
  })
  // what happens after the call is performed
  .on("after", (e) => {
    // take the raw function to call
    let fn = (
      e.object instanceof Function ? e.object :
      e.call
    );
    // get the calls source code location
    let loc = e.getLocation();
    // our function object
    let func = functions[fn.name];
    // we expect that the function is already registered
    // if the function doesn't have a return property yet
    // then register the first used return type as absolute
    if (!func.hasOwnProperty("return")) {
      // assign the initial return type here
      func.return = typeof e.return;
    }
    if (func.return !== typeof e.return) {
      console.warn(`${func.name}: Return (${func.return}!=${typeof e.return}) in ${loc.start.line}:${loc.start.column}`);
    }
  });

  // run our stage
  eval(stage.script);

};
