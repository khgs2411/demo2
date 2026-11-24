import { invokeProductFunction, useProductContext, type ClassKitClient, type ClassRegistrationResponse, type ClassSummary, type ProductDocument } from "@class-kit/react";
import { getBookingOptions } from "../packages";
import type { BookingContact, BookingEvent, BookingOperation, BookingProfile, BookingSelection, BookingSlot, BookingState, BookingTerms, PackageId, SignupDraft } from "./machine";
import type { AccountDetailsSaveEvent } from "./account-details-machine";
import type { AcceptedTermsLoadEvent } from "./accepted-terms-machine";
import { clearBookingRedirect, saveBookingAuthRedirect, saveAccountRedirect, clearAccountRedirect } from "./redirect";
import type { RequestsEvent } from "./requests-machine";
import type { CompleteOutcome, RequestOutcome } from "./password-reset/machine";

export type BookingSdk = Pick<ClassKitClient, "supabase" | "authStorageKey" | "productKey"> & {
	auth: Pick<ClassKitClient["auth"], "signIn" | "signUp" | "getSession" | "signInWithGoogle" | "signOut" | "requestPasswordReset" | "completePasswordReset">;
	profile: Pick<ClassKitClient["profile"], "get" | "update">;
	productDocuments: Pick<ClassKitClient["productDocuments"], "listMyAcceptances">;
	classes: Pick<ClassKitClient["classes"], "list" | "listMyRegistrations" | "register" | "registerWithSignup" | "cancelRegistration">;
};
export type BookingRange = { start: string; end: string };
export function useBookingContext() {
	return useProductContext();
}

function failure(operation: BookingOperation): BookingEvent {
	return { type: "operation_failed", operation, reason: "generic" };
}

function apiFailure(operation: BookingOperation, error: { code: string }): BookingEvent {
	return error.code === "unauthorized" ? { type: "unauthenticated" } : failure(operation);
}

function isSignedOutError(code: string): boolean {
	return code === "unauthorized" || code === "session_revoked";
}

