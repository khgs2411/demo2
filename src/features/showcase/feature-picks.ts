export const featureOrder = ["book", "cards", "rules", "sched", "app", "change"] as const;
export type Feature = typeof featureOrder[number];

const prerequisites: Partial<Record<Feature, Feature>> = {
	cards: "book",
	rules: "book",
	sched: "book",
	change: "app",
};

type PicksEvent = { type: "toggle"; feature: Feature } | { type: "addAll" } | { type: "reset" };

// Pick order also records recency for the pass.
export function updatePicks(picks: readonly Feature[], event: PicksEvent): readonly Feature[] {
	switch (event.type) {
		case "reset": return [];
		case "addAll": return [...picks, ...featureOrder.filter(feature => !picks.includes(feature))];
		case "toggle": {
			const { feature } = event;
			if (picks.includes(feature)) {
				return picks.filter(pick => pick !== feature && prerequisites[pick] !== feature);
			}
			const need = prerequisites[feature];
			return need && !picks.includes(need) ? [...picks, need, feature] : [...picks, feature];
		}
	}
}
