import { useCallback, useEffect, useMemo, useReducer, useRef } from "react";
import type { useProductContext } from "@class-kit/react";
import type { StudioAccess } from "../../lib/studio-access";
import { createStudioAdapter, createStudioAuthAdapter } from "./adapter";
import { transition, type StudioEvent, type StudioState } from "./machine";

export function useStudio(context: ReturnType<typeof useProductContext>, access: StudioAccess) {
	const [state, dispatch] = useReducer(transition, access === "loading" ? {step:"loading"} as StudioState : transition({step:"loading"},{type:"access_resolved",access}));
	const current = useRef(state);
	const active = useRef(true);
	const generation = useRef(0);
	const adapter = useMemo(() => context.client ? createStudioAdapter(context.client.management.registrations) : null, [context.client]);
	const auth = useMemo(() => context.client ? createStudioAuthAdapter(context.client.auth, context.refreshProductContext) : null, [context.client, context.refreshProductContext]);
	const send = useCallback((event: StudioEvent) => { current.current = transition(current.current,event); dispatch(event); }, []);
	const load = useCallback(async () => {
		if (access !== "manager" || !adapter) return;
		const request = ++generation.current;
		const result = await adapter.load(new Date());
		if (active.current && request === generation.current) send(result);
	}, [access, adapter, send]);
	useEffect(() => {
		active.current = true;
		void load();
		return () => { active.current = false; generation.current++; };
	}, [load]);
	async function decide(id: string, action: "approve" | "reject", reason?: string) {
		if (access !== "manager" || !adapter || transition(current.current,{type:"decision_started",id}) === current.current) return;
		send({type:"decision_started",id});
		const request = ++generation.current;
		const result = await adapter.decide(id,action,reason);
		if (!active.current || request !== generation.current) return;
		send(result);
		if (result.type === "decision_succeeded") await load();
	}
	function retry() {
		if (current.current.step !== "failed") return;
		send({type:"retry_requested"});
		void load();
	}
	async function authenticate(operation: () => Promise<StudioEvent>) {
		if (current.current.busy) return;
		send({type:"auth_started"});
		const result = await operation();
		if (active.current) send(result);
	}
	return { state, decide, retry,
		signIn: (email: string, password: string) => auth && authenticate(() => auth.signIn(email,password)),
		signOut: () => auth && authenticate(() => auth.signOut()),
		signInWithGoogle: () => auth && authenticate(() => auth.signInWithGoogle()),
	};
}
