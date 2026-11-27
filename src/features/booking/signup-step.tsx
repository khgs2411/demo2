import { useTranslation } from "react-i18next";
import { Input } from "../../ui/input";
import { Ticket } from "../../ui/ticket";
import { GoogleSignIn } from "./account-step";
import type { SignupDraft } from "./machine";
import { RetryTicket } from "./retry-ticket";
import { TermsConsent } from "./terms-reader";
import type { useBooking } from "./use-booking";
import { useTurnstile } from "./use-turnstile";

export function SignupStep({ flow, draft, onChange }: {
	flow: ReturnType<typeof useBooking>; draft: SignupDraft; onChange: (draft: SignupDraft) => void;
}) {
	const { t, i18n } = useTranslation("booking");
	const turnstile = useTurnstile(i18n.language);
	const state = flow.state;
	if (state.step !== "signup_details" && state.step !== "sending") return null;
	const busy = state.step === "sending";
	const { terms } = state;
	const notice = busy ? null : state.notice ?? (turnstile.status === "unavailable" ? "turnstile_unavailable" : null);
	const accepted = busy || state.accepted;
	const loadingTerms = !busy && state.loadingTerms;
	return <>
		<h1 tabIndex={-1}>{t("signupTitle")}</h1>
		<GoogleSignIn busy={busy} onGoogle={() => void flow.google(draft.email)} />
		<div className="or booking-label">{t("or")}</div>
		{notice && <p className="notice error" role="alert">{t(`signupMessages.${notice === "terms_unavailable" && terms ? "terms_restored" : notice}`)}</p>}
		<form onSubmit={event => {
			event.preventDefault();
			const token = turnstile.getToken();
			if (!accepted || busy || !token) return;
			turnstile.reset();
			void flow.signup(draft, token);
		}}>
			<fieldset className="fields" disabled={busy}>
				<Input label={t("name")} value={draft.displayName} onChange={event => onChange({ ...draft, displayName: event.target.value })} autoComplete="name" maxLength={200} required />
				<Input label={t("email")} value={draft.email} onChange={event => onChange({ ...draft, email: event.target.value })} type="email" dir="ltr" autoComplete="email" required />
				<Input label={t("phone")} value={draft.phone} onChange={event => onChange({ ...draft, phone: event.target.value })} type="tel" dir="ltr" autoComplete="tel" minLength={7} maxLength={20} required />
				{terms ? <>
					<h2 className="booking-terms-heading" lang={terms.locale} dir="auto">{terms.title}</h2>
					<TermsConsent terms={terms} accepted={accepted} onChange={accepted => flow.send({ type: "terms_accepted", accepted })} />
				</> : loadingTerms && <p role="status">{t("loading")}</p>}
			</fieldset>
			<div ref={turnstile.container} />
			<div className="actions">
				<Ticket stub="03" type="submit" disabled={busy || !accepted || turnstile.status !== "verified"}>{t(busy ? "loading" : "send")}</Ticket>
				<Ticket stub="" className="booking-link" disabled={busy} onClick={() => flow.send({ type: "signup_back" })}>{t("back")}</Ticket>
			</div>
		</form>
		{!terms && !loadingTerms && <RetryTicket className="booking-link" onClick={() => flow.send({ type: "terms_reload_requested" })} />}
		<p className="switch">{t("haveAccount")} <Ticket stub="" className="booking-link" disabled={busy} onClick={() => flow.send({ type: "signup_auth_chosen", email: draft.email })}>{t("signIn")}</Ticket></p>
	</>;
}
