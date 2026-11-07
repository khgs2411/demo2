import { useTranslation } from "react-i18next";
import { Kicker } from "../../ui/kicker";
import { PackageLedger } from "./ledger";
import { PackageAddons } from "./addons";
import { PackageComparison } from "./comparison";
import { PackageFaq } from "./faq";
import "./packages.css";

export function PackagesPage() {
	const { t } = useTranslation("packages");
	return <main data-module="packages" className="packages-page">
		<Kicker>{t("label")}</Kicker>
		<h1>{t("title")}</h1>
		<PackageLedger />
		<PackageAddons />
		<PackageComparison />
		<PackageFaq />
	</main>;
}
