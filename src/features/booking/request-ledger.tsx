import { useLayoutEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { upcomingStartTime } from "../../lib/slot-time";
import { TextLink } from "../../ui/text-link";
import { Ticket } from "../../ui/ticket";
import { formatWhen } from "./calendar";
import { googleCalendarLink } from "./calendar-link";
import type { MeetingRequest, RequestsState } from "./requests-machine";
import { RetryTicket } from "./retry-ticket";

const maxTimeoutDelay = 2 ** 31 - 1; // Browser timeouts take a signed 32-bit millisecond delay.

function upcomingConfirmedStart(request: MeetingRequest, now: number): number | null {
	return request.userRegistrationState?.status === "approved" ? upcomingStartTime(request.startsAt, now) : null;
}

function useRequestClock(requests: readonly MeetingRequest[] | undefined): number {
	const [now, setNow] = useState(Date.now);
	useLayoutEffect(() => {
		if (!requests) return;
		let timer: number | undefined;
		const update = () => {
			const current = Date.now();
			setNow(current);
			let nextStart = Infinity;
			for (const request of requests) {
				const start = upcomingConfirmedStart(request, current);
				if (start !== null) nextStart = Math.min(nextStart, start);
			}
			if (nextStart !== Infinity) {
				timer = window.setTimeout(update, Math.min(nextStart - current, maxTimeoutDelay));
			}
		};
		update();
		return () => window.clearTimeout(timer);
	}, [requests]);
	return now;
}

export function RequestLedger({ state, refresh, cancel, timeZone }: { state: RequestsState; refresh: () => void; cancel: (id: string) => void; timeZone: string }) {
	const { t, i18n } = useTranslation("booking");
	const now = useRequestClock(state.step === "ready" ? state.requests : undefined);
	if (state.step === "loading") return <p role="status">{t("loading")}</p>;
	if (state.step === "no_access") return <p role="alert" className="notice error">{t("accNoAccess")}</p>;
	if (state.step === "failed") return <>{state.lastCancellation && <p role="status">{t(state.lastCancellation.status)}</p>}<p role="alert" className="notice error">{t("messages.slots_failed")}</p><RetryTicket onClick={refresh} /></>;
	if (state.step !== "ready") return null;
	return <>
		{state.cancellationFailed && <p role="alert" className="notice error">{t("cancelFailed")}</p>}
		{state.lastCancellation && <p role="status">{t(state.lastCancellation.status)}</p>}
		{!state.requests.length ? <p role="status">{t("emptyRequests")}</p> : <div className="reqs">
			{state.requests.map(request => <article className="req" key={request.userRegistrationState!.id}>
				<span><b>{request.name}</b><br /><span className="when">{formatWhen(request.startsAt, i18n.language, timeZone)}</span></span>
				<span className="side"><span className={`state ${request.userRegistrationState!.status}`}>{t(request.userRegistrationState!.status)}</span>
					{upcomingConfirmedStart(request, now) !== null &&
						<TextLink href={googleCalendarLink(request)} target="_blank" rel="noopener noreferrer">{t("addToGoogleCalendar")}</TextLink>}
					{request.canCancelRegistration && <Ticket stub="" className="booking-link" disabled={state.cancellingId !== null} onClick={() => cancel(request.userRegistrationState!.id)}>{t(state.cancellingId === request.userRegistrationState!.id ? "loading" : "cancel")}</Ticket>}</span>
			</article>)}
		</div>}
	</>;
}
