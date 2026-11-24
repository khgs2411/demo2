import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { makeBookingContext } from "../features/booking/context-fixture";
import type { useBookingContext } from "../features/booking/adapter";
import { i18n } from "../i18n";
import { Header } from "./header";

let context: ReturnType<typeof useBookingContext>;
vi.mock("@class-kit/react", () => ({ useProductContext: () => context }));

const session: NonNullable<typeof context.session> = {
	access_token: "test", refresh_token: "test", token_type: "bearer", expires_in: 3600,
	user: { id: "visitor", app_metadata: {}, user_metadata: {}, aud: "authenticated", created_at: "2026-11-07" },
};

beforeEach(async () => {
	context = makeBookingContext();
	await i18n.changeLanguage("en");
});
afterEach(cleanup);

it.each([false, true])("hides account links while loading (session present: %s)", sessionPresent => {
	context.loading = true;
	context.session = sessionPresent ? session : null;
	render(<Header />);

	expect(screen.queryByRole("link", { name: "Sign in" })).toBeNull();
	expect(screen.queryByRole("link", { name: "My account" })).toBeNull();
});

it("links signed-out visitors to sign in", () => {
	render(<Header />);

	expect(screen.getByRole("link", { name: "Sign in" }).getAttribute("href")).toBe("#/account");
	expect(screen.queryByRole("link", { name: "My account" })).toBeNull();
	expect(screen.queryByRole("link", { name: "Studio" })).toBeNull();
});

it.each([
	{ role: "client", permissions: [], accountHref: "#/account" },
	{ role: "manager", permissions: [], accountHref: "#/studio" },
	{ role: "coordinator", permissions: ["registrations.manage"], accountHref: "#/studio" },
])("links the signed-in $role to $accountHref", ({ role, permissions, accountHref }) => {
	context.session = session;
	context.productUser = { role, status: "active" };
	context.capabilities.permissions = permissions;
	render(<Header />);

	expect(screen.getByRole("link", { name: "My account" }).getAttribute("href")).toBe(accountHref);
	expect(screen.queryByRole("link", { name: "Sign in" })).toBeNull();
	expect(screen.queryByRole("link", { name: "Studio" })).toBeNull();
});
