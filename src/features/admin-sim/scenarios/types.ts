import type { CSSProperties } from "react";
import type { SimStep } from "../machine";

export type SimulationSide = "top" | "under";
export type LogLine = { tone: "dim" | "ok" | "del" | "add" | ""; textKey: string };
export interface SimulationScenario {
	id: string;
	siteNameKey: string;
	bookingLabelKey: string;
	disclaimerKey: string;
	elapsedLabelKey: string;
	defect: { selector: string; descriptionKey: string; brokenStyle: CSSProperties; fixedStyle: CSSProperties };
	ticket: {
		id: string; number: string; type: "issue" | "feature_request";
		titleKey: string; descriptionKey: string;
		screenshot: { selector: string; altKey: string };
	};
	beats: Record<SimStep, { titleKey: string; bodyKey: string; nextKey: string; labelKey: string; side: SimulationSide }>;
	logs: { idle: readonly LogLine[]; inbox: readonly LogLine[]; agent: readonly LogLine[]; deploy: readonly LogLine[]; done: readonly LogLine[] };
	diff: { file: string; lines: readonly string[] };
	fixedRender: { bookingButtonFixed: boolean };
	timing: { characterMs: number; inboxLogMs: number; fixLineMs: number; deployLogMs: number; scanStartMs: number; scanDurationMs: number; stageFillMs: number; flightMs: number };
	deployStages: readonly { labelKey: string; startMs: number }[];
}
