import { getBookingOptions } from "../packages";
import type { BookingSelection, BookingState, BookingRedirectRestored, SignupContinuation } from "./machine";

export const bookingRedirectKey = "demo2-booking-redirect";
type RedirectContinuation = { emailHash: string; next: SignupContinuation };
type RedirectIntent = {
	selection: BookingSelection;
	profileUserId: string | null;
	slotStartsAt?: string;
	continuation?: RedirectContinuation;
};
type RedirectStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

async function emailDigest(email: string): Promise<string> {
	const input = new TextEncoder().encode(email.trim().toLowerCase());
	const digest = await crypto.subtle.digest("SHA-256", input);
	return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
}

function withoutDraftContact(next: SignupContinuation): SignupContinuation {
	return next.kind === "book" ? { kind: next.kind, slot: next.slot } : next;
}

export async function saveBookingAuthRedirect(state: BookingState): Promise<boolean> {
	try {
		const emailHash = "continuation" in state && state.continuation && state.email
			? await emailDigest(state.email) : undefined;
		return saveBookingRedirect(state, undefined, emailHash);
	} catch {
		return false;
	}
}

export function saveBookingRedirect(state: BookingState, storage?: RedirectStorage, emailHash?: string): boolean {
	if (state.step === "choosing_package" || state.step === "requested" || state.step === "failed") return false;
	const next = "continuation" in state ? state.continuation : undefined;
	if (next && !emailHash) return false;
	const signupSlot = next?.slot ?? ("signupSlot" in state ? state.signupSlot : undefined);
	const intent: RedirectIntent = {
		selection: state.selection,
		profileUserId: state.step === "choosing_slot" || state.step === "submitting" ? state.userId : null,
		...(signupSlot?.id === state.selection.slotId && { slotStartsAt: signupSlot.startsAt }),
		...(next && emailHash && { continuation: { emailHash, next: withoutDraftContact(next) } }),
	};
	try {
		(storage ?? window.sessionStorage).setItem(bookingRedirectKey, JSON.stringify(intent));
		return true;
	} catch {
		return false;
	}
}

function isContinuation(value: unknown, slotId: string | null): value is RedirectContinuation {
	if (!value || typeof value !== "object") return false;
	const { emailHash, next } = value as Partial<RedirectContinuation>;
	if (typeof emailHash !== "string" || !/^[a-f0-9]{64}$/.test(emailHash) || !next || typeof next !== "object") return false;
	if (next.kind !== "book" && next.kind !== "show_request" && next.kind !== "choose_slot") return false;
	const slot = next.slot;
	if (!slotId || slot?.id !== slotId || typeof slot.startsAt !== "string" || !Number.isFinite(Date.parse(slot.startsAt))
		|| typeof slot.canRegister !== "boolean" || typeof slot.canCancelRegistration !== "boolean" || slot.userRegistrationState !== null) return false;
	if (next.kind === "choose_slot") return true;
	if (next.kind === "book") return next.contact === undefined
		|| (typeof next.contact?.displayName === "string" && typeof next.contact?.phoneNumber === "string");
	const registration = next.registration;
	return registration?.classId === slotId && typeof registration.id === "string" && registration.id.length > 0
		&& ["pending", "approved", "rejected", "cancelled"].includes(registration.status);
}

function isIntent(value: unknown): value is RedirectIntent {
	if (!value || typeof value !== "object") return false;
	const { selection, profileUserId, slotStartsAt, continuation } = value as Partial<RedirectIntent>;
	if (!selection || typeof selection !== "object") return false;
	const options = getBookingOptions();
	return options.packages.some((entry) => entry.id === selection.packageId)
		&& Array.isArray(selection.addonInterests)
		&& selection.addonInterests.every((id) => options.addons.some((entry) => entry.id === id))
		&& (selection.slotId === null || (typeof selection.slotId === "string" && selection.slotId.length > 0))
		&& (continuation === undefined || isContinuation(continuation, selection.slotId))
		&& (slotStartsAt === undefined || (typeof slotStartsAt === "string" && Number.isFinite(Date.parse(slotStartsAt))))
		&& (profileUserId === null || (typeof profileUserId === "string" && profileUserId.length > 0));
}

export async function restoreBookingRedirect(
	userId: string, email?: string, storage?: RedirectStorage,
): Promise<BookingRedirectRestored | null> {
	try {
		const target = storage ?? window.sessionStorage;
		const saved = target.getItem(bookingRedirectKey);
		if (saved === null) return null;
		// Consume once. The only automatic continuation is bound to the matching sign-in email.
		target.removeItem(bookingRedirectKey);
		const intent: unknown = JSON.parse(saved);
		if (!isIntent(intent)) return null;
		const restored: BookingRedirectRestored = {
			type: "redirect_restored", userId, profileUserId: intent.profileUserId,
			...(intent.slotStartsAt && { slotStartsAt: intent.slotStartsAt }),
			selection: { packageId: intent.selection.packageId, addonInterests: [...intent.selection.addonInterests], slotId: intent.selection.slotId },
		};
		const continuation = intent.continuation;
		if (continuation && email && continuation.emailHash === await emailDigest(email).catch(() => null)) {
			return { ...restored, email: email.trim().toLowerCase(), continuation: withoutDraftContact(continuation.next) };
		}
		return restored;
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

export function hasBookingRedirect(): boolean {
	try { return window.sessionStorage.getItem(bookingRedirectKey) !== null; } catch { return false; }
}

const choiceKey = "demo2-booking-choice";
export function saveBookingChoice(selection: BookingSelection): void {
	try { window.sessionStorage.setItem(choiceKey, JSON.stringify({ selection, profileUserId: null })); } catch { /* Choice persistence is optional outside OAuth. */ }
}
export function readBookingChoice(): BookingSelection | null {
	try {
		const value: unknown = JSON.parse(window.sessionStorage.getItem(choiceKey) ?? "null");
		return isIntent(value) ? value.selection : null;
	} catch { return null; }
}

const accountRedirectKey = "demo2-account-redirect";
export function saveAccountRedirect(): boolean {
	try { window.sessionStorage.setItem(accountRedirectKey, "account"); return true; } catch { return false; }
}
export function clearAccountRedirect(): void {
	try { window.sessionStorage.removeItem(accountRedirectKey); } catch { /* Storage may have become unavailable. */ }
}
export function consumeAccountRedirect(): boolean {
	try {
		const saved = window.sessionStorage.getItem(accountRedirectKey) === "account";
		clearAccountRedirect();
		return saved;
	} catch { return false; }
}
