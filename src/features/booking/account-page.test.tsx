import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
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
const loadAcceptedTerms = vi.fn();
const adapter = { loadProfile:vi.fn(), saveAccountDetails:vi.fn(), loadTerms:vi.fn(), loadAcceptedTerms, requestWithSignup:vi.fn(), signIn:vi.fn(), signUp:vi.fn(), signInWithGoogle:vi.fn(), saveProfile:vi.fn(),loadSlots:vi.fn(),requestRegistration:vi.fn(),listRequests,cancelRequest,signOut:vi.fn(),requestPasswordReset:vi.fn(),completePasswordReset:vi.fn() };
beforeEach(async () => {
	vi.restoreAllMocks(); vi.resetAllMocks();
	context = { ...makeBookingContext(), session:{access_token:"test",refresh_token:"test",token_type:"bearer",expires_in:3600,user:{id:"visitor",app_metadata:{},user_metadata:{},aud:"authenticated",created_at:"2026-11-07"}} };
	vi.spyOn(adapterModule,"useBookingContext").mockImplementation(() => context);
	vi.spyOn(adapterModule,"createBookingAdapter").mockReturnValue(adapter);
	listRequests.mockResolvedValue({type:"loaded",requests:[request]});
	adapter.loadProfile.mockResolvedValue({ type: "profile_loaded", profile });
	loadAcceptedTerms.mockResolvedValue({ type: "loaded", acceptances: [] });
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
	expect(loadAcceptedTerms).not.toHaveBeenCalled();
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
	expect(adapter.loadProfile, "no profile read without product access").not.toHaveBeenCalled();
	expect(loadAcceptedTerms, "no acceptance read without product access").not.toHaveBeenCalled();
	expect(screen.queryByRole("region", { name: language === "en" ? "Terms you accepted" : "התנאים שאישרת" })).toBeNull();
	expect(screen.queryByRole("heading", { name: i18n.t("accDetailsTitle", { ns: "booking" }) })).toBeNull();
	expect(screen.queryByRole("textbox")).toBeNull();
	expect(screen.queryByRole("link")).toBeNull();
	expect(screen.getAllByRole("button")).toHaveLength(1);
	expect(screen.queryByRole("button", { name: i18n.t("retry", { ns: "booking" }) })).toBeNull();
	expect(screen.getByRole("button", { name: i18n.t("signOut", { ns: "booking" }) })).toBeDefined();
});

const acceptance = {
	id: "snapshot-8", title: "תנאי הסטודיו", version: 8, locale: "he",
	text: "**הנוסח שאושר**\n\n- סעיף ראשון", acceptedAt: new Date(2026, 10, 20, 12).toISOString(),
};

it("opens each acceptance's own snapshot, including rows with the same title", async () => {
	const older = { ...acceptance, id: "snapshot-7", version: 7, text: "**נוסח קודם**", acceptedAt: new Date(2026, 9, 5, 12).toISOString() };
	loadAcceptedTerms.mockResolvedValueOnce({ type: "loaded", acceptances: [acceptance, older] });
	render(<AccountPage />);

	const terms = within(await screen.findByRole("region", { name: "Terms you accepted" }));
	const [latestRow, olderRow] = await terms.findAllByRole("button");
	expect(terms.getAllByRole("listitem")).toHaveLength(2);
	expect(latestRow.textContent).toContain("תנאי הסטודיו");
	expect(latestRow.textContent).toContain("Version 8");
	expect(olderRow.textContent).toContain("Version 7");
	expect(within(latestRow).getByText("Nov 20, 2026").getAttribute("datetime")).toBe(acceptance.acceptedAt);
	expect(within(olderRow).getByText("Oct 5, 2026").getAttribute("datetime")).toBe(older.acceptedAt);
	expect(terms.queryByText(/הנוסח שאושר/)).toBeNull();

	fireEvent.click(latestRow);
	const reader = terms.getByText(/הנוסח שאושר/);
	expect(reader.textContent).toBe(acceptance.text);
	expect(reader.getAttribute("lang")).toBe("he");
	expect(latestRow.getAttribute("aria-expanded")).toBe("true");

	fireEvent.click(olderRow);
	expect(terms.getByText(older.text).textContent).toBe(older.text);
	expect(terms.queryByText(/הנוסח שאושר/)).toBeNull();
	fireEvent.click(olderRow);
	expect(terms.queryByText(older.text)).toBeNull();
	expect(adapter.loadTerms).not.toHaveBeenCalled();
});

