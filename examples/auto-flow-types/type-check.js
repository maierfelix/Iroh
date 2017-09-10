function runStage(input) {

  let stage = new Iroh.Stage(input);

  let functions = {};
  let variables = {};

  let patches = [];

  function getType(value) {
    if (value === null) return "null";
    if (value === void 0) return "void";
    return typeof value;
  };

  function isMaybeType(value) {
    return (
      value === null ||
      value === void 0
    );
  };

  stage.addListener(Iroh.CALL)
  .on("before", function(e) {
    if (e.external) return;
    let fn = (
      e.object instanceof Function ? e.object :
      e.call
    );
    let func = null;
    if (!functions[fn.name]) {
      func = functions[fn.name] = {
        name: fn.name,
        arguments: []
      };
      for (let ii = 0; ii < e.arguments.length; ++ii) {
        func.arguments.push([getType(e.arguments[ii])]);
      };
      let fnode = stage.getFunctionNodeByName(fn.name);
      func.arguments.map(function(arg, index) {
        let start = fnode.params[index].end;
        let txt = ": " + arg;
        patches.push({
          offset: start,
          value: txt
        });
      });
    } else {
      func = functions[fn.name];
    }
    let argCount = Math.max(func.arguments.length, e.arguments.length);
    let node = e.getASTNode();
    let fnode = stage.getFunctionNodeByName(fn.name);
    for (let ii = 0; ii < argCount; ++ii) {
      let type = getType(e.arguments[ii]);
      if (func.arguments[ii].indexOf(type) > -1) continue;
      if (ii > node.arguments.length - 1) continue;
      let start = fnode.params[ii].end;
      // take existing patch and modify it
      let patch = getPatchByOffset(start);
      patch.value += " | " + type;
      func.arguments[ii].push(type);
    };
  })
  .on("after", function(e) {
    if (e.external) return;
    let fn = (
      e.object instanceof Function ? e.object :
      e.call
    );
    let loc = e.getASTNode().callee.loc;
    let func = functions[fn.name];
    if (!func.hasOwnProperty("return")) {
      func.return = getType(e.return);
      let name = e.call.name;
      let node = stage.getFunctionNodeByName(name);
      let body = node.body;
      let start = body.start - 1;
      let txt = ": " + func.return;
      patches.push({
        offset: start,
        value: txt
      });
    }
    if (func.return !== getType(e.return)) {}
  });

  stage.addListener(Iroh.VAR)
  .on("after", function(e) {
    let vary = null;
    let type = getType(e.value);
    let start = e.getPosition().start;
    let match = e.getSource().match( /let|const|var/ );
    start += match[0].length + 1;
    start += e.name.length;
    if (!variables[e.hash]) {
      vary = variables[e.hash] = {
        name: e.name,
        types: [type]
      };
      patches.push({
        offset: start,
        value: ": " + type
      });
    } else {
      vary = variables[e.hash];
      if (vary.types.indexOf(type) <= -1) {
        vary.types.push(type);
        let patch = getPatchByOffset(start);
        patch.value += " | " + type;
      }
    }
  });

  function getPatchByOffset(offset) {
    for (let ii = 0; ii < patches.length; ++ii) {
      let patch = patches[ii];
      if (patch.offset === offset) return patch;
    };
    return null;
  };

  String.prototype.insertAt = function(index, string) { 
    return this.substr(0, index) + string + this.substr(index);
  };

  let codeout = stage.input;

  // run our stage
  eval(stage.script);

  patches.sort((a, b) => b.offset - a.offset);

  patches.map((patch) => {
    codeout = codeout.insertAt(patch.offset, patch.value);
  });

  editor2.setValue(codeout);

};
