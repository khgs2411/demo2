import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
	plugins: [react()],
	test: {
		environment: "jsdom",
		setupFiles: ["./src/test-setup.ts"],
		// The SDK ships extensionless ESM that only a bundler resolves; Node cannot load it externally.
		server: { deps: { inline: ["@class-kit/react"] } },
	},
});
