import { useEffect, useRef, useState } from "react";

const scriptUrl = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
const alwaysPassSiteKey = "1x00000000000000000000AA";

type Turnstile = {
	render(container: HTMLElement, options: {
		sitekey: string;
		appearance: "interaction-only";
		theme: "light";
		size: "compact";
		language: string;
		"response-field": false;
		"refresh-expired": "manual";
		callback: (token: string) => void;
		"expired-callback": () => void;
		"error-callback": () => void;
	}): string;
	reset(widgetId: string): void;
	remove(widgetId: string): void;
};

export function useTurnstile(language: string) {
	const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY || (import.meta.env.DEV ? alwaysPassSiteKey : undefined);
	const container = useRef<HTMLDivElement>(null);
	const widget = useRef<{ api: Turnstile; id: string } | null>(null);
	const latestToken = useRef<string | null>(null);
	const [verified, setVerified] = useState(false);
	const [unavailable, setUnavailable] = useState(!siteKey);

	// Expiry can arrive before React commits the disabled submit button.
	function updateToken(token: string | null) {
		latestToken.current = token;
		setVerified(Boolean(token));
	}

	function reset() {
		updateToken(null);
		const current = widget.current;
		if (current) current.api.reset(current.id);
	}

	useEffect(() => {
		const element = container.current;
		if (!siteKey || !element) return;
		let active = true;
		let script: HTMLScriptElement | undefined;
		const getApi = () => (window as Window & { turnstile?: Turnstile }).turnstile;
		const fail = () => {
			if (!active) return;
			updateToken(null);
			setUnavailable(true);
		};
		const render = () => {
			const api = getApi();
			if (!active) return;
			if (!api) return fail();
			try {
				const id = api.render(element, {
					sitekey: siteKey, appearance: "interaction-only", theme: "light", size: "compact", language,
					"response-field": false, "refresh-expired": "manual",
					callback: token => {
						if (!active) return;
						setUnavailable(false);
						updateToken(token);
					},
					"expired-callback": () => { if (active) reset(); },
					"error-callback": fail,
				});
				widget.current = { api, id };
			} catch {
				fail();
			}
		};

		updateToken(null);
		if (getApi()) render();
		else {
			script = document.createElement("script");
			script.src = scriptUrl;
			script.async = true;
			script.onload = render;
			script.onerror = fail;
			document.head.append(script);
		}
		return () => {
			active = false;
			script?.remove();
			const current = widget.current;
			widget.current = null;
			if (current) current.api.remove(current.id);
		};
	}, [language, siteKey]);

	return { container, verified, unavailable, reset, getToken: () => latestToken.current, clearToken: () => updateToken(null) };
}
