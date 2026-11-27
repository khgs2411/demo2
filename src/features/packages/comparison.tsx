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
			const offers = getHeadlineOffers(line).map(({ id }) => ({
				id, label: t("packageName", { name: t(`offers.${id}.name`) }),
			}));
			const titleId = `package-comparison-${line}`;
			return <div className="package-comparison-line" key={line}>
				<h3 id={titleId}>{t(`lines.${line}.name`)}</h3>
				<table className="package-comparison" role="table" aria-labelledby={titleId}>
					<thead><tr><th scope="col">{t("comparison.feature")}</th>
						{offers.map(({ id, label }) => <th key={id} scope="col">{label}</th>)}
					</tr></thead>
					<tbody>{rows[line].map(row => <tr key={row}>
						<th scope="row">{t(`comparison.${row}`)}</th>
						{offers.map(({ id, label }) => <td key={id}>
							<span className="comparison-package" aria-hidden="true">{label}</span>
							<span>{t(`offers.${id}.comparison.${row}`)}</span>
						</td>)}
					</tr>)}</tbody>
				</table>
			</div>;
		})}
	</section>;
}
