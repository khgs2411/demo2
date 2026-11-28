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

it.each(["he", "en"])("shows the decorative T inside the header home link in %s", async (language) => {
	await i18n.changeLanguage(language);
	window.history.replaceState(null, "", "#/");
	render(<App />);
	const header = within(screen.getByRole("banner"));
	const brand = header.getByRole("link", { name: "Topsyde Studios" });
	expect(brand.getAttribute("href")).toBe("#/");
	expect(within(brand).getByText("T").getAttribute("aria-hidden")).toBe("true");
});

it.each(["he", "en"])("connects the home header and footer in %s", async (language) => {
	await i18n.changeLanguage(language);
	window.history.replaceState(null, "", "#/");
	render(<App />);
	const header = within(screen.getByRole("banner"));
	expect(header.getByRole("link", { name: i18n.t("brand") }).getAttribute("href")).toBe("#/");
	const navigation = within(header.getByRole("navigation"));
	expect(navigation.getAllByRole("link").map((link) => link.getAttribute("href"))).toEqual(["#get", "#/", "#/demo", "#/packages", "#/about"]);
	const ticket = header.getByRole("link", { name: i18n.t("homeBookMeeting") });
	expect(ticket.getAttribute("href")).toBe("#/book");
	expect(document.querySelector(".ticket-dock")).toBeNull();
	const footer = within(screen.getByRole("contentinfo"));
	expect(footer.getByRole("link").getAttribute("href")).toBe("#/account");
	expect(footer.getByText("Made by Topsyde Studios")).toBeDefined();
	await act(async () => fireEvent.click(ticket));
	expect(window.location.hash).toBe("#/book");
});

it("opens the feature sheet from a directly loaded link", () => {
	const scrollIntoView = vi.fn();
	Object.defineProperty(Element.prototype, "scrollIntoView", { configurable: true, value: scrollIntoView });
	try {
		window.history.replaceState(null, "", "#get");
		render(<App />);
		expect(screen.getByRole("main")).toBeDefined();
		expect(scrollIntoView.mock.instances).toContain(document.getElementById("get"));
	} finally {
		Reflect.deleteProperty(Element.prototype, "scrollIntoView");
	}
});

it.each(["#/packages", "#/about"])("keeps the booking tickets at %s", (hash) => {
	window.history.replaceState(null, "", hash);
	render(<App />);
	const header = within(screen.getByRole("banner"));
	expect(header.getByRole("link", { name: i18n.t("bookMeeting") }).getAttribute("href")).toBe("#/book");
	expect(document.querySelector(".ticket-dock a")?.getAttribute("href")).toBe("#/book");
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

it("leaves booking without a second booking action in the header or dock", () => {
	window.history.replaceState(null, "", "#/book");
	render(<App />);
	expect(screen.queryByRole("link", { name: i18n.t("bookMeeting") })).toBeNull();
	expect(document.querySelector(".ticket-dock")).toBeNull();
});
