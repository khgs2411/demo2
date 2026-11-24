export function upcomingStartTime(startsAt: string, now: number): number | null {
	const start = Date.parse(startsAt);
	return start > now ? start : null;
}
