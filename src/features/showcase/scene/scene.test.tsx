import { act, cleanup, render } from "@testing-library/react";
import { createRef } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import "../../../i18n";
import Scene from "./scene";

const fake = vi.hoisted(() => ({
	fonts: vi.fn(), render: vi.fn(), dispose: vi.fn(), resize: vi.fn(),
}));
vi.mock("./labels", () => ({ loadLabelFonts: fake.fonts }));
vi.mock("./renderer", () => ({ createScene: () => ({ render: fake.render, resize: fake.resize, dispose: fake.dispose }) }));

let intersection: (entries: { isIntersecting: boolean }[]) => void;
let disconnected: ReturnType<typeof vi.fn>;
let pending: Map<number, FrameRequestCallback>;
let nextFrame: number;

beforeEach(() => {
	vi.clearAllMocks();
	pending = new Map(); nextFrame = 0; disconnected = vi.fn();
	vi.stubGlobal("IntersectionObserver", class {
		constructor(callback: typeof intersection) { intersection = callback; }
		observe() {}
		disconnect = disconnected;
	});
	vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} });
	vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => { pending.set(++nextFrame, callback); return nextFrame; });
	vi.stubGlobal("cancelAnimationFrame", (id: number) => pending.delete(id));
	vi.spyOn(performance, "now").mockReturnValue(0);
	fake.fonts.mockResolvedValue(undefined);
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

function mount(onError = vi.fn()) {
	const storyRef = createRef<HTMLElement>();
	return render(<section ref={storyRef}><Scene storyRef={storyRef} onError={onError} /></section>);
}

it("renders only while intersecting and cancels work and disposes on unmount", async () => {
	const mounted = mount();
	await act(async () => {});
	expect(pending.size).toBe(0);
	act(() => intersection([{ isIntersecting: true }]));
	expect(pending.size).toBe(1);
	act(() => {
		const [id, callback] = [...pending.entries()][0]; pending.delete(id); callback(16);
	});
	expect(fake.render).toHaveBeenCalledOnce();
	act(() => intersection([{ isIntersecting: false }]));
	expect(pending.size).toBe(0);
	act(() => intersection([{ isIntersecting: true }]));
	mounted.unmount();
	expect(pending.size).toBe(0);
	expect(disconnected).toHaveBeenCalledOnce();
	expect(fake.dispose).toHaveBeenCalledOnce();
});

it("does not create late scene work when unmounted during font loading", async () => {
	let ready!: () => void;
	fake.fonts.mockReturnValue(new Promise<void>(resolve => { ready = resolve; }));
	const mounted = mount(); mounted.unmount();
	await act(async () => { ready(); });
	expect(fake.resize).not.toHaveBeenCalled();
	expect(pending.size).toBe(0);
});

it("does not report a stale font failure after unmount", async () => {
	let fail!: (error: Error) => void;
	fake.fonts.mockReturnValue(new Promise<void>((_, reject) => { fail = reject; }));
	const onError = vi.fn(), mounted = mount(onError); mounted.unmount();
	await act(async () => { fail(new Error("font failed after navigation")); });
	expect(onError).not.toHaveBeenCalled();
});

it("reports an active initialization failure to the story's fallback owner", async () => {
	const error = new Error("font unavailable"), onError = vi.fn();
	fake.fonts.mockRejectedValue(error);
	mount(onError); await act(async () => {});
	expect(onError).toHaveBeenCalledWith(error);
	expect(pending.size).toBe(0);
});
