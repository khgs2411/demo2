import type { SimulationScenario } from "./types";

const playbackSpeed = 1.5;
const pacedMs = (originalMs: number) => Math.round(originalMs / playbackSpeed);

export const brokenBookingButton = {
	id: "broken-booking-button",
	siteNameKey: "scenarios.brokenBookingButton.siteName",
	bookingLabelKey: "scenarios.brokenBookingButton.bookingLabel",
	disclaimerKey: "demoNotice",
	elapsedLabelKey: "demoTiming",
	defect: {
		selector: ".booking-cta",
		descriptionKey: "scenarios.brokenBookingButton.defect",
		brokenStyle: { transform: "translateX(58%)" },
		ltrBrokenStyle: { transform: "translateX(-58%)" },
		fixedStyle: { transform: "none" },
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
	// The streamed diff is the actual CSS change between the broken and fixed button.
	diff: { file: "src/pages/home.tsx", lines: [
		"- .booking-cta { transform: translateX(58%); }",
		"+ .booking-cta { transform: none; }",
	] },
	fixedRender: { bookingButtonFixed: true },
	timing: {
		// Allow reading time up front, then shorter holds after the animated beats.
		beatDwellMs: {
			bug: pacedMs(3600), ticket_drafting: pacedMs(2400), ticket_submitted: pacedMs(3300),
			agent_fixing: pacedMs(3000), deploying: pacedMs(1700),
		},
		logRevealMs: pacedMs(300),
		// BEATS/render()/type()/flyTo() in the approved admin-sim.html, in milliseconds.
		characterMs: pacedMs(28), inboxLogMs: pacedMs(420), fixLineMs: pacedMs(520), deployLogMs: pacedMs(700),
		scanStartMs: pacedMs(2400), scanDurationMs: pacedMs(1600), stageFillMs: pacedMs(600),
		flightMs: pacedMs(920), flightMotionMs: pacedMs(900),
	},
	deployStages: [
		{ labelKey: "ship.build", startMs: pacedMs(400) },
		{ labelKey: "ship.test", startMs: pacedMs(1100) },
		{ labelKey: "ship.deploy", startMs: pacedMs(1800) },
	],
} satisfies SimulationScenario;
