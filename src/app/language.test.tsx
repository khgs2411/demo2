import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { App } from "./app";
import { i18n } from "../i18n";

beforeEach(async () => {
	await i18n.changeLanguage("he");
});

afterEach(() => {
	cleanup();
	vi.restoreAllMocks();
});

it.each(["#/", "#/packages", "#/demo", "#/book", "#/book/system", "#/account"])(
	"switches all placeholder copy, document direction and persisted language at %s",
	async (hash) => {
		window.history.replaceState(null, "", hash);
		render(<App />);
		const hebrew = screen.getByRole("main").textContent;
		expect(document.documentElement.lang).toBe("he");
		expect(document.documentElement.dir).toBe("rtl");
		expect(screen.getByText(i18n.t("brand"))).toBeDefined();
		await act(async () => fireEvent.click(screen.getByRole("button", { name: "מעבר לאנגלית" })));
		expect(document.documentElement.lang).toBe("en");
		expect(document.documentElement.dir).toBe("ltr");
		expect(localStorage.getItem("demo2-showcase-language")).toBe("en");
		expect(screen.getByRole("main").textContent).not.toBe(hebrew);
		expect(screen.getByRole("button", { name: "Switch to Hebrew" }).textContent).toBe("עברית");
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
