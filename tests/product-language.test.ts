import { readFileSync } from "node:fs";
import { expect, test } from "vitest";

const visibleUiSources = [
  "app/routes/login.tsx",
  "app/routes/portal.tsx",
  "app/features/attendance/attendance-ui.tsx",
  "app/features/attendance/correction-ui.tsx",
].map((file) => readFileSync(file, "utf8")).join("\n");

test("uses operational product language instead of implementation terminology", () => {
  for (const retiredPhrase of [
    "Try the demo",
    "employee snapshots",
    "Audit ready",
    "Ready for an immutable snapshot",
    "Simulate biometric",
    "finalised payroll snapshot",
  ]) {
    expect(visibleUiSources).not.toContain(retiredPhrase);
  }

  expect(visibleUiSources).toContain("Choose a role");
  expect(visibleUiSources).toContain("Attendance capture");
  expect(visibleUiSources).toContain("Ready to finalise");
});
