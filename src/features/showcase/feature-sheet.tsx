import { useMemo, type ReactNode } from "react";
import { BookingRows, PunchCard, StudioLandscape, type HomeCopy } from "./home-scenes";
import { useSnippet } from "./home-motion";

const bookingDelays = [500, 160, 0];
const cardDelays = [500, 800, 1300, 0];
const cardPunches = [4, 5, 6, 5];
const rulesDelays = [700, 0];
const scheduleDelays = [180, 180, 180, 180, 180, 0];

function Tile({ kind, copy, children }: {
	kind: keyof HomeCopy["tiles"];
	copy: HomeCopy["tiles"];
	children: ReactNode;
}) {
	const [title, description] = copy[kind];
	return <div className={`tile c-${kind}`}><h3>{title}</h3><p>{description}</p>{children}</div>;
}

function BookingSnippet({ site, reduced }: { site: HomeCopy["site"]; reduced: boolean }) {
	const { ref, frame } = useSnippet<HTMLDivElement>(bookingDelays, reduced);
	return <div className="snip"><div className="box" ref={ref}>
		<BookingRows rows={site.rows.slice(1)} copy={site} activeRow={0}
			state={frame === 2 ? "done" : frame === 1 ? "press" : undefined} spots={frame === 2 ? 1 : 2} />
	</div></div>;
}

function CardSnippet({ copy, reduced }: { copy: HomeCopy; reduced: boolean }) {
	const { ref, frame } = useSnippet<HTMLDivElement>(cardDelays, reduced);
	return <div className="snip" ref={ref}>
		<PunchCard copy={copy.card} used={cardPunches[frame]} reduced={reduced} />
		<div className={frame === 3 ? "p-note on" : "p-note"}>{copy.cancelNote}</div>
	</div>;
}

function RulesSnippet({ copy, reduced }: { copy: HomeCopy; reduced: boolean }) {
	const { ref, frame } = useSnippet<HTMLDivElement>(rulesDelays, reduced);
	return <div className="snip"><div ref={ref}>
		<div className="seg"><div className="thumb" style={{ insetInlineStart: frame ? "33.33%" : undefined }} />
			{copy.who.map((who, i) => <span className={i === frame ? "on" : undefined} key={who}>{who}</span>)}
		</div>
		<div className="kv"><span>{copy.cutoff[0]}</span><b>{copy.cutoff[1]}</b></div>
	</div></div>;
}

function ScheduleSnippet({ copy, reduced }: { copy: HomeCopy; reduced: boolean }) {
	const { ref, frame } = useSnippet<HTMLDivElement>(scheduleDelays, reduced);
	return <div className="snip" ref={ref}>
		<div className="kv schedule-time"><span>{copy.sched}</span></div>
		<div className="dates">{copy.dates.map((date, i) =>
			<span className={`${i === 3 ? "skip" : ""} ${i < frame ? "on" : ""}`} key={date}>{date}</span>
		)}</div>
	</div>;
}

function ChangeTile({ copy, reduced }: { copy: HomeCopy; reduced: boolean }) {
	const characters = Array.from(copy.req);
	const length = characters.length;
	const stepCount = copy.steps.length;
	const delays = useMemo(() => [
		400, ...Array<number>(length).fill(38), ...Array<number>(stepCount).fill(650), 0,
	], [length, stepCount]);
	const { ref, frame, playing } = useSnippet<HTMLDivElement>(delays, reduced);
	const [title, description, included] = copy.tiles.change;
	return <div className="tile c-change">
		<div><h3>{title}</h3><p>{description}</p><div className="incl">{included}</div></div>
		<div className="flow" ref={ref}>
			<div className="req"><span>{characters.slice(0, frame).join("")}</span><span className={playing ? "caret blinking" : "caret"} /></div>
			<div className="steps">{copy.steps.map((step, i) =>
				<span key={step} className={`${i < frame - length - 1 ? "on" : ""} ${i === stepCount - 1 ? "last" : ""}`}>{step}</span>
			)}</div>
		</div>
	</div>;
}

export function FeatureSheet({ copy, reduced, english }: { copy: HomeCopy; reduced: boolean; english: boolean }) {
	return <section className="get" id="get"><div className="wrap">
		<p className="lead">{copy.getSub}</p>
		<div className="sheet"><div className="cells">
			<Tile kind="site" copy={copy.tiles}>
				<div className="snip"><div className="mini-site">
					<div className="mini-nav"><b>{copy.mini.logo}</b>{copy.mini.nav.map(label => <span key={label}>{label}</span>)}</div>
					<div className="mini-hero">
						<div><h4>{copy.mini.h}</h4><p>{copy.mini.p}</p><span>{copy.mini.cta}</span></div>
						<div className="mini-art"><StudioLandscape /></div>
					</div>
				</div><div className="langs">
					{copy.langs.map((language, i) => <span key={language} className={i === Number(english) ? "on" : undefined}>{language}</span>)}
				</div></div>
			</Tile>
			<Tile kind="book" copy={copy.tiles}><BookingSnippet site={copy.site} reduced={reduced} /></Tile>
			<Tile kind="cards" copy={copy.tiles}><CardSnippet copy={copy} reduced={reduced} /></Tile>
			<Tile kind="rules" copy={copy.tiles}><RulesSnippet copy={copy} reduced={reduced} /></Tile>
			<Tile kind="sched" copy={copy.tiles}><ScheduleSnippet copy={copy} reduced={reduced} /></Tile>
			<Tile kind="app" copy={copy.tiles}>
				<div className="snip"><div className="box">
					{copy.people.map(([name, time, status, kind]) => <div className="person" key={name}>
						<span className="av">{name[0]}</span><span>{name} <span className="muted">{time}</span></span><span className={`tag ${kind}`}>{status}</span>
					</div>)}
				</div></div>
			</Tile>
			<ChangeTile copy={copy} reduced={reduced} />
		</div></div>
	</div></section>;
}
