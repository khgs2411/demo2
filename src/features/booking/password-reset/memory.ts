import type { ClassKitClient } from "@class-kit/react";

// Held in memory only: the reset token never reaches storage, and a reload after
// capture has already lost it from the address bar.
let heldToken: string | null = null;
let rememberedEmail = "";

export const resetPasswordHash = "#/reset-password";

/** Reads the emailed token once at startup and routes to the reset screen. */
export function captureResetToken(auth: Pick<ClassKitClient["auth"], "takePasswordResetToken"> | null) {
	const token = auth?.takePasswordResetToken() ?? null;
	if (!token) return;
	heldToken = token;
	if (window.location.hash !== resetPasswordHash) {
		window.history.replaceState(window.history.state, "", resetPasswordHash);
	}
}

export function readResetToken() {
	return heldToken;
}

export function dropResetToken() {
	heldToken = null;
}

export function rememberResetEmail(email: string) {
	rememberedEmail = email.trim();
}

export function readResetEmail() {
	return rememberedEmail;
}
