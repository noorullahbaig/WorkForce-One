export type AttendanceCalculation = {
	workedMinutes: number | null;
	overtimeMinutes: number | null;
};

export function calculateAttendance(input: {
	clockIn: string;
	clockOut: string | null;
	normalDayMinutes: number;
}): AttendanceCalculation {
	if (!input.clockOut) {
		return { workedMinutes: null, overtimeMinutes: null };
	}

	const clockIn = Date.parse(input.clockIn);
	const clockOut = Date.parse(input.clockOut);
	if (!Number.isFinite(clockIn) || !Number.isFinite(clockOut)) {
		throw new Error("Attendance timestamps must be valid ISO dates");
	}
	if (clockOut <= clockIn) {
		throw new Error("Clock out must be after clock in");
	}

	const workedMinutes = Math.round((clockOut - clockIn) / 60_000);
	return {
		workedMinutes,
		overtimeMinutes: Math.max(0, workedMinutes - input.normalDayMinutes),
	};
}
