export interface SimulationScenario {
	id: string;
	siteNameKey: string;
	bookingLabelKey: string;
	disclaimerKey: string;
	elapsedLabelKey: string;
	defect: {
		selector: string;
		descriptionKey: string;
		brokenStyle: { inlineSize: string; boxSizing: "border-box" };
		fixedStyle: { inlineSize: string; boxSizing: "border-box" };
	};
	ticket: {
		id: string;
		type: "issue" | "feature_request";
		titleKey: string;
		descriptionKey: string;
		screenshot: { selector: string; altKey: string };
	};
	diff: { file: string; lines: readonly string[] };
	fixedRender: { bookingButtonFixed: boolean };
	timing: { ticketSubmittedMs: number; agentTriagingMs: number; fixLineMs: number };
	deployStages: readonly { labelKey: string; durationMs: number }[];
}
