import type { PasswordChangeOutcome } from "./adapter";
import type { PasswordProblem } from "./password-validation";

export type PasswordChangeState =
	| { step: "editing"; ownerId: string | null; problem: PasswordProblem | null }
	| { step: "saving"; ownerId: string }
	| { step: "settled"; ownerId: string; outcome: PasswordChangeOutcome };

type PasswordChangeEvent =
	| { type: "owner_observed"; ownerId: string }
	| { type: "password_rejected"; ownerId: string; problem: PasswordProblem }
	| { type: "save_started"; ownerId: string }
	| { type: "save_finished"; ownerId: string; outcome: PasswordChangeOutcome };

export const initialPasswordChange: PasswordChangeState = { step: "editing", ownerId: null, problem: null };

export function passwordChangeTransition(state: PasswordChangeState, event: PasswordChangeEvent): PasswordChangeState {
	switch (event.type) {
		case "owner_observed": return state.ownerId !== null && state.ownerId !== event.ownerId ? initialPasswordChange : state;
		case "password_rejected": return state.step === "saving" ? state : { step: "editing", ownerId: event.ownerId, problem: event.problem };
		case "save_started": return state.step === "saving" ? state : { step: "saving", ownerId: event.ownerId };
		case "save_finished": return state.step === "saving" && state.ownerId === event.ownerId
			? { step: "settled", ownerId: event.ownerId, outcome: event.outcome } : state;
	}
}
