import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";
import { useTranslation } from "react-i18next";
import { SectionLink } from "../../ui/section-link";
import { Ticket } from "../../ui/ticket";
import { localBounds, useFrames } from "./home-motion";
import { BookingRows, ManagePerson, ManagePhone, PunchCard, StudioBrowserBar, StudioLandscape, type HomeCopy } from "./home-scenes";

const heroFrames = [
	{ delay: 1500, phase: "ready" },
	{ delay: 160, phase: "press" },
	{ delay: 1000, phase: "fly" },
	{ delay: 250, phase: "land" },
	{ delay: 500, phase: "booked" },
	{ delay: 900, phase: "punched" },
	{ delay: 4800, phase: "full" },
	{ delay: 600, phase: "close" },
] as const;
const heroDelays = heroFrames.map(value => value.delay);
const sceneWidth = 460;

function FlyingTicket({ scene, from, to, copy }: {
	scene: RefObject<HTMLDivElement | null>;
	from: RefObject<HTMLSpanElement | null>;
	to: RefObject<HTMLDivElement | null>;
	copy: HomeCopy["fly"];
}) {
	const fly = useRef<HTMLDivElement>(null);
	useLayoutEffect(() => {
		const element = fly.current, host = scene.current, source = from.current, target = to.current;
		if (!element || !host || !source || !target) return;
		const start = localBounds(source, host), end = localBounds(target, host);
		const { width, height } = localBounds(element, host);
		const x = start.x + (start.width - width) / 2, y = start.y + (start.height - height) / 2;
		element.style.left = `${x}px`;
		element.style.top = `${y}px`;
		const dx = end.x + (end.width - width) / 2 - x, dy = end.y - y;
		const rotation = Math.sign(dx) * 10;
		const keyframes = [0, .2, .4, .6, .8, .92, 1].map(offset => {
			const position = offset === .92 ? 1 : offset;
			const lift = -170 * 4 * position * (1 - position);
			const scale = position < .12 ? 1 + position * 2 : 1.24 - position * .5;
			return {
				offset, opacity: offset === 1 ? 0 : 1,
				transform: `translate(${dx * position}px, ${dy * position + lift}px) rotate(${rotation * (2 * position - 1)}deg) scale(${scale})`,
			};
		});
		const animation = element.animate(keyframes, {
			duration: heroFrames[2].delay, easing: "cubic-bezier(.45,.05,.4,1)", fill: "forwards",
		});
		return () => animation.cancel();
	}, [scene, from, to]);
	return <div className="fly" ref={fly}><Ticket disabled small stub={copy[1]}>{copy[0]}</Ticket></div>;
}

function HeroScene({ copy, reduced }: { copy: HomeCopy; reduced: boolean }) {
	const stage = useRef<HTMLDivElement>(null);
	const scene = useRef<HTMLDivElement>(null);
	const booking = useRef<HTMLSpanElement>(null);
	const attendees = useRef<HTMLDivElement>(null);
	const [ready, setReady] = useState(false);
	useLayoutEffect(() => {
		const element = stage.current;
		if (!element || typeof ResizeObserver === "undefined") return;
		const fit = () => element.style.setProperty("--s", Math.min(1, element.clientWidth / sceneWidth).toFixed(4));
		const observer = new ResizeObserver(fit);
		observer.observe(element);
		fit();
		return () => observer.disconnect();
	}, []);
	useEffect(() => {
		if (reduced) return;
		let active = true;
		void document.fonts.ready.then(() => { if (active) setReady(true); });
		return () => { active = false; };
	}, [reduced]);
	const index = useFrames(heroDelays, ready && !reduced, true);
	const phase = reduced ? "full" : heroFrames[index].phase;
	const booked = phase !== "ready" && phase !== "press";
	const filled = booked && phase !== "fly";
	const punched = phase === "punched" || phase === "full" || phase === "close";
	const button = phase === "full" || phase === "close" ? "full" : booked ? "done" : phase === "press" ? "press" : undefined;
	const { site, manage, card } = copy;

	return <div className="stage" aria-hidden="true" ref={stage}><div className="scene" ref={scene}>
		<div className="browser">
			<StudioBrowserBar copy={copy} />
			<div className="b-week"><h4>{site.week}</h4>
				<BookingRows rows={site.rows} copy={site} activeRow={1} spots={booked ? 0 : 1} state={button} actionRef={booking} />
			</div>
			<div className="b-art"><StudioLandscape strip /></div>
		</div>
		<PunchCard copy={card} used={punched ? 7 : 6} reduced={reduced} scene={scene} />
		<ManagePhone copy={copy} filled={filled} waiting>
			<div className="m-list" ref={attendees}>
				<div className={`m-new${filled && phase !== "close" ? " on" : ""}${phase === "land" ? " flash" : ""}`}>
					<div><ManagePerson name={card.who} status={manage.maya} /></div>
				</div>
				{manage.people.map(([name, status]) => <ManagePerson key={name} name={name} status={status} />)}
			</div>
		</ManagePhone>
		{phase === "fly" && <FlyingTicket scene={scene} from={booking} to={attendees} copy={copy.fly} />}
	</div></div>;
}

export function Hero({ copy, reduced }: { copy: HomeCopy; reduced: boolean }) {
	const { t } = useTranslation("shell");
	return <section className="hero"><div className="wrap">
		<div>
			<h1>{copy.h1[0]}<br />{copy.h1[1]}</h1>
			<p className="sub">{copy.sub}</p>
			<div className="actions">
				<Ticket href="#/book" stub={t("ticketNumber")}>{t("homeBookMeeting")}</Ticket>
				<SectionLink className="link-arrow" targetId="get">{t("whatYouGet")}</SectionLink>
			</div>
		</div>
		<HeroScene copy={copy} reduced={reduced} />
	</div></section>;
}
