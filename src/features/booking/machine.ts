import type { PackageEntry } from "../packages";

export type PackageId = Extract<PackageEntry["id"], "site" | "system">;
export type AddonId = Exclude<PackageEntry["id"], PackageId>;
export type BookingSelection = {
	readonly packageId: PackageId;
	readonly addonInterests: readonly AddonId[];
	readonly slotId: string | null;
};

type SignupContinuation =
	| { kind: "book"; slot: BookingSlot }
	| { kind: "show_request"; slot: BookingSlot; registration: BookingRegistration }
	| { kind: "choose_slot" };
type AccountState = {
	step: "needs_account" | "signing_up" | "signing_in";
	selection: BookingSelection;
	email?: string;
	continuation?: SignupContinuation;
};
type ProfileState = { step: "completing_profile"; selection: BookingSelection; userId: string; saving?: boolean };
export type SignupDraft = { displayName: string; email: string; phone: string };
export type BookingTerms = { title: string; text: string; version: number; locale: string };
export type BookingCredentials = { password: string; formatted: string };

type SlotState = {
	step: "choosing_slot";
	selection: BookingSelection;
	userId: string | null;
	slots: readonly BookingSlot[];
	availability: "loading" | "ready" | "not_open";
	notice: "slot_full" | null;
};
type SignupRejection = "terms_changed" | "terms_unavailable" | "rate_limited" | "disabled" | "not_found" | "bad_request" | "signup_failed";
type SignupState = {
	step: "signup_details";
	selection: BookingSelection & { slotId: string };
	slot: BookingSlot;
	terms: BookingTerms | null;
	busy: boolean;
	notice: SignupRejection | null;
	loadingTerms: boolean;
	accepted: boolean;
};
type PasswordState = {
	step: "signup_password";
	selection: BookingSelection;
	credentials: BookingCredentials;
	next: AccountState | SlotState;
};
export type BookingSlot = {
	id: string;
	startsAt: string;
	canRegister: boolean;
	canCancelRegistration: boolean;
	userRegistrationState: { id: string; status: RegistrationStatus } | null;
};
export type RegistrationStatus = "pending" | "approved" | "rejected" | "cancelled";
export type BookingRegistration = { id: string; classId: string; status: RegistrationStatus };
export type BookingOperation = "auth" | "profile" | "slots" | "registration";
export type FailureReason = "generic" | "redirect_storage";
export type BookingState =
	| { step: "choosing_package" }
	| AccountState | ProfileState | SlotState | SignupState | PasswordState
	| (Omit<SlotState, "step"> & { step: "submitting"; userId: string })
	| { step: "requested"; selection: BookingSelection; userId: string; registration: BookingRegistration; slot?: BookingSlot; credentials?: BookingCredentials }
	| { step: "failed"; operation: BookingOperation; reason: FailureReason; resume: AccountState | ProfileState | SlotState };
export type BookingEvent =
	| { type: "package_chosen"; packageId: PackageId; addonInterests: readonly AddonId[]; guest?: boolean }
	| { type: "auth_started"; method: "sign_up" | "sign_in" | "google" }
	| { type: "auth_redirect_started" }
	| { type: "signed_in"; userId: string }
	| { type: "signup_opened" }
	| { type: "signup_back" }
	| { type: "terms_loaded"; terms: BookingTerms }
	| { type: "terms_load_failed" }
	| { type: "terms_reload_requested" }
	| { type: "terms_accepted"; accepted: boolean }
	| { type: SignupRejection }
	| { type: "signup_auth_chosen"; email: string }
	| { type: "account_exists"; email: string }
	| { type: "class_unavailable" }
	| { type: "class_unavailable"; userId: string; credentials: BookingCredentials }
	| { type: "sign_in_failed"; credentials: BookingCredentials; email: string; registration?: BookingRegistration }
	| { type: "password_saved" }
	| { type: "signup_started" }
	| { type: "signup_registered"; userId: string; registration: BookingRegistration; credentials: BookingCredentials }
	| { type: "profile_saved" }
	| { type: "profile_save_started" }
	| { type: "profile_reopened" }
	| { type: "booking_not_open" }
	| { type: "slots_refresh_requested" }
	| { type: "slots_loaded"; slots: readonly BookingSlot[] }
	| { type: "slot_chosen"; slotId: string }
	| { type: "submit_requested" }
	| { type: "registration_requested"; registration: BookingRegistration }
	| { type: "registration_updated"; registration: BookingRegistration }
	| { type: "slot_full" }
	| { type: "unauthenticated" }
	| { type: "redirect_restored"; selection: BookingSelection; profileUserId: string | null; userId: string }
	| { type: "operation_failed"; operation: BookingOperation; reason: FailureReason }
	| { type: "retry_requested" }
	| { type: "restarted" };

