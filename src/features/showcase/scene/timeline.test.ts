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
	it("crossfades chapters without jumps over 0.05 at steps of 0.005", () => {
		for (let i = 1; i <= 200; i++) {
			const before = timeline((i - 1) * 0.005, 0).chapterOpacities;
			timeline(i * 0.005, 0).chapterOpacities.forEach((opacity, chapter) => {
				expect(opacity).toBeGreaterThanOrEqual(0);
				expect(opacity).toBeLessThanOrEqual(1);
				expect(Math.abs(opacity - before[chapter])).toBeLessThanOrEqual(0.05 + Number.EPSILON * 8);
			});
		}
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
