import { useTranslation } from "react-i18next";

export function AdminSimPage() {
	const { t } = useTranslation("admin-sim");
	return <main data-module="admin-sim"><h1>{t("title")}</h1><p>{t("placeholder")}</p></main>;
}
