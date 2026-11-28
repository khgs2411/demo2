import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useReducedMotion } from "../../motion/use-reduced-motion";
import { Pass } from "../../ui/pass";
import { TextLink } from "../../ui/text-link";
import { getHeadlineOffers, serviceLines, type StudioPackage } from "./catalog";
import { PackageBenefits } from "./offer-details";

const passTones = ["sand", "coral", "ink"] as const;
const passFanDelay = 350; // packages.html starts the fan after the fonts have settled.

function PackageBookingLink({ offer }: { offer: StudioPackage }) {
	const { t } = useTranslation("packages");
	return <TextLink href={`#/book/${offer.id}`} aria-label={t("bookPackage", { name: t(`offers.${offer.id}.name`) })}>
		{t("book")}
	</TextLink>;
}

function MonthlyPasses({ offers }: { offers: readonly StudioPackage[] }) {
	const { t } = useTranslation("packages");
	const reduced = useReducedMotion();
	const [stacked, setStacked] = useState(() => !reduced);
	useEffect(() => {
		if (reduced || !stacked) return;
		let active = true;
		let timer: ReturnType<typeof setTimeout> | undefined;
		void document.fonts?.ready.then(() => {
			if (active) timer = setTimeout(() => setStacked(false), passFanDelay);
		});
		return () => {
			active = false;
			clearTimeout(timer);
		};
	}, [reduced, stacked]);

	return <div className={`package-passes${!reduced && stacked ? " stacked" : ""}`}>
		{offers.map((offer, index) => <Pass key={offer.id} variant="package" tone={passTones[index]}
			stamp={offer.recommended ? t("recommendedStamp") : undefined}
			stub={<><PackageBookingLink offer={offer} /><span className="serial">{t("minimum")}</span></>}>
			<div className="name"><h3>{t(`offers.${offer.id}.name`)}</h3><span className="admit">{t("lines.system.name")}</span></div>
			<div className="price"><bdi>{t(offer.priceKey)}</bdi><small>{t("monthly")}</small></div>
			<PackageBenefits offer={offer} />
		</Pass>)}
	</div>;
}

function SiteTickets({ offers }: { offers: readonly StudioPackage[] }) {
	const { t } = useTranslation("packages");
	return <div className="rides">{offers.map(offer => <article className="ride" key={offer.id}>
		<div className="r-body">
			<div className="r-name"><h3>{t(`offers.${offer.id}.name`)}</h3>{offer.mark && <span className="mark">{t(offer.mark)}</span>}</div>
			<PackageBenefits offer={offer} />
		</div>
		<div className="r-stub">
			<bdi className="price">{t(offer.priceKey)}</bdi>
			<span className="once">{t("once")}</span>
			<PackageBookingLink offer={offer} />
		</div>
	</article>)}</div>;
}

export function PackageLedger() {
	const { t } = useTranslation("packages");
	return <>{serviceLines.map(line => <section className="package-line" key={line} aria-labelledby={`package-line-${line}`}>
		<div className="package-line-head">
			<h2 id={`package-line-${line}`}>{t(`lines.${line}.name`)}</h2>
			<p>{t(`lines.${line}.terms`)}</p>
		</div>
		{line === "system" ? <MonthlyPasses offers={getHeadlineOffers(line)} /> : <SiteTickets offers={getHeadlineOffers(line)} />}
	</section>)}</>;
}
