import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Ticket } from "../../ui/ticket";
import { formatStart, groupWeek } from "./calendar";
import type { BookingRange } from "./adapter";
import type { BookingSlot } from "./machine";

export function WeekGrid({ range, slots, selectedId, timeZone, onChoose, onMove, canGoBack }: {
	range: BookingRange; slots: readonly BookingSlot[]; selectedId: string | null; timeZone: string;
	onChoose: (id: string) => void; onMove: (direction: -1 | 1) => void; canGoBack: boolean;
}) {
	const { t, i18n } = useTranslation("booking");
	const days = groupWeek(range, slots, timeZone);
	const [activeKey, setActiveKey] = useState<string | null>(null);
	const active = days.find(day => day.key === activeKey) ?? days.find(day => day.slots.some(slot => slot.id === selectedId)) ?? days.find(day => day.slots.length) ?? days[0];
	const date = new Intl.DateTimeFormat(i18n.language, { timeZone, day: "numeric", month: "long" });
	const weekday = new Intl.DateTimeFormat(i18n.language, { timeZone, weekday: "short" });
	return <>
		<div className="week-nav"><Ticket stub="" className="booking-link" disabled={!canGoBack} onClick={() => onMove(-1)}>{t("prevWeek")}</Ticket>
			<span className="range">{date.format(days[0].date)} – {date.format(days.at(-1)!.date)}</span>
			<Ticket stub="" className="booking-link" onClick={() => onMove(1)}>{t("nextWeek")}</Ticket></div>
		<div className="days-row" style={{ gridTemplateColumns: `repeat(${days.length}, 1fr)` }}>
			{days.map(day => <Ticket stub="" key={day.key} className="day-tab" aria-pressed={day === active} onClick={() => setActiveKey(day.key)}>
				{weekday.format(day.date)}<b>{new Intl.DateTimeFormat(i18n.language, { timeZone, day: "numeric" }).format(day.date)}</b>
			</Ticket>)}
		</div>
		<div className="week" style={{ "--days": days.length } as React.CSSProperties}>
			{days.map(day => <section className={`day ${day === active ? "active" : ""}`} key={day.key} aria-label={date.format(day.date)}>
				<h2>{weekday.format(day.date)}<b>{day.date.toLocaleDateString(i18n.language, { timeZone, day: "numeric" })}</b></h2>
				<div className="times">{day.slots.length ? day.slots.map(slot => <Ticket stub="" key={slot.id} className={`time ${slot.id === selectedId ? "picked" : ""}`}
					disabled={!slot.canRegister} aria-pressed={slot.id === selectedId} onClick={() => onChoose(slot.id)}>
					{formatStart(slot.startsAt, i18n.language, timeZone)}{slot.id === selectedId && <span className="mine">{t("picked")}</span>}
				</Ticket>) : <span className="none">{t("noSlots")}</span>}</div>
			</section>)}
		</div>
		<p className="tz">{timeZone === "Asia/Jerusalem" ? t("tz") : t("timezone", { zone: timeZone })}</p>
	</>;
}
