export const clamp = (value: number) => Math.min(1, Math.max(0, value));

// The mockup's exponential damping, with elapsed seconds rather than frame count.
export function dampProgress(current: number, target: number, dt: number) {
	return current + (target - current) * (1 - Math.pow(0.0009, dt));
}

export function readProgress(top: number, storyHeight: number, viewportHeight: number) {
	const total = storyHeight - viewportHeight;
	return total > 0 ? clamp(-top / total) : 0;
}
