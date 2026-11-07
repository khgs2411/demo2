import { useTranslation } from "react-i18next";
import { simulationSteps } from "./machine";
import type { SimStep } from "./machine";
import type { SimulationScenario } from "./scenarios/types";

export function Stepper({ scenario, step, onSelect }: { scenario: SimulationScenario; step: SimStep; onSelect: (step: SimStep) => void }) {
	const { t } = useTranslation("admin-sim");
	const current = simulationSteps.indexOf(step);
	return <nav className="sim-rail" aria-label={t("railLabel")}>
		<span className="sim-rail-fill" style={{ inlineSize: `${current / (simulationSteps.length - 1) * 100}%` }} aria-hidden="true" />
		{simulationSteps.map((entry, index) => <button type="button" className={`sim-beat ${index === current ? "now" : index < current ? "done" : ""}`} key={entry}
			aria-current={entry === step ? "step" : undefined} aria-label={`${String(index + 1).padStart(2, "0")} ${t(scenario.beats[entry].labelKey)}`} onClick={() => onSelect(entry)}>
			<i aria-hidden="true" /><span>{String(index + 1).padStart(2, "0")} <b>{t(scenario.beats[entry].labelKey)}</b></span>
		</button>)}
	</nav>;
}
