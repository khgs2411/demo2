import { useTranslation } from "react-i18next";
import { simulationSteps } from "./machine";
import type { SimStep } from "./machine";
import type { SimulationScenario } from "./scenarios/types";

export function Stepper({ scenario, step, onSelect }: { scenario: SimulationScenario; step: SimStep; onSelect: (step: SimStep) => void }) {
	const { t } = useTranslation("admin-sim");
	const current = simulationSteps.indexOf(step);
	return <nav className="sim-rail" aria-label={t("railLabel")}>
		{simulationSteps.map((entry, index) => <button type="button" className={`sim-beat ${index === current ? "now" : index < current ? "done" : ""}`} key={entry}
			aria-current={entry === step ? "step" : undefined} aria-label={`${String(index + 1).padStart(2, "0")} ${t(scenario.beats[entry].labelKey)}`} onClick={() => onSelect(entry)}>
			<span className="punch-hole" aria-hidden="true">{index + 1}</span><span className="sim-beat-label">{t(scenario.beats[entry].labelKey)}</span>
		</button>)}
	</nav>;
}
