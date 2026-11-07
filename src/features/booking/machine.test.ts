import { describe, expect, it } from "vitest";
import { initialState, transition, type BookingEvent, type BookingState } from "./machine";

const selection = { packageId: "system", addonInterests: ["agent-voice"], slotId: null } as const;
const chosen = { type: "package_chosen", packageId: "system", addonInterests: ["agent-voice"] } as const;
const account: BookingState = { step: "needs_account", selection };
const profile: BookingState = { step: "completing_profile", selection, userId: "visitor" };

describe("booking account and profile flow", () => {
	it("requires package confirmation before account entry", () => {
		expect(initialState).toEqual({ step: "choosing_package" });
		expect(transition(initialState, chosen)).toEqual(account);
		expect(transition(initialState, { type: "signed_in", userId: "visitor" })).toBe(initialState);
	});

	it.each(["sign_in", "sign_up", "google"] as const)("completes %s through the profile step", (method) => {
		const signing = transition(account, { type: "auth_started", method });
		expect(signing).toEqual({ ...account, step: method === "sign_up" ? "signing_up" : "signing_in" });
		expect(transition(signing, { type: "signed_in", userId: "visitor" })).toEqual(profile);
	});

	it("lets an already authenticated visitor proceed after choosing a package", () => {
		expect(transition(account, { type: "signed_in", userId: "visitor" })).toEqual(profile);
	});

	it("waits for a successful profile save before loading slots", () => {
		expect(transition(profile, { type: "profile_saved" })).toEqual({
			step: "choosing_slot", selection, userId: "visitor", slots: [], availability: "loading", notice: null,
		});
	});

	it.each([account, { ...account, step: "signing_up" }, { ...account, step: "signing_in" }, profile] satisfies BookingState[])("recovers $step without replaying an effect", (state) => {
		const operation = state.step === "completing_profile" ? "profile" : "auth";
		const failed = transition(state, { type: "operation_failed", operation, reason: "generic" });
		expect(failed.step).toBe("failed");
		expect(transition(failed, { type: "retry_requested" })).toEqual(state.step.startsWith("signing_") ? account : state);
	});

	it.each([initialState, account, profile])("restarts $step and ignores unknown or unrelated results", (state) => {
		expect(transition(state, { type: "restarted" })).toEqual(initialState);
		expect(transition(state, { type: "unknown" } as unknown as BookingEvent)).toBe(state);
		expect(transition(state, { type: "retry_requested" })).toBe(state);
	});
});
