#!/usr/bin/env node

import { Command } from "commander";
import { gitRefresh } from "./commands/git-refresh.js";
import { bootstrap } from "./commands/bootstrap.js";

const program = new Command();

program
  .name("devtools")
  .description("Shared development utilities for Aprovan projects")
  .version("0.2.0");

program
  .command("git-refresh")
  .description("Update git submodules and pull latest changes recursively")
  .action(gitRefresh);

program
  .command("bootstrap")
  .description("Set up a repo with Cicadas, agent context, and symlinks")
  .action(bootstrap);

program.parse();
