import { useEffect, useReducer, useRef, type ReactNode } from "react";
import { FeatureResult } from "./feature-result";
import { featureOrder, updatePicks, type Feature } from "./feature-picks";
import { AppSnippet, BookingSnippet, CardSnippet, ChangeSnippet, RulesSnippet, ScheduleSnippet } from "./feature-snippets";
import { animateChad, useFrames, useInView } from "./home-motion";
import type { HomeCopy } from "./home-scenes";

const hintDelays = [1400, 0];

function Tile({ feature, copy, picked, reduced, hint, toggle, children }: {
	feature: Feature;
	copy: HomeCopy;
	picked: boolean;
	reduced: boolean;
	hint: boolean;
	toggle: () => void;
	children: ReactNode;
}) {
	const tile = useRef<HTMLDivElement>(null);
	const hole = useRef<HTMLElement>(null);
	useEffect(() => {
		if (picked && !reduced && tile.current && hole.current) {
			return animateChad(hole.current, tile.current, "chad pick-chad", 1000);
		}
	}, [picked, reduced]);

	const [title, description] = copy.tiles[feature];
	const titleId = `get-${feature}`;
	return <div ref={tile} className={`tile c-${feature}${picked ? " on" : ""}`}>
		<button className="tile-toggle" type="button" aria-pressed={picked} aria-labelledby={titleId} onClick={toggle}>
			<span className={hint ? "pick hint" : "pick"} aria-hidden="true"><i ref={hole} />{picked ? copy.build.added : copy.build.add}</span>
		</button>
		<div><h3 id={titleId}>{title}</h3><p>{description}</p>
			{feature === "change" && <div className="incl">{copy.tiles.change[2]}</div>}
		</div>
		{children}
	</div>;
}

const snippets = {
	book: BookingSnippet,
	cards: CardSnippet,
	rules: RulesSnippet,
	sched: ScheduleSnippet,
	app: AppSnippet,
	change: ChangeSnippet,
};

export function FeatureSheet({ copy, reduced, english }: { copy: HomeCopy; reduced: boolean; english: boolean }) {
	const [picks, dispatch] = useReducer(updatePicks, []);
	const touched = useRef(false);
	const { ref: sheet, seen } = useInView<HTMLDivElement>(reduced, .3);
	const hint = useFrames(hintDelays, seen && !reduced) > 0;
	const build = copy.build;
	const [siteTitle, siteDescription] = copy.tiles.site;
	return <section className="get" id="get" aria-labelledby="get-heading"><div className="wrap">
		<h2 className="lead" id="get-heading">{copy.getSub[0]} <span>{copy.getSub[1]}</span></h2>
		<div className="build"><div className="picker">
			<div className="pickbar"><p>{build.pick}</p><div className="pick-acts">
				<button type="button" className="linkbtn" onClick={() => { touched.current = true; dispatch({ type: "addAll" }); }}>{build.all}</button>
				<button type="button" className="linkbtn" onClick={() => { touched.current = true; dispatch({ type: "reset" }); }}>{build.reset}</button>
			</div></div>
			<div className="sheet" ref={sheet}><div className="cells">
				<div className="tile c-site on">
					<span className="pick"><i aria-hidden="true" />{build.base}</span>
					<h3>{siteTitle}</h3>
					<div className="site-row"><p>{siteDescription}</p><div className="langs">
						{copy.langs.map((language, i) => <span key={language} className={i === Number(english) ? "on" : undefined}>{language}</span>)}
					</div></div>
				</div>
				{featureOrder.map(feature => {
					const picked = picks.includes(feature);
					const Snippet = snippets[feature];
					return <Tile key={feature} feature={feature} copy={copy} picked={picked} reduced={reduced} hint={feature === "book" && hint && !reduced && !touched.current}
						toggle={() => { touched.current = true; dispatch({ type: "toggle", feature }); }}>
						<Snippet copy={copy} animate={picked && !reduced} />
					</Tile>;
				})}
			</div></div>
		</div><FeatureResult copy={copy} picks={picks} reduced={reduced} sheet={sheet} /></div>
	</div></section>;
}
