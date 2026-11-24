import { expect, it } from "vitest";
import { googleCalendarLink } from "./calendar-link";

it("encodes the slot title and studio details in a Google Calendar template", () => {
	const name = "ייעוץ & design + planning #1";
	const link = new URL(googleCalendarLink({
		name, startsAt: "2026-12-03T14:05:09Z", endsAt: "2026-12-03T14:50:13Z",
	}));

	expect(link.origin + link.pathname).toBe("https://calendar.google.com/calendar/render");
	expect(Object.fromEntries(link.searchParams)).toEqual({
		action: "TEMPLATE",
		text: name,
		dates: "20261203T140509Z/20261203T145013Z",
		details: "Topsyde Studios",
	});
	expect(link.search).toContain("%26");
	expect(link.search).toContain("%2B");
	expect(link.search).toContain("%23");
});

it("converts offset timestamps to UTC across a date boundary", () => {
	const link = new URL(googleCalendarLink({
		name: "Meeting", startsAt: "2026-12-04T00:10:05.000+02:00", endsAt: "2026-12-04T02:55:10.000+02:00",
	}));

	expect(link.searchParams.get("dates")).toBe("20261203T221005Z/20261204T005510Z");
});
