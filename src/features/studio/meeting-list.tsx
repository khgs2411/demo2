import { useTranslation } from "react-i18next";
import type { ManagementRegistrationSummary } from "@class-kit/react";
import { Ticket } from "../../ui/ticket";
import { Input } from "../../ui/input";
import type { StampedDecision } from "./use-studio";

type Decide = (id: string, action: "approve" | "reject", reason?: string) => void;
export function MeetingList({ rows, busy, onDecide, showStatus, stampedDecision }: { rows: readonly ManagementRegistrationSummary[]; busy?: boolean; onDecide?: Decide; showStatus?: boolean; stampedDecision?: StampedDecision }) {
	const { t, i18n } = useTranslation("studio");
	const dates = new Intl.DateTimeFormat(i18n.language === "he" ? "he-IL" : "en-GB", {dateStyle:"medium",timeStyle:"short"});
	function date(value: string) { return <time dateTime={value}>{dates.format(new Date(value))}</time>; }
	return <ul className="studio-meetings">{rows.map(row => {
		const stamp = stampedDecision?.id === row.id ? stampedDecision.action : undefined;
		return <li className={onDecide ? `pass mt pending tear-across${stamp ? " leaving" : ""}` : "mt plain"} key={row.id}>
			<dl>
				<div><dt>{t("customer")}</dt><dd className="customer-name">{row.customer?.displayName ?? row.user?.displayName ?? t("unavailable")}</dd></div>
				<div><dt>{t("package")}</dt><dd className="package-name">{row.class?.name ?? t("unavailable")}</dd></div>
				<div><dt>{t("startsAt")}</dt><dd className="meeting-meta">{row.class ? date(row.class.startsAt) : t("unavailable")}</dd></div>
				<div><dt>{t("email")}</dt><dd className="meeting-meta"><bdi>{row.customer?.contactEmail ?? row.user?.email ?? t("unavailable")}</bdi></dd></div>
				<div><dt>{t("phone")}</dt><dd className="meeting-meta"><bdi>{row.customer?.phoneNumber ?? t("unavailable")}</bdi></dd></div>
				<div><dt>{t("requestedAt")}</dt><dd className="meeting-meta">{date(row.createdAt)}</dd></div>
				{showStatus && <div><dt>{t("status")}</dt><dd><span className="tag off">{t(row.registrationStatus, { ns: "booking" })}</span></dd></div>}
			</dl>
			{onDecide && <form className="decide" onSubmit={event => {
				event.preventDefault();
				onDecide(row.id,"reject",String(new FormData(event.currentTarget).get("reason") ?? "").trim());
			}}><fieldset className="fields" disabled={busy}>
				<Input label={t("reason")} name="reason" />
			</fieldset>
				<div className="actions">
					<Ticket disabled={busy} small stub="✓" onClick={() => onDecide(row.id,"approve")}>{t("approve")}</Ticket>
					<Ticket disabled={busy} small stub="✕" tone="ink" type="submit">{t("reject")}</Ticket>
				</div>
			</form>}
			{stamp && <span className={`stamp ${stamp}`} aria-hidden="true">{t(stamp === "approve" ? "approvedStamp" : "declinedStamp")}</span>}
		</li>;
	})}</ul>;
}
