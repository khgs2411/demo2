import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { createBookingAdapter, useBookingContext, type BookingProfile } from "./adapter";
import { initialState, transition, type BookingEvent, type BookingSelection } from "./machine";
import { restoreBookingRedirect } from "./redirect";
import { moveWeek, weekRange } from "./calendar";

export function useBooking() {
	const context = useBookingContext();
	const adapter = useMemo(() => createBookingAdapter(context.client, context.refreshProductContext), [context.client, context.refreshProductContext]);
	const [state, dispatch] = useReducer(transition, initialState);
	const [range, setRange] = useState(() => weekRange(new Date()));
	const current = useRef(state);
	const mounted = useRef(true);
	const locked = useRef(false);
	const autoSession = useRef(false);
	const send = useCallback((event: BookingEvent) => {
		current.current = transition(current.current, event);
		dispatch(event);
	}, []);
	useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
	useEffect(() => {
		if (context.loading) return;
		if (state.step === "choosing_package" && context.session) {
			const restored = restoreBookingRedirect(context.session.user.id);
			if (restored) send(restored);
		}
		if (state.step === "needs_account" && autoSession.current) {
			autoSession.current = false;
			if (context.session) send({ type: "signed_in", userId: context.session.user.id });
		}
	}, [context.loading, context.session, state.step, send]);
	const loadingPackage = state.step === "choosing_slot" && state.availability === "loading" ? state.selection.packageId : null;
	useEffect(() => {
		if (!loadingPackage) return;
		let active = true;
		void adapter.loadSlots(loadingPackage, range).then(event => { if (active) send(event); });
		return () => { active = false; };
	}, [adapter, loadingPackage, range, send]);

	async function run(started: BookingEvent, operation: () => Promise<BookingEvent | readonly BookingEvent[]>) {
		if (locked.current) return;
		locked.current = true;
		send(started);
		try {
			const result = await operation();
			if (mounted.current) for (const event of Array.isArray(result) ? result : [result]) send(event);
		} finally { locked.current = false; }
	}
	return {
		state, context, adapter, range, send,
		choosePackage(selection: BookingSelection) {
			autoSession.current = true;
			send({ type: "package_chosen", ...selection });
		},
		auth(method: "signIn" | "signUp", email: string, password: string) {
			return run({ type: "auth_started", method: method === "signUp" ? "sign_up" : "sign_in" }, () => adapter[method](email, password));
		},
		google() { return run({ type: "auth_started", method: "google" }, () => adapter.signInWithGoogle(current.current)); },
		saveProfile(profile: BookingProfile) {
			const flow = current.current;
			if (flow.step !== "completing_profile") return;
			return run({ type: "profile_save_started" }, () => adapter.saveProfile(profile, flow.selection));
		},
		moveWeek(direction: -1 | 1) { send({ type: "slots_refresh_requested" }); setRange(previous => moveWeek(previous, direction)); },
		submit() {
			const flow = current.current;
			if (flow.step !== "choosing_slot" || !flow.selection.slotId) return;
			return run({ type: "submit_requested" }, () => adapter.requestRegistration(flow.selection.slotId!, flow.selection.packageId, range));
		},
	};
}
