import { useTranslation } from "react-i18next";
import { openBooking } from "../../app/open-booking";
import { LedgerRow } from "../../ui/ledger-row";
import { Ticket } from "../../ui/ticket";
import { getHeadlineOffers } from "./index";

export function PackageLedger() {
	const { t } = useTranslation("packages");
	return <div className="ledger">
		{getHeadlineOffers().map((entry, index) => <LedgerRow key={entry.id}
			name={<h2>{t(`offers.${entry.id}.name`)}{entry.recommended && <span className="package-recommended">{t("recommended")}</span>}</h2>}
			price={<><bdi>{t(entry.priceKey)}</bdi><small>{t(`offers.${entry.id}.terms`)}</small></>}
			details={t(`offers.${entry.id}.summary`)}>
			<Ticket stub={`№ 0${index + 1}`} aria-label={t("bookPackage", { name: t(`offers.${entry.id}.name`) })}
				onClick={() => openBooking({ packageId: entry.id })}>{t("book")}</Ticket>
		</LedgerRow>)}
	</div>;
}
