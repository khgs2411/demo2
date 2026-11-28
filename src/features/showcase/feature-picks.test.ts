import { expect, it } from "vitest";
import { featureOrder, updatePicks } from "./feature-picks";

it.each([
	["cards", "book"], ["rules", "book"], ["sched", "book"], ["change", "app"],
] as const)("adds the prerequisite before %s", (feature, prerequisite) => {
	expect(updatePicks([], { type: "toggle", feature })).toEqual([prerequisite, feature]);
});

it("removes every dependent and preserves the recency of remaining picks", () => {
	const picks = updatePicks(["book", "cards", "app", "rules", "sched", "change"], { type: "toggle", feature: "book" });
	expect(picks).toEqual(["app", "change"]);
	expect(updatePicks(picks, { type: "toggle", feature: "app" })).toEqual([]);
});

it("leaves prerequisites picked when only a dependent is removed", () => {
	expect(updatePicks(["book", "cards", "rules"], { type: "toggle", feature: "rules" })).toEqual(["book", "cards"]);
});

it("adds missing features in sheet order without changing existing recency", () => {
	const all = updatePicks(["app"], { type: "addAll" });
	expect(all).toEqual(["app", "book", "cards", "rules", "sched", "change"]);
	expect(updatePicks(all, { type: "addAll" })).toEqual(all);
	expect(updatePicks([], { type: "addAll" })).toEqual(featureOrder);
	expect(updatePicks(all, { type: "reset" })).toEqual([]);
});
