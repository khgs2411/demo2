import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { i18n } from "../../i18n";
import * as adapterModule from "./adapter";
import { AccountPage } from "./account-page";
import { makeBookingContext } from "./context-fixture";

vi.mock("@class-kit/react", () => ({ useProductContext: vi.fn() }));
let context: ReturnType<typeof adapterModule.useBookingContext>;
const request = { id:"s", name:"Business meeting", startsAt:"2026-11-10T09:00:00Z", canRegister:false, canCancelRegistration:true, userRegistrationState:{id:"r",status:"pending" as const} };
const profile = { displayName: "Maya Cohen", phoneNumber: "0501234567", businessName: "Studio" };
const listRequests = vi.fn();
const cancelRequest = vi.fn();
const adapter = { loadProfile:vi.fn(), saveAccountDetails:vi.fn(), loadTerms:vi.fn(), requestWithSignup:vi.fn(), signIn:vi.fn(), signUp:vi.fn(), signInWithGoogle:vi.fn(), saveProfile:vi.fn(),loadSlots:vi.fn(),requestRegistration:vi.fn(),listRequests,cancelRequest,signOut:vi.fn(),requestPasswordReset:vi.fn(),completePasswordReset:vi.fn() };
beforeEach(async () => {
	vi.restoreAllMocks(); vi.resetAllMocks();
	context = { ...makeBookingContext(), session:{access_token:"test",refresh_token:"test",token_type:"bearer",expires_in:3600,user:{id:"visitor",app_metadata:{},user_metadata:{},aud:"authenticated",created_at:"2026-11-07"}} };
	vi.spyOn(adapterModule,"useBookingContext").mockImplementation(() => context);
	vi.spyOn(adapterModule,"createBookingAdapter").mockReturnValue(adapter);
	listRequests.mockResolvedValue({type:"loaded",requests:[request]});
	adapter.loadProfile.mockResolvedValue({ type: "profile_loaded", profile });
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

it.each([
	["en", "This account does not have access to this product."],
	["he", "לחשבון הזה אין גישה למוצר הזה."],
])("explains missing product access in %s without offering a retry", async (language, message) => {
	await i18n.changeLanguage(language);
	listRequests.mockResolvedValueOnce({ type: "no_access" });
	render(<AccountPage />);

	expect((await screen.findByRole("alert")).textContent).toBe(message);
	expect(screen.queryByRole("textbox")).toBeNull();
	expect(screen.queryByRole("link")).toBeNull();
	expect(screen.getAllByRole("button")).toHaveLength(1);
	expect(screen.queryByRole("button", { name: i18n.t("retry", { ns: "booking" }) })).toBeNull();
	expect(screen.getByRole("button", { name: i18n.t("signOut", { ns: "booking" }) })).toBeDefined();
});

it("loads and saves the signed-in user's required contact fields beside the ledger", async () => {
	adapter.saveAccountDetails.mockResolvedValueOnce({ type: "saved" });
	render(<AccountPage />);

	const name = await screen.findByLabelText(i18n.t("name", { ns: "booking" }));
	const phone = screen.getByLabelText(i18n.t("phone", { ns: "booking" }));
	expect(screen.getByRole("heading", { name: "Your details" })).toBeDefined();
	expect(screen.getByText("Business meeting")).toBeDefined();
	expect(adapter.loadProfile).toHaveBeenCalledWith("visitor");
	expect(name).toHaveProperty("value", profile.displayName);
	expect(name).toHaveProperty("autocomplete", "name");
	expect(name).toHaveProperty("required", true);
	expect(phone).toHaveProperty("value", profile.phoneNumber);
	expect(phone).toHaveProperty("autocomplete", "tel");
	expect(phone).toHaveProperty("dir", "ltr");
	expect(phone).toHaveProperty("required", true);

	fireEvent.change(name, { target: { value: "Maya Levi" } });
	fireEvent.change(phone, { target: { value: "0507654321" } });
	fireEvent.click(screen.getByRole("button", { name: "Save details" }));

	await screen.findByText("Your details were saved.");
	expect(adapter.saveAccountDetails).toHaveBeenCalledExactlyOnceWith({ displayName: "Maya Levi", phoneNumber: "0507654321" });
});

it("shows a profile load error without rendering empty fields", async () => {
	adapter.loadProfile.mockResolvedValueOnce({ type: "profile_loaded", profile: null });
	render(<AccountPage />);

	await screen.findByText("We couldn't load your details.");
	expect(screen.queryByRole("textbox")).toBeNull();
	expect(screen.queryByRole("button", { name: "Save details" })).toBeNull();
});

it("keeps the edited input after a failed save", async () => {
	adapter.saveAccountDetails.mockResolvedValueOnce({ type: "save_failed" });
	render(<AccountPage />);
	const name = await screen.findByLabelText(i18n.t("name", { ns: "booking" }));
	const phone = screen.getByLabelText(i18n.t("phone", { ns: "booking" }));
	fireEvent.change(name, { target: { value: "Maya Levi" } });
	fireEvent.change(phone, { target: { value: "0507654321" } });
	fireEvent.click(screen.getByRole("button", { name: "Save details" }));

	await screen.findByText("We couldn't save your details. Try again.");
	expect(name).toHaveProperty("value", "Maya Levi");
	expect(phone).toHaveProperty("value", "0507654321");
	expect(screen.getByRole("button", { name: "Save details" })).toHaveProperty("disabled", false);
});

it("returns to sign-in when a details save loses its session", async () => {
	adapter.saveAccountDetails.mockResolvedValueOnce({ type: "signed_out" });
	render(<AccountPage />);

	fireEvent.click(await screen.findByRole("button", { name: "Save details" }));

	await screen.findByRole("heading", { name: "Sign in" });
	expect(screen.queryByRole("heading", { name: "Your details" })).toBeNull();
	expect(screen.queryByText("Business meeting")).toBeNull();
});

it("keeps the editor available when an earlier save rejects a replaced session", async () => {
	let finishSave!: (result: { type: "signed_out" }) => void;
	adapter.saveAccountDetails.mockImplementationOnce(() => new Promise(resolve => { finishSave = resolve; }));
	const page = render(<AccountPage />);
	const name = await screen.findByLabelText(i18n.t("name", { ns: "booking" }));
	fireEvent.change(name, { target: { value: "Maya Levi" } });
	fireEvent.click(screen.getByRole("button", { name: "Save details" }));

	context = { ...context, session: { ...context.session!, access_token: "renewed-test-session" } };
	page.rerender(<AccountPage />);
	await act(async () => { finishSave({ type: "signed_out" }); });

	expect(screen.queryByRole("heading", { name: "Sign in" })).toBeNull();
	expect(name).toHaveProperty("value", "Maya Levi");
	adapter.saveAccountDetails.mockResolvedValueOnce({ type: "saved" });
	fireEvent.click(screen.getByRole("button", { name: "Save details" }));
	await screen.findByText("Your details were saved.");
});
