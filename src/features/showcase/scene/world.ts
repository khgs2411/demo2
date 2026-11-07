import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { makeLabel, type SceneLabels } from "./labels";
import type { Timeline } from "./timeline";

// Exact scene palette and geometry from the approved mockups/shell.html (three r164).
export const palette = { paper: "#f2eadb", paper2: "#e7dcc6", ink: "#1a1814", night: "#0f1726", night2: "#18233a", pipe: "#2a3a5c", coral: "#ff5a36", mustard: "#f2b33d", sage: "#8db596", glass: "#cfe3e8", wire: "#57e3d6", fault: "#ff4d6d", soil: "#3a2d25", soil2: "#2b211b" };
const C = palette;
const mat = (color: THREE.ColorRepresentation, options: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ color, roughness: .8, metalness: 0, ...options });
const glow = (color: THREE.ColorRepresentation, intensity = 2) => new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: intensity, roughness: .4 });

function box<M extends THREE.Material>(w: number, h: number, d: number, material: M, x: number, y: number, z: number, parent: THREE.Object3D, r = .04) {
	const mesh = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 2, h / 2, d / 2)), material);
	mesh.position.set(x, y, z); mesh.castShadow = mesh.receiveShadow = true; parent.add(mesh); return mesh;
}

export function buildWorld(scene: THREE.Scene, labels: SceneLabels, direction: "rtl" | "ltr") {
	const bodyFont = direction === "rtl" ? "IBM Plex Sans Hebrew" : "IBM Plex Sans";
	const label: typeof makeLabel = (text, w, h, opts, parent, x, y, z) => makeLabel(text, w, h, { dir: direction, ...opts }, parent, x, y, z);
	/* ---------- the world: a slab of ground that flips ---------- */
	const pivot = new THREE.Group(); scene.add(pivot);      // parallax + layout offset
	const world = new THREE.Group(); pivot.add(world);      // the flip
	// strata
	box(7.2, .2, 4.6, mat(C.paper2), 0, .4, 0, world, .06);
	box(7.2, .22, 4.6, mat(C.ink), 0, .19, 0, world, .02);
	box(7.2, .5, 4.6, mat(C.soil), 0, -.17, 0, world, .02);
	box(7.2, .1, 4.6, mat(C.night2), 0, -.47, 0, world, .03);
	// street + dashes
	box(7.2, .03, 1.25, mat(C.ink, { roughness: .95 }), 0, .51, 1.55, world, .01);
	for (let i = -3; i <= 3; i++) box(.45, .01, .07, mat(C.paper), i * 1, .53, 1.55, world, .005);

	/* topside */
	const top = new THREE.Group(); top.position.y = .5; world.add(top);
	box(3.8, 2.1, 1.5, mat(C.paper2), 0, 1.05, -.6, top, .05);
	box(4.0, .2, 1.66, mat(C.ink), 0, 2.18, -.6, top, .04);
	box(3.9, .14, .1, mat(C.ink), 0, 1.95, .17, top, .02);
	// awning: alternating stripes, tilted out
	const awning = new THREE.Group(); awning.position.set(0, 1.62, .18); awning.rotation.x = .55; top.add(awning);
	for (let i = 0; i < 11; i++) box(.34, .04, .6, mat(i % 2 ? C.paper : C.coral), -1.7 + i * .34, 0, .3, awning, .015);
	// windows (they light up at the end)
	const windowMat = new THREE.MeshStandardMaterial({ color: C.glass, emissive: C.mustard, emissiveIntensity: 0, roughness: .15, metalness: .1 });
	box(1.05, .85, .06, windowMat, -1.15, .78, .16, top, .02);
	box(1.05, .85, .06, windowMat, 1.15, .78, .16, top, .02);
	box(1.15, .08, .12, mat(C.ink), -1.15, .32, .2, top, .02);
	box(1.15, .08, .12, mat(C.ink), 1.15, .32, .2, top, .02);
	// booking board in the right window
	const board = new THREE.Group(); board.position.set(1.15, .8, .2); top.add(board);
	box(.72, .5, .02, mat(C.paper), 0, 0, 0, board, .01);
	const booked = [1, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0, 1];
	booked.forEach((b, i) => box(.12, .08, .02, mat(b ? C.coral : "#d8cfbd"), -.24 + (i % 4) * .16, .13 - Math.floor(i / 4) * .13, .015, board, .01));
	// door
	box(.6, 1.2, .06, mat(C.ink), 0, .6, .16, top, .02);
	box(.06, .06, .04, glow(C.mustard, 1), .2, .62, .2, top, .01);
	// the sign — it falls before the agent fixes it
	const signPivot = new THREE.Group(); signPivot.position.set(.95, 2.0, .26); top.add(signPivot);
	const sign = new THREE.Group(); sign.position.set(-.95, -.02, 0); signPivot.add(sign);
	box(2.0, .46, .08, mat(C.ink), 0, 0, 0, sign, .03);
	label(labels.studio, 1.8, .42, { font: '900 150px "Frank Ruhl Libre"' }, sign, 0, 0, .05);
	// plant, A-board, tree, lamp, people
	box(.4, .45, .4, mat(C.coral), -2.65, .22, .55, top, .06);
	[[-2.65, .75, .55, .32], [-2.5, 1.0, .5, .24], [-2.8, .95, .62, .22]].forEach(([x, y, z, r]) => { const s = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), mat(C.sage, { flatShading: true })); s.position.set(x, y, z); s.castShadow = true; top.add(s); });
	const aBoard = new THREE.Group(); aBoard.position.set(2.75, 0, .7); top.add(aBoard);
	box(.5, .7, .05, mat(C.paper), 0, .35, .1, aBoard, .02).rotation.x = -.18;
	box(.5, .7, .05, mat(C.paper), 0, .35, -.1, aBoard, .02).rotation.x = .18;
	label(labels.open, .42, .16, { font: `600 140px "${bodyFont}"`, fg: C.ink }, aBoard, 0, .42, .14).rotation.x = -.18;
	box(.12, 1.2, .12, mat(C.ink), 3.0, .6, -1.3, top, .04);
	[[3.0, 1.55, -1.3, .55], [2.7, 1.35, -1.1, .4], [3.25, 1.4, -1.05, .38]].forEach(([x, y, z, r]) => { const s = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), mat(C.sage, { flatShading: true })); s.position.set(x, y, z); s.castShadow = true; top.add(s); });
	const people: THREE.Group[] = [];
	([[-1.9, .9, C.mustard], [1.95, .95, C.sage], [-.75, 1.05, C.coral]] as const).forEach(([x, z, c]) => {
		const g = new THREE.Group(); g.position.set(x, 0, z); top.add(g);
		const body = new THREE.Mesh(new THREE.CapsuleGeometry(.13, .32, 4, 12), mat(c)); body.position.y = .3; body.castShadow = true; g.add(body);
		const head = new THREE.Mesh(new THREE.SphereGeometry(.11, 16, 12), mat(C.ink)); head.position.y = .66; head.castShadow = true; g.add(head);
		people.push(g);
	});

	/* underside: hangs below the slab; local +Y points away from the ground */
	const under = new THREE.Group(); under.position.y = -.52; under.rotation.x = Math.PI; world.add(under);
	const pipeMat = mat(C.pipe, { roughness: .5, metalness: .3 });
	const rooms = [[labels.customers, -2.3], [labels.bookings, 0], [labels.requests, 2.3]] as const;
	rooms.forEach(([name, x]) => {
		box(1.5, .75, .95, mat(C.night2, { roughness: .6 }), x, .5, -1.2, under, .06);
		box(1.5, .04, .96, glow(C.wire, .6), x, .9, -1.2, under, .01);
		label(name, 1.3, .32, { font: `600 120px "${bodyFont}"` }, under, x, .5, -.72);
		box(.05, .55, .05, pipeMat, x - .5, .2, -1.2, under, .02);
		box(.05, .55, .05, pipeMat, x + .5, .2, -1.2, under, .02);
	});
	const core = box(2.0, .8, 1.0, glow(C.wire, 1.4), 0, 2.15, .35, under, .1);
	label("ClassKit", 1.7, .34, { font: '500 130px "IBM Plex Mono"', fg: C.night, dir: "ltr" }, under, 0, 2.15, .86);
	const curves = rooms.map(([, x]) => new THREE.CatmullRomCurve3([new THREE.Vector3(x, .9, -1.2), new THREE.Vector3(x * .75, 1.35, -.7), new THREE.Vector3(x * .3, 1.6, .1), new THREE.Vector3(0, 1.75, .35)]));
	curves.forEach(c => { const t = new THREE.Mesh(new THREE.TubeGeometry(c, 48, .07, 10), pipeMat); t.castShadow = true; under.add(t); });
	// packets flowing into the core
	const packetCount = 27;
	const packets = new THREE.InstancedMesh(new THREE.SphereGeometry(.055, 10, 8), glow(C.wire, 3), packetCount);
	under.add(packets);
	const dummy = new THREE.Object3D();
	// the fault: on the requests line, where the site's sign lives
	const faultMat = glow(C.fault, 2.4);
	const fault = box(.34, .34, .34, faultMat, 2.6, .25, 1.55, under, .06);
	// agent drone + its path
	const agentCurve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 2.15, .95), new THREE.Vector3(1.2, 2.7, 1.6), new THREE.Vector3(2.9, 2.0, 2.0), new THREE.Vector3(3.0, 1.0, 1.7), new THREE.Vector3(2.6, .75, 1.55)]);
	const trail = new THREE.Mesh(new THREE.TubeGeometry(agentCurve, 80, .012, 6), new THREE.MeshBasicMaterial({ color: C.wire, transparent: true, opacity: .0, toneMapped: false }));
	under.add(trail);
	const agent = new THREE.Group(); under.add(agent);
	const agentBody = new THREE.Mesh(new THREE.SphereGeometry(.17, 24, 16), mat(C.paper, { roughness: .35 })); agentBody.castShadow = true; agent.add(agentBody);
	const ring = new THREE.Mesh(new THREE.TorusGeometry(.28, .025, 8, 40), glow(C.wire, 3)); ring.rotation.x = Math.PI / 2; agent.add(ring);
	const eye = new THREE.Mesh(new THREE.SphereGeometry(.05, 12, 10), glow(C.coral, 3)); eye.position.set(0, .02, .16); agent.add(eye);
	// deploy beam: core -> ground -> site
	const beam = new THREE.Mesh(new THREE.CylinderGeometry(.06, .06, 1.75, 16, 1, true), new THREE.MeshBasicMaterial({ color: C.wire, transparent: true, opacity: 0, toneMapped: false }));
	beam.position.set(0, .88, .35); under.add(beam);
	const sparks = new THREE.Points(new THREE.BufferGeometry().setAttribute("position", new THREE.Float32BufferAttribute(new Float32Array(60 * 3), 3)), new THREE.PointsMaterial({ color: C.wire, size: .06, transparent: true, opacity: 0, toneMapped: false }));
	sparks.position.copy(fault.position); under.add(sparks);
	const sparkDirs = Array.from({ length: 60 }, () => new THREE.Vector3().randomDirection().multiplyScalar(.6 + Math.random() * .8));


	const faultColor = new THREE.Color(C.fault), fixedColor = new THREE.Color(C.wire);
	function apply(frame: Timeline, t: number, pointerX: number, pointerY: number) {
		world.rotation.set(frame.angle, frame.twistY, frame.twistZ);
		world.scale.setScalar(frame.scale);
		pivot.position.set(0, frame.pivotY, 0);
		pivot.rotation.y = frame.pivotYaw + pointerX * .35;
		pivot.rotation.x = pointerY * .12;
		signPivot.rotation.z += (frame.signAngle - signPivot.rotation.z) * .08;
		for (let i = 0; i < packetCount; i++) {
			const curve = curves[i % 3], u = (t * (.22 + (i % 5) * .03) + i / packetCount) % 1;
			dummy.position.copy(curve.getPointAt(u)); dummy.updateMatrix(); packets.setMatrixAt(i, dummy.matrix);
		}
		packets.instanceMatrix.needsUpdate = true;
		core.material.emissiveIntensity = frame.coreLight;
		agent.position.copy(agentCurve.getPointAt(frame.agentProgress)); agent.position.y += frame.agentBob;
		ring.rotation.z = frame.ringAngle; agent.visible = frame.agentVisible;
		trail.material.opacity = frame.trailOpacity;
		faultMat.color.copy(frame.fixed ? fixedColor : faultColor); faultMat.emissive.copy(faultMat.color);
		fault.rotation.y = frame.faultAngle;
		sparks.material.opacity = frame.fixed ? 1 - frame.sparkProgress : 0;
		const positions = sparks.geometry.attributes.position;
		sparkDirs.forEach((d, i) => positions.setXYZ(i, d.x * frame.sparkProgress, d.y * frame.sparkProgress, d.z * frame.sparkProgress));
		positions.needsUpdate = true;
		beam.material.opacity = frame.beamOpacity;
		beam.scale.set(frame.beamScale, 1, frame.beamScale);
		windowMat.emissiveIntensity = frame.windowLight;
		people.forEach((person, i) => { person.position.y = frame.peopleY[i]; });
	}
	return { apply };
}

// Shared window/pipe materials and label textures are released once per resource.
export function disposeWorld(scene: THREE.Scene) {
	const geometries = new Set<THREE.BufferGeometry>();
	const materials = new Set<THREE.Material>();
	const textures = new Set<THREE.Texture>();
	scene.traverse(object => {
		if (object instanceof THREE.InstancedMesh) object.dispose();
		if (object instanceof THREE.Mesh || object instanceof THREE.Points) {
			geometries.add(object.geometry);
			for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
				materials.add(material);
				for (const value of Object.values(material)) if (value instanceof THREE.Texture) textures.add(value);
			}
		}
		if (object instanceof THREE.DirectionalLight) object.shadow.dispose();
	});
	textures.forEach(texture => texture.dispose());
	materials.forEach(material => material.dispose());
	geometries.forEach(geometry => geometry.dispose());
	scene.clear();
}
