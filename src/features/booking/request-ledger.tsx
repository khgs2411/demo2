import { useLayoutEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { upcomingStartTime } from "../../lib/slot-time";
import { TextLink } from "../../ui/text-link";
import { Ticket } from "../../ui/ticket";
import { formatStart } from "./calendar";
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
	const day = new Intl.DateTimeFormat(i18n.language, { timeZone, day: "numeric" });
	const month = new Intl.DateTimeFormat(i18n.language, { timeZone, month: "short" });
	const fullDate = new Intl.DateTimeFormat(i18n.language, { timeZone, dateStyle: "full" });
	const now = useRequestClock(state.step === "ready" ? state.requests : undefined);
	if (state.step === "loading") return <p role="status">{t("loading")}</p>;
	if (state.step === "no_access") return <p role="alert" className="notice error">{t("accNoAccess")}</p>;
	if (state.step === "failed") return <>{state.lastCancellation && <p role="status">{t(state.lastCancellation.status)}</p>}<p role="alert" className="notice error">{t("messages.slots_failed")}</p><RetryTicket tone="ink" onClick={refresh} /></>;
	if (state.step !== "ready") return null;
	return <>
		{state.cancellationFailed && <p role="alert" className="notice error">{t("cancelFailed")}</p>}
		{state.lastCancellation && <p role="status">{t(state.lastCancellation.status)}</p>}
		{!state.requests.length ? <p className="ledger-empty" role="status">{t("emptyRequests")}</p> : <div className="reqs">
			{state.requests.map(request => {
				const registration = request.userRegistrationState!;
				const past = registration.status === "cancelled" || registration.status === "rejected";
				const date = new Date(request.startsAt);
				const time = formatStart(request.startsAt, i18n.language, timeZone);
				return <article className={`req tear-across${past ? " past" : ""}`} key={registration.id}>
					<div className="date" aria-hidden="true"><b>{day.format(date)}</b><span>{month.format(date)}</span><time>{time}</time></div>
					<div className="body">
						<div className="what"><b>{request.name}</b><time dateTime={request.startsAt}>{fullDate.format(date)}, <bdi>{time}</bdi></time></div>
						<div className="side">
							<span className={`tag${past ? " off" : registration.status === "pending" ? " wait" : ""}`} role="status">{t(registration.status)}</span>
							{upcomingConfirmedStart(request, now) !== null &&
								<TextLink className="cal" href={googleCalendarLink(request)} target="_blank" rel="noopener noreferrer">{t("addToGoogleCalendar")}</TextLink>}
							{request.canCancelRegistration && <Ticket stub="✕" small tone="ghost" aria-label={t("cancel")} disabled={state.cancellingId !== null}
								onClick={() => cancel(registration.id)}>{t(state.cancellingId === registration.id ? "loading" : "cancelShort")}</Ticket>}
						</div>
					</div>
				</article>;
			})}
		</div>}
	</>;
}
