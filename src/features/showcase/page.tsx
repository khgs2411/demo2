import { useLayoutEffect } from "react";
import { useTranslation } from "react-i18next";
import type { ShowcaseSection } from "../../app/router";
import { en } from "../../i18n/en";
import { he } from "../../i18n/he";
import { useReducedMotion } from "../../motion/use-reduced-motion";
import { Ticket } from "../../ui/ticket";
import { FeatureSheet } from "./feature-sheet";
import { Hero } from "./hero";
import { HomePackages } from "./home-packages";
import { WhyStrip } from "./why-strip";
import "./home.css";

export function ShowcasePage({ section }: { section?: ShowcaseSection }) {
	const { t, i18n } = useTranslation("shell");
	const english = i18n.resolvedLanguage === "en";
	const copy = english ? en.home : he.home;
	const reduced = useReducedMotion();
	useLayoutEffect(() => {
		if (section) document.getElementById(section)?.scrollIntoView();
	}, [section]);
	return <main data-module="showcase" className="showcase-page">
		<Hero copy={copy} reduced={reduced} />
		<WhyStrip copy={copy.whyMe} reduced={reduced} />
		<FeatureSheet copy={copy} reduced={reduced} english={english} />
		<section className="what-is-classkit" id="what-is-classkit" aria-labelledby="what-is-classkit-heading">
			<div className="wrap">
				<h2 id="what-is-classkit-heading">{copy.whatIsClassKit.title}</h2>
				<p>{copy.whatIsClassKit.description}</p>
			</div>
		</section>
		<HomePackages copy={copy} reduced={reduced} english={english} />
		<section className="close">
			<div className="perfrow" />
			<div className="wrap">
				<div><h2>{copy.closeTitle[0]}<br />{copy.closeTitle[1]}</h2><p>{copy.closeSub}</p></div>
				<div className="cta"><Ticket href="#/book" tone="paper" large stub={t("ticketNumber")}>{t("homeBookMeeting")}</Ticket></div>
			</div>
		</section>
	</main>;
}
