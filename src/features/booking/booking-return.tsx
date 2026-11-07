import { useEffect } from "react";
import { useBookingContext } from "./adapter";
import { hasBookingRedirect } from "./redirect";

export function BookingReturn() {
	const { loading, session } = useBookingContext();
	useEffect(() => {
		if (loading || !session) return;
		// Supabase clears its implicit-flow hash with replaceState, without hashchange.
		if (hasBookingRedirect()) window.location.hash = "#/book";
		else if (!window.location.hash.startsWith("#/")) window.dispatchEvent(new HashChangeEvent("hashchange"));
	}, [loading, session]);
	return null;
}
