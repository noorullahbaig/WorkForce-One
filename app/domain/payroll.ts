export type ContributionPair = {
	employeeSen: number;
	employerSen: number;
};

function assertNonNegative(value: number, label: string) {
	if (!Number.isFinite(value) || value < 0) {
		throw new Error(`${label} must be a non-negative number`);
	}
}

export function calculateEpf(wagesSen: number): ContributionPair {
	assertNonNegative(wagesSen, "EPF wages");
	if (wagesSen === 0) return { employeeSen: 0, employerSen: 0 };

	const wagesRm = wagesSen / 100;
	if (wagesRm > 20_000) {
		return {
			employeeSen: Math.ceil((wagesSen * 0.11) / 100) * 100,
			employerSen: Math.ceil((wagesSen * 0.12) / 100) * 100,
		};
	}

	const bandSizeRm = wagesRm <= 5_000 ? 20 : 100;
	const bandWageRm = Math.ceil(wagesRm / bandSizeRm) * bandSizeRm;
	return {
		employeeSen: Math.ceil(bandWageRm * 0.11) * 100,
		employerSen:
			Math.ceil(bandWageRm * (wagesRm <= 5_000 ? 0.13 : 0.12)) * 100,
	};
}

function ceilToFiveSen(valueSen: number) {
	return Math.ceil(valueSen / 5) * 5;
}

export function calculateSocsoAndEis(wagesSen: number) {
	assertNonNegative(wagesSen, "SOCSO/EIS wages");
	if (wagesSen === 0) {
		return {
			socsoEmployeeSen: 0,
			socsoEmployerSen: 0,
			eisEmployeeSen: 0,
			eisEmployerSen: 0,
		};
	}

	const wagesRm = wagesSen / 100;
	const assumedWageRm = Math.min(
		5_950,
		Math.max(20, Math.ceil(wagesRm / 100) * 100 - 50),
	);
	const socsoEmployeeSen = ceilToFiveSen(assumedWageRm * 0.5);
	const socsoEmployerSen = ceilToFiveSen(assumedWageRm * 1.75);
	const eisEmployeeSen = ceilToFiveSen(assumedWageRm * 0.2);

	return {
		socsoEmployeeSen,
		socsoEmployerSen,
		eisEmployeeSen,
		eisEmployerSen: eisEmployeeSen,
	};
}

export type PayrollInput = {
	salaryType: "monthly" | "hourly";
	monthlySalarySen: number | null;
	hourlyRateSen: number | null;
	regularMinutes: number;
	overtimeMinutes: number;
	unpaidLeaveDays: number;
	wagePeriodDays: number;
	allowanceSen: number;
	bonusSen: number;
	otherDeductionSen: number;
	pcbSen: number;
	overtimeMultiplier: number;
	normalDayMinutes: number;
};

export type PayrollBreakdown = {
	basePaySen: number;
	overtimePaySen: number;
	allowanceSen: number;
	bonusSen: number;
	grossPaySen: number;
	unpaidLeaveDeductionSen: number;
	epfEmployeeSen: number;
	epfEmployerSen: number;
	socsoEmployeeSen: number;
	socsoEmployerSen: number;
	eisEmployeeSen: number;
	eisEmployerSen: number;
	pcbSen: number;
	otherDeductionSen: number;
	totalDeductionsSen: number;
	totalEmployerContributionsSen: number;
	netPaySen: number;
};

export function calculatePayroll(input: PayrollInput): PayrollBreakdown {
	if (input.salaryType === "monthly" && input.monthlySalarySen === null) {
		throw new Error("Monthly salary is required");
	}
	if (input.salaryType === "hourly" && input.hourlyRateSen === null) {
		throw new Error("Hourly rate is required");
	}
	if (input.wagePeriodDays <= 0) {
		throw new Error("Wage period days must be greater than zero");
	}

	const basePaySen =
		input.salaryType === "monthly"
			? input.monthlySalarySen!
			: Math.round((input.hourlyRateSen! * input.regularMinutes) / 60);
	const overtimePaySen = Math.round(
		input.salaryType === "monthly"
			? (input.monthlySalarySen! /
					26 /
					input.normalDayMinutes) *
					input.overtimeMinutes *
					input.overtimeMultiplier
			: (input.hourlyRateSen! * input.overtimeMinutes * input.overtimeMultiplier) /
					60,
	);
	const grossPaySen =
		basePaySen + overtimePaySen + input.allowanceSen + input.bonusSen;
	const unpaidLeaveDeductionSen =
		input.salaryType === "monthly"
			? Math.round(
					(input.monthlySalarySen! * input.unpaidLeaveDays) /
						input.wagePeriodDays,
				)
			: 0;

	const epf = calculateEpf(basePaySen + input.allowanceSen + input.bonusSen);
	const socsoEis = calculateSocsoAndEis(
		basePaySen + input.allowanceSen + overtimePaySen,
	);
	const totalDeductionsSen =
		unpaidLeaveDeductionSen +
		epf.employeeSen +
		socsoEis.socsoEmployeeSen +
		socsoEis.eisEmployeeSen +
		input.pcbSen +
		input.otherDeductionSen;

	return {
		basePaySen,
		overtimePaySen,
		allowanceSen: input.allowanceSen,
		bonusSen: input.bonusSen,
		grossPaySen,
		unpaidLeaveDeductionSen,
		epfEmployeeSen: epf.employeeSen,
		epfEmployerSen: epf.employerSen,
		socsoEmployeeSen: socsoEis.socsoEmployeeSen,
		socsoEmployerSen: socsoEis.socsoEmployerSen,
		eisEmployeeSen: socsoEis.eisEmployeeSen,
		eisEmployerSen: socsoEis.eisEmployerSen,
		pcbSen: input.pcbSen,
		otherDeductionSen: input.otherDeductionSen,
		totalDeductionsSen,
		totalEmployerContributionsSen:
			epf.employerSen +
			socsoEis.socsoEmployerSen +
			socsoEis.eisEmployerSen,
		netPaySen: grossPaySen - totalDeductionsSen,
	};
}
