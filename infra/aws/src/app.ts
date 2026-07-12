#!/usr/bin/env node
import "source-map-support/register.js";
import * as cdk from "aws-cdk-lib";
import { namer } from "./naming.js";
import { EnvironmentStack } from "./stacks/env.js";
import { GlobalStack } from "./stacks/glb.js";
import { IdentityStack } from "./stacks/identity.js";
import { IdentityTablesStack } from "./stacks/tables.js";
import { WebStack } from "./stacks/web.js";

const app = new cdk.App();
const environmentName = process.env["ENVIRONMENT"] ?? "prd";
const account = process.env["CDK_DEFAULT_ACCOUNT"];
const region = process.env["CDK_DEFAULT_REGION"] ?? "us-east-1";
const env = { account, region };
const names = namer({ environment: environmentName, region });

const tables = new IdentityTablesStack(app, names.regional("tables"), { env });
const identity = new IdentityStack(app, names.regional("identity"), {
  env,
  tables,
});
new EnvironmentStack(app, names.regional("env"), {
  env,
  environmentName,
  identity,
  tables,
});
const global = new GlobalStack(app, names.global(), {
  env: { account, region: "us-east-1" },
});
new WebStack(app, names.global("web"), {
  env: { account, region: "us-east-1" },
  global,
});

for (const stack of app.node.children.filter(cdk.Stack.isStack)) {
  cdk.Tags.of(stack).add("project", "aprovan");
  cdk.Tags.of(stack).add("environment", environmentName);
}

app.synth();
