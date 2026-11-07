import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
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
			...scenario.deployStages.map((stage) => stage.labelKey)];
		for (const key of keys) {
			const value = key.split(".").reduce<unknown>((entry, part) => (entry as Record<string, unknown>)[part], resources["admin-sim"]);
			expect(value, key).toBeTypeOf("string");
			expect(value, key).not.toBe("");
		}
	});

	it("honestly labels the demonstration and its elapsed time", () => {
		expect(en["admin-sim"].demoNotice).toMatch(/demonstration.*no real ticket/i);
		expect(he["admin-sim"].demoNotice).toContain("לא נשלחת בקשה אמיתית");
		expect(en["admin-sim"].demoTiming).toContain("Demo timing");
		expect(he["admin-sim"].demoTiming).toContain("זמן הדגמה");
	});

	it("streams the actual CSS change between the defect and fixed styles", () => {
		for (const [variant, excluded] of [["brokenStyle", "+"], ["fixedStyle", "-"]] as const) {
			const sheet = new CSSStyleSheet();
			sheet.insertRule(scenario.diff.lines.filter((line) => !line.startsWith(excluded)).map((line) => line.slice(1)).join("\n"));
			const rule = sheet.cssRules[0] as CSSStyleRule;
			expect(rule.selectorText).toBe(scenario.defect.selector);
			expect(rule.style.getPropertyValue("inline-size")).toBe(scenario.defect[variant].inlineSize);
			expect(rule.style.getPropertyValue("box-sizing")).toBe(scenario.defect[variant].boxSizing);
		}
	});

	it("uses the shell's existing link and flip durations for demo pacing", () => {
		const css = readFileSync("src/index.css", "utf8");
		const duration = (token: string) => Number(css.match(new RegExp(`--duration-${token}: ([.\\d]+)s`))![1]) * 1000;
		expect(scenario.timing.fixLineMs).toBe(duration("link"));
		expect(scenario.timing.ticketSubmittedMs).toBe(duration("flip"));
		expect(scenario.timing.agentTriagingMs).toBe(duration("flip"));
		for (const stage of scenario.deployStages) expect(stage.durationMs).toBe(duration("flip"));
	});
});
