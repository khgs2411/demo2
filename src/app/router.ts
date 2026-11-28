import { useEffect, useSyncExternalStore } from "react";

export type ShowcaseSection = "get" | "what-is-classkit";

export type Route =
	| { page: "showcase"; section?: ShowcaseSection }
	| { page: "packages" | "about" | "admin-sim" | "account" | "studio" | "forgot-password" | "reset-password" }
	| { page: "booking"; packageId?: string };

export function parseHash(hash: string): Route | null {
	if (hash === "#get") return { page: "showcase", section: "get" };
	if (hash === "#what-is-classkit") return { page: "showcase", section: "what-is-classkit" };
	if (hash && !hash.startsWith("#/")) return null;
	switch (hash) {
		case "#/packages": return { page: "packages" };
		case "#/about": return { page: "about" };
		case "#/demo": return { page: "admin-sim" };
		case "#/book": return { page: "booking" };
		case "#/studio": return { page: "studio" };
		case "#/account": return { page: "account" };
		case "#/forgot-password": return { page: "forgot-password" };
		case "#/reset-password": return { page: "reset-password" };
	}
	const booking = hash.match(/^#\/book\/([^/]+)$/);
	if (booking) {
		try {
			return { page: "booking", packageId: decodeURIComponent(booking[1]) };
		} catch {
			return { page: "showcase" };
		}
	}
	return { page: "showcase" };
}

function subscribe(onChange: () => void) {
	window.addEventListener("hashchange", onChange);
	return () => window.removeEventListener("hashchange", onChange);
}

export function useRoute(): Route | null {
	const hash = useSyncExternalStore(subscribe, () => window.location.hash);
	const route = parseHash(hash);
	useEffect(() => {
		if (route?.page === "showcase" && !route.section && hash !== "#/" && window.location.hash === hash) {
			window.history.replaceState(window.history.state, "", "#/");
		}
	}, [hash, route?.page]);
	return route;
}
