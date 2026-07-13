#!/usr/bin/env node
import { getAprovanEnv } from "./index.js";

const [, , command, environment = "prd"] = process.argv;

if (command !== "pull") {
  process.stderr.write("Usage: aprovan-env pull [environment]\n");
  process.exitCode = 1;
} else {
  const { raw } = await getAprovanEnv(environment);
  process.stdout.write(raw.endsWith("\n") ? raw : `${raw}\n`);
}
