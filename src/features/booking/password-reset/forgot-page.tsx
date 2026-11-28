import { useEffect, useMemo, useReducer, useRef, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Input } from "../../../ui/input";
import { TextLink } from "../../../ui/text-link";
import { Ticket } from "../../../ui/ticket";
import { createBookingAdapter, useBookingContext } from "../adapter";
import { ResetPass } from "../gate-passes";
import { useTurnstile } from "../use-turnstile";
import { forgotTransition, initialForgotState } from "./machine";
import { readResetEmail, rememberResetEmail } from "./memory";


export function ForgotPasswordPage() {
	const { t, i18n } = useTranslation("passwordReset");
	const context = useBookingContext();
	const adapter = useMemo(() => createBookingAdapter(context.client, context.refreshProductContext), [context.client, context.refreshProductContext]);
	const turnstile = useTurnstile(i18n.language);
	const [state, dispatch] = useReducer(forgotTransition, initialForgotState);
	const [email, setEmail] = useState(readResetEmail);
	const main = useRef<HTMLElement>(null);
	const locked = useRef(false);
	const mounted = useRef(true);
	useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
	useEffect(() => { if (state.step === "sent") main.current?.querySelector<HTMLElement>("h1")?.focus(); }, [state.step]);

	async function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const token = turnstile.getToken();
		if (locked.current || !token) return;
		locked.current = true;
		rememberResetEmail(email);
		dispatch({ type: "send_started" });
		turnstile.reset();
		try {
			const outcome = await adapter.requestPasswordReset(email.trim(), i18n.language, token);
			if (mounted.current) dispatch({ type: "send_finished", outcome });
		} finally { locked.current = false; }
	}

	const busy = state.step === "sending";
	const notice = state.step === "editing" ? state.notice ?? (turnstile.status === "unavailable" ? "turnstile_unavailable" : null) : null;
	return <main data-module="booking" className="inner-page password-page gate" ref={main}>
		<div className="inner-wrap gate-layout"><section aria-busy={busy}>
			{state.step === "sent" ? <>
				<h1 tabIndex={-1}>{t("sentTitle")}</h1>
				<p className="lede" role="status">{t("sent")}</p>
				<div className="actions"><Ticket href="#/account" stub="↩">{t("backToSignIn")}</Ticket></div>
			</> : <>
				<h1 tabIndex={-1}>{t("forgotTitle")}</h1><p className="lede">{t("forgotLede")}</p>
				{notice && <p className="notice error" role="alert">{t(`requestMessages.${notice}`)}</p>}
				<form onSubmit={event => void submit(event)}>
					<fieldset className="fields" disabled={busy}>
						<Input label={t("email")} name="email" value={email} onChange={event => setEmail(event.target.value)} type="email" dir="ltr" autoComplete="email" required />
					</fieldset>
					<div className="turnstile-host" ref={turnstile.container} />
					<div className="actions">
						<Ticket type="submit" stub="1/3" disabled={busy || turnstile.status !== "verified"}>{t(busy ? "loading" : "send")}</Ticket>
						<TextLink href="#/account">{t("backToSignIn")}</TextLink>
					</div>
				</form>
			</>}
		</section>
		<ResetPass step={state.step === "sent" ? 2 : 1} />
		</div>
	</main>;
}
