const fs = require("fs");
const buble = require("rollup-plugin-buble");
const rollup = require("rollup");

const pkg = require("./package.json");

rollup.rollup({
  entry: __dirname + "/src/index.js",
  plugins: [ buble() ],
}).then((bundle) => {
  let version = pkg.version;
  let homepage = pkg.homepage;
  bundle.generate({
    format: "cjs"
  }).then((result) => {
    // also include third parties which we are not introduced to
    let acorn = fs.readFileSync(__dirname + "/third_party/acorn.js", "utf-8");
    let walker = fs.readFileSync(__dirname + "/third_party/acorn.walk.js", "utf-8");
    let codegen = fs.readFileSync(__dirname + "/third_party/escodegen.js", "utf-8");
    let code = `
      ${acorn}
      ${walker}
      ${codegen}
      (function() {
        $$VERSION = "${version}";
        $$HOMEPAGE = "${homepage}";
        ${result.code}
      })();
    `;
    fs.writeFileSync("dist/iroh.js", code);
  });
}).catch((e) => {
  console.log(e);
});
