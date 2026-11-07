import { createClassKitClient } from "@class-kit/react";

export const classKitClient = createClassKitClient(import.meta.env, {
	authStorageKey: "demo2-showcase-auth",
});
