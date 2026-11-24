import type { ManagementRegistrationSummary } from "@class-kit/react";
import type { StudioError } from "./adapter";

type Activity = { busy?: boolean; error?: StudioError | null };
export type StudioState = Activity & (
	| { step: "loading" | "signed_out" | "not_manager" | "failed" }
	| { step: "ready"; pending: readonly ManagementRegistrationSummary[]; upcoming: readonly ManagementRegistrationSummary[]; history: readonly ManagementRegistrationSummary[]; decidingId: string | null }
);
export type StudioEvent =
	| { type: "access_resolved"; access: "signed_out" | "not_manager" | "manager" }
	| { type: "lists_loaded"; pending: readonly ManagementRegistrationSummary[]; upcoming: readonly ManagementRegistrationSummary[]; history: readonly ManagementRegistrationSummary[] }
	| { type: "decision_started"; id: string }
	| { type: "decision_succeeded" }
	| { type: "decision_failed" | "load_failed" | "auth_failed"; error: StudioError }
	| { type: "retry_requested" | "auth_started" | "auth_finished" | "manager_signed_in" | "auth_redirect_started" };

export function transition(state: StudioState, event: StudioEvent): StudioState {
	switch (event.type) {
		case "auth_started": return state.busy ? state : { ...state, busy:true, error:null };
		case "manager_signed_in": return state.step === "signed_out"
			? { step: "loading" } : { ...state, busy:false };
		case "auth_finished": return { ...state, busy:false };
		case "auth_failed": return { ...state, busy:false, error:event.error };
		case "access_resolved": return { step: event.access === "manager" ? "loading" : event.access, busy: false, error: null };
		case "lists_loaded": return state.step === "loading" || state.step === "ready"
			? { step:"ready", pending:event.pending, upcoming:event.upcoming, history:event.history, busy:false, error:null, decidingId:null } : state;
		case "decision_started": return state.step === "ready" && !state.busy && state.pending.some(row => row.id === event.id)
			? { ...state, busy:true, decidingId:event.id, error:null } : state;
		case "decision_succeeded":
		case "auth_redirect_started": return state;
		case "decision_failed": return state.step === "ready" && state.busy ? { ...state, busy:false, decidingId:null, error:event.error } : state;
		case "load_failed": return state.step === "loading" || state.step === "ready" ? {
			step: event.error.code === "forbidden" ? "not_manager" : event.error.code === "unauthorized" ? "signed_out" : "failed", busy:false, error:event.error,
		} : state;
		case "retry_requested": return state.step === "failed" ? {step:"loading"} : state;
	}
}
