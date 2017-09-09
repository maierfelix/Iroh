const pkg = require("../package.json");
import config from "./rollup.config";
import json from "rollup-plugin-json";
import babel from "rollup-plugin-babel";
import resolve from "rollup-plugin-node-resolve";
import commonjs from "rollup-plugin-commonjs";

process.env.NODE_ENV = "browser";

config.format = "iife";
config.dest = pkg.browser;
/*config.paths = { 
  "acorn/dist/walk": "acorn/dist/walk"
};*/
config.external = [];
config.plugins = [
  json(),
  babel({
    exclude: "node_modules/**"
  }),
  resolve({
    jsnext: true,
    browser: true
  }),
  commonjs({
    namedExports: {
      "node_modules/astring/dist/astring.js": [ "generate" ],
      "node_modules/acorn/dist/walk.js": [ "base", "full", "recursive" ]
    }
  })
];

export default config;
