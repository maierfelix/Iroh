let markers = [];

function clear() {
  reports.innerHTML = "";
  clearMarkers();
};

function clearMarkers() {
  markers.map(function(marker) { marker.clear() });
};

// runStage gets called as soon as
// we change the code in the editor
function runStage(input) {

  clear();

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

  function warn(msg) {
    let el = document.createElement("p");
    el.innerHTML = msg;
    reports.appendChild(el);
  };

  // Iroh allows to intercept all calls in our code
  stage.addListener(Iroh.CALL)
  // what happens before the call gets executed
  .on("before", function(e) {
    // dont track external calls
    if (e.external) return;
    // take the raw function to call
    let fn = (
      e.object instanceof Function ? e.object :
      e.call
    );
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
    let node = e.getASTNode();
    let msg = "";
    for (let ii = 0; ii < argCount; ++ii) {
      // continue if function argument type has changed
      if (func.arguments[ii] === getType(e.arguments[ii])) continue;
      if (ii > node.arguments.length - 1) continue;
      let loc = node.arguments[ii].loc;
      // create a codemirror text marker
      markers.push(editor.markText(
        { line: loc.start.line - 1, ch: loc.start.column },
        { line: loc.end.line - 1, ch: loc.end.column },
        { className: "poly-argument" }
      ));
      msg += (`(${ii}: ${getType(e.arguments[ii])}!=${func.arguments[ii]})`);
      if (ii < argCount - 1) msg += ", ";
    };
    // we got some bad argument types
    if (msg.length > 0) {
      let loc = node.loc;
      msg = `Arguments ${msg}`;
      warn(`${fn.name}: ${msg} in ${loc.start.line}:${loc.start.column}`);
    }
  })
  // what happens after the call is performed
  .on("after", function(e) {
    if (e.external) return;
    // take the raw function to call
    let fn = (
      e.object instanceof Function ? e.object :
      e.call
    );
    // get the calls source code location
    let loc = e.getASTNode().callee.loc;
    // our function object
    let func = functions[fn.name];
    // we expect that the function is already registered
    // if the function doesn't have a return property yet
    // then register the first used return type as absolute
    if (!func.hasOwnProperty("return")) {
      // assign the initial return type here
      func.return = getType(e.return);
    }
    // func return type changed
    if (func.return !== getType(e.return)) {
      // mark the bad code
      let marker = editor.markText(
        { line: loc.start.line - 1, ch: loc.start.column },
        { line: loc.end.line - 1, ch: loc.end.column },
        { className: "poly-return" }
      );
      markers.push(marker);
      warn(`${fn.name}: Return (${typeof e.return}!=${func.return}) in ${loc.start.line}:${loc.start.column}`);
    }
  });

  // run our stage
  eval(stage.script);

};
