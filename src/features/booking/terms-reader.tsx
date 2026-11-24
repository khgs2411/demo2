import type { BookingTerms } from "./machine";

export function TermsReader({ terms }: { terms: BookingTerms }) {
	return <p className="booking-terms" lang={terms.locale} dir="auto">{terms.text}</p>;
}
