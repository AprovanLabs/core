import {
  DEFAULT_ENVIRONMENT,
  DEFAULT_ORG,
  DEFAULT_REGION,
  GLOBAL_SHORT_CODE,
  RegionShortCodeMap,
} from "./constants.js";

const sanitize = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const regionShortCode = (region: string): string =>
  RegionShortCodeMap[region as keyof typeof RegionShortCodeMap] ??
  sanitize(region);

export interface NameOptions {
  environment?: string;
  org?: string;
  region?: string;
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
  private readonly environment: string;
  private readonly org: string;
  private readonly region: string;

  constructor(options: NameOptions = {}) {
    this.environment =
      options.environment ?? process.env["ENVIRONMENT"] ?? DEFAULT_ENVIRONMENT;
    this.org = options.org ?? process.env["ORG_ID"] ?? DEFAULT_ORG;
    this.region =
      options.region ?? process.env["CDK_DEFAULT_REGION"] ?? DEFAULT_REGION;
  }

  private build(scope: string, parts: string[]): string {
    const named = parts.length ? parts : ["main"];
    return sanitize([this.org, this.environment, scope, ...named].join("-"));
  }

  regional(...parts: string[]): string {
    return this.build(regionShortCode(this.region), parts);
  }

  global(...parts: string[]): string {
    return this.build(GLOBAL_SHORT_CODE, parts);
  }
}

export const namer = (options: NameOptions = {}): Namer => new Namer(options);
