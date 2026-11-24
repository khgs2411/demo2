import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createClassKitClient, useProductContext } from "@class-kit/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { i18n } from "../../../i18n";
import { Routes } from "../../../app/routes";
import * as adapterModule from "../adapter";
import { AccountStep } from "../account-step";
import { makeBookingContext } from "../context-fixture";
import { ForgotPasswordPage } from "./forgot-page";
import { ResetPasswordPage } from "./reset-page";
import { captureResetToken, dropResetToken, readResetEmail, readResetToken, rememberResetEmail } from "./memory";

vi.mock("@class-kit/react", async importOriginal => ({ ...await importOriginal<typeof import("@class-kit/react")>(), useProductContext: vi.fn() }));

const requestPasswordReset = vi.fn<ReturnType<typeof adapterModule.createBookingAdapter>["requestPasswordReset"]>();
const completePasswordReset = vi.fn<ReturnType<typeof adapterModule.createBookingAdapter>["completePasswordReset"]>();
const adapter = {
	loadProfile: vi.fn(), saveAccountDetails: vi.fn(), loadTerms: vi.fn(), loadAcceptedTerms: vi.fn(), requestWithSignup: vi.fn(), signIn: vi.fn(), signUp: vi.fn(), signInWithGoogle: vi.fn(),
	saveProfile: vi.fn(), loadSlots: vi.fn(), requestRegistration: vi.fn(), listRequests: vi.fn(), cancelRequest: vi.fn(), signOut: vi.fn(),
	requestPasswordReset, completePasswordReset, changePassword: vi.fn(),
};
const requestRefusals = ["disabled", "bad_request", "rate_limited", "turnstile_failed", "turnstile_unavailable", "email_unavailable", "failed"] as const;
const completeRefusals = ["disabled", "rate_limited", "failed"] as const;

