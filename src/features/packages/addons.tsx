import { useTranslation } from "react-i18next";
import { catalog } from "./catalog";

export function PackageAddons() {
	const { t } = useTranslation("packages");
	return <section className="package-addons" aria-labelledby="package-addons-title">
		<div><h2 id="package-addons-title">{t("addons.title")}</h2>
		<p>{t("addons.price")}</p></div>
		<ul>{catalog.filter(({ kind }) => kind === "addon").map(({ id }) => <li key={id}>{t(`offers.${id}.name`)}</li>)}</ul>
	</section>;
}
