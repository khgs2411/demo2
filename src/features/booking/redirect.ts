import { getBookingOptions } from "../packages";
import type { BookingEvent, BookingSelection, BookingState } from "./machine";

export const bookingRedirectKey = "demo2-booking-redirect";
type RedirectIntent = { selection: BookingSelection; profileUserId: string | null };
type RedirectStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function saveBookingRedirect(state: BookingState, storage?: RedirectStorage): boolean {
	if (state.step === "choosing_package" || state.step === "requested" || state.step === "failed") return false;
	const intent: RedirectIntent = {
		selection: state.selection,
		profileUserId: state.step === "choosing_slot" || state.step === "submitting" ? state.userId : null,
	};
	try {
		(storage ?? window.sessionStorage).setItem(bookingRedirectKey, JSON.stringify(intent));
		return true;
	} catch {
		return false;
	}
}

function isIntent(value: unknown): value is RedirectIntent {
	if (!value || typeof value !== "object") return false;
	const { selection, profileUserId } = value as Partial<RedirectIntent>;
	if (!selection || typeof selection !== "object") return false;
	const options = getBookingOptions();
	return options.packages.some((entry) => entry.id === selection.packageId)
		&& Array.isArray(selection.addonInterests)
		&& selection.addonInterests.every((id) => options.addons.some((entry) => entry.id === id))
		&& (selection.slotId === null || (typeof selection.slotId === "string" && selection.slotId.length > 0))
		&& (profileUserId === null || (typeof profileUserId === "string" && profileUserId.length > 0));
}

export function restoreBookingRedirect(userId: string, storage?: RedirectStorage): BookingEvent | null {
	try {
		const target = storage ?? window.sessionStorage;
		const saved = target.getItem(bookingRedirectKey);
		if (saved === null) return null;
		// Consume once; a reload must never replay a previous booking attempt.
		target.removeItem(bookingRedirectKey);
		const intent: unknown = JSON.parse(saved);
		if (!isIntent(intent)) return null;
		return {
			type: "redirect_restored", userId, profileUserId: intent.profileUserId,
			selection: { packageId: intent.selection.packageId, addonInterests: [...intent.selection.addonInterests], slotId: intent.selection.slotId },
		};
	} catch {
		return null;
	}
}

export function clearBookingRedirect(storage?: RedirectStorage): void {
	try {
		(storage ?? window.sessionStorage).removeItem(bookingRedirectKey);
	} catch {
		// Storage can be unavailable even when OAuth itself is available.
	}
}
