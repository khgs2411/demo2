import { webcrypto } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearBookingRedirect, restoreBookingRedirect, saveBookingRedirect, saveBookingAuthRedirect, bookingRedirectKey } from "./redirect";
import { initialState, transition, type BookingState } from "./machine";

const selection = { packageId: "system", addonInterests: ["agent-voice"], slotId: "slot-1" } as const;
const slotState: BookingState = {
	step: "choosing_slot", selection, userId: "visitor", slots: [], availability: "loading", notice: null,
};
beforeEach(() => { vi.restoreAllMocks(); sessionStorage.clear(); vi.stubGlobal("crypto", webcrypto); });
afterEach(() => vi.unstubAllGlobals());

describe("booking OAuth redirect persistence", () => {
	it("restores the package, add-ons and selected slot for the same authenticated visitor", async () => {
		expect(saveBookingRedirect(slotState)).toBe(true);
		const restored = await restoreBookingRedirect("visitor");
		expect(restored).not.toBeNull();
		expect(transition(initialState, restored!)).toEqual(slotState);
		const slot = { id: "slot-1", startsAt: "2026-11-10T09:00:00Z", canRegister: true, canCancelRegistration: false, userRegistrationState: null };
		expect(transition(transition(initialState, restored!), { type: "slots_loaded", slots: [slot] }))
			.toEqual({ ...slotState, slots: [slot], availability: "ready" });
		expect(await restoreBookingRedirect("visitor")).toBeNull();
	});

	it("requires a profile after initial account auth or when the OAuth user changed", async () => {
		saveBookingRedirect({ step: "needs_account", selection });
		const firstAuth = (await restoreBookingRedirect("visitor"))!;
		expect(transition(initialState, firstAuth)).toEqual({ step: "completing_profile", selection, userId: "visitor" });
		saveBookingRedirect(slotState);
		expect(transition(initialState, (await restoreBookingRedirect("other-visitor"))!)).toEqual({
			step: "completing_profile", selection, userId: "other-visitor",
		});
	});

	it("never restores a submitting mutation and revalidates the saved slot against fresh data", async () => {
		saveBookingRedirect({ ...slotState, step: "submitting", userId: "visitor" });
		const restored = transition(initialState, (await restoreBookingRedirect("visitor"))!);
		expect(restored.step).toBe("choosing_slot");
		expect(transition(restored, { type: "submit_requested" })).toBe(restored);
		expect(transition(restored, { type: "slots_loaded", slots: [] })).toEqual({ ...slotState, selection: { ...selection, slotId: null }, availability: "ready" });
	});

	it("saves only the booking intent and the identity whose profile was completed", async () => {
		saveBookingRedirect(slotState);
		expect(JSON.parse(sessionStorage.getItem(bookingRedirectKey)!)).toEqual({ selection, profileUserId: "visitor" });
		clearBookingRedirect();
		expect(await restoreBookingRedirect("visitor")).toBeNull();
		expect(saveBookingRedirect(initialState)).toBe(false);
		expect(saveBookingRedirect({ step: "requested", selection, userId: "visitor", registration: { id: "request-1", classId: "slot-1", status: "pending" } })).toBe(false);
	});

	it.each([
		"not-json", "null", "[]", "{}",
		JSON.stringify({ selection: { ...selection, packageId: "agent-voice" }, profileUserId: null }),
		JSON.stringify({ selection: { ...selection, addonInterests: ["system"] }, profileUserId: null }),
		JSON.stringify({ selection: { ...selection, slotId: 42 }, profileUserId: null }),
		JSON.stringify({ selection, profileUserId: 42 }),
	])("rejects malformed persisted intent: %s", async (saved) => {
		sessionStorage.setItem(bookingRedirectKey, saved);
		expect(await restoreBookingRedirect("visitor")).toBeNull();
		expect(sessionStorage.getItem(bookingRedirectKey)).toBeNull();
	});

	it("handles denied storage access and failed reads, writes and removal", async () => {
		vi.spyOn(Storage.prototype, "setItem").mockImplementationOnce(() => { throw new Error("denied"); });
		expect(saveBookingRedirect(slotState)).toBe(false);
		vi.spyOn(Storage.prototype, "getItem").mockImplementationOnce(() => { throw new Error("denied"); });
		expect(await restoreBookingRedirect("visitor")).toBeNull();
		vi.spyOn(Storage.prototype, "removeItem").mockImplementationOnce(() => { throw new Error("denied"); });
		expect(() => clearBookingRedirect()).not.toThrow();
		vi.spyOn(window, "sessionStorage", "get").mockImplementation(() => { throw new Error("denied"); });
		expect(saveBookingRedirect(slotState)).toBe(false);
		expect(await restoreBookingRedirect("visitor")).toBeNull();
	});
});

