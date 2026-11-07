import i18n from "i18next";
import { initReactI18next } from "react-i18next";

void i18n.use(initReactI18next).init({
	lng: "he",
	fallbackLng: "he",
	defaultNS: "shell",
	interpolation: { escapeValue: false },
	resources: {
		he: {
			shell: { brand: "Topsyde Studios" },
			showcase: { title: "ברוכים הבאים", placeholder: "היכרות עם השירותים שלנו תופיע כאן." },
			packages: { title: "חבילות", placeholder: "החבילות שלנו יופיעו כאן." },
			"admin-sim": { title: "הדגמה", placeholder: "הדגמת המערכת תופיע כאן." },
			booking: {
				title: "קביעת פגישה עסקית",
				placeholder: "בקשת פגישה עסקית תתאפשר כאן.",
				account: { title: "הבקשות שלי", placeholder: "בקשות הפגישה שלך יופיעו כאן." },
			},
		},
	},
});

export { i18n };
