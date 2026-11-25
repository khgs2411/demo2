const templates = {
	site: "eb0b18b4-41b5-4ca9-b21f-1518c52e420a",
	system: "89d2e7fd-ed6c-488f-b7ed-eb765ad7f8bb",
};

export const serviceLines = ["system", "site"] as const;
export type ServiceLine = (typeof serviceLines)[number];

const studioPackages = [
	{ id: "system-basic", kind: "base", line: "system", templateId: templates.system, priceKey: "offers.system-basic.price", featureKeys: ["features.site", "features.customers", "features.appointments"] },
	{ id: "system-studio", kind: "base", line: "system", templateId: templates.system, priceKey: "offers.system-studio.price", featureKeys: ["features.roles", "features.documents", "features.changes", "features.updates"], recommended: true },
	{ id: "system-partner", kind: "base", line: "system", templateId: templates.system, priceKey: "offers.system-partner.price", featureKeys: ["features.site"] },
	{ id: "site-quick", kind: "base", line: "site", templateId: templates.site, priceKey: "offers.site-quick.price", featureKeys: ["features.build"], mark: "liveInSevenDays" },
	{ id: "site-landing", kind: "base", line: "site", templateId: templates.site, priceKey: "offers.site-landing.price", featureKeys: ["features.setup", "features.design", "features.build", "features.hosting"] },
	{ id: "site-business", kind: "base", line: "site", templateId: templates.site, priceKey: "offers.site-business.price", featureKeys: ["features.setup", "features.design", "features.build", "features.hosting"] },
] as const;

const addons = [
	{ id: "agent-whatsapp", kind: "addon", templateId: null, priceKey: "addons.price", featureKeys: ["features.whatsapp"] },
	{ id: "agent-social", kind: "addon", templateId: null, priceKey: "addons.price", featureKeys: ["features.social"] },
	{ id: "agent-voice", kind: "addon", templateId: null, priceKey: "addons.price", featureKeys: ["features.voice"] },
] as const;

export type PackageId = (typeof studioPackages)[number]["id"];
export type AddonId = (typeof addons)[number]["id"];
export type StudioPackage = {
	readonly id: PackageId;
	readonly kind: "base";
	readonly line: ServiceLine;
	readonly templateId: string | null;
	readonly priceKey: string;
	readonly featureKeys: readonly string[];
	readonly recommended?: boolean;
	readonly mark?: "liveInSevenDays";
};
export type PackageEntry = StudioPackage | (typeof addons)[number] & { readonly recommended?: never };

export const catalog: readonly PackageEntry[] = [...studioPackages, ...addons];

export function getHeadlineOffers(line?: ServiceLine): readonly StudioPackage[] {
	return catalog.filter((entry): entry is StudioPackage => entry.kind === "base" && (line === undefined || entry.line === line));
}
