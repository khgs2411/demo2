import { useTranslation } from "react-i18next";

export function LanguageSwitch() {
	const { t, i18n } = useTranslation("shell");
	const target = i18n.language === "he" ? "en" : "he";
	return (
		<button className="lang" type="button" lang={target} aria-label={t("languageSwitchLabel")}
			onClick={() => {
				const url = new URL(window.location.href);
				if (url.searchParams.has("lang")) {
					url.searchParams.set("lang", target);
					window.history.replaceState(window.history.state, "", url);
				}
				void i18n.changeLanguage(target);
			}}>
			{t("languageSwitch")}
		</button>
	);
}
