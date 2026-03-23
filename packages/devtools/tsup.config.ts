import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    ports: "src/ports.ts",
    cli: "src/cli.ts",
  },
  format: ["esm", "cjs"],
  dts: true,
  clean: true,
  sourcemap: true,
  target: "node20",
});
