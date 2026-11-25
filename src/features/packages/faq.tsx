import { useTranslation } from "react-i18next";

const questions = ["minimum", "advance", "support", "hosting", "partnerAgent"] as const;

export function PackageFaq() {
	const { t } = useTranslation("packages");
	return <section className="package-section package-faq" aria-labelledby="package-faq-title">
		<h2 id="package-faq-title">{t("faq.title")}</h2>
		<div className="package-disclosures">{questions.map((key) => <details key={key}>
			<summary>{t(`faq.${key}.question`)}</summary>
			<p>{t(`faq.${key}.answer`)}</p>
		</details>)}</div>
	</section>;
}
