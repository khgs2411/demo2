import { useEffect, useRef, useState, type RefObject } from "react";

export function useInView<T extends HTMLElement>(reduced: boolean) {
	const ref = useRef<T>(null);
	const [seen, setSeen] = useState(false);
	useEffect(() => {
		const element = ref.current;
		if (reduced || seen || !element) return;
		const observer = new IntersectionObserver(entries => {
			if (entries.some(entry => entry.isIntersecting)) {
				observer.disconnect();
				setSeen(true);
			}
		}, { threshold: .45 });
		observer.observe(element);
		return () => observer.disconnect();
	}, [reduced, seen]);
	return { ref, seen };
}

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

export function useSnippet<T extends HTMLElement>(delays: readonly number[], reduced: boolean) {
	const { ref, seen } = useInView<T>(reduced);
	const frame = useFrames(delays, seen && !reduced);
	const finalFrame = delays.length - 1;
	return { ref, frame: reduced ? finalFrame : frame, playing: seen && !reduced && frame < finalFrame };
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
		const { x, y } = localBounds(hole, host);
		const chad = document.createElement("i");
		chad.className = "chad";
		chad.style.left = `${x}px`;
		chad.style.top = `${y}px`;
		host.append(chad);
		const dx = Math.random() * 30 - 15;
		const animation = chad.animate([
			{ transform: "translate(0,0) rotate(0)", opacity: 1 },
			{ transform: `translate(${dx}px, 26px) rotate(80deg) scaleY(.6)`, opacity: 1, offset: .55 },
			{ transform: `translate(${dx * 1.6}px, 90px) rotate(200deg) scaleY(.3)`, opacity: 0 },
		], { duration: 1100, easing: "cubic-bezier(.4,0,.9,.6)" });
		animation.onfinish = () => chad.remove();
		return () => { animation.cancel(); chad.remove(); };
	}, [card, reduced, scene, used]);
}
