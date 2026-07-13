import type { GLOBAL_SHORT_CODE, RegionShortCodeMap } from "./constants.js";

/** Deployment environments. */
export type Environment = "dev" | "stg" | "prd";

/** AWS regions that have a known short code. */
export type AwsRegion = keyof typeof RegionShortCodeMap;

/** Region short code, or the global sentinel. */
export type RegionShortCode =
  | (typeof RegionShortCodeMap)[AwsRegion]
  | typeof GLOBAL_SHORT_CODE;
