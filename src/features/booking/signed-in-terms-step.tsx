import { useTranslation } from "react-i18next";
import { Ticket } from "../../ui/ticket";
import type { BookingEvent, SignedInTermsState } from "./machine";
import { RetryTicket } from "./retry-ticket";
import { TermsConsent } from "./terms-reader";

export function SignedInTermsStep({ state, send }: { state: SignedInTermsState; send: (event: BookingEvent) => void }) {
	const { t } = useTranslation("booking");
	if (!("terms" in state)) return <>
		<h1 tabIndex={-1}>{t("termsTitle")}</h1>
		{state.step === "checking_terms" ? <p role="status">{t("loading")}</p> : <>
			<p role="alert" className="notice error">{t("signupMessages.terms_unavailable")}</p>
			<RetryTicket onClick={() => send({ type: "retry_requested" })} />
		</>}
	</>;

	const { terms } = state;
	const reviewing = state.step === "reviewing_terms";
	const failed = state.step === "terms_accept_failed";
	const accepted = !reviewing || state.accepted;
	return <>
		<h1 tabIndex={-1} lang={terms.locale} dir="auto">{terms.title}</h1>
		<p className="booking-label">{t("termsVersion", { version: terms.version })}</p>
		{reviewing && state.termsChanged && <p role="alert" className="notice">{t("signupMessages.terms_changed")}</p>}
		{failed && <p role="alert" className="notice error">{t("termsAcceptFailed")}</p>}
		<form onSubmit={event => {
			event.preventDefault();
			send({ type: "acceptance_submitted" });
		}}>
			<fieldset className="fields" disabled={!reviewing}>
				<TermsConsent terms={terms} accepted={accepted} onChange={accepted => send({ type: "terms_accepted", accepted })} />
			</fieldset>
			<div className="actions">
				{failed ? <RetryTicket onClick={() => send({ type: "retry_requested" })} />
					: <Ticket stub="→" type="submit" disabled={!reviewing || !accepted}>{t(reviewing ? "send" : "loading")}</Ticket>}
			</div>
		</form>
	</>;
}
