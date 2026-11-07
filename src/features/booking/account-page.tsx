import { useTranslation } from "react-i18next";

export function AccountPage() {
	const { t } = useTranslation("booking");
	return <main data-module="booking"><h1>{t("account.title")}</h1><p>{t("account.placeholder")}</p></main>;
}
