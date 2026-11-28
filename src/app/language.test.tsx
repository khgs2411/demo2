import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { App } from "./app";
import { i18n } from "../i18n";

beforeEach(async () => {
	vi.stubGlobal("matchMedia", () => ({ matches: true, addEventListener() {}, removeEventListener() {} }));
	await i18n.changeLanguage("he");
});

afterEach(() => {
	cleanup();
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
});

it.each(["#/", "#/packages", "#/demo", "#/book", "#/book/system", "#/account"])(
	"switches all placeholder copy, document direction and persisted language at %s",
	async (hash) => {
		window.history.replaceState(null, "", hash);
		render(<App />);
		const hebrew = screen.getByRole("main").textContent;
		const footer = within(screen.getByRole("contentinfo"));
		expect(footer.getByText("אתרים עם ClassKit לעסקים שמנהלים שיעורים ותורים. בוחרים חבילה וקובעים פגישה.")).toBeDefined();
		expect(document.documentElement.lang).toBe("he");
		expect(document.documentElement.dir).toBe("rtl");
		expect(screen.getByText(i18n.t("brand"))).toBeDefined();
		await act(async () => fireEvent.click(screen.getByRole("button", { name: "מעבר לאנגלית" })));
		expect(document.documentElement.lang).toBe("en");
		expect(document.documentElement.dir).toBe("ltr");
		expect(footer.getByText("Websites with ClassKit for businesses that run classes and appointments. Choose a package and book a meeting.")).toBeDefined();
		expect(localStorage.getItem("demo2-showcase-language")).toBe("en");
		expect(screen.getByRole("main").textContent).not.toBe(hebrew);
		expect(screen.getByRole("button", { name: "Switch to Hebrew" }).textContent).toBe("עב");
		await act(async () => fireEvent.click(screen.getByRole("button", { name: "Switch to Hebrew" })));
		expect(document.documentElement.lang).toBe("he");
		expect(document.documentElement.dir).toBe("rtl");
		expect(localStorage.getItem("demo2-showcase-language")).toBe("he");
		expect(screen.getByRole("main").textContent).toBe(hebrew);
	},
);

it("still changes language when saving the preference throws", async () => {
	vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
		throw new DOMException("Storage unavailable", "SecurityError");
	});
	render(<App />);
	await act(async () => fireEvent.click(screen.getByRole("button", { name: "מעבר לאנגלית" })));
	expect(document.documentElement.lang).toBe("en");
	expect(document.documentElement.dir).toBe("ltr");
});
