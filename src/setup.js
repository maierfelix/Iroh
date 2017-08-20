import { CATEGORY } from "./labels";
import { IS_BROWSER } from "./cfg";

export function setup() {
  this.generateCategoryBits();
};

export function generateCategoryBits() {
  for (let key in CATEGORY) {
    this[key] = CATEGORY[key] | 0;
  };
};

export function greet() {
  let version = $$VERSION;
  if (
    IS_BROWSER &&
    typeof navigator !== "undefined" &&
    navigator.userAgent.toLowerCase().indexOf("chrome") > -1
  ) {
    console.log(`%c ☕ Iroh.js - ${version} `, "background: #2e0801; color: #fff; padding:1px 0;");
  }
};
