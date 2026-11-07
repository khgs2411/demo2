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
export type BookingOperation = "auth" | "profile" | "slots";
export type FailureReason = "generic" | "redirect_storage";
export type BookingState =
	| { step: "choosing_package" }
	| AccountState | ProfileState | SlotState
	| { step: "failed"; operation: BookingOperation; reason: FailureReason; resume: AccountState | ProfileState | SlotState };
export type BookingEvent =
	| { type: "package_chosen"; packageId: PackageId; addonInterests: readonly AddonId[] }
	| { type: "auth_started"; method: "sign_up" | "sign_in" | "google" }
	| { type: "signed_in"; userId: string }
	| { type: "profile_saved" }
	| { type: "operation_failed"; operation: BookingOperation; reason: FailureReason }
	| { type: "retry_requested" }
	| { type: "restarted" };

export const initialState: BookingState = { step: "choosing_package" };

function chooseSlot(selection: BookingSelection, userId: string): SlotState {
	return { step: "choosing_slot", selection, userId, slots: [], availability: "loading", notice: null };
}

export function transition(state: BookingState, event: BookingEvent): BookingState {
	if (event.type === "restarted") return initialState;
	if (state.step === "failed") return event.type === "retry_requested" ? state.resume : state;
	if (event.type === "operation_failed") {
		const operation = state.step === "completing_profile" ? "profile"
			: state.step === "choosing_slot" ? "slots"
				: ["needs_account", "signing_up", "signing_in"].includes(state.step) ? "auth" : null;
		if (event.operation !== operation) return state;
		const resume = state.step === "signing_up" || state.step === "signing_in"
			? { ...state, step: "needs_account" as const } : state;
		if (resume.step === "choosing_package") return state;
		return { step: "failed", operation: event.operation, reason: event.reason, resume };
	}
	if (state.step === "choosing_package") {
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
	return state;
}