beforeEach(async () => {
	vi.resetAllMocks();
	vi.mocked(useProductContext).mockImplementation(() => makeBookingContext());
	vi.spyOn(adapterModule, "useBookingContext").mockImplementation(() => makeBookingContext());
	vi.spyOn(adapterModule, "createBookingAdapter").mockReturnValue(adapter);
	vi.stubGlobal("matchMedia", () => ({ matches: true, addEventListener() {}, removeEventListener() {} }));
	dropResetToken();
	rememberResetEmail("");
	window.history.replaceState(null, "", "/");
	await i18n.changeLanguage("en");
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

// Reads the active language's own resource, so a key missing from one locale
// fails here instead of passing through the Hebrew fallback.
function message(key: string) {
	const text: unknown = i18n.getResource(i18n.language, "passwordReset", key);
	expect(typeof text, `${i18n.language} passwordReset.${key}`).toBe("string");
	return text as string;
}

async function renderForgot({ solve = true } = {}) {
	const turnstile = {
		render: vi.fn<(container: HTMLElement, options: { callback: (token: string) => void; "error-callback": () => void }) => string>().mockReturnValue("widget"),
		reset: vi.fn(), remove: vi.fn(),
	};
	vi.stubGlobal("turnstile", turnstile);
	await act(async () => { render(<ForgotPasswordPage />); });
	const [, options] = turnstile.render.mock.calls[0];
	if (solve) act(() => options.callback("verified"));
	return { turnstile, options };
}

function holdToken(token = "emailed-token") {
	captureResetToken({ takePasswordResetToken: () => token });
}

function submitPasswords(password: string, confirmation = password) {
	fireEvent.change(screen.getByLabelText(message("newPassword")), { target: { value: password } });
	fireEvent.change(screen.getByLabelText(message("confirmPassword")), { target: { value: confirmation } });
	fireEvent.submit(screen.getByRole("button", { name: message("save") }).closest("form")!);
}

describe("routing on reset_token", () => {
	it("takes the token from the address bar once and routes to the reset screen", () => {
		const client = createClassKitClient({ supabaseUrl: "http://localhost:54321", supabasePublishableKey: "test-key", authStorageKey: "reset-test", debug: false });
		window.history.replaceState(null, "", "/?reset_token=emailed-token#/");
		captureResetToken(client!.auth);
		expect(readResetToken()).toBe("emailed-token");
		expect(window.location.search).toBe("");
		expect(window.location.hash).toBe("#/reset-password");
		render(<Routes />);
		expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(message("resetTitle"));
		expect(screen.getByLabelText(message("newPassword"))).toBeDefined();
	});

	it("leaves the route alone without a token", () => {
		window.history.replaceState(null, "", "/#/packages");
		captureResetToken({ takePasswordResetToken: () => null });
		captureResetToken(null);
		expect(readResetToken()).toBeNull();
		expect(window.location.hash).toBe("#/packages");
	});

	it("routes #/forgot-password to the request screen", async () => {
		vi.stubGlobal("turnstile", { render: vi.fn().mockReturnValue("w"), reset: vi.fn(), remove: vi.fn() });
		window.history.replaceState(null, "", "/#/forgot-password");
		await act(async () => { render(<Routes />); });
		expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(message("forgotTitle"));
	});
});

describe("sign-in step", () => {
	const product = { auth_mode: "open", email_password_enabled: true, google_oauth_enabled: false };

	it("links to forgot password and carries the typed email over", () => {
		render(<AccountStep signInOnly product={product} loading={false} busy={false} onPassword={vi.fn()} onGoogle={vi.fn()} />);
		fireEvent.change(screen.getByLabelText("Email"), { target: { value: " dana@example.com " } });
		const link = screen.getByRole("link", { name: message("forgotLink") });
		expect(link.getAttribute("href")).toBe("#/forgot-password");
		fireEvent.click(link);
		expect(readResetEmail()).toBe("dana@example.com");
	});

	it("prefills the remembered email and hides the link while creating an account", () => {
		rememberResetEmail("dana@example.com");
		render(<AccountStep product={product} loading={false} busy={false} onPassword={vi.fn()} onGoogle={vi.fn()} />);
		expect((screen.getByLabelText("Email") as HTMLInputElement).value).toBe("dana@example.com");
		expect(screen.queryByRole("link", { name: message("forgotLink") })).toBeNull();
	});
});

describe("forgot password screen", () => {
	it("sends the carried email with the locale and the Turnstile token, then answers neutrally", async () => {
		rememberResetEmail("dana@example.com");
		requestPasswordReset.mockResolvedValueOnce("sent");
		const { turnstile } = await renderForgot();
		expect((screen.getByLabelText(message("email")) as HTMLInputElement).value).toBe("dana@example.com");
		await act(async () => { fireEvent.click(screen.getByRole("button", { name: message("send") })); });
		expect(requestPasswordReset).toHaveBeenCalledExactlyOnceWith("dana@example.com", "en", "verified");
		expect(turnstile.reset).toHaveBeenCalledOnce();
		expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(message("sentTitle"));
		expect(screen.getByRole("status").textContent).toBe("If an account uses this email, we sent a link. It works for one hour.");
		expect(screen.getByRole("link", { name: message("backToSignIn") }).getAttribute("href")).toBe("#/account");
	});

	it("keeps submit disabled until Turnstile verifies, and reports an unavailable widget", async () => {
		const { options } = await renderForgot({ solve: false });
		const submit = screen.getByRole("button", { name: message("send") }) as HTMLButtonElement;
		expect(submit.disabled).toBe(true);
		act(() => options["error-callback"]());
		expect(screen.getByRole("alert").textContent).toBe(message("requestMessages.turnstile_unavailable"));
		expect(submit.disabled).toBe(true);
	});

	it("shows a busy state and sends only once", async () => {
		let finish: (outcome: "sent") => void = () => {};
		requestPasswordReset.mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
		await renderForgot();
		fireEvent.change(screen.getByLabelText(message("email")), { target: { value: "dana@example.com" } });
		const form = screen.getByRole("button", { name: message("send") }).closest("form")!;
		fireEvent.submit(form); fireEvent.submit(form);
		expect(screen.getByRole("button", { name: message("loading") })).toBeDefined();
		await act(async () => finish("sent"));
		expect(requestPasswordReset).toHaveBeenCalledOnce();
	});

	it.each([
		["en", "rate_limited", "Too many requests. Please try again later."],
		["he", "rate_limited", "נשלחו יותר מדי בקשות. כדאי לנסות שוב מאוחר יותר."],
		["en", "turnstile_failed", "Security verification failed. Please try again."],
		["he", "turnstile_failed", "האימות נכשל. יש לנסות שוב."],
	] as const)("renders the literal %s text for %s", async (language, refusal, text) => {
		await i18n.changeLanguage(language);
		requestPasswordReset.mockResolvedValueOnce(refusal);
		await renderForgot();
		fireEvent.change(screen.getByLabelText(language === "en" ? "Email" : "מייל"), { target: { value: "dana@example.com" } });
		await act(async () => { fireEvent.click(screen.getByRole("button", { name: language === "en" ? "Send link" : "שליחת קישור" })); });
		expect(screen.getByRole("alert").textContent).toBe(text);
	});

	it.each(["en", "he"])("has a %s message for every request refusal and stays editable", async language => {
		await i18n.changeLanguage(language);
		for (const refusal of requestRefusals) {
			requestPasswordReset.mockResolvedValueOnce(refusal);
			await renderForgot();
			fireEvent.change(screen.getByLabelText(message("email")), { target: { value: "dana@example.com" } });
			await act(async () => { fireEvent.click(screen.getByRole("button", { name: message("send") })); });
			expect(screen.getByRole("alert").textContent).toBe(message(`requestMessages.${refusal}`));
			expect(screen.getByLabelText(message("email"))).toBeDefined();
			cleanup();
		}
	});
});

describe("reset password screen", () => {
	it("explains a missing link and offers to request one", () => {
		render(<ResetPasswordPage />);
		expect(screen.getByRole("status").textContent).toBe(message("noLink"));
		expect(screen.getByRole("link", { name: message("requestLink") }).getAttribute("href")).toBe("#/forgot-password");
		expect(screen.queryByLabelText(message("newPassword"))).toBeNull();
	});

	it.each([["short", "short", "too_short"], ["password-one", "password-two", "mismatch"], ["a".repeat(73), "a".repeat(73), "too_long"]] as const)(
		"refuses %s before calling ClassKit",
		(password, confirmation, problem) => {
			holdToken();
			render(<ResetPasswordPage />);
			submitPasswords(password, confirmation);
			expect(screen.getByRole("alert").textContent).toBe(message(`completeMessages.${problem}`));
			expect(completePasswordReset).not.toHaveBeenCalled();
		},
	);

	it("sets the password with the held token, drops the token and leads to sign-in", async () => {
		holdToken();
		completePasswordReset.mockResolvedValueOnce("password_reset");
		render(<ResetPasswordPage />);
		await act(async () => submitPasswords("new-password"));
		expect(completePasswordReset).toHaveBeenCalledExactlyOnceWith("emailed-token", "new-password");
		expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(message("doneTitle"));
		expect(screen.getByRole("link", { name: message("signIn") }).getAttribute("href")).toBe("#/account");
		expect(readResetToken()).toBeNull();
	});

	it("shows a busy state while saving", async () => {
		holdToken();
		let finish: (outcome: "password_reset") => void = () => {};
		completePasswordReset.mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
		render(<ResetPasswordPage />);
		submitPasswords("new-password");
		expect((screen.getByRole("button", { name: message("loading") }) as HTMLButtonElement).disabled).toBe(true);
		await act(async () => finish("password_reset"));
	});

	it.each(["en", "he"])("offers a new link in %s when the link can't be used", async language => {
		await i18n.changeLanguage(language);
		for (const reason of ["reset_token_invalid", "bad_request"] as const) {
			holdToken();
			completePasswordReset.mockResolvedValueOnce(reason);
			render(<ResetPasswordPage />);
			await act(async () => submitPasswords("new-password"));
			expect(screen.getByRole("alert").textContent).toBe(message(`completeMessages.${reason}`));
			expect(screen.getByRole("link", { name: message("requestNewLink") }).getAttribute("href")).toBe("#/forgot-password");
			expect(readResetToken()).toBeNull();
			cleanup();
		}
	});

	it.each([
		["en", "reset_token_invalid", "This link has expired or was already used. Request a new link."],
		["he", "reset_token_invalid", "תוקף הקישור פג, או שכבר נעשה בו שימוש. יש לבקש קישור חדש."],
		["en", "too_long", "The password is too long: 72 at most, and Hebrew letters count as two."],
		["he", "too_long", "הסיסמה ארוכה מדי: עד 72, וכל אות עברית נספרת כשתיים."],
	] as const)("renders the literal %s text for %s", async (language, code, text) => {
		await i18n.changeLanguage(language);
		holdToken();
		completePasswordReset.mockResolvedValueOnce("reset_token_invalid");
		render(<ResetPasswordPage />);
		await act(async () => submitPasswords(code === "too_long" ? "ש".repeat(37) : "new-password"));
		expect(screen.getByRole("alert").textContent).toBe(text);
	});

	it.each(["rate_limited", "failed"] as const)("retries with the same token after %s and succeeds", async refusal => {
		holdToken();
		completePasswordReset.mockResolvedValueOnce(refusal).mockResolvedValueOnce("password_reset");
		render(<ResetPasswordPage />);
		await act(async () => submitPasswords("new-password"));
		expect(screen.getByRole("alert").textContent).toBe(message(`completeMessages.${refusal}`));
		await act(async () => submitPasswords("new-password"));
		expect(completePasswordReset).toHaveBeenNthCalledWith(2, "emailed-token", "new-password");
		expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(message("doneTitle"));
	});

	it.each(["en", "he"])("keeps the form and the link in %s after a retryable refusal", async language => {
		await i18n.changeLanguage(language);
		for (const refusal of completeRefusals) {
			holdToken();
			completePasswordReset.mockResolvedValueOnce(refusal);
			render(<ResetPasswordPage />);
			await act(async () => submitPasswords("new-password"));
			expect(screen.getByRole("alert").textContent).toBe(message(`completeMessages.${refusal}`));
			expect(screen.getByLabelText(message("newPassword"))).toBeDefined();
			expect(readResetToken()).toBe("emailed-token");
			cleanup();
		}
	});
});
