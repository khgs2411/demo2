import { useTranslation } from "react-i18next";
import { getHeadlineOffers } from "./index";

const rows = ["website", "hosting", "support", "classkit", "changes"] as const;

export function PackageComparison() {
	const { t } = useTranslation("packages");
	const offers = getHeadlineOffers();
	return <section className="package-section" aria-labelledby="package-comparison-title">
		<h2 id="package-comparison-title">{t("comparison.title")}</h2>
		<table className="package-comparison" role="table" aria-labelledby="package-comparison-title">
			<thead><tr><th scope="col">{t("comparison.feature")}</th>
				{offers.map(({ id }) => <th key={id} scope="col">{t(`offers.${id}.name`)}</th>)}
			</tr></thead>
			<tbody>{rows.map((row) => <tr key={row}>
				<th scope="row">{t(`comparison.${row}`)}<small>{t(`comparison.${row}Detail`)}</small></th>
				{offers.map(({ id }) => <td key={id}>
					<span className="comparison-package" aria-hidden="true">{t(`offers.${id}.name`)}</span>
					{t(`comparison.${id === "system" || row === "website" || row === "hosting" ? "included" : "notIncluded"}`)}
				</td>)}
			</tr>)}</tbody>
		</table>
	</section>;
}
