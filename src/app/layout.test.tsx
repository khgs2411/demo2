import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { App } from "./app";
import { i18n } from "../i18n";

beforeEach(() => vi.stubGlobal("matchMedia", () => ({ matches: true, addEventListener() {}, removeEventListener() {} })));
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
