import { useTranslation } from "react-i18next";
import { openBooking } from "../../app/open-booking";
import { Ticket } from "../../ui/ticket";
import { getHeadlineOffers, serviceLines, type StudioPackage } from "./catalog";
import { PackageBenefits, PackagePrice } from "./offer-details";

export function PackageOfferLedger({ offers, emphasizeRecommended = false }: {
	offers: readonly StudioPackage[]; emphasizeRecommended?: boolean;
}) {
	const { t } = useTranslation("packages");
	return <div className="ledger">
		{offers.map(entry => {
			const name = t(`offers.${entry.id}.name`);
			const mark = entry.recommended ? "recommended" : entry.mark;
			const markClass = entry.recommended ? "package-mark package-mark-recommended" : "package-mark";
			return <article className="package-card" key={entry.id}>
				<div>
					<h3>{t("packageName", { name })}{mark && <span className={markClass}>{t(mark)}</span>}</h3>
					<PackagePrice offer={entry} />
				</div>
				<PackageBenefits offer={entry} />
				<Ticket stub="↗" tone={emphasizeRecommended && !entry.recommended ? "ghost" : "coral"}
					aria-label={t("bookPackage", { name })}
					onClick={() => openBooking({ packageId: entry.id })}>{t("book")}</Ticket>
			</article>;
		})}
	</div>;
}

export function PackageLedger() {
	const { t } = useTranslation("packages");
	return <>{serviceLines.map(line => <section className="package-line" key={line} aria-labelledby={`package-line-${line}`}>
		<h2 id={`package-line-${line}`}>{t(`lines.${line}.name`)}</h2>
		<PackageOfferLedger offers={getHeadlineOffers(line)} emphasizeRecommended />
	</section>)}</>;
}
