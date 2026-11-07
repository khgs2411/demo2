import { useTranslation } from "react-i18next";

export function PackagesPage() {
	const { t } = useTranslation("packages");
	return <main data-module="packages"><h1>{t("title")}</h1><p>{t("placeholder")}</p></main>;
}
