import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { makeBookingContext } from "../features/booking/context-fixture";
import type { useBookingContext } from "../features/booking/adapter";
import { i18n } from "../i18n";
import { Header } from "./header";

let context: ReturnType<typeof useBookingContext>;
vi.mock("@class-kit/react", () => ({ useProductContext: () => context }));

beforeEach(async () => {
	context = makeBookingContext();
	await i18n.changeLanguage("en");
});
afterEach(cleanup);

it("links signed-out visitors to sign in", () => {
	render(<Header />);

	expect(screen.getByRole("link", { name: "Sign in" }).getAttribute("href")).toBe("#/account");
	expect(screen.queryByRole("link", { name: "My account" })).toBeNull();
	expect(screen.queryByRole("link", { name: "Studio" })).toBeNull();
});

it.each([
	{ role: "client", permissions: [], studio: false },
	{ role: "manager", permissions: [], studio: true },
	{ role: "client", permissions: ["registrations.manage"], studio: true },
])("links signed-in visitors to their account with Studio access $studio ($role, $permissions)", ({ role, permissions, studio }) => {
	context.session = {
		access_token: "test", refresh_token: "test", token_type: "bearer", expires_in: 3600,
		user: { id: "visitor", app_metadata: {}, user_metadata: {}, aud: "authenticated", created_at: "2026-11-07" },
	};
	context.productUser = { role, status: "active" };
	context.capabilities.permissions = permissions;
	render(<Header />);

	expect(screen.getByRole("link", { name: "My account" }).getAttribute("href")).toBe("#/account");
	expect(screen.queryByRole("link", { name: "Sign in" })).toBeNull();
	if (studio) expect(screen.getByRole("link", { name: "Studio" }).getAttribute("href")).toBe("#/studio");
	else expect(screen.queryByRole("link", { name: "Studio" })).toBeNull();
});
