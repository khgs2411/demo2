import { catalog } from "./catalog";

export type { PackageEntry } from "./catalog";

export function getHeadlineOffers() {
	return catalog.filter(({ kind }) => kind === "base");
}

export function getBookingPackages() {
	return catalog.filter(({ kind }) => kind === "base");
}
