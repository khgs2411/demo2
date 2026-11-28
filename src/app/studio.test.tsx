import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { App } from "./app";
import { makeBookingContext } from "../features/booking/context-fixture";
import type { useBookingContext } from "../features/booking/adapter";
import { i18n } from "../i18n";

let context: ReturnType<typeof useBookingContext>;
vi.mock("@class-kit/react", () => ({useProductContext:() => context}));

beforeEach(async () => {
	// These routes can mount the home page. jsdom does not run its animation APIs.
	vi.stubGlobal("matchMedia", (media: string) => ({
		matches: media === "(prefers-reduced-motion: reduce)", addEventListener() {}, removeEventListener() {},
	}));
	context = makeBookingContext();
	sessionStorage.clear();
	await i18n.changeLanguage("en");
});
afterEach(() => {
	cleanup();
	vi.unstubAllGlobals();
});
it.each(["#/", "#/packages", "#/demo", "#/book", "#/book/system", "#/account", "#/studio"])("keeps studio unlisted in the rendered shell and page at %s", hash => {
	window.history.replaceState(null,"",hash);
	render(<App />);
	expect(screen.getByRole("main")).toBeDefined();
	if (hash === "#/studio") expect(screen.getByRole("main").dataset.module).toBe("studio");
	expect(document.querySelector('a[href="#/studio"]')).toBeNull();
});

it("returns to studio once after Google authentication resolves at the site root", async () => {
	window.history.replaceState(null,"","#/studio");
	context.client = {auth:{signInWithGoogle:vi.fn().mockResolvedValue({error:null})},management:{registrations:{}}} as unknown as NonNullable<typeof context.client>;
	const view = render(<App />);
	fireEvent.click(screen.getByRole("button",{name:"Continue with Google"}));
	await waitFor(() => expect(sessionStorage.getItem("demo2-studio-redirect")).toBe("#/studio"));
	act(() => {
		window.history.replaceState(null,"",window.location.pathname);
		context = {...context,session:{access_token:"test",refresh_token:"test",token_type:"bearer",expires_in:3600,user:{id:"manager",app_metadata:{},user_metadata:{},aud:"authenticated",created_at:"2026-11-15"}}};
		view.rerender(<App />);
	});
	await waitFor(() => expect(window.location.hash).toBe("#/studio"));
	expect(sessionStorage.getItem("demo2-studio-redirect")).toBeNull();
	expect(await screen.findByText("This page is for the studio manager.")).toBeDefined();
	act(() => { window.location.hash = "#/packages"; window.dispatchEvent(new HashChangeEvent("hashchange")); });
	view.rerender(<App />);
	expect(window.location.hash).toBe("#/packages");
});
