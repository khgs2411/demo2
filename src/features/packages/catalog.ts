const templates = {
	site: "eb0b18b4-41b5-4ca9-b21f-1518c52e420a",
	system: "89d2e7fd-ed6c-488f-b7ed-eb765ad7f8bb",
};

export const serviceLines = ["system", "site"] as const;
export type ServiceLine = (typeof serviceLines)[number];

const websiteAndApp = ["features.website", "features.app"] as const;
const studioExtras = ["features.changes", "features.documentsAndAccess", "features.updates"] as const;

const studioPackages = [
	{
		id: "system-basic", kind: "base", line: "system", templateId: templates.system, priceKey: "offers.system-basic.price",
		featureKeys: [...websiteAndApp, "features.basicHelp"],
	},
	{
		id: "system-studio", kind: "base", line: "system", templateId: templates.system, priceKey: "offers.system-studio.price",
		featureKeys: [...websiteAndApp, "features.studioHelp", ...studioExtras], inherits: "system-basic", recommended: true,
	},
	{
		id: "system-partner", kind: "base", line: "system", templateId: templates.system, priceKey: "offers.system-partner.price",
		featureKeys: [...websiteAndApp, "features.partnerHelp", ...studioExtras, "features.includedAssistant", "features.review"], inherits: "system-studio",
	},
	{
		id: "site-quick", kind: "base", line: "site", templateId: templates.site, priceKey: "offers.site-quick.price",
		featureKeys: ["features.studioLayout", "features.oneRound"], mark: "liveInSevenDays",
	},
	{
		id: "site-landing", kind: "base", line: "site", templateId: templates.site, priceKey: "offers.site-landing.price",
		featureKeys: ["features.firstMeeting", "features.customPage", "features.copy", "features.twoRounds"],
	},
	{
		id: "site-business", kind: "base", line: "site", templateId: templates.site, priceKey: "offers.site-business.price",
		featureKeys: ["features.firstMeeting", "features.customSite", "features.copy", "features.threeRounds", "features.fixes"],
	},
] as const;

const addons = [
	{ id: "agent-whatsapp", kind: "addon", templateId: null },
	{ id: "agent-social", kind: "addon", templateId: null },
	{ id: "agent-voice", kind: "addon", templateId: null },
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
	readonly inherits?: "system-basic" | "system-studio";
	readonly recommended?: boolean;
	readonly mark?: "liveInSevenDays";
};
export type PackageEntry = StudioPackage | (typeof addons)[number] & { readonly recommended?: never };

export const catalog: readonly PackageEntry[] = [...studioPackages, ...addons];

export function getHeadlineOffers(line?: ServiceLine): readonly StudioPackage[] {
	return catalog.filter((entry): entry is StudioPackage => entry.kind === "base" && (line === undefined || entry.line === line));
}
