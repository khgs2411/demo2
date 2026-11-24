import { useCallback, useEffect, useLayoutEffect, useMemo, useReducer, useRef, useState } from "react";
import { createBookingAdapter, useBookingContext } from "./adapter";
import { initialState, isSignedInTermsState, transition, type BookingEvent, type BookingState, type BookingProfile, type BookingSelection, type SignupDraft } from "./machine";
import { restoreBookingRedirect } from "./redirect";
import { moveWeek, weekRange } from "./calendar";

export function useBooking(locale: string, draft: BookingSelection) {
	const context = useBookingContext();
	const adapter = useMemo(() => createBookingAdapter(context.client, context.refreshProductContext), [context.client, context.refreshProductContext]);
	const [state, dispatch] = useReducer(transition, initialState);
	const [range, setRange] = useState(() => weekRange(new Date()));
	const current = useRef(state);
	const mounted = useRef(true);
	const inFlight = useRef<Promise<void> | null>(null);
	const autoSession = useRef(false);
	const recoveryStarted = useRef(false);
	const latestDraft = useRef(draft);
	const wasRevoked = useRef(false);
	const latestSession = useRef(context.session);
	const latestLocale = useRef(locale);
	const writeStarted = useRef<BookingState | null>(null);
	// The registration sign-up API requires Google to be enabled.
	const guestAvailable = context.product?.auth_mode === "open"
		&& context.product.email_password_enabled && context.product.google_oauth_enabled;
	const send = useCallback((event: BookingEvent) => {
		current.current = transition(current.current, event);
		dispatch(event);
	}, []);
	useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
	useEffect(() => {
		if (context.loading) return;
		if (state.step === "choosing_package" && context.session) {
			const { id, email } = context.session.user;
			void restoreBookingRedirect(id, email).then(restored => {
				const currentUser = latestSession.current?.user;
				if (!restored || !mounted.current || current.current.step !== "choosing_package"
					|| currentUser?.id !== id || currentUser.email !== email) return;
				if (restored.slotStartsAt) setRange(weekRange(new Date(restored.slotStartsAt)));
				send(restored);
			});
		}
		if (state.step === "needs_account" && autoSession.current) {
			autoSession.current = false;
			if (context.session) send({ type: "signed_in", userId: context.session.user.id });
			else if (guestAvailable) send({ type: "guest_slots_requested" });
		}
	}, [context.loading, context.session, guestAvailable, state.step, send]);
	const revoked = context.sessionErrorCode === "session_revoked";
	const recovering = state.step === "recovering_session" ? state : null;
	useLayoutEffect(() => { latestDraft.current = draft; }, [draft]);
	useLayoutEffect(() => {
		if (revoked === wasRevoked.current) return;
		wasRevoked.current = revoked;
		send(revoked ? { type: "session_revoked", selection: latestDraft.current } : { type: "session_revocation_cleared" });
	}, [revoked, send]);
	useLayoutEffect(() => {
		latestSession.current = context.session;
		const flow = current.current;
		if ((isSignedInTermsState(flow) || flow.step === "submitting") && context.session?.user.id !== flow.userId) {
			send({ type: "unauthenticated" });
		}
	}, [context.session, state, send]);
	useLayoutEffect(() => {
		if (latestLocale.current === locale) return;
		latestLocale.current = locale;
		send({ type: "terms_locale_changed" });
	}, [locale, send]);
	useEffect(() => {
		if (!recovering) {
			recoveryStarted.current = false;
			return;
		}
		if (recoveryStarted.current) return;
		recoveryStarted.current = true;
		void (async () => {
			await inFlight.current;
			if (!mounted.current || current.current.step !== "recovering_session") return;
			const outcome = await adapter.signInWithGoogle(recovering);
			if (!mounted.current || current.current.step !== "recovering_session" || outcome.type !== "operation_failed") return;
			send({ type: "session_recovery_failed" });
			if (!wasRevoked.current) send({ type: "session_revocation_cleared" });
		})();
	}, [adapter, recovering, send]);

	const profileUserId = state.step === "completing_profile" && state.prefill === undefined ? state.userId : null;
	useEffect(() => {
		if (!profileUserId) return;
		let active = true;
		void adapter.loadProfile(profileUserId).then(event => { if (active) send(event); });
		return () => { active = false; };
	}, [adapter, profileUserId, send]);

	const loadingPackage = state.step === "choosing_slot" && state.availability === "loading" ? state.selection.packageId : null;
	useEffect(() => {
		if (!loadingPackage) return;
		let active = true;
		void adapter.loadSlots(loadingPackage, range).then(event => { if (active) send(event); });
		return () => { active = false; };
	}, [adapter, loadingPackage, range, send]);

	const needsTerms = state.step === "signup_details" && state.loadingTerms;
	useEffect(() => {
		if (!needsTerms) return;
		let active = true;
		void adapter.loadTerms(locale).then(event => { if (active) send(event); });
		return () => { active = false; };
	}, [adapter, locale, needsTerms, send]);

	const checkingTerms = state.step === "checking_terms" ? state : null;
	useEffect(() => {
		const flow = current.current;
		if (!checkingTerms || flow.step !== "checking_terms") return;
		let active = true;
		const result = flow.termsChanged ? adapter.loadTerms(locale, true) : adapter.checkTerms(locale);
		void result.then(event => {
			if (active && current.current === flow) send(event);
		});
		return () => { active = false; };
	}, [adapter, locale, checkingTerms, send]);

	const writing = state.step === "accepting_terms" || state.step === "submitting" ? state : null;
	useEffect(() => {
		const flow = current.current;
		if (!writing || writing.step !== flow.step || writeStarted.current === writing) return;
		const slotId = writing.selection.slotId;
		if (!slotId) return;
		writeStarted.current = writing;
		const result = writing.step === "accepting_terms"
			? adapter.acceptTerms(writing.terms).then(event => [event])
			: adapter.requestRegistration(slotId, writing.selection.packageId, range);
		void result.then(events => {
			if (mounted.current && current.current === flow) for (const event of events) send(event);
		});
	}, [adapter, range, writing, send]);

	function run(started: BookingEvent, operation: () => Promise<BookingEvent | readonly BookingEvent[]>) {
		if (inFlight.current) return;
		send(started);
		const pending = Promise.resolve().then(operation).then(result => {
			if (mounted.current) for (const event of Array.isArray(result) ? result : [result]) send(event);
		}).finally(() => { inFlight.current = null; });
		inFlight.current = pending;
		return pending;
	}

	return {
		state, context, adapter, range, send,
		signup(draft: SignupDraft, turnstileToken: string) {
			const flow = current.current;
			if (flow.step !== "signup_details" || !flow.terms || !flow.accepted) return;
			const terms = flow.terms;
			return run({ type: "signup_started" }, () => adapter.requestWithSignup(flow.selection.slotId, draft, terms, turnstileToken));
		},
		choosePackage(selection: BookingSelection) {
			const guest = !context.loading && !context.session && guestAvailable;
			autoSession.current = !guest;
			send({ type: "package_chosen", ...selection, guest });
		},
		auth(method: "signIn" | "signUp", email: string, password: string) {
			return run({ type: "auth_started", method: method === "signUp" ? "sign_up" : "sign_in" }, () => adapter[method](email, password));
		},
		google(email = "") {
			if (current.current.step === "signup_details") send({ type: "signup_auth_chosen", email });
			if (current.current.step !== "needs_account" && current.current.step !== "resuming_signup" && current.current.step !== "session_recovery_failed") return;
			return run({ type: "auth_started", method: "google" }, () => adapter.signInWithGoogle(current.current));
		},
		saveProfile(profile: BookingProfile) {
			const flow = current.current;
			if (flow.step !== "completing_profile") return;
			return run({ type: "profile_save_started" }, () => adapter.saveProfile(profile, flow.selection));
		},
		moveWeek(direction: -1 | 1) { send({ type: "slots_refresh_requested" }); setRange(previous => moveWeek(previous, direction)); },
	};
}
