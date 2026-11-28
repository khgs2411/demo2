import { useEffect, useMemo, useReducer, useRef } from "react";
import { useTranslation } from "react-i18next";
import { TextLink } from "../../ui/text-link";
import { Ticket } from "../../ui/ticket";
import { createBookingAdapter, useBookingContext } from "./adapter";
import type { BookingEvent } from "./machine";
import { AccountDetails } from "./account-details";
import { AcceptedTerms } from "./accepted-terms";
import { AccountStep } from "./account-step";
import { AccountPass } from "./gate-passes";
import { PasswordChange } from "./password-change";
import { RequestLedger } from "./request-ledger";
import { usePasswordChange } from "./use-password-change";
import { useRequests } from "./use-requests";
import "./account.css";

type AuthState = { busy: boolean; error: string | null; rejectedAccessToken: string | null };
type AuthEvent =
	| { type: "started" }
	| { type: "auth_finished" | "recovery_finished"; result: BookingEvent }
	| { type: "sign_out_finished"; success: boolean }
	| { type: "profile_signed_out"; accessToken: string }
	| { type: "password_change_finished" };
const initialAuth: AuthState = { busy: false, error: null, rejectedAccessToken: null };
function authTransition(state: AuthState, event: AuthEvent): AuthState {
	if (event.type === "started") return { ...state, busy: true, error: null };
	if (event.type === "sign_out_finished") return event.success ? initialAuth : { ...state, busy: false, error: "signOutFailed" };
	if (event.type === "profile_signed_out") return { ...state, rejectedAccessToken: event.accessToken };
	if (event.type === "password_change_finished") return { ...state, busy: false };
	const result = event.result;
	if (result.type === "auth_redirect_started") return { ...state, busy: true, error: null };
	if (result.type === "signed_in") return initialAuth;
	if (event.type === "recovery_finished") return { ...state, busy: false, error: null };
	const storageFailed = result.type === "operation_failed" && result.reason === "redirect_storage";
	return { ...state, busy: false, error: storageFailed ? "messages.redirect_storage" : "messages.auth_failed" };
}

export function AccountPage() {
	const { t } = useTranslation("booking");
	const context = useBookingContext();
	const adapter = useMemo(() => createBookingAdapter(context.client, context.refreshProductContext), [context.client, context.refreshProductContext]);
	const [auth, dispatch] = useReducer(authTransition, initialAuth);
	const passwordChange = usePasswordChange(context, adapter);
	const { session } = context;
	const accessToken = session?.access_token ?? null;
	const userId = session && accessToken !== auth.rejectedAccessToken && !passwordChange.signedOut ? session.user.id : null;
	const { requestSessionToken, clearSignedOut, runAuth } = passwordChange;
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
			if (mounted.current) {
				if (result.type === "signed_in") clearSignedOut();
				dispatch({ type: "recovery_finished", result });
			}
		});
	}, [adapter, revoked, clearSignedOut]);
	function authenticate(operation: () => Promise<BookingEvent>) {
		return runAuth(async () => {
			dispatch({ type:"started" });
			const result = await operation();
			if (mounted.current) {
				if (result.type === "signed_in") clearSignedOut();
				dispatch({ type: "auth_finished", result });
			}
		});
	}
	function signOut() {
		return runAuth(async () => {
			dispatch({ type:"started" });
			const success = await adapter.signOut();
			if (mounted.current) {
				if (success) clearSignedOut();
				dispatch({ type: "sign_out_finished", success });
			}
		});
	}
	function changePassword(currentPassword: string, newPassword: string) {
		if (!userId) return;
		void passwordChange.submit(currentPassword, newPassword, {
			onStarted: () => dispatch({ type: "started" }),
			onFinished: shouldRefresh => {
				dispatch({ type: "password_change_finished" });
				if (shouldRefresh) void requests.refresh();
			},
		});
	}
	const signedOut = !session || !userId || requests.state.step === "signed_out";
	const noAccess = requests.state.step === "no_access";
	const showAccountSections = !noAccess && requests.state.step !== "loading";
	const gate = !context.loading && signedOut;
	const ledger = <RequestLedger {...requests} timeZone={Intl.DateTimeFormat().resolvedOptions().timeZone} />;
	const signOutTicket = <Ticket small tone="ghost" stub="↩" disabled={auth.busy} onClick={() => void signOut()}>{t("signOut")}</Ticket>;
	return <main data-module="booking" className={`inner-page account-page${gate ? " gate" : ""}`}>
		<div className={`inner-wrap${gate ? " gate-layout" : ""}`}><section>
			{!revoked && auth.error && <p role="alert" className="notice error">{t(auth.error)}</p>}
			{context.loading ? <><h1>{t("accTitle")}</h1><p role="status">{t("loading")}</p></> : signedOut ? <>
				{passwordChange.signedOut && <p role="status">{t("passwordChange.outcomes.signed_out")}</p>}
				<AccountStep stepStub="№ 02" product={context.product} loading={false} busy={auth.busy} signInOnly title={t("signIn", { ns: "shell" })} description={t("accSignInLede")}
					onPassword={(_method,email,password) => void authenticate(() => adapter.signIn(email,password))} onGoogle={() => void authenticate(() => adapter.signInWithGoogle())} />
				<p className="switch"><TextLink href="#/book">{t("accBookToCreate")}</TextLink></p>
			</> : noAccess ? <>
				{ledger}
				<div className="actions">{signOutTicket}</div>
			</> : <>
				<header className="page-head">
					<div><h1>{t("myAccount", { ns: "shell" })}</h1><p className="lede">{t("accLede")}</p></div>
					<Ticket href="#/book" stub="+">{t("bookAnother")}</Ticket>
				</header>
				<div className="account-columns">
					<div>
						<section className="requests-part" aria-labelledby="account-requests">
							<h2 id="account-requests">{t("accTitle")}</h2>
							{ledger}
						</section>
						{showAccountSections && <AcceptedTerms key={userId} adapter={adapter} />}
					</div>
					<div>
						{showAccountSections && <AccountDetails key={userId}
							adapter={adapter} userId={userId} onSignedOut={() => dispatch({ type: "profile_signed_out", accessToken: session.access_token })} />}
						{showAccountSections && passwordChange.canChangePassword && <PasswordChange key={`password:${userId}`}
							state={passwordChange.state} busy={auth.busy} onRejected={passwordChange.onRejected} onSubmit={changePassword} />}
						<div className="signout">{signOutTicket}</div>
					</div>
				</div>
			</>}
		</section>
		{gate && <AccountPass />}
		</div>
	</main>;
}
