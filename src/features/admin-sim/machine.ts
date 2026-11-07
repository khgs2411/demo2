export type SimState =
	| { step: "bug" }
	| { step: "ticket_drafting" }
	| { step: "ticket_submitted"; ticketId: string }
	| { step: "agent_fixing"; ticketId: string; progress: number }
	| { step: "deploying"; ticketId: string; finished: boolean }
	| { step: "live"; ticketId: string };

export type SimStep = SimState["step"];
export type SimEvent =
	| { type: "ticket_opened" }
	| { type: "ticket_submitted"; ticketId: string }
	| { type: "agent_assigned" }
	| { type: "fix_progressed"; progress: number }
	| { type: "fix_completed" }
	| { type: "deploy_finished" }
	| { type: "next_requested" }
	| { type: "back_requested" }
	| { type: "step_selected"; step: SimStep; ticketId: string }
	| { type: "restarted" };

export const initialState: SimState = { step: "bug" };
export const simulationSteps: readonly SimStep[] = [
	"bug", "ticket_drafting", "ticket_submitted", "agent_fixing", "deploying", "live",
];

function enterStep(step: SimStep, ticketId: string): SimState {
	switch (step) {
		case "bug": return initialState;
		case "ticket_drafting": return { step };
		case "deploying": return { step, ticketId, finished: false };
		case "agent_fixing": return { step, ticketId, progress: 0 };
		default: return { step, ticketId };
	}
}

export function transition(state: SimState, event: SimEvent): SimState {
	if (event.type === "restarted") return initialState;
	if (event.type === "step_selected") return enterStep(event.step, event.ticketId);
	if (event.type === "back_requested") {
		const previous = simulationSteps[simulationSteps.indexOf(state.step) - 1];
		return previous ? enterStep(previous, "ticketId" in state ? state.ticketId : "") : state;
	}

	switch (state.step) {
		case "bug":
			return event.type === "ticket_opened" || event.type === "next_requested"
				? { step: "ticket_drafting" } : state;
		case "ticket_drafting":
			// Next does not pretend the visitor has submitted the form.
			return event.type === "ticket_submitted"
				? { step: "ticket_submitted", ticketId: event.ticketId } : state;
		case "ticket_submitted":
			return event.type === "agent_assigned" || event.type === "next_requested"
				? { step: "agent_fixing", ticketId: state.ticketId, progress: 0 } : state;
		case "agent_fixing":
			if (event.type === "next_requested") return { step: "deploying", ticketId: state.ticketId, finished: false };
			if (event.type === "fix_completed") return { ...state, progress: 1 };
			if (event.type === "fix_progressed" && Number.isFinite(event.progress)
				&& event.progress > state.progress && event.progress <= 1) {
				return { ...state, progress: event.progress };
			}
			return state;
		case "deploying":
			if (event.type === "deploy_finished") return { ...state, finished: true };
			return event.type === "next_requested" ? { step: "live", ticketId: state.ticketId } : state;
		case "live":
			return state;
	}
}
