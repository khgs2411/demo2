import { useProductContext, type ClassKitClient, type ClassSummary } from "@class-kit/react";
import { getBookingOptions } from "../packages";
import type { BookingEvent, BookingOperation, BookingSelection, BookingSlot, BookingState, PackageId } from "./machine";
import { clearBookingRedirect, saveBookingRedirect, saveAccountRedirect, clearAccountRedirect } from "./redirect";
import type { RequestsEvent } from "./requests-machine";

export type BookingSdk = {
	auth: Pick<ClassKitClient["auth"], "signIn" | "signUp" | "getSession" | "signInWithGoogle" | "signOut">;
	profile: Pick<ClassKitClient["profile"], "update">;
	classes: Pick<ClassKitClient["classes"], "list" | "register" | "cancelRegistration">;
};
export type BookingRange = { start: string; end: string };
export type BookingProfile = {
	displayName: string;
	phoneNumber: string;
	businessName: string;
	websiteUrl?: string;
};

export function useBookingContext() {
	return useProductContext();
}

function failure(operation: BookingOperation): BookingEvent {
	return { type: "operation_failed", operation, reason: "generic" };
}

function apiFailure(operation: BookingOperation, error: { code: string }): BookingEvent {
	return error.code === "unauthorized" ? { type: "unauthenticated" } : failure(operation);
}

function mapSlot(slot: ClassSummary): BookingSlot {
	return {
		id: slot.id, startsAt: slot.startsAt, canRegister: slot.canRegister,
		canCancelRegistration: slot.canCancelRegistration, userRegistrationState: slot.userRegistrationState ?? null,
	};
}

export function createBookingAdapter(client: BookingSdk | null, refreshProductContext: () => Promise<void>) {
	async function passwordAuth(method: "signIn" | "signUp", email: string, password: string): Promise<BookingEvent> {
		try {
			if (!client) return failure("auth");
			const response = await client.auth[method](email, password);
			if (response.error) return failure("auth");
			await refreshProductContext();
			const session = await client.auth.getSession();
			return session ? { type: "signed_in", userId: session.user.id } : { type: "unauthenticated" };
		} catch {
			return failure("auth");
		}
	}

	async function signInWithGoogle(state?: BookingState): Promise<BookingEvent> {
		if (!client) return failure("auth");
		if (state) clearAccountRedirect();
		else clearBookingRedirect();
		if (!(state ? saveBookingRedirect(state) : saveAccountRedirect())) {
			clearBookingRedirect();
			clearAccountRedirect();
			return { type: "operation_failed", operation: "auth", reason: "redirect_storage" };
		}
		try {
			const response = await client.auth.signInWithGoogle();
			if (!response.error) return { type: "auth_redirect_started" };
		} catch {
			// A rejected SDK promise is also a failed redirect initiation.
		}
		clearBookingRedirect();
		clearAccountRedirect();
		return failure("auth");
	}

	async function saveProfile(profile: BookingProfile, selection: BookingSelection): Promise<BookingEvent> {
		try {
			if (!client) return failure("profile");
			const response = await client.profile.update({
				displayName: profile.displayName,
				phoneNumber: profile.phoneNumber,
				metadata: {
					business_name: profile.businessName,
					website_url: profile.websiteUrl || null,
					package_interest: selection.packageId,
					addon_interests: [...selection.addonInterests],
				},
			});
			if (response.error) return apiFailure("profile", response.error);
			return { type: "profile_saved" };
		} catch {
			return failure("profile");
		}
	}

	async function loadSlots(packageId: PackageId, range: BookingRange): Promise<BookingEvent> {
		const templateId = getBookingOptions().packages.find((entry) => entry.id === packageId)?.templateId;
		if (templateId == null) return { type: "booking_not_open" };
		try {
			if (!client) return failure("slots");
			const response = await client.classes.list({ range, filters: { templateId } });
			return response.error ? apiFailure("slots", response.error)
				: { type: "slots_loaded", slots: response.data.classes.map(mapSlot) };
		} catch {
			return failure("slots");
		}
	}

	async function requestRegistration(classId: string, packageId: PackageId, range: BookingRange): Promise<readonly BookingEvent[]> {
		try {
			if (!client) return [failure("registration")];
			const response = await client.classes.register(classId);
			if (response.error) {
				// The customer API preserves this database marker inside bad_request.
				if (response.error.code === "bad_request" && response.error.message.includes("class_capacity_full")) {
					return [{ type: "slot_full" }, await loadSlots(packageId, range)];
				}
				return [apiFailure("registration", response.error)];
			}
			return [{ type: "registration_requested", registration: {
				id: response.data.registration_id, classId: response.data.registration.class_id, status: response.data.status,
			} }];
		} catch {
			return [failure("registration")];
		}
	}

	async function listRequests(range: BookingRange): Promise<RequestsEvent> {
		try {
			if (!client) return { type: "failed" };
			const response = await client.classes.list({ range });
			if (response.error) return { type: response.error.code === "unauthorized" ? "signed_out" : "failed" };
			return { type: "loaded", requests: response.data.classes.filter(slot => slot.userRegistrationState)
				.map(slot => ({ ...mapSlot(slot), name: slot.name })) };
		} catch {
			return { type: "failed" };
		}
	}

	async function cancelRequest(registrationId: string, range: BookingRange): Promise<readonly RequestsEvent[]> {
		let failed = false;
		let completed: RequestsEvent | null = null;
		try {
			if (!client) return [{ type: "failed" }];
			const response = await client.classes.cancelRegistration(registrationId);
			failed = Boolean(response.error);
			if (response.data) completed = { type: "cancel_completed", registration: { id: response.data.registration_id, classId: response.data.registration.class_id, status: response.data.status } };
		} catch {
			failed = true;
		}
		return [...(failed ? [{ type: "cancel_failed" } as const] : completed ? [completed] : []), await listRequests(range)];
	}

	async function signOut(): Promise<boolean> {
		try { return client ? !(await client.auth.signOut()).error : false; } catch { return false; }
	}

	return {
		signIn: (email: string, password: string) => passwordAuth("signIn", email, password),
		signUp: (email: string, password: string) => passwordAuth("signUp", email, password),
		signInWithGoogle,
		saveProfile,
		loadSlots,
		requestRegistration,
		listRequests,
		cancelRequest,
		signOut,
	};
}
