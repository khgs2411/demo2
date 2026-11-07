import { useTranslation } from "react-i18next";
import { Kicker } from "../../ui/kicker";
import { PackageLedger } from "./ledger";
import "./packages.css";

export function PackagesPage() {
	const { t } = useTranslation("packages");
	return <main data-module="packages" className="packages-page">
		<Kicker>{t("label")}</Kicker>
		<h1>{t("title")}</h1>
		<PackageLedger />
	</main>;
}
