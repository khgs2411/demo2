import { beforeEach, describe, expect, it, vi } from "vitest";
import { createBookingAdapter, type BookingSdk } from "./adapter";
import * as packages from "../packages";
import { initialState, transition } from "./machine";

function mockSdk() {
	return {
		auth: {
			signIn: vi.fn<BookingSdk["auth"]["signIn"]>().mockResolvedValue({ error: null }),
			signUp: vi.fn<BookingSdk["auth"]["signUp"]>().mockResolvedValue({ error: null }),
			getSession: vi.fn<BookingSdk["auth"]["getSession"]>().mockResolvedValue({
				access_token: "test", refresh_token: "test", token_type: "bearer", expires_in: 3600,
				user: { id: "visitor", app_metadata: {}, user_metadata: {}, aud: "authenticated", created_at: "2026-11-07" },
			}),
		},
		profile: { update: vi.fn<BookingSdk["profile"]["update"]>() },
		classes: {
			list: vi.fn<BookingSdk["classes"]["list"]>(),
			register: vi.fn<BookingSdk["classes"]["register"]>(),
		},
	};
}
const sdk = mockSdk();
const refresh = vi.fn<() => Promise<void>>().mockResolvedValue();
const adapter = createBookingAdapter(sdk, refresh);
const selection = { packageId: "system", addonInterests: ["agent-voice"], slotId: null } as const;
const profile = { displayName: "Test Visitor", phoneNumber: "+972500000000", businessName: "Test Business", websiteUrl: "https://example.com" };

beforeEach(() => { vi.restoreAllMocks(); vi.clearAllMocks(); });

describe("booking password authentication", () => {
	it.each(["signIn", "signUp"] as const)("refreshes context after %s before reporting the authenticated user", async (method) => {
		refresh.mockImplementationOnce(async () => { expect(sdk.auth[method]).toHaveBeenCalledWith("visitor@example.com", "test-password"); });
		expect(await adapter[method]("visitor@example.com", "test-password")).toEqual({ type: "signed_in", userId: "visitor" });
		expect(refresh).toHaveBeenCalledOnce();
	});

	it.each(["signIn", "signUp"] as const)("reports %s errors without refreshing or pretending to be authenticated", async (method) => {
		sdk.auth[method].mockResolvedValueOnce({ error: "Invalid credentials" });
		expect(await adapter[method]("visitor@example.com", "wrong")).toEqual({ type: "operation_failed", operation: "auth", reason: "generic" });
		expect(refresh).not.toHaveBeenCalled();
	});

	it("does not invent an authenticated user if the SDK has no session", async () => {
		sdk.auth.getSession.mockResolvedValueOnce(null);
		expect(await adapter.signIn("visitor@example.com", "test-password")).toEqual({ type: "unauthenticated" });
	});

	it("maps rejected auth and refresh promises to a recoverable failure", async () => {
		sdk.auth.signIn.mockRejectedValueOnce(new Error("offline"));
		expect(await adapter.signIn("visitor@example.com", "test-password")).toEqual({ type: "operation_failed", operation: "auth", reason: "generic" });
		refresh.mockRejectedValueOnce(new Error("offline"));
		expect(await adapter.signUp("visitor@example.com", "test-password")).toEqual({ type: "operation_failed", operation: "auth", reason: "generic" });
	});
});

describe("booking profile", () => {
	it("saves the contact fields and package/add-on metadata through the customer API", async () => {
		sdk.profile.update.mockResolvedValueOnce({ data: {
			profile: { customer_id: "customer-1", user_id: "visitor", display_name: profile.displayName, contact_email: null, phone_number: profile.phoneNumber },
			product_user: { customer_id: "customer-1", user_id: "visitor", metadata: {} },
		}, error: null });
		expect(await adapter.saveProfile(profile, selection)).toEqual({ type: "profile_saved" });
		expect(sdk.profile.update).toHaveBeenCalledWith({
			displayName: profile.displayName, phoneNumber: profile.phoneNumber,
			metadata: { business_name: profile.businessName, website_url: profile.websiteUrl, package_interest: "system", addon_interests: ["agent-voice"] },
		});
	});

	it.each(["unauthorized", "forbidden", "internal_error"] as const)("maps %s without advancing past the profile step", async (code) => {
		sdk.profile.update.mockResolvedValueOnce({ data: null, error: { code, message: "Backend message" } });
		expect(await adapter.saveProfile(profile, selection)).toEqual(code === "unauthorized"
			? { type: "unauthenticated" } : { type: "operation_failed", operation: "profile", reason: "generic" });
	});

	it("handles an unconfigured SDK as a recoverable failure", async () => {
		expect(await createBookingAdapter(null, refresh).saveProfile(profile, selection)).toEqual({ type: "operation_failed", operation: "profile", reason: "generic" });
	});
});

const range = { start: "2026-11-08", end: "2026-11-14" };
const sdkSlot = {
	id: "slot-1", name: "Business meeting", startsAt: "2026-11-10T09:00:00Z", endsAt: "2026-11-10T10:00:00Z",
	location: null, locationSnapshot: null, capacity: 3, registrationPolicy: "approval_required", temporalStatus: "upcoming",
	registrationOpen: true, canRegister: true, canCancelRegistration: false, userRegistrationState: null,
} as const;
const projectedSlot = {
	id: sdkSlot.id, startsAt: sdkSlot.startsAt, canRegister: true, canCancelRegistration: false, userRegistrationState: null,
};
const registered = {
	registration_id: "request-1", status: "pending", stock_consumed: 0,
	registration: { id: "request-1", class_id: "slot-1", customer_id: "customer-1", user_id: "visitor", status: "pending" },
} as const;

