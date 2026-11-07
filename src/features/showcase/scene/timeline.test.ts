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
	it("never shows two chapters at any sampled progress", () => {
		for (let i = 0; i <= 200; i++) {
			expect(timeline(i * 0.005, 0).chapterOpacities.filter(opacity => opacity > 0).length).toBeLessThanOrEqual(1);
		}
		expect(timeline(0.5, 0).chapterOpacities[2]).toBeGreaterThan(0);
		expect(timeline(0.5, 0).chapterOpacities[3]).toBe(0);
	});
	it("uses the approved plateau windows and 0.035 fades", () => {
		for (const [chapter, start, end] of [[1, .13, .35], [2, .38, .52], [3, .55, .78]]) {
			expect(timeline(start, 0).chapterOpacities[chapter]).toBe(0);
			expect(timeline(end, 0).chapterOpacities[chapter]).toBe(0);
			expect(timeline(start + .035 / 2, 0).chapterOpacities[chapter]).toBeCloseTo(.5);
			expect(timeline((start + end) / 2, 0).chapterOpacities[chapter]).toBe(1);
			expect(timeline(end - .035 / 2, 0).chapterOpacities[chapter]).toBeCloseTo(.5);
		}
		expect(timeline(.065, 0).chapterOpacities[0]).toBe(1);
		expect(timeline(.1, 0).chapterOpacities[0]).toBe(0);
		expect(timeline(.82, 0).chapterOpacities[4]).toBe(0);
		expect(timeline(.855, 0).chapterOpacities[4]).toBeCloseTo(1);
	});
	it("switches the camera lead at gap midpoints, including fully empty frames", () => {
		const midpoints = [.115, .365, .535, .8];
		const anchors = ["top", "start", "end", "bottom", "top"];
		midpoints.forEach((p, index) => {
			expect(timeline(p, 0).chapterOpacities).toEqual([0, 0, 0, 0, 0]);
			expect(timeline(p - Number.EPSILON, 0).lead).toBe(index);
			expect(timeline(p - Number.EPSILON, 0).anchor).toBe(anchors[index]);
			expect(timeline(p, 0).lead).toBe(index + 1);
			expect(timeline(p, 0).anchor).toBe(anchors[index + 1]);
		});
	});
	it("keeps the mockup camera distances and mirrored anchor offsets", () => {
		const rtl = getCameraLayout(1440, 900, "rtl");
		expect(rtl.distance).toBe(17);
		expect(rtl.room).toEqual({ top: [0, -0.15], bottom: [0, 0.13], start: [0.19, 0], end: [-0.19, 0] });
		expect(getCameraLayout(1440, 900, "ltr").room.start).toEqual([-0.19, 0]);
		const phone = getCameraLayout(375, 812, "rtl");
		expect(phone.distance).toBe(14 + (812 / 375) * 6);
		expect(phone.room.start).toEqual(phone.room.top);
		expect(phone.room.end).toEqual(phone.room.top);
	});
});
