import { useTranslation } from "react-i18next";
import { Ticket } from "../../ui/ticket";
import { formatWhen } from "./calendar";
import type { RequestsState } from "./requests-machine";

export function RequestLedger({ state, refresh, cancel, timeZone }: { state: RequestsState; refresh: () => void; cancel: (id: string) => void; timeZone: string }) {
	const { t, i18n } = useTranslation("booking");
	if (state.step === "loading") return <p role="status">{t("loading")}</p>;
	if (state.step === "failed") return <><p role="alert" className="notice error">{t("messages.slots_failed")}</p><Ticket stub="↻" onClick={refresh}>{t("retry")}</Ticket></>;
	if (state.step !== "ready") return null;
	return <>
		{state.cancellationFailed && <p role="alert" className="notice error">{t("cancelFailed")}</p>}
		{state.lastCancellation && <p role="status">{t(state.lastCancellation.status)}</p>}
		{!state.requests.length ? <p role="status">{t("emptyRequests")}</p> : <div className="reqs">
			{state.requests.map(request => <article className="req" key={request.userRegistrationState!.id}>
				<span><b>{request.name}</b><br /><span className="when">{formatWhen(request.startsAt, i18n.language, timeZone)}</span></span>
				<span className="side"><span className={`state ${request.userRegistrationState!.status}`}>{t(request.userRegistrationState!.status)}</span>
					{request.canCancelRegistration && <Ticket stub="" className="booking-link" disabled={state.cancellingId !== null} onClick={() => cancel(request.userRegistrationState!.id)}>{t(state.cancellingId === request.userRegistrationState!.id ? "loading" : "cancel")}</Ticket>}</span>
			</article>)}
		</div>}
	</>;
}
