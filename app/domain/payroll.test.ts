import { describe, expect, it } from "vitest";

import {
	calculateEpf,
	calculatePayroll,
	calculateSocsoAndEis,
} from "./payroll";

describe("statutory contributions", () => {
	it("uses the October 2025 EPF wage band for RM 6,710.80", () => {
		expect(calculateEpf(671_080)).toEqual({
			employeeSen: 74_800,
			employerSen: 81_600,
		});
	});

	it("caps SOCSO and EIS at the RM 6,000 wage ceiling", () => {
		expect(calculateSocsoAndEis(800_000)).toEqual({
			socsoEmployeeSen: 2_975,
			socsoEmployerSen: 10_415,
			eisEmployeeSen: 1_190,
			eisEmployerSen: 1_190,
		});
	});
});

describe("calculatePayroll", () => {
	it("calculates monthly pay with OT, adjustments and unpaid leave", () => {
		const result = calculatePayroll({
			salaryType: "monthly",
			monthlySalarySen: 500_000,
			hourlyRateSen: null,
			regularMinutes: 9_600,
			overtimeMinutes: 120,
			unpaidLeaveDays: 1,
			wagePeriodDays: 31,
			allowanceSen: 20_000,
			bonusSen: 10_000,
			otherDeductionSen: 5_000,
			pcbSen: 10_000,
			overtimeMultiplier: 1.5,
			normalDayMinutes: 480,
		});

		expect(result).toMatchObject({
			basePaySen: 500_000,
			overtimePaySen: 7_212,
			grossPaySen: 537_212,
			unpaidLeaveDeductionSen: 16_129,
			epfEmployeeSen: 58_300,
			epfEmployerSen: 63_600,
			socsoEmployeeSen: 2_625,
			socsoEmployerSen: 9_190,
			eisEmployeeSen: 1_050,
			eisEmployerSen: 1_050,
			totalDeductionsSen: 93_104,
			netPaySen: 444_108,
		});
	});

	it("calculates hourly wages without double-counting overtime minutes", () => {
		const result = calculatePayroll({
			salaryType: "hourly",
			monthlySalarySen: null,
			hourlyRateSen: 2_000,
			regularMinutes: 9_600,
			overtimeMinutes: 600,
			unpaidLeaveDays: 0,
			wagePeriodDays: 31,
			allowanceSen: 10_000,
			bonusSen: 0,
			otherDeductionSen: 0,
			pcbSen: 0,
			overtimeMultiplier: 1.5,
			normalDayMinutes: 480,
		});

		expect(result).toMatchObject({
			basePaySen: 320_000,
			overtimePaySen: 30_000,
			grossPaySen: 360_000,
			totalDeductionsSen: 38_785,
			netPaySen: 321_215,
		});
	});

	it("rejects a missing salary rate", () => {
		expect(() =>
			calculatePayroll({
				salaryType: "hourly",
				monthlySalarySen: null,
				hourlyRateSen: null,
				regularMinutes: 0,
				overtimeMinutes: 0,
				unpaidLeaveDays: 0,
				wagePeriodDays: 31,
				allowanceSen: 0,
				bonusSen: 0,
				otherDeductionSen: 0,
				pcbSen: 0,
				overtimeMultiplier: 1.5,
				normalDayMinutes: 480,
			}),
		).toThrow("Hourly rate is required");
	});
});
