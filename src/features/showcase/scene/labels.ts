import * as THREE from "three";

export interface SceneLabels {
	studio: string;
	open: string;
	customers: string;
	bookings: string;
	requests: string;
}

export async function loadLabelFonts(direction: "rtl" | "ltr", labels: SceneLabels) {
	await Promise.all([
		document.fonts.load('900 64px "Frank Ruhl Libre"', labels.studio),
		document.fonts.load(`600 64px "${direction === "rtl" ? "IBM Plex Sans Hebrew" : "IBM Plex Sans"}"`, [labels.open, labels.customers, labels.bookings, labels.requests].join(" ")),
		document.fonts.load('500 64px "IBM Plex Mono"', "ClassKit"),
	]);
}

interface LabelOptions {
	w?: number;
	h?: number;
	font?: string;
	fg?: string;
	bg?: string | null;
	dir?: "rtl" | "ltr";
}

// Same texture resolution, baseline, color space and anisotropy as the mockup.
function textTexture(text: string, { w = 1024, h = 256, font = '600 120px "IBM Plex Sans Hebrew"', fg = "#f2eadb", bg = null, dir = "rtl" }: LabelOptions = {}) {
	const canvas = document.createElement("canvas"); canvas.width = w; canvas.height = h;
	const context = canvas.getContext("2d");
	if (!context) throw new Error("Scene label canvas is unavailable");
	if (bg) { context.fillStyle = bg; context.fillRect(0, 0, w, h); }
	context.fillStyle = fg; context.font = font; context.textAlign = "center"; context.textBaseline = "middle"; context.direction = dir;
	context.fillText(text, w / 2, h / 2 + 6);
	const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = 8;
	return texture;
}

export function makeLabel(text: string, w: number, h: number, options: LabelOptions, parent: THREE.Object3D, x: number, y: number, z: number) {
	const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: textTexture(text, options), transparent: true, toneMapped: false }));
	mesh.position.set(x, y, z); parent.add(mesh); return mesh;
}
