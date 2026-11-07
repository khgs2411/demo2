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
		// Each beat waits for Next, as in the reference. Only its effects run on a clock.
		if (reducedMotion) return;
		let event: SimEvent;
		let delay: number;
		if (state.step === "agent_fixing" && state.progress < 1) {
			const intervals = scenario.logs.agent.length - 1;
			event = { type: "fix_progressed", progress: (Math.round(state.progress * intervals) + 1) / intervals };
			delay = scenario.timing.fixLineMs;
		} else if (state.step === "deploying" && !state.finished) {
			event = { type: "deploy_finished" };
			delay = scenario.timing.scanStartMs + scenario.timing.scanDurationMs;
		} else return;
		const timer = setTimeout(() => dispatch(event), delay);
		return () => clearTimeout(timer);
	}, [state, scenario, reducedMotion]);

	return { state, dispatch, scenario, reducedMotion };
}
