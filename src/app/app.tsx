import { useTranslation } from "react-i18next";
import { LanguageSwitch } from "./language";
import { Routes } from "./routes";

export function App() {
	const { t } = useTranslation("shell");
	return <><p>{t("brand")}</p><LanguageSwitch /><Routes /></>;
}
