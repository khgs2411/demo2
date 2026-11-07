import * as THREE from "three";
import { afterEach, expect, it, vi } from "vitest";
import { createScene } from "./renderer";
import { timeline } from "./timeline";

const inspection = vi.hoisted(() => ({ camera: undefined as THREE.PerspectiveCamera | undefined }));

// Exercise colour handling without creating a GPU context or running postprocessing.
vi.mock("three", async importOriginal => ({
	...await importOriginal<typeof import("three")>(),
	WebGLRenderer: class {
		shadowMap = { enabled: false, type: 0 };
		toneMapping = 0;
		setPixelRatio() {}
		setSize() {}
		dispose() {}
	},
}));
vi.mock("three/examples/jsm/postprocessing/EffectComposer.js", () => ({
	EffectComposer: class {
		passes: { dispose(): void }[] = [];
		addPass(pass: { dispose(): void; camera?: THREE.PerspectiveCamera }) { this.passes.push(pass); if (pass.camera) inspection.camera = pass.camera; }
		setSize() {}
		render() {}
		dispose() {}
	},
}));
vi.mock("./world", async importOriginal => ({
	...await importOriginal<typeof import("./world")>(),
	buildWorld: () => ({ apply() {} }), disposeWorld() {},
}));

let view: ReturnType<typeof createScene>;
afterEach(() => { view?.dispose(); document.documentElement.style.removeProperty("--bg"); });
const labels = { studio: "Studio", open: "Open", customers: "Customers", bookings: "Bookings", requests: "Requests" };

it("disables tone mapping so token backgrounds are not changed by ACES", () => {
	view = createScene(document.createElement("canvas"), labels, "ltr");
	expect(view.renderer.toneMapping).toBe(THREE.NoToneMapping);
});

it("writes the canvas background hex to the page on every frame", () => {
	view = createScene(document.createElement("canvas"), labels, "ltr");
	for (const [progress, hex] of [[0, "#f2eadb"], [.22, "#787570"], [.5, "#0f1726"], [1, "#f2eadb"]] as const) {
		view.render(timeline(progress, 0), 0, 1 / 60);
		expect(document.documentElement.style.getPropertyValue("--bg")).toBe(hex);
	}
});

it.each([0, .5])("starts the camera at progress %s's target on its first paint", progress => {
	view = createScene(document.createElement("canvas"), labels, "rtl");
	view.resize(1425, 900);
	view.render(timeline(progress, 0), 0, 0);
	const camera = inspection.camera!;
	expect(camera.position.z).toBeCloseTo(progress === 0 ? 20 : 16.1);
	expect(camera.view!.offsetX).toBeCloseTo(progress === 0 ? 0 : -.19 * 1425);
	expect(camera.view!.offsetY).toBeCloseTo(progress === 0 ? -.28 * 900 : 0);
});
