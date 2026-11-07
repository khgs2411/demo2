import type { BookingSlot } from "./machine";

export type MeetingRequest = BookingSlot & { name: string };
export type RequestsState =
	| { step: "loading" }
	| { step: "signed_out" }
	| { step: "failed" }
	| { step: "ready"; requests: readonly MeetingRequest[]; cancellingId: string | null; cancellationFailed: boolean };
export type RequestsEvent =
	| { type: "loading" }
	| { type: "signed_out" }
	| { type: "failed" }
	| { type: "loaded"; requests: readonly MeetingRequest[] }
	| { type: "cancel_started"; registrationId: string }
	| { type: "cancel_failed" };

export function requestsTransition(state: RequestsState, event: RequestsEvent): RequestsState {
	switch (event.type) {
		case "loading": return { step: "loading" };
		case "signed_out": return { step: "signed_out" };
		case "failed": return { step: "failed" };
		case "loaded": return {
			step: "ready", requests: event.requests, cancellingId: null,
			cancellationFailed: state.step === "ready" && state.cancellationFailed,
		};
		case "cancel_failed": return state.step === "ready" ? { ...state, cancellingId: null, cancellationFailed: true } : state;
		case "cancel_started":
			return state.step === "ready" && state.cancellingId === null && state.requests.some(request =>
				request.canCancelRegistration && request.userRegistrationState?.id === event.registrationId)
				? { ...state, cancellingId: event.registrationId, cancellationFailed: false } : state;
	}
}
