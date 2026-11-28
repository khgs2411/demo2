import { useEffect, useRef, useState, type RefObject } from "react";
export { useInView } from "../../motion/use-in-view";

// Each delay is how long its frame remains on screen.
export function useFrames(delays: readonly number[], active: boolean, loop = false) {
	const [frame, setFrame] = useState(0);
	useEffect(() => {
		let current = 0;
		let timer: ReturnType<typeof setTimeout>;
		setFrame(0);
		if (!active) return;
		function advance() {
			timer = setTimeout(() => {
				current = (current + 1) % delays.length;
				setFrame(current);
				if (loop || current < delays.length - 1) advance();
			}, delays[current]);
		}
		advance();
		return () => clearTimeout(timer);
	}, [active, delays, loop]);
	return frame;
}

export function useSnippet(delays: readonly number[], animate: boolean) {
	const frame = useFrames(delays, animate);
	const finalFrame = delays.length - 1;
	return { frame: animate ? frame : finalFrame, playing: animate && frame < finalFrame };
}

export function localBounds(element: HTMLElement, host: HTMLElement) {
	const bounds = element.getBoundingClientRect(), parent = host.getBoundingClientRect();
	const scale = parent.width / host.offsetWidth;
	return {
		x: (bounds.left - parent.left) / scale,
		y: (bounds.top - parent.top) / scale,
		width: bounds.width / scale,
		height: bounds.height / scale,
	};
}

export function usePunchChad(
	card: RefObject<HTMLDivElement | null>, used: number, reduced: boolean, scene?: RefObject<HTMLDivElement | null>,
) {
	const previous = useRef(used);
	useEffect(() => {
		const element = card.current;
		const shouldPunch = used > previous.current;
		previous.current = used;
		if (reduced || !shouldPunch || !element) return;
		const hole = element.querySelectorAll<HTMLElement>(".holes i")[used - 1];
		const host = scene?.current ?? element;
		return animateChad(hole, host, "chad", 1100);
	}, [card, reduced, scene, used]);
}

export function animateChad(hole: HTMLElement, host: HTMLElement, className: string, duration: number) {
	const { x, y } = localBounds(hole, host);
	const chad = document.createElement("i");
	chad.className = className;
	chad.style.left = `${x}px`;
	chad.style.top = `${y}px`;
	host.append(chad);
	const dx = Math.random() * 30 - 15;
	const animation = chad.animate([
		{ transform: "translate(0,0) rotate(0)", opacity: 1 },
		{ transform: `translate(${dx}px, 26px) rotate(80deg) scaleY(.6)`, opacity: 1, offset: .55 },
		{ transform: `translate(${dx * 1.6}px, 90px) rotate(200deg) scaleY(.3)`, opacity: 0 },
	], { duration, easing: "cubic-bezier(.4,0,.9,.6)" });
	animation.onfinish = () => chad.remove();
	return () => { animation.cancel(); chad.remove(); };
}

export function useResultBar(sheet: RefObject<HTMLDivElement | null>, stage: RefObject<HTMLDivElement | null>) {
	const [shown, setShown] = useState(false);
	useEffect(() => {
		const sheetNode = sheet.current, stageNode = stage.current;
		if (!sheetNode || !stageNode || typeof IntersectionObserver === "undefined") return;
		let sheetVisible = false, stageVisible = false;
		const observer = new IntersectionObserver(entries => {
			for (const entry of entries) {
				if (entry.target === sheetNode) sheetVisible = entry.isIntersecting;
				else stageVisible = entry.isIntersecting;
			}
			setShown(sheetVisible && !stageVisible);
		});
		observer.observe(sheetNode);
		observer.observe(stageNode);
		return () => observer.disconnect();
	}, [sheet, stage]);
	return shown;
}
