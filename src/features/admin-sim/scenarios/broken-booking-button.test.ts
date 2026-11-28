import { describe, expect, it } from "vitest";
import { he } from "../../../i18n/he";
import { en } from "../../../i18n/en";
import { brokenBookingButton as scenario } from "./broken-booking-button";

describe("broken booking button scenario", () => {
	it("contains a local demo ticket with the defect screenshot attached", () => {
		expect(scenario.ticket.id).toBe(`demo-${scenario.id}`);
		expect(scenario.ticket.type).toBe("issue");
		expect(scenario.ticket.screenshot.selector).toBe(scenario.defect.selector);
		expect(scenario.fixedRender).toEqual({ bookingButtonFixed: true });
	});

	it.each([he, en])("resolves every scenario copy key in each language", (resources) => {
		const keys = [scenario.siteNameKey, scenario.bookingLabelKey, scenario.disclaimerKey,
			scenario.elapsedLabelKey, scenario.defect.descriptionKey, scenario.ticket.titleKey,
			scenario.ticket.descriptionKey, scenario.ticket.screenshot.altKey,
			...scenario.deployStages.map((stage) => stage.labelKey),
			...Object.values(scenario.beats).flatMap((beat) => [beat.titleKey, beat.bodyKey, beat.nextKey, beat.labelKey]),
			...Object.values(scenario.logs).flat().map((line) => line.textKey)];
		for (const key of keys) {
			const value = key.split(".").reduce<unknown>((entry, part) => (entry as Record<string, unknown>)[part], resources["admin-sim"]);
			expect(value, key).toBeTypeOf("string");
			expect(value, key).not.toBe("");
		}
	});

	it("honestly labels the demonstration and its elapsed time", () => {
		expect(en["admin-sim"].demoNotice).toMatch(/demo.*no real request/i);
		expect(he["admin-sim"].demoNotice).toContain("שום בקשה אמיתית לא נשלחת");
		expect(en["admin-sim"].demoTiming).toContain("Demo timings are shortened.");
		expect(he["admin-sim"].demoTiming).toContain("זמני ההדגמה מקוצרים.");
	});

	it("streams the actual CSS change between the defect and fixed styles", () => {
		for (const [variant, excluded] of [["brokenStyle", "+"], ["fixedStyle", "-"]] as const) {
			const sheet = new CSSStyleSheet();
			sheet.insertRule(scenario.diff.lines.filter((line) => !line.startsWith(excluded)).map((line) => line.slice(1)).join("\n"));
			const rule = sheet.cssRules[0] as CSSStyleRule;
			expect(rule.selectorText).toBe(scenario.defect.selector);
			const transform = document.createElement("span").style;
			transform.transform = scenario.defect[variant].transform;
			expect(rule.style.getPropertyValue("transform")).toBe(transform.transform);
		}
	});

	it("ports the six beats and effect timings from the approved mockup", () => {
		expect(Object.keys(scenario.beats)).toEqual(["bug", "ticket_drafting", "ticket_submitted", "agent_fixing", "deploying", "live"]);
		expect(Object.values(scenario.beats).map((beat) => beat.side)).toEqual(["top", "under", "under", "under", "top", "top"]);
		expect(scenario.timing).toMatchObject({ characterMs: 28, inboxLogMs: 420, fixLineMs: 520, deployLogMs: 700, scanStartMs: 2400, scanDurationMs: 1600, stageFillMs: 600, flightMs: 920, flightMotionMs: 900 });
		expect(scenario.timing.beatDwellMs.bug).toBeGreaterThan(scenario.timing.beatDwellMs.deploying);
		expect(scenario.deployStages.map((stage) => stage.startMs)).toEqual([400, 1100, 1800]);
	});
});
