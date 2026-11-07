import { useTranslation } from "react-i18next";

export function ShowcasePage() {
	const { t } = useTranslation("showcase");
	return <main data-module="showcase"><h1>{t("title")}</h1><p>{t("placeholder")}</p></main>;
}
