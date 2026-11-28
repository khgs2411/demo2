import { useEffect, useReducer, useRef, useState, useSyncExternalStore } from "react";
import { useTranslation } from "react-i18next";
import { useReducedMotion } from "../../motion/use-reduced-motion";
import { initialState, transition } from "./machine";
import type { SimEvent } from "./machine";
import { requestFields } from "./mock-admin";
import { brokenBookingButton } from "./scenarios/broken-booking-button";
import type { SimulationScenario } from "./scenarios/types";

function subscribeToVisibility(onChange: () => void) {
	document.addEventListener("visibilitychange", onChange);
	return () => document.removeEventListener("visibilitychange", onChange);
}

export function useSimulation(scenario: SimulationScenario = brokenBookingButton) {
	const [state, send] = useReducer(transition, initialState);
	const [autoplay, setAutoplay] = useState(true);
	const requestForm = useRef<HTMLFormElement>(null);
	const automaticallyAdvanced = useRef(false);
	const autoSubmitting = useRef(false);
	const { t } = useTranslation("admin-sim");
	const reducedMotion = useReducedMotion();
	const hidden = useSyncExternalStore(subscribeToVisibility, () => document.hidden, () => true);
	const playing = autoplay && !reducedMotion && state.step !== "live";
	const typingMs = state.step === "ticket_drafting"
		? requestFields(scenario, t).reduce((total, field) => total + field.text.length, 0) * scenario.timing.characterMs
		: 0;

	function pausePlayback() {
		setAutoplay(false);
	}

	function dispatch(event: SimEvent) {
		automaticallyAdvanced.current = autoSubmitting.current;
		if (event.type === "restarted" && state.step === "live") setAutoplay(true);
		else if (!autoSubmitting.current) pausePlayback();
		send(event);
	}

	function togglePlayback() {
		if (!reducedMotion && state.step !== "live") setAutoplay((enabled) => !enabled);
	}

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
		const timer = setTimeout(() => send(event), delay);
		return () => clearTimeout(timer);
	}, [state, scenario, reducedMotion]);

	useEffect(() => {
		if (!playing || hidden) return;
		if (state.step === "agent_fixing" && state.progress < 1) return;
		if (state.step === "deploying" && !state.finished) return;

		const { timing } = scenario;
		const effectMs = state.step === "ticket_drafting" ? typingMs
			: state.step === "ticket_submitted" ? timing.flightMs : 0;
		const timer = setTimeout(() => {
			if (document.hidden) return;
			if (state.step === "ticket_drafting") {
				// Native submission shares validation and the visitor's submit handler.
				autoSubmitting.current = true;
				try {
					requestForm.current?.requestSubmit();
				} finally {
					autoSubmitting.current = false;
				}
			} else {
				automaticallyAdvanced.current = true;
				send({ type: "next_requested" });
			}
		}, effectMs + timing.beatDwellMs[state.step]);
		return () => clearTimeout(timer);
	}, [state, scenario, playing, hidden, typingMs]);

	return { state, dispatch, scenario, reducedMotion, playing, automaticallyAdvanced, pausePlayback, togglePlayback, requestForm };
}
