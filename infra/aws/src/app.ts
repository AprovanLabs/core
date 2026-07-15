#!/usr/bin/env node
import "source-map-support/register.js";
import { namer, resolveEnv } from "@aprovan/cdk";
import * as cdk from "aws-cdk-lib";
import { CiStack } from "./stacks/ci.js";
import { MainStack } from "./stacks/main.js";
import { WebStack } from "./stacks/web.js";

const app = new cdk.App();
const { environmentName, account, env } = resolveEnv();
const names = namer({ environment: environmentName, region: env.region });

new MainStack(app, names.regional(), { env, environmentName, names });

new WebStack(app, names.global("web"), {
  env: { account, region: "us-east-1" },
  environmentName,
  names,
});

const deployRepositories = (
  process.env["DEPLOY_REPOSITORIES"] ?? "AprovanLabs/registry"
)
  .split(",")
  .map((repo) => repo.trim())
  .filter(Boolean);

new CiStack(app, names.regional("ci"), {
  env,
  environmentName,
  names,
  repositories: deployRepositories,
});

for (const stack of app.node.children.filter(cdk.Stack.isStack)) {
  cdk.Tags.of(stack).add("project", "aprovan");
  cdk.Tags.of(stack).add("environment", environmentName);
}

app.synth();
