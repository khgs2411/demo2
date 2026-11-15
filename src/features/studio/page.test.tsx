import { cleanup, render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { useProductContext } from "@class-kit/react";
import { i18n } from "../../i18n";
import { StudioPage } from "./page";
import { registration } from "./fixtures";


vi.mock("@class-kit/react", () => ({ useProductContext: vi.fn() }));
let context: ReturnType<typeof useProductContext>;
const listPending = vi.fn();
const listRegistered = vi.fn();
const approve = vi.fn();
const reject = vi.fn();
const signIn = vi.fn();
const signOut = vi.fn();
const signInWithGoogle = vi.fn();
beforeEach(async () => {
	vi.resetAllMocks(); sessionStorage.clear();
	context = {
		client: { management: { registrations: {listPending,listRegistered,approve,reject} }, auth: {signIn,signOut,signInWithGoogle} } as unknown as NonNullable<ReturnType<typeof useProductContext>["client"]>,
		productKey:"demo", product:{product_key:"demo",name:"Demo",auth_mode:"open",email_password_enabled:true,google_oauth_enabled:true,auth_redirects:[]},
		productUser:null, productAccess:null, capabilities:{permissions:[],dashboard:{can_enter:false,can_manage_classes:false,can_manage_roles:false,can_manage_users:false,can_manage_auth_mode:false,can_read_customers:false,can_read_memberships:false}},
		session:null,loading:false,error:null,refreshProductContext:vi.fn().mockResolvedValue(undefined),signIn:vi.fn(),signOut:vi.fn(),signUp:vi.fn(),signInWithGoogle:vi.fn(),
	};
	vi.mocked(useProductContext).mockImplementation(() => context);
	listPending.mockResolvedValue({registrations:[]}); listRegistered.mockResolvedValue({registrations:[]});
	await i18n.changeLanguage("en");
});
afterEach(cleanup);
function signedIn() {
	context.session = {access_token:"test",refresh_token:"test",token_type:"bearer",expires_in:3600,user:{id:"manager",app_metadata:{},user_metadata:{},aud:"authenticated",created_at:"2026-11-15"}};
}

it.each(["he","en"])("offers only sign-in while signed out, without registration reads (%s)", async language => {
	await i18n.changeLanguage(language);
	render(<StudioPage />);
	expect(screen.getByRole("button",{name:i18n.t("signIn",{ns:"booking"})})).toBeDefined();
	expect(screen.queryByText(i18n.t("createAccount",{ns:"booking"}))).toBeNull();
	expect(screen.queryByText(i18n.t("aLede",{ns:"booking"}))).toBeNull();
	expect(listPending).not.toHaveBeenCalled(); expect(listRegistered).not.toHaveBeenCalled();
});

it("waits for context and denies non-managers without reading registrations", async () => {
	context.loading = true;
	const view = render(<StudioPage />);
	expect(screen.getByRole("status").textContent).toBe("Loading…");
	expect(listPending).not.toHaveBeenCalled();
	context.loading = false; signedIn(); view.rerender(<StudioPage />);
	expect(screen.getByText("This page is for the studio manager.")).toBeDefined();
	expect(screen.getByRole("button",{name:"Sign out"})).toBeDefined();
	expect(listPending).not.toHaveBeenCalled(); expect(listRegistered).not.toHaveBeenCalled();
});

it.each(["role", "permission"])("loads empty sections for manager access granted by %s", async grant => {
	signedIn();
	if (grant === "role") context.productUser = {role:"manager"} as NonNullable<typeof context.productUser>;
	else context.capabilities.permissions = ["registrations.manage"];
	render(<StudioPage />);
	await screen.findByText("No requests waiting.");
	expect(screen.getByText("No upcoming meetings.")).toBeDefined();
	expect(listPending).toHaveBeenCalledWith(); expect(listRegistered).toHaveBeenCalledWith();
});

it.each(["he","en"])("shows customer contact, package and local start without an end time (%s)", async language => {
	await i18n.changeLanguage(language);
	signedIn(); context.capabilities.permissions = ["registrations.manage"];
	listPending.mockResolvedValue({registrations:[registration("r","2026-11-01T08:00:00Z","2099-11-17T09:00:00Z")]});
	render(<StudioPage />);
	await screen.findByText("Dana");
	for (const value of ["dana@example.com","0501234567","Business website"]) expect(screen.getByText(value)).toBeDefined();
	expect(screen.getByRole("button",{name:i18n.t("approve",{ns:"studio"})})).toBeDefined();
	expect(screen.getByRole("button",{name:i18n.t("reject",{ns:"studio"})})).toBeDefined();
	expect(screen.getByLabelText(i18n.t("reason",{ns:"studio"}))).toBeDefined();
	expect(document.querySelectorAll("time")).toHaveLength(2);
	expect(document.querySelector('time[datetime="2099-11-17T09:00:00Z"]')?.textContent).toBe(new Intl.DateTimeFormat(language === "he" ? "he-IL" : "en-GB",{dateStyle:"medium",timeStyle:"short"}).format(new Date("2099-11-17T09:00:00Z")));
});

it.each(["approve","reject"] as const)("waits for %s and refetches both lists, without duplicate submissions or optimistic moves", async action => {
	signedIn(); context.capabilities.permissions = ["registrations.manage"];
	const row = registration("r","2026-11-01","2099-11-17");
	listPending.mockResolvedValueOnce({registrations:[row]}).mockResolvedValue({registrations:[]});
	listRegistered.mockResolvedValueOnce({registrations:[]}).mockResolvedValue({registrations:action === "approve" ? [row] : []});
	let finish!: () => void;
	(action === "approve" ? approve : reject).mockImplementation(() => new Promise(resolve => { finish = () => resolve({registration:row}); }));
	render(<StudioPage />);
	const button = await screen.findByRole("button",{name:action === "approve" ? "Approve" : "Reject"});
	fireEvent.change(screen.getByLabelText("Rejection reason (optional)"),{target:{value:"Another day please"}});
	fireEvent.click(button); fireEvent.click(button);
	expect(screen.getByText("Dana")).toBeDefined();
	expect(screen.getByText("No upcoming meetings.")).toBeDefined();
	expect(action === "approve" ? approve : reject).toHaveBeenCalledOnce();
	await act(async () => finish());
	await screen.findByText("No requests waiting.");
	expect(listPending).toHaveBeenCalledTimes(2); expect(listRegistered).toHaveBeenCalledTimes(2);
	expect(screen.queryByRole("button",{name:"Approve"})).toBeNull();
	if (action === "approve") expect(screen.getByText("Dana")).toBeDefined();
	else expect(reject).toHaveBeenCalledWith("r",{reason:"Another day please"});
});

it.each(["forbidden","unauthorized","network"])("keeps the row and shows a decision error without replay (%s)", async code => {
	signedIn(); context.capabilities.permissions = ["registrations.manage"];
	listPending.mockResolvedValue({registrations:[registration("r","2026-11-01","2099-11-17")]});
	approve.mockRejectedValue(code === "network" ? new TypeError("offline") : {code,message:"Backend refused this decision"});
	render(<StudioPage />);
	fireEvent.click(await screen.findByRole("button",{name:"Approve"}));
	expect((await screen.findByRole("alert")).textContent).toBe(code === "network" ? "Could not reach ClassKit. Please try again." : "Backend refused this decision");
	expect(screen.getByText("Dana")).toBeDefined();
	expect(approve).toHaveBeenCalledOnce(); expect(listPending).toHaveBeenCalledOnce();
});
it("shows a failed read and retries only the lists", async () => {
	signedIn(); context.capabilities.permissions = ["registrations.manage"];
	listPending.mockRejectedValueOnce(new TypeError("offline"));
	render(<StudioPage />);
	fireEvent.click(await screen.findByRole("button",{name:"Try again"}));
	await screen.findByText("No requests waiting.");
	expect(approve).not.toHaveBeenCalled(); expect(reject).not.toHaveBeenCalled();
});

it("submits password sign-in, shows backend errors and signs a non-manager out", async () => {
	signIn.mockResolvedValue({error:"Wrong password"});
	const view = render(<StudioPage />);
	fireEvent.change(screen.getByLabelText("Email"),{target:{value:"manager@example.com"}});
	fireEvent.change(screen.getByLabelText("Password"),{target:{value:"password"}});
	fireEvent.click(screen.getByRole("button",{name:"Sign in"}));
	await screen.findByText("Wrong password");
	expect(signIn).toHaveBeenCalledWith("manager@example.com","password");
	signedIn(); view.rerender(<StudioPage />);
	signOut.mockResolvedValue({error:null});
	fireEvent.click(screen.getByRole("button",{name:"Sign out"}));
	await screen.findByRole("button",{name:"Sign in"});
	expect(signOut).toHaveBeenCalledOnce();
});
it("starts Google sign-in once and keeps the controls locked for the redirect", async () => {
	signInWithGoogle.mockResolvedValue({error:null});
	render(<StudioPage />);
	const google = screen.getByRole("button",{name:"Continue with Google"});
	fireEvent.click(google); fireEvent.click(google);
	await waitFor(() => expect(signInWithGoogle).toHaveBeenCalledOnce());
	expect((google as HTMLButtonElement).disabled).toBe(true);
	expect(sessionStorage.getItem("demo2-studio-redirect")).toBe("#/studio");
});

it("drops a manager's late response after the session changes", async () => {
	signedIn(); context.capabilities.permissions = ["registrations.manage"];
	let resolve!: (value: unknown) => void;
	listPending.mockImplementationOnce(() => new Promise(done => {resolve = done;}));
	const view = render(<StudioPage />);
	context = {...context, session:null}; view.rerender(<StudioPage />);
	await act(async () => resolve({registrations:[registration("r","2026-11-01","2099-11-17")]}));
	expect(screen.queryByText("Dana")).toBeNull();
	expect(screen.getByRole("button",{name:"Sign in"})).toBeDefined();
});
it.each(["forbidden","unauthorized"])("renders backend access loss on a read (%s)", async code => {
	signedIn(); context.capabilities.permissions = ["registrations.manage"];
	listPending.mockRejectedValue({code,message:"Access lost"});
	render(<StudioPage />);
	await screen.findByText("Access lost");
	if (code === "forbidden") expect(screen.getByText("This page is for the studio manager.")).toBeDefined();
	else expect(screen.getByRole("button",{name:"Sign in"})).toBeDefined();
});
it("a failed refetch after approval retries the read without replaying approval", async () => {
	signedIn(); context.capabilities.permissions = ["registrations.manage"];
	listPending.mockResolvedValueOnce({registrations:[registration("r","2026-11-01","2099-11-17")]}).mockRejectedValueOnce(new TypeError("offline"));
	approve.mockResolvedValue({});
	render(<StudioPage />);
	fireEvent.click(await screen.findByRole("button",{name:"Approve"}));
	fireEvent.click(await screen.findByRole("button",{name:"Try again"}));
	await screen.findByText("No requests waiting.");
	expect(approve).toHaveBeenCalledOnce(); expect(listPending).toHaveBeenCalledTimes(3);
});
it("keeps the access notice and reports sign-out failure", async () => {
	signedIn(); signOut.mockResolvedValue({error:"Sign-out failed"});
	render(<StudioPage />);
	fireEvent.click(screen.getByRole("button",{name:"Sign out"}));
	await screen.findByText("Sign-out failed");
	expect(screen.getByText("This page is for the studio manager.")).toBeDefined();
});
