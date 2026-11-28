import { useMemo } from "react";
import { BookingRows, PunchCard, type HomeCopy } from "./home-scenes";
import { useSnippet } from "./home-motion";

type SnippetProps = { copy: HomeCopy; animate: boolean };

const bookingDelays = [450, 160, 0];
const cardDelays = [450, 800, 1300, 0];
const cardPunches = [4, 5, 6, 5];
const rulesDelays = [600, 0];
const scheduleDelays = [160, 160, 160, 160, 160, 0];

export function BookingSnippet({ copy, animate }: SnippetProps) {
	const { frame } = useSnippet(bookingDelays, animate);
	return <div className="snip"><div className="box">
		<BookingRows rows={copy.site.rows.slice(1)} copy={copy.site} activeRow={0}
			state={frame === 2 ? "done" : frame === 1 ? "press" : undefined} spots={frame === 2 ? 1 : 2} />
	</div></div>;
}

export function CardSnippet({ copy, animate }: SnippetProps) {
	const { frame } = useSnippet(cardDelays, animate);
	return <div className="snip">
		<PunchCard copy={copy.card} used={cardPunches[frame]} reduced={!animate} />
		<div className={frame === 3 ? "p-note on" : "p-note"}>{copy.cancelNote}</div>
	</div>;
}

export function RulesSnippet({ copy, animate }: SnippetProps) {
	const { frame } = useSnippet(rulesDelays, animate);
	return <div className="snip"><div>
		<div className="seg"><div className={frame ? "thumb members" : "thumb"} />
			{copy.who.map((who, i) => <span className={i === frame ? "on" : undefined} key={who}>{who}</span>)}
		</div>
		<div className="kv"><span>{copy.cutoff[0]}</span><b>{copy.cutoff[1]}</b></div>
	</div></div>;
}

export function ScheduleSnippet({ copy, animate }: SnippetProps) {
	const { frame } = useSnippet(scheduleDelays, animate);
	return <div className="snip">
		<div className="kv schedule-time"><span>{copy.sched}</span></div>
		<div className="dates">{copy.dates.map((date, i) =>
			<span className={`${i === 3 ? "skip" : ""} ${i < frame ? "on" : ""}`} key={date}>{date}</span>
		)}</div>
	</div>;
}

export function ChangeSnippet({ copy, animate }: SnippetProps) {
	const characters = Array.from(copy.req);
	const length = characters.length;
	const stepCount = copy.steps.length;
	const delays = useMemo(() => [
		300, ...Array<number>(length).fill(30), ...Array<number>(stepCount).fill(500), 0,
	], [length, stepCount]);
	const { frame, playing } = useSnippet(delays, animate);
	return <div className="snip flow">
			<div className="req"><span>{characters.slice(0, frame).join("")}</span><span className={playing ? "caret blinking" : "caret"} /></div>
			<div className="steps">{copy.steps.map((step, i) =>
				<span key={step} className={`${i < frame - length ? "on" : ""} ${i === stepCount - 1 ? "last" : ""}`}>{step}</span>
			)}</div>
	</div>;
}

const appDelays = [220, 220, 220, 0];

export function AppSnippet({ copy, animate }: SnippetProps) {
	const { frame } = useSnippet(appDelays, animate);
	return <div className="snip"><div className="box">
		{copy.people.map(([name, time, status, kind], i) => <div className={i < frame ? "person" : "person pre"} key={name}>
			<span className="av">{name[0]}</span><span>{name} <span className="muted">{time}</span></span><span className={`tag ${kind}`}>{status}</span>
		</div>)}
	</div></div>;
}
