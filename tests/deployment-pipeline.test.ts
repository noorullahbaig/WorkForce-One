import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const workflowPath = new URL("../.github/workflows/ci.yml", import.meta.url);
const workflow = readFileSync(workflowPath, "utf8");
const deployJob = workflow.slice(workflow.indexOf("\n  deploy:"));

describe("production deployment pipeline", () => {
  it("deploys only after both verification jobs pass", () => {
    expect(workflow).toContain("needs: [quality, browser-smoke]");
    expect(workflow).toContain("github.ref == 'refs/heads/main'");
    expect(workflow).toContain("workflow_dispatch");
  });

  it("applies tracked migrations before deploying without hiding failures", () => {
    const migrationStep = workflow.indexOf("name: Apply remote D1 migrations");
    const deployStep = workflow.indexOf("name: Deploy Worker");

    expect(migrationStep).toBeGreaterThan(-1);
    expect(deployStep).toBeGreaterThan(migrationStep);
    expect(workflow).not.toContain("ALTER TABLE companies");
    expect(workflow).not.toContain("|| true");
    expect(deployJob).not.toMatch(/db:seed|seed\.sql/);
  });

  it("serializes production releases and checks the deployed version", () => {
    expect(workflow).toContain("group: production-deploy");
    expect(workflow).toContain("cancel-in-progress: false");
    expect(workflow).toContain("Confirm release is still current");
    expect(workflow).toContain("github.sha");
    expect(workflow).toContain("steps.deploy.outputs.deployment-url");
    expect(workflow).toContain("/healthz");
  });
});
