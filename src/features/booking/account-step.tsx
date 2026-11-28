import { useRef, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Input } from "../../ui/input";
import { TextLink } from "../../ui/text-link";
import { Ticket } from "../../ui/ticket";
import { readResetEmail, rememberResetEmail } from "./password-reset/memory";

export function AccountStep({ stepStub = "02", product, loading, busy, onPassword, onGoogle, onBack, signInOnly = false, title, description, email, emailReadOnly }: { stepStub?: string;
	product: { auth_mode: string; email_password_enabled: boolean; google_oauth_enabled: boolean } | null;
	loading: boolean; busy: boolean; onPassword: (method: "signIn" | "signUp", email: string, password: string) => void;
	onGoogle: () => void; onBack?: () => void;
	signInOnly?: boolean; title?: string; description?: string; email?: string; emailReadOnly?: boolean;
}) {
	const { t } = useTranslation("booking");
	const [signingIn, setSigningIn] = useState(false);
	const emailField = useRef<HTMLInputElement>(null);
	const canSignUp = !signInOnly && product?.auth_mode === "open";
	const signIn = signingIn || !canSignUp;
	function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const form = new FormData(event.currentTarget);
		onPassword(signIn ? "signIn" : "signUp", String(form.get("email")), String(form.get("password")));
	}
	return <>
		<h1 tabIndex={-1}>{title ?? t("aTitle")}</h1><p className="lede">{description ?? t("aLede")}</p>
		{loading ? <p role="status">{t("loading")}</p> : <>
			{product?.google_oauth_enabled && <GoogleSignIn busy={busy} onGoogle={onGoogle} />}
			{product?.google_oauth_enabled && product.email_password_enabled && <div className="or booking-label">{t("or")}</div>}
			{product?.email_password_enabled && <form onSubmit={submit}>
				<fieldset disabled={busy} className="fields">
					<Input label={t("email")} name="email" ref={emailField} defaultValue={email ?? (readResetEmail() || undefined)} readOnly={emailReadOnly} type="email" dir="ltr" autoComplete="email" required />
					<div>
						<Input label={t("password")} name="password" type="password" autoComplete={signIn ? "current-password" : "new-password"}
							minLength={signIn ? undefined : 8} aria-describedby={signIn ? undefined : "password-hint"} required
							labelAction={signIn && <TextLink className="forgot-link" href="#/forgot-password" onClick={() => rememberResetEmail(emailField.current?.value ?? "")}>
								{t("forgotLink", { ns: "passwordReset" })}
							</TextLink>} />
						{!signIn && <span className="hint" id="password-hint">{t("pwHint")}</span>}
					</div>
				</fieldset>
				{canSignUp && <p className="switch">{!signIn && <>{t("haveAccount")} </>}<Ticket stub="" className="booking-link" disabled={busy} onClick={() => setSigningIn(!signingIn)}>{t(signIn ? "createAccount" : "signIn")}</Ticket></p>}
				<div className="actions"><Ticket type="submit" stub={stepStub} disabled={busy}>{busy ? t("loading") : t(signIn ? "signIn" : "createAccount")}</Ticket>
					{onBack && <Ticket stub="" className="booking-link" disabled={busy} onClick={onBack}>{t("back")}</Ticket>}</div>
			</form>}
			{!product?.email_password_enabled && !product?.google_oauth_enabled && <p role="status">{t("authUnavailable")}</p>}
		</>}
	</>;
}

export function GoogleSignIn({ busy, onGoogle }: { busy: boolean; onGoogle: () => void }) {
	const { t } = useTranslation("booking");
	return <Ticket stub="↗" tone="ghost" className="booking-google" disabled={busy} onClick={onGoogle}>
		<svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
			<path fill="var(--mustard)" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.4-.4-3.5z" />
			<path fill="var(--coral)" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
			<path fill="var(--sage)" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
			<path fill="#18233a" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
		</svg>{t("google")}</Ticket>;
}
