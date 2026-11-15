import { useEffect } from "react";
import { useProductContext } from "@class-kit/react";
import { studioRedirectKey, clearStudioRedirect } from "./redirect";

export function StudioReturn() {
	const { loading, session } = useProductContext();
	useEffect(() => {
		if (loading || !session) return;
		try {
			if (window.sessionStorage.getItem(studioRedirectKey) !== "#/studio") return;
			clearStudioRedirect();
			window.location.hash = "#/studio";
		} catch { /* Without a saved target, leave the current route unchanged. */ }
	}, [loading, session]);
	return null;
}
