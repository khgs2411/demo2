import { cleanup, render, screen, act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Routes } from "./routes";
import "../i18n";
import { makeBookingContext } from "../features/booking/context-fixture";
import { saveBookingRedirect } from "../features/booking/redirect";
import type { useBookingContext } from "../features/booking/adapter";

let bookingContext: ReturnType<typeof useBookingContext>;
vi.mock("@class-kit/react", () => ({ useProductContext: () => bookingContext }));
beforeEach(() => { bookingContext = makeBookingContext(); sessionStorage.clear(); });

beforeEach(() => vi.stubGlobal("matchMedia", () => ({ matches: true, addEventListener() {}, removeEventListener() {} })));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

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

it("restores booking after the provider receives an OAuth session without a hashchange", async () => {
	window.history.replaceState(null, "", "#access_token=test");
	saveBookingRedirect({ step:"choosing_slot", selection:{packageId:"system", addonInterests:[], slotId:"saved"}, userId:"visitor", slots:[], availability:"loading", notice:null });
	bookingContext.loading = true;
	const view = render(<Routes />);
	act(() => {
		window.history.replaceState(null, "", window.location.pathname);
		bookingContext = { ...bookingContext, loading:false, session:{ access_token:"test", refresh_token:"test", token_type:"bearer", expires_in:3600, user:{id:"visitor",app_metadata:{},user_metadata:{},aud:"authenticated",created_at:"2026-11-07"} } };
		view.rerender(<Routes />);
	});
	expect(await screen.findByText("היומן עוד לא פתוח.")).toBeDefined();
	expect(window.location.hash).toBe("#/book");
});
