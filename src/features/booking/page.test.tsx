import { webcrypto } from "node:crypto";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { i18n } from "../../i18n";
import { BookingPage } from "./page";
import type { BookingEvent } from "./machine";
import * as adapterModule from "./adapter";
import { makeBookingContext } from "./context-fixture";
import { saveBookingRedirect, saveBookingAuthRedirect } from "./redirect";
import { formatWhen, weekRange } from "./calendar";

vi.mock("@class-kit/react", () => ({ useProductContext: vi.fn() }));
let context: ReturnType<typeof adapterModule.useBookingContext>;
const fakeAdapter = {
	signIn: vi.fn().mockResolvedValue({ type: "signed_in", userId: "visitor" }),
	signUp: vi.fn().mockResolvedValue({ type: "signed_in", userId: "visitor" }),
	loadTerms: vi.fn(), requestWithSignup: vi.fn(), loadProfile: vi.fn().mockResolvedValue({ type: "profile_loaded", profile: null }),
	signInWithGoogle: vi.fn().mockResolvedValue({ type: "auth_redirect_started" }),
	saveProfile: vi.fn().mockResolvedValue({ type: "profile_saved" }),
	loadSlots: vi.fn().mockResolvedValue({ type: "booking_not_open" }),
	requestRegistration: vi.fn(), listRequests: vi.fn().mockResolvedValue({ type: "loaded", requests: [] }), cancelRequest: vi.fn(),
	signOut: vi.fn(),
};
beforeEach(async () => {
	vi.restoreAllMocks(); vi.clearAllMocks(); sessionStorage.clear();
	context = makeBookingContext();
	vi.stubGlobal("crypto", webcrypto);
	fakeAdapter.loadSlots.mockReset().mockResolvedValue({ type: "booking_not_open" });
	fakeAdapter.loadTerms.mockReset().mockResolvedValue({ type: "terms_load_failed" });
	vi.spyOn(adapterModule, "useBookingContext").mockImplementation(() => context);
	vi.spyOn(adapterModule, "createBookingAdapter").mockReturnValue(fakeAdapter);
	await i18n.changeLanguage("en");
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

async function openSignup() {
	const date = new Date(); date.setDate(date.getDate() - (date.getDay()+6)%7 + 1); date.setHours(9,0,0,0);
	const slot = { id: "s", startsAt: date.toISOString(), canRegister: true, canCancelRegistration: false, userRegistrationState: null };
	const terms = { title: "Studio terms", text: "Published studio terms", version: 3, locale: "en" };
	fakeAdapter.loadSlots.mockResolvedValueOnce({ type: "slots_loaded", slots: [slot] });
	fakeAdapter.loadTerms.mockResolvedValueOnce({ type: "terms_loaded", terms });
	render(<BookingPage packageId="system" />);
	fireEvent.click(screen.getByRole("button", { name: "Continue" }));
	fireEvent.click(await screen.findByRole("button", { name: /\d{2}:\d{2}/ }));
	fireEvent.click(screen.getByRole("button", { name: "Continue" }));
	await screen.findByText("Published studio terms");
	expect(screen.getByRole("button", { name: "Continue with Google" })).toBeDefined();
	for (const [label, value] of [["Full name", "Dana"], ["Email", "test@example.com"], ["Phone", "0501234567"]]) {
		fireEvent.change(screen.getByLabelText(label), { target: { value } });
	}
	return { terms, slot };
}

it("books from published terms and shows the copyable generated password on the receipt", async () => {
	fakeAdapter.requestWithSignup.mockResolvedValueOnce({
		type: "signup_registered", userId: "visitor", registration: { id: "real-request", classId: "s", status: "pending" },
		credentials: { password: "abcdefghijklmnop", formatted: "abcd efgh ijkl mnop" },
	});
	const writeText = vi.fn().mockResolvedValue(undefined);
	Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
	const { terms } = await openSignup();
	const send = screen.getByRole("button", { name: "Send request" });
	expect((send as HTMLButtonElement).disabled).toBe(true);
	fireEvent.click(screen.getByRole("checkbox", { name: "I accept the terms of service" }));
	fireEvent.submit(send.closest("form")!);
	fireEvent.submit(send.closest("form")!);
	await screen.findByText("Request sent.");
	expect(fakeAdapter.requestWithSignup).toHaveBeenCalledExactlyOnceWith("s", { displayName: "Dana", email: "test@example.com", phone: "0501234567" }, terms);
	expect(fakeAdapter.requestRegistration).not.toHaveBeenCalled();
	expect(screen.getAllByText("abcd efgh ijkl mnop")).toHaveLength(1);
	expect(within(screen.getByRole("complementary")).getByText("№ real-request")).toBeDefined();
	fireEvent.click(screen.getByRole("button", { name: "Copy password" }));
	await screen.findByText("Password copied.");
	expect(writeText).toHaveBeenCalledExactlyOnceWith("abcdefghijklmnop");
	Reflect.deleteProperty(navigator, "clipboard");
});
it.each([
	["rate_limited", "Too many requests."],
	["signup_failed", "We could not send your request."],
	["disabled", "Booking with a new account is unavailable."],
	["not_found", "This time is no longer available."],
	["bad_request", "Check your details"],
	["terms_unavailable", "The terms of service are unavailable."],
])("shows a message for %s and preserves the submitted details", async (type, message) => {
	fakeAdapter.requestWithSignup.mockResolvedValueOnce({ type });
	await openSignup();
	fireEvent.click(screen.getByRole("checkbox", { name: "I accept the terms of service" }));
	fireEvent.submit(screen.getByRole("button", { name: "Send request" }).closest("form")!);
	expect((await screen.findByRole("alert")).textContent).toContain(message);
	expect((screen.getByLabelText("Full name") as HTMLInputElement).value).toBe("Dana");
});

it("reloads changed terms and waits for fresh consent", async () => {
	fakeAdapter.requestWithSignup.mockResolvedValueOnce({ type: "terms_changed" });
	await openSignup();
	fakeAdapter.loadTerms.mockResolvedValueOnce({ type: "terms_loaded", terms: { title: "Studio terms", text: "Updated studio terms", version: 4, locale: "en" } });
	fireEvent.click(screen.getByRole("checkbox", { name: "I accept the terms of service" }));
	fireEvent.submit(screen.getByRole("button", { name: "Send request" }).closest("form")!);
	await screen.findByText("Updated studio terms");
	expect(screen.getByRole("alert").textContent).toContain("have changed");
	expect((screen.getByRole("checkbox") as HTMLInputElement).checked).toBe(false);
	expect((screen.getByRole("button", { name: "Send request" }) as HTMLButtonElement).disabled).toBe(true);
});

it("prefills an existing account’s email and sends the selected request after password sign-in", async () => {
	fakeAdapter.requestWithSignup.mockResolvedValueOnce({ type: "account_exists", email: "test@example.com", contact: { displayName: "Dana", phoneNumber: "0501234567" } });
	fakeAdapter.requestRegistration.mockResolvedValueOnce([{ type: "registration_requested", registration: { id: "real-request", classId: "s", status: "pending" } }]);
	const { slot } = await openSignup();
	const time = formatWhen(slot.startsAt, "en", Intl.DateTimeFormat().resolvedOptions().timeZone);
	fireEvent.click(screen.getByRole("checkbox", { name: "I accept the terms of service" }));
	fireEvent.submit(screen.getByRole("button", { name: "Send request" }).closest("form")!);
	expect((await screen.findByRole("alert")).textContent).toContain("An account already exists");
	expect((screen.getByLabelText("Email") as HTMLInputElement).value).toBe("test@example.com");
	expect(within(screen.getByRole("complementary")).getByText(time)).toBeDefined();
	fireEvent.change(screen.getByLabelText("Password"), { target: { value: "test-password" } });
	fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
	await screen.findByDisplayValue("Dana");
	expect(within(screen.getByRole("complementary")).getByText(time)).toBeDefined();
	expect(screen.getByDisplayValue("0501234567")).toBeDefined();
	expect(fakeAdapter.requestRegistration).not.toHaveBeenCalled();
	fireEvent.change(screen.getByLabelText("Business name"), { target: { value: "Dana Studio" } });
	fireEvent.click(screen.getByRole("button", { name: "Continue" }));
	await screen.findByText("Request sent.");
	expect(fakeAdapter.requestRegistration).toHaveBeenCalledExactlyOnceWith("s", "system", expect.anything());
});

it("shows the unavailable time before allowing an anonymous client to choose another", async () => {
	fakeAdapter.requestWithSignup.mockResolvedValueOnce({ type: "class_unavailable" });
	await openSignup();
	fireEvent.click(screen.getByRole("checkbox", { name: "I accept the terms of service" }));
	fireEvent.submit(screen.getByRole("button", { name: "Send request" }).closest("form")!);
	expect((await screen.findByRole("alert")).textContent).toContain("pick another time");
	expect(fakeAdapter.loadSlots).toHaveBeenCalledTimes(2);
});

it("shows the password when an account was created but the time filled, then returns to signed-in time choice", async () => {
	fakeAdapter.requestWithSignup.mockResolvedValueOnce({
		type: "account_created_class_unavailable", userId: "visitor", credentials: { password: "abcDef", formatted: "abcD ef" },
	});
	await openSignup();
	fakeAdapter.loadSlots.mockResolvedValueOnce({ type: "slots_loaded", slots: [] });
	fireEvent.click(screen.getByRole("checkbox", { name: "I accept the terms of service" }));
	fireEvent.submit(screen.getByRole("button", { name: "Send request" }).closest("form")!);
	await screen.findByText("abcD ef");
	fireEvent.click(screen.getByRole("button", { name: "Continue" }));
	expect((await screen.findByRole("alert")).textContent).toContain("pick another time");
	expect(screen.queryByText("abcD ef")).toBeNull();
	expect(screen.getByRole("button", { name: "Send request" })).toBeDefined();
});

it("shows the issued password after failed automatic sign-in and clears it when continuing", async () => {
	fakeAdapter.requestWithSignup.mockResolvedValueOnce({ type: "sign_in_failed", email: "test@example.com", credentials: { password: "abcDef", formatted: "abcD ef" } });
	await openSignup();
	fireEvent.click(screen.getByRole("checkbox", { name: "I accept the terms of service" }));
	fireEvent.submit(screen.getByRole("button", { name: "Send request" }).closest("form")!);
	await screen.findByText("abcD ef");
	fireEvent.click(screen.getByRole("button", { name: "Continue" }));
	expect((screen.getByLabelText("Email") as HTMLInputElement).value).toBe("test@example.com");
	expect(screen.queryByText("abcD ef")).toBeNull();
});

it("hides disallowed auth methods and signup for invite-only products", () => {
	context.product = { ...context.product!, auth_mode: "invite_only", google_oauth_enabled: false };
	render(<BookingPage />);
	fireEvent.click(screen.getByRole("button", { name:"Continue" }));
	expect(screen.queryByRole("button", { name:"Continue with Google" })).toBeNull();
	expect(screen.queryByRole("button", { name:"Create account" })).toBeNull();
	expect(screen.getByRole("button", { name:"Sign in" })).toBeDefined();
});
it("restores OAuth only after the provider session is loaded and revalidates the saved slot", async () => {
	saveBookingRedirect({ step:"choosing_slot", selection:{ packageId:"system", addonInterests:[], slotId:"s" }, userId:"visitor", availability:"loading", slots:[], notice:null });
	context.loading = true;
	const view = render(<BookingPage />);
	expect(fakeAdapter.loadSlots).not.toHaveBeenCalled();
	context = { ...context, loading:false, session:{ access_token:"test", refresh_token:"test", token_type:"bearer", expires_in:3600, user:{ id:"visitor", app_metadata:{}, user_metadata:{}, aud:"authenticated", created_at:"2026-11-07" } } };
	view.rerender(<BookingPage />);
	await screen.findByText("The calendar isn't open yet.");
	expect(fakeAdapter.loadSlots).toHaveBeenCalledOnce();
});

it("submits once, stamps the real request, then cancels using backend permission and status", async () => {
	const date = new Date(); date.setDate(date.getDate() - (date.getDay()+6)%7 + 1); date.setHours(9,0,0,0);
	const slot = { id:"s", startsAt:date.toISOString(), canRegister:true, canCancelRegistration:false, userRegistrationState:null };
	context = { ...context, session:{access_token:"test",refresh_token:"test",token_type:"bearer",expires_in:3600,user:{id:"visitor",app_metadata:{},user_metadata:{},aud:"authenticated",created_at:"2026-11-07"}} };
	saveBookingRedirect({step:"choosing_slot",selection:{packageId:"system",addonInterests:[],slotId:"s"},userId:"visitor",slots:[],availability:"loading",notice:null});
	fakeAdapter.loadSlots.mockResolvedValueOnce({type:"slots_loaded",slots:[slot]});
	fakeAdapter.requestRegistration.mockResolvedValueOnce([{type:"registration_requested",registration:{id:"real-request",classId:"s",status:"pending"}}]);
	fakeAdapter.listRequests.mockResolvedValueOnce({type:"loaded",requests:[{...slot,name:"Business meeting",canCancelRegistration:true,userRegistrationState:{id:"real-request",status:"pending"}}]});
	fakeAdapter.cancelRequest.mockResolvedValueOnce([{type:"cancel_completed",registration:{id:"real-request",classId:"s",status:"cancelled"}},{type:"loaded",requests:[]}]);
	render(<BookingPage />);
	const send = await screen.findByRole("button",{name:"Send request"});
	await waitFor(() => expect((send as HTMLButtonElement).disabled).toBe(false));
	fireEvent.click(send); fireEvent.click(send);
	await screen.findByText("Request sent.");
	expect(fakeAdapter.requestRegistration).toHaveBeenCalledOnce();
	expect(within(screen.getByRole("complementary")).getByText("№ real-request")).toBeDefined();
	fireEvent.click(await screen.findByRole("button",{name:"Cancel request"}));
	await screen.findByText("Cancelled");
	expect(fakeAdapter.cancelRequest).toHaveBeenCalledOnce();
});

it("renders a refreshed capacity-race notice and requires another explicit selection", async () => {
	const date = new Date(); date.setDate(date.getDate() - (date.getDay()+6)%7 + 1); date.setHours(9,0,0,0);
	const slot = {id:"s",startsAt:date.toISOString(),canRegister:true,canCancelRegistration:false,userRegistrationState:null};
	context = { ...context, session:{access_token:"test",refresh_token:"test",token_type:"bearer",expires_in:3600,user:{id:"visitor",app_metadata:{},user_metadata:{},aud:"authenticated",created_at:"2026-11-07"}} };
	saveBookingRedirect({step:"choosing_slot",selection:{packageId:"system",addonInterests:[],slotId:"s"},userId:"visitor",slots:[],availability:"loading",notice:null});
	fakeAdapter.loadSlots.mockResolvedValueOnce({type:"slots_loaded",slots:[slot]});
	fakeAdapter.requestRegistration.mockResolvedValueOnce([{type:"slot_full"},{type:"slots_loaded",slots:[{...slot,canRegister:false}]}]);
	render(<BookingPage />);
	const send = await screen.findByRole("button",{name:"Send request"});
	await waitFor(() => expect((send as HTMLButtonElement).disabled).toBe(false));
	fireEvent.click(send);
	await screen.findByText("That time just filled up. The calendar is refreshed; pick another time.");
	expect((screen.getByRole("button",{name:"Send request"}) as HTMLButtonElement).disabled).toBe(true);
	expect(fakeAdapter.requestRegistration).toHaveBeenCalledOnce();
});

it("prefills name and phone from the signed-in profile and sends the request through regular registration", async () => {
	const date = new Date(); date.setDate(date.getDate() - (date.getDay()+6)%7 + 1); date.setHours(9,0,0,0);
	const slot = { id: "s", startsAt: date.toISOString(), canRegister: true, canCancelRegistration: false, userRegistrationState: null };
	context = { ...context, session: { access_token: "test", refresh_token: "test", token_type: "bearer", expires_in: 3600, user: { id: "visitor", app_metadata: {}, user_metadata: {}, aud: "authenticated", created_at: "2026-11-07" } } };
	fakeAdapter.loadProfile.mockResolvedValueOnce({ type: "profile_loaded", profile: { displayName: "Dana", phoneNumber: "0501234567", businessName: "Dana Studio" } });
	fakeAdapter.loadSlots.mockResolvedValueOnce({ type: "slots_loaded", slots: [slot] });
	fakeAdapter.requestRegistration.mockResolvedValueOnce([{ type: "registration_requested", registration: { id: "real-request", classId: "s", status: "pending" } }]);
	render(<BookingPage packageId="system" />);
	fireEvent.click(screen.getByRole("button", { name: "Continue" }));
	await screen.findByDisplayValue("Dana");
	expect(screen.getByDisplayValue("0501234567")).toBeDefined();
	fireEvent.click(screen.getByRole("button", { name: "Continue" }));
	fireEvent.click(await screen.findByRole("button", { name: /\d{2}:\d{2}/ }));
	fireEvent.click(screen.getByRole("button", { name: "Send request" }));
	await screen.findByText("Request sent.");
	expect(fakeAdapter.saveProfile).toHaveBeenCalledWith(expect.objectContaining({ displayName: "Dana", businessName: "Dana Studio" }), expect.objectContaining({ packageId: "system" }));
	expect(fakeAdapter.requestRegistration).toHaveBeenCalledOnce();
	expect(fakeAdapter.requestWithSignup).not.toHaveBeenCalled();
	expect(screen.queryByText("Copy password")).toBeNull();
});

it("starts Google once when the provider reports a revoked booking session and displays no auth error", async () => {
	const page = render(<BookingPage />);
	context = { ...context, sessionErrorCode: "session_revoked" };
	page.rerender(<BookingPage />);
	await waitFor(() => expect(fakeAdapter.signInWithGoogle).toHaveBeenCalledOnce());
	page.rerender(<BookingPage />);
	expect(fakeAdapter.signInWithGoogle).toHaveBeenCalledOnce();
	expect(screen.queryByRole("alert")).toBeNull();
});

it("finishes an existing account request after the same email returns from Google", async () => {
	const slot = { id: "s", startsAt: "2026-12-08T09:00:00Z", canRegister: true, canCancelRegistration: false, userRegistrationState: null };
	await saveBookingAuthRedirect({
		step: "signing_in_for_signup", selection: { packageId: "system", addonInterests: [], slotId: "s" },
		email: "test@example.com", continuation: { kind: "book", slot, contact: { displayName: "Dana", phoneNumber: "0501234567" } },
	});
	context = { ...context, session: { access_token: "test", refresh_token: "test", token_type: "bearer", expires_in: 3600, user: { id: "visitor", email: "test@example.com", app_metadata: {}, user_metadata: {}, aud: "authenticated", created_at: "2026-11-07" } } };
	fakeAdapter.requestRegistration.mockResolvedValueOnce([{ type: "registration_requested", registration: { id: "google-request", classId: "s", status: "pending" } }]);
	fakeAdapter.loadProfile.mockResolvedValueOnce({ type: "profile_loaded", profile: { displayName: "Saved name", phoneNumber: "", businessName: "Studio" } });
	render(<BookingPage />);
	await screen.findByDisplayValue("Saved name");
	expect(screen.getByDisplayValue("0501234567")).toBeDefined();
	fireEvent.click(screen.getByRole("button", { name: "Continue" }));
	await screen.findByText("Request sent.");
	expect(fakeAdapter.requestRegistration).toHaveBeenCalledExactlyOnceWith("s", "system", weekRange(new Date(slot.startsAt)));
});

it("retains the route package when a signed-in client visits a closed calendar", async () => {
	context = { ...context, session: { access_token: "test", refresh_token: "test", token_type: "bearer", expires_in: 3600, user: { id: "visitor", app_metadata: {}, user_metadata: {}, aud: "authenticated", created_at: "2026-11-07" } } };
	fakeAdapter.loadProfile.mockResolvedValueOnce({ type: "profile_loaded", profile: { displayName: "Dana", phoneNumber: "0501234567", businessName: "Dana Studio" } });
	render(<BookingPage packageId="site" />);
	fireEvent.click(screen.getByRole("button", { name: "Continue" }));
	await screen.findByDisplayValue("Dana");
	fireEvent.click(screen.getByRole("button", { name: "Continue" }));
	await screen.findByText("The calendar isn't open yet.");
	expect(fakeAdapter.saveProfile).toHaveBeenCalledWith(expect.objectContaining({ displayName: "Dana", businessName: "Dana Studio" }), expect.objectContaining({ packageId: "site" }));
	expect(screen.queryByRole("button", { name: "Send request" })).toBeNull();
});

it("keeps a visible notice and asks for consent when previously unavailable terms are reloaded", async () => {
	fakeAdapter.requestWithSignup.mockResolvedValueOnce({ type: "terms_unavailable" });
	await openSignup();
	fakeAdapter.loadTerms.mockResolvedValueOnce({ type: "terms_loaded", terms: { title: "Studio terms", text: "Republished studio terms", version: 4, locale: "en" } });
	fireEvent.click(screen.getByRole("checkbox", { name: "I accept the terms of service" }));
	fireEvent.submit(screen.getByRole("button", { name: "Send request" }).closest("form")!);
	await screen.findByText("Republished studio terms");
	expect(screen.getByRole("alert").textContent).toContain("The previous terms were unavailable.");
	expect((screen.getByRole("checkbox") as HTMLInputElement).checked).toBe(false);
});

it("does not submit a saved request when Google returns a different email", async () => {
	const slot = { id: "s", startsAt: "2026-12-08T09:00:00Z", canRegister: true, canCancelRegistration: false, userRegistrationState: null };
	await saveBookingAuthRedirect({
		step: "signing_in_for_signup", selection: { packageId: "system", addonInterests: [], slotId: "s" },
		email: "test@example.com", continuation: { kind: "book", slot, contact: { displayName: "Dana", phoneNumber: "0501234567" } },
	});
	context = { ...context, session: { access_token: "test", refresh_token: "test", token_type: "bearer", expires_in: 3600, user: { id: "visitor", email: "different@example.com", app_metadata: {}, user_metadata: {}, aud: "authenticated", created_at: "2026-11-07" } } };
	render(<BookingPage />);
	await screen.findByLabelText("Full name");
	expect(fakeAdapter.requestRegistration).not.toHaveBeenCalled();
});


it("does not retry failed Google recovery when the package draft changes", async () => {
	fakeAdapter.signInWithGoogle.mockResolvedValueOnce({ type: "operation_failed", operation: "auth", reason: "generic" });
	const page = render(<BookingPage />);
	context = { ...context, sessionErrorCode: "session_revoked" };
	page.rerender(<BookingPage />);
	const back = () => screen.getByRole("button", { name: "Back" }) as HTMLButtonElement;
	await waitFor(() => expect(back().disabled).toBe(false));
	fireEvent.click(back());
	fireEvent.click(screen.getByRole("radio", { name: /Landing or product page/ }));
	expect(fakeAdapter.signInWithGoogle).toHaveBeenCalledOnce();
});

it("shows a generic notice and the password if the signup receipt names the wrong time", async () => {
	fakeAdapter.requestWithSignup.mockResolvedValueOnce({
		type: "signup_registered", userId: "visitor", credentials: { password: "abcDef", formatted: "abcD ef" },
		registration: { id: "wrong-receipt", classId: "other-slot", status: "pending" },
	});
	await openSignup();
	fireEvent.click(screen.getByRole("checkbox", { name: "I accept the terms of service" }));
	fireEvent.submit(screen.getByRole("button", { name: "Send request" }).closest("form")!);
	await screen.findByText("abcD ef");
	expect(screen.getByRole("alert").textContent).toContain("We could not verify your meeting request.");
	expect(screen.queryByText("Request sent.")).toBeNull();
});

it.each([undefined, { id: "r", classId: "s", status: "pending" }])("shows account-created guidance and returns to the same time from sign-in", async registration => {
	fakeAdapter.requestWithSignup.mockResolvedValueOnce({
		type: "sign_in_failed", email: "test@example.com", registration, credentials: { password: "abcDef", formatted: "abcD ef" },
	});
	const { slot } = await openSignup();
	fakeAdapter.loadSlots.mockResolvedValueOnce({ type: "slots_loaded", slots: [slot] });
	fireEvent.click(screen.getByRole("checkbox", { name: "I accept the terms of service" }));
	fireEvent.submit(screen.getByRole("button", { name: "Send request" }).closest("form")!);
	await screen.findByText("abcD ef");
	fireEvent.click(screen.getByRole("button", { name: "Continue" }));
	expect(screen.getByText("Your account was created. Use your new password to sign in.")).toBeDefined();
	fireEvent.click(screen.getByRole("button", { name: "Back" }));
	expect(await screen.findByRole("button", { name: /\d{2}:\d{2}/, pressed: true })).toBeDefined();
	expect(screen.queryByText("abcD ef")).toBeNull();
});

it("offers a visible retry if manual sign-in fails after automatic Google recovery", async () => {
	fakeAdapter.signInWithGoogle.mockResolvedValueOnce({ type: "operation_failed", operation: "auth", reason: "generic" });
	fakeAdapter.signIn.mockResolvedValueOnce({ type: "operation_failed", operation: "auth", reason: "generic" });
	const page = render(<BookingPage />);
	context = { ...context, sessionErrorCode: "session_revoked" };
	page.rerender(<BookingPage />);
	const signIn = () => screen.getByRole("button", { name: "Sign in" }) as HTMLButtonElement;
	await waitFor(() => expect(signIn().disabled).toBe(false));
	fireEvent.change(screen.getByLabelText("Email"), { target: { value: "test@example.com" } });
	fireEvent.change(screen.getByLabelText("Password"), { target: { value: "wrong-password" } });
	fireEvent.click(signIn());
	expect((await screen.findByRole("alert")).textContent).toContain("We could not sign you in.");
	fireEvent.click(screen.getByRole("button", { name: "Try again" }));
	expect(signIn().disabled).toBe(false);
	expect(fakeAdapter.signInWithGoogle).toHaveBeenCalledOnce();
});

it("starts recovery only after an existing Google attempt settles", async () => {
	let finishManual!: (event: BookingEvent) => void;
	fakeAdapter.signInWithGoogle.mockReturnValueOnce(new Promise<BookingEvent>(resolve => { finishManual = resolve; }));
	context = { ...context, product: { ...context.product!, auth_mode: "invite_only" } };
	const page = render(<BookingPage />);
	fireEvent.click(screen.getByRole("button", { name: "Continue" }));
	fireEvent.click(await screen.findByRole("button", { name: "Continue with Google" }));
	await waitFor(() => expect(fakeAdapter.signInWithGoogle).toHaveBeenCalledOnce());
	context = { ...context, sessionErrorCode: "session_revoked" };
	page.rerender(<BookingPage />);
	expect(fakeAdapter.signInWithGoogle).toHaveBeenCalledOnce();
	finishManual({ type: "operation_failed", operation: "auth", reason: "generic" });
	await waitFor(() => expect(fakeAdapter.signInWithGoogle).toHaveBeenCalledTimes(2));
	expect(screen.queryByRole("alert")).toBeNull();
});
