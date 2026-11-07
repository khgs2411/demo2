import { cleanup, render, screen, act } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Routes } from "./routes";
import "../i18n";

afterEach(() => cleanup());

describe("route placeholders", () => {
	it.each([
		["#/", "showcase"],
		["#/packages", "packages"],
		["#/demo", "admin-sim"],
		["#/book", "booking"],
		["#/book/system", "booking"],
		["#/account", "booking"],
	])("renders the owning module at %s", (hash, owner) => {
		window.history.replaceState(null, "", hash);
		render(<Routes />);
		expect(screen.getByRole("main").dataset.module).toBe(owner);
		expect(screen.getByRole("heading", { level: 1 }).textContent).not.toBe("");
	});

	it("responds to hash changes and replaces unknown routes with home", () => {
		window.history.replaceState(null, "", "#/packages");
		render(<Routes />);
		act(() => {
			window.history.replaceState(null, "", "#/missing");
			window.dispatchEvent(new HashChangeEvent("hashchange"));
		});
		expect(window.location.hash).toBe("#/");
		expect(screen.getByRole("main").dataset.module).toBe("showcase");
	});

	it("preserves an auth fragment until the SDK clears it", () => {
		window.history.replaceState(null, "", "#access_token=x");
		render(<Routes />);
		expect(window.location.hash).toBe("#access_token=x");
		expect(screen.queryByRole("main")).toBeNull();
		act(() => {
			window.history.replaceState(null, "", window.location.pathname);
			window.dispatchEvent(new HashChangeEvent("hashchange"));
		});
		expect(screen.getByRole("main").dataset.module).toBe("showcase");
		expect(window.location.hash).toBe("#/");
	});
});
