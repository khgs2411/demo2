import { clamp } from "./scroll";

// Ported from the approved shell.html frame(), including its exact beat ranges.
export const ranges = {
	flipDown: [0.1, 0.34], agent: [0.38, 0.64], beam: [0.64, 0.72], flipUp: [0.74, 0.94],
} as const;
export const chapterAnchors = ["top", "start", "end", "bottom", "top"] as const;
export const segment = (p: number, a: number, b: number) => clamp((p - a) / (b - a));
const ease = (t: number) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
// Center the existing fade duration on the original camera lead switches.
const chapterFade = .035;
const chapterCrossovers = [.115, .365, .535, .8];

export function timeline(p: number, t: number) {
	const angle = (ease(segment(p, ...ranges.flipDown)) + ease(segment(p, ...ranges.flipUp))) * Math.PI;
	const nRaw = Math.abs(Math.sin(angle / 2));
	const night = nRaw * nRaw * (3 - 2 * nRaw);
	const turning = Math.abs(Math.sin(angle));
	const a = segment(p, ...ranges.agent);
	const b = segment(p, ...ranges.beam);
	const fixed = a >= 0.985;
	const lit = segment(p, ranges.beam[1], ranges.flipUp[1]);
	const [flip, system, agent, book] = chapterCrossovers.map(crossover => clamp(.5 + (p - crossover) / chapterFade));
	const chapterOpacities = [1 - flip, flip - system, system - agent, agent - book, book];
	const lead = chapterCrossovers.findLastIndex(crossover => p >= crossover) + 1;
	return {
		angle, night, turning,
		twistY: Math.sin(angle) * 0.55,
		twistZ: Math.sin(angle) * 0.32 * (p < 0.7 ? 1 : -1),
		scale: 1 - turning * 0.06,
		pivotY: Math.sin(t * 0.8) * 0.06,
		pivotYaw: -0.42 + Math.sin(t * 0.25) * 0.03,
		cameraY: 4.6 - night * 0.6 + turning * 1.5,
		cameraDolly: night * 0.9 - turning * 3.2,
		cameraLookY: 0.7 + night * 0.6,
		hemisphereIntensity: 1.4 - night,
		sunIntensity: 2.6 - night * 2.1,
		rimIntensity: night * 6,
		bloomStrength: 0.08 + night * 0.62,
		fixed,
		signAngle: (fixed ? 0 : -0.38) + Math.sin(t * 1.6) * (fixed ? 0 : 0.03),
		agentProgress: ease(a),
		agentBob: Math.sin(t * 4) * 0.04,
		agentVisible: a > 0 && a < 1 || a >= 1 && b < 1,
		ringAngle: t * 3,
		trailOpacity: a > 0 ? 0.55 * (1 - b) : 0,
		faultAngle: t * (fixed ? 0.5 : 2),
		coreLight: 0.9 + Math.sin(t * 3) * 0.12 + Math.sin(b * Math.PI) * 0.6,
		sparkProgress: segment(p, ranges.agent[1] - 0.005, ranges.beam[1]),
		beamOpacity: b > 0 ? Math.sin(b * Math.PI) * 0.6 : 0,
		beamScale: 1 + b * 2,
		windowLight: lit * 1.4,
		peopleY: [0, 1, 2].map(i => lit > 0.9 ? Math.abs(Math.sin(t * 5 + i)) * 0.12 : 0),
		chapterOpacities, lead,
		anchor: chapterAnchors[lead],
		log: a === 0 ? "agent ▸ idle" : a < 0.35 ? "ticket #214 ▸ claimed" : a < 0.985 ? "agent ▸ fixing: sign mount" : b < 1 ? "deploy ▸ shipping" : "deploy ✓ live",
	};
}

export type Timeline = ReturnType<typeof timeline>;

export function getCameraLayout(width: number, height: number, direction: "rtl" | "ltr") {
	const side = direction === "rtl" ? 1 : -1;
	const desktop = width >= 900;
	const distance = desktop ? 17 : 14 + (height / width) * 6;
	const room: Record<typeof chapterAnchors[number], [number, number]> = desktop
		? { top: [0, -0.28], bottom: [0, 0.13], start: [0.19 * side, 0], end: [-0.19 * side, 0] }
		: { top: [0, -0.2], bottom: [0, 0.12], start: [0, -0.2], end: [0, -0.2] };
	return { distance, topDistance: desktop ? 20 : distance, room };
}
