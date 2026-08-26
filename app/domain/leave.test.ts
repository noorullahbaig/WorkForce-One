import { describe, expect, test } from "vitest";
import {
	calculateLeaveDurationHalfDays,
	calculateProjectedBalance,
	getCoverageSummary,
	rangesOverlap,
} from "./leave";

describe("leave duration", () => {
	test("excludes weekends and Penang public holidays", () => {
		expect(calculateLeaveDurationHalfDays({
			startDate: "2026-08-28",
			endDate: "2026-09-01",
			dayPart: "full",
			holidayDates: ["2026-08-31"],
		})).toEqual({ durationHalfDays: 4, excludedDates: ["2026-08-29", "2026-08-30", "2026-08-31"] });
	});

	test.each(["morning", "afternoon"] as const)("counts a %s request as one half-day", (dayPart) => {
		expect(calculateLeaveDurationHalfDays({
			startDate: "2026-08-28",
			endDate: "2026-08-28",
			dayPart,
			holidayDates: [],
		}).durationHalfDays).toBe(1);
	});

	test("rejects partial-day selection for a multi-day request", () => {
		expect(() => calculateLeaveDurationHalfDays({
			startDate: "2026-08-27",
			endDate: "2026-08-28",
			dayPart: "morning",
			holidayDates: [],
		})).toThrow("Half-day leave must start and end on the same date.");
	});

	test("rejects ranges containing no working days", () => {
		expect(() => calculateLeaveDurationHalfDays({
			startDate: "2026-08-29",
			endDate: "2026-08-30",
			dayPart: "full",
			holidayDates: [],
		})).toThrow("Choose at least one working day.");
	});
});

describe("leave planning", () => {
	test("detects inclusive date overlaps", () => {
		expect(rangesOverlap("2026-08-25", "2026-08-27", "2026-08-27", "2026-08-28")).toBe(true);
		expect(rangesOverlap("2026-08-25", "2026-08-26", "2026-08-27", "2026-08-28")).toBe(false);
	});

	test("reserves approved and pending requests in projected balance", () => {
		expect(calculateProjectedBalance({ allocatedHalfDays: 28, adjustmentHalfDays: 2, approvedHalfDays: 6, pendingHalfDays: 3 })).toEqual({
			entitledHalfDays: 30,
			availableHalfDays: 24,
			projectedHalfDays: 21,
		});
	});

	test("summarises same-department coverage without blocking", () => {
		expect(getCoverageSummary({
			department: "Operations",
			departmentHeadcount: 8,
			startDate: "2026-08-28",
			endDate: "2026-08-28",
			requests: [
				{ id: "a", fullName: "Farah Iskandar", department: "Operations", startDate: "2026-08-28", endDate: "2026-08-28", status: "approved" },
				{ id: "b", fullName: "Alex Kumar", department: "Retail", startDate: "2026-08-28", endDate: "2026-08-28", status: "approved" },
				{ id: "c", fullName: "Rajesh Muthu", department: "Operations", startDate: "2026-08-29", endDate: "2026-08-29", status: "pending" },
			],
		})).toEqual({ awayCount: 1, departmentHeadcount: 8, overlapping: [{ id: "a", fullName: "Farah Iskandar", status: "approved" }] });
	});
});
