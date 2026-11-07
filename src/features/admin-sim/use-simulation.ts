import { useEffect, useReducer } from "react";
import { useReducedMotion } from "../../motion/use-reduced-motion";
import { initialState, transition } from "./machine";
import type { SimEvent } from "./machine";
import { brokenBookingButton } from "./scenarios/broken-booking-button";
import type { SimulationScenario } from "./scenarios/types";

export function useSimulation(scenario: SimulationScenario = brokenBookingButton) {
	const [state, dispatch] = useReducer(transition, initialState);
	const reducedMotion = useReducedMotion();

	useEffect(() => {
		// Reduced motion is visitor-paced: Next still goes through the pure machine.
		if (reducedMotion) return;
		let event: SimEvent;
		let delay: number;
		switch (state.step) {
			case "ticket_submitted":
				event = { type: "agent_assigned" };
				delay = scenario.timing.ticketSubmittedMs;
				break;
			case "agent_triaging":
				event = { type: "fix_started" };
				delay = scenario.timing.agentTriagingMs;
				break;
			case "agent_fixing":
				if (state.progress === 1) {
					dispatch({ type: "fix_completed" });
					return;
				}
				event = { type: "fix_progressed", progress: (Math.round(state.progress * scenario.diff.lines.length) + 1) / scenario.diff.lines.length };
				delay = scenario.timing.fixLineMs;
				break;
			case "deploying":
				event = { type: "deploy_finished" };
				delay = scenario.deployStages.reduce((sum, stage) => sum + stage.durationMs, 0);
				break;
			default:
				return;
		}
		const timer = setTimeout(() => dispatch(event), delay);
		return () => clearTimeout(timer);
	}, [state, scenario, reducedMotion]);

	return { state, dispatch, scenario };
}
