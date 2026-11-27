import { vi } from "vitest";

// Tests exercise SDK boundaries with mocks, never with a live product/session.
vi.mock("@class-kit/react", async () => {
	const { makeBookingContext } = await import("./features/booking/context-fixture");
	const context = makeBookingContext();
	return { useProductContext: () => context };
});

// jsdom does not implement matchMedia; browser-rendered routes use the shared motion hook.
if (typeof window !== "undefined" && !window.matchMedia) {
	Object.defineProperty(window, "matchMedia", { configurable: true, writable: true, value: (media: string) => ({
		media, matches: false, addEventListener() {}, removeEventListener() {},
	}) });
}
