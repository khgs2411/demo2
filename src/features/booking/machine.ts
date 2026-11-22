import type { PackageEntry } from "../packages";

export type PackageId = Extract<PackageEntry["id"], "site" | "system">;
export type AddonId = Exclude<PackageEntry["id"], PackageId>;
export type BookingSelection = {
	readonly packageId: PackageId;
	readonly addonInterests: readonly AddonId[];
	readonly slotId: string | null;
};

type BookingContact = Pick<BookingProfile, "displayName" | "phoneNumber">;
export type SignupContinuation =
	| { kind: "book"; slot: BookingSlot; contact: BookingContact }
	| { kind: "show_request"; slot: BookingSlot; registration: BookingRegistration }
	| { kind: "choose_slot"; slot: BookingSlot };
type AccountState = {
	step: "needs_account" | "signing_up" | "signing_in";
	selection: BookingSelection;
	email?: string;
	signupSlot?: BookingSlot;
};
type ResumingSignup = {
	step: "resuming_signup" | "signing_in_for_signup";
	selection: BookingSelection;
	email: string;
	continuation: SignupContinuation;
};
export type BookingProfile = { displayName: string; phoneNumber: string; businessName: string; websiteUrl?: string };
type ProfileState = {
	step: "completing_profile"; selection: BookingSelection; userId: string; saving?: boolean; prefill?: BookingProfile | null; pendingRequest?: { slot: BookingSlot; contact: BookingContact };
};
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
type SignupSlot = {
	selection: BookingSelection & { slotId: string };
	slot: BookingSlot;
};
type SignupState = SignupSlot & {
	step: "signup_details";
	terms: BookingTerms | null;
	notice: SignupRejection | null;
	loadingTerms: boolean;
	accepted: boolean;
};
type SendingState = SignupSlot & { step: "sending"; terms: BookingTerms };
type PasswordState = {
	step: "signup_password";
	selection: BookingSelection;
	credentials: BookingCredentials;
	next: ResumingSignup | SlotState;
	notice?: "registration_failed";
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
	| AccountState | ResumingSignup | ProfileState | SlotState | SignupState | SendingState | PasswordState
	| { step: "recovering_session"; selection: BookingSelection }
	| { step: "session_recovery_failed"; selection: BookingSelection }
	| (Omit<SlotState, "step"> & { step: "submitting"; userId: string })
	| { step: "requested"; selection: BookingSelection; userId: string; registration: BookingRegistration; slot?: BookingSlot; credentials?: BookingCredentials }
	| { step: "failed"; operation: BookingOperation; reason: FailureReason; resume: AccountState | ResumingSignup | ProfileState | SlotState };
export type BookingRedirectRestored = {
	type: "redirect_restored"; selection: BookingSelection; profileUserId: string | null; userId: string; slotStartsAt?: string; continuation?: SignupContinuation;
};
export type BookingEvent =
	| { type: "package_chosen"; packageId: PackageId; addonInterests: readonly AddonId[]; guest?: boolean }
	| { type: "auth_started"; method: "sign_up" | "sign_in" | "google" }
	| { type: "auth_redirect_started" }
	| { type: "session_revoked"; selection?: BookingSelection }
	| { type: "session_revocation_cleared" }
	| { type: "account_back" }
	| { type: "guest_slots_requested" }
	| { type: "signed_in"; userId: string }
	| { type: "signup_opened" }
	| { type: "signup_back" }
	| { type: "terms_loaded"; terms: BookingTerms }
	| { type: "terms_load_failed" }
	| { type: "terms_reload_requested" }
	| { type: "terms_accepted"; accepted: boolean }
	| { type: SignupRejection }
	| { type: "signup_auth_chosen"; email: string }
	| { type: "account_exists"; email: string; contact: BookingContact }
	| { type: "class_unavailable" }
	| { type: "account_created_class_unavailable"; userId: string; credentials: BookingCredentials }
	| { type: "sign_in_failed"; credentials: BookingCredentials; email: string; registration?: BookingRegistration }
	| { type: "password_saved" }
	| { type: "signup_started" }
	| { type: "signup_registered"; userId: string; registration: BookingRegistration; credentials: BookingCredentials }
	| { type: "profile_loaded"; profile: BookingProfile | null }
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
	| BookingRedirectRestored
	| { type: "operation_failed"; operation: BookingOperation; reason: FailureReason }
	| { type: "retry_requested" }
	| { type: "restarted" };

export const initialState: BookingState = { step: "choosing_package" };

function chooseSlot(selection: BookingSelection, userId: string | null): SlotState {
	return { step: "choosing_slot", selection, userId, slots: [], availability: "loading", notice: null };
}

function openSignup(selection: BookingSelection, slot: BookingSlot): SignupState {
	return { step: "signup_details", selection: { ...selection, slotId: slot.id }, slot, terms: null, notice: null, accepted: false, loadingTerms: true };
}

function chooseAnotherSlot(selection: BookingSelection, userId: string | null): SlotState {
	return { ...chooseSlot({ ...selection, slotId: null }, userId), notice: "slot_full" };
}

function afterSignIn(selection: BookingSelection, userId: string, continuation?: SignupContinuation): BookingState {
	switch (continuation?.kind) {
		case "book": return { step: "completing_profile", selection, userId, pendingRequest: { slot: continuation.slot, contact: continuation.contact } };
		case "show_request": return { step: "requested", selection, userId, slot: continuation.slot, registration: continuation.registration };
		case "choose_slot": return chooseAnotherSlot(selection, userId);
		default: return { step: "completing_profile", selection, userId };
	}
}

export function transition(state: BookingState, event: BookingEvent): BookingState {
	if (event.type === "restarted") return initialState;
	if (event.type === "session_revoked") {
		if (state.step === "recovering_session" || state.step === "session_recovery_failed") return state;
		const selection = "selection" in state ? state.selection : state.step === "failed" ? state.resume.selection : event.selection;
		return selection ? { step: "recovering_session", selection } : state;
	}
	if (state.step === "recovering_session") {
		return event.type === "operation_failed" && event.operation === "auth"
			? { step: "session_recovery_failed", selection: state.selection } : state;
	}
	if (state.step === "session_recovery_failed") {
		switch (event.type) {
			case "session_revocation_cleared": return { step: "needs_account", selection: state.selection };
			case "account_back": return initialState;
			case "auth_started": return { step: "signing_in", selection: state.selection };
			default: return state;
		}
	}
	if (event.type === "unauthenticated" && "selection" in state) {
		return { step: "needs_account", selection: state.selection };
	}
	if (state.step === "failed") return event.type === "retry_requested" ? state.resume : state;
	if (state.step === "requested" && event.type === "registration_updated" && event.registration.id === state.registration.id) {
		return event.registration.status === state.registration.status ? state : { ...state, registration: event.registration };
	}
	if (event.type === "operation_failed") {
		const { operation, reason } = event;
		switch (state.step) {
			case "needs_account":
				return operation === "auth" ? { step: "failed", operation, reason, resume: state } : state;
			case "signing_up":
			case "signing_in":
				return operation === "auth" ? { step: "failed", operation, reason, resume: { ...state, step: "needs_account" } } : state;
			case "signing_in_for_signup":
				return operation === "auth" ? { step: "failed", operation, reason, resume: { ...state, step: "resuming_signup" } } : state;
			case "completing_profile": {
				const { saving, ...resume } = state;
				return operation === "profile" ? { step: "failed", operation, reason, resume } : state;
			}
			case "choosing_slot":
			case "submitting": {
				if (operation !== (state.step === "choosing_slot" ? "slots" : "registration")) return state;
				const resume = chooseSlot({ ...state.selection, slotId: null }, state.userId);
				return { step: "failed", operation, reason, resume: { ...resume, notice: state.step === "choosing_slot" ? state.notice : null } };
			}
			default: return state;
		}
	}
	if (state.step === "choosing_package") {
		if (event.type === "redirect_restored") {
			if (event.continuation) return afterSignIn(event.selection, event.userId, event.continuation);
			return event.profileUserId === event.userId
				? chooseSlot(event.selection, event.userId)
				: { step: "completing_profile", selection: event.selection, userId: event.userId };
		}
		if (event.type !== "package_chosen") return state;
		const selection = { packageId: event.packageId, addonInterests: [...event.addonInterests], slotId: null };
		return event.guest ? chooseSlot(selection, null) : { step: "needs_account", selection };
	}
	if (state.step === "needs_account" && event.type === "guest_slots_requested") return chooseSlot(state.selection, null);
	if (state.step === "needs_account" && event.type === "account_back") {
		return state.signupSlot ? openSignup(state.selection, state.signupSlot) : initialState;
	}
	if (state.step === "needs_account" && event.type === "auth_started") {
		return { ...state, step: event.method === "sign_up" ? "signing_up" : "signing_in" };
	}
	if ((state.step === "needs_account" || state.step === "signing_up" || state.step === "signing_in") && event.type === "signed_in") {
		return afterSignIn(state.selection, event.userId);
	}
	if (state.step === "resuming_signup") {
		if (event.type === "auth_started" && event.method !== "sign_up") return { ...state, step: "signing_in_for_signup" };
		if (event.type === "account_back") {
			return state.continuation.kind === "book"
				? openSignup(state.selection, state.continuation.slot) : chooseSlot(state.selection, null);
		}
	}
	if (state.step === "signing_in_for_signup" && event.type === "signed_in") {
		return afterSignIn(state.selection, event.userId, state.continuation);
	}
	if (state.step === "completing_profile" && event.type === "profile_loaded") return { ...state, prefill: event.profile };
	if (state.step === "completing_profile" && event.type === "profile_saved") {
		const { selection, userId, pendingRequest } = state;
		const slots = chooseSlot(selection, userId);
		return pendingRequest
			? { ...slots, step: "submitting", userId, slots: [pendingRequest.slot], availability: "ready" }
			: slots;
	}
	if (state.step === "completing_profile" && event.type === "profile_save_started") return { ...state, saving: true };
	if (state.step === "choosing_slot") {
		switch (event.type) {
			case "profile_reopened": return state.userId === null ? initialState : { step: "completing_profile", selection: state.selection, userId: state.userId };
			case "signup_opened": {
				const slot = state.slots.find(slot => slot.id === state.selection.slotId && slot.canRegister);
				return state.userId === null && state.availability === "ready" && slot
					? openSignup(state.selection, slot)
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
			case "terms_loaded": return state.loadingTerms ? { ...state, terms: event.terms, loadingTerms: false, accepted: false, notice: state.notice } : state;
			case "terms_load_failed": return state.loadingTerms ? { ...state, loadingTerms: false, notice: "terms_unavailable" } : state;
			case "terms_reload_requested": return !state.terms ? { ...state, loadingTerms: true } : state;
			case "terms_accepted": return state.terms ? { ...state, accepted: event.accepted } : state;
			case "signup_back": return chooseSlot(state.selection, null);
			case "signup_auth_chosen": return { step: "needs_account", selection: state.selection, email: event.email, signupSlot: state.slot };
			case "signup_started": return state.terms && state.accepted
				? { step: "sending", selection: state.selection, slot: state.slot, terms: state.terms } : state;
		}
	}
	if (state.step === "sending") {
		switch (event.type) {
			case "signed_in": return afterSignIn(state.selection, event.userId);
			case "terms_changed":
			case "terms_unavailable": return { ...state, step: "signup_details", terms: null, accepted: false, loadingTerms: true, notice: event.type };
			case "rate_limited":
			case "disabled":
			case "not_found":
			case "bad_request":
			case "signup_failed": return { ...state, step: "signup_details", accepted: true, loadingTerms: false, notice: event.type };
			case "account_exists":
				return { step: "resuming_signup", selection: state.selection, email: event.email, continuation: { kind: "book", slot: state.slot, contact: event.contact } };
			case "class_unavailable": return chooseAnotherSlot(state.selection, null);
			case "account_created_class_unavailable": return {
				step: "signup_password", selection: state.selection, credentials: event.credentials,
				next: chooseAnotherSlot(state.selection, event.userId),
			};
			case "sign_in_failed":
				return {
					step: "signup_password", selection: state.selection, credentials: event.credentials,
					next: {
						step: "resuming_signup", selection: state.selection, email: event.email,
						continuation: event.registration ? { kind: "show_request", slot: state.slot, registration: event.registration } : { kind: "choose_slot", slot: state.slot },
					},
				};
			case "signup_registered":
				return event.registration.classId === state.selection.slotId
					? { step: "requested", selection: state.selection, userId: event.userId, slot: state.slot, registration: event.registration, credentials: event.credentials }
					: {
						step: "signup_password", selection: state.selection, credentials: event.credentials, notice: "registration_failed",
						next: chooseSlot({ ...state.selection, slotId: null }, event.userId),
					};
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
