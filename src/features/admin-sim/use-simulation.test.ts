import { act, cleanup, render, renderHook } from "@testing-library/react";
import { StrictMode, createElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { brokenBookingButton as scenario } from "./scenarios/broken-booking-button";
import { MockAdmin } from "./mock-admin";
import { useSimulation } from "./use-simulation";
import type { SimStep } from "./machine";
import { i18n } from "../../i18n";

const timedSteps = ["agent_fixing", "deploying"] as const;
const logRevealMs = 200;
const inboxEffectsMs = 2 * scenario.timing.inboxLogMs + logRevealMs;
const bugBeatMs = logRevealMs + scenario.timing.beatDwellMs.bug;
const deployMs = scenario.timing.scanStartMs + scenario.timing.scanDurationMs;
let media: { matches: boolean; addEventListener: ReturnType<typeof vi.fn>; removeEventListener: ReturnType<typeof vi.fn> };

beforeEach(() => {
	vi.useFakeTimers();
	media = { matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() };
	vi.stubGlobal("matchMedia", () => media);
	vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
	cleanup();
	expect(vi.getTimerCount()).toBe(0);
	vi.useRealTimers();
	vi.unstubAllGlobals();
});

function advance(ms: number) {
	act(() => { vi.advanceTimersByTime(ms); });
}

describe("simulation effects", () => {
	it("plays every beat untouched and waits for typing, flight, fix and deployment before advancing", async () => {
		await i18n.changeLanguage("en");
		const { result } = renderHook(() => useSimulation());
		const { beatDwellMs, characterMs, fixLineMs } = scenario.timing;
		advance(bugBeatMs - 1);
		expect(result.current.state.step).toBe("bug");
		advance(1);
		expect(result.current.state.step).toBe("ticket_drafting");

		render(createElement(MockAdmin, {
			scenario,
			formRef: result.current.requestForm,
			onSubmit: () => result.current.dispatch({ type: "ticket_submitted", ticketId: scenario.ticket.id }),
		}));
		const typedText = "Problem" + "The booking button is cut off on mobile" +
			"The button on the home page goes off screen, so nobody can book.";
		advance(typedText.length * characterMs + beatDwellMs.ticket_drafting - 1);
		expect(result.current.state.step).toBe("ticket_drafting");
		advance(1);
		expect(result.current.state).toEqual({ step: "ticket_submitted", ticketId: scenario.ticket.id });

		advance(inboxEffectsMs + beatDwellMs.ticket_submitted - 1);
		expect(result.current.state.step).toBe("ticket_submitted");
		advance(1);
		expect(result.current.state.step).toBe("agent_fixing");
		for (let line = 1; line < scenario.logs.agent.length; line++) advance(fixLineMs);
		expect(result.current.state).toHaveProperty("progress", 1);
		advance(logRevealMs + beatDwellMs.agent_fixing - 1);
		expect(result.current.state.step).toBe("agent_fixing");
		advance(1);
		expect(result.current.state.step).toBe("deploying");
		advance(deployMs);
		expect(result.current.state).toHaveProperty("finished", true);
		advance(beatDwellMs.deploying);
		expect(result.current.state.step).toBe("live");
		expect(vi.getTimerCount()).toBe(0);
	});

	it("pauses on a manual action and resumes from that beat", () => {
		const { result } = renderHook(() => useSimulation());
		act(() => { result.current.dispatch({ type: "step_selected", step: "ticket_submitted", ticketId: scenario.ticket.id }); });
		act(() => { vi.runAllTimers(); });
		expect(result.current.state.step).toBe("ticket_submitted");
		act(() => { result.current.togglePlayback(); });
		advance(inboxEffectsMs + scenario.timing.beatDwellMs.ticket_submitted);
		expect(result.current.state.step).toBe("agent_fixing");
	});

	it("waits when hidden during a dwell and resumes when visible", () => {
		const hidden = vi.spyOn(document, "hidden", "get").mockReturnValue(false);
		try {
			const { result } = renderHook(() => useSimulation());
			const dwell = bugBeatMs;
			advance(dwell / 2);
			hidden.mockReturnValue(true);
			act(() => { document.dispatchEvent(new Event("visibilitychange")); });
			advance(dwell);
			expect(result.current.state.step).toBe("bug");
			hidden.mockReturnValue(false);
			act(() => { document.dispatchEvent(new Event("visibilitychange")); });
			advance(dwell);
			expect(result.current.state.step).toBe("ticket_drafting");
		} finally {
			hidden.mockRestore();
		}
	});

	it("waits for submission, streams the fix and only renders fixed after deployment", () => {
		const { result } = renderHook(() => useSimulation());
		expect(result.current.state).toEqual({ step: "bug" });
		expect(vi.getTimerCount()).toBe(1);
		act(() => { result.current.dispatch({ type: "ticket_opened" }); });
		act(() => { vi.runAllTimers(); result.current.dispatch({ type: "next_requested" }); });
		expect(result.current.state).toEqual({ step: "ticket_drafting" });
		expect(vi.getTimerCount()).toBe(0);
		act(() => { result.current.dispatch({ type: "ticket_submitted", ticketId: scenario.ticket.id }); });
		expect(result.current.state.step).toBe("ticket_submitted");
		act(() => { vi.runAllTimers(); });
		expect(result.current.state.step).toBe("ticket_submitted");
		act(() => { result.current.dispatch({ type: "next_requested" }); });
		expect(result.current.state).toEqual({ step: "agent_fixing", ticketId: scenario.ticket.id, progress: 0 });
		for (let line = 1; line < scenario.logs.agent.length; line++) {
			advance(scenario.timing.fixLineMs);
			expect(result.current.state).toEqual({ step: "agent_fixing", ticketId: scenario.ticket.id, progress: line / (scenario.logs.agent.length - 1) });
		}
		expect(vi.getTimerCount()).toBe(0);
		act(() => { result.current.dispatch({ type: "next_requested" }); });
		expect(result.current.state.step).toBe("deploying");
		advance(deployMs);
		expect(result.current.state).toEqual({ step: "deploying", ticketId: scenario.ticket.id, finished: true });
		act(() => { result.current.dispatch({ type: "next_requested" }); });
		expect(result.current.state).toEqual({ step: "live", ticketId: scenario.ticket.id });
		expect(vi.getTimerCount()).toBe(0);
		expect(fetch).not.toHaveBeenCalled();
	});

	it.each(timedSteps)("clears %s timers on unmount and returns to the bug on remount", (step) => {
		const { result, unmount } = renderHook(() => useSimulation());
		act(() => { result.current.dispatch({ type: "step_selected", step, ticketId: scenario.ticket.id }); });
		expect(vi.getTimerCount()).toBe(1);
		unmount();
		expect(vi.getTimerCount()).toBe(0);
		const remounted = renderHook(() => useSimulation());
		advance(scenario.timing.beatDwellMs.bug - 1);
		expect(remounted.result.current.state).toEqual({ step: "bug" });
	});

	it.each(timedSteps)("restart cancels %s without any stale transition", (step) => {
		const { result } = renderHook(() => useSimulation());
		act(() => { result.current.dispatch({ type: "step_selected", step, ticketId: scenario.ticket.id }); });
		expect(vi.getTimerCount()).toBe(1);
		act(() => { result.current.dispatch({ type: "restarted" }); });
		expect(vi.getTimerCount()).toBe(0);
		act(() => { vi.runAllTimers(); });
		expect(result.current.state).toEqual({ step: "bug" });
	});

	it("back, skip and a batched restart replace a partly elapsed fix timer", () => {
		const { result } = renderHook(() => useSimulation());
		const select = (step: SimStep) => result.current.dispatch({ type: "step_selected", step, ticketId: scenario.ticket.id });
		act(() => { select("agent_fixing"); });
		advance(scenario.timing.fixLineMs / 2);
		act(() => { result.current.dispatch({ type: "restarted" }); select("agent_fixing"); });
		expect(vi.getTimerCount()).toBe(1);
		advance(scenario.timing.fixLineMs / 2);
		expect(result.current.state).toHaveProperty("progress", 0);
		advance(scenario.timing.fixLineMs / 2);
		expect(result.current.state).toHaveProperty("progress", 1 / (scenario.logs.agent.length - 1));
		act(() => { result.current.dispatch({ type: "back_requested" }); });
		expect(vi.getTimerCount()).toBe(0);
		act(() => { select("live"); });
		expect(vi.getTimerCount()).toBe(0);
		act(() => { vi.runAllTimers(); });
		expect(result.current.state.step).toBe("live");
	});

	it("reduced motion has no timers and advances each step instantly on Next", () => {
		media.matches = true;
		const { result } = renderHook(() => useSimulation());
		act(() => { vi.runAllTimers(); });
		expect(result.current.state.step).toBe("bug");
		act(() => { result.current.dispatch({ type: "next_requested" }); });
		expect(result.current.state.step).toBe("ticket_drafting");
		act(() => { result.current.dispatch({ type: "ticket_submitted", ticketId: scenario.ticket.id }); });
		for (const step of ["agent_fixing", "deploying", "live"]) {
			expect(vi.getTimerCount()).toBe(0);
			act(() => { result.current.dispatch({ type: "next_requested" }); });
			expect(result.current.state.step).toBe(step);
		}
		expect(vi.getTimerCount()).toBe(0);
	});

	it("cancels an active timer when reduced motion is enabled mid-run", () => {
		const { result } = renderHook(() => useSimulation());
		act(() => { result.current.dispatch({ type: "step_selected", step: "agent_fixing", ticketId: scenario.ticket.id }); });
		expect(vi.getTimerCount()).toBe(1);
		act(() => {
			media.matches = true;
			for (const [, listener] of media.addEventListener.mock.calls) listener();
		});
		expect(vi.getTimerCount()).toBe(0);
		act(() => { vi.runAllTimers(); });
		expect(result.current.state).toHaveProperty("progress", 0);
		act(() => { result.current.dispatch({ type: "next_requested" }); });
		expect(result.current.state.step).toBe("deploying");
		expect(vi.getTimerCount()).toBe(0);
	});

	it("uses the supplied scenario timing and log length rather than hard-coded progress", () => {
		const custom = { ...scenario, timing: { ...scenario.timing, fixLineMs: scenario.timing.fixLineMs * 2 }, logs: { ...scenario.logs, agent: scenario.logs.agent.slice(0, 3) } };
		const { result } = renderHook(() => useSimulation(custom));
		act(() => { result.current.dispatch({ type: "step_selected", step: "agent_fixing", ticketId: custom.ticket.id }); });
		advance(scenario.timing.fixLineMs);
		expect(result.current.state).toHaveProperty("progress", 0);
		advance(scenario.timing.fixLineMs);
		expect(result.current.state).toHaveProperty("progress", 0.5);
		advance(custom.timing.fixLineMs);
		expect(result.current.state).toHaveProperty("progress", 1);
		act(() => { result.current.dispatch({ type: "next_requested" }); });
		expect(result.current.state.step).toBe("deploying");
		advance(deployMs);
		expect(result.current.state).toHaveProperty("finished", true);
		act(() => { result.current.dispatch({ type: "next_requested" }); });
		expect(result.current.state.step).toBe("live");
	});

	it("owns one timer in StrictMode and leaves none after cleanup", () => {
		const { result, unmount } = renderHook(() => useSimulation(), {
			wrapper: ({ children }) => createElement(StrictMode, null, children),
		});
		act(() => { result.current.dispatch({ type: "step_selected", step: "deploying", ticketId: scenario.ticket.id }); });
		expect(vi.getTimerCount()).toBe(1);
		unmount();
		expect(vi.getTimerCount()).toBe(0);
	});
});
