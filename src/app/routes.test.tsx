import { cleanup, render, screen, act, fireEvent, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Routes } from "./routes";
import { i18n } from "../i18n";
import { makeBookingContext } from "../features/booking/context-fixture";
import { saveBookingRedirect } from "../features/booking/redirect";
import * as packages from "../features/packages";
import type { useBookingContext } from "../features/booking/adapter";

let bookingContext: ReturnType<typeof useBookingContext>;
const managerSession: NonNullable<typeof bookingContext.session> = {
	access_token: "test", refresh_token: "test", token_type: "bearer", expires_in: 3600,
	user: { id: "manager", app_metadata: {}, user_metadata: {}, aud: "authenticated", created_at: "2026-11-07" },
};
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
	const options = packages.getBookingOptions();
	vi.spyOn(packages, "getBookingOptions").mockReturnValue({ ...options, packages: options.packages.map((entry) => ({ ...entry, templateId: null })) });
	window.history.replaceState(null, "", "#access_token=test");
	saveBookingRedirect({ step:"choosing_slot", selection:{packageId:"system-studio", addonInterests:[], slotId:"saved"}, userId:"visitor", slots:[], availability:"loading", notice:null });
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

it("replaces a manager's account entry so Back returns to the previous page", async () => {
	window.history.replaceState(null, "", "#/packages");
	window.history.pushState(null, "", "#/account");
	bookingContext.session = managerSession;
	bookingContext.productUser = { role: "manager", status: "active" };
	render(<Routes />);

	expect(window.location.hash).toBe("#/studio");
	expect(screen.getByRole("main").dataset.module).toBe("studio");
	await act(async () => {
		const back = new Promise<void>(resolve => window.addEventListener("hashchange", () => resolve(), { once: true }));
		window.history.back();
		await back;
	});
	expect(window.location.hash).toBe("#/packages");
	expect(screen.getByRole("main").dataset.module).toBe("packages");
});

it("waits on the account page until studio access finishes loading", () => {
	window.history.replaceState(null, "", "#/account");
	bookingContext.session = managerSession;
	bookingContext.capabilities.permissions = ["registrations.manage"];
	bookingContext.loading = true;
	const view = render(<Routes />);

	expect(window.location.hash).toBe("#/account");
	expect(screen.getByRole("status")).toBeDefined();

	bookingContext = { ...bookingContext, loading: false };
	view.rerender(<Routes />);
	expect(window.location.hash).toBe("#/studio");
	expect(screen.getByRole("main").dataset.module).toBe("studio");
});

it("takes a visitor signing in with a password on the account page to their studio", async () => {
	window.history.replaceState(null, "", "#/account");
	bookingContext.client = {
		auth: {
			signIn: async () => ({ error: null }),
			getSession: async () => managerSession,
		},
		management: { registrations: {} },
	} as unknown as NonNullable<typeof bookingContext.client>;
	bookingContext.refreshProductContext = async () => {
		bookingContext = { ...bookingContext, session: managerSession, productUser: { role: "manager", status: "active" } };
		view.rerender(<Routes />);
	};
	const view = render(<Routes />);
	expect(screen.getByRole("heading", { name: i18n.t("signIn", { ns: "booking" }) })).toBeDefined();
	fireEvent.change(screen.getByLabelText(i18n.t("email", { ns: "booking" })), { target: { value: "manager@example.test" } });
	fireEvent.change(screen.getByLabelText(i18n.t("password", { ns: "booking" })), { target: { value: "test-password" } });
	await act(async () => fireEvent.click(screen.getByRole("button", { name: i18n.t("signIn", { ns: "booking" }) })));

	expect(window.location.hash).toBe("#/studio");
	expect(screen.getByRole("main").dataset.module).toBe("studio");
});

it("replaces the restored account entry after the Google sign-in callback", async () => {
	window.history.replaceState(null, "", "#/account");
	bookingContext.client = {
		auth: { signInWithGoogle: async () => ({ error: null }) },
		management: { registrations: {} },
	} as unknown as NonNullable<typeof bookingContext.client>;
	const view = render(<Routes />);
	await act(async () => fireEvent.click(screen.getByRole("button", { name: i18n.t("google", { ns: "booking" }) })));

	act(() => {
		// The OAuth return is a new document entry. Model that entry before the app restores the hash.
		window.history.pushState(null, "", window.location.pathname);
		bookingContext = { ...bookingContext, session: managerSession, productUser: { role: "manager", status: "active" } };
		view.rerender(<Routes />);
	});
	await waitFor(() => expect(window.location.hash).toBe("#/studio"));
	expect(screen.getByRole("main").dataset.module).toBe("studio");
	await act(async () => {
		const back = new Promise<void>(resolve => window.addEventListener("hashchange", () => resolve(), { once: true }));
		window.history.back();
		await back;
	});
	expect(window.location.hash).toBe("#/");
	expect(screen.getByRole("main").dataset.module).toBe("showcase");
});

it.each([
	["en", "Studio package", "Book a meeting about Studio"],
	["he", "חבילת סטודיו", "לקבוע פגישה על סטודיו"],
])("carries the package label from offers to booking in %s", async (language, label, action) => {
	await i18n.changeLanguage(language);
	window.history.replaceState(null, "", "#/packages");
	render(<Routes />);
	expect(screen.getByText(label, { selector: "h3" })).toBeDefined();

	fireEvent.click(screen.getByRole("button", { name: action }));
	const group = await screen.findByRole("radiogroup");
	const selected = within(group).getByRole<HTMLInputElement>("radio", { checked: true });
	expect(within(selected.labels![0]).getByText(label)).toBeDefined();
	expect(within(screen.getByRole("complementary")).getByText(label)).toBeDefined();
});
