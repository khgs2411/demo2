import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import { simulationSteps } from "./machine";
import type { SimStep } from "./machine";
import type { SimulationScenario } from "./scenarios/types";
import type { BeatPlayback } from "./use-simulation";

type StepperProps = {
	scenario: SimulationScenario;
	step: SimStep;
	playback: BeatPlayback;
	reducedMotion: boolean;
	onSelect: (step: SimStep) => void;
};

export function Stepper({ scenario, step, playback, reducedMotion, onSelect }: StepperProps) {
	const { t } = useTranslation("admin-sim");
	const current = simulationSteps.indexOf(step);
	const fill = useRef<HTMLSpanElement>(null);
	const { beatDurationMs, readElapsedMs, running, jump } = playback;
	useEffect(() => {
		const line = fill.current!;
		let frame = 0;
		function paint() {
			const withinBeat = reducedMotion || !beatDurationMs ? 0 : Math.min(1, readElapsedMs() / beatDurationMs);
			line.style.setProperty("--sim-fill", String((current + withinBeat) / (simulationSteps.length - 1)));
			if (running && withinBeat < 1) frame = requestAnimationFrame(paint);
		}
		paint();
		return () => cancelAnimationFrame(frame);
	}, [beatDurationMs, current, jump, readElapsedMs, reducedMotion, running]);

	return <nav className="sim-rail" aria-label={t("railLabel")} style={{ "--sim-beat-count": simulationSteps.length } as CSSProperties}>
		<span className="sim-rail-progress" aria-hidden="true"><span className="sim-rail-fill" ref={fill} /></span>
		{simulationSteps.map((entry, index) => <button type="button" className={`sim-beat ${index === current ? "now" : index < current ? "done" : ""}`} key={entry}
			aria-current={entry === step ? "step" : undefined} aria-label={`${String(index + 1).padStart(2, "0")} ${t(scenario.beats[entry].labelKey)}`} onClick={() => onSelect(entry)}>
			<span className="punch-hole" aria-hidden="true">{index + 1}</span><span className="sim-beat-label">{t(scenario.beats[entry].labelKey)}</span>
		</button>)}
	</nav>;
}
