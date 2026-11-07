import { describe, expect, it } from "vitest";
import { initialState, transition } from "./machine";
import type { SimEvent, SimState, SimStep } from "./machine";

const ticketId = "demo-ticket";
const states: SimState[] = [
	{ step: "bug" },
	{ step: "ticket_drafting" },
	{ step: "ticket_submitted", ticketId },
	{ step: "agent_fixing", ticketId, progress: 0 },
	{ step: "deploying", ticketId, finished: false },
	{ step: "live", ticketId },
];
const events: SimEvent[] = [
	{ type: "ticket_opened" },
	{ type: "ticket_submitted", ticketId },
	{ type: "agent_assigned" },
	{ type: "fix_progressed", progress: 0.5 },
	{ type: "fix_completed" },
	{ type: "deploy_finished" },
	{ type: "next_requested" },
	{ type: "back_requested" },
	{ type: "step_selected", step: "agent_fixing", ticketId },
	{ type: "restarted" },
];

// Rows are source states; columns follow the event list above. A dash is a no-op.
const expectedSteps = [
	["ticket_drafting", "-", "-", "-", "-", "-", "ticket_drafting", "-", "agent_fixing", "bug"],
	["-", "ticket_submitted", "-", "-", "-", "-", "-", "bug", "agent_fixing", "bug"],
	["-", "-", "agent_fixing", "-", "-", "-", "agent_fixing", "ticket_drafting", "agent_fixing", "bug"],
	["-", "-", "-", "agent_fixing", "agent_fixing", "-", "deploying", "ticket_submitted", "agent_fixing", "bug"],
	["-", "-", "-", "-", "-", "deploying", "live", "agent_fixing", "agent_fixing", "bug"],
	["-", "-", "-", "-", "-", "-", "-", "deploying", "agent_fixing", "bug"],
] satisfies (SimStep | "-")[][];

describe("simulation transition table", () => {
	states.forEach((state, row) => {
		events.forEach((event, column) => {
			it(`${state.step} × ${event.type}`, () => {
				const before = structuredClone(state);
				const next = transition(Object.freeze(state), Object.freeze(event));
				const step = expectedSteps[row][column];
				if (step === "-") {
					expect(next).toBe(state);
				} else {
					const expected = states.find((entry) => entry.step === step)!;
					const result = event.type === "fix_progressed" ? { ...expected, progress: 0.5 }
						: event.type === "fix_completed" ? { ...expected, progress: 1 }
						: event.type === "deploy_finished" ? { ...expected, finished: true } : expected;
					expect(next).toEqual(result);
				}
				expect(state).toEqual(before);
			});
		});

		it(`${state.step} ignores an unknown event`, () => {
			expect(transition(state, { type: "unknown" } as unknown as SimEvent)).toBe(state);
		});

		it.each(states)(`${state.step} can skip to $step`, (target) => {
			expect(transition(state, { type: "step_selected", step: target.step, ticketId })).toEqual(target);
		});
	});

	it("starts at the defect and requires submission before normal progression", () => {
		expect(initialState).toEqual({ step: "bug" });
		const draft = transition(initialState, { type: "ticket_opened" });
		expect(transition(draft, { type: "next_requested" })).toBe(draft);
	});

	it("carries the submitted local ticket id through the entire pipeline", () => {
		let state = transition({ step: "ticket_drafting" }, { type: "ticket_submitted", ticketId: "visitor-demo" });
		for (const event of ["agent_assigned", "fix_completed", "next_requested", "deploy_finished", "next_requested"] as const) {
			state = transition(state, { type: event });
			expect(state).toHaveProperty("ticketId", "visitor-demo");
		}
		expect(state.step).toBe("live");
	});

	it.each([-1, 1.1, NaN, Infinity, -Infinity, 0.25, 0.5])("ignores invalid or non-increasing fix progress %s", (progress) => {
		const state: SimState = { step: "agent_fixing", ticketId, progress: 0.5 };
		expect(transition(state, { type: "fix_progressed", progress })).toBe(state);
	});

	it("keeps the site broken until deploy finishes, even at full fix progress", () => {
		const fixed = transition({ step: "agent_fixing", ticketId, progress: 0 }, { type: "fix_progressed", progress: 1 });
		expect(fixed).toEqual({ step: "agent_fixing", ticketId, progress: 1 });
		expect(transition(fixed, { type: "fix_completed" })).toEqual(fixed);
		const deploying = transition(fixed, { type: "next_requested" });
		expect(deploying).toEqual({ step: "deploying", ticketId, finished: false });
		const ready = transition(deploying, { type: "deploy_finished" });
		expect(ready).toEqual({ step: "deploying", ticketId, finished: true });
		expect(transition(ready, { type: "next_requested" })).toEqual({ step: "live", ticketId });
	});
});