export const initialState: BookingState = { step: "choosing_package" };

function chooseSlot(selection: BookingSelection, userId: string | null): SlotState {
	return { step: "choosing_slot", selection, userId, slots: [], availability: "loading", notice: null };
}

function chooseAnotherSlot(selection: BookingSelection, userId: string | null): SlotState {
	return { ...chooseSlot({ ...selection, slotId: null }, userId), notice: "slot_full" };
}

function afterSignIn(state: AccountState, userId: string): BookingState {
	const { continuation, selection } = state;
	switch (continuation?.kind) {
		case "book": return { ...chooseSlot(selection, userId), step: "submitting", userId, slots: [continuation.slot], availability: "ready" };
		case "show_request": return { step: "requested", selection, userId, slot: continuation.slot, registration: continuation.registration };
		case "choose_slot": return chooseAnotherSlot(selection, userId);
		default: return { step: "completing_profile", selection, userId };
	}
}

export function transition(state: BookingState, event: BookingEvent): BookingState {
	if (event.type === "restarted") return initialState;
	if (event.type === "unauthenticated" && "selection" in state) {
		return { step: "needs_account", selection: state.selection };
	}
	if (state.step === "failed") return event.type === "retry_requested" ? state.resume : state;
	if (state.step === "requested" && event.type === "registration_updated" && event.registration.id === state.registration.id) {
		return event.registration.status === state.registration.status ? state : { ...state, registration: event.registration };
	}
	if (event.type === "operation_failed") {
		const operation = state.step === "completing_profile" ? "profile"
			: state.step === "choosing_slot" ? "slots"
				: state.step === "submitting" ? "registration"
					: ["needs_account", "signing_up", "signing_in"].includes(state.step) ? "auth" : null;
		if (event.operation !== operation) return state;
		const resume = state.step === "submitting"
			? chooseSlot({ ...state.selection, slotId: null }, state.userId)
			: state.step === "choosing_slot"
				? { ...chooseSlot({ ...state.selection, slotId: null }, state.userId), notice: state.notice }
				: state.step === "signing_up" || state.step === "signing_in"
					? { ...state, step: "needs_account" as const }
					: state.step === "completing_profile" ? { step: "completing_profile" as const, selection: state.selection, userId: state.userId } : state;
		if (resume.step === "choosing_package" || resume.step === "requested" || resume.step === "signup_details" || resume.step === "signup_password") return state;
		return { step: "failed", operation: event.operation, reason: event.reason, resume };
	}
	if (state.step === "choosing_package") {
		if (event.type === "redirect_restored") {
			return event.profileUserId === event.userId
				? chooseSlot(event.selection, event.userId)
				: { step: "completing_profile", selection: event.selection, userId: event.userId };
		}
		if (event.type !== "package_chosen") return state;
		const selection = { packageId: event.packageId, addonInterests: [...event.addonInterests], slotId: null };
		return event.guest ? chooseSlot(selection, null) : { step: "needs_account", selection };
	}
	if (state.step === "needs_account" && event.type === "auth_started") {
		return { ...state, step: event.method === "sign_up" ? "signing_up" : "signing_in" };
	}
	if ((state.step === "needs_account" || state.step === "signing_up" || state.step === "signing_in") && event.type === "signed_in") {
		return afterSignIn(state, event.userId);
	}
	if (state.step === "completing_profile" && event.type === "profile_saved") {
		return chooseSlot(state.selection, state.userId);
	}
	if (state.step === "completing_profile" && event.type === "profile_save_started") return { ...state, saving: true };
	if (state.step === "choosing_slot") {
		switch (event.type) {
			case "profile_reopened": return state.userId === null ? initialState : { step: "completing_profile", selection: state.selection, userId: state.userId };
			case "signup_opened": {
				const slot = state.slots.find(slot => slot.id === state.selection.slotId && slot.canRegister);
				return state.userId === null && state.availability === "ready" && slot
					? { step: "signup_details", selection: { ...state.selection, slotId: slot.id }, slot, terms: null, busy: false, notice: null, accepted: false, loadingTerms: true }
					: state;
			}
			case "booking_not_open":
				return { ...chooseSlot({ ...state.selection, slotId: null }, state.userId), availability: "not_open" };
			case "slots_refresh_requested":
				return chooseSlot({ ...state.selection, slotId: null }, state.userId);
			case "slots_loaded":
				return {
					...state, slots: event.slots, availability: "ready",
					selection: { ...state.selection, slotId: event.slots.some((slot) => slot.id === state.selection.slotId && slot.canRegister) ? state.selection.slotId : null },
				};
			case "slot_chosen":
				return state.availability === "ready" && state.slots.some((slot) => slot.id === event.slotId && slot.canRegister)
					? { ...state, selection: { ...state.selection, slotId: event.slotId }, notice: null } : state;
			case "submit_requested":
				return state.userId !== null && state.availability === "ready" && state.selection.slotId !== null ? { ...state, step: "submitting", userId: state.userId } : state;
		}
	}
	if (state.step === "signup_password" && event.type === "password_saved") return state.next;
	if (state.step === "signup_details") {
		switch (event.type) {
			case "terms_loaded": return state.loadingTerms ? { ...state, terms: event.terms, loadingTerms: false, accepted: false, notice: state.notice === "terms_changed" ? state.notice : null } : state;
			case "terms_load_failed": return state.loadingTerms ? { ...state, loadingTerms: false, notice: "terms_unavailable" } : state;
			case "terms_reload_requested": return !state.busy && !state.terms ? { ...state, loadingTerms: true } : state;
			case "terms_accepted": return !state.busy && state.terms ? { ...state, accepted: event.accepted } : state;
			case "signup_back": return state.busy ? state : chooseSlot(state.selection, null);
			case "signup_auth_chosen": return state.busy ? state : { step: "needs_account", selection: state.selection, email: event.email };
			case "signup_started": return state.terms && state.accepted && !state.busy ? { ...state, busy: true, notice: null } : state;
		}
		if (!state.busy) return state;
		switch (event.type) {
			case "terms_changed":
			case "terms_unavailable": return { ...state, busy: false, terms: null, accepted: false, loadingTerms: true, notice: event.type };
			case "rate_limited":
			case "disabled":
			case "not_found":
			case "bad_request":
			case "signup_failed": return { ...state, busy: false, notice: event.type };
			case "account_exists":
				return { step: "needs_account", selection: state.selection, email: event.email, continuation: { kind: "book", slot: state.slot } };
			case "class_unavailable": {
				const next = chooseAnotherSlot(state.selection, "userId" in event ? event.userId : null);
				return "credentials" in event ? { step: "signup_password", selection: state.selection, credentials: event.credentials, next } : next;
			}
			case "sign_in_failed":
				return {
					step: "signup_password", selection: state.selection, credentials: event.credentials,
					next: {
						step: "needs_account", selection: state.selection, email: event.email,
						continuation: event.registration ? { kind: "show_request", slot: state.slot, registration: event.registration } : { kind: "choose_slot" },
					},
				};
			case "signup_registered":
				return event.registration.classId === state.selection.slotId
					? { step: "requested", selection: state.selection, userId: event.userId, slot: state.slot, registration: event.registration, credentials: event.credentials }
					: state;
		}
	}
	if (state.step === "submitting") {
		if (event.type === "slot_full") {
			return chooseAnotherSlot(state.selection, state.userId);
		}
		if (event.type === "registration_requested" && event.registration.classId === state.selection.slotId) {
			return { step: "requested", selection: state.selection, userId: state.userId, registration: event.registration, slot: state.slots.find(slot => slot.id === event.registration.classId) };
		}
	}
	return state;
}
