import { useTranslation } from "react-i18next";
import type { StudioPackage } from "./catalog";

export function PackagePrice({ offer }: { offer: StudioPackage }) {
	const { t } = useTranslation("packages");
	return <span className="package-price"><bdi>{t(offer.priceKey)}</bdi>{" "}{t(`lines.${offer.line}.payment`)}</span>;
}

export function PackageBenefits({ offer }: { offer: StudioPackage }) {
	const { t } = useTranslation("packages");
	return <ul className="package-benefits">
		{offer.featureKeys.map(key => <li key={key}>{t(key)}</li>)}
	</ul>;
}
