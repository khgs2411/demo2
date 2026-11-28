import { useCallback, useEffect, useLayoutEffect, useReducer, useRef, useState, useSyncExternalStore } from "react";
import { useTranslation } from "react-i18next";
import { useReducedMotion } from "../../motion/use-reduced-motion";
import { initialState, transition } from "./machine";
import type { SimEvent, SimStep } from "./machine";
import { requestTyping } from "./request-draft";
import { brokenBookingButton } from "./scenarios/broken-booking-button";
import type { SimulationScenario } from "./scenarios/types";

function subscribeToVisibility(onChange: () => void) {
	document.addEventListener("visibilitychange", onChange);
	return () => document.removeEventListener("visibilitychange", onChange);
}

function logDuration(lineCount: number, revealMs: number, gapMs = 0) {
	return lineCount === 0 ? 0 : (lineCount - 1) * gapMs + revealMs;
}

function effectDuration(step: SimStep, scenario: SimulationScenario, typingMs: number) {
	const { timing, logs, deployStages } = scenario;
	switch (step) {
		case "bug": return logDuration(logs.idle.length, timing.logRevealMs);
		case "ticket_drafting": return typingMs;
		case "ticket_submitted": return Math.max(timing.flightMs, logDuration(logs.inbox.length, timing.logRevealMs, timing.inboxLogMs));
		case "agent_fixing": return (logs.agent.length - 1) * timing.fixLineMs + logDuration(logs.agent.length, timing.logRevealMs);
		case "deploying": return Math.max(
			timing.scanStartMs + timing.scanDurationMs,
			logDuration(logs.deploy.length, timing.logRevealMs, timing.deployLogMs),
			...deployStages.map((stage) => stage.startMs + timing.stageFillMs),
		);
		case "live": return 0;
	}
}

type BeatClock = { elapsedMs: number; startedAt: number | null };
export type BeatPlayback = { beatDurationMs: number; readElapsedMs: () => number; running: boolean; jump: number };

function elapsedTime(clock: BeatClock) {
	return clock.elapsedMs + (clock.startedAt === null ? 0 : performance.now() - clock.startedAt);
}

export function useSimulation(scenario: SimulationScenario = brokenBookingButton) {
	const [state, send] = useReducer(transition, initialState);
	const [autoplay, setAutoplay] = useState(true);
	const [jump, setJump] = useState(0);
	const clock = useRef<BeatClock>({ elapsedMs: 0, startedAt: null });
	const readElapsedMs = useCallback(() => elapsedTime(clock.current), []);
	const requestForm = useRef<HTMLFormElement>(null);
	const automaticallyAdvanced = useRef(false);
	const autoSubmitting = useRef(false);
	const { t } = useTranslation("admin-sim");
	const reducedMotion = useReducedMotion();
	const hidden = useSyncExternalStore(subscribeToVisibility, () => document.hidden, () => true);
	const playing = autoplay && !reducedMotion && state.step !== "live";
	const running = playing && !hidden;
	const typingMs = state.step === "ticket_drafting"
		? requestTyping(scenario, t).durationMs
		: 0;
	const effectMs = effectDuration(state.step, scenario, typingMs);
	const beatDurationMs = state.step === "live" ? 0 : effectMs + scenario.timing.beatDwellMs[state.step];
	const ready = state.step === "agent_fixing" ? state.progress === 1
		: state.step === "deploying" ? state.finished : true;

	function pausePlayback() {
		setAutoplay(false);
	}

	function dispatch(event: SimEvent, keepPlaying = false) {
		automaticallyAdvanced.current = autoSubmitting.current;
		if (!autoSubmitting.current) {
			setJump((entry) => entry + 1);
			if (state.step === "live") setAutoplay(event.type === "restarted");
			else if (!keepPlaying) pausePlayback();
		}
		send(event);
	}

	function navigate(event: SimEvent) {
		dispatch(event, true);
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
			delay = effectMs;
		} else return;
		const timer = setTimeout(() => send(event), delay);
		return () => clearTimeout(timer);
	}, [state, scenario, reducedMotion, effectMs]);

	useLayoutEffect(() => {
		clock.current = { elapsedMs: 0, startedAt: null };
	}, [state.step, jump, reducedMotion]);

	useLayoutEffect(() => {
		if (!running) return;
		const beatClock = clock.current;
		beatClock.startedAt = performance.now();
		const timer = ready ? setTimeout(() => {
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
		}, Math.max(0, Math.ceil(beatDurationMs - beatClock.elapsedMs))) : undefined;
		return () => {
			beatClock.elapsedMs = elapsedTime(beatClock);
			beatClock.startedAt = null;
			clearTimeout(timer);
		};
	}, [state.step, jump, running, ready, beatDurationMs]);

	return {
		state, dispatch, navigate, scenario, reducedMotion, playing, automaticallyAdvanced, pausePlayback, togglePlayback, requestForm,
		playback: { beatDurationMs, running, jump, readElapsedMs },
	};
}
