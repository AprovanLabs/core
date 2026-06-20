import { execSync } from "node:child_process";
import { existsSync, lstatSync, mkdirSync, unlinkSync } from "node:fs";
import { dirname, join } from "node:path";

function run(cmd: string, label: string): void {
  console.log(`  ${label}...`);
  execSync(cmd, { stdio: "inherit", shell: "/bin/bash" });
}

/**
 * Creates or replaces a symlink at `linkPath` (relative to `cwd`) pointing to
 * `target`. If a symlink already exists it is removed and recreated, allowing
 * bootstrap to update stale symlinks on re-runs. Non-symlink entries (regular
 * files or directories) are left untouched with a warning.
 */
function ensureSymlink(cwd: string, linkPath: string, target: string): void {
  const absLink = join(cwd, linkPath);

  // Ensure parent directory exists
  const parentDir = dirname(absLink);
  if (!existsSync(parentDir)) {
    mkdirSync(parentDir, { recursive: true });
  }

  let needsCreate = true;
  try {
    const stat = lstatSync(absLink);
    if (stat.isSymbolicLink()) {
      unlinkSync(absLink);
      console.log(`  Replacing existing symlink at ${linkPath}`);
    } else {
      console.log(`  ${linkPath} exists as a non-symlink entry, skipping.`);
      needsCreate = false;
    }
  } catch {
    // Path does not exist — will create fresh
  }

  if (needsCreate) {
    run(`ln -s ${target} ${linkPath}`, `Linking ${linkPath} -> ${target}`);
  }
}

export function bootstrap(): void {
  const cwd = process.cwd();
  const venvBin = join(cwd, ".venv", "bin");
  console.log(`Bootstrapping repository at ${cwd}\n`);

  // Create .agents/context folder
  const agentsContext = join(cwd, ".agents", "context");
  if (!existsSync(agentsContext)) {
    console.log("Creating .agents/context/...");
    mkdirSync(agentsContext, { recursive: true });
  } else {
    console.log(".agents/context/ already exists, skipping.");
  }

  // Skills discovery symlinks — all pointing to .multica/skills as the
  //    single source of truth. Each tool looks in its own directory:
  //      - Generic agents:  .agents/skills/
  //      - Claude Code:     .claude/skills/
  //      - Cursor:          .cursor/skills/
  console.log("\nSetting up skills discovery symlinks...");
  ensureSymlink(cwd, join(".agents", "skills"), "../.multica/skills");
  ensureSymlink(cwd, join(".claude", "skills"), "../.multica/skills");
  ensureSymlink(cwd, join(".cursor", "skills"), "../.multica/skills");

  console.log("\n✓ Bootstrap complete.");
}
