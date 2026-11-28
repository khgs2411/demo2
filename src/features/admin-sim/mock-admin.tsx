import { useTranslation } from "react-i18next";
import type { SimulationScenario } from "./scenarios/types";

export type RequestDraft = { type: "issue" | "feature_request"; title: string; description: string };
export const requestFormId = "sim-request";

export function MockAdmin({ scenario, onSubmit }: { scenario: SimulationScenario; onSubmit: (draft: RequestDraft) => void }) {
	const { t } = useTranslation("admin-sim");
	const fields = [
		{ name: "type", label: "typeLabel", text: t("issue") },
		{ name: "title", label: "titleLabel", text: t(scenario.ticket.titleKey) },
		{ name: "description", label: "descriptionLabel", text: t(scenario.ticket.descriptionKey) },
	];
	let characters = 0;
	return <form id={requestFormId} className="pass sim-request" aria-label={t("requestHeader")} onSubmit={(event) => {
		event.preventDefault();
		const data = new FormData(event.currentTarget);
		onSubmit({ type: data.get("type") as RequestDraft["type"], title: String(data.get("title")), description: String(data.get("description")) });
	}}>
		<header><span>{t("requestHeader")}</span><span>{`#${scenario.ticket.number}`}</span></header>
		{fields.map((field) => {
			const delay = characters * scenario.timing.characterMs;
			characters += field.text.length;
			return <label key={field.name}><small>{t(field.label)}</small>
				<span className="sim-type-reveal" style={{ animationDelay: `${delay}ms`, animationDuration: `${field.text.length * scenario.timing.characterMs}ms`, animationTimingFunction: `steps(${field.text.length})` }}>
					{field.name === "type" ? <select name="type" defaultValue={scenario.ticket.type}><option value="issue">{t("issue")}</option><option value="feature_request">{t("featureRequest")}</option></select>
						: field.name === "description" ? <textarea name={field.name} defaultValue={field.text} required rows={2} />
						: <input name={field.name} defaultValue={field.text} required />}
				</span>
			</label>;
		})}
		<div className="sim-shot"><i role="img" aria-label={t(scenario.ticket.screenshot.altKey)} /><span>{t("attachment")}</span></div>
	</form>;
}
