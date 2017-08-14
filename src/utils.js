import { TEMP_VAR_BASE } from "./cfg";

// unique temporary variable index
let utvidx = 0;
export function reserveTempVarId() {
  return (
    `${TEMP_VAR_BASE}${utvidx++}`
  );
};

// general unique index
let uidx = 0;
export function uid() {
  return uidx++;
};

// unique branch index
let ubidx = 0;
export function uBranchHash() {
  return ubidx++;
};
