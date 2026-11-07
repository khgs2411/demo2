import type { SimulationScenario } from "./types";

export const brokenBookingButton = {
	id: "broken-booking-button",
	siteNameKey: "scenarios.brokenBookingButton.siteName",
	bookingLabelKey: "scenarios.brokenBookingButton.bookingLabel",
	disclaimerKey: "demoNotice",
	elapsedLabelKey: "demoTiming",
	defect: {
		selector: ".booking-cta",
		descriptionKey: "scenarios.brokenBookingButton.defect",
		brokenStyle: { transform: "translateX(46%)", clipPath: "inset(0 52% 0 0)" },
		fixedStyle: { transform: "none", clipPath: "none" },
	},
	ticket: {
		id: "demo-broken-booking-button", number: "214", type: "issue",
		titleKey: "scenarios.brokenBookingButton.ticketTitle",
		descriptionKey: "scenarios.brokenBookingButton.ticketDescription",
		screenshot: { selector: ".booking-cta", altKey: "scenarios.brokenBookingButton.screenshotAlt" },
	},
	beats: {
		bug: { titleKey: "beats.bug.title", bodyKey: "beats.bug.body", nextKey: "beats.bug.next", labelKey: "beats.bug.label", side: "top" },
		ticket_drafting: { titleKey: "beats.request.title", bodyKey: "beats.request.body", nextKey: "beats.request.next", labelKey: "beats.request.label", side: "under" },
		ticket_submitted: { titleKey: "beats.inbox.title", bodyKey: "beats.inbox.body", nextKey: "beats.inbox.next", labelKey: "beats.inbox.label", side: "under" },
		agent_fixing: { titleKey: "beats.agent.title", bodyKey: "beats.agent.body", nextKey: "beats.agent.next", labelKey: "beats.agent.label", side: "under" },
		deploying: { titleKey: "beats.deploy.title", bodyKey: "beats.deploy.body", nextKey: "beats.deploy.next", labelKey: "beats.deploy.label", side: "top" },
		live: { titleKey: "beats.live.title", bodyKey: "beats.live.body", nextKey: "beats.live.next", labelKey: "beats.live.label", side: "top" },
	},
	logs: {
		idle: [{ tone: "dim", textKey: "logs.idle" }],
		inbox: [{ tone: "dim", textKey: "logs.received" }, { tone: "", textKey: "logs.context" }, { tone: "ok", textKey: "logs.cardCreated" }],
		agent: [{ tone: "ok", textKey: "logs.claimed" }, { tone: "dim", textKey: "logs.reading" }, { tone: "", textKey: "logs.found" }, { tone: "del", textKey: "logs.removed" }, { tone: "add", textKey: "logs.added" }, { tone: "ok", textKey: "logs.tests" }],
		deploy: [{ tone: "dim", textKey: "logs.build" }, { tone: "dim", textKey: "logs.test" }, { tone: "ok", textKey: "logs.deployed" }],
		done: [{ tone: "ok", textKey: "logs.done" }],
	},
	// Include clipping in the CSS fix so the streamed diff really repairs both defect styles.
	diff: { file: "src/pages/home.tsx", lines: [
		"- .booking-cta { transform: translateX(46%); clip-path: inset(0 52% 0 0); }",
		"+ .booking-cta { transform: none; clip-path: none; }",
	] },
	fixedRender: { bookingButtonFixed: true },
	// BEATS/render()/type()/flyTo() in the approved admin-sim.html, in milliseconds.
	timing: { characterMs: 28, inboxLogMs: 420, fixLineMs: 520, deployLogMs: 700, scanStartMs: 2400, scanDurationMs: 1600, stageFillMs: 600, flightMs: 920 },
	deployStages: [{ labelKey: "ship.build", startMs: 400 }, { labelKey: "ship.test", startMs: 1100 }, { labelKey: "ship.deploy", startMs: 1800 }],
} satisfies SimulationScenario;
