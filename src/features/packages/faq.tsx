import { useTranslation } from "react-i18next";

const questions = ["support", "hosting"] as const;

export function PackageFaq() {
	const { t } = useTranslation("packages");
	return <section className="package-faq" aria-labelledby="package-faq-title">
		<h2 id="package-faq-title">{t("faq.title")}</h2>
		<div className="package-disclosures">{questions.map((key, index) => <details key={key} open={index === 0}>
			<summary>{t(`faq.${key}.question`)}<i aria-hidden="true" /></summary>
			<p>{t(`faq.${key}.answer`)}</p>
		</details>)}</div>
	</section>;
}
