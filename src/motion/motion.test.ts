import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { useReducedMotion } from "./use-reduced-motion";
import { createMotionVariants } from "./variants";

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

it("renders every shared variant at its end state without transitions when motion is reduced", () => {
	const variants = createMotionVariants(true);
	for (const variant of Object.values(variants)) {
		expect(variant.hidden).toEqual(variant.visible);
		expect(variant.visible).toMatchObject({ transition: { duration: 0, delay: 0 } });
	}
	expect(variants.reveal.visible).toMatchObject({ opacity: 1, y: 0 });
	expect(variants.countUp.visible).toMatchObject({ "--count": 1 });
});

it("tracks changes to the system motion preference and unsubscribes on unmount", () => {
	const listeners = new Set<() => void>();
	const media = {
		matches: false,
		addEventListener: (_: string, listener: () => void) => listeners.add(listener),
		removeEventListener: (_: string, listener: () => void) => listeners.delete(listener),
	};
	vi.stubGlobal("matchMedia", () => media);
	const { result, unmount } = renderHook(() => useReducedMotion());
	expect(result.current).toBe(false);
	act(() => { media.matches = true; listeners.forEach((listener) => listener()); });
	expect(result.current).toBe(true);
	unmount();
	expect(listeners.size).toBe(0);
});
