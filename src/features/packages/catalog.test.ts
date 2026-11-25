import { describe, expect, it } from "vitest";
import { he } from "../../i18n/he";
import { en } from "../../i18n/en";
import { catalog } from "./catalog";
import { getBookingOptions, getHeadlineOffers } from "./index";

describe("package catalog", () => {
	it("contains exactly the nine specified entries with unique ids; only base offers are bookable", () => {
		expect(catalog.map(({ id }) => id)).toEqual(["system-basic", "system-studio", "system-partner", "site-quick", "site-landing", "site-business", "agent-whatsapp", "agent-social", "agent-voice"]);
		expect(new Set(catalog.map(({ id }) => id)).size).toBe(catalog.length);
		for (const entry of catalog) expect(entry.templateId === null).toBe(entry.kind === "addon");
		expect(catalog.filter(({ kind }) => kind === "addon").map(({ id }) => id))
			.toEqual(["agent-whatsapp", "agent-social", "agent-voice"]);
		expect(catalog.filter(({ recommended }) => recommended).map(({ id }) => id)).toEqual(["system-studio"]);
	});

	it("uses the existing template for every package in each service line", () => {
		expect(getHeadlineOffers("system").map(({ templateId }) => templateId)).toEqual(Array(3).fill("89d2e7fd-ed6c-488f-b7ed-eb765ad7f8bb"));
		expect(getHeadlineOffers("site").map(({ templateId }) => templateId)).toEqual(Array(3).fill("eb0b18b4-41b5-4ca9-b21f-1518c52e420a"));
	});

	it("exposes only base offers for headlines and bookable meetings", () => {
		expect(getHeadlineOffers().map(({ id }) => id)).toEqual(["system-basic", "system-studio", "system-partner", "site-quick", "site-landing", "site-business"]);
		expect(getBookingOptions().packages.map(({ id }) => id)).toEqual(["system-basic", "system-studio", "system-partner", "site-quick", "site-landing", "site-business"]);
		expect(getBookingOptions().addons.map(({ id }) => id)).toEqual(["agent-whatsapp", "agent-social", "agent-voice"]);
	});

	it.each([he, en])("resolves all catalog copy in each language", (language) => {
		for (const entry of catalog) {
			const keys = [entry.priceKey, ...entry.featureKeys, `offers.${entry.id}.name`];
			for (const key of keys) {
				const value = key.split(".").reduce<unknown>((node, part) =>
					node && typeof node === "object" ? (node as Record<string, unknown>)[part] : undefined,
					language.packages);
				expect(typeof value, key).toBe("string");
				expect(value, key).not.toBe("");
			}
		}
	});
});
