import { expect, it } from "vitest";
import { dampProgress, readProgress } from "./scroll";

it("reaches the same scroll progress after one second at 30 and 120fps", () => {
	const advance = (fps: number) => {
		let p = 0;
		for (let i = 0; i < fps; i++) p = dampProgress(p, 1, 1 / fps);
		return p;
	};
	expect(advance(30)).toBeCloseTo(advance(120), 12);
	expect(advance(30)).toBeCloseTo(0.9991, 12);
});

it("reads and clamps the story's scrollable span", () => {
	expect(readProgress(0, 3600, 900)).toBe(0);
	expect(readProgress(-1350, 3600, 900)).toBe(0.5);
	expect(readProgress(-3000, 3600, 900)).toBe(1);
	expect(readProgress(100, 3600, 900)).toBe(0);
	expect(readProgress(0, 900, 900)).toBe(0);
});
