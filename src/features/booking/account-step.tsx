import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Input } from "../../ui/input";
import { Ticket } from "../../ui/ticket";

export function AccountStep({ product, loading, busy, onPassword, onGoogle, onBack, initialSignIn = false }: {
	product: { auth_mode: string; email_password_enabled: boolean; google_oauth_enabled: boolean } | null;
	loading: boolean; busy: boolean; onPassword: (method: "signIn" | "signUp", email: string, password: string) => void;
	onGoogle: () => void; onBack?: () => void;
	initialSignIn?: boolean;
}) {
	const { t } = useTranslation("booking");
	const [signingIn, setSigningIn] = useState(initialSignIn);
	const canSignUp = product?.auth_mode === "open";
	const signIn = signingIn || !canSignUp;
	function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const form = new FormData(event.currentTarget);
		onPassword(signIn ? "signIn" : "signUp", String(form.get("email")), String(form.get("password")));
	}
	return <>
		<h1 tabIndex={-1}>{t("aTitle")}</h1><p className="lede">{t("aLede")}</p>
		{loading ? <p role="status">{t("loading")}</p> : <>
			{product?.google_oauth_enabled && <Ticket stub="" className="booking-google" disabled={busy} onClick={onGoogle}><span aria-hidden="true">G</span>{t("google")}</Ticket>}
			{product?.google_oauth_enabled && product.email_password_enabled && <div className="or mono">{t("or")}</div>}
			{product?.email_password_enabled && <form onSubmit={submit}>
				<fieldset disabled={busy} className="fields">
					<Input label={t("email")} name="email" type="email" dir="ltr" autoComplete="email" required />
					<div><Input label={t("password")} name="password" type="password" autoComplete={signIn ? "current-password" : "new-password"} minLength={signIn ? undefined : 8} aria-describedby={signIn ? undefined : "password-hint"} required />
						{!signIn && <span className="hint" id="password-hint">{t("pwHint")}</span>}</div>
				</fieldset>
				{canSignUp && <p className="switch">{!signIn && <>{t("haveAccount")} </>}<Ticket stub="" className="booking-link" disabled={busy} onClick={() => setSigningIn(!signingIn)}>{t(signIn ? "createAccount" : "signIn")}</Ticket></p>}
				<div className="actions"><Ticket type="submit" stub="02" disabled={busy}>{busy ? t("loading") : t(signIn ? "signIn" : "createAccount")}</Ticket>
					{onBack && <Ticket stub="" className="booking-link" disabled={busy} onClick={onBack}>{t("back")}</Ticket>}</div>
			</form>}
			{!product?.email_password_enabled && !product?.google_oauth_enabled && <p role="status">{t("authUnavailable")}</p>}
		</>}
	</>;
}
