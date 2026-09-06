import { createClassKitClient } from "@class-kit/react";

export const classKitClient = createClassKitClient(import.meta.env, {
	authStorageKey: "class-kit-demo2-auth",
});
