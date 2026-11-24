import type { BookingTerms } from "./machine";

type Acceptance = BookingTerms & { id: string; acceptedAt: string };

type AcceptedTermsState =
	| { step: "loading" | "failed" | "empty" }
	| { step: "ready"; acceptances: Acceptance[]; openId: string | null };

export type AcceptedTermsLoadEvent =
	| { type: "loaded"; acceptances: Acceptance[] }
	| { type: "load_failed" };

type AcceptedTermsEvent = AcceptedTermsLoadEvent
	| { type: "retry_requested" }
	| { type: "acceptance_toggled"; id: string };

export function acceptedTermsTransition(state: AcceptedTermsState, event: AcceptedTermsEvent): AcceptedTermsState {
	switch (event.type) {
		case "loaded":
			if (state.step !== "loading") return state;
			return event.acceptances.length
				? { step: "ready", acceptances: event.acceptances, openId: null }
				: { step: "empty" };
		case "load_failed":
			return state.step === "loading" ? { step: "failed" } : state;
		case "retry_requested":
			return state.step === "failed" ? { step: "loading" } : state;
		case "acceptance_toggled":
			return state.step === "ready" ? { ...state, openId: state.openId === event.id ? null : event.id } : state;
	}
}
