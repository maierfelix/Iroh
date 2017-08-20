const pkg = require("../package.json");
import config from "./rollup.config";

config.format = "cjs";
config.dest = pkg.main;
config.paths = { 
  "acorn/dist/walk.es": "acorn/dist/walk"
};

export default config;