function provideTemplate() {
	const options = packages.getBookingOptions();
	vi.spyOn(packages, "getBookingOptions").mockReturnValue({
		...options, packages: options.packages.map((entry) => ({ ...entry, templateId: `template-${entry.id}` })),
	});
}

describe("booking slot SDK adapter", () => {
	it.each(["site", "system"] as const)("treats the actual null %s template as booking not open without an SDK call", async (packageId) => {
		expect(await adapter.loadSlots(packageId, range)).toEqual({ type: "booking_not_open" });
		expect(sdk.classes.list).not.toHaveBeenCalled();
	});

	it("filters by the package template and preserves backend flags without exposing end times", async () => {
		provideTemplate();
		sdk.classes.list.mockResolvedValueOnce({ data: { classes: [sdkSlot] }, error: null });
		expect(await adapter.loadSlots("system", range)).toEqual({ type: "slots_loaded", slots: [projectedSlot] });
		expect(sdk.classes.list).toHaveBeenCalledWith({ range, filters: { templateId: "template-system" } });
	});

	it.each(["unauthorized", "forbidden", "internal_error"] as const)("maps a %s list response", async (code) => {
		provideTemplate();
		sdk.classes.list.mockResolvedValueOnce({ data: null, error: { code, message: "Backend message" } });
		expect(await adapter.loadSlots("site", range)).toEqual(code === "unauthorized" ? { type: "unauthenticated" }
			: { type: "operation_failed", operation: "slots", reason: "generic" });
	});

	it("maps a rejected list promise", async () => {
		provideTemplate();
		sdk.classes.list.mockRejectedValueOnce(new Error("offline"));
		expect(await adapter.loadSlots("site", range)).toEqual({ type: "operation_failed", operation: "slots", reason: "generic" });
	});

	it("maps successful registration using the backend id and status", async () => {
		sdk.classes.register.mockResolvedValueOnce({ data: registered, error: null });
		expect(await adapter.requestRegistration("slot-1", "system", range)).toEqual([
			{ type: "registration_requested", registration: { id: "request-1", classId: "slot-1", status: "pending" } },
		]);
		expect(sdk.classes.register).toHaveBeenCalledExactlyOnceWith("slot-1");
		expect(sdk.classes.list).not.toHaveBeenCalled();
	});

	it("refreshes the list after the backend capacity race without replaying registration", async () => {
		provideTemplate();
		sdk.classes.register.mockResolvedValueOnce({ data: null, error: { code: "bad_request", message: "class_capacity_full" } });
		sdk.classes.list.mockResolvedValueOnce({ data: { classes: [{ ...sdkSlot, canRegister: false }] }, error: null });
		expect(await adapter.requestRegistration("slot-1", "system", range)).toEqual([
			{ type: "slot_full" }, { type: "slots_loaded", slots: [{ ...projectedSlot, canRegister: false }] },
		]);
		expect(sdk.classes.register).toHaveBeenCalledOnce();
		expect(sdk.classes.list).toHaveBeenCalledExactlyOnceWith({ range, filters: { templateId: "template-system" } });
	});

	it.each(["unauthorized", "conflict", "internal_error"] as const)("maps %s registration errors without replaying", async (code) => {
		sdk.classes.register.mockResolvedValueOnce({ data: null, error: { code, message: "Backend message" } });
		expect(await adapter.requestRegistration("slot-1", "system", range)).toEqual([code === "unauthorized" ? { type: "unauthenticated" }
			: { type: "operation_failed", operation: "registration", reason: "generic" }]);
		expect(sdk.classes.register).toHaveBeenCalledOnce();
		expect(sdk.classes.list).not.toHaveBeenCalled();
	});

	it("keeps a full-slot notice if the follow-up refresh fails", async () => {
		provideTemplate();
		sdk.classes.register.mockResolvedValueOnce({ data: null, error: { code: "bad_request", message: "class_capacity_full" } });
		sdk.classes.list.mockRejectedValueOnce(new Error("offline"));
		expect(await adapter.requestRegistration("slot-1", "system", range)).toEqual([
			{ type: "slot_full" }, { type: "operation_failed", operation: "slots", reason: "generic" },
		]);
	});

	it("runs the package → authenticated profile → requested path through the real machine", async () => {
		provideTemplate();
		sdk.classes.list.mockResolvedValueOnce({ data: { classes: [sdkSlot] }, error: null });
		sdk.classes.register.mockResolvedValueOnce({ data: registered, error: null });
		let state = transition(initialState, { type: "package_chosen", packageId: "system", addonInterests: [] });
		state = transition(state, await adapter.signIn("visitor@example.com", "test-password"));
		state = transition(state, { type: "profile_saved" });
		state = transition(state, await adapter.loadSlots("system", range));
		state = transition(state, { type: "slot_chosen", slotId: "slot-1" });
		state = transition(state, { type: "submit_requested" });
		for (const event of await adapter.requestRegistration("slot-1", "system", range)) state = transition(state, event);
		expect(state).toMatchObject({ step: "requested", registration: { id: "request-1", status: "pending" } });
	});
});
