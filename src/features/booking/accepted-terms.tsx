import { useEffect, useId, useReducer } from "react";
import { useTranslation } from "react-i18next";
import { Ticket } from "../../ui/ticket";
import { acceptedTermsTransition } from "./accepted-terms-machine";
import type { createBookingAdapter } from "./adapter";
import { RetryTicket } from "./retry-ticket";
import { TermsReader } from "./terms-reader";

export function AcceptedTerms({ adapter }: { adapter: Pick<ReturnType<typeof createBookingAdapter>, "loadAcceptedTerms"> }) {
	const { t, i18n } = useTranslation("booking");
	const headingId = useId();
	const [state, dispatch] = useReducer(acceptedTermsTransition, { step: "loading" });
	const { step } = state;
	useEffect(() => {
		if (step !== "loading") return;
		let active = true;
		void adapter.loadAcceptedTerms().then(result => {
			if (active) dispatch(result);
		});
		return () => { active = false; };
	}, [adapter, step]);

	const dates = new Intl.DateTimeFormat(i18n.language, { dateStyle: "medium" });
	return <section aria-labelledby={headingId} className="accepted-terms">
		<h2 id={headingId}>{t("accTermsTitle")}</h2>
		{state.step === "loading" && <p role="status">{t("accTermsLoading")}</p>}
		{state.step === "empty" && <p role="status">{t("accTermsEmpty")}</p>}
		{state.step === "failed" && <>
			<p role="alert" className="notice error">{t("accTermsLoadFailed")}</p>
			<RetryTicket onClick={() => dispatch({ type: "retry_requested" })} />
		</>}
		{state.step === "ready" && <ul role="list">
			{state.acceptances.map(acceptance => {
				const open = state.openId === acceptance.id;
				const readerId = `${headingId}-${acceptance.id}`;
				return <li key={acceptance.id}>
					<Ticket stub="" className="booking-link acceptance-row" aria-controls={readerId} aria-expanded={open}
						onClick={() => dispatch({ type: "acceptance_toggled", id: acceptance.id })}>
						<bdi lang={acceptance.locale}>{acceptance.title}</bdi>
						<span className="when">
							{t("accTermsVersion", { version: acceptance.version })} ·{" "}
							<time dateTime={acceptance.acceptedAt}>{dates.format(new Date(acceptance.acceptedAt))}</time>
						</span>
					</Ticket>
					<div id={readerId} hidden={!open}>{open && <TermsReader terms={acceptance} />}</div>
				</li>;
			})}
		</ul>}
	</section>;
}
