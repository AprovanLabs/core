import { execSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

function run(cmd: string, label: string): void {
  console.log(`  ${label}...`);
  execSync(cmd, { stdio: "inherit" });
}

export function bootstrap(): void {
  const cwd = process.cwd();
  console.log(`Bootstrapping repository at ${cwd}\n`);

  // 1. Create .agents/context folder
  const agentsContext = join(cwd, ".agents", "context");
  if (!existsSync(agentsContext)) {
    console.log("Creating .agents/context/...");
    mkdirSync(agentsContext, { recursive: true });
  } else {
    console.log(".agents/context/ already exists, skipping.");
  }

  // 2. Set up Cicadas
  console.log("\nSetting up Cicadas...");
  run("uv venv .venv", "Creating virtual environment");
  run("source .venv/bin/activate && cicadas init", "Initializing Cicadas");

  // 3. Symlink .cicadas -> .agents/context/cicadas
  const cicadasLink = join(".agents", "context", "cicadas");
  if (!existsSync(join(cwd, cicadasLink))) {
    console.log("\nCreating symlinks...");
    run(
      `ln -s ../../.cicadas ${cicadasLink}`,
      "Linking .cicadas -> .agents/context/cicadas",
    );
  } else {
    console.log("\n.agents/context/cicadas symlink already exists, skipping.");
  }

  // 4. Symlink .agents/skills -> .agents/skills (from repo root)
  const skillsLink = join(".agents", "skills");
  if (!existsSync(join(cwd, skillsLink))) {
    run(`ln -s ../../.agents/skills ${skillsLink}`, "Linking .agents/skills");
  } else {
    console.log(".agents/skills symlink already exists, skipping.");
  }

  console.log("\n✓ Bootstrap complete.");
}
