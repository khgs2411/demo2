import { useTranslation } from "react-i18next";
import type { BookingProfile } from "./machine";
import type { BookingRegistration, BookingSelection, BookingSlot } from "./machine";
import { formatWhen } from "./calendar";

export function SummaryTicket({ selection, profile, slot, registration, timeZone }: {
	selection?: BookingSelection; profile?: BookingProfile; slot?: BookingSlot; registration?: BookingRegistration; timeZone: string;
}) {
	const { t, i18n } = useTranslation(["booking", "packages"]);
	const person = [profile?.displayName, profile?.businessName].filter(Boolean).join(" · ");
	return <aside className={`pass summary ${registration ? "requested" : ""}`} aria-label={t("ticketHead")}>
		<header><b>{t("ticketHead")}</b><span aria-hidden="true">Topsyde</span></header>
		<dl>
			<div><dt>{t("tPackage")}</dt><dd>{selection ? t("packages:packageName", { name: t(`packages:offers.${selection.packageId}.name`) }) : "—"}
				{selection?.addonInterests.map(id => <span className="addons-line" key={id}>+ {t(`packages:offers.${id}.name`)}</span>)}</dd></div>
			<div><dt>{t("tWhen")}</dt><dd className={slot ? "" : "empty"}>{slot ? formatWhen(slot.startsAt, i18n.language, timeZone) : "—"}</dd></div>
			<div className="hide-sm"><dt>{t("tFor")}</dt><dd className={person ? "" : "empty"}>{person || "—"}</dd></div>
		</dl>
		<div className="tear"><span className="status" role="status">{registration ? t(registration.status === "pending" ? "requestedStatus" : registration.status) : t("draft")}</span>
			<bdi className="num">№ {registration?.id ?? "—"}</bdi></div>
		{registration && <div className="stamp" aria-hidden="true">{t("stamp")}</div>}
	</aside>;
}
