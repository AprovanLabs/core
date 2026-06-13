import { describe, it, expect } from "vitest";
import { makeDesloppifyCommand } from "../commands/desloppify.js";

describe("makeDesloppifyCommand", () => {
  it("creates a command named 'desloppify'", () => {
    const cmd = makeDesloppifyCommand();
    expect(cmd.name()).toBe("desloppify");
  });

  it("has --repo as a required option", () => {
    const cmd = makeDesloppifyCommand();
    const repoOpt = cmd.options.find((o) => o.long === "--repo");
    expect(repoOpt).toBeDefined();
    expect(repoOpt?.mandatory).toBe(true);
  });

  it("has --packages option", () => {
    const cmd = makeDesloppifyCommand();
    const opt = cmd.options.find((o) => o.long === "--packages");
    expect(opt).toBeDefined();
  });

  it("has --profile option defaulting to 'objective'", () => {
    const cmd = makeDesloppifyCommand();
    const opt = cmd.options.find((o) => o.long === "--profile");
    expect(opt).toBeDefined();
    expect(opt?.defaultValue).toBe("objective");
  });

  it("has --exclusions option", () => {
    const cmd = makeDesloppifyCommand();
    const opt = cmd.options.find((o) => o.long === "--exclusions");
    expect(opt).toBeDefined();
  });

  it("has --output option", () => {
    const cmd = makeDesloppifyCommand();
    const opt = cmd.options.find((o) => o.long === "--output");
    expect(opt).toBeDefined();
  });

  it("has --state-dir option", () => {
    const cmd = makeDesloppifyCommand();
    const opt = cmd.options.find((o) => o.long === "--state-dir");
    expect(opt).toBeDefined();
  });

  it("has --no-auto-detect option", () => {
    const cmd = makeDesloppifyCommand();
    const opt = cmd.options.find(
      (o) => o.long === "--no-auto-detect",
    );
    expect(opt).toBeDefined();
  });

  it("has a description", () => {
    const cmd = makeDesloppifyCommand();
    expect(cmd.description()).toBeTruthy();
  });
});
