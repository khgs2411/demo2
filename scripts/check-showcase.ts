import { build, createServer } from "vite";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

// Isolated browser fixture: no product route, SDK calls, or production settings.
// bun scripts/check-showcase.ts /absolute/path/to/approved/mockups/shell.html
const referencePath = process.argv[2];
if (!referencePath) throw new Error("Pass the approved shell.html path");
const evidence = resolve("artifacts/showcase");
await mkdir(evidence, { recursive: true });
const reference = await readFile(referencePath, "utf8");
const diagnostics = `<script>
window.__sceneConsole = [];
for (const level of ['warn', 'error']) {
 const original = console[level];
 console[level] = (...args) => { window.__sceneConsole.push({level, message: args.map(String).join(' ')}); original(...args); };
}
for (const name of ['error', 'unhandledrejection']) addEventListener(name, event => {
 if (parent !== window) parent.postMessage({type: 'scene-error', error: String(event.message || event.reason)}, location.origin);
});
</script>`;

if (process.argv.includes("--build")) {
	await build({
		build: {
			outDir: "/tmp/demo2-showcase-validation-build", manifest: true,
			rollupOptions: { input: { app: resolve("index.html"), validation: resolve("showcase-scene.html") } },
		},
	});
	const directory = "/tmp/demo2-showcase-validation-build";
	const manifest = JSON.parse(await readFile(`${directory}/.vite/manifest.json`, "utf8"));
	function staticImports(key: string): Set<string> {
		const keys = new Set([key]);
		for (const imported of manifest[key].imports ?? []) for (const nested of staticImports(imported)) keys.add(nested);
		return keys;
	}
	const entries: Record<string, string[]> = {};
	for (const entry of ["index.html", "showcase-scene.html"]) {
		const files = [...staticImports(entry)].map(key => manifest[key].file as string);
		for (const file of files) {
			if ((await readFile(`${directory}/${file}`, "utf8")).includes("WebGLRenderer")) throw new Error(`Three.js leaked into ${entry}'s static imports`);
		}
		entries[entry] = files;
	}
	const scene = manifest["src/features/showcase/scene/scene.tsx"];
	if (!scene?.isDynamicEntry) throw new Error("Scene is not a dynamic entry");
	const proof = {
		scope: "Isolated validation entry plus the unchanged production home placeholder; task 11 owns home assembly",
		threeExcludedFromStaticImports: true, entries, scene: scene.file,
	};
	await writeFile(resolve(evidence, "build.json"), JSON.stringify(proof, null, 2) + "\n");
	console.log(JSON.stringify(proof, null, 2));
	process.exit(0);
}

const server = await createServer({
	server: { host: "127.0.0.1", port: 0 },
	plugins: [{
		name: "showcase-validation",
		enforce: "pre",
		transform(code, id) {
			// Inspection exists only on this local server, never in production source.
			if (id.endsWith("/scene/renderer.ts")) return code.replace("const scene = new THREE.Scene();", "(globalThis as any).__sceneRenderer = renderer; const scene = new THREE.Scene();");
		},
		transformIndexHtml(html) { return html.replace("<head>", `<head>${diagnostics}`); },
		configureServer(vite) {
			vite.middlewares.use(async (req, res, next) => {
				const url = new URL(req.url!, "http://localhost");
				if (req.method === "POST" && /^\/__evidence\/[\w.-]+\.(png|json)$/.test(url.pathname)) {
					const chunks: Buffer[] = []; for await (const chunk of req) chunks.push(Buffer.from(chunk));
					const body = Buffer.concat(chunks).toString();
					await writeFile(resolve(evidence, url.pathname.split("/").at(-1)!), url.pathname.endsWith(".png") ? Buffer.from(body, "base64") : body);
					res.end("saved"); return;
				}
				if (url.pathname !== "/__mockup") { next(); return; }
				// Only the capture clock/progress, seeded spark randomness and font/import
				// locations change. Geometry, palette, frame formulas and offsets stay intact.
				let html = reference
					.replace(/<link rel="preconnect"[^>]*>/g, "")
					.replace(/<link href="https:\/\/fonts.googleapis.com[^>]*>/, '<link rel="stylesheet" href="/src/index.css">')
					.replaceAll("https://cdn.jsdelivr.net/npm/three@0.164.1/build/three.module.js", "/node_modules/three/build/three.module.js")
					.replaceAll("https://cdn.jsdelivr.net/npm/three@0.164.1/examples/jsm/", "/node_modules/three/examples/jsm/")
					.replace("<head>", `<head>${diagnostics}`)
					.replace("const root = document.documentElement;", `
const originalRandom = Math.random; let seed = 214;
Math.random = () => ((seed = Math.imul(seed, 1664525) + 1013904223 >>> 0) / 4294967296);
const root = document.documentElement;`)
					.replace("/* ---------- layout ---------- */", "Math.random = originalRandom; /* ---------- layout ---------- */")
					.replace("requestAnimationFrame(frame);", "")
					.replace("const dt = Math.min(clock.getDelta(), .05), t = clock.elapsedTime;", "const dt = 1 / 60, t = 0;")
					.replace("const p = prog;", `const p = ${Number(url.searchParams.get("p"))};`)
					.replace("\nframe();", `
const steps = Math.ceil(Math.log(.5 / Math.max(innerWidth, innerHeight)) / Math.log(Math.max(.92, Math.pow(.02, 1 / 60))));
for (let i = 0; i < steps; i++) frame();
const image = document.createElement('canvas'); image.width = innerWidth; image.height = innerHeight;
image.getContext('2d').drawImage(canvas, 0, 0, innerWidth, innerHeight);
parent.postMessage({type: 'scene-capture', image: image.toDataURL('image/png'), console: window.__sceneConsole}, location.origin);`);
				res.setHeader("Content-Type", "text/html"); res.end(html);
			});
		},
	}],
});
await server.listen();
server.printUrls();
