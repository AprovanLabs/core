const regionCodes: Record<string, string> = {
  "us-east-1": "use1",
  "us-east-2": "use2",
  "us-west-1": "usw1",
  "us-west-2": "usw2",
};

const sanitize = (value: string): string =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export interface NameOptions {
  environment?: string;
  project?: string;
  region?: string;
}

export function namer(options: NameOptions = {}) {
  const environment =
    options.environment ?? process.env["ENVIRONMENT"] ?? "prd";
  const project = options.project ?? "aprovan";
  const region =
    options.region ?? process.env["CDK_DEFAULT_REGION"] ?? "us-east-1";
  const build = (scope: string, parts: string[]) =>
    sanitize([project, environment, scope, ...parts].join("-"));
  return {
    regional: (...parts: string[]) =>
      build(regionCodes[region] ?? sanitize(region), parts),
    global: (...parts: string[]) => build("glb", parts),
  };
}
