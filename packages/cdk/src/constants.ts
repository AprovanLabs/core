/** Default AWS region for regional resources when none is provided. */
export const DEFAULT_REGION = "us-east-2";

/** Default organization / naming prefix. */
export const DEFAULT_ORG = "aprovan";

/** Default deployment environment. */
export const DEFAULT_ENVIRONMENT = "prd";

/** Short code used for global (non-regional) resources. */
export const GLOBAL_SHORT_CODE = "glb";

/** Maps AWS regions to their short codes used in resource names. */
export const RegionShortCodeMap = {
  "us-east-1": "use1",
  "us-east-2": "use2",
  "us-west-1": "usw1",
  "us-west-2": "usw2",
} as const;
