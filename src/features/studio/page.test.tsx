import { cleanup, render, screen, fireEvent, waitFor, act, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { useProductContext, type ClassKitClient } from "@class-kit/react";
import { i18n } from "../../i18n";
import { StudioPage } from "./page";
import { registration } from "./fixtures";


vi.mock("@class-kit/react", () => ({ useProductContext: vi.fn() }));
let context: ReturnType<typeof useProductContext>;
const listPending = vi.fn();
const listRegistered = vi.fn();
const listHistory = vi.fn();
const approve = vi.fn();
const reject = vi.fn();
const signIn = vi.fn();
const signOut = vi.fn();
const signInWithGoogle = vi.fn();
const changePassword = vi.fn<ClassKitClient["auth"]["changePassword"]>();
const getProfile = vi.fn();
const updateProfile = vi.fn<ClassKitClient["profile"]["update"]>();
const managerProfile = { data: { user: {
	user_id: "manager", display_name: "Maya", phone_number: "0501234567", metadata: {},
} }, error: null };
beforeEach(async () => {
	vi.resetAllMocks(); sessionStorage.clear();
	context = {
		client: {
			management: { registrations: { listPending, listRegistered, listHistory, approve, reject } },
			auth: { signIn, signOut, signInWithGoogle, changePassword },
			profile: { get: getProfile, update: updateProfile },
		} as unknown as NonNullable<ReturnType<typeof useProductContext>["client"]>,
		productKey:"demo", product:{product_key:"demo",name:"Demo",auth_mode:"open",email_password_enabled:true,google_oauth_enabled:true,auth_redirects:[]},
		productUser:null, productAccess:null, capabilities:{permissions:[],dashboard:{can_enter:false,can_manage_classes:false,can_manage_roles:false,can_manage_users:false,can_manage_auth_mode:false,can_read_customers:false,can_read_memberships:false}},
		session:null,loading:false,error:null,refreshProductContext:vi.fn().mockResolvedValue(undefined),signIn:vi.fn(),signOut:vi.fn(),signUp:vi.fn(),signInWithGoogle:vi.fn(),
	};
	vi.mocked(useProductContext).mockImplementation(() => context);
	listHistory.mockResolvedValue({registrations:[]});
	listPending.mockResolvedValue({registrations:[]}); listRegistered.mockResolvedValue({registrations:[]});
	getProfile.mockResolvedValue(managerProfile);
	await i18n.changeLanguage("en");
});
afterEach(cleanup);
function signedIn(...providers: string[]) {
	context.session = {access_token:"test",refresh_token:"test",token_type:"bearer",expires_in:3600,user:{id:"manager",app_metadata:{},user_metadata:{},aud:"authenticated",created_at:"2026-11-15"}};
	if (providers.length) {
		const { user } = context.session;
		user.identities = providers.map(provider => ({ id: provider, identity_id: provider, user_id: user.id, provider }));
	}
}

function managerWithIdentities(...providers: string[]) {
	signedIn(...providers);
	context.capabilities.permissions = ["registrations.manage"];
}

async function submitPasswordChange() {
	const section = await screen.findByRole("region", { name: "Password" });
	const form = within(section);
	fireEvent.change(form.getByLabelText("Current password"), { target: { value: "old-password" } });
	fireEvent.change(form.getByLabelText("New password"), { target: { value: "new-password" } });
	fireEvent.change(form.getByLabelText("New password, again"), { target: { value: "new-password" } });
	fireEvent.click(form.getByRole("button", { name: "Change password" }));
	return section;
}

it.each(["he","en"])("offers only sign-in while signed out, without registration reads (%s)", async language => {
	await i18n.changeLanguage(language);
	render(<StudioPage />);
	expect(screen.getByRole("button",{name:i18n.t("signIn",{ns:"booking"})})).toBeDefined();
	expect(screen.queryByText(i18n.t("createAccount",{ns:"booking"}))).toBeNull();
	expect(screen.queryByText(i18n.t("aLede",{ns:"booking"}))).toBeNull();
	expect(screen.queryByRole("region", { name: i18n.t("accDetailsTitle", { ns: "booking" }) })).toBeNull();
	expect(screen.queryByRole("region", { name: i18n.t("passwordChange.title", { ns: "booking" }) })).toBeNull();
	expect(getProfile).not.toHaveBeenCalled();
	expect(listPending).not.toHaveBeenCalled(); expect(listRegistered).not.toHaveBeenCalled();
});

it("waits for context and denies non-managers without reading registrations", async () => {
	context.loading = true;
	const view = render(<StudioPage />);
	expect(screen.getByRole("status").textContent).toBe("Loading…");
	expect(screen.queryByRole("region", { name: "Your details" })).toBeNull();
	expect(listPending).not.toHaveBeenCalled();
	context.loading = false; signedIn("email"); view.rerender(<StudioPage />);
	expect(screen.getByText("This page is for the studio manager.")).toBeDefined();
	expect(screen.getByRole("button",{name:"Sign out"})).toBeDefined();
	expect(screen.queryByRole("region", { name: "Your details" })).toBeNull();
	expect(screen.queryByRole("region", { name: "Password" })).toBeNull();
	expect(getProfile).not.toHaveBeenCalled();
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

it.each(["role", "permission"])("loads and saves studio account details with manager access granted by %s", async grant => {
	signedIn();
	if (grant === "role") context.productUser = { role: "manager" } as NonNullable<typeof context.productUser>;
	else context.capabilities.permissions = ["registrations.manage"];
	updateProfile.mockResolvedValue({ data: {
		profile: { customer_id: "customer-1", user_id: "manager", display_name: "Maya Levi", contact_email: null, phone_number: "0507654321" },
		product_user: { customer_id: "customer-1", user_id: "manager", metadata: {} },
	}, error: null });
	render(<StudioPage />);

	const details = await screen.findByRole("region", { name: "Your details" });
	const name = await within(details).findByDisplayValue("Maya");
	const phone = within(details).getByDisplayValue("0501234567");
	expect(screen.getByRole("region", { name: "History" }).compareDocumentPosition(details) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
	expect(details.compareDocumentPosition(screen.getByRole("button", { name: "Sign out" })) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
	expect(screen.queryByText("No meeting requests yet.")).toBeNull();
	expect(screen.queryByRole("heading", { name: "Terms you accepted" })).toBeNull();
	expect(screen.queryByRole("link", { name: "Another meeting" })).toBeNull();

	fireEvent.change(name, { target: { value: "Maya Levi" } });
	fireEvent.change(phone, { target: { value: "0507654321" } });
	fireEvent.click(within(details).getByRole("button", { name: "Save details" }));

	await within(details).findByText("Your details were saved.");
	expect(updateProfile).toHaveBeenCalledExactlyOnceWith({ displayName: "Maya Levi", phoneNumber: "0507654321" });
});

it("shows the details load error and retries the profile without reloading meetings", async () => {
	signedIn();
	context.capabilities.permissions = ["registrations.manage"];
	getProfile.mockRejectedValueOnce(new TypeError("offline"));
	render(<StudioPage />);

	const details = await screen.findByRole("region", { name: "Your details" });
	expect((await within(details).findByRole("alert")).textContent).toBe("We couldn't load your details.");
	fireEvent.click(within(details).getByRole("button", { name: "Try again" }));

	await within(details).findByDisplayValue("Maya");
	expect(within(details).queryByRole("alert")).toBeNull();
	expect(getProfile).toHaveBeenCalledTimes(2);
	expect(listPending).toHaveBeenCalledOnce();
});

it.each(["unauthorized", "session_revoked"] as const)("returns to studio sign-in when a details save finds the session ended (%s)", async code => {
	signedIn();
	context.capabilities.permissions = ["registrations.manage"];
	updateProfile.mockResolvedValue({ data: null, error: { code, message: "Session ended" } });
	render(<StudioPage />);
	const details = await screen.findByRole("region", { name: "Your details" });
	fireEvent.change(await within(details).findByDisplayValue("Maya"), { target: { value: "Maya Levi" } });
	fireEvent.click(within(details).getByRole("button", { name: "Save details" }));

	await screen.findByRole("button", { name: "Sign in" });
	expect(screen.queryByRole("region", { name: "Your details" })).toBeNull();
	expect(screen.queryByRole("region", { name: "History" })).toBeNull();
	expect(signOut).not.toHaveBeenCalled();
});

it.each([
	["a Google-only account", ["google"], true],
	["email password disabled", ["email"], false],
] as const)("hides the studio password section for %s", async (_reason, providers, enabled) => {
	managerWithIdentities(...providers);
	context.product = { ...context.product!, email_password_enabled: enabled };
	render(<StudioPage />);

	await screen.findByRole("region", { name: "Your details" });
	expect(screen.queryByRole("region", { name: "Password" })).toBeNull();
});

it.each([
	["password_changed", "status", "Your password was changed."],
	["current_password_invalid", "alert", "The current password is incorrect."],
	["bad_request", "alert", "Choose a different new password and try again."],
] as const)("shows the %s outcome under studio details", async (status, role, message) => {
	managerWithIdentities("google", "email");
	changePassword.mockResolvedValue({ status });
	render(<StudioPage />);

	const section = await submitPasswordChange();
	expect((await within(section).findByRole(role)).textContent).toBe(message);
	expect(screen.getByRole("region", { name: "Your details" }).compareDocumentPosition(section) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
	expect(changePassword).toHaveBeenCalledExactlyOnceWith({ currentPassword: "old-password", newPassword: "new-password" });
	expect(screen.getByRole("button", { name: "Sign out" })).toBeDefined();
});

it.each(["provider keeps the old session", "provider clears the session"])("shows the signed-out password message when the %s", async situation => {
	managerWithIdentities("email");
	let finish!: () => void;
	changePassword.mockImplementation(() => new Promise(resolve => { finish = () => resolve({ status: "signed_out" }); }));
	const view = render(<StudioPage />);
	await submitPasswordChange();
	if (situation === "provider clears the session") {
		context = { ...context, session: null };
		await act(async () => { view.rerender(<StudioPage />); });
	}
	await act(async () => { finish(); });

	expect(screen.getByRole("button", { name: "Sign in" })).toBeDefined();
	expect(screen.getByRole("status").textContent).toBe("Your password was changed. Sign in with your new password.");
	expect(screen.queryByRole("region", { name: "Password" })).toBeNull();
	expect(screen.queryByRole("region", { name: "Your details" })).toBeNull();
	expect(screen.queryByRole("region", { name: "History" })).toBeNull();
	expect(signOut).not.toHaveBeenCalled();
});

it("shows the successful change after the studio session is renewed", async () => {
	managerWithIdentities("email");
	let finish!: () => void;
	changePassword.mockImplementation(() => new Promise(resolve => { finish = () => resolve({ status: "password_changed" }); }));
	const view = render(<StudioPage />);
	await submitPasswordChange();

	const session = context.session!;
	context = { ...context, session: null, loading: true };
	await act(async () => { view.rerender(<StudioPage />); });
	context = { ...context, session: { ...session, access_token: "renewed" }, loading: false };
	await act(async () => { view.rerender(<StudioPage />); finish(); });

	const section = await screen.findByRole("region", { name: "Password" });
	expect(within(section).getByRole("status").textContent).toBe("Your password was changed.");
});

it.each(["during password change", "after session renewal"])("keeps the studio open when a details save loses the old session %s", async timing => {
	managerWithIdentities("email");
	let finishChange!: () => void;
	let finishSave!: () => void;
	changePassword.mockImplementation(() => new Promise(resolve => { finishChange = () => resolve({ status: "password_changed" }); }));
	updateProfile.mockImplementation(() => new Promise(resolve => {
		finishSave = () => resolve({ data: null, error: { code: "session_revoked", message: "Session ended" } });
	}));
	const view = render(<StudioPage />);
	const details = within(await screen.findByRole("region", { name: "Your details" }));
	fireEvent.change(await details.findByDisplayValue("Maya"), { target: { value: "Maya Levi" } });
	fireEvent.click(details.getByRole("button", { name: "Save details" }));
	await submitPasswordChange();

	if (timing === "during password change") await act(async () => { finishSave(); });
	context.session = { ...context.session!, access_token: "renewed" };
	view.rerender(<StudioPage />);
	await act(async () => { finishChange(); });
	if (timing === "after session renewal") await act(async () => { finishSave(); });

	expect(screen.getByText("Your password was changed.")).toBeDefined();
	expect(screen.queryByRole("button", { name: "Sign in" })).toBeNull();
});

it("pauses studio decisions and sign-out while changing the password", async () => {
	managerWithIdentities("email");
	listPending.mockResolvedValue({ registrations: [registration("r", "2026-11-01", "2099-11-17")] });
	let finish!: () => void;
	changePassword.mockImplementation(() => new Promise(resolve => { finish = () => resolve({ status: "password_changed" }); }));
	render(<StudioPage />);
	await submitPasswordChange();

	const controls = ["Approve", "Reject", "Sign out"].map(name => screen.getByRole("button", { name }));
	for (const control of controls) expect(control.matches(":disabled")).toBe(true);
	await act(async () => { finish(); });
	for (const control of controls) expect(control.matches(":disabled")).toBe(false);
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

it.each(["approve","reject"] as const)("waits for %s and refetches all lists, without duplicate submissions or optimistic moves", async action => {
	signedIn(); context.capabilities.permissions = ["registrations.manage"];
	const row = registration("r","2026-11-01","2099-11-17");
	listPending.mockResolvedValueOnce({registrations:[row]}).mockResolvedValue({registrations:[]});
	listRegistered.mockResolvedValueOnce({registrations:[]}).mockResolvedValue({registrations:action === "approve" ? [row] : []});
	listHistory.mockResolvedValueOnce({registrations:[]}).mockResolvedValue({registrations:action === "reject" ? [{...row,status:"rejected",registrationStatus:"rejected"}] : []});
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
	expect(listPending).toHaveBeenCalledTimes(2); expect(listRegistered).toHaveBeenCalledTimes(2); expect(listHistory).toHaveBeenCalledTimes(2);
	expect(screen.queryByRole("button",{name:"Approve"})).toBeNull();
	if (action === "approve") expect(screen.getByText("Dana")).toBeDefined();
	else { expect(reject).toHaveBeenCalledWith("r",{reason:"Another day please"}); expect(screen.getByText("Declined")).toBeDefined(); }
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
it("shows account controls below the failed-read retry and can reload the lists", async () => {
	managerWithIdentities("email");
	listPending.mockRejectedValueOnce(new TypeError("offline"));
	render(<StudioPage />);
	expect(screen.getByRole("status").textContent).toBe("Loading…");
	expect(screen.queryByRole("region", { name: "Your details" })).toBeNull();
	expect(screen.queryByRole("region", { name: "Password" })).toBeNull();
	expect(getProfile).not.toHaveBeenCalled();

	const retry = await screen.findByRole("button",{name:"Try again"});
	const alert = screen.getByRole("alert");
	const details = screen.getByRole("region", { name: "Your details" });
	await within(details).findByDisplayValue("Maya");
	const password = screen.getByRole("region", { name: "Password" });
	expect(alert.textContent).toBe("Could not reach ClassKit. Please try again.");
	expect(alert.compareDocumentPosition(retry) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
	expect(retry.compareDocumentPosition(details) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
	expect(details.compareDocumentPosition(password) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

	fireEvent.click(retry);
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
	managerWithIdentities("email");
	listPending.mockRejectedValue({code,message:"Access lost"});
	render(<StudioPage />);
	const alert = await screen.findByText("Access lost");
	if (code === "forbidden") {
		expect(screen.getByText("This page is for the studio manager.")).toBeDefined();
		const details = screen.getByRole("region", { name: "Your details" });
		await within(details).findByDisplayValue("Maya");
		const password = screen.getByRole("region", { name: "Password" });
		expect(alert.compareDocumentPosition(details) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
		expect(details.compareDocumentPosition(password) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
	} else {
		expect(screen.getByRole("button",{name:"Sign in"})).toBeDefined();
		expect(screen.queryByRole("region", { name: "Your details" })).toBeNull();
		expect(screen.queryByRole("region", { name: "Password" })).toBeNull();
	}
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

it.each(["he", "en"])("renders stored rejected and cancelled decisions in a read-only History section (%s)", async language => {
 await i18n.changeLanguage(language);
 signedIn(); context.capabilities.permissions = ["registrations.manage"];
 const row = registration("declined", "2026-11-01", "2026-11-05");
 listHistory.mockResolvedValue({registrations:[
  {...row,status:"rejected",registrationStatus:"rejected"},
  {...row,id:"cancelled",status:"rejected",registrationStatus:"cancelled"},
 ]});
 render(<StudioPage />);
 const section = await screen.findByRole("region", {name: language === "he" ? "היסטוריה" : "History"});
 expect(section.textContent).toContain(i18n.t("rejected", {ns:"booking"}));
 expect(section.textContent).toContain(i18n.t("cancelled", {ns:"booking"}));
 expect(section.querySelectorAll("li")).toHaveLength(2);
 expect(section.querySelector("button")).toBeNull();
 expect(listHistory).toHaveBeenCalledWith();
});
