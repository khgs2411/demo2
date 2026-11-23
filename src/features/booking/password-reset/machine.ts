export type RequestOutcome = "sent" | "disabled" | "bad_request" | "rate_limited" | "turnstile_failed" | "turnstile_unavailable" | "email_unavailable" | "failed";
export type CompleteOutcome = "password_reset" | "disabled" | "bad_request" | "reset_token_invalid" | "rate_limited" | "failed";
export type PasswordProblem = "too_short" | "too_long" | "mismatch";

export type ForgotState =
	| { step: "editing"; notice: Exclude<RequestOutcome, "sent"> | null }
	| { step: "sending" }
	| { step: "sent" };
export type ForgotEvent = { type: "send_started" } | { type: "send_finished"; outcome: RequestOutcome };

export const initialForgotState: ForgotState = { step: "editing", notice: null };

export function forgotTransition(state: ForgotState, event: ForgotEvent): ForgotState {
	switch (event.type) {
		case "send_started": return state.step === "editing" ? { step: "sending" } : state;
		case "send_finished":
			if (state.step !== "sending") return state;
			return event.outcome === "sent" ? { step: "sent" } : { step: "editing", notice: event.outcome };
	}
}

export type ResetState =
	| { step: "no_link" }
	| { step: "choosing"; notice: PasswordProblem | "disabled" | "rate_limited" | "failed" | null }
	| { step: "saving" }
	| { step: "done" }
	| { step: "link_unusable"; reason: "reset_token_invalid" | "bad_request" };
export type ResetEvent =
	| { type: "password_rejected"; problem: PasswordProblem }
	| { type: "save_started" }
	| { type: "save_finished"; outcome: CompleteOutcome };

export function initialResetState(token: string | null): ResetState {
	return token ? { step: "choosing", notice: null } : { step: "no_link" };
}

export function resetTransition(state: ResetState, event: ResetEvent): ResetState {
	switch (event.type) {
		case "password_rejected": return state.step === "choosing" ? { step: "choosing", notice: event.problem } : state;
		case "save_started": return state.step === "choosing" ? { step: "saving" } : state;
		case "save_finished":
			if (state.step !== "saving") return state;
			switch (event.outcome) {
				case "password_reset": return { step: "done" };
				case "reset_token_invalid":
				case "bad_request": return { step: "link_unusable", reason: event.outcome };
				default: return { step: "choosing", notice: event.outcome };
			}
	}
}

// Matches class-kit-password-reset: the minimum counts code points, the maximum
// counts UTF-8 bytes (Auth's bcrypt limit), so a Hebrew letter costs two.
export function passwordProblem(password: string, confirmation: string): PasswordProblem | null {
	if (Array.from(password).length < 8) return "too_short";
	if (new TextEncoder().encode(password).length > 72) return "too_long";
	return password === confirmation ? null : "mismatch";
}
