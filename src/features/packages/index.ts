import { catalog, type PackageEntry } from "./catalog";

export type { PackageEntry } from "./catalog";

export function getHeadlineOffers(): readonly PackageEntry[] {
	return catalog.filter(({ kind }) => kind === "base");
}

export function getBookingOptions(): { readonly packages: readonly PackageEntry[]; readonly addons: readonly PackageEntry[] } {
	return {
		packages: getHeadlineOffers(),
		addons: catalog.filter(({ kind }) => kind === "addon"),
	};
}
