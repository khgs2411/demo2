import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { i18n } from "../../i18n";
import { ShowcasePage } from "./page";

beforeEach(() => {
	vi.stubGlobal("IntersectionObserver", class { observe() {} disconnect() {} });
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

it("shows the selected features and latest benefit in the reduced-motion preview", async () => {
	await i18n.changeLanguage("en");
	render(<ShowcasePage />);
	const preview = screen.getByRole("complementary", { name: "What you have now" });
	expect(within(preview).getByText("A website that shows your business.", { selector: ".r-sentence" })).toBeDefined();
	expect(within(preview).getByText("Get in touch")).toBeDefined();

	fireEvent.click(screen.getByRole("button", { name: "Class cards and memberships" }));
	expect(within(preview).getByText("where customers book on their own")).toBeDefined();
	expect(within(preview).getByText("that brings them back with class cards and memberships").className).toBe("new");
	expect(within(preview).getByText("Booked ✓")).toBeDefined();
	expect(within(preview).getByText("Book a class")).toBeDefined();
	expect(within(preview).getByText("Unlimited")).toBeDefined();

	fireEvent.click(screen.getByRole("button", { name: "Changes to your site, in one request" }));
	expect(within(preview).getByText("shaked-studio/manage")).toBeDefined();
	expect(within(preview).getByText("New: a beginners’ intro class")).toBeDefined();
	expect(within(preview).getByText("A new class or an offer: write a request, and the change goes on your site.")).toBeDefined();
	expect(screen.getByRole("status").textContent).toBe("Added: Changes to your site, in one request");

	fireEvent.click(screen.getByRole("button", { name: "Start over" }));
	expect(within(preview).getByText("A website that shows your business.", { selector: ".r-sentence" })).toBeDefined();
});
