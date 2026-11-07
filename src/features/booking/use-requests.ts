import { useCallback, useEffect, useReducer, useRef } from "react";
import type { createBookingAdapter } from "./adapter";
import { forwardRange } from "./calendar";
import { requestsTransition, type RequestsState, type RequestsEvent } from "./requests-machine";

export function useRequests(adapter: ReturnType<typeof createBookingAdapter>, userId: string | null, enabled = true) {
	const [state, dispatch] = useReducer(requestsTransition, { step: "loading" });
	const current = useRef<RequestsState>(state);
	const mounted = useRef(true);
	const generation = useRef(0);
	const mutating = useRef(false);
	const owner = useRef(userId);
	const send = useCallback((event: RequestsEvent) => { current.current = requestsTransition(current.current, event); dispatch(event); }, []);
	const refresh = useCallback(async () => {
		if (!enabled || !userId || mutating.current) return;
		const request = ++generation.current;
		const result = await adapter.listRequests(forwardRange(new Date()));
		if (mounted.current && generation.current === request) send(result);
	}, [adapter, enabled, userId, send]);
	useEffect(() => { mounted.current = true; return () => { mounted.current = false; generation.current++; }; }, []);
	useEffect(() => {
		generation.current++;
		owner.current = userId;
		if (!enabled) return;
		if (!userId) { send({ type:"signed_out" }); return; }
		send({ type:"loading" });
		void refresh();
		const onFocus = () => { if (document.visibilityState !== "hidden") void refresh(); };
		window.addEventListener("focus", onFocus);
		document.addEventListener("visibilitychange", onFocus);
		return () => { generation.current++; window.removeEventListener("focus", onFocus); document.removeEventListener("visibilitychange", onFocus); };
	}, [enabled, userId, refresh, send]);
	async function cancel(registrationId: string) {
		if (!enabled || !userId || owner.current !== userId || mutating.current) return;
		const next = requestsTransition(current.current, { type:"cancel_started", registrationId });
		if (next === current.current) return;
		mutating.current = true;
		const request = ++generation.current;
		send({ type:"cancel_started", registrationId });
		try {
			const events = await adapter.cancelRequest(registrationId, forwardRange(new Date()));
			if (mounted.current && generation.current === request) for (const event of events) send(event);
		} finally { mutating.current = false; }
	}
	return { state: owner.current === userId ? state : { step:"loading" } as RequestsState, refresh, cancel };
}
