import { vi } from "vitest";
import type { useBookingContext } from "./adapter";

export function makeBookingContext() {
	return {
		client: null, productKey: "demo", product: {
			product_key: "demo", name: "Demo", auth_mode: "open", email_password_enabled: true, google_oauth_enabled: true, auth_redirects: [],
		}, productUser: null, productAccess: null,
		capabilities: { permissions: [], dashboard: { can_enter: false, can_manage_classes: false, can_manage_roles: false, can_manage_users: false, can_manage_auth_mode: false, can_read_customers: false, can_read_memberships: false } },
		session: null, loading: false, error: null, refreshProductContext: vi.fn().mockResolvedValue(undefined),
		signIn: vi.fn(), signUp: vi.fn(), signInWithGoogle: vi.fn(), signOut: vi.fn(),
	} satisfies ReturnType<typeof useBookingContext>;
}
