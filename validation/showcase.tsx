import { Suspense, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { ShowcaseScene } from "../src/features/showcase/scene";
import { i18n } from "../src/i18n";
import "../src/index.css";

const query = new URLSearchParams(location.search);
const root = createRoot(document.getElementById("root")!);
const labels = { studio: "סטודיו נועה", open: "פתוח", customers: "לקוחות", bookings: "פגישות", requests: "בקשות" };

// CSS-pixel screenshots, just like a browser screenshot at the specified viewport.
function capture(canvas: HTMLCanvasElement, format = "image/png") {
	const image = document.createElement("canvas"); image.width = innerWidth; image.height = innerHeight;
	image.getContext("2d")!.drawImage(canvas, 0, 0, innerWidth, innerHeight);
	return image.toDataURL(format);
}

async function snapshot() {
	const { timeline } = await import("../src/features/showcase/scene/timeline");
	const { createScene } = await import("../src/features/showcase/scene/renderer");
	const { loadLabelFonts } = await import("../src/features/showcase/scene/labels");
	await loadLabelFonts("rtl", labels);
	const canvas = document.createElement("canvas"); document.body.append(canvas);
	const originalRandom = Math.random;
	let seed = 214;
	Math.random = () => ((seed = Math.imul(seed, 1664525) + 1013904223 >>> 0) / 4294967296);
	const view = createScene(canvas, labels, "rtl"); Math.random = originalRandom;
	view.resize(innerWidth, innerHeight);
	const p = Number(query.get("p")), frame = timeline(p, 0);
	// Settle the slowest relevant damping to less than half a CSS pixel.
	const steps = Math.ceil(Math.log(.5 / Math.max(innerWidth, innerHeight)) / Math.log(Math.max(.92, Math.pow(.02, 1 / 60))));
	for (let i = 0; i < steps; i++) view.render(frame, 0, 1 / 60);
	const image = capture(canvas, query.get("format") === "webp" ? "image/webp" : "image/png");
	const before = { ...view.renderer.info.memory, programs: view.renderer.info.programs?.length };
	view.dispose();
	const after = { ...view.renderer.info.memory, programs: view.renderer.info.programs?.length };
	parent.postMessage({ type: "scene-capture", image, before, after, console: (globalThis as any).__sceneConsole }, location.origin);
}

function Preview() {
	const storyRef = useRef<HTMLElement>(null);
	const [mounted, setMounted] = useState(false);
	const [error, setError] = useState("");
	const output = useRef<HTMLOutputElement>(null);
	return <>
		<section ref={storyRef} style={{ height: "360vh" }}>
			<div style={{ position: "sticky", top: 0, height: "100svh" }}>
				{mounted && <Suspense fallback={null}><ShowcaseScene storyRef={storyRef}
					onFrame={(p, frame) => {
						document.documentElement.style.setProperty("--n", String(frame.night));
						if (output.current) output.current.value = `p=${p.toFixed(4)} · ${frame.log}`;
					}}
					onError={reason => setError(String(reason))} /></Suspense>}
			</div>
		</section>
		<div aria-hidden="true" style={{ height: "100vh" }} />
		<div dir="ltr" style={{ position: "fixed", top: 8, left: 8, zIndex: 1, color: "#1a1814", background: "#f2eadb", padding: 12 }}>
			<button onClick={() => {
				const renderer = (globalThis as any).__sceneRenderer;
				if (mounted && renderer) {
					const before = { ...renderer.info.memory, programs: renderer.info.programs?.length };
					setMounted(false);
					requestAnimationFrame(() => {
						const after = { ...renderer.info.memory, programs: renderer.info.programs?.length };
						const result = { before, after, canvases: document.querySelectorAll("canvas").length };
						document.getElementById("inspection")!.textContent = JSON.stringify(result);
						void fetch("/__evidence/unmount.json", { method: "POST", body: JSON.stringify(result) });
					});
				} else setMounted(!mounted);
			}}>{mounted ? "Unmount scene" : "Mount scene"}</button>{" "}
			<button onClick={() => void i18n.changeLanguage(i18n.language === "he" ? "en" : "he")}>Switch language</button>{" "}
			{[0, .25, .5, .65, 1].map(p => <button key={p} onClick={() => window.scrollTo(0, p * (storyRef.current!.offsetHeight - innerHeight))}>p={p}</button>)}
			<p><output ref={output} /></p><p role="alert">{error}</p><p id="inspection" />
		</div>
	</>;
}

async function comparisons(button: HTMLButtonElement) {
	button.disabled = true;
	const report: unknown[] = [];
	for (const [width, height] of [[1440, 900], [375, 812]]) {
		for (const p of [0, .25, .5, .65, 1]) {
			for (const kind of ["mockup", "scene"]) {
				const iframe = document.createElement("iframe"); iframe.width = String(width); iframe.height = String(height);
				iframe.style.cssText = "position:absolute;top:150px;left:0;transform:scale(.45);transform-origin:top left;border:0";
				document.body.append(iframe);
				const result = await new Promise<any>((resolve, reject) => {
					const receive = (event: MessageEvent) => {
						if (event.origin !== location.origin || event.source !== iframe.contentWindow) return;
						if (event.data.type === "scene-capture") { removeEventListener("message", receive); resolve(event.data); }
						if (event.data.type === "scene-error") { removeEventListener("message", receive); reject(new Error(event.data.error)); }
					};
					addEventListener("message", receive);
					iframe.src = kind === "mockup" ? `/__mockup?p=${p}` : `/showcase-scene.html?mode=snapshot&p=${p}`;
				});
				const name = `${width}x${height}-p${p}-${kind}`;
				await fetch(`/__evidence/${name}.png`, { method: "POST", body: result.image.split(",")[1] });
				report.push({ name, before: result.before, after: result.after, console: result.console });
				iframe.remove();
				document.getElementById("status")!.textContent = `Captured ${report.length}/20: ${name}`;
			}
		}
	}
	await fetch("/__evidence/captures.json", { method: "POST", body: JSON.stringify(report, null, 2) });
	document.getElementById("status")!.textContent = "Captured all 20 scene screenshots. Resource results saved.";
}

async function exportPosters(button: HTMLButtonElement) {
	button.disabled = true;
	for (const [side, p] of [["topside", 0], ["underside", .5]] as const) {
		const iframe = document.createElement("iframe"); iframe.width = "1440"; iframe.height = "900";
		iframe.style.cssText = "position:absolute;top:150px;left:0;transform:scale(.45);transform-origin:top left;border:0";
		document.body.append(iframe);
		try {
			const image = await new Promise<string>((resolve, reject) => {
				const receive = (event: MessageEvent) => {
					if (event.origin !== location.origin || event.source !== iframe.contentWindow) return;
					if (event.data.type === "scene-capture") { removeEventListener("message", receive); resolve(event.data.image); }
					if (event.data.type === "scene-error") { removeEventListener("message", receive); reject(new Error(event.data.error)); }
				};
				addEventListener("message", receive);
				iframe.src = `/showcase-scene.html?mode=snapshot&p=${p}&format=webp`;
			});
			if (!image.startsWith("data:image/webp;base64,")) throw new Error("Browser did not export WebP");
			const response = await fetch(`/__posters/poster-${side}.webp`, { method: "POST", body: image.split(",")[1] });
			if (!response.ok) throw new Error(`Poster save failed: ${response.status}`);
		} finally { iframe.remove(); }
	}
	document.getElementById("status")!.textContent = "Exported public/poster-topside.webp and public/poster-underside.webp from the scene. Reload the home fallback to inspect.";
}

addEventListener("error", event => {
	parent.postMessage({ type: "scene-error", error: event.message }, location.origin);
});
addEventListener("unhandledrejection", event => {
	parent.postMessage({ type: "scene-error", error: String(event.reason) }, location.origin);
	const output = document.getElementById("status"); if (output) output.textContent = String(event.reason);
});

if (query.get("mode") === "snapshot") void snapshot();
else if (query.get("mode") === "posters") root.render(<main dir="ltr" style={{ padding: 16 }}>
	<button onClick={event => void exportPosters(event.currentTarget)}>Export fallback posters</button><p id="status">Ready · writes the two WebP assets into public/</p>
</main>);
else if (query.get("mode") === "compare") root.render(<main dir="ltr" style={{ padding: 16 }}>
	<button onClick={event => void comparisons(event.currentTarget)}>Capture all comparisons</button><p id="status">Ready</p>
</main>);
else root.render(<Preview />);
