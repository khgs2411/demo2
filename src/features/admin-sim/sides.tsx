import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { SimState } from "./machine";
import type { SimulationScenario, SimulationSide } from "./scenarios/types";
import { MockSite } from "./mock-site";
import { MockAdmin } from "./mock-admin";
import type { RequestDraft } from "./mock-admin";
import { AgentPanel } from "./agent-panel";

type SidesProps = { scenario: SimulationScenario; state: SimState; reducedMotion: boolean; draft?: RequestDraft; onOpenTicket: () => void; onSubmit: (draft: RequestDraft) => void };

export function Sides({ scenario, state, reducedMotion, draft, onOpenTicket, onSubmit }: SidesProps) {
	const { t } = useTranslation("admin-sim");
	// The parent keys this view by beat: automatic tab changes do not override a visitor's choice mid-beat.
	const [side, setSide] = useState<SimulationSide>(scenario.beats[state.step].side);
	return <>
		<div className="sim-side-tabs" role="tablist" aria-label={t("title")}>
			{(["top", "under"] as const).map((entry) => <button type="button" role="tab" id={`sim-tab-${entry}`} key={entry}
				aria-controls={`sim-panel-${entry}`} aria-selected={side === entry} tabIndex={side === entry ? 0 : -1}
				onClick={() => setSide(entry)} onKeyDown={(event) => {
					if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
					event.preventDefault();
					const target = event.key === "Home" ? "top" : event.key === "End" ? "under" : entry === "top" ? "under" : "top";
					setSide(target);
					event.currentTarget.parentElement?.querySelector<HTMLButtonElement>(`#sim-tab-${target}`)?.focus();
				}}>{t(entry === "top" ? "topTab" : "underTab")}</button>)}
		</div>
		<div className="sim-sides">
			<MockSite scenario={scenario} step={state.step} onOpenTicket={onOpenTicket} shown={side === "top"} />
			<section className={`sim-underside ${side === "under" ? "shown" : ""}`} data-side="under" id="sim-panel-under" role="tabpanel" aria-labelledby="sim-tab-under">
				<span className="sim-label">{t("underLabel")}</span>
				{state.step === "ticket_drafting" && <MockAdmin scenario={scenario} onSubmit={onSubmit} />}
				<AgentPanel scenario={scenario} state={state} reducedMotion={reducedMotion} draft={draft} />
			</section>
		</div>
	</>;
}
