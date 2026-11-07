import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { SimStep } from "./machine";
import type { SimulationScenario } from "./scenarios/types";

type MockSiteProps = { scenario: SimulationScenario; step: SimStep; onOpenTicket: () => void; shown?: boolean };

export function MockSite({ scenario, step, onOpenTicket, shown = true }: MockSiteProps) {
	const { t, i18n } = useTranslation("admin-sim");
	const [comparison, setComparison] = useState(100);
	const fixed = step === "live" && scenario.fixedRender.bookingButtonFixed;
	const rtl = i18n.dir() === "rtl";
	const brokenStyle = rtl ? scenario.defect.brokenStyle : scenario.defect.ltrBrokenStyle;
	const site = "scenarios.brokenBookingButton.";
	return <section className={`sim-topside ${fixed ? "fixed" : "broken"} ${shown ? "shown" : ""}`} data-side="top" id="sim-panel-top" role="tabpanel" aria-label={t("topTab")}>
		<span className="sim-label">{t("topLabel")}</span>
		<div className="sim-site">
			<div className="sim-site-nav"><span>{t(scenario.siteNameKey)}</span><small>{t(`${site}siteNav`)}</small></div>
			<h2>{t(`${site}siteTitle`)}</h2><p>{t(`${site}siteBody`)}</p>
			<div className="sim-cta-row">
				{!fixed && (step === "bug"
					? <button type="button" className="sim-defect-mark" aria-label={t(scenario.defect.descriptionKey)} onClick={onOpenTicket} />
					: <span className="sim-defect-mark" aria-hidden="true" />)}
				<button type="button" className="sim-site-btn booking-cta" style={fixed ? scenario.defect.fixedStyle : brokenStyle}
					onClick={onOpenTicket} disabled={step !== "bug"}>{t(scenario.bookingLabelKey)}</button>
				{fixed && <div className="sim-before" data-testid="comparison-before" aria-hidden="true"
					style={{ clipPath: `inset(0 ${rtl ? comparison : 0}% 0 ${rtl ? 0 : comparison}%)` }}>
					<span className="sim-defect-mark" /><span className="sim-site-btn" style={brokenStyle}>{t(scenario.bookingLabelKey)}</span>
				</div>}
			</div>
			<div className="sim-schedule" aria-hidden="true">{[true, false, true, false, false, true, true, false].map((on, index) => <i className={on ? "on" : ""} key={index} />)}</div>
			{fixed && <div className="sim-comparison">
				<label htmlFor="sim-compare">{t("comparisonLabel")}</label>
				<div className="sim-comparison-labels"><span>{t("before")}</span><span>{t("after")}</span></div>
				<input id="sim-compare" type="range" min="0" max="100" value={comparison} onChange={(event) => setComparison(Number(event.target.value))} />
				<p className="sim-timing">{t(scenario.elapsedLabelKey)}</p>
			</div>}
		</div>
		{step === "deploying" && <div className="sim-scan" style={{ animationDelay: `${scenario.timing.scanStartMs}ms`, animationDuration: `${scenario.timing.scanDurationMs}ms` }} aria-hidden="true" />}
	</section>;
}
