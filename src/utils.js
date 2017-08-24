import { TEMP_VAR_BASE } from "./cfg";

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
