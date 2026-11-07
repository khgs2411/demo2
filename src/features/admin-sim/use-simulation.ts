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
		if (state.step !== "ticket_submitted" || reducedMotion) return;
		const lane = document.querySelector<HTMLElement>(".admin-sim .sim-lane");
		const card = lane?.querySelector<HTMLElement>(".sim-card");
		if (!lane || !card) return;
		// The reference flies from the first lane once the request form has closed.
		const from = lane.getBoundingClientRect();
		const to = card.getBoundingClientRect();
		const ghost = lane.cloneNode(true) as HTMLElement;
		ghost.classList.add("sim-fly");
		ghost.setAttribute("aria-hidden", "true");
		ghost.style.setProperty("--flight-motion", `${scenario.timing.flightMotionMs}ms`);
		Object.assign(ghost.style, {
			insetInlineStart: `${document.documentElement.dir === "rtl" ? window.innerWidth - from.right : from.left}px`,
			insetBlockStart: `${from.top}px`, inlineSize: `${from.width}px`, blockSize: `${from.height}px`,
			margin: "0", color: getComputedStyle(lane).color,
		});
		document.body.append(ghost);
		card.classList.add("sim-ghost");
		const frame = requestAnimationFrame(() => {
			ghost.style.transform = `translate(${to.left - from.left}px, ${to.top - from.top}px) scale(${to.width / from.width}, ${to.height / from.height})`;
			ghost.style.opacity = ".9";
		});
		const finish = () => { cancelAnimationFrame(frame); ghost.remove(); card.classList.remove("sim-ghost"); };
		const timer = setTimeout(finish, scenario.timing.flightMs);
		return () => { clearTimeout(timer); finish(); };
	}, [state, scenario, reducedMotion]);

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
