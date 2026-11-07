import type { PackageEntry } from "../packages";

export type PackageId = Extract<PackageEntry["id"], "site" | "system">;
export type AddonId = Exclude<PackageEntry["id"], PackageId>;
export type BookingSelection = {
	readonly packageId: PackageId;
	readonly addonInterests: readonly AddonId[];
	readonly slotId: string | null;
};

type AccountState = { step: "needs_account" | "signing_up" | "signing_in"; selection: BookingSelection };
type ProfileState = { step: "completing_profile"; selection: BookingSelection; userId: string };
type SlotState = {
	step: "choosing_slot";
	selection: BookingSelection;
	userId: string;
	slots: readonly BookingSlot[];
	availability: "loading" | "ready" | "not_open";
	notice: "slot_full" | null;
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
	| AccountState | ProfileState | SlotState
	| (Omit<SlotState, "step"> & { step: "submitting" })
	| { step: "requested"; selection: BookingSelection; userId: string; registration: BookingRegistration }
	| { step: "failed"; operation: BookingOperation; reason: FailureReason; resume: AccountState | ProfileState | SlotState };
export type BookingEvent =
	| { type: "package_chosen"; packageId: PackageId; addonInterests: readonly AddonId[] }
	| { type: "auth_started"; method: "sign_up" | "sign_in" | "google" }
	| { type: "auth_redirect_started" }
	| { type: "signed_in"; userId: string }
	| { type: "profile_saved" }
	| { type: "booking_not_open" }
	| { type: "slots_refresh_requested" }
	| { type: "slots_loaded"; slots: readonly BookingSlot[] }
	| { type: "slot_chosen"; slotId: string }
	| { type: "submit_requested" }
	| { type: "registration_requested"; registration: BookingRegistration }
	| { type: "slot_full" }
	| { type: "unauthenticated" }
	| { type: "redirect_restored"; selection: BookingSelection; profileUserId: string | null; userId: string }
	| { type: "operation_failed"; operation: BookingOperation; reason: FailureReason }
	| { type: "retry_requested" }
	| { type: "restarted" };

export const initialState: BookingState = { step: "choosing_package" };

function chooseSlot(selection: BookingSelection, userId: string): SlotState {
	return { step: "choosing_slot", selection, userId, slots: [], availability: "loading", notice: null };
}

export function transition(state: BookingState, event: BookingEvent): BookingState {
	if (event.type === "restarted") return initialState;
	if (event.type === "unauthenticated" && "selection" in state) {
		return { step: "needs_account", selection: state.selection };
	}
	if (state.step === "failed") return event.type === "retry_requested" ? state.resume : state;
	if (event.type === "operation_failed") {
		const operation = state.step === "completing_profile" ? "profile"
			: state.step === "choosing_slot" ? "slots"
				: state.step === "submitting" ? "registration"
					: ["needs_account", "signing_up", "signing_in"].includes(state.step) ? "auth" : null;
		if (event.operation !== operation) return state;
		const resume = state.step === "submitting"
			? chooseSlot({ ...state.selection, slotId: null }, state.userId)
			: state.step === "signing_up" || state.step === "signing_in"
				? { ...state, step: "needs_account" as const } : state;
		if (resume.step === "choosing_package" || resume.step === "requested") return state;
		return { step: "failed", operation: event.operation, reason: event.reason, resume };
	}
	if (state.step === "choosing_package") {
		if (event.type === "redirect_restored") {
			return event.profileUserId === event.userId
				? chooseSlot(event.selection, event.userId)
				: { step: "completing_profile", selection: event.selection, userId: event.userId };
		}
		return event.type === "package_chosen" ? {
			step: "needs_account", selection: { packageId: event.packageId, addonInterests: [...event.addonInterests], slotId: null },
		} : state;
	}
	if (state.step === "needs_account" && event.type === "auth_started") {
		return { ...state, step: event.method === "sign_up" ? "signing_up" : "signing_in" };
	}
	if ((state.step === "needs_account" || state.step === "signing_up" || state.step === "signing_in") && event.type === "signed_in") {
		return { step: "completing_profile", selection: state.selection, userId: event.userId };
	}
	if (state.step === "completing_profile" && event.type === "profile_saved") {
		return chooseSlot(state.selection, state.userId);
	}
	if (state.step === "choosing_slot") {
		switch (event.type) {
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
				return state.availability === "ready" && state.selection.slotId !== null ? { ...state, step: "submitting" } : state;
		}
	}
	if (state.step === "submitting") {
		if (event.type === "slot_full") {
			return { ...chooseSlot({ ...state.selection, slotId: null }, state.userId), notice: "slot_full" };
		}
		if (event.type === "registration_requested" && event.registration.classId === state.selection.slotId) {
			return { step: "requested", selection: state.selection, userId: state.userId, registration: event.registration };
		}
	}
	return state;
}
