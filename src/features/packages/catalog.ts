export type PackageEntry = {
	readonly id: "site" | "system" | "agent-whatsapp" | "agent-social" | "agent-voice";
	readonly kind: "base" | "addon";
	readonly templateId: string | null;
	readonly priceKey: string;
	readonly featureKeys: readonly string[];
	readonly recommended?: boolean;
};

export const catalog: readonly PackageEntry[] = [
	{
		id: "site", kind: "base", templateId: "eb0b18b4-41b5-4ca9-b21f-1518c52e420a",
		priceKey: "offers.site.price",
		featureKeys: ["features.setup", "features.design", "features.build", "features.hosting"],
	},
	{
		id: "system", kind: "base", templateId: "89d2e7fd-ed6c-488f-b7ed-eb765ad7f8bb", recommended: true,
		priceKey: "offers.system.price",
		featureKeys: ["features.site", "features.support", "features.customers", "features.appointments", "features.roles", "features.documents", "features.changes", "features.updates"],
	},
	{
		id: "agent-whatsapp", kind: "addon", templateId: null,
		priceKey: "addons.price", featureKeys: ["features.whatsapp"],
	},
	{
		id: "agent-social", kind: "addon", templateId: null,
		priceKey: "addons.price", featureKeys: ["features.social"],
	},
	{
		id: "agent-voice", kind: "addon", templateId: null,
		priceKey: "addons.price", featureKeys: ["features.voice"],
	},
];
