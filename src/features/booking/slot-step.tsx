import { useTranslation } from "react-i18next";
import { Ticket } from "../../ui/ticket";
import { WeekGrid } from "./week-grid";
import { formatStart, weekRange } from "./calendar";
import type { useBooking } from "./use-booking";

export function SlotStep({ flow, timeZone }: { flow: ReturnType<typeof useBooking>; timeZone: string }) {
	const { t, i18n } = useTranslation("booking");
	const state = flow.state;
	if (state.step !== "choosing_slot" && state.step !== "checking_terms" && state.step !== "submitting") return null;
	const busy = state.step !== "choosing_slot";
	const guest = state.userId === null;
	const selected = state.slots.find(slot => slot.id === state.selection.slotId);
	return <>
		<h1 tabIndex={-1}>{t("sTitle")}</h1>
		{state.availability === "not_open" ? <div className="closed" role="status"><b>{t("closedTitle")}</b><span>{t("closedBody")}</span></div> : <>
			<p className="lede">{t("sLede")}</p>
			{state.notice === "slot_full" && <p role="alert" className="notice error">{t("slotFull")}</p>}
			{state.availability === "loading" ? <p role="status">{t("loading")}</p> : <fieldset disabled={busy}>
				<WeekGrid range={flow.range} slots={state.slots} selectedId={state.selection.slotId} timeZone={timeZone}
					onChoose={slotId => flow.send({ type:"slot_chosen", slotId })} onMove={flow.moveWeek} canGoBack={flow.range.start > weekRange(new Date()).start} />
			</fieldset>}
			<div className="actions"><Ticket stub={selected ? formatStart(selected.startsAt, i18n.language, timeZone) : "—"} disabled={!selected || busy} onClick={() => flow.send({ type: guest ? "signup_opened" : "submit_requested" })}>{t(busy ? "loading" : guest ? "next" : "send")}</Ticket>
				<Ticket className="booking-link" stub="" disabled={busy} onClick={() => flow.send({ type:"profile_reopened" })}>{t("back")}</Ticket></div>
		</>}
	</>;
}
