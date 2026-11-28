import type { CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import type { SimState } from "./machine";
import type { SimulationScenario } from "./scenarios/types";
import type { RequestDraft } from "./request-draft";

type AgentPanelProps = { scenario: SimulationScenario; state: SimState; reducedMotion: boolean; draft?: RequestDraft };

export function AgentPanel({ scenario, state, reducedMotion, draft }: AgentPanelProps) {
	const { t } = useTranslation("admin-sim");
	const agent = state.step === "agent_fixing" || state.step === "deploying";
	const lane = state.step === "ticket_submitted" ? "open" : agent ? "doing" : state.step === "live" ? "done" : null;
	const log = state.step === "bug" ? scenario.logs.idle : state.step === "ticket_submitted" ? scenario.logs.inbox
		: state.step === "agent_fixing" ? scenario.logs.agent : state.step === "deploying" ? scenario.logs.deploy : state.step === "live" ? scenario.logs.done : [];
	const gap = state.step === "ticket_submitted" ? scenario.timing.inboxLogMs : state.step === "deploying" ? scenario.timing.deployLogMs : 0;
	const visible = state.step === "agent_fixing" && !reducedMotion ? 1 + Math.round(state.progress * (log.length - 1)) : log.length;
	const title = draft && draft.title !== t(scenario.ticket.titleKey) ? draft.title : t("cardTitle");
	return <>
		<div className="sim-board">
			{(["open", "doing", "done"] as const).map((key) => <section className="sim-lane" role="group" aria-label={t(key)} key={key}>
				<h3>{t(key)}</h3>
				{lane === key && <span className={`sim-card ${agent ? "agent" : key === "done" ? "done" : ""}`}>
					{agent && <span className="sim-drone">{t("agentMark")}</span>}{title}<b>{`#${scenario.ticket.number}`}</b>
				</span>}
			</section>)}
		</div>
		<div className="sim-log" style={{ "--sim-log-reveal": `${scenario.timing.logRevealMs}ms` } as CSSProperties} role="log" aria-live="polite" dir="ltr">
			{log.slice(0, visible).map((line, index) => <div className={line.tone} key={line.textKey} style={{ animationDelay: `${index * gap}ms` }}>{t(line.textKey, { type: draft?.type ?? scenario.ticket.type })}</div>)}
		</div>
		{state.step === "agent_fixing" && <progress className="sim-progress" max="1" value={reducedMotion ? 1 : state.progress} aria-label={t("progressLabel")} />}
		<div className="sim-ship" aria-label={t("beats.deploy.title")}>
			{scenario.deployStages.map((stage) => <div key={stage.labelKey} className={state.step === "deploying" ? "go" : state.step === "live" ? "full" : ""} style={{ "--stage-delay": `${stage.startMs}ms`, "--stage-fill": `${scenario.timing.stageFillMs}ms` } as CSSProperties}>
				<i aria-hidden="true" />{t(stage.labelKey)}
			</div>)}
		</div>
	</>;
}
