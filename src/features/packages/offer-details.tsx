import { useTranslation } from "react-i18next";
import { getHeadlineOffers, type StudioPackage } from "./catalog";

export function PackageBenefits({ offer }: { offer: StudioPackage }) {
	const { t } = useTranslation("packages");
	const inherited = offer.inherits && getHeadlineOffers().find(entry => entry.id === offer.inherits);
	return <ul className="package-benefits">
		{inherited && <li className="inherited">{t(`inherits.${inherited.id}`)}</li>}
		{offer.featureKeys.filter(key => !inherited || !inherited.featureKeys.includes(key)).map(key => <li key={key}>{t(key)}</li>)}
	</ul>;
}
