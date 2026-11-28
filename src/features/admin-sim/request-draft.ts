import type { TFunction } from "i18next";
import type { SimulationScenario } from "./scenarios/types";

export type RequestDraft = { type: "issue" | "feature_request"; title: string; description: string };
export const requestFormId = "sim-request";

export function requestTyping(scenario: SimulationScenario, t: TFunction<"admin-sim">) {
	const fields = [
		{ name: "type", label: "typeLabel", text: t("issue") },
		{ name: "title", label: "titleLabel", text: t(scenario.ticket.titleKey) },
		{ name: "description", label: "descriptionLabel", text: t(scenario.ticket.descriptionKey) },
	];
	let durationMs = 0;
	const timedFields = fields.map((field) => {
		const delayMs = durationMs;
		const revealMs = field.text.length * scenario.timing.characterMs;
		durationMs += revealMs;
		return { ...field, delayMs, revealMs };
	});
	return { fields: timedFields, durationMs };
}
