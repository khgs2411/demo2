import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Ticket } from "../../ui/ticket";
import { IssuedPassword } from "./issued-password";
import { RetryTicket } from "./retry-ticket";
import { useRequests } from "./use-requests";
import type { useBooking } from "./use-booking";

export function RequestedStep({ flow }: { flow: ReturnType<typeof useBooking> }) {
	const { t } = useTranslation("booking");
	const state = flow.state;
	const requests = useRequests(flow.adapter, flow.context.session?.user.id ?? null);
	const registrationId = state.step === "requested" ? state.registration.id : null;
	const request = requests.state.step === "ready" ? requests.state.requests.find(row => row.userRegistrationState?.id === registrationId) : undefined;
	const receipt = "lastCancellation" in requests.state ? requests.state.lastCancellation : undefined;
	const updated = receipt ?? (request?.userRegistrationState ? { ...request.userRegistrationState, classId:request.id } : undefined);
	useEffect(() => { if (updated) flow.send({ type:"registration_updated", registration:updated }); }, [updated?.id, updated?.status, flow.send]);
	if (state.step !== "requested") return null;
	return <>
		<h1 tabIndex={-1}>{t("dTitle")}</h1><p className="lede">{t("dLede")}</p>
		{state.credentials && <IssuedPassword credentials={state.credentials} />}
		<ol className="next-list">{["n1","n2","n3"].map((key,index) => <li key={key}><span>0{index + 1}</span><span>{t(key)}</span></li>)}</ol>
		{requests.state.step === "loading" && <p role="status">{t("loading")}</p>}
		{requests.state.step === "ready" && requests.state.cancellationFailed && <p role="alert" className="notice error">{t("cancelFailed")}</p>}
		{requests.state.step === "failed" && <p role="alert" className="notice error">{t("messages.slots_failed")}</p>}
		{requests.state.step === "signed_out" && <p role="status">{t("messages.auth_failed")}</p>}
		<div className="actions"><Ticket href="#/account" stub={`№ ${state.registration.id}`}>{t("myRequests")}</Ticket>
			{request?.canCancelRegistration && <Ticket stub="" className="booking-link" disabled={requests.state.step === "ready" && requests.state.cancellingId !== null} onClick={() => void requests.cancel(state.registration.id)}>{t("cancel")}</Ticket>}
			{requests.state.step === "failed" && <RetryTicket className="booking-link" onClick={() => void requests.refresh()} />}
		</div>
	</>;
}
