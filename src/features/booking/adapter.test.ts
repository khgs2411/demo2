import { beforeEach, describe, expect, it, vi } from "vitest";
import { createBookingAdapter, type BookingSdk } from "./adapter";

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
	};
}
const sdk = mockSdk();
const refresh = vi.fn<() => Promise<void>>().mockResolvedValue();
const adapter = createBookingAdapter(sdk, refresh);
const selection = { packageId: "system", addonInterests: ["agent-voice"], slotId: null } as const;
const profile = { displayName: "Test Visitor", phoneNumber: "+972500000000", businessName: "Test Business", websiteUrl: "https://example.com" };

beforeEach(() => { vi.clearAllMocks(); });

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
