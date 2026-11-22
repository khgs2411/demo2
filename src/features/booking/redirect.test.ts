import { beforeEach, describe, expect, it, vi } from "vitest";
import { clearBookingRedirect, restoreBookingRedirect, saveBookingRedirect, bookingRedirectKey } from "./redirect";
import { initialState, transition, type BookingState } from "./machine";

const selection = { packageId: "system", addonInterests: ["agent-voice"], slotId: "slot-1" } as const;
const slotState: BookingState = {
	step: "choosing_slot", selection, userId: "visitor", slots: [], availability: "loading", notice: null,
};
beforeEach(() => { sessionStorage.clear(); vi.restoreAllMocks(); });

describe("booking OAuth redirect persistence", () => {
	it("restores the package, add-ons and selected slot for the same authenticated visitor", () => {
		expect(saveBookingRedirect(slotState)).toBe(true);
		const restored = restoreBookingRedirect("visitor");
		expect(restored).not.toBeNull();
		expect(transition(initialState, restored!)).toEqual(slotState);
		const slot = { id: "slot-1", startsAt: "2026-11-10T09:00:00Z", canRegister: true, canCancelRegistration: false, userRegistrationState: null };
		expect(transition(transition(initialState, restored!), { type: "slots_loaded", slots: [slot] }))
			.toEqual({ ...slotState, slots: [slot], availability: "ready" });
		expect(restoreBookingRedirect("visitor")).toBeNull();
	});

	it("requires a profile after initial account auth or when the OAuth user changed", () => {
		saveBookingRedirect({ step: "needs_account", selection });
		const firstAuth = restoreBookingRedirect("visitor")!;
		expect(transition(initialState, firstAuth)).toEqual({ step: "completing_profile", selection, userId: "visitor" });
		saveBookingRedirect(slotState);
		expect(transition(initialState, restoreBookingRedirect("other-visitor")!)).toEqual({
			step: "completing_profile", selection, userId: "other-visitor",
		});
	});

	it("never restores a submitting mutation and revalidates the saved slot against fresh data", () => {
		saveBookingRedirect({ ...slotState, step: "submitting", userId: "visitor" });
		const restored = transition(initialState, restoreBookingRedirect("visitor")!);
		expect(restored.step).toBe("choosing_slot");
		expect(transition(restored, { type: "submit_requested" })).toBe(restored);
		expect(transition(restored, { type: "slots_loaded", slots: [] })).toEqual({ ...slotState, selection: { ...selection, slotId: null }, availability: "ready" });
	});

	it("saves only the booking intent and the identity whose profile was completed", () => {
		saveBookingRedirect(slotState);
		expect(JSON.parse(sessionStorage.getItem(bookingRedirectKey)!)).toEqual({ selection, profileUserId: "visitor" });
		clearBookingRedirect();
		expect(restoreBookingRedirect("visitor")).toBeNull();
		expect(saveBookingRedirect(initialState)).toBe(false);
		expect(saveBookingRedirect({ step: "requested", selection, userId: "visitor", registration: { id: "request-1", classId: "slot-1", status: "pending" } })).toBe(false);
	});

	it.each([
		"not-json", "null", "[]", "{}",
		JSON.stringify({ selection: { ...selection, packageId: "agent-voice" }, profileUserId: null }),
		JSON.stringify({ selection: { ...selection, addonInterests: ["system"] }, profileUserId: null }),
		JSON.stringify({ selection: { ...selection, slotId: 42 }, profileUserId: null }),
		JSON.stringify({ selection, profileUserId: 42 }),
	])("rejects malformed persisted intent: %s", (saved) => {
		sessionStorage.setItem(bookingRedirectKey, saved);
		expect(restoreBookingRedirect("visitor")).toBeNull();
		expect(sessionStorage.getItem(bookingRedirectKey)).toBeNull();
	});

	it("handles denied storage access and failed reads, writes and removal", () => {
		vi.spyOn(Storage.prototype, "setItem").mockImplementationOnce(() => { throw new Error("denied"); });
		expect(saveBookingRedirect(slotState)).toBe(false);
		vi.spyOn(Storage.prototype, "getItem").mockImplementationOnce(() => { throw new Error("denied"); });
		expect(restoreBookingRedirect("visitor")).toBeNull();
		vi.spyOn(Storage.prototype, "removeItem").mockImplementationOnce(() => { throw new Error("denied"); });
		expect(() => clearBookingRedirect()).not.toThrow();
		vi.spyOn(window, "sessionStorage", "get").mockImplementation(() => { throw new Error("denied"); });
		expect(saveBookingRedirect(slotState)).toBe(false);
		expect(restoreBookingRedirect("visitor")).toBeNull();
	});
});
