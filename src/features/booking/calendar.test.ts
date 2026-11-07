import { expect, it } from "vitest";
import { weekRange, moveWeek, groupWeek, formatStart, forwardRange } from "./calendar";

it("uses calendar weeks across month boundaries", () => {
	const week = weekRange(new Date(2026, 10, 8));
	expect(new Date(week.start).getDay()).toBe(1);
	expect(new Date(week.end).getDay()).toBe(1);
	expect(new Date(moveWeek(week, 1).start).getDate()).toBe(9);
});
it("groups by the visitor zone, retaining any backend weekend slots", () => {
	const slot = { id: "s", startsAt: "2026-11-08T23:30:00Z", canRegister: true, canCancelRegistration: false, userRegistrationState: null };
	const week = weekRange(new Date(2026, 10, 9));
	const days = groupWeek(week, [slot], "Asia/Jerusalem");
	expect(days[0].slots).toEqual([slot]);
	expect(days).toHaveLength(5);
	const sunday = { ...slot, id: "sunday", startsAt: "2026-11-15T09:00:00Z" };
	expect(groupWeek(week, [sunday], "Asia/Jerusalem").at(-1)?.slots).toEqual([sunday]);
	expect(formatStart(slot.startsAt, "en", "Asia/Jerusalem")).toBe("01:30");
});
it("uses the API's forward-range sentinel, without a UI history cutoff", () => {
	expect(forwardRange(new Date("2026-11-07T12:00:00Z"))).toEqual({ start: "2026-11-07T12:00:00.000Z", end: "9999-12-31T00:00:00.000Z" });
});
