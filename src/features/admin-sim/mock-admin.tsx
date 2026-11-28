import type { Ref } from "react";
import { useTranslation } from "react-i18next";
import type { SimulationScenario } from "./scenarios/types";
import { requestFormId, requestTyping } from "./request-draft";
import type { RequestDraft } from "./request-draft";

type MockAdminProps = {
	scenario: SimulationScenario;
	onSubmit: (draft: RequestDraft) => void;
	formRef?: Ref<HTMLFormElement>;
	onInvalid?: () => void;
};

export function MockAdmin({ scenario, onSubmit, formRef, onInvalid }: MockAdminProps) {
	const { t } = useTranslation("admin-sim");
	const { fields } = requestTyping(scenario, t);
	return <form ref={formRef} onInvalid={onInvalid} id={requestFormId} className="pass sim-request" aria-label={t("requestHeader")} onSubmit={(event) => {
		event.preventDefault();
		const data = new FormData(event.currentTarget);
		onSubmit({ type: data.get("type") as RequestDraft["type"], title: String(data.get("title")), description: String(data.get("description")) });
	}}>
		<header><span>{t("requestHeader")}</span><span>{`#${scenario.ticket.number}`}</span></header>
		{fields.map((field) => <label key={field.name}><small>{t(field.label)}</small>
			<span className="sim-type-reveal" style={{ animationDelay: `${field.delayMs}ms`, animationDuration: `${field.revealMs}ms`, animationTimingFunction: `steps(${field.text.length})` }}>
				{field.name === "type" ? <select name="type" defaultValue={scenario.ticket.type}><option value="issue">{t("issue")}</option><option value="feature_request">{t("featureRequest")}</option></select>
					: field.name === "description" ? <textarea name={field.name} defaultValue={field.text} required rows={2} />
					: <input name={field.name} defaultValue={field.text} required />}
			</span>
		</label>)}
		<div className="sim-shot"><i role="img" aria-label={t(scenario.ticket.screenshot.altKey)} /><span>{t("attachment")}</span></div>
	</form>;
}
