import { useTranslation } from "react-i18next";
import { getHeadlineOffers, serviceLines } from "./catalog";

const rows = {
	system: ["support", "replies", "changes", "agent", "review"],
	site: ["pages", "design", "revisions", "languages", "fixes"],
} as const;

export function PackageComparison() {
	const { t } = useTranslation("packages");
	return <section className="package-section" aria-labelledby="package-comparison-title">
		<h2 id="package-comparison-title">{t("comparison.title")}</h2>
		{serviceLines.map(line => {
			const offers = getHeadlineOffers(line);
			const titleId = `package-comparison-${line}`;
			return <div className="package-comparison-line" key={line}>
				<h3 id={titleId}>{t(`lines.${line}.name`)}</h3>
				<table className="package-comparison" role="table" aria-labelledby={titleId}>
					<thead><tr><th scope="col">{t("comparison.feature")}</th>
						{offers.map(({ id }) => <th key={id} scope="col">{t(`offers.${id}.name`)}</th>)}
					</tr></thead>
					<tbody>{rows[line].map(row => <tr key={row}>
						<th scope="row">{t(`comparison.${row}`)}</th>
						{offers.map(({ id }) => <td key={id}>
							<span className="comparison-package" aria-hidden="true">{t(`offers.${id}.name`)}</span>
							<span>{t(`offers.${id}.comparison.${row}`)}</span>
						</td>)}
					</tr>)}</tbody>
				</table>
			</div>;
		})}
	</section>;
}
