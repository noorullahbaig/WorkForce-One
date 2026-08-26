import { describe, expect, it } from "vitest";

import { calculateAttendance } from "./attendance";

describe("calculateAttendance", () => {
	it("calculates worked and overtime minutes from a complete record", () => {
		const result = calculateAttendance({
			clockIn: "2026-08-25T00:30:00.000Z",
			clockOut: "2026-08-25T10:00:00.000Z",
			normalDayMinutes: 480,
		});

		expect(result).toEqual({ workedMinutes: 570, overtimeMinutes: 90 });
	});

	it("returns incomplete state when clock out is missing", () => {
		const result = calculateAttendance({
			clockIn: "2026-08-25T01:00:00.000Z",
			clockOut: null,
			normalDayMinutes: 480,
		});

		expect(result).toEqual({ workedMinutes: null, overtimeMinutes: null });
	});

	it("rejects a clock out before clock in", () => {
		expect(() =>
			calculateAttendance({
				clockIn: "2026-08-25T09:00:00.000Z",
				clockOut: "2026-08-25T08:00:00.000Z",
				normalDayMinutes: 480,
			}),
		).toThrow("Clock out must be after clock in");
	});
});
