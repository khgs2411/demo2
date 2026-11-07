import { useTranslation } from "react-i18next";

export function BookingPage() {
	const { t } = useTranslation("booking");
	return <main data-module="booking"><h1>{t("title")}</h1><p>{t("placeholder")}</p></main>;
}
