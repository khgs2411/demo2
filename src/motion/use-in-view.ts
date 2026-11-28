import { useEffect, useRef, useState } from "react";

// Reports once that the element came into view; reduced motion never observes.
export function useInView<T extends HTMLElement>(reduced: boolean, threshold = .45) {
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
		}, { threshold });
		observer.observe(element);
		return () => observer.disconnect();
	}, [reduced, seen, threshold]);
	return { ref, seen };
}
