import { describe, expect, it } from "vitest";
import { forgotTransition, initialForgotState, initialResetState, passwordProblem, resetTransition } from "./machine";

describe("forgot password machine", () => {
	it("sends once and lands on the neutral sent state", () => {
		const sending = forgotTransition(initialForgotState, { type: "send_started" });
		expect(sending).toEqual({ step: "sending" });
		expect(forgotTransition(sending, { type: "send_started" })).toBe(sending);
		expect(forgotTransition(sending, { type: "send_finished", outcome: "sent" })).toEqual({ step: "sent" });
	});

	it("returns to editing with the refusal as its notice", () => {
		expect(forgotTransition({ step: "sending" }, { type: "send_finished", outcome: "turnstile_failed" }))
			.toEqual({ step: "editing", notice: "turnstile_failed" });
		expect(forgotTransition(initialForgotState, { type: "send_finished", outcome: "sent" })).toBe(initialForgotState);
	});
});

describe("reset password machine", () => {
	it("starts without a link when no token is held", () => {
		expect(initialResetState(null)).toEqual({ step: "no_link" });
		expect(initialResetState("token")).toEqual({ step: "choosing", notice: null });
	});

	it.each([
		["password_reset", { step: "done" }],
		["reset_token_invalid", { step: "link_unusable", reason: "reset_token_invalid" }],
		["bad_request", { step: "link_unusable", reason: "bad_request" }],
		["rate_limited", { step: "choosing", notice: "rate_limited" }],
		["disabled", { step: "choosing", notice: "disabled" }],
		["failed", { step: "choosing", notice: "failed" }],
	] as const)("maps %s", (outcome, next) => {
		expect(resetTransition({ step: "saving" }, { type: "save_finished", outcome })).toEqual(next);
	});

	it("ignores a save outside saving and a rejection outside choosing", () => {
		const done = { step: "done" } as const;
		expect(resetTransition(done, { type: "save_finished", outcome: "failed" })).toBe(done);
		expect(resetTransition(done, { type: "password_rejected", problem: "mismatch" })).toBe(done);
		expect(resetTransition(done, { type: "save_started" })).toBe(done);
	});
});

describe("password bounds", () => {
	it.each([
		["short", "short", "too_short"],
		["😀".repeat(7), "😀".repeat(7), "too_short"],
		["😀".repeat(8), "😀".repeat(8), null],
		["a".repeat(73), "a".repeat(73), "too_long"],
		["ש".repeat(37), "ש".repeat(37), "too_long"],
		["password1", "password2", "mismatch"],
		["a".repeat(72), "a".repeat(72), null],
		["ש".repeat(36), "ש".repeat(36), null],
	])("judges %s", (password, confirmation, problem) => {
		expect(passwordProblem(password, confirmation)).toBe(problem);
	});
});
