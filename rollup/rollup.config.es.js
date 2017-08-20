const pkg = require("../package.json");
import config from "./rollup.config";

config.format = "es";
config.dest = pkg.module;

export default config;
