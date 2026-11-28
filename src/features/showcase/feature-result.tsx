import { useRef, type ReactNode, type RefObject } from "react";
import { featureOrder, type Feature } from "./feature-picks";
import { useResultBar, useSnippet } from "./home-motion";
import { BookingRows, ManagePerson, ManagePhone, StudioBrowserBar, StudioLandscape, type HomeCopy } from "./home-scenes";

const bookingDelays = [900, 160, 0];

function Reveal({ feature, children }: { feature: Feature; children: ReactNode }) {
	return <div className={`r-x x-${feature}`}><div>{children}</div></div>;
}

function StudioPreview({ copy, picks, reduced, stage }: {
	copy: HomeCopy;
	picks: readonly Feature[];
	reduced: boolean;
	stage: RefObject<HTMLDivElement | null>;
}) {
	const { site, manage, mini, build, card } = copy;
	const picked = (feature: Feature) => picks.includes(feature);
	const booking = picked("book");
	const rules = picked("rules");
	const { frame } = useSnippet(bookingDelays, booking && !reduced);
	return <div className={["r-stage", ...picks.map(feature => `on-${feature}`)].join(" ")} ref={stage} aria-hidden="true">
		<div className="r-browser">
			<StudioBrowserBar copy={copy} />
			<Reveal feature="change"><div className="r-banner">{build.site.banner}</div></Reveal>
			<div className="r-hero">
				<div><h4>{mini.h}</h4><p>{mini.p}</p>
					<span className={booking ? "r-cta cta-book" : "r-cta"}>{booking ? mini.cta : build.site.contact}</span>
				</div>
				<div className="mini-art"><StudioLandscape /></div>
			</div>
			<Reveal feature="book"><div className="r-week">
				<h5>{site.week}</h5>
				<BookingRows rows={site.rows.slice(1)} copy={site} activeRow={0} spots={frame === 2 ? 1 : 2}
					state={frame === 2 ? "done" : frame === 1 ? "press" : undefined}
					restrictedRow={rules ? { index: 1, label: build.site.members } : undefined} />
				<Reveal feature="rules"><p className="r-fine">{build.site.cancel}</p></Reveal>
				<Reveal feature="sched"><div className="r-next"><span>{build.site.next}</span>
					{copy.dates.filter((_, index) => index !== 0 && index !== 3).map(date => <i key={date}>{date}</i>)}
				</div></Reveal>
			</div></Reveal>
			<Reveal feature="cards"><div className="r-offers">
				{build.site.offers.map(([name, detail], index) => <div className={`r-offer ${index === 0 ? "card10" : "member"}`} key={name}>
					<b>{name}</b><small>{detail}</small>
					{index === 0 && <span className="mini-holes">{Array.from({ length: 5 }, (_, i) => <i key={i} />)}</span>}
				</div>)}
			</div></Reveal>
		</div>
		<ManagePhone copy={copy} waiting={rules}>
			<div className="m-list">
				<ManagePerson name={card.who} status={manage.maya} />
				{manage.people.map(([name, status]) => <ManagePerson key={name} name={name} status={status} />)}
			</div>
		</ManagePhone>
	</div>;
}

function PickCount({ picks }: { picks: readonly Feature[] }) {
	return <>
		<span className="r-holes" aria-hidden="true"><i className="hit" />
			{featureOrder.map(feature => <i key={feature} className={picks.includes(feature) ? "hit" : undefined} />)}
		</span>
		<b className="r-count" dir="ltr">{picks.length + 1}/{featureOrder.length + 1}</b>
	</>;
}

function SiteSentence({ copy, picks, newest }: {
	copy: HomeCopy["build"];
	picks: readonly Feature[];
	newest?: Feature;
}) {
	if (picks.length === 0) return <p className="r-sentence">{copy.start}</p>;
	const ordered = featureOrder.filter(feature => picks.includes(feature));
	return <p className="r-sentence">{copy.notJust} {copy.a} {ordered.map((feature, index) => {
		const last = index > 0 && index === ordered.length - 1;
		const separator = last ? (ordered.length > 2 ? copy.andSerial : copy.and) : index > 0 ? ", " : "";
		return <span key={feature}>{separator}<span className={newest === feature ? "new" : undefined}>
			{last && copy.andIn}{copy.clauses[feature][0]}
		</span></span>;
	})}.</p>;
}

export function FeatureResult({ copy, picks, reduced, sheet }: {
	copy: HomeCopy;
	picks: readonly Feature[];
	reduced: boolean;
	sheet: RefObject<HTMLDivElement | null>;
}) {
	const result = useRef<HTMLElement>(null);
	const stage = useRef<HTMLDivElement>(null);
	const showBar = useResultBar(sheet, stage);
	const build = copy.build;
	const newest = picks.at(-1);
	const report = newest ? `${build.added}: ${copy.tiles[newest][0]}` : build.start;
	return <aside ref={result} className="result" aria-label={build.now} tabIndex={-1}>
		<StudioPreview copy={copy} picks={picks} reduced={reduced} stage={stage} />
		<div className="r-pass">
			<div className="r-top"><span>{build.now}</span><PickCount picks={picks} /></div>
			<SiteSentence copy={build} picks={picks} newest={newest} />
			<p className={newest ? "r-gain plus" : "r-gain"}><span key={newest}>{newest ? build.clauses[newest][1] : build.startGain}</span></p>
			<p className="r-note">{build.note}</p>
		</div>
		<p className="r-status sr-only" role="status" aria-live="polite">{report}</p>
		<button type="button" className={showBar ? "r-bar show" : "r-bar"} tabIndex={showBar ? 0 : -1} onClick={() => {
			result.current?.focus({ preventScroll: true });
			result.current?.scrollIntoView({ behavior: reduced ? "instant" : "smooth", block: "start" });
		}}>
			<PickCount picks={picks} /><span className="r-bar-t">{report}</span>
		</button>
	</aside>;
}
