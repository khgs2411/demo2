import { useTranslation } from "react-i18next";
import { openBooking } from "../../app/open-booking";
import { LedgerRow } from "../../ui/ledger-row";
import { Ticket } from "../../ui/ticket";
import { getHeadlineOffers, serviceLines, type StudioPackage } from "./catalog";

export function PackageOfferLedger({ offers }: { offers: readonly StudioPackage[] }) {
	const { t } = useTranslation("packages");
	return <div className="ledger">
		{offers.map((entry, index) => {
			const name = t(`offers.${entry.id}.name`);
			const mark = entry.recommended ? "recommended" : entry.mark;
			return <LedgerRow key={entry.id}
				name={<h3>{name}{mark && <span className="package-mark">{t(mark)}</span>}</h3>}
				price={<><bdi>{t(entry.priceKey)}</bdi><small>{t(`lines.${entry.line}.period`)}</small></>}
				details={<>
					<p>{t(`offers.${entry.id}.summary`)}</p>
					{entry.id !== "system-studio" && entry.id !== "site-landing" && <p className="package-difference">{t(`offers.${entry.id}.difference`)}</p>}
				</>}>
				<Ticket stub={`№ 0${index + 1}`} aria-label={t("bookPackage", { name })}
					onClick={() => openBooking({ packageId: entry.id })}>{t("book")}</Ticket>
			</LedgerRow>;
		})}
	</div>;
}

export function PackageLedger() {
	const { t } = useTranslation("packages");
	return <>{serviceLines.map(line => <section className="package-line" key={line} aria-labelledby={`package-line-${line}`}>
		<h2 id={`package-line-${line}`}>{t(`lines.${line}.name`)}</h2>
		<p>{t(`lines.${line}.terms`)}</p>
		<PackageOfferLedger offers={getHeadlineOffers(line)} />
	</section>)}</>;
}