it.each([
	["en", "Terms you accepted", "Loading accepted terms…", "We couldn't load your accepted terms.", "Try again", "You haven't accepted any terms yet."],
	["he", "התנאים שאישרת", "טוענים את התנאים שאישרת…", "לא הצלחנו לטעון את התנאים שאישרת.", "ניסיון נוסף", "עדיין לא אישרת תנאים."],
])("shows localized accepted-terms states and retries in %s", async (language, heading, loading, failure, retry, empty) => {
	await i18n.changeLanguage(language);
	let fail!: () => void;
	loadAcceptedTerms.mockImplementationOnce(() => new Promise(resolve => {
		fail = () => resolve({ type: "load_failed" });
	}));
	render(<AccountPage />);

	const terms = within(await screen.findByRole("region", { name: heading }));
	expect(terms.getByRole("status").textContent).toBe(loading);
	await act(async () => { fail(); });
	expect(terms.getByRole("alert").textContent).toBe(failure);
	fireEvent.click(terms.getByRole("button", { name: retry }));
	expect((await terms.findByText(empty)).getAttribute("role")).toBe("status");
	expect(loadAcceptedTerms).toHaveBeenCalledTimes(2);
});

it("discards a pending acceptance read when the signed-in user changes", async () => {
	let finishOldRead!: () => void;
	loadAcceptedTerms.mockImplementationOnce(() => new Promise(resolve => {
		finishOldRead = () => resolve({ type: "loaded", acceptances: [acceptance] });
	}));
	const page = render(<AccountPage />);
	await screen.findByText("Loading accepted terms…");

	context = { ...context, session: { ...context.session!, user: { ...context.session!.user, id: "other" } } };
	page.rerender(<AccountPage />);
	await screen.findByText("You haven't accepted any terms yet.");
	await act(async () => { finishOldRead(); });
	expect(screen.queryByText(acceptance.title)).toBeNull();
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

it("retries a failed details load and opens the editor when it succeeds", async () => {
	let finishLoad!: () => void;
	adapter.loadProfile
		.mockResolvedValueOnce({ type: "profile_loaded", profile: null })
		.mockImplementationOnce(() => new Promise(resolve => {
			finishLoad = () => resolve({ type: "profile_loaded", profile });
		}));
	render(<AccountPage />);

	const details = within(await screen.findByRole("region", { name: "Your details" }));
	await details.findByRole("alert");
	fireEvent.click(details.getByRole("button", { name: "Try again" }));

	expect(details.getByRole("status").textContent).toBe("Loading…");
	expect(details.queryByRole("button", { name: "Try again" })).toBeNull();
	expect(adapter.loadProfile.mock.calls).toEqual([["visitor"], ["visitor"]]);
	await act(async () => { finishLoad(); });
	expect(details.getByLabelText(i18n.t("name", { ns: "booking" }))).toHaveProperty("value", profile.displayName);
});

it.each([
	["en", "Save details", "Saving…"],
	["he", "שמירת הפרטים", "שומרים…"],
])("shows a dedicated saving label in %s while the update is pending", async (language, saveLabel, savingLabel) => {
	await i18n.changeLanguage(language);
	let finishSave!: (result: { type: "saved" }) => void;
	adapter.saveAccountDetails.mockImplementationOnce(() => new Promise(resolve => { finishSave = resolve; }));
	render(<AccountPage />);

	fireEvent.click(await screen.findByRole("button", { name: saveLabel }));

	expect(screen.getByRole("button", { name: savingLabel })).toHaveProperty("disabled", true);
	await act(async () => { finishSave({ type: "saved" }); });
});

it("submits trimmed details and shows them after the save succeeds", async () => {
	adapter.saveAccountDetails.mockResolvedValueOnce({ type: "saved" });
	render(<AccountPage />);
	const name = await screen.findByLabelText(i18n.t("name", { ns: "booking" }));
	const phone = screen.getByLabelText(i18n.t("phone", { ns: "booking" }));
	fireEvent.change(name, { target: { value: "  Maya Levi " } });
	fireEvent.change(phone, { target: { value: " 0507654321  " } });

	fireEvent.click(screen.getByRole("button", { name: "Save details" }));

	await screen.findByText("Your details were saved.");
	expect(adapter.saveAccountDetails).toHaveBeenCalledExactlyOnceWith({ displayName: "Maya Levi", phoneNumber: "0507654321" });
	expect(name).toHaveProperty("value", "Maya Levi");
	expect(phone).toHaveProperty("value", "0507654321");
});

it("keeps the edited input after a failed save", async () => {
	adapter.saveAccountDetails.mockResolvedValueOnce({ type: "save_failed" });
	render(<AccountPage />);
	const name = await screen.findByLabelText(i18n.t("name", { ns: "booking" }));
	const phone = screen.getByLabelText(i18n.t("phone", { ns: "booking" }));
	fireEvent.change(name, { target: { value: "  Maya Levi " } });
	fireEvent.change(phone, { target: { value: " 0507654321  " } });
	fireEvent.click(screen.getByRole("button", { name: "Save details" }));

	await screen.findByText("We couldn't save your details. Try again.");
	expect(name).toHaveProperty("value", "  Maya Levi ");
	expect(phone).toHaveProperty("value", " 0507654321  ");
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
