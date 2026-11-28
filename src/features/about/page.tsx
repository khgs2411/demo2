import { useEffect, useState, type CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import { en } from "../../i18n/en";
import { he } from "../../i18n/he";
import { useInView } from "../../motion/use-in-view";
import { useReducedMotion } from "../../motion/use-reduced-motion";
import { Pass } from "../../ui/pass";
import { Ticket } from "../../ui/ticket";
import "./about.css";

type AboutCopy = typeof he.about;
type Side = "agent" | "me";

const handOver = 1100;
const punchStep = 110;

// The job list plays once from the agent's side to mine, then the reader holds the switch.
function JobList({ copy, reduced }: { copy: AboutCopy["jobs"]; reduced: boolean }) {
	const { ref, seen } = useInView<HTMLDivElement>(reduced, .5);
	const [side, setSide] = useState<Side>(reduced ? "me" : "agent");
	const [touched, setTouched] = useState(false);
	useEffect(() => {
		if (!seen || touched) return;
		const timer = setTimeout(() => setSide("me"), handOver);
		return () => clearTimeout(timer);
	}, [seen, touched]);
	const pick = (next: Side) => { setTouched(true); setSide(next); };
	const mine = side === "me";
	return <div className={`jobs${mine ? " mine" : ""}`} ref={ref}>
		<header className="jobs-head">
			<span>{copy.label}</span>
			<div className="jobs-switch" role="group" aria-label={copy.label}>
				<button type="button" aria-pressed={!mine} onClick={() => pick("agent")}>{copy.agent}</button>
				<button type="button" aria-pressed={mine} onClick={() => pick("me")}>{copy.me}</button>
				<i className="thumb" aria-hidden="true" />
			</div>
		</header>
		<ul className="jobs-list">
			{copy.items.map((job, index) => <li key={job} style={{ "--i": index } as CSSProperties}>
				<i className="jobs-hole" aria-hidden="true" />
				<span>{job}</span>
				<b className="jobs-owner"><span className="you" aria-hidden={mine}>{copy.onYou}</span><span className="me" aria-hidden={!mine}>{copy.onMe}</span></b>
			</li>)}
		</ul>
		<p className="jobs-left" aria-live="polite">{mine ? copy.leftMe : copy.leftAgent}</p>
	</div>;
}

function YearsCard({ copy, reduced }: { copy: AboutCopy["years"]; reduced: boolean }) {
	const { ref, seen } = useInView<HTMLDivElement>(reduced, .6);
	const punched = reduced || seen;
	return <div className={`years-card${punched ? " punched" : ""}`} ref={ref} aria-hidden="true">
		<div className="years-top"><b>{copy.card}</b><span>{copy.used}</span></div>
		<div className="years-holes">{Array.from({ length: 10 }, (_, index) =>
			<i key={index} style={{ "--i": index } as CSSProperties}><span>{index + 1}</span></i>)}</div>
		<div className="years-big"><bdi>10</bdi> {copy.unit}</div>
	</div>;
}

export function AboutPage() {
	const { t, i18n } = useTranslation("shell");
	const copy = i18n.resolvedLanguage === "en" ? en.about : he.about;
	const reduced = useReducedMotion();
	return <main data-module="about" className="inner-page about-page">
		<section className="about-hero"><div className="inner-wrap">
			<div className="about-intro">
				<h1>{copy.title}</h1>
				<p className="lede">{copy.lede}</p>
				<div className="actions"><Ticket href="#/book" stub={t("ticketNumber")}>{t("homeBookMeeting")}</Ticket></div>
			</div>
			<JobList copy={copy.jobs} reduced={reduced} />
		</div></section>

		<section className="about-part" aria-labelledby="about-work"><div className="inner-wrap">
			<div className="about-text"><h2 id="about-work">{copy.work.title}</h2><p>{copy.work.body}</p></div>
			<div className="site-log">
				<span className="site-log-title">{copy.work.logTitle}</span>
				<ul>{copy.work.log.map(([event, state], index) => <li key={event} className={index === 0 ? "live" : ""}>
					<span>{event}</span><b>{state}</b>
				</li>)}</ul>
			</div>
		</div></section>

		<section className="about-part about-years" aria-labelledby="about-years"><div className="inner-wrap">
			<YearsCard copy={copy.years} reduced={reduced} />
			<div className="about-text"><h2 id="about-years">{copy.years.title}</h2><p>{copy.years.body}</p></div>
		</div></section>

		<section className="about-part" aria-labelledby="about-tool"><div className="inner-wrap">
			<div className="about-text"><h2 id="about-tool">{copy.tool.title}</h2><p>{copy.tool.body}</p></div>
			<div className="tool-pass">
				<Pass variant="package" tone="ink" stub={<span className="fine">{copy.tool.fine}</span>}>
					<div className="name"><h3>{copy.tool.pass}</h3><span className="admit">{copy.tool.admit}</span></div>
					<ul>{copy.tool.lines.map(line => <li key={line}>{line}</li>)}</ul>
				</Pass>
			</div>
		</div></section>

		<section className="about-close"><div className="inner-wrap">
			<div><h2>{copy.closeTitle}</h2><p>{copy.closeSub}</p></div>
			<div className="cta"><Ticket href="#/book" tone="paper" large stub={t("ticketNumber")}>{t("homeBookMeeting")}</Ticket></div>
		</div></section>
	</main>;
}
