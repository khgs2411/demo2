import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { i18n } from "../../i18n";
import { BookingPage } from "./page";
import * as adapterModule from "./adapter";
import { makeBookingContext } from "./context-fixture";
import { saveBookingRedirect } from "./redirect";

vi.mock("@class-kit/react", () => ({ useProductContext: vi.fn() }));
let context: ReturnType<typeof adapterModule.useBookingContext>;
const fakeAdapter = {
	signIn: vi.fn().mockResolvedValue({ type: "signed_in", userId: "visitor" }),
	signUp: vi.fn().mockResolvedValue({ type: "signed_in", userId: "visitor" }),
	signInWithGoogle: vi.fn().mockResolvedValue({ type: "auth_redirect_started" }),
	saveProfile: vi.fn().mockResolvedValue({ type: "profile_saved" }),
	loadSlots: vi.fn().mockResolvedValue({ type: "booking_not_open" }),
	requestRegistration: vi.fn(), listRequests: vi.fn().mockResolvedValue({ type: "loaded", requests: [] }), cancelRequest: vi.fn(),
	signOut: vi.fn(),
};
beforeEach(async () => {
	vi.restoreAllMocks(); vi.clearAllMocks(); sessionStorage.clear();
	context = makeBookingContext();
	vi.spyOn(adapterModule, "useBookingContext").mockImplementation(() => context);
	vi.spyOn(adapterModule, "createBookingAdapter").mockReturnValue(fakeAdapter);
	await i18n.changeLanguage("en");
});
afterEach(cleanup);

it("prefills the route package, gates auth providers, saves profile and renders closed templates", async () => {
	render(<BookingPage packageId="system" />);
	fireEvent.click(screen.getByRole("button", { name: "Continue" }));
	expect(screen.getByRole("button", { name: "Continue with Google" })).toBeDefined();
	fireEvent.change(screen.getByLabelText("Email"), { target: { value: "test@example.com" } });
	fireEvent.change(screen.getByLabelText("Password"), { target: { value: "test-password" } });
	fireEvent.click(screen.getByRole("button", { name: "Create account" }));
	await screen.findByLabelText("Full name");
	for (const [label, value] of [["Full name", "Dana"], ["Phone", "0501234567"], ["Business name", "Dana Studio"]]) fireEvent.change(screen.getByLabelText(label), { target: { value } });
	fireEvent.click(screen.getByRole("button", { name: "Continue" }));
	await screen.findByText("The calendar isn't open yet.");
	expect(fakeAdapter.saveProfile).toHaveBeenCalledWith(expect.objectContaining({ displayName: "Dana", businessName: "Dana Studio" }), expect.objectContaining({ packageId: "system" }));
	expect(screen.queryByRole("button", { name:"Send request" })).toBeNull();
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
