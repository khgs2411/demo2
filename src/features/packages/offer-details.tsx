import { useTranslation } from "react-i18next";
import type { StudioPackage } from "./catalog";

export function PackageBenefits({ offer }: { offer: StudioPackage }) {
	const { t } = useTranslation("packages");
	const inherited = offer.id === "system-studio" ? "basic" : offer.id === "system-partner" ? "studio" : undefined;
	const inheritedKeys = inherited === "basic" ? ["features.website", "features.app"] :
		inherited === "studio" ? ["features.website", "features.app", "features.changes", "features.documentsAndAccess", "features.updates"] : [];
	return <ul className="package-benefits">
		{inherited && <li className="inherited">{t(`inherits.${inherited}`)}</li>}
		{offer.featureKeys.filter(key => !inheritedKeys.includes(key)).map(key => <li key={key}>{t(key)}</li>)}
	</ul>;
}
