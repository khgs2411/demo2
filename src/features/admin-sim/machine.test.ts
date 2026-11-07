import { describe, expect, it } from "vitest";
import { initialState, transition } from "./machine";
import type { SimEvent, SimState, SimStep } from "./machine";

const ticketId = "demo-ticket";
const states: SimState[] = [
	{ step: "bug" },
	{ step: "ticket_drafting" },
	{ step: "ticket_submitted", ticketId },
	{ step: "agent_triaging", ticketId },
	{ step: "agent_fixing", ticketId, progress: 0 },
	{ step: "deploying", ticketId },
	{ step: "live", ticketId },
];
const events: SimEvent[] = [
	{ type: "ticket_opened" },
	{ type: "ticket_submitted", ticketId },
	{ type: "agent_assigned" },
	{ type: "fix_started" },
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
	["ticket_drafting", "-", "-", "-", "-", "-", "-", "ticket_drafting", "-", "agent_fixing", "bug"],
	["-", "ticket_submitted", "-", "-", "-", "-", "-", "-", "bug", "agent_fixing", "bug"],
	["-", "-", "agent_triaging", "-", "-", "-", "-", "agent_triaging", "ticket_drafting", "agent_fixing", "bug"],
	["-", "-", "-", "agent_fixing", "-", "-", "-", "agent_fixing", "ticket_submitted", "agent_fixing", "bug"],
	["-", "-", "-", "-", "agent_fixing", "deploying", "-", "deploying", "agent_triaging", "agent_fixing", "bug"],
	["-", "-", "-", "-", "-", "-", "live", "live", "agent_fixing", "agent_fixing", "bug"],
	["-", "-", "-", "-", "-", "-", "-", "-", "deploying", "agent_fixing", "bug"],
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
					expect(next).toEqual(event.type === "fix_progressed" ? { ...expected, progress: 0.5 } : expected);
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
		for (const event of ["agent_assigned", "fix_started", "fix_completed", "deploy_finished"] as const) {
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
		const deploying = transition(fixed, { type: "fix_completed" });
		expect(deploying).toEqual({ step: "deploying", ticketId });
		expect(transition(deploying, { type: "deploy_finished" })).toEqual({ step: "live", ticketId });
	});
});
