import { createClassKitClient } from "@class-kit/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createBookingAdapter, type BookingSdk } from "./adapter";
import * as packages from "../packages";
import { initialState, transition } from "./machine";
import { bookingRedirectKey, restoreBookingRedirect, consumeAccountRedirect, saveBookingRedirect } from "./redirect";

vi.mock("@class-kit/react", async importOriginal => ({ ...await importOriginal<typeof import("@class-kit/react")>(), useProductContext: vi.fn() }));

function mockSdk() {
	const transport = createClassKitClient({ supabaseUrl: "http://localhost:54321", supabasePublishableKey: "test-key", authStorageKey: "booking-test", debug: false });
	if (!transport) throw new Error("Test SDK transport could not be created");
	return {
		supabase: transport.supabase, authStorageKey: transport.authStorageKey,
		auth: {
			signIn: vi.fn<BookingSdk["auth"]["signIn"]>().mockResolvedValue({ error: null }),
			signUp: vi.fn<BookingSdk["auth"]["signUp"]>().mockResolvedValue({ error: null }),
			signInWithGoogle: vi.fn<BookingSdk["auth"]["signInWithGoogle"]>().mockResolvedValue({ error: null }),
			signOut: vi.fn<BookingSdk["auth"]["signOut"]>().mockResolvedValue({ error: null }),
			getSession: vi.fn<BookingSdk["auth"]["getSession"]>().mockResolvedValue({
				access_token: "test", refresh_token: "test", token_type: "bearer", expires_in: 3600,
				user: { id: "visitor", app_metadata: {}, user_metadata: {}, aud: "authenticated", created_at: "2026-11-07" },
			}),
		},
		profile: { get: vi.fn<BookingSdk["profile"]["get"]>(), update: vi.fn<BookingSdk["profile"]["update"]>() },
		classes: {
			listMyRegistrations: vi.fn<BookingSdk["classes"]["listMyRegistrations"]>(),
			list: vi.fn<BookingSdk["classes"]["list"]>(),
			register: vi.fn<BookingSdk["classes"]["register"]>(),
			registerWithSignup: vi.fn<BookingSdk["classes"]["registerWithSignup"]>(),
			cancelRegistration: vi.fn<BookingSdk["classes"]["cancelRegistration"]>(),
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

	it("allows an omitted website and maps a rejected profile update", async () => {
		sdk.profile.update.mockRejectedValueOnce(new Error("offline"));
		const { websiteUrl, ...withoutWebsite } = profile;
		expect(await adapter.saveProfile(withoutWebsite, selection)).toEqual({ type: "operation_failed", operation: "profile", reason: "generic" });
		expect(sdk.profile.update).toHaveBeenCalledWith(expect.objectContaining({ metadata: expect.objectContaining({ website_url: null }) }));
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

function withoutTemplates() {
	const options = packages.getBookingOptions();
	vi.spyOn(packages, "getBookingOptions").mockReturnValue({
		...options, packages: options.packages.map((entry) => ({ ...entry, templateId: null })),
	});
}

function provideTemplate() {
	const options = packages.getBookingOptions();
	vi.spyOn(packages, "getBookingOptions").mockReturnValue({
		...options, packages: options.packages.map((entry) => ({ ...entry, templateId: `template-${entry.id}` })),
	});
}

describe("booking slot SDK adapter", () => {
	it.each(["site", "system"] as const)("treats a null %s template as booking not open without an SDK call", async (packageId) => {
		withoutTemplates();
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

	it("preserves an approved backend result instead of assuming a pending status", async () => {
		sdk.classes.register.mockResolvedValueOnce({ data: { ...registered, status: "approved", registration: { ...registered.registration, status: "approved" } }, error: null });
		expect(await adapter.requestRegistration("slot-1", "system", range)).toEqual([
			{ type: "registration_requested", registration: { id: "request-1", classId: "slot-1", status: "approved" } },
		]);
	});

	it("maps rejected registration promises without replay", async () => {
		sdk.classes.register.mockRejectedValueOnce(new Error("offline"));
		expect(await adapter.requestRegistration("slot-1", "system", range)).toEqual([{ type: "operation_failed", operation: "registration", reason: "generic" }]);
		expect(sdk.classes.register).toHaveBeenCalledOnce();
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
		sdk.profile.update.mockResolvedValueOnce({ data: {
			profile: { customer_id: "customer-1", user_id: "visitor", display_name: profile.displayName, contact_email: null, phone_number: profile.phoneNumber },
			product_user: { customer_id: "customer-1", user_id: "visitor", metadata: {} },
		}, error: null });
		sdk.classes.list.mockResolvedValueOnce({ data: { classes: [sdkSlot] }, error: null });
		sdk.classes.register.mockResolvedValueOnce({ data: registered, error: null });
		let state = transition(initialState, { type: "package_chosen", packageId: "system", addonInterests: [] });
		state = transition(state, await adapter.signIn("visitor@example.com", "test-password"));
		state = transition(state, await adapter.saveProfile(profile, selection));
		state = transition(state, await adapter.loadSlots("system", range));
		state = transition(state, { type: "slot_chosen", slotId: "slot-1" });
		state = transition(state, { type: "submit_requested" });
		for (const event of await adapter.requestRegistration("slot-1", "system", range)) state = transition(state, event);
		expect(state).toMatchObject({ step: "requested", registration: { id: "request-1", status: "pending" } });
	});
});

describe("booking Google redirect", () => {
	beforeEach(() => { sessionStorage.clear(); });

	it("persists the choice before the SDK can redirect and leaves session/context loading to ProductProvider", async () => {
		const state = transition(initialState, { type: "package_chosen", packageId: "system", addonInterests: ["agent-voice"] });
		sdk.auth.signInWithGoogle.mockImplementationOnce(async () => {
			expect(JSON.parse(sessionStorage.getItem(bookingRedirectKey)!)).toMatchObject({ selection: { packageId: "system", addonInterests: ["agent-voice"] } });
			return { error: null };
		});
		expect(await adapter.signInWithGoogle(state)).toEqual({ type: "auth_redirect_started" });
		expect(sdk.auth.signInWithGoogle).toHaveBeenCalledOnce();
		expect(refresh).not.toHaveBeenCalled();
		expect(sdk.auth.getSession).not.toHaveBeenCalled();
		expect(restoreBookingRedirect("visitor")).toMatchObject({ type: "redirect_restored", selection: { packageId: "system" } });
	});

	it("clears saved intent when Google fails before redirecting", async () => {
		const state = transition(initialState, { type: "package_chosen", packageId: "site", addonInterests: [] });
		sdk.auth.signInWithGoogle.mockResolvedValueOnce({ error: "Google redirect is not configured" });
		expect(await adapter.signInWithGoogle(state)).toEqual({ type: "operation_failed", operation: "auth", reason: "generic" });
		expect(restoreBookingRedirect("visitor")).toBeNull();
	});

	it("blocks OAuth if session storage cannot preserve the choice", async () => {
		const state = transition(initialState, { type: "package_chosen", packageId: "system", addonInterests: [] });
		vi.spyOn(Storage.prototype, "setItem").mockImplementationOnce(() => { throw new Error("storage denied"); });
		expect(await adapter.signInWithGoogle(state)).toEqual({ type: "operation_failed", operation: "auth", reason: "redirect_storage" });
		expect(sdk.auth.signInWithGoogle).not.toHaveBeenCalled();
	});

	it("clears saved intent on a thrown OAuth error", async () => {
		const state = transition(initialState, { type: "package_chosen", packageId: "site", addonInterests: [] });
		sdk.auth.signInWithGoogle.mockRejectedValueOnce(new Error("offline"));
		expect(await adapter.signInWithGoogle(state)).toEqual({ type: "operation_failed", operation: "auth", reason: "generic" });
		expect(restoreBookingRedirect("visitor")).toBeNull();
	});
});

describe("my meeting requests", () => {
	it.each(["pending", "approved", "rejected", "cancelled"] as const)("projects a backend %s registration history row", async status => {
		sdk.classes.listMyRegistrations.mockResolvedValueOnce({ data: { registrations: [{ id: "request-1", classId: sdkSlot.id, status, createdAt: "2026-11-01T00:00:00Z", approvedAt: null, rejectedAt: null, cancelledAt: null, canCancel: status === "pending", class: { id: sdkSlot.id, name: sdkSlot.name, startsAt: sdkSlot.startsAt, endsAt: sdkSlot.endsAt, lifecycleStatus: "created", templateId: null } }] }, error: null });
		expect(await adapter.listRequests(range)).toEqual({ type: "loaded", requests: [{ ...projectedSlot, canRegister: false, name: sdkSlot.name, userRegistrationState: { id: "request-1", status }, canCancelRegistration: status === "pending" }] });
		expect(sdk.classes.listMyRegistrations).toHaveBeenCalledWith({ range });
	});
	it("refreshes after successful cancellation, with one mutation", async () => {
		sdk.classes.cancelRegistration.mockResolvedValueOnce({ data: { ...registered, status: "cancelled" }, error: null });
		sdk.classes.listMyRegistrations.mockResolvedValueOnce({ data: { registrations: [] }, error: null });
		expect(await adapter.cancelRequest("request-1", range)).toEqual([{ type:"cancel_completed", registration:{ id:"request-1", classId:"slot-1", status:"cancelled" } }, { type: "loaded", requests: [] }]);
		expect(sdk.classes.cancelRegistration).toHaveBeenCalledExactlyOnceWith("request-1");
	});
	it("refreshes on a cancellation race without replaying it", async () => {
		sdk.classes.cancelRegistration.mockResolvedValueOnce({ data: null, error: { code: "bad_request", message: "Cancellation is closed for this class." } });
		sdk.classes.listMyRegistrations.mockResolvedValueOnce({ data: { registrations: [] }, error: null });
		expect(await adapter.cancelRequest("request-1", range)).toEqual([{ type: "cancel_failed" }, { type: "loaded", requests: [] }]);
		expect(sdk.classes.cancelRegistration).toHaveBeenCalledOnce();
	});
	it("handles expired sessions and generic reads", async () => {
		sdk.classes.listMyRegistrations.mockResolvedValueOnce({ data: null, error: { code: "unauthorized", message: "Expired" } });
		expect(await adapter.listRequests(range)).toEqual({ type: "signed_out" });
		sdk.classes.listMyRegistrations.mockRejectedValueOnce(new Error("offline"));
		expect(await adapter.listRequests(range)).toEqual({ type: "failed" });
	});
});

it("returns account OAuth to the account route and clears any older booking redirect", async () => {
	saveBookingRedirect({step:"needs_account",selection});
	expect(await adapter.signInWithGoogle()).toEqual({type:"auth_redirect_started"});
	expect(restoreBookingRedirect("visitor")).toBeNull();
	expect(consumeAccountRedirect()).toBe(true);
	expect(consumeAccountRedirect()).toBe(false);
});
it("maps sign-out errors without claiming the session ended", async () => {
	expect(await adapter.signOut()).toBe(true);
	sdk.auth.signOut.mockResolvedValueOnce({error:"offline"});
	expect(await adapter.signOut()).toBe(false);
	sdk.auth.signOut.mockRejectedValueOnce(new Error("offline"));
	expect(await adapter.signOut()).toBe(false);
});
it("refreshes after a thrown cancellation error with no automatic retry", async () => {
	sdk.classes.cancelRegistration.mockRejectedValueOnce(new Error("offline"));
	sdk.classes.listMyRegistrations.mockResolvedValueOnce({data:{registrations:[]},error:null});
	expect(await adapter.cancelRequest("request-1",range)).toEqual([{type:"cancel_failed"},{type:"loaded",requests:[]}]);
	expect(sdk.classes.cancelRegistration).toHaveBeenCalledOnce();
});

describe("booking signup SDK adapter", () => {
	const terms = { title: "Studio terms", text: "Published text", version: 8, locale: "he" };
	const draft = { email: "dana@example.com", displayName: "Dana", phone: "+972501234567" };
	const issued = { password: "abCDefGhIjKlmNop", formatPassword: () => "abCD efGh IjKl mNop" };
	const credentials = { password: issued.password, formatted: issued.formatPassword() };

	it("freshly loads the published document and returns its actual locale and version", async () => {
		const getSession = vi.spyOn(sdk.supabase.auth, "getSession").mockResolvedValue({ data: { session: null }, error: null });
		const functions = sdk.supabase.functions;
		vi.spyOn(sdk.supabase, "functions", "get").mockReturnValue(functions);
		const invoke = vi.spyOn(functions, "invoke");
		invoke.mockResolvedValueOnce({ data: { data: { document: { title: terms.title, content_markdown: terms.text, version: 7, locale: "he" } }, error: null }, error: null });
		invoke.mockResolvedValueOnce({ data: { data: { document: { title: terms.title, content_markdown: terms.text, version: 8, locale: "he" } }, error: null }, error: null });
		expect(await adapter.loadTerms("he")).toEqual({ type: "terms_loaded", terms: { ...terms, version: 7 } });
		expect(await adapter.loadTerms("he")).toEqual({ type: "terms_loaded", terms });
		expect(invoke).toHaveBeenCalledTimes(2);
		expect(invoke).toHaveBeenLastCalledWith("class-kit-product-documents", expect.objectContaining({
			body: { action: "get", document_type: "terms_of_service", locale: "he", fallback_locale: "en" },
		}));
		getSession.mockRestore();
	});

	it("sends the shown publication and maps the SDK receipt and formatted password", async () => {
		sdk.auth.getSession.mockResolvedValueOnce(null);
		sdk.classes.registerWithSignup.mockResolvedValueOnce({ status: "registered", ...issued, registration: registered.registration });
		expect(await adapter.requestWithSignup("slot-1", draft, terms)).toEqual({
			type: "signup_registered", userId: "visitor", registration: { id: "request-1", classId: "slot-1", status: "pending" }, credentials,
		});
		expect(sdk.classes.registerWithSignup).toHaveBeenCalledExactlyOnceWith({
			classId: "slot-1", ...draft, termsVersion: 8, termsLocale: "he",
		});
	});

	it("distinguishes unavailable classes with and without a new account", async () => {
		sdk.auth.getSession.mockResolvedValueOnce(null);
		sdk.classes.registerWithSignup.mockResolvedValueOnce({ status: "class_unavailable" });
		sdk.auth.getSession.mockResolvedValueOnce(null);
		sdk.classes.registerWithSignup.mockResolvedValueOnce({ status: "class_unavailable", ...issued });
		expect(await adapter.requestWithSignup("slot-1", draft, terms)).toEqual({ type: "class_unavailable" });
		expect(await adapter.requestWithSignup("slot-1", draft, terms)).toEqual({ type: "class_unavailable", userId: "visitor", credentials });
	});

	it("preserves the new credentials and confirmed registration if automatic sign-in fails", async () => {
		sdk.auth.getSession.mockResolvedValueOnce(null);
		sdk.classes.registerWithSignup.mockResolvedValueOnce({ status: "sign_in_failed", ...issued, registration: registered.registration });
		expect(await adapter.requestWithSignup("slot-1", draft, terms)).toEqual({
			type: "sign_in_failed", email: draft.email, credentials, registration: { id: "request-1", classId: "slot-1", status: "pending" },
		});
	});
	it("keeps the current account when a session starts while the guest form is open", async () => {
		expect(await adapter.requestWithSignup("slot-1", draft, terms)).toEqual({ type: "signed_in", userId: "visitor" });
		expect(sdk.classes.registerWithSignup).not.toHaveBeenCalled();
	});

	it("preserves the receipt and password when registration succeeded but no session was established", async () => {
		sdk.auth.getSession.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
		sdk.classes.registerWithSignup.mockResolvedValueOnce({ status: "registered", ...issued, registration: registered.registration });
		expect(await adapter.requestWithSignup("slot-1", draft, terms)).toEqual({
			type: "sign_in_failed", email: draft.email, credentials, registration: { id: "request-1", classId: "slot-1", status: "pending" },
		});
	});
});
