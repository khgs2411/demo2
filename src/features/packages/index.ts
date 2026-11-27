import { catalog, getHeadlineOffers, type PackageEntry, type PackageId } from "./catalog";

export { getHeadlineOffers, serviceLines } from "./catalog";
export { PackageOfferLedger } from "./ledger";
export { PackageBenefits, PackagePrice } from "./offer-details";
export type { AddonId, PackageId, ServiceLine, StudioPackage } from "./catalog";

export function getBookingOptions() {
	return {
		packages: getHeadlineOffers(),
		addons: catalog.filter((entry): entry is Extract<PackageEntry, { kind: "addon" }> => entry.kind === "addon"),
	};
}

export function isPackageId(id: unknown): id is PackageId {
	return getHeadlineOffers().some(entry => entry.id === id);
}
