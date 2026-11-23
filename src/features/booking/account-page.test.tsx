import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { i18n } from "../../i18n";
import * as adapterModule from "./adapter";
import { AccountPage } from "./account-page";
import { makeBookingContext } from "./context-fixture";

vi.mock("@class-kit/react", () => ({ useProductContext: vi.fn() }));
let context: ReturnType<typeof adapterModule.useBookingContext>;
const request = { id:"s", name:"Business meeting", startsAt:"2026-11-10T09:00:00Z", canRegister:false, canCancelRegistration:true, userRegistrationState:{id:"r",status:"pending" as const} };
const listRequests = vi.fn();
const cancelRequest = vi.fn();
const adapter = { loadProfile:vi.fn(), loadTerms:vi.fn(), requestWithSignup:vi.fn(), signIn:vi.fn(), signUp:vi.fn(), signInWithGoogle:vi.fn(), saveProfile:vi.fn(),loadSlots:vi.fn(),requestRegistration:vi.fn(),listRequests,cancelRequest,signOut:vi.fn(),requestPasswordReset:vi.fn(),completePasswordReset:vi.fn() };
beforeEach(async () => {
	vi.restoreAllMocks(); vi.resetAllMocks();
	context = { ...makeBookingContext(), session:{access_token:"test",refresh_token:"test",token_type:"bearer",expires_in:3600,user:{id:"visitor",app_metadata:{},user_metadata:{},aud:"authenticated",created_at:"2026-11-07"}} };
	vi.spyOn(adapterModule,"useBookingContext").mockImplementation(() => context);
	vi.spyOn(adapterModule,"createBookingAdapter").mockReturnValue(adapter);
	listRequests.mockResolvedValue({type:"loaded",requests:[request]});
	await i18n.changeLanguage("en");
});
afterEach(cleanup);
it.each(["he","en"])("renders all backend statuses and only allowed cancellation controls in %s", async language => {
	await i18n.changeLanguage(language);
	listRequests.mockResolvedValueOnce({type:"loaded",requests:["pending","approved","rejected","cancelled"].map(status => ({...request,canCancelRegistration:status==="pending",userRegistrationState:{id:status,status}}))});
	render(<AccountPage />);
	for (const status of ["pending","approved","rejected","cancelled"]) expect(await screen.findByText(i18n.t(status,{ns:"booking"}))).toBeDefined();
	expect(screen.getAllByRole("button",{name:i18n.t("cancel",{ns:"booking"})})).toHaveLength(1);
	expect(screen.getByRole("link",{name:i18n.t("bookAnother",{ns:"booking"})}).getAttribute("href")).toBe("#/book");
});
it("does not replay cancellation after a failure and renders refreshed flags", async () => {
	cancelRequest.mockResolvedValueOnce([{type:"cancel_failed"},{type:"loaded",requests:[{...request,canCancelRegistration:false}]}]);
	render(<AccountPage />);
	const cancel = await screen.findByRole("button",{name:"Cancel request"});
	fireEvent.click(cancel); fireEvent.click(cancel);
	await screen.findByText("The request could not be cancelled. Its latest status is shown below.");
	expect(cancelRequest).toHaveBeenCalledOnce();
	expect(screen.queryByRole("button",{name:"Cancel request"})).toBeNull();
});
it("shows an empty ledger and handles a read failure without mutation", async () => {
	listRequests.mockResolvedValueOnce({type:"failed"}).mockResolvedValueOnce({type:"loaded",requests:[]});
	render(<AccountPage />);
	fireEvent.click(await screen.findByRole("button",{name:"Try again"}));
	await screen.findByText("No meeting requests yet.");
	expect(cancelRequest).not.toHaveBeenCalled();
});
it("offers authentication to signed-out visitors without reading private requests", () => {
	context.session = null;
	render(<AccountPage />);
	expect(screen.getByRole("heading", { name: "Sign in" })).toBeDefined();
	expect(screen.getByRole("button",{name:"Continue with Google"})).toBeDefined();
	expect(screen.getByRole("button", { name: "Sign in" })).toBeDefined();
	expect(screen.queryByRole("button", { name: "Create account" })).toBeNull();
	expect(screen.getByRole("link", { name: "No account? Book a meeting and we'll create one." }).getAttribute("href")).toBe("#/book");
	expect(listRequests).not.toHaveBeenCalled();
});
it("ignores a stale read after the provider switches visitors", async () => {
	let resolveOld!: (value: unknown) => void;
	listRequests.mockImplementationOnce(() => new Promise(resolve => { resolveOld = resolve; })).mockResolvedValueOnce({type:"loaded",requests:[]});
	const view = render(<AccountPage />);
	context = {...context,session:{...context.session!,user:{...context.session!.user,id:"other"}}};
	view.rerender(<AccountPage />);
	await screen.findByText("No meeting requests yet.");
	await act(async () => { resolveOld({type:"loaded",requests:[request]}); });
	expect(screen.queryByText("Business meeting")).toBeNull();
});

it("reports sign-out failure without hiding the signed-in requests", async () => {
	adapter.signOut.mockResolvedValueOnce(false);
	render(<AccountPage />);
	await screen.findByText("Business meeting");
	fireEvent.click(screen.getByRole("button", {name:"Sign out"}));
	await screen.findByText("Sign-out failed. Please try again.");
	expect(screen.getByText("Business meeting")).toBeDefined();
});

it("restarts Google sign-in without a visible error when the account session is revoked", async () => {
	adapter.signInWithGoogle.mockResolvedValue({ type: "auth_redirect_started" });
	const page = render(<AccountPage />);
	context = { ...context, session: null, sessionErrorCode: "session_revoked" };
	await act(async () => page.rerender(<AccountPage />));
	expect(adapter.signInWithGoogle).toHaveBeenCalledOnce();
	expect(screen.queryByRole("alert")).toBeNull();
});
