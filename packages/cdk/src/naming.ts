import {
  DEFAULT_ENVIRONMENT,
  DEFAULT_ORG,
  DEFAULT_REGION,
  GLOBAL_SHORT_CODE,
  RegionShortCodeMap,
} from "./constants.js";
import { Environment, RegionShortCode } from "./types.js";

const sanitize = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const regionShortCode = (region: string): RegionShortCode =>
  RegionShortCodeMap[region as keyof typeof RegionShortCodeMap] ??
  sanitize(region);

export type NamerOptions = {
  universal?: boolean;
  global?: boolean;
};


export interface NameOptions {
  environment?: string;
  org?: string;
  region?: string;
  projectId?: string;
}

/**
 * Builds standardized resource names of the form:
 *
 *   [ORG]-[ENVIRONMENT]-[REGION_SHORT_CODE | glb]-[...PARTS | main]
 *
 * Parts default to `main` so a bare `regional()` / `global()` call yields a
 * stable, meaningful name.
 */
export class Namer {
  private readonly environment: Environment;
  private readonly org: string;
  private readonly region: string;
  private readonly projectId: string | undefined;

  constructor(options: NameOptions = {}) {
    this.environment =
      (options.environment ?? process.env["ENVIRONMENT"] ?? DEFAULT_ENVIRONMENT) as Environment;
    this.org = options.org ?? process.env["ORG_ID"] ?? DEFAULT_ORG;
    this.projectId = options.projectId ?? process.env["PROJECT_ID"];
    this.region =
      options.region ?? process.env["CDK_DEFAULT_REGION"] ?? DEFAULT_REGION;
  }

  private build(scope: string | undefined, parts: string[], opts: NamerOptions): string {
    const named = parts.length ? parts : ["main"];
    return sanitize([
        ...(opts.universal ? [this.org] : []),
        ...(this.projectId ? [this.projectId] : []),
        this.environment,
        scope,
        ...named
      ].join("-")
    );
  }

  regional(...parts: string[]): string {
    return this.build(regionShortCode(this.region), parts, { global: false });
  }

  global(...parts: string[]): string {
    return this.build(GLOBAL_SHORT_CODE, parts, { global: true });
  }

  universal(...parts: string[]): string {
    return this.build(undefined, parts, { universal: true });
  }

  getOrg(): string {
    return this.org;
  }

  getEnvironment(): Environment {
    return this.environment
  }

  getRegion(): string {
    return this.region;
  }

  getRegionShortCode(): RegionShortCode {
    return regionShortCode(this.region);
  }
}

export const namer = (options: NameOptions = {}): Namer => new Namer(options);
