import { uid } from "../utils";

import { INSTR } from "../labels";
import { CLEAN_DEBUG_INJECTION } from "../cfg";

import { base, recursive } from "acorn/dist/walk";

import Scope from "../scope";

import STAGE1 from "../patches/stage1";
import STAGE2 from "../patches/stage2";
import STAGE3 from "../patches/stage3";
import STAGE4 from "../patches/stage4";
import STAGE5 from "../patches/stage5";
import STAGE6 from "../patches/stage6";
import STAGE7 from "../patches/stage7";
import STAGE8 from "../patches/stage8";

export default class Patcher {
  constructor(instance) {
    this.uid = uid();
    // patch AST scope
    this.scope = null;
    // patch stage
    this.stage = null;
    // patch state
    this.state = null;
    // node symbols
    this.symbols = {};
    // node clones
    this.nodes = {};
    // stage instance
    this.instance = instance;
  }
};

Patcher.prototype.walk = function(ast, state, visitors) {
  return recursive(ast, state, visitors, base);
};

Patcher.prototype.pushScope = function(node) {
  let tmp = this.scope;
  this.scope = new Scope(node);
  this.scope.parent = tmp;
};

Patcher.prototype.popScope = function(node) {
  this.scope = this.scope.parent;
};

Patcher.prototype.applyStagePatch = function(ast, stage) {
  this.stage = stage;
  this.walk(ast, this, this.stage);
};

Patcher.prototype.applyPatches = function(ast) {
  this.applyStagePatch(ast, STAGE2);
  this.applyStagePatch(ast, STAGE7);
  this.applyStagePatch(ast, STAGE4);
  this.applyStagePatch(ast, STAGE5);
  this.applyStagePatch(ast, STAGE1);
  this.applyStagePatch(ast, STAGE3);
  this.applyStagePatch(ast, STAGE6);
  this.applyStagePatch(ast, STAGE8);
};
