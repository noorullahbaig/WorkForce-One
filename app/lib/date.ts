export function todayInTimeZone(now: Date, timeZone: string): string {
	const parts = new Intl.DateTimeFormat("en-CA", {
		timeZone,
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	}).formatToParts(now);
	const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
	return `${values.year}-${values.month}-${values.day}`;
}

export function addCalendarDays(day: string, delta: number): string {
	const current = new Date(`${day}T00:00:00Z`);
	if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !Number.isFinite(current.getTime())) {
		throw new Error("Choose a valid date.");
	}
	current.setUTCDate(current.getUTCDate() + delta);
	return current.toISOString().slice(0, 10);
}
