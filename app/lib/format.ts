export const money = (sen: number | null | undefined) =>
	new Intl.NumberFormat("en-MY", { style: "currency", currency: "MYR", minimumFractionDigits: 2 }).format((sen ?? 0) / 100);

export const date = (value: string | null | undefined, options: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" }) =>
	value ? new Intl.DateTimeFormat("en-MY", { ...options, timeZone: "Asia/Kuala_Lumpur" }).format(new Date(value.length === 10 ? `${value}T00:00:00+08:00` : value)) : "—";

export const time = (value: string | null | undefined) =>
	value ? new Intl.DateTimeFormat("en-MY", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Kuala_Lumpur" }).format(new Date(value)) : "—";

export const initials = (name: string) => name.split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase();
