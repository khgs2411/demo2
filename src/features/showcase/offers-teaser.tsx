import { useTranslation } from "react-i18next";
import { getBookingOptions, getHeadlineOffers } from "../packages";
import { openBooking } from "../../app/open-booking";
import { Kicker } from "../../ui/kicker";
import { LedgerRow } from "../../ui/ledger-row";
import { Ticket } from "../../ui/ticket";

export function OffersTeaser() {
	const { t } = useTranslation("packages");
	return <section className="showcase-offers" id="offers" aria-labelledby="showcase-offers-title">
		<Kicker>{t("label")}</Kicker>
		<h2 id="showcase-offers-title">{t("title")}</h2>
		<div className="ledger">
			{getHeadlineOffers().map((offer, index) => <LedgerRow key={offer.id}
				name={<h3>{t(`offers.${offer.id}.name`)}{offer.recommended && <sup>{t("recommended")}</sup>}</h3>}
				price={<><bdi>{t(offer.priceKey)}</bdi><small>{t(`offers.${offer.id}.terms`)}</small></>}
				details={t(`offers.${offer.id}.summary`)}>
				<Ticket stub={`№ 0${index + 1}`} aria-label={t("bookPackage", { name: t(`offers.${offer.id}.name`) })}
					onClick={() => openBooking({ packageId: offer.id })}>{t("book")}</Ticket>
			</LedgerRow>)}
		</div>
		<div className="showcase-addons">
			<b>{t("addons.title")} · {t("addons.price")}</b>
			{getBookingOptions().addons.map(offer => <span key={offer.id}>{t(`offers.${offer.id}.name`)}</span>)}
		</div>
	</section>;
}
