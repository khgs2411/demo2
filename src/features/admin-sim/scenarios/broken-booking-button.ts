import type { SimulationScenario } from "./types";

export const brokenBookingButton = {
	id: "broken-booking-button",
	siteNameKey: "scenarios.brokenBookingButton.siteName",
	bookingLabelKey: "scenarios.brokenBookingButton.bookingLabel",
	disclaimerKey: "demoNotice",
	elapsedLabelKey: "demoTiming",
	defect: {
		selector: ".booking-button",
		descriptionKey: "scenarios.brokenBookingButton.defect",
		brokenStyle: { inlineSize: "24rem", boxSizing: "border-box" },
		fixedStyle: { inlineSize: "100%", boxSizing: "border-box" },
	},
	ticket: {
		id: "demo-broken-booking-button",
		type: "issue",
		titleKey: "scenarios.brokenBookingButton.ticketTitle",
		descriptionKey: "scenarios.brokenBookingButton.ticketDescription",
		// The walkthrough renders this local attachment from the defect, not a remote URL.
		screenshot: { selector: ".booking-button", altKey: "scenarios.brokenBookingButton.screenshotAlt" },
	},
	diff: {
		file: "studio.css",
		lines: [
			" .booking-button {",
			"-  inline-size: 24rem;",
			"+  inline-size: 100%;",
			"   box-sizing: border-box;",
			" }",
		],
	},
	fixedRender: { bookingButtonFixed: true },
	// Milliseconds from the shell's --duration-link (.3s) and --duration-flip (.6s).
	timing: { ticketSubmittedMs: 600, agentTriagingMs: 600, fixLineMs: 300 },
	deployStages: [
		{ labelKey: "scenarios.brokenBookingButton.build", durationMs: 600 },
		{ labelKey: "scenarios.brokenBookingButton.deploy", durationMs: 600 },
	],
} satisfies SimulationScenario;
