import { useCallback, useEffect, useLayoutEffect, useMemo, useReducer, useRef } from "react";
import type { createBookingAdapter, PasswordChangeOutcome, useBookingContext } from "./adapter";
import { initialPasswordChange, passwordChangeTransition } from "./password-change-machine";
import type { PasswordProblem } from "./password-validation";

type SignedOutEvent =
	| { type: "password_change_finished"; signedOutSession: string | null }
	| { type: "session_observed"; sessionKey: string }
	| { type: "auth_reset" };

function signedOutTransition(state: string | null, event: SignedOutEvent) {
	switch (event.type) {
		case "password_change_finished": return event.signedOutSession;
		case "session_observed": return state === event.sessionKey ? state : null;
		case "auth_reset": return null;
	}
}

// Supabase rotates access tokens within a session. This claim only correlates UI results.
function passwordChangeSessionKey(accessToken: string) {
	try {
		const payload = accessToken.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
		const { session_id } = JSON.parse(atob(payload));
		return typeof session_id === "string" ? session_id : accessToken;
	} catch {
		return accessToken;
	}
}

export function usePasswordChange(
	{ session, product }: Pick<ReturnType<typeof useBookingContext>, "session" | "product">,
	adapter: Pick<ReturnType<typeof createBookingAdapter>, "changePassword">,
) {
	const [state, dispatch] = useReducer(passwordChangeTransition, initialPasswordChange);
	const [signedOutSession, dispatchSignedOut] = useReducer(signedOutTransition, null);
	const accessToken = session?.access_token ?? null;
	const userId = session?.user.id ?? null;
	const sessionKey = useMemo(() => accessToken === null ? null : passwordChangeSessionKey(accessToken), [accessToken]);
	const latestSession = useRef({ accessToken, userId, lastKey: sessionKey });
	const locked = useRef<{ type: "auth" } | { type: "password_change"; ownerId: string } | null>(null);
	const mounted = useRef(true);
	useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
	useLayoutEffect(() => {
		latestSession.current = { accessToken, userId, lastKey: sessionKey ?? latestSession.current.lastKey };
		if (sessionKey) dispatchSignedOut({ type: "session_observed", sessionKey });
		if (userId) dispatch({ type: "owner_observed", ownerId: userId });
	}, [accessToken, sessionKey, userId]);

	const requestSessionToken = useCallback(() => {
		const { accessToken, userId } = latestSession.current;
		return locked.current?.type === "password_change" && locked.current.ownerId === userId ? null : accessToken;
	}, []);
	const clearSignedOut = useCallback(() => dispatchSignedOut({ type: "auth_reset" }), []);
	async function runAuth(operation: () => Promise<void> | null) {
		if (locked.current) return;
		locked.current = { type: "auth" };
		try {
			await operation();
		} finally {
			locked.current = null;
		}
	}
	const signedOut = signedOutSession !== null && (sessionKey === null || sessionKey === signedOutSession);
	const canChangePassword = product?.email_password_enabled === true && Boolean(session?.user.identities?.some(identity => identity.provider === "email"));

	async function submit(currentPassword: string, newPassword: string, effects?: {
		onStarted: () => void;
		onFinished: (shouldRefresh: boolean) => void;
	}) {
		if (locked.current || !userId || signedOut || !canChangePassword) return;
		locked.current = { type: "password_change", ownerId: userId };
		effects?.onStarted();
		dispatch({ type: "save_started", ownerId: userId });
		let outcome: PasswordChangeOutcome;
		try {
			outcome = await adapter.changePassword(currentPassword, newPassword);
		} finally {
			locked.current = null;
		}
		if (!mounted.current) return;
		const latest = latestSession.current;
		const endedSession = outcome === "signed_out" && latest.lastKey === sessionKey ? sessionKey : null;
		dispatchSignedOut({ type: "password_change_finished", signedOutSession: endedSession });
		dispatch({ type: "save_finished", ownerId: userId, outcome });
		effects?.onFinished(!endedSession && latest.userId === userId);
	}

	return {
		state: state.ownerId === userId ? state : initialPasswordChange,
		busy: state.step === "saving",
		signedOut,
		canChangePassword,
		requestSessionToken,
		runAuth,
		clearSignedOut,
		onRejected: (problem: PasswordProblem) => { if (userId) dispatch({ type: "password_rejected", ownerId: userId, problem }); },
		submit,
	};
}
