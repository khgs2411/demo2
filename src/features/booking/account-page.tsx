import { useEffect, useMemo, useReducer, useRef } from "react";
import { useTranslation } from "react-i18next";
import { TextLink } from "../../ui/text-link";
import { Ticket } from "../../ui/ticket";
import { createBookingAdapter, useBookingContext } from "./adapter";
import type { BookingEvent } from "./machine";
import { AccountStep } from "./account-step";
import { RequestLedger } from "./request-ledger";
import { useRequests } from "./use-requests";
import "./booking.css";

type AuthState = { busy: boolean; error: string | null };
type AuthEvent = { type: "started" } | { type: "auth_finished" | "recovery_finished"; result: BookingEvent } | { type: "sign_out_finished"; success: boolean };
function authTransition(_state: AuthState, event: AuthEvent): AuthState {
	if (event.type === "started") return { busy: true, error: null };
	if (event.type === "sign_out_finished") return { busy: false, error: event.success ? null : "signOutFailed" };
	const result = event.result;
	if (result.type === "auth_redirect_started") return { busy: true, error: null };
	if (event.type === "recovery_finished" || result.type === "signed_in") return { busy: false, error: null };
	const storageFailed = result.type === "operation_failed" && result.reason === "redirect_storage";
	return { busy: false, error: storageFailed ? "messages.redirect_storage" : "messages.auth_failed" };
}

export function AccountPage() {
	const { t } = useTranslation("booking");
	const context = useBookingContext();
	const adapter = useMemo(() => createBookingAdapter(context.client, context.refreshProductContext), [context.client, context.refreshProductContext]);
	const requests = useRequests(adapter, context.session?.user.id ?? null, !context.loading);
	const [auth, dispatch] = useReducer(authTransition, { busy:false, error:null });
	const locked = useRef(false);
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
		locked.current = true;
		dispatch({ type:"started" });
		try {
			const result = await operation();
			if (mounted.current) dispatch({ type: "auth_finished", result });
		} finally { locked.current = false; }
	}
	async function signOut() {
		if (locked.current) return;
		locked.current = true;
		dispatch({ type:"started" });
		try {
			const success = await adapter.signOut();
			if (mounted.current) dispatch({ type: "sign_out_finished", success });
		} finally { locked.current = false; }
	}
	const signedOut = !context.session || requests.state.step === "signed_out";
	return <main data-module="booking" className="booking-page account-page">
		<section>
			{!revoked && auth.error && <p role="alert" className="notice error">{t(auth.error)}</p>}
			{context.loading ? <><h1>{t("accTitle")}</h1><p role="status">{t("loading")}</p></> : signedOut ? <>
				<AccountStep product={context.product} loading={false} busy={auth.busy} signInOnly title={t("signIn")} description={t("accSignInLede")}
					onPassword={(_method,email,password) => void authenticate(() => adapter.signIn(email,password))} onGoogle={() => void authenticate(() => adapter.signInWithGoogle())} />
				<p className="switch"><TextLink href="#/book">{t("accBookToCreate")}</TextLink></p>
			</> : <>
				<h1>{t("accTitle")}</h1><p className="lede">{t("accLede")}</p>
				<RequestLedger {...requests} timeZone={Intl.DateTimeFormat().resolvedOptions().timeZone} />
				<div className="actions"><Ticket href="#/book" stub="+">{t("bookAnother")}</Ticket><Ticket className="booking-link" stub="" disabled={auth.busy} onClick={() => void signOut()}>{t("signOut")}</Ticket></div>
			</>}
		</section>
	</main>;
}
