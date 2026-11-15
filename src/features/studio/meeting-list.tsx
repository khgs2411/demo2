import { useTranslation } from "react-i18next";
import type { ManagementRegistrationSummary } from "@class-kit/react";
import { Ticket } from "../../ui/ticket";
import { Input } from "../../ui/input";

type Decide = (id: string, action: "approve" | "reject", reason?: string) => void;
export function MeetingList({ rows, busy, onDecide, showStatus }: { rows: readonly ManagementRegistrationSummary[]; busy?: boolean; onDecide?: Decide; showStatus?: boolean }) {
	const { t, i18n } = useTranslation("studio");
	const dates = new Intl.DateTimeFormat(i18n.language === "he" ? "he-IL" : "en-GB", {dateStyle:"medium",timeStyle:"short"});
	function date(value: string) { return <time dateTime={value}>{dates.format(new Date(value))}</time>; }
	return <ul className="studio-meetings">{rows.map(row => <li key={row.id}>
		<dl>
			<div><dt>{t("customer")}</dt><dd>{row.customer?.displayName ?? row.user?.displayName ?? t("unavailable")}</dd></div>
			<div><dt>{t("email")}</dt><dd><bdi>{row.customer?.contactEmail ?? row.user?.email ?? t("unavailable")}</bdi></dd></div>
			<div><dt>{t("phone")}</dt><dd><bdi>{row.customer?.phoneNumber ?? t("unavailable")}</bdi></dd></div>
			<div><dt>{t("package")}</dt><dd>{row.class?.name ?? t("unavailable")}</dd></div>
			<div><dt>{t("startsAt")}</dt><dd>{row.class ? date(row.class.startsAt) : t("unavailable")}</dd></div>
			<div><dt>{t("requestedAt")}</dt><dd>{date(row.createdAt)}</dd></div>
			{showStatus && <div><dt>{t("status")}</dt><dd>{t(row.registrationStatus, { ns: "booking" })}</dd></div>}
		</dl>
		{onDecide && <form onSubmit={event => {
			event.preventDefault();
			onDecide(row.id,"reject",String(new FormData(event.currentTarget).get("reason") ?? "").trim());
		}}><fieldset disabled={busy}>
			<Input label={t("reason")} name="reason" />
			<div className="actions">
				<Ticket stub="" onClick={() => onDecide(row.id,"approve")}>{t("approve")}</Ticket>
				<Ticket stub="" type="submit" className="booking-link">{t("reject")}</Ticket>
			</div>
		</fieldset></form>}
	</li>)}</ul>;
}
