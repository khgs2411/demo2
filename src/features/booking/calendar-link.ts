function formatCalendarDate(timestamp: string): string {
	return new Date(timestamp).toISOString().replace(/[-:]|\.\d{3}/g, "");
}

export function googleCalendarLink({ name, startsAt, endsAt }: { name: string; startsAt: string; endsAt: string }): string {
	const url = new URL("https://calendar.google.com/calendar/render");
	url.search = new URLSearchParams({
		action: "TEMPLATE",
		text: name,
		dates: `${formatCalendarDate(startsAt)}/${formatCalendarDate(endsAt)}`,
		details: "Topsyde Studios",
	}).toString();
	return url.href;
}
