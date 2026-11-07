export function openBooking({ packageId }: { packageId?: string } = {}) {
	window.location.hash = packageId === undefined ? "/book" : `/book/${encodeURIComponent(packageId)}`;
}
