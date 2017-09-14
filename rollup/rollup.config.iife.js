const pkg = require("../package.json");
import config from "./rollup.config";
import json from "rollup-plugin-json";
import babel from "rollup-plugin-babel";
import resolve from "rollup-plugin-node-resolve";
import commonjs from "rollup-plugin-commonjs";
import paths from "rollup-plugin-paths";

process.env.NODE_ENV = "browser";

config.format = "iife";
config.dest = pkg.browser;
/*config.paths = { 
  "acorn/dist/walk": "acorn/dist/walk"
};*/
config.external = [];
config.onwarn = (warning) => {
  // disable warning on `to-fast-properties` module
  if (warning.code === 'EVAL') return;

  console.warn(warning.message);
};
config.plugins = [
  paths({
    'babel-core': '../vendor/babel-core.js'
  }),
  json(),
  babel({
    exclude: [
       "node_modules/**",
       "vendor/**"
    ]
  }),
  resolve({
    jsnext: true,
    browser: true
  }),
  commonjs({
    namedExports: {
      "node_modules/astring/dist/astring.js": [ "generate" ],
      "node_modules/acorn/dist/walk.js": [ "base", "full", "recursive" ],
      "vendor/babel-core.js": [ "transform", "traverse" ]
    }
  })
];

export default config;
