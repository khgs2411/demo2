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

function mount(onError = vi.fn(), onFrame = vi.fn()) {
	const storyRef = createRef<HTMLElement>();
	return render(<section ref={storyRef}><Scene storyRef={storyRef} onError={onError} onFrame={onFrame} /></section>);
}

function runFrame(now: number) {
	act(() => {
		const [id, callback] = [...pending.entries()][0]; pending.delete(id); callback(now);
	});
}

it.each([0, .5])("paints current progress %s before any scroll or intersection callback", async progress => {
	vi.stubGlobal("innerWidth", 1440); vi.stubGlobal("innerHeight", 900);
	const onFrame = vi.fn(), mounted = mount(vi.fn(), onFrame);
	const canvas = mounted.container.querySelector("canvas")!, story = mounted.container.querySelector("section")!;
	vi.spyOn(canvas, "getBoundingClientRect").mockReturnValue(new DOMRect(0, 0, 1425, 900));
	Object.defineProperties(canvas, { clientWidth: { value: 1425 }, clientHeight: { value: 900 } });
	Object.defineProperty(story, "offsetHeight", { value: 3240 });
	vi.spyOn(story, "getBoundingClientRect").mockReturnValue(new DOMRect(0, -2340 * progress, 1425, 3240));
	await act(async () => {});
	expect(fake.resize).toHaveBeenCalledWith(1425, 900);
	expect(fake.render).toHaveBeenCalledWith(expect.objectContaining({ angle: progress === 0 ? 0 : Math.PI }), 0, 0, 0, 0);
	expect(onFrame).toHaveBeenCalledWith(progress, expect.any(Object));
	expect(pending.size).toBe(1);
	runFrame(16);
	expect(fake.render).toHaveBeenCalledTimes(2);
	expect(fake.render).toHaveBeenLastCalledWith(expect.any(Object), .016, .016, 0, 0);
	act(() => intersection([{ isIntersecting: false }]));
	expect(pending.size).toBe(0);
});

it("renders the second frame with zero time and delta when its timestamp precedes the start", async () => {
	vi.mocked(performance.now).mockReturnValue(20);
	const onError = vi.fn(), mounted = mount(onError);
	const canvas = mounted.container.querySelector("canvas")!;
	vi.spyOn(canvas, "getBoundingClientRect").mockReturnValue(new DOMRect(0, 0, 100, 100));
	await act(async () => {});
	expect(fake.render).toHaveBeenCalledOnce();

	runFrame(16);

	expect(fake.render).toHaveBeenNthCalledWith(2, expect.any(Object), 0, 0, 0, 0);
	expect(onError).not.toHaveBeenCalled();
});

it("renders only while intersecting and cancels work and disposes on unmount", async () => {
	const mounted = mount();
	await act(async () => {});
	expect(pending.size).toBe(0);
	act(() => intersection([{ isIntersecting: true }]));
	expect(pending.size).toBe(1);
	runFrame(16);
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
