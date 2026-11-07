import type { BookingRange } from "./adapter";
import type { BookingSlot } from "./machine";

export function weekRange(now: Date): BookingRange {
	const start = new Date(now);
	start.setHours(0, 0, 0, 0);
	start.setDate(start.getDate() - (start.getDay() + 6) % 7);
	const end = new Date(start);
	end.setDate(end.getDate() + 7);
	return { start: start.toISOString(), end: end.toISOString() };
}

export function moveWeek(range: BookingRange, direction: -1 | 1): BookingRange {
	const start = new Date(range.start);
	start.setDate(start.getDate() + direction * 7);
	return weekRange(start);
}

export function forwardRange(now: Date): BookingRange {
	// Same open-future sentinel as class-kit-classes.parseRange; no UI cutoff.
	return { start: now.toISOString(), end: "9999-12-31T00:00:00.000Z" };
}

export function formatStart(startsAt: string, language: string, timeZone: string): string {
	return new Intl.DateTimeFormat(language, { timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(startsAt));
}

export function formatWhen(startsAt: string, language: string, timeZone: string): string {
	const date = new Intl.DateTimeFormat(language, { timeZone, weekday: "short", day: "numeric", month: "numeric" }).format(new Date(startsAt));
	return `${date} · ${formatStart(startsAt, language, timeZone)}`;
}

export function dayKey(date: Date, timeZone: string): string {
	return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

export function groupWeek(range: BookingRange, slots: readonly BookingSlot[], timeZone: string) {
	const start = new Date(range.start);
	return Array.from({ length: 7 }, (_, index) => {
		const date = new Date(start);
		date.setDate(date.getDate() + index);
		const key = dayKey(date, timeZone);
		return { date, key, slots: slots.filter(slot => dayKey(new Date(slot.startsAt), timeZone) === key)
			.toSorted((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt)) };
	}).filter((day, index) => index < 5 || day.slots.length > 0);
}
