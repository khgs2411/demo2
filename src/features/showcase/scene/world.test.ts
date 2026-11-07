import * as THREE from "three";
import { expect, it } from "vitest";
import { disposeWorld } from "./world";

it("releases shared geometry, material and texture exactly once, plus instance buffers", () => {
	const scene = new THREE.Scene(), geometry = new THREE.BoxGeometry();
	const texture = new THREE.Texture(), material = new THREE.MeshBasicMaterial({ map: texture });
	const instance = new THREE.InstancedMesh(geometry, material, 2);
	const released = { geometry: 0, material: 0, texture: 0, instances: 0 };
	geometry.addEventListener("dispose", () => released.geometry++);
	material.addEventListener("dispose", () => released.material++);
	texture.addEventListener("dispose", () => released.texture++);
	instance.addEventListener("dispose", () => released.instances++);
	scene.add(new THREE.Mesh(geometry, material), new THREE.Mesh(geometry, material), instance);
	disposeWorld(scene);
	expect(released).toEqual({ geometry: 1, material: 1, texture: 1, instances: 1 });
	expect(scene.children).toHaveLength(0);
});
