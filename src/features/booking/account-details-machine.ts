import type { BookingContact, BookingEvent } from "./machine";

export type AccountDetailsState =
	| { step: "loading" }
	| { step: "editing" | "saving" | "saved"; details: BookingContact }
	| { step: "failed"; operation: "load" }
	| { step: "failed"; operation: "save"; details: BookingContact };

export type AccountDetailsSaveEvent = { type: "saved" } | { type: "save_failed" };

type AccountDetailsEvent =
	| Extract<BookingEvent, { type: "profile_loaded" }>
	| { type: "field_changed"; field: keyof BookingContact; value: string }
	| { type: "save_requested" }
	| AccountDetailsSaveEvent;

export function hasRequiredDetails({ displayName, phoneNumber }: BookingContact): boolean {
	return Boolean(displayName.trim() && phoneNumber.trim());
}

export function accountDetailsTransition(state: AccountDetailsState, event: AccountDetailsEvent): AccountDetailsState {
	switch (event.type) {
		case "profile_loaded": {
			if (state.step !== "loading") return state;
			if (!event.profile) return { step: "failed", operation: "load" };
			const { displayName, phoneNumber } = event.profile;
			return { step: "editing", details: { displayName, phoneNumber } };
		}
		case "field_changed":
			return "details" in state && state.step !== "saving"
				? { step: "editing", details: { ...state.details, [event.field]: event.value } }
				: state;
		case "save_requested":
			return "details" in state && state.step !== "saving" && hasRequiredDetails(state.details)
				? { step: "saving", details: state.details }
				: state;
		case "saved":
			return state.step === "saving" ? { step: "saved", details: state.details } : state;
		case "save_failed":
			return state.step === "saving" ? { step: "failed", operation: "save", details: state.details } : state;
	}
}
