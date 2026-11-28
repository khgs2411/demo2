import { useTranslation } from "react-i18next";
import { PackageLedger } from "./ledger";
import { PackageAddons } from "./addons";
import { PackageFaq } from "./faq";
import "./packages.css";

export function PackagesPage() {
	const { t } = useTranslation("packages");
	return <main data-module="packages" className="inner-page packages-page">
		<div className="inner-wrap">
			<section className="package-intro">
				<h1>{t("pageTitle")}</h1>
				<div className="package-explain"><h2>{t("explainTitle")}</h2><p>{t("intro")}</p></div>
			</section>
			<PackageLedger />
			<PackageAddons />
			<PackageFaq />
		</div>
	</main>;
}