function mapRegistration(registration: ClassRegistrationResponse["registration"]) {
	return { id: registration.id, classId: registration.class_id, status: registration.status };
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
		if (!(state ? await saveBookingAuthRedirect(state) : saveAccountRedirect())) {
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

	async function loadProfile(userId: string): Promise<Extract<BookingEvent, { type: "profile_loaded" }>> {
		try {
			const response = await client?.profile.get();
			const user = response?.data?.user;
			if (user && user.user_id === userId) {
				const { business_name: business, website_url: website } = user.metadata;
				const profile: BookingProfile = {
					displayName: user.display_name ?? "",
					phoneNumber: user.phone_number ?? "",
					businessName: typeof business === "string" ? business : "",
					websiteUrl: typeof website === "string" ? website : undefined,
				};
				return { type: "profile_loaded", profile };
			}
		} catch {
			return { type: "profile_loaded", profile: null };
		}
		return { type: "profile_loaded", profile: null };
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

	async function saveAccountDetails({ displayName, phoneNumber }: BookingContact): Promise<AccountDetailsSaveEvent | { type: "signed_out" }> {
		try {
			if (!client) return { type: "save_failed" };
			const response = await client.profile.update({ displayName, phoneNumber });
			if (response.error) return { type: isSignedOutError(response.error.code) ? "signed_out" : "save_failed" };
			return { type: "saved" };
		} catch {
			return { type: "save_failed" };
		}
	}

	async function loadTerms(locale: string): Promise<BookingEvent> {
		try {
			// The document facade caches successful reads. Consent needs a fresh publication.
			const response = await invokeProductFunction<{ document: ProductDocument }>(client, "product-documents", {
				action: "get", document_type: "terms_of_service", locale, fallback_locale: "en",
			});
			if (response.error) return { type: "terms_load_failed" };
			const { title, content_markdown: text, version, locale: publishedLocale } = response.data.document;
			return { type: "terms_loaded", terms: { title, text, version, locale: publishedLocale } };
		} catch {
			return { type: "terms_load_failed" };
		}
	}

	async function loadAcceptedTerms(): Promise<AcceptedTermsLoadEvent> {
		try {
			const response = await client?.productDocuments.listMyAcceptances();
			if (!response || response.error) return { type: "load_failed" };
			return {
				type: "loaded",
				acceptances: response.data.acceptances.map(snapshot => ({
					id: snapshot.id,
					title: snapshot.documentTitle,
					text: snapshot.documentContentMarkdown,
					locale: snapshot.documentLocale,
					version: snapshot.documentVersion,
					acceptedAt: snapshot.acceptedAt,
				})),
			};
		} catch {
			return { type: "load_failed" };
		}
	}

	async function requestWithSignup(classId: string, draft: SignupDraft, terms: BookingTerms, turnstileToken: string): Promise<BookingEvent> {
		try {
			if (!client) return { type: "signup_failed" };
			const existingSession = await client.auth.getSession();
			if (existingSession) return { type: "signed_in", userId: existingSession.user.id };
			const result = await client.classes.registerWithSignup({ classId, ...draft, termsVersion: terms.version, termsLocale: terms.locale, turnstileToken });
			switch (result.status) {
				case "account_exists": return {
					type: result.status, email: draft.email.trim().toLowerCase(),
					contact: { displayName: draft.displayName, phoneNumber: draft.phone },
				};
				case "terms_changed":
				case "terms_unavailable":
				case "turnstile_failed":
				case "turnstile_unavailable":
				case "rate_limited":
				case "disabled":
				case "not_found":
				case "bad_request": return { type: result.status };
			}
			if (!("formatPassword" in result) || !result.formatPassword) return { type: "class_unavailable" };
			const credentials = { password: result.password, formatted: result.formatPassword() };
			const registration = "registration" in result && result.registration ? mapRegistration(result.registration) : undefined;
			const email = draft.email.trim().toLowerCase();
			if (result.status === "sign_in_failed") return { type: result.status, credentials, registration, email };
			const session = await client.auth.getSession().catch(() => null);
			if (!session) return { type: "sign_in_failed", credentials, registration, email };
			return result.status === "registered"
				? { type: "signup_registered", userId: session.user.id, registration: mapRegistration(result.registration), credentials }
				: { type: "account_created_class_unavailable", userId: session.user.id, credentials };
		} catch {
			return { type: "signup_failed" };
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
			const response = await client.classes.listMyRegistrations({ range });
			if (response.error?.code === "forbidden") return { type: "no_access" };
			if (response.error) return { type: isSignedOutError(response.error.code) ? "signed_out" : "failed" };
			return { type: "loaded", requests: response.data.registrations.map(registration => ({
				id: registration.classId, name: registration.class.name, startsAt: registration.class.startsAt,
				canRegister: false, canCancelRegistration: registration.canCancel,
				userRegistrationState: { id: registration.id, status: registration.status },
			})) };
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

	async function requestPasswordReset(email: string, locale: string, turnstileToken: string): Promise<RequestOutcome> {
		try {
			if (!client) return "failed";
			const resetUrl = `${window.location.origin}${window.location.pathname}#/reset-password`;
			return (await client.auth.requestPasswordReset({ email, locale, turnstileToken, resetUrl })).status;
		} catch {
			return "failed";
		}
	}

	async function completePasswordReset(token: string, password: string): Promise<CompleteOutcome> {
		try {
			return client ? (await client.auth.completePasswordReset({ token, password })).status : "failed";
		} catch {
			return "failed";
		}
	}

	return {
		signIn: (email: string, password: string) => passwordAuth("signIn", email, password),
		signUp: (email: string, password: string) => passwordAuth("signUp", email, password),
		signInWithGoogle,
		loadProfile,
		saveProfile,
		saveAccountDetails,
		loadSlots,
		requestRegistration,
		loadTerms,
		loadAcceptedTerms,
		requestWithSignup,
		listRequests,
		cancelRequest,
		signOut,
		requestPasswordReset,
		completePasswordReset,
	};
}
