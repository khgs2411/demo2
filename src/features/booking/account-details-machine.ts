import type { BookingContact, BookingEvent } from "./machine";

export type AccountDetailsState =
	| { step: "loading" }
	| { step: "editing" | "saved"; details: BookingContact }
	| { step: "saving"; details: BookingContact; submission: BookingContact }
	| { step: "failed"; operation: "load" }
	| { step: "failed"; operation: "save"; details: BookingContact };

export type AccountDetailsSaveEvent = { type: "saved" } | { type: "save_failed" };

type AccountDetailsEvent =
	| Extract<BookingEvent, { type: "profile_loaded" }>
	| { type: "load_retry_requested" }
	| { type: "field_changed"; field: keyof BookingContact; value: string }
	| { type: "save_requested" }
	| AccountDetailsSaveEvent;

export function getDetailsToSave({ displayName, phoneNumber }: BookingContact): BookingContact | null {
	const name = displayName.trim();
	const phone = phoneNumber.trim();
	return name && phone ? { displayName: name, phoneNumber: phone } : null;
}

export function accountDetailsTransition(state: AccountDetailsState, event: AccountDetailsEvent): AccountDetailsState {
	switch (event.type) {
		case "profile_loaded": {
			if (state.step !== "loading") return state;
			if (!event.profile) return { step: "failed", operation: "load" };
			const { displayName, phoneNumber } = event.profile;
			return { step: "editing", details: { displayName, phoneNumber } };
		}
		case "load_retry_requested":
			return state.step === "failed" && state.operation === "load" ? { step: "loading" } : state;
		case "field_changed":
			return "details" in state && state.step !== "saving"
				? { step: "editing", details: { ...state.details, [event.field]: event.value } }
				: state;
		case "save_requested": {
			if (!("details" in state) || state.step === "saving") return state;
			const submission = getDetailsToSave(state.details);
			return submission ? { step: "saving", details: state.details, submission } : state;
		}
		case "saved":
			return state.step === "saving" ? { step: "saved", details: state.submission } : state;
		case "save_failed":
			return state.step === "saving" ? { step: "failed", operation: "save", details: state.details } : state;
	}
}
