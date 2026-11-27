import { describe, expect, it } from "vitest";
import { getCameraLayout, timeline } from "./timeline";

describe("the approved diorama timeline", () => {
	it("starts topside with the crooked sign and unlit windows", () => {
		const frame = timeline(0, 0);
		expect(frame.angle).toBe(0);
		expect(frame.night).toBe(0);
		expect(frame.signAngle).toBe(-0.38);
		expect(frame.windowLight).toBe(0);
		expect(frame.chapterOpacities).toEqual([1, 0, 0, 0, 0]);
		expect(frame.log).toBe("agent ▸ idle");
	});
	it("reveals the underside and sends the agent to the fault", () => {
		const frame = timeline(0.5, 0);
		expect(frame.angle).toBe(Math.PI);
		expect(frame.night).toBe(1);
		expect(frame.agentProgress).toBeGreaterThan(0);
		expect(frame.agentProgress).toBeLessThan(1);
		expect(frame.fixed).toBe(false);
		expect(frame.log).toBe("agent ▸ fixing: sign mount");
	});
	it("ships the repair before returning to a lit topside", () => {
		expect(timeline(0.65, 0).log).toBe("deploy ▸ shipping");
		expect(timeline(0.65, 0).beamOpacity).toBeGreaterThan(0);
		const frame = timeline(1, 0);
		expect(frame.angle).toBe(Math.PI * 2);
		expect(frame.night).toBeCloseTo(0);
		expect(frame.signAngle).toBe(0);
		expect(frame.windowLight).toBe(1.4);
		expect(frame.chapterOpacities).toEqual([0, 0, 0, 0, 1]);
		expect(frame.log).toBe("deploy ✓ live");
	});
	it("keeps the 0.035 fades continuous at steps of 0.005", () => {
		for (let i = 1; i <= 200; i++) {
			const before = timeline((i - 1) * 0.005, 0).chapterOpacities;
			timeline(i * 0.005, 0).chapterOpacities.forEach((opacity, chapter) => {
				expect(opacity).toBeGreaterThanOrEqual(0);
				expect(opacity).toBeLessThanOrEqual(1);
				expect(Math.abs(opacity - before[chapter])).toBeLessThanOrEqual(0.005 / 0.035 + Number.EPSILON * 8);
			});
		}
	});
	it("keeps at least one chapter at half opacity throughout the showcase", () => {
		for (let i = 0; i <= 200; i++) {
			const progress = i * 0.005;
			expect(Math.max(...timeline(progress, 0).chapterOpacities), `progress ${progress}`).toBeGreaterThanOrEqual(0.5);
		}
	});
	it("only shows adjacent chapters together during a crossfade", () => {
		for (let i = 0; i <= 200; i++) {
			const opacities = timeline(i * 0.005, 0).chapterOpacities;
			const firstVisible = opacities.findIndex(opacity => opacity > 0);
			const lastVisible = opacities.findLastIndex(opacity => opacity > 0);
			expect(lastVisible - firstVisible).toBeLessThanOrEqual(1);
		}
		expect(timeline(0.5, 0).chapterOpacities[2]).toBeGreaterThan(0);
		expect(timeline(0.5, 0).chapterOpacities[3]).toBe(0);
	});
	it("crossfades over 0.035 and reaches full opacity between transitions", () => {
		for (const [chapter, crossover] of [.115, .365, .535, .8].entries()) {
			const before = timeline(crossover - .035 / 2, 0).chapterOpacities;
			const after = timeline(crossover + .035 / 2, 0).chapterOpacities;
			expect(before[chapter]).toBeCloseTo(1);
			expect(before[chapter + 1]).toBeCloseTo(0);
			expect(after[chapter]).toBeCloseTo(0);
			expect(after[chapter + 1]).toBeCloseTo(1);
		}
	});
	it("switches the camera lead to the incoming chapter at each crossover", () => {
		const midpoints = [.115, .365, .535, .8];
		const anchors = ["top", "start", "end", "bottom", "top"];
		midpoints.forEach((p, index) => {
			const atCrossover = [0, 0, 0, 0, 0];
			atCrossover[index] = atCrossover[index + 1] = 0.5;
			expect(timeline(p, 0).chapterOpacities).toEqual(atCrossover);
			expect(timeline(p - Number.EPSILON, 0).lead).toBe(index);
			expect(timeline(p - Number.EPSILON, 0).anchor).toBe(anchors[index]);
			expect(timeline(p, 0).lead).toBe(index + 1);
			expect(timeline(p, 0).anchor).toBe(anchors[index + 1]);
		});
	});
	it("keeps the side-camera distance, mirrored anchors and mobile framing", () => {
		const rtl = getCameraLayout(1440, 900, "rtl");
		expect(rtl.distance).toBe(17);
		expect(rtl.room).toEqual({ top: [0, -0.28], bottom: [0, 0.13], start: [0.19, 0], end: [-0.19, 0] });
		expect(getCameraLayout(1440, 900, "ltr").room.start).toEqual([-0.19, 0]);
		const phone = getCameraLayout(375, 812, "rtl");
		expect(phone.distance).toBe(14 + (812 / 375) * 6);
		expect(phone.room.start).toEqual(phone.room.top);
		expect(phone.room.end).toEqual(phone.room.top);
		expect(phone.room.top).toEqual([0, -0.2]);
		expect(phone.topDistance).toBe(phone.distance);
	});
	it.each([[1280, 800], [1440, 900]])("reserves room above the storefront at %sx%s", (width, height) => {
		const layout = getCameraLayout(width, height, "rtl");
		expect(layout.room.top).toEqual([0, -0.28]);
		expect(layout.topDistance).toBe(20);
		expect(layout.distance).toBe(17);
	});
});
