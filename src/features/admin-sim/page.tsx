import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { openBooking } from "../../app/open-booking";
import { Ticket } from "../../ui/ticket";
import { requestFormId } from "./mock-admin";
import type { RequestDraft } from "./mock-admin";
import { Sides } from "./sides";
import { Stepper } from "./stepper";
import { useSimulation } from "./use-simulation";
import "./walkthrough.css";

export function AdminSimPage() {
	const { t } = useTranslation("admin-sim");
	const { state, dispatch, scenario, reducedMotion } = useSimulation();
	const [draft, setDraft] = useState<RequestDraft>();
	const beat = scenario.beats[state.step];
	const next = t(beat.nextKey);
	const heading = useRef<HTMLHeadingElement>(null);
	const lastStep = useRef(state.step);
	useEffect(() => {
		if (lastStep.current !== state.step) heading.current?.focus();
		lastStep.current = state.step;
	}, [state.step]);
	return <main className="inner-page admin-sim" data-module="admin-sim">
		<div className="inner-wrap sim-wrap">
		<section className="sim-narr">
			<div><span className="sim-sample">{t(scenario.disclaimerKey)}</span><h1 ref={heading} tabIndex={-1}>{t(beat.titleKey)}</h1><p>{t(beat.bodyKey)}</p></div>
			<div className="sim-controls">
				<button type="button" className="sim-link" disabled={state.step === "bug"} onClick={() => dispatch({ type: "back_requested" })}>{t("back")}</button>
				{state.step === "ticket_drafting" ? <Ticket stub={`#${scenario.ticket.number}`} type="submit" form={requestFormId}>{next}</Ticket>
					: state.step === "live" ? <Ticket stub={`#${scenario.ticket.number}`} href="#/book/system-studio" onClick={(event) => { event.preventDefault(); openBooking({ packageId: "system-studio" }); }}>{next}</Ticket>
						: <Ticket stub={`#${scenario.ticket.number}`} onClick={() => dispatch({ type: "next_requested" })}>{next}</Ticket>}
				{state.step !== "bug" && <button type="button" className="sim-link sim-restart" onClick={() => { setDraft(undefined); dispatch({ type: "restarted" }); }}>{t("restart")}</button>}
			</div>
		</section>
		<Stepper scenario={scenario} step={state.step} onSelect={(step) => dispatch({ type: "step_selected", step, ticketId: scenario.ticket.id })} />
		<Sides key={state.step} scenario={scenario} state={state} reducedMotion={reducedMotion} draft={draft}
			onOpenTicket={() => dispatch({ type: "ticket_opened" })} onSubmit={(values) => {
				setDraft(values);
				dispatch({ type: "ticket_submitted", ticketId: scenario.ticket.id });
			}} />
		</div>
	</main>;
}
