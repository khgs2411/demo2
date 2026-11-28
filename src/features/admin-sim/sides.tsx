import { useState } from "react";
import type { Ref } from "react";
import { useTranslation } from "react-i18next";
import type { SimState } from "./machine";
import type { SimulationScenario, SimulationSide } from "./scenarios/types";
import { MockSite } from "./mock-site";
import { MockAdmin } from "./mock-admin";
import type { RequestDraft } from "./mock-admin";
import { AgentPanel } from "./agent-panel";

type SidesProps = {
	scenario: SimulationScenario;
	state: SimState;
	reducedMotion: boolean;
	draft?: RequestDraft;
	requestForm: Ref<HTMLFormElement>;
	onOpenTicket: () => void;
	onSubmit: (draft: RequestDraft) => void;
	onManualAction: () => void;
};

export function Sides({ scenario, state, reducedMotion, draft, requestForm, onOpenTicket, onSubmit, onManualAction }: SidesProps) {
	const { t } = useTranslation("admin-sim");
	// The parent keys this view by beat: automatic tab changes do not override a visitor's choice mid-beat.
	const [side, setSide] = useState<SimulationSide>(scenario.beats[state.step].side);
	function selectSide(target: SimulationSide) {
		onManualAction();
		setSide(target);
	}
	return <>
		<div className="sim-side-tabs" role="tablist" aria-label={t("title")} onFocus={onManualAction}>
			{(["top", "under"] as const).map((entry) => <button type="button" role="tab" id={`sim-tab-${entry}`} key={entry}
				aria-controls={`sim-panel-${entry}`} aria-selected={side === entry} tabIndex={side === entry ? 0 : -1}
				onClick={() => selectSide(entry)} onKeyDown={(event) => {
					if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
					event.preventDefault();
					const target = event.key === "Home" ? "top" : event.key === "End" ? "under" : entry === "top" ? "under" : "top";
					selectSide(target);
					event.currentTarget.parentElement?.querySelector<HTMLButtonElement>(`#sim-tab-${target}`)?.focus();
				}}>{t(entry === "top" ? "topTab" : "underTab")}</button>)}
		</div>
		<div className="sim-sides" onFocus={onManualAction} onChange={onManualAction}>
			<MockSite scenario={scenario} step={state.step} onOpenTicket={onOpenTicket} shown={side === "top"} />
			<section className={`sim-underside ${side === "under" ? "shown" : ""}`} data-side="under" id="sim-panel-under" role="tabpanel" aria-labelledby="sim-tab-under">
				<span className="sim-label">{t("underLabel")}</span>
				{state.step === "ticket_drafting" && <MockAdmin scenario={scenario} onSubmit={onSubmit} formRef={requestForm} onInvalid={onManualAction} />}
				<AgentPanel scenario={scenario} state={state} reducedMotion={reducedMotion} draft={draft} />
			</section>
		</div>
	</>;
}
