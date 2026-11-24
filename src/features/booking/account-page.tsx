import { useCallback, useEffect, useLayoutEffect, useMemo, useReducer, useRef } from "react";
import { useTranslation } from "react-i18next";
import { TextLink } from "../../ui/text-link";
import { Ticket } from "../../ui/ticket";
import { createBookingAdapter, useBookingContext, type PasswordChangeOutcome } from "./adapter";
import type { BookingEvent } from "./machine";
import { AccountDetails } from "./account-details";
import { AcceptedTerms } from "./accepted-terms";
import { AccountStep } from "./account-step";
import { PasswordChange } from "./password-change";
import { initialPasswordChange, passwordChangeTransition } from "./password-change-machine";
import { RequestLedger } from "./request-ledger";
import { useRequests } from "./use-requests";
import "./booking.css";

type AuthState = { busy: boolean; error: string | null; rejectedAccessToken: string | null; passwordChangeSignedOut: string | null };
type AuthEvent =
	| { type: "started" }
	| { type: "auth_finished" | "recovery_finished"; result: BookingEvent }
	| { type: "sign_out_finished"; success: boolean }
	| { type: "profile_signed_out"; accessToken: string }
	| { type: "password_change_finished"; signedOutSession: string | null }
	| { type: "session_observed"; sessionKey: string };
