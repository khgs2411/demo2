import type { ClassKitClient } from "@class-kit/react";
import type { BookingEvent, BookingOperation, BookingSelection } from "./machine";

export type BookingSdk = {
	auth: Pick<ClassKitClient["auth"], "signIn" | "signUp" | "getSession">;
	profile: Pick<ClassKitClient["profile"], "update">;
};
export type BookingProfile = {
	displayName: string;
	phoneNumber: string;
	businessName: string;
	websiteUrl?: string;
};

function failure(operation: BookingOperation): BookingEvent {
	return { type: "operation_failed", operation, reason: "generic" };
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
			if (response.error) return response.error.code === "unauthorized" ? { type: "unauthenticated" } : failure("profile");
			return { type: "profile_saved" };
		} catch {
			return failure("profile");
		}
	}

	return {
		signIn: (email: string, password: string) => passwordAuth("signIn", email, password),
		signUp: (email: string, password: string) => passwordAuth("signUp", email, password),
		saveProfile,
	};
}
