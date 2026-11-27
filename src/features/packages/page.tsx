import { useTranslation } from "react-i18next";
import { PackageLedger } from "./ledger";
import { PackageAddons } from "./addons";
import { PackageFaq } from "./faq";
import "./packages.css";

export function PackagesPage() {
	const { t } = useTranslation("packages");
	return <main data-module="packages" className="packages-page">
		<h1>{t("pageTitle")}</h1>
		<p className="package-intro">{t("intro")}</p>
		<PackageLedger />
		<PackageAddons />
		<PackageFaq />
	</main>;
}
