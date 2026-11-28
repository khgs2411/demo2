import { useTranslation } from "react-i18next";
import { SectionLink } from "../../ui/section-link";
import { TextLink } from "../../ui/text-link";
import { Ticket } from "../../ui/ticket";
import { PackageLedger } from "./ledger";
import { PackageAddons } from "./addons";
import { PackageFaq } from "./faq";
import "./packages.css";

export function PackagesPage() {
	const { t } = useTranslation("packages");
	return <main data-module="packages" className="inner-page packages-page">
		<div className="inner-wrap">
			<section className="package-intro">
				<h1>{t("pageTitle")}</h1>
				<div className="package-explain">
					<h2>{t("explainTitle")}</h2>
					<p>{t("intro")}</p>
					<TextLink href="#what-is-classkit">{t("moreAboutClassKit")}</TextLink>
				</div>
				<p className="price-hint">
					<span className="ast" aria-hidden="true">*</span>{t("priceHint")}{" "}
					<SectionLink className="link-arrow" href="#/packages" targetId="price-note">{t("priceHintLink")}</SectionLink>
				</p>
			</section>
			<PackageLedger />
			<PackageAddons />
			<PackageFaq />
			<section className="price-note" id="price-note" aria-labelledby="price-note-title" tabIndex={-1}>
				<div>
					<h2 id="price-note-title"><span className="ast" aria-hidden="true">*</span>{t("priceNote.title")}</h2>
					<p>{t("priceNote.body")}</p>
				</div>
				<Ticket href="#/book" stub="№ 02" tone="ink">{t("priceNote.cta")}</Ticket>
			</section>
		</div>
	</main>;
}
