import json from "rollup-plugin-json";

export default {
  entry: "src/index.js",
  moduleName: "iroh",
  external: [
    "acorn",
    "acorn/dist/walk",
    "acorn/dist/walk.es",
    "astring",
    "babel-core",
    "lodash.flatten",
    "lodash.uniq"
  ],
  plugins: [
    json()
  ],
  useStrict: false
}