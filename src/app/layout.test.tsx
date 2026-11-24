import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { useBookingContext } from "../features/booking/adapter";
import { makeBookingContext } from "../features/booking/context-fixture";
import { App } from "./app";
import { i18n } from "../i18n";

let context: ReturnType<typeof useBookingContext>;
vi.mock("@class-kit/react", () => ({ useProductContext: () => context }));

beforeEach(() => {
	context = makeBookingContext();
	vi.stubGlobal("matchMedia", () => ({ matches: true, addEventListener() {}, removeEventListener() {} }));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

it.each(["he", "en"])("connects the header, mobile ticket and footer in %s", async (language) => {
	await i18n.changeLanguage(language);
	window.history.replaceState(null, "", "#/");
	render(<App />);
	const header = within(screen.getByRole("banner"));
	expect(header.getByRole("link", { name: i18n.t("brand") }).getAttribute("href")).toBe("#/");
	const navigation = within(header.getByRole("navigation"));
	expect(navigation.getAllByRole("link").map((link) => link.getAttribute("href"))).toEqual(["#/", "#/demo", "#/packages"]);
	const tickets = screen.getAllByRole("link", { name: i18n.t("bookMeeting") });
	expect(tickets).toHaveLength(2);
	for (const ticket of tickets) expect(ticket.getAttribute("href")).toBe("#/book");
	await act(async () => fireEvent.click(tickets[1]));
	expect(window.location.hash).toBe("#/book");
	expect(within(screen.getByRole("contentinfo")).getByRole("link").getAttribute("href")).toBe("#/account");
});

it.each([
	{ role: "client", permissions: [], requestsHref: "#/account" },
	{ role: "manager", permissions: [], requestsHref: null },
	{ role: "coordinator", permissions: ["registrations.manage"], requestsHref: null },
])("shows My requests in the footer according to studio access for $role", async ({ role, permissions, requestsHref }) => {
	await i18n.changeLanguage("en");
	window.history.replaceState(null, "", "#/");
	context.session = {
		access_token: "test", refresh_token: "test", token_type: "bearer", expires_in: 3600,
		user: { id: "visitor", app_metadata: {}, user_metadata: {}, aud: "authenticated", created_at: "2026-11-07" },
	};
	context.productUser = { role, status: "active" };
	context.capabilities.permissions = permissions;
	render(<App />);

	const link = within(screen.getByRole("contentinfo")).queryByRole("link", { name: "My requests" });
	expect(link?.getAttribute("href") ?? null).toBe(requestsHref);
});
