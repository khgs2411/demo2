import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { buildWorld, disposeWorld, palette as C } from "./world";
import { getCameraLayout, type Timeline } from "./timeline";
import type { SceneLabels } from "./labels";

export function createScene(canvas: HTMLCanvasElement, labels: SceneLabels, direction: "rtl" | "ltr") {
	const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
	renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
	renderer.shadowMap.enabled = true;
	renderer.shadowMap.type = THREE.PCFSoftShadowMap;
	renderer.toneMapping = THREE.NoToneMapping;
	const scene = new THREE.Scene();
	const background = new THREE.Color(C.paper), paper = new THREE.Color(C.paper), night = new THREE.Color(C.night);
	scene.background = background;
	const camera = new THREE.PerspectiveCamera(32, 1, .1, 100);
	const hemi = new THREE.HemisphereLight(C.paper, C.ink, 1.4); scene.add(hemi);
	const sun = new THREE.DirectionalLight("#fff4e0", 2.6);
	sun.position.set(-5, 9, 6); sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024);
	Object.assign(sun.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6, near: 1, far: 30 }); sun.shadow.bias = -.0015;
	scene.add(sun);
	const rim = new THREE.PointLight(C.wire, 0, 14); rim.position.set(0, -3, 3); scene.add(rim);
	const composer = new EffectComposer(renderer);
	composer.addPass(new RenderPass(scene, camera));
	const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), .1, .6, .88);
	composer.addPass(bloom);
	composer.addPass(new OutputPass());
	const room = { x: 0, y: -.15 };
	let width = 1, height = 1, layout = getCameraLayout(width, height, direction);
	let disposed = false;
	function dispose() {
		if (disposed) return;
		disposed = true;
		disposeWorld(scene);
		composer.passes.forEach(pass => pass.dispose());
		// r164's UnrealBloomPass.dispose() omits its high-pass material.
		bloom.materialHighPassFilter.dispose();
		composer.dispose();
		renderer.dispose();
	}
	try {
		const world = buildWorld(scene, labels, direction);
		return {
			renderer,
			resize(w: number, h: number) {
				width = w; height = h;
				renderer.setSize(w, h, false); composer.setSize(w, h); bloom.setSize(w, h);
				camera.aspect = w / h; camera.updateProjectionMatrix();
				layout = getCameraLayout(w, h, direction);
			},
			render(frame: Timeline, t: number, dt: number, pointerX = 0, pointerY = 0) {
				world.apply(frame, t, pointerX, pointerY);
				background.copy(paper).lerp(night, frame.night);
				document.documentElement.style.setProperty("--bg", "#" + background.getHexString());
				hemi.intensity = frame.hemisphereIntensity; sun.intensity = frame.sunIntensity; rim.intensity = frame.rimIntensity;
				bloom.strength = frame.bloomStrength;
				camera.position.set(0, frame.cameraY, layout.distance - frame.cameraDolly);
				camera.lookAt(0, frame.cameraLookY, 0);
				const [rx, ry] = layout.room[frame.anchor], k = 1 - Math.pow(.02, dt);
				room.x += (rx - room.x) * k; room.y += (ry - room.y) * k;
				camera.setViewOffset(width, height, room.x * width, room.y * height, width, height);
				composer.render(dt);
			},
			dispose,
		};
	} catch (error) {
		dispose();
		throw error;
	}
}
