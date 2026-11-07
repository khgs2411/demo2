import type { BookingRegistration, BookingSlot } from "./machine";

export type MeetingRequest = BookingSlot & { name: string };
export type RequestsState =
	| { step: "loading" }
	| { step: "signed_out" }
	| { step: "failed"; lastCancellation?: BookingRegistration }
	| { step: "ready"; requests: readonly MeetingRequest[]; cancellingId: string | null; cancellationFailed: boolean; lastCancellation?: BookingRegistration };
export type RequestsEvent =
	| { type: "loading" }
	| { type: "signed_out" }
	| { type: "failed" }
	| { type: "loaded"; requests: readonly MeetingRequest[] }
	| { type: "cancel_started"; registrationId: string }
	| { type: "cancel_completed"; registration: BookingRegistration }
	| { type: "cancel_failed" };

export function requestsTransition(state: RequestsState, event: RequestsEvent): RequestsState {
	const receipt = "lastCancellation" in state && state.lastCancellation ? { lastCancellation:state.lastCancellation } : {};
	switch (event.type) {
		case "loading": return { step: "loading" };
		case "signed_out": return { step: "signed_out" };
		case "failed": return { step: "failed", ...receipt };
		case "loaded": return {
			step: "ready", requests: event.requests, cancellingId: null,
			cancellationFailed: state.step === "ready" && state.cancellationFailed,
			...receipt,
		};
		case "cancel_completed": return state.step === "ready" ? { ...state, cancellingId: null, lastCancellation: event.registration } : state;
		case "cancel_failed": return state.step === "ready" ? { ...state, cancellingId: null, cancellationFailed: true } : state;
		case "cancel_started":
			return state.step === "ready" && state.cancellingId === null && state.requests.some(request =>
				request.canCancelRegistration && request.userRegistrationState?.id === event.registrationId)
				? { ...state, cancellingId: event.registrationId, cancellationFailed: false } : state;
	}
}
