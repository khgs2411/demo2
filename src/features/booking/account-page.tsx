import { useEffect, useMemo, useReducer, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Ticket } from "../../ui/ticket";
import { createBookingAdapter, useBookingContext } from "./adapter";
import type { BookingEvent } from "./machine";
import { AccountStep } from "./account-step";
import { RequestLedger } from "./request-ledger";
import { useRequests } from "./use-requests";
import "./booking.css";

type AuthState = { busy: boolean; error: string | null };
type AuthEvent = { type: "started" } | { type: "finished"; error: string | null; redirecting?: boolean };
function authTransition(_state: AuthState, event: AuthEvent): AuthState {
	return event.type === "started" ? { busy:true, error:null } : { busy:Boolean(event.redirecting), error:event.error };
}

export function AccountPage() {
	const { t } = useTranslation("booking");
	const context = useBookingContext();
	const adapter = useMemo(() => createBookingAdapter(context.client, context.refreshProductContext), [context.client, context.refreshProductContext]);
	const requests = useRequests(adapter, context.session?.user.id ?? null, !context.loading);
	const [auth, dispatch] = useReducer(authTransition, { busy:false, error:null });
	const locked = useRef(false);
	const mounted = useRef(true);
	useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
	async function authenticate(operation: () => Promise<BookingEvent>) {
		if (locked.current) return;
		locked.current = true;
		dispatch({ type:"started" });
		try {
			const result = await operation();
			if (mounted.current) dispatch({ type:"finished", error: result.type === "signed_in" || result.type === "auth_redirect_started" ? null : result.type === "operation_failed" && result.reason === "redirect_storage" ? "messages.redirect_storage" : "messages.auth_failed", redirecting: result.type === "auth_redirect_started" });
		} finally { locked.current = false; }
	}
	async function signOut() {
		if (locked.current) return;
		locked.current = true;
		dispatch({ type:"started" });
		try {
			const success = await adapter.signOut();
			if (mounted.current) dispatch({ type:"finished", error:success ? null : "signOutFailed" });
		} finally { locked.current = false; }
	}
	const signedOut = !context.session || requests.state.step === "signed_out";
	return <main data-module="booking" className="booking-page account-page">
		<section>
			{auth.error && <p role="alert" className="notice error">{t(auth.error)}</p>}
			{context.loading ? <><h1>{t("accTitle")}</h1><p role="status">{t("loading")}</p></> : signedOut ? <AccountStep product={context.product} loading={false} busy={auth.busy} initialSignIn
				onPassword={(method,email,password) => void authenticate(() => adapter[method](email,password))} onGoogle={() => void authenticate(() => adapter.signInWithGoogle())} /> : <>
				<h1>{t("accTitle")}</h1><p className="lede">{t("accLede")}</p>
				<RequestLedger {...requests} timeZone={Intl.DateTimeFormat().resolvedOptions().timeZone} />
				<div className="actions"><Ticket href="#/book" stub="+">{t("bookAnother")}</Ticket><Ticket className="booking-link" stub="" disabled={auth.busy} onClick={() => void signOut()}>{t("signOut")}</Ticket></div>
			</>}
		</section>
	</main>;
}
