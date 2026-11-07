import type { Variants } from "framer-motion";
import { useReducedMotion } from "./use-reduced-motion";

// Timing and easing tokens from the mockup's link, ticket and mark transitions.
const tokens = { reveal: .35, stagger: .3, countUp: .6, ease: [.65, 0, .35, 1] as const };

export function createMotionVariants(reduced: boolean) {
	const instant = { duration: 0, delay: 0, staggerChildren: 0, delayChildren: 0 };
	const revealEnd = { opacity: 1, y: 0, transition: reduced ? instant : { duration: tokens.reveal, ease: tokens.ease } };
	const countEnd = { "--count": 1, transition: reduced ? instant : { duration: tokens.countUp, ease: tokens.ease } };
	const staggerEnd = { transition: reduced ? instant : { staggerChildren: tokens.stagger } };
	return {
		reveal: { hidden: reduced ? revealEnd : { opacity: 0, y: 16 }, visible: revealEnd },
		stagger: { hidden: reduced ? staggerEnd : {}, visible: staggerEnd },
		countUp: { hidden: reduced ? countEnd : { "--count": 0 }, visible: countEnd },
	} satisfies Record<string, Variants>;
}

export function useMotionVariants() {
	return createMotionVariants(useReducedMotion());
}
