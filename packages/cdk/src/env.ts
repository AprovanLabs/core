import { DEFAULT_ENVIRONMENT, DEFAULT_REGION } from "./constants.js";

/** Structural match for CDK's `Environment` (avoids an aws-cdk-lib dependency). */
export interface StackEnv {
  account?: string;
  region: string;
}

export interface AprovanCdkEnv {
  /** Deployment environment name, e.g. `prd`. */
  environmentName: string;
  /** AWS account id, when known. */
  account?: string;
  /** AWS region for regional stacks. */
  region: string;
  /** CDK stack `env`, ready to spread into `StackProps`. */
  env: StackEnv;
}

/**
 * Resolves the deployment environment from the standard CDK/CI variables,
 * applying Aprovan defaults (`prd`, `us-east-2`).
 */
export function resolveEnv(): AprovanCdkEnv {
  const environmentName = process.env["ENVIRONMENT"] ?? DEFAULT_ENVIRONMENT;
  const account = process.env["CDK_DEFAULT_ACCOUNT"];
  const region = process.env["CDK_DEFAULT_REGION"] ?? DEFAULT_REGION;
  return { environmentName, account, region, env: { account, region } };
}
