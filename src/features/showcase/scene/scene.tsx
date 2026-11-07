import { useEffect, useRef, type RefObject } from "react";
import { useTranslation } from "react-i18next";
import { loadLabelFonts } from "./labels";
import { createScene } from "./renderer";
import { dampProgress, readProgress } from "./scroll";
import { timeline, type Timeline } from "./timeline";

export interface SceneProps {
	storyRef: RefObject<HTMLElement | null>;
	onFrame?: (progress: number, frame: Timeline) => void;
	onError?: (error: unknown) => void;
}

export default function Scene(props: SceneProps) {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const callbacks = useRef(props); callbacks.current = props;
	const { t, i18n } = useTranslation("showcase");
	const language = i18n.resolvedLanguage;
	const { storyRef } = props;
	useEffect(() => {
		const canvas = canvasRef.current;
		const story = storyRef.current;
		if (!canvas || !story) return;
		const direction = language === "he" ? "rtl" : "ltr";
		let cancelled = false, animation = 0, intersects = false;
		let view: ReturnType<typeof createScene> | undefined;
		let target = 0, progress = 0, mx = 0, my = 0, pmx = 0, pmy = 0;
		let previous = performance.now(), started = previous;
		const readScroll = () => { target = readProgress(story.getBoundingClientRect().top, story.offsetHeight, innerHeight); };
		const resize = () => { if (canvas.clientWidth && canvas.clientHeight) view?.resize(canvas.clientWidth, canvas.clientHeight); readScroll(); };
		const pointer = (event: PointerEvent) => {
			const rect = canvas.getBoundingClientRect();
			mx = (event.clientX - rect.left) / rect.width - .5; my = (event.clientY - rect.top) / rect.height - .5;
		};
		function frame(now: number) {
			if (cancelled || !view || !intersects || document.hidden) return;
			const dt = Math.min((now - previous) / 1000, .05), time = (now - started) / 1000;
			previous = now;
			progress = dampProgress(progress, target, dt);
			pmx += (mx - pmx) * .05; pmy += (my - pmy) * .05;
			const parameters = timeline(progress, time);
			view.render(parameters, time, dt, pmx, pmy);
			callbacks.current.onFrame?.(progress, parameters);
			animation = requestAnimationFrame(frame);
		}
		const visibility = () => {
			cancelAnimationFrame(animation);
			if (intersects && !document.hidden && view && !cancelled) {
				previous = performance.now(); animation = requestAnimationFrame(frame);
			}
		};
		const intersection = new IntersectionObserver(([entry]) => { intersects = entry.isIntersecting; visibility(); });
		const size = new ResizeObserver(resize);
		function dispose() {
			cancelled = true;
			cancelAnimationFrame(animation);
			intersection.disconnect(); size.disconnect();
			removeEventListener("scroll", readScroll); removeEventListener("resize", resize); removeEventListener("pointermove", pointer);
			document.removeEventListener("visibilitychange", visibility);
			canvas?.removeEventListener("webglcontextlost", contextLost);
			view?.dispose();
		}
		function contextLost(event: Event) {
			event.preventDefault(); dispose(); callbacks.current.onError?.(new Error("Scene WebGL context lost"));
		}
		async function start() {
			try {
				const labels = {
					studio: t("scene.studio"), open: t("scene.open"), customers: t("scene.customers"), bookings: t("scene.bookings"), requests: t("scene.requests"),
				};
				await loadLabelFonts(direction, labels);
				if (cancelled) return;
				view = createScene(canvas!, labels, direction);
				resize(); progress = target; started = previous = performance.now();
				addEventListener("scroll", readScroll, { passive: true }); addEventListener("resize", resize); addEventListener("pointermove", pointer);
				document.addEventListener("visibilitychange", visibility); canvas!.addEventListener("webglcontextlost", contextLost);
				size.observe(canvas!); intersection.observe(canvas!);
			} catch (error) {
				if (cancelled) return;
				dispose(); callbacks.current.onError?.(error);
			}
		}
		void start();
		return dispose;
	}, [language, storyRef, t]);
	return <canvas ref={canvasRef} aria-hidden="true" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block", touchAction: "pan-y" }} />;
}
