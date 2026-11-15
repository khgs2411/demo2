import type { ClassKitClient } from "@class-kit/react";

export type StudioRegistrations = Pick<ClassKitClient["management"]["registrations"], "listPending" | "listRegistered" | "approve" | "reject">;

export type StudioError = { code: string; message: string | null };
function mapError(error: unknown): StudioError {
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