it("preserves the selected signup time across Google sign-in even when it is in another week", async () => {
	const slot = { id: "slot-1", startsAt: "2026-12-08T09:00:00Z", canRegister: true, canCancelRegistration: false, userRegistrationState: null };
	expect(saveBookingRedirect({ step: "signing_in", selection, email: "dana@example.com", signupSlot: slot })).toBe(true);
	expect(JSON.parse(sessionStorage.getItem(bookingRedirectKey)!)).toEqual({
		selection, profileUserId: null, slotStartsAt: slot.startsAt,
	});
	expect(await restoreBookingRedirect("visitor")).toMatchObject({ selection, slotStartsAt: slot.startsAt });
	expect(await restoreBookingRedirect("visitor")).toBeNull();
});

it("restores an issued receipt only for the matching email and keeps credentials out of the redirect", async () => {
	const slot = { id: "slot-1", startsAt: "2026-12-08T09:00:00Z", canRegister: true, canCancelRegistration: false, userRegistrationState: null };
	const continuation = { kind: "show_request", slot, registration: { id: "r", classId: "slot-1", status: "pending" } } as const;
	const account = { step: "signing_in_for_signup", selection, email: "dana@example.com", continuation } as const;
	expect(await saveBookingAuthRedirect(account)).toBe(true);
	expect(JSON.parse(sessionStorage.getItem(bookingRedirectKey)!).continuation).toEqual({
		emailHash: "07e2f1394b0ea80e2adca010ea8318df697001a005ba7452720edda4b0ce57b3", next: continuation,
	});
	expect(await restoreBookingRedirect("visitor", "other@example.com")).not.toHaveProperty("continuation");
	expect(await saveBookingAuthRedirect(account)).toBe(true);
	const restored = await restoreBookingRedirect("visitor", "DANA@example.com");
	expect(restored).toMatchObject({ continuation, slotStartsAt: slot.startsAt });
	expect(transition(initialState, restored!)).toMatchObject({ step: "requested", registration: continuation.registration });
	expect(await restoreBookingRedirect("visitor", "dana@example.com")).toBeNull();
});

it("persists the account-exists continuation without the signup name or phone", async () => {
	const slot = { id: "slot-1", startsAt: "2026-12-08T09:00:00Z", canRegister: true, canCancelRegistration: false, userRegistrationState: null };
	const contact = { displayName: "Draft name", phoneNumber: "0501234567" };
	expect(await saveBookingAuthRedirect({
		step: "signing_in_for_signup", selection, email: "dana@example.com", continuation: { kind: "book", slot, contact },
	})).toBe(true);
	const saved = sessionStorage.getItem(bookingRedirectKey)!;
	expect(saved).not.toContain(contact.displayName);
	expect(saved).not.toContain(contact.phoneNumber);
	expect(JSON.parse(saved).continuation.next).toEqual({ kind: "book", slot });
	const restored = await restoreBookingRedirect("visitor", "dana@example.com");
	expect(restored?.continuation).toEqual({ kind: "book", slot });
});

it("returns a Promise even when there is no stored redirect", async () => {
	const result = restoreBookingRedirect("visitor");
	expect(result).toBeInstanceOf(Promise);
	expect(await result).toBeNull();
});
