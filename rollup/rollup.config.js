import json from "rollup-plugin-json";

export default {
  entry: "src/index.js",
  moduleName: "iroh",
  external: [
    "acorn",
    "acorn/dist/walk.es",
    "astring"
  ],
  plugins: [
    json()
  ],
  useStrict: false
}