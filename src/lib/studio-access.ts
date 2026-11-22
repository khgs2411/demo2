import type { useProductContext } from "./product-provider";

export type StudioAccess = "loading" | "signed_out" | "not_manager" | "manager";

export function getStudioAccess({ loading, session, productUser, capabilities }: ReturnType<typeof useProductContext>): StudioAccess {
	if (loading) return "loading";
	if (!session) return "signed_out";
	return productUser?.role === "manager" || capabilities.permissions.includes("registrations.manage")
		? "manager" : "not_manager";
}
