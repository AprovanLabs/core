import { execSync } from "node:child_process";

export function gitRefresh(): void {
  console.log("Refreshing git submodules and pulling latest changes...\n");

  try {
    execSync(
      "git submodule update --remote --merge --recursive && git pull --recurse-submodules",
      { stdio: "inherit" },
    );
    console.log("\n✓ Repository refreshed successfully.");
  } catch {
    console.error("\n✗ Failed to refresh repository.");
    process.exit(1);
  }
}
