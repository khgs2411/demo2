import { clearBookingRedirect, clearAccountRedirect } from "../booking";
import { studioRedirectKey, clearStudioRedirect } from "./redirect";
import type { ClassKitClient } from "@class-kit/react";

export type StudioRegistrations = Pick<ClassKitClient["management"]["registrations"], "listPending" | "listRegistered" | "approve" | "reject">;

export type StudioError = { code: string; message: string | null };
function mapError(error: unknown): StudioError {
	if (typeof error === "string") return { code: "auth", message: error };
	if (error && typeof error === "object" && "code" in error && typeof error.code === "string" && "message" in error && typeof error.message === "string") return { code: error.code, message: error.message };
	return { code: "network", message: null };
}

export function createStudioAdapter(registrations: StudioRegistrations) {
	async function load(now: Date) {
		try {
			const [pending, registered] = await Promise.all([registrations.listPending(), registrations.listRegistered()]);
			return { type: "lists_loaded" as const,
				pending: [...pending.registrations].sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt)),
				upcoming: registered.registrations.filter(row => row.class && Date.parse(row.class.startsAt) > now.getTime())
					.sort((a, b) => Date.parse(a.class!.startsAt) - Date.parse(b.class!.startsAt)),
			};
		} catch (error) { return { type: "load_failed" as const, error: mapError(error) }; }
	}
	async function decide(id: string, action: "approve" | "reject", reason?: string) {
		try {
			if (action === "approve") await registrations.approve(id);
			else await registrations.reject(id, { reason: reason || undefined });
			return { type: "decision_succeeded" as const };
		} catch (error) { return { type: "decision_failed" as const, error: mapError(error) }; }
	}
	return { load, decide };
}

export function createStudioAuthAdapter(auth: Pick<ClassKitClient["auth"], "signIn" | "signOut" | "signInWithGoogle">, refresh: () => Promise<void>) {
	async function signIn(email: string, password: string) {
		try {
			const response = await auth.signIn(email,password);
			if (response.error) throw response.error;
			await refresh();
			return {type:"auth_finished" as const};
		} catch (error) { return {type:"auth_failed" as const,error:mapError(error)}; }
	}
	async function signOut() {
		try {
			const response = await auth.signOut();
			if (response.error) throw response.error;
			await refresh();
			return {type:"access_resolved" as const,access:"signed_out" as const};
		} catch (error) { return {type:"auth_failed" as const,error:mapError(error)}; }
	}
	async function signInWithGoogle() {
		try { window.sessionStorage.setItem(studioRedirectKey,"#/studio"); }
		catch { return {type:"auth_failed" as const,error:{code:"redirect_storage",message:null}}; }
		clearBookingRedirect(); clearAccountRedirect();
		try {
			const response = await auth.signInWithGoogle();
			if (response.error) throw response.error;
			return {type:"auth_redirect_started" as const};
		} catch (error) {
			clearStudioRedirect();
			return {type:"auth_failed" as const,error:mapError(error)};
		}
	}
	return {signIn,signOut,signInWithGoogle};
}
