import { useTranslation } from "react-i18next";
import { getBookingOptions, getHeadlineOffers, PackageOfferLedger } from "../packages";
import { Kicker } from "../../ui/kicker";

export function OffersTeaser() {
	const { t } = useTranslation("packages");
	const offers = getHeadlineOffers().filter(({ id }) => id === "system-studio" || id === "site-quick");
	return <section className="showcase-offers" id="offers" aria-labelledby="showcase-offers-title">
		<Kicker>{t("label")}</Kicker>
		<h2 id="showcase-offers-title">{t("title")}</h2>
		<PackageOfferLedger offers={offers} />
		<div className="showcase-addons">
			<b>{t("addons.title")} · {t("addons.price")}</b>
			{getBookingOptions().addons.map(offer => <span key={offer.id}>{t(`offers.${offer.id}.name`)}</span>)}
		</div>
	</section>;
}
