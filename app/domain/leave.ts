import { addCalendarDays } from "../lib/date";

export type LeaveDayPart = "full" | "morning" | "afternoon";

export function getEarliestLeaveDate(today: string, backdateDays: number) {
	return addCalendarDays(today, -Math.max(0, Math.floor(backdateDays)));
}

export function getLeaveDatePolicyError(
	startDate: string,
	today: string,
	backdateDays: number,
) {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) return "Choose valid leave dates.";
	const earliestDate = getEarliestLeaveDate(today, backdateDays);
	if (startDate >= earliestDate) return null;
	const formattedDate = new Intl.DateTimeFormat("en-MY", {
		day: "numeric",
		month: "long",
		year: "numeric",
		timeZone: "UTC",
	}).format(new Date(`${earliestDate}T00:00:00Z`));
	return `Leave cannot start before ${formattedDate}.`;
}

export function calculateLeaveDurationHalfDays(_input: {
	startDate: string;
	endDate: string;
	dayPart: LeaveDayPart;
	holidayDates: string[];
}): { durationHalfDays: number; excludedDates: string[] } {
	const { startDate, endDate, dayPart, holidayDates } = _input;
	if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
		throw new Error("Choose valid leave dates.");
	}
	const start = Date.parse(`${startDate}T00:00:00Z`);
	const end = Date.parse(`${endDate}T00:00:00Z`);
	if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) {
		throw new Error("The end date must be on or after the start date.");
	}
	if (dayPart !== "full" && startDate !== endDate) {
		throw new Error("Half-day leave must start and end on the same date.");
	}

	const holidays = new Set(holidayDates);
	const excludedDates: string[] = [];
	let workingDays = 0;
	for (let current = start; current <= end; current += 86_400_000) {
		const currentDate = new Date(current);
		const isoDate = currentDate.toISOString().slice(0, 10);
		const weekday = currentDate.getUTCDay();
		if (weekday === 0 || weekday === 6 || holidays.has(isoDate)) {
			excludedDates.push(isoDate);
		} else {
			workingDays += 1;
		}
	}
	if (workingDays === 0) throw new Error("Choose at least one working day.");
	return {
		durationHalfDays: dayPart === "full" ? workingDays * 2 : 1,
		excludedDates,
	};
}

export function rangesOverlap(
	startA: string,
	endA: string,
	startB: string,
	endB: string,
) {
	return startA <= endB && startB <= endA;
}

export function calculateProjectedBalance(_input: {
	allocatedHalfDays: number;
	adjustmentHalfDays: number;
	approvedHalfDays: number;
	pendingHalfDays: number;
}) {
	const entitledHalfDays = _input.allocatedHalfDays + _input.adjustmentHalfDays;
	const availableHalfDays = entitledHalfDays - _input.approvedHalfDays;
	return {
		entitledHalfDays,
		availableHalfDays,
		projectedHalfDays: availableHalfDays - _input.pendingHalfDays,
	};
}

type CoverageRequest = {
	id: string;
	fullName: string;
	department: string;
	startDate: string;
	endDate: string;
	status: string;
};

export function getCoverageSummary(_input: {
	department: string;
	departmentHeadcount: number;
	startDate: string;
	endDate: string;
	requests: CoverageRequest[];
}) {
	const overlapping = _input.requests
		.filter((request) => request.department === _input.department)
		.filter((request) => request.status === "approved" || request.status === "pending")
		.filter((request) => rangesOverlap(_input.startDate, _input.endDate, request.startDate, request.endDate))
		.map(({ id, fullName, status }) => ({ id, fullName, status }));
	return {
		awayCount: overlapping.length,
		departmentHeadcount: _input.departmentHeadcount,
		overlapping,
	};
}
