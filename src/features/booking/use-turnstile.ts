import { useCallback, useLayoutEffect, useReducer, useRef, useState } from "react";

const scriptUrl = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
const alwaysPassSiteKey = "1x00000000000000000000AA";

type Turnstile = {
	render(container: HTMLElement, options: {
		sitekey: string;
		appearance: "interaction-only";
		theme: "light";
		size: "flexible";
		language: string;
		"response-field": false;
		callback: (token: string) => void;
		"expired-callback": () => void;
		"error-callback": () => void;
	}): string;
	reset(widgetId: string): void;
	remove(widgetId: string): void;
};

type TurnstileState =
	| { status: "loading" }
	| { status: "verified"; token: string }
	| { status: "unavailable" };

type TurnstileEvent =
	| { type: "render_started" | "reset_requested" | "expired" | "failed" }
	| { type: "verified"; token: string };

const initialState: TurnstileState = { status: "loading" };

function transition(state: TurnstileState, event: TurnstileEvent): TurnstileState {
	switch (event.type) {
		case "render_started":
		case "reset_requested": return initialState;
		case "expired": return state.status === "verified" ? initialState : state;
		case "failed": return { status: "unavailable" };
		case "verified": return { status: "verified", token: event.token };
	}
}

function getApi() {
	return (window as Window & { turnstile?: Turnstile }).turnstile;
}

let loadingApi: Promise<Turnstile> | undefined;

function loadApi(): Promise<Turnstile> {
	const api = getApi();
	if (api) return Promise.resolve(api);
	if (loadingApi) return loadingApi;

	const existing = document.querySelector<HTMLScriptElement>(`script[src="${scriptUrl}"]`);
	const script = existing ?? document.createElement("script");
	loadingApi = new Promise<Turnstile>((resolve, reject) => {
		script.addEventListener("load", () => {
			const loaded = getApi();
			if (loaded) resolve(loaded);
			else reject(new Error("turnstile:api_missing"));
		}, { once: true });
		script.addEventListener("error", () => reject(new Error("turnstile:script_failed")), { once: true });
		if (!existing) {
			script.src = scriptUrl;
			script.async = true;
			document.head.append(script);
		}
	}).finally(() => {
		script.remove();
		loadingApi = undefined;
	});
	return loadingApi;
}

export function useTurnstile(language: string) {
	const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY || (import.meta.env.DEV ? alwaysPassSiteKey : undefined);
	const [container, setContainer] = useState<HTMLDivElement | null>(null);
	const widget = useRef<{ api: Turnstile; id: string } | null>(null);
	const [state, dispatch] = useReducer(transition, initialState);
	const current = useRef(state);

	// Expiry can arrive before React commits the disabled submit button.
	const send = useCallback((event: TurnstileEvent) => {
		current.current = transition(current.current, event);
		dispatch(event);
	}, []);

	useLayoutEffect(() => {
		send({ type: "render_started" });
		if (!container) return;
		if (!siteKey) {
			send({ type: "failed" });
			return;
		}
		let active = true;
		const fail = () => { if (active) send({ type: "failed" }); };
		void loadApi().then(api => {
			if (!active) return;
			const id = api.render(container, {
				sitekey: siteKey, appearance: "interaction-only", theme: "light", size: "flexible", language,
				"response-field": false,
				callback: token => { if (active) send({ type: "verified", token }); },
				"expired-callback": () => { if (active) send({ type: "expired" }); },
				"error-callback": fail,
			});
			widget.current = { api, id };
		}).catch(fail);
		return () => {
			active = false;
			const rendered = widget.current;
			widget.current = null;
			if (rendered) rendered.api.remove(rendered.id);
		};
	}, [container, language, send, siteKey]);

	return {
		container: setContainer,
		status: state.status,
		getToken() { return current.current.status === "verified" ? current.current.token : null; },
		reset() {
			send({ type: "reset_requested" });
			const rendered = widget.current;
			if (rendered) rendered.api.reset(rendered.id);
		},
	};
}
