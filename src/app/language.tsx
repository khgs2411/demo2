import { useTranslation } from "react-i18next";

export function LanguageSwitch() {
	const { t, i18n } = useTranslation("shell");
	const target = i18n.language === "he" ? "en" : "he";
	return (
		<button type="button" lang={target} aria-label={t("languageSwitchLabel")}
			onClick={() => void i18n.changeLanguage(target)}>
			{t("languageSwitch")}
		</button>
	);
}
