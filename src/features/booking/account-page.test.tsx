import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { i18n } from "../../i18n";
import * as adapterModule from "./adapter";
import { AccountPage } from "./account-page";
import { makeBookingContext } from "./context-fixture";

vi.mock("@class-kit/react", () => ({ useProductContext: vi.fn() }));
let context: ReturnType<typeof adapterModule.useBookingContext>;
const request = { id:"s", name:"Business meeting", startsAt:"2026-11-10T09:00:00Z", endsAt:"2026-11-10T09:45:00Z", canRegister:false, canCancelRegistration:true, userRegistrationState:{id:"r",status:"pending" as const} };
const profile = { displayName: "Maya Cohen", phoneNumber: "0501234567", businessName: "Studio" };
const listRequests = vi.fn();
const cancelRequest = vi.fn();
const loadAcceptedTerms = vi.fn();
const adapter = { loadProfile:vi.fn(), saveAccountDetails:vi.fn(), loadTerms:vi.fn(), loadAcceptedTerms, checkTerms:vi.fn(), acceptTerms:vi.fn(), requestWithSignup:vi.fn(), signIn:vi.fn(), signUp:vi.fn(), signInWithGoogle:vi.fn(), saveProfile:vi.fn(),loadSlots:vi.fn(),requestRegistration:vi.fn(),listRequests,cancelRequest,signOut:vi.fn(),requestPasswordReset:vi.fn(),completePasswordReset:vi.fn(), changePassword:vi.fn() };
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
it("puts Book another meeting in the account header and Sign out after the account forms", async () => {
	context.session!.user.identities = [{ id: "email", identity_id: "email", user_id: "visitor", provider: "email" }];
	render(<AccountPage />);

	const heading = await screen.findByRole("heading", { name: "My account", level: 1 });
	const header = heading.closest("header")!;
	expect(within(header).getByRole("link", { name: "Book another meeting" }).getAttribute("href")).toBe("#/book");

	const details = await screen.findByRole("region", { name: "Your details" });
	const side = details.parentElement!;
	const password = within(side).getByRole("region", { name: "Password" });
	const signOut = within(side).getByRole("button", { name: "Sign out" });
	expect(password.compareDocumentPosition(signOut) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

	const requests = screen.getByRole("region", { name: "My requests" });
	const terms = screen.getByRole("region", { name: "Terms you accepted" });
	expect(requests.parentElement).toBe(terms.parentElement);
	expect(requests.parentElement).not.toBe(side);
});

it.each(["he","en"])("renders all backend statuses and only allowed cancellation controls in %s", async language => {
	await i18n.changeLanguage(language);
	listRequests.mockResolvedValueOnce({type:"loaded",requests:["pending","approved","rejected","cancelled"].map(status => ({...request,canCancelRegistration:status==="pending",userRegistrationState:{id:status,status}}))});
	render(<AccountPage />);
	for (const status of ["pending","approved","rejected","cancelled"]) expect(await screen.findByText(i18n.t(status,{ns:"booking"}))).toBeDefined();
	expect(screen.getAllByRole("button",{name:i18n.t("cancel",{ns:"booking"})})).toHaveLength(1);
	expect(screen.getByRole("link",{name:i18n.t("bookAnother",{ns:"booking"})}).getAttribute("href")).toBe("#/book");
});
it.each([
	["en", "Add to Google Calendar"],
	["he", "הוספה ליומן Google"],
])("links only the upcoming confirmed request to Google Calendar in %s", async (language, label) => {
	vi.spyOn(Date, "now").mockReturnValue(Date.parse("2026-11-10T08:50:00Z"));
	await i18n.changeLanguage(language);
	const requests = ["pending", "approved", "rejected", "cancelled"].map(status => ({
		...request, name: `${status} meeting`, userRegistrationState: { id: status, status },
	}));
	requests.push({
		...request, name: "Earlier meeting", startsAt: "2026-11-10T08:45:00Z",
		endsAt: "2026-11-10T09:30:00Z", userRegistrationState: { id: "earlier", status: "approved" },
	});
	listRequests.mockResolvedValueOnce({ type: "loaded", requests });
	render(<AccountPage />);
	const approvedRow = (await screen.findByText("approved meeting")).closest("article")!;
	const link = within(approvedRow).getByRole("link", { name: label });
	const url = new URL(link.getAttribute("href")!);
	expect(screen.getAllByRole("link", { name: label })).toEqual([link]);
	expect(link.getAttribute("target")).toBe("_blank");
	expect(link.getAttribute("rel")).toBe("noopener noreferrer");
	expect(url.searchParams.get("text")).toBe("approved meeting");
	expect(url.searchParams.get("dates")).toBe("20261110T090000Z/20261110T094500Z");
});
it("removes calendar links as confirmed meetings start on the open account page", async () => {
	vi.useFakeTimers({ toFake: ["Date", "setTimeout", "clearTimeout"] });
	try {
		vi.setSystemTime(new Date("2026-11-10T08:59:59Z"));
		const first = { ...request, userRegistrationState: { id: "first", status: "approved" } };
		const second = { ...first, name: "Next meeting", startsAt: "2026-11-10T09:00:01Z", userRegistrationState: { id: "second", status: "approved" } };
		listRequests.mockResolvedValueOnce({ type: "loaded", requests: [first, second] });
		await act(async () => { render(<AccountPage />); });
		const calendarLink = { name: "Add to Google Calendar" };
		expect(screen.getAllByRole("link", calendarLink)).toHaveLength(2);

		act(() => { vi.advanceTimersByTime(1000); });
		const secondRow = screen.getByText("Next meeting").closest("article")!;
		expect(screen.getAllByRole("link", calendarLink)).toEqual([within(secondRow).getByRole("link", calendarLink)]);
		act(() => { vi.advanceTimersByTime(1000); });
		expect(screen.queryByRole("link", calendarLink)).toBeNull();
		expect(listRequests).toHaveBeenCalledOnce();
	} finally {
		vi.useRealTimers();
	}
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
	expect(screen.getByRole("link", { name: "No account? Book a meeting, and your account opens with it." }).getAttribute("href")).toBe("#/book");
	expect(listRequests).not.toHaveBeenCalled();
	expect(loadAcceptedTerms).not.toHaveBeenCalled();
});
it("shows the admission pass and Google ticket on the signed-out account gate", () => {
	context.session = null;
	render(<AccountPage />);
	const main = screen.getByRole("main");
	const pass = within(main).getByRole("complementary");
	expect(main.classList.contains("gate")).toBe(true);
	expect(within(pass).getByText("Your account")).toBeDefined();
	const google = within(main).getByRole("button", { name: "Continue with Google" });
	expect(google.classList.contains("ticket-ghost")).toBe(true);
	expect(google.querySelector('[aria-hidden="true"].stub')?.textContent).toBe("↗");
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
	["he", "לשמור את הפרטים", "שומרים…"],
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

function allowPasswordChange(...providers: string[]) {
	const session = context.session!;
	context.session = { ...session, user: {
		...session.user,
		identities: providers.map(provider => ({ id: provider, identity_id: provider, user_id: session.user.id, provider })),
	} };
}

it.each(["no identities", "Google only", "disabled", "no product", "no access", "signed out"])("hides the password section with %s", async reason => {
	if (reason === "Google only") allowPasswordChange("google");
	if (reason !== "no identities" && reason !== "Google only") allowPasswordChange("email");
	if (reason === "disabled") context.product = { ...context.product!, email_password_enabled: false };
	if (reason === "no product") context.product = null;
	if (reason === "no access") listRequests.mockResolvedValueOnce({ type: "no_access" });
	if (reason === "signed out") context.session = null;
	await act(async () => { render(<AccountPage />); });

	expect(screen.queryByRole("region", { name: "Password" })).toBeNull();
});

function fillPasswordChange(form: ReturnType<typeof within>, fields: readonly [string, string, string], confirmation = "new-password") {
	const inputs = fields.map(label => form.getByLabelText(label) as HTMLInputElement);
	["current-password", "new-password", confirmation].forEach((value, index) => fireEvent.change(inputs[index], { target: { value } }));
	return inputs;
}

const passwordCopy = {
	en: {
		title: "Password", save: "Change password", forgot: "Forgot your password?", signIn: "Sign in",
		fields: ["Current password", "New password", "New password, again"],
		outcomes: {
			password_changed: "Your password was changed.",
			signed_out: "Your password was changed. Sign in with your new password.",
			current_password_invalid: "The current password is incorrect.",
			bad_request: "Choose a different new password and try again.",
			rate_limited: "Too many attempts. Please try again later.",
			disabled: "Password changes are unavailable for this account.",
			failed: "We could not change your password. Please try again.",
		},
	},
	he: {
		title: "סיסמה", save: "לשנות סיסמה", forgot: "שכחת את הסיסמה?", signIn: "כניסה",
		fields: ["הסיסמה הנוכחית", "סיסמה חדשה", "הסיסמה החדשה, שוב"],
		outcomes: {
			password_changed: "הסיסמה שלך שונתה.",
			signed_out: "הסיסמה שלך שונתה. אפשר להיכנס עם הסיסמה החדשה.",
			current_password_invalid: "הסיסמה הנוכחית שגויה.",
			bad_request: "יש לבחור סיסמה חדשה אחרת ולנסות שוב.",
			rate_limited: "יותר מדי ניסיונות. כדאי לנסות שוב מאוחר יותר.",
			disabled: "שינוי סיסמה אינו זמין לחשבון הזה.",
			failed: "לא הצלחנו לשנות את הסיסמה. כדאי לנסות שוב.",
		},
	},
} as const;

describe.each(["en", "he"] as const)("password change in %s", language => {
	const copy = passwordCopy[language];
	beforeEach(async () => {
		await i18n.changeLanguage(language);
		allowPasswordChange("google", "email");
	});

	it.each(Object.entries(copy.outcomes))("shows the %s outcome and clears every password", async (outcome, message) => {
		let finish!: (value: string) => void;
		adapter.changePassword.mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
		const page = render(<AccountPage />);
		const section = within(await screen.findByRole("region", { name: copy.title }));
		expect(section.getByRole("link", { name: copy.forgot }).getAttribute("href")).toBe("#/forgot-password");
		const inputs = fillPasswordChange(section, copy.fields);
		const submit = section.getByRole("button", { name: copy.save });
		fireEvent.click(submit);
		fireEvent.click(submit);
		expect(adapter.changePassword).toHaveBeenCalledExactlyOnceWith("current-password", "new-password");
		for (const input of inputs) expect(input.disabled || input.matches(":disabled")).toBe(true);

		if (outcome === "password_changed") {
			context.session = { ...context.session!, access_token: "renewed" };
			page.rerender(<AccountPage />);
		}
		await act(async () => { finish(outcome); });

		await screen.findByText(message);
		for (const input of inputs) expect(input.value).toBe("");
		if (outcome === "signed_out") {
			expect(screen.getByRole("heading", { name: copy.signIn })).toBeDefined();
			expect(screen.queryByRole("region", { name: copy.title })).toBeNull();
		} else {
			expect(screen.getByRole("region", { name: copy.title })).toBeDefined();
			expect(screen.queryByRole("heading", { name: copy.signIn })).toBeNull();
		}
	});
});

it("clears mismatched passwords and keeps the SDK out of local validation", async () => {
	allowPasswordChange("email");
	render(<AccountPage />);
	const form = within(await screen.findByRole("region", { name: "Password" }));
	const inputs = fillPasswordChange(form, passwordCopy.en.fields, "different-password");
	fireEvent.click(form.getByRole("button", { name: "Change password" }));

	await form.findByText("The two passwords don't match.");
	expect(adapter.changePassword).not.toHaveBeenCalled();
	for (const input of inputs) expect(input.value).toBe("");
});

it.each(["provider clears the session", "another user signs in"])("handles a late signed-out password result when %s", async situation => {
	allowPasswordChange("email");
	let finish!: (value: "signed_out") => void;
	adapter.changePassword.mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
	const page = render(<AccountPage />);
	const form = within(await screen.findByRole("region", { name: "Password" }));
	fillPasswordChange(form, passwordCopy.en.fields);
	fireEvent.click(form.getByRole("button", { name: "Change password" }));

	const cleared = situation === "provider clears the session";
	const session = context.session!;
	context.session = cleared ? null : { ...session, access_token: "other", user: { ...session.user, id: "other" } };
	await act(async () => { page.rerender(<AccountPage />); });
	await act(async () => { finish("signed_out"); });

	if (cleared) {
		expect(screen.getByRole("heading", { name: "Sign in" })).toBeDefined();
		expect(screen.getByText(passwordCopy.en.outcomes.signed_out)).toBeDefined();
	} else {
		expect(screen.getByRole("region", { name: "Password" })).toBeDefined();
		expect(screen.queryByText(passwordCopy.en.outcomes.signed_out)).toBeNull();
		context.session = null;
		await act(async () => { page.rerender(<AccountPage />); });
		expect(screen.queryByText(passwordCopy.en.outcomes.signed_out)).toBeNull();
	}
});

function accessToken(sessionId: string, issuedAt: number) {
	return ["test", btoa(JSON.stringify({ session_id: sessionId, iat: issuedAt })).replace(/=+$/, ""), "test"].join(".");
}

it.each(["same session", "new session"])("scopes signed_out to the submitting session after a token change to a %s", async replacement => {
	allowPasswordChange("email");
	context.session = { ...context.session!, access_token: accessToken("original", 1) };
	let finish!: (value: "signed_out") => void;
	adapter.changePassword.mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
	const page = render(<AccountPage />);
	const form = within(await screen.findByRole("region", { name: "Password" }));
	fillPasswordChange(form, passwordCopy.en.fields);
	fireEvent.click(form.getByRole("button", { name: "Change password" }));

	const sameSession = replacement === "same session";
	context.session = { ...context.session, access_token: accessToken(sameSession ? "original" : "new", 2) };
	page.rerender(<AccountPage />);
	await act(async () => { finish("signed_out"); });

	expect(Boolean(screen.queryByText(passwordCopy.en.outcomes.signed_out))).toBe(sameSession);
	expect(Boolean(screen.queryByRole("heading", { name: "Sign in" }))).toBe(sameSession);
});

it.each(["before renewal", "after renewal"])("keeps the successful change when an old requests read finishes %s", async timing => {
	allowPasswordChange("email");
	let finishRead!: (value: { type: "signed_out" }) => void;
	let finishChange!: (value: "password_changed") => void;
	adapter.changePassword.mockReturnValueOnce(new Promise(resolve => { finishChange = resolve; }));
	const page = render(<AccountPage />);
	const form = within(await screen.findByRole("region", { name: "Password" }));
	listRequests.mockReturnValueOnce(new Promise(resolve => { finishRead = resolve; }));
	fireEvent(window, new Event("focus"));
	fillPasswordChange(form, passwordCopy.en.fields);
	fireEvent.click(form.getByRole("button", { name: "Change password" }));

	const signOut = screen.getByRole<HTMLButtonElement>("button", { name: "Sign out" });
	expect(signOut.disabled).toBe(true);
	fireEvent.click(signOut);
	expect(adapter.signOut).not.toHaveBeenCalled();
	if (timing === "before renewal") await act(async () => { finishRead({ type: "signed_out" }); });
	context.session = { ...context.session!, access_token: "renewed" };
	page.rerender(<AccountPage />);
	await act(async () => { finishChange("password_changed"); });
	if (timing === "after renewal") await act(async () => { finishRead({ type: "signed_out" }); });

	expect(screen.getByText(passwordCopy.en.outcomes.password_changed)).toBeDefined();
	expect(screen.queryByRole("heading", { name: "Sign in" })).toBeNull();
	expect(signOut.disabled).toBe(false);
});

it("shows success after the provider briefly clears the old session during renewal", async () => {
	allowPasswordChange("email");
	let finish!: (value: "password_changed") => void;
	adapter.changePassword.mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
	const page = render(<AccountPage />);
	const form = within(await screen.findByRole("region", { name: "Password" }));
	fillPasswordChange(form, passwordCopy.en.fields);
	fireEvent.click(form.getByRole("button", { name: "Change password" }));

	const session = context.session!;
	context = { ...context, session: null, loading: true };
	await act(async () => { page.rerender(<AccountPage />); });
	context = { ...context, session: { ...session, access_token: "renewed" }, loading: false };
	await act(async () => { page.rerender(<AccountPage />); finish("password_changed"); });

	await screen.findByText(passwordCopy.en.outcomes.password_changed);
	expect(screen.queryByRole("heading", { name: "Sign in" })).toBeNull();
});

it("retries the initial requests read when a renewed token supersedes its sign-out response", async () => {
	allowPasswordChange("email");
	let finishRead!: (value: { type: "signed_out" }) => void;
	listRequests.mockReturnValueOnce(new Promise(resolve => { finishRead = resolve; }));
	const page = render(<AccountPage />);
	context.session = { ...context.session!, access_token: "renewed" };
	await act(async () => { page.rerender(<AccountPage />); });
	await act(async () => { finishRead({ type: "signed_out" }); });

	await screen.findByRole("region", { name: "Password" });
	expect(listRequests).toHaveBeenCalledTimes(2);
});
