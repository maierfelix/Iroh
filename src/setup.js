export function setup() {

  // detect environment
  this.isNode = (
    (typeof module !== "undefined" && module.exports) &&
    (typeof require !== "undefined")
  );
  this.isBrowser = !this.isNode;

};

export function greet() {
  let version = $$VERSION;
  if (
    typeof navigator !== "undefined" &&
    navigator.userAgent.toLowerCase().indexOf("chrome") > -1
  ) {
    console.log(`%c ☕ Iroh.js - ${version} `, "background: #2e0801; color: #fff; padding:1px 0;");
  } else {
    console.log(`Iroh.js - ${version}`);
  }
};
