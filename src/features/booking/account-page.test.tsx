import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
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
const adapter = { signIn:vi.fn(), signUp:vi.fn(), signInWithGoogle:vi.fn(), saveProfile:vi.fn(),loadSlots:vi.fn(),requestRegistration:vi.fn(),listRequests,cancelRequest,signOut:vi.fn() };
beforeEach(async () => {
	vi.restoreAllMocks(); vi.resetAllMocks();
	context = { ...makeBookingContext(), session:{access_token:"test",refresh_token:"test",token_type:"bearer",expires_in:3600,user:{id:"visitor",app_metadata:{},user_metadata:{},aud:"authenticated",created_at:"2026-11-07"}} };
	vi.spyOn(adapterModule,"useBookingContext").mockImplementation(() => context);
	vi.spyOn(adapterModule,"createBookingAdapter").mockReturnValue(adapter);
	listRequests.mockResolvedValue({type:"loaded",requests:[request]});
	await i18n.changeLanguage("en");
});
afterEach(cleanup);
it("renders all backend statuses and only allowed cancellation controls", async () => {
	listRequests.mockResolvedValueOnce({type:"loaded",requests:["pending","approved","rejected","cancelled"].map(status => ({...request,id:status,canCancelRegistration:status==="pending",userRegistrationState:{id:status,status}}))});
	render(<AccountPage />);
	for (const label of ["Awaiting confirmation","Confirmed","Declined","Cancelled"]) expect(await screen.findByText(label)).toBeDefined();
	expect(screen.getAllByRole("button",{name:"Cancel request"})).toHaveLength(1);
	expect(screen.getByRole("link",{name:"Another meeting"}).getAttribute("href")).toBe("#/book");
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
	expect(screen.getByRole("button",{name:"Continue with Google"})).toBeDefined();
	expect(listRequests).not.toHaveBeenCalled();
});
