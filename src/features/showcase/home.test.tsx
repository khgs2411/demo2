import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { i18n } from "../../i18n";
import { ShowcasePage } from "./page";

beforeEach(() => {
	vi.stubGlobal("matchMedia", () => ({ matches: true, addEventListener() {}, removeEventListener() {} }));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

it.each([
	["he", "מערכת שעובדת בשבילך.", "לקבוע פגישה", "מה מקבלים", "לכל החבילות", "8/8 מלא"],
	["en", "A system that works for you.", "Book a meeting", "What you get", "All packages", "8/8 full"],
])("renders the %s home page with usable links and every motion sequence finished", async (language, headline, book, see, packages, full) => {
	await i18n.changeLanguage(language);
	render(<ShowcasePage />);
	const home = within(screen.getByRole("main"));
	expect(home.getByRole("heading", { level: 1 }).textContent).toContain(headline);
	expect(home.getAllByRole("link", { name: book }).map(link => link.getAttribute("href"))).toEqual([
		"#/book", "#/book/system-basic", "#/book/system-studio", "#/book/system-partner", "#/book",
	]);
	expect(home.getByRole("link", { name: packages }).getAttribute("href")).toBe("#/packages");
	const sheet = document.getElementById("get")!;
	const scroll = vi.fn();
	sheet.scrollIntoView = scroll;
	fireEvent.click(home.getByRole("link", { name: see }));
	expect(scroll).toHaveBeenCalledOnce();
	expect(home.getByText(full)).toBeDefined();
	expect(sheet.querySelectorAll(".tile")).toHaveLength(7);
	expect(sheet.querySelectorAll(".steps .on")).toHaveLength(4);
	expect(sheet.querySelectorAll(".dates .on")).toHaveLength(5);
});

it("picks dependent features with their prerequisites and resets to the website", async () => {
	await i18n.changeLanguage("en");
	render(<ShowcasePage />);
	const cards = screen.getByRole("button", { name: "Class cards and memberships", pressed: false });
	const booking = screen.getByRole("button", { name: "Customers book on their own", pressed: false });

	fireEvent.click(cards);
	expect(cards.getAttribute("aria-pressed")).toBe("true");
	expect(booking.getAttribute("aria-pressed")).toBe("true");

	fireEvent.click(booking);
	expect(cards.getAttribute("aria-pressed")).toBe("false");
	expect(booking.getAttribute("aria-pressed")).toBe("false");

	fireEvent.click(screen.getByRole("button", { name: "Add everything" }));
	expect(screen.getAllByRole("button", { pressed: true })).toHaveLength(6);
	fireEvent.click(screen.getByRole("button", { name: "Start over" }));
	expect(screen.getAllByRole("button", { pressed: false })).toHaveLength(6);
});
