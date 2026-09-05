import { describe, expect, it } from "vitest";
import { validateCorrection, malaysiaInput, toUtc } from "./corrections";

const record = {
  id: "a",
  workDate: "2026-08-25",
  clockIn: "2026-08-25T01:00:00.000Z",
  clockOut: null,
  status: "missing_clock_out",
};
const now = "2026-09-01T00:00:00.000Z";
describe("attendance corrections", () => {
  it("previews a completed missing clock-out using attendance rules", () => {
    expect(
      validateCorrection(
        record,
        record.clockIn,
        "2026-08-25T10:30:00.000Z",
        "Forgot to scan",
        [],
        now,
      ),
    ).toMatchObject({ workedMinutes: 570, overtimeMinutes: 90 });
  });
  it("converts Malaysia inputs independently of the browser timezone", () => {
    expect(toUtc("2026-08-25T09:00")).toBe(record.clockIn);
    expect(malaysiaInput(record.clockIn)).toBe("2026-08-25T09:00:00");
  });
  it("supports overnight shifts and rejects a different work date", () => {
    expect(
      validateCorrection(
        record,
        "2026-08-25T14:00:00Z",
        "2026-08-25T23:00:00Z",
        "Night shift",
        [],
        now,
      ).workedMinutes,
    ).toBe(540);
    expect(() =>
      validateCorrection(
        record,
        "2026-08-24T14:00:00Z",
        "2026-08-25T01:00:00Z",
        "Wrong date",
        [],
        now,
      ),
    ).toThrow(/work date/);
  });
  it.each([
    ["", "2026-08-25T10:00:00Z", "Reason"],
    [record.clockIn, record.clockIn, "Reason"],
    [record.clockIn, "2026-09-02T00:00:00Z", "Reason"],
    [record.clockIn, "2026-08-25T10:00:00Z", "   "],
  ])(
    "rejects incomplete, reversed, future or unexplained proposals",
    (clockIn, clockOut, reason) => {
      expect(() =>
        validateCorrection(record, clockIn, clockOut, reason, [], now),
      ).toThrow();
    },
  );
  it("rejects invalid calendar dates, no changes, leave overrides and overlap", () => {
    expect(() => toUtc("2026-02-30T09:00")).toThrow();
    const complete = { ...record, clockOut: "2026-08-25T10:00:00Z" };
    expect(() =>
      validateCorrection(
        complete,
        record.clockIn,
        complete.clockOut,
        "Reason",
        [],
        now,
      ),
    ).toThrow(/change/i);
    expect(() =>
      validateCorrection(
        { ...record, status: "on_leave" },
        record.clockIn,
        complete.clockOut,
        "Reason",
        [],
        now,
      ),
    ).toThrow(/leave/);
    expect(() =>
      validateCorrection(
        record,
        record.clockIn,
        complete.clockOut,
        "Reason",
        [{ id: "b", clockIn: "2026-08-25T09:00:00Z", clockOut: null }],
        now,
      ),
    ).toThrow(/overlap/);
  });
});
it("preserves the precision of an unchanged captured timestamp", () => {
  const original = "2026-08-25T01:00:00.321Z";
  expect(toUtc(malaysiaInput(original), original)).toBe(original);
});
