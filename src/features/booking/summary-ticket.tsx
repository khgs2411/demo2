import { useTranslation } from "react-i18next";
import type { BookingProfile } from "./machine";
import type { BookingRegistration, BookingSelection, BookingSlot } from "./machine";
import { addonCopy } from "./package-step";
import { formatWhen } from "./calendar";

export function SummaryTicket({ selection, profile, slot, registration, timeZone }: {
	selection?: BookingSelection; profile?: BookingProfile; slot?: BookingSlot; registration?: BookingRegistration; timeZone: string;
}) {
	const { t, i18n } = useTranslation(["booking", "packages"]);
	const person = [profile?.displayName, profile?.businessName].filter(Boolean).join(" · ");
	return <aside className={`summary ${registration ? "requested" : ""}`} aria-label={t("ticketHead")}>
		<header><span className="mono">{t("ticketHead")}</span><span className="mono" aria-hidden="true">TOPSYDE</span></header>
		<dl>
			<div><dt>{t("tPackage")}</dt><dd>{selection ? t(`packages:offers.${selection.packageId}.name`) : "—"}
				{selection?.addonInterests.map(id => <span className="addons-line" key={id}>+ {t(addonCopy[id])}</span>)}</dd></div>
			<div><dt>{t("tWhen")}</dt><dd className={slot ? "" : "empty"}>{slot ? formatWhen(slot.startsAt, i18n.language, timeZone) : "—"}</dd></div>
			<div className="hide-sm"><dt>{t("tFor")}</dt><dd className={person ? "" : "empty"}>{person || "—"}</dd></div>
		</dl>
		<div className="tear"><span className="status" role="status">{registration ? t(registration.status === "pending" ? "requestedStatus" : registration.status) : t("draft")}</span>
			<span className="num">№ {registration?.id ?? "—"}</span></div>
		{registration && <div className="stamp">{t("stamp")}</div>}
	</aside>;
}
