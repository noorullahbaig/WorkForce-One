import { describe, expect, test } from "vitest";
import { addCalendarDays, todayInTimeZone } from "./date";

describe("company-local date helpers", () => {
	test("uses the company timezone when deriving today", () => {
		expect(
			todayInTimeZone(new Date("2026-08-26T16:30:00.000Z"), "Asia/Kuala_Lumpur"),
		).toBe("2026-08-27");
		expect(
			todayInTimeZone(new Date("2026-08-26T16:30:00.000Z"), "UTC"),
		).toBe("2026-08-26");
	});

	test("adds calendar days without applying local-time rollover", () => {
		expect(addCalendarDays("2026-08-01", -3)).toBe("2026-07-29");
		expect(addCalendarDays("2026-12-31", 1)).toBe("2027-01-01");
	});
});