const initialAuth: AuthState = { busy: false, error: null, rejectedAccessToken: null, passwordChangeSignedOut: null };
function authTransition(state: AuthState, event: AuthEvent): AuthState {
	if (event.type === "started") return { ...state, busy: true, error: null };
	if (event.type === "sign_out_finished") return event.success ? initialAuth : { ...state, busy: false, error: "signOutFailed" };
	if (event.type === "profile_signed_out") return { ...state, rejectedAccessToken: event.accessToken };
	if (event.type === "password_change_finished") return { ...state, busy: false, passwordChangeSignedOut: event.signedOutSession };
	if (event.type === "session_observed") return state.passwordChangeSignedOut && state.passwordChangeSignedOut !== event.sessionKey
		? { ...state, passwordChangeSignedOut: null } : state;
	const result = event.result;
	if (result.type === "auth_redirect_started") return { ...state, busy: true, error: null };
	if (result.type === "signed_in") return initialAuth;
	if (event.type === "recovery_finished") return { ...state, busy: false, error: null };
	const storageFailed = result.type === "operation_failed" && result.reason === "redirect_storage";
	return { ...state, busy: false, error: storageFailed ? "messages.redirect_storage" : "messages.auth_failed" };
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

export function AccountPage() {
	const { t } = useTranslation("booking");
	const context = useBookingContext();
	const adapter = useMemo(() => createBookingAdapter(context.client, context.refreshProductContext), [context.client, context.refreshProductContext]);
	const [auth, dispatch] = useReducer(authTransition, initialAuth);
	const [passwordChange, dispatchPasswordChange] = useReducer(passwordChangeTransition, initialPasswordChange);
	const { session } = context;
	const accessToken = session?.access_token ?? null;
	const sessionKey = useMemo(() => accessToken === null ? null : passwordChangeSessionKey(accessToken), [accessToken]);
	const sessionUserId = session?.user.id ?? null;
	const userId = session && accessToken !== auth.rejectedAccessToken && sessionKey !== auth.passwordChangeSignedOut ? sessionUserId : null;
	const locked = useRef<{ type: "auth" } | { type: "password_change"; ownerId: string } | null>(null);
	const latestSession = useRef({ accessToken, userId: sessionUserId, lastKey: sessionKey });
	useLayoutEffect(() => {
		latestSession.current = { accessToken, userId: sessionUserId, lastKey: sessionKey ?? latestSession.current.lastKey };
		if (sessionKey) dispatch({ type: "session_observed", sessionKey });
		if (sessionUserId) dispatchPasswordChange({ type: "owner_observed", ownerId: sessionUserId });
	}, [accessToken, sessionKey, sessionUserId]);
	const requestSessionToken = useCallback(() => {
		const { accessToken, userId } = latestSession.current;
		return locked.current?.type === "password_change" && locked.current.ownerId === userId ? null : accessToken;
	}, []);
	const requests = useRequests(adapter, userId, !context.loading, requestSessionToken);
	const mounted = useRef(true);
	const recoveryStarted = useRef(false);
	const revoked = context.sessionErrorCode === "session_revoked";
	useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
	useEffect(() => {
		if (!revoked) {
			recoveryStarted.current = false;
			return;
		}
		if (recoveryStarted.current) return;
		recoveryStarted.current = true;
		dispatch({ type: "started" });
		void adapter.signInWithGoogle().then(result => {
			if (mounted.current) dispatch({ type: "recovery_finished", result });
		});
	}, [adapter, revoked]);
	async function authenticate(operation: () => Promise<BookingEvent>) {
		if (locked.current) return;
		locked.current = { type: "auth" };
		dispatch({ type:"started" });
		try {
			const result = await operation();
			if (mounted.current) dispatch({ type: "auth_finished", result });
		} finally { locked.current = null; }
	}
	async function signOut() {
		if (locked.current) return;
		locked.current = { type: "auth" };
		dispatch({ type:"started" });
		try {
			const success = await adapter.signOut();
			if (mounted.current) dispatch({ type: "sign_out_finished", success });
		} finally { locked.current = null; }
	}
	async function changePassword(currentPassword: string, newPassword: string) {
		if (locked.current || !userId) return;
		locked.current = { type: "password_change", ownerId: userId };
		dispatch({ type: "started" });
		dispatchPasswordChange({ type: "save_started", ownerId: userId });
		let outcome: PasswordChangeOutcome;
		try {
			outcome = await adapter.changePassword(currentPassword, newPassword);
		} finally {
			locked.current = null;
		}
		if (!mounted.current) return;
		const latest = latestSession.current;
		const signedOutSession = outcome === "signed_out" && latest.lastKey === sessionKey ? sessionKey : null;
		dispatch({ type: "password_change_finished", signedOutSession });
		dispatchPasswordChange({ type: "save_finished", ownerId: userId, outcome });
		if (!signedOutSession && latest.userId === userId) void requests.refresh();
	}
	const signedOut = !session || !userId || requests.state.step === "signed_out";
	const noAccess = requests.state.step === "no_access";
	const showAccountSections = !noAccess && requests.state.step !== "loading";
	const canChangePassword = context.product?.email_password_enabled === true && session?.user.identities?.some(identity => identity.provider === "email");
	return <main data-module="booking" className="booking-page account-page">
		<section>
			{!revoked && auth.error && <p role="alert" className="notice error">{t(auth.error)}</p>}
			{context.loading ? <><h1>{t("accTitle")}</h1><p role="status">{t("loading")}</p></> : signedOut ? <>
				{auth.passwordChangeSignedOut !== null && <p role="status">{t("passwordChange.outcomes.signed_out")}</p>}
				<AccountStep product={context.product} loading={false} busy={auth.busy} signInOnly title={t("signIn")} description={t("accSignInLede")}
					onPassword={(_method,email,password) => void authenticate(() => adapter.signIn(email,password))} onGoogle={() => void authenticate(() => adapter.signInWithGoogle())} />
				<p className="switch"><TextLink href="#/book">{t("accBookToCreate")}</TextLink></p>
			</> : <>
				{!noAccess && <><h1>{t("accTitle")}</h1><p className="lede">{t("accLede")}</p></>}
				<div className={noAccess ? undefined : "account-columns"}>
					<div><RequestLedger {...requests} timeZone={Intl.DateTimeFormat().resolvedOptions().timeZone} /></div>
					{showAccountSections && <AccountDetails key={userId}
						adapter={adapter} userId={userId} onSignedOut={() => dispatch({ type: "profile_signed_out", accessToken: session.access_token })} />}
				</div>
				{showAccountSections && canChangePassword && <PasswordChange key={`password:${userId}`}
					state={passwordChange.ownerId === userId ? passwordChange : initialPasswordChange} busy={auth.busy}
					onRejected={problem => dispatchPasswordChange({ type: "password_rejected", ownerId: userId, problem })}
					onSubmit={(current, next) => void changePassword(current, next)} />}
				{showAccountSections && <AcceptedTerms key={userId} adapter={adapter} />}
				<div className="actions">
					{!noAccess && <Ticket href="#/book" stub="+">{t("bookAnother")}</Ticket>}
					<Ticket className="booking-link" stub="" disabled={auth.busy} onClick={() => void signOut()}>{t("signOut")}</Ticket>
				</div>
			</>}
		</section>
	</main>;
}
