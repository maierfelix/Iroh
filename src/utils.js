import { TEMP_VAR_BASE } from "./cfg";

import { parse as prs } from "acorn";
import { generate as gen } from "astring";

// unique temporary variable index
let utvidx = 1;
export function reserveTempVarId() {
  return (
    `${TEMP_VAR_BASE}${utvidx++}`
  );
};

// general unique index
let uidx = 1;
export function uid() {
  return uidx++;
};

// unique branch index
let ubidx = 1;
export function uBranchHash() {
  return ubidx++;
};

export function parse() {
  return prs.apply(null, arguments);
};

export function generate() {
  return gen.apply(null, arguments);
};
