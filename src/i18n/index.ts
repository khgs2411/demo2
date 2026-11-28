import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { he } from "./he";
import { en } from "./en";

const languageStorageKey = "demo2-showcase-language";

export function readStoredLanguage(): "he" | "en" {
	try {
		return localStorage.getItem(languageStorageKey) === "en" ? "en" : "he";
	} catch {
		return "he";
	}
}

i18n.on("languageChanged", (language) => {
	const english = language === "en";
	document.documentElement.lang = english ? "en" : "he";
	document.documentElement.dir = english ? "ltr" : "rtl";
	document.title = i18n.t("brand");
	const metadata = {
		'name="description"': i18n.t("description"),
		'property="og:title"': i18n.t("brand"),
		'property="og:description"': i18n.t("description"),
		'property="og:locale"': english ? "en_US" : "he_IL",
	};
	for (const [selector, content] of Object.entries(metadata)) {
		document.querySelector(`meta[${selector}]`)?.setAttribute("content", content);
	}
	try {
		localStorage.setItem(languageStorageKey, english ? "en" : "he");
	} catch {
		// Language switching remains available when storage is blocked.
	}
});

const requestedLanguage = new URLSearchParams(window.location.search).get("lang");

void i18n.use(initReactI18next).init({
	lng: requestedLanguage === "en" || requestedLanguage === "he" ? requestedLanguage : readStoredLanguage(),
	fallbackLng: "he",
	supportedLngs: ["he", "en"],
	defaultNS: "shell",
	interpolation: { escapeValue: false },
	resources: { he, en },
});

export { i18n };
