import { useLayoutEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Pass } from "../../ui/pass";
import { TextLink } from "../../ui/text-link";
import { getHeadlineOffers } from "../packages";
import type { HomeCopy } from "./home-scenes";

const offers = getHeadlineOffers("system");
const tones = ["sand", "coral", "ink"] as const;

function usePassFan(reduced: boolean, english: boolean) {
	const ref = useRef<HTMLDivElement>(null);
	useLayoutEffect(() => {
		const row = ref.current;
		if (!row) return;
		const passes = [...row.querySelectorAll<HTMLElement>(".package-pass")];
		const wide = window.matchMedia("(min-width: 860px)");
		let current = reduced ? 1 : 0;
		let frame: number | undefined;

		function draw(progress: number) {
			const direction = english ? 1 : -1;
			passes.forEach((pass, i) => {
				const side = i - 1;
				const width = pass.offsetWidth;
				const x = -side * (width + 20) * (1 - progress) * .82 * direction;
				const y = 26 * (1 - progress) + 10 * progress;
				const rotation = side * (9 - 6.5 * progress);
				pass.style.transform = !wide.matches ? "" : side === 0
					? `translateY(${-14 * progress}px)`
					: `translate(${x}px, ${y}px) rotate(${rotation}deg)`;
			});
		}
		function tick() {
			const target = reduced ? 1 : Math.max(0, Math.min(1, (window.innerHeight - row!.getBoundingClientRect().top) / (window.innerHeight * .75)));
			current += (target - current) * .09;
			if (Math.abs(target - current) < .0005) current = target;
			draw(current);
			frame = current === target ? undefined : requestAnimationFrame(tick);
		}
		function schedule() {
			frame ??= requestAnimationFrame(tick);
		}

		draw(current);
		if (!reduced) {
			window.addEventListener("scroll", schedule, { passive: true });
			schedule();
		}
		window.addEventListener("resize", schedule);
		const resize = typeof ResizeObserver === "undefined" ? undefined : new ResizeObserver(schedule);
		resize?.observe(row.closest("main") ?? row);
		return () => {
			if (frame !== undefined) cancelAnimationFrame(frame);
			window.removeEventListener("scroll", schedule);
			window.removeEventListener("resize", schedule);
			resize?.disconnect();
		};
	}, [reduced, english]);
	return ref;
}

export function HomePackages({ copy, reduced, english }: { copy: HomeCopy; reduced: boolean; english: boolean }) {
	const { t } = useTranslation(["shell", "packages"]);
	const fan = usePassFan(reduced, english);
	return <section className="packs" id="packs" aria-labelledby="home-packages-heading"><div className="wrap">
		<div className="head"><h2 id="home-packages-heading">{copy.packsTitle[0]}<br />{copy.packsTitle[1]}</h2><p>{copy.packsSub}</p></div>
		<div className="passes package-passes" ref={fan}>
			{offers.map(({ id, priceKey, recommended }, index) => <Pass key={id} variant="package" tone={tones[index]}
				stamp={recommended ? copy.rec : undefined}
				stub={<><a href={`#/book/${id}`}>{t("homeBookMeeting")}</a><span className="serial">{copy.min}</span></>}
			>
				<div className="name"><h3>{t(`offers.${id}.name`, { ns: "packages" })}</h3><span className="admit">{copy.admit}</span></div>
				<div className="price">{t(priceKey, { ns: "packages" })}<small>{copy.month}</small></div>
				<ul>{copy.plans[id as keyof HomeCopy["plans"]].map(item => <li key={item}>{item}</li>)}</ul>
			</Pass>)}
		</div>
		<p className="terms">{copy.terms}</p>
		<div className="extras">
			<div className="extra">
				<div><h3>{copy.siteOnly[0]}</h3><p>{copy.siteOnly[1]}</p></div>
				<TextLink href="#/packages">{copy.siteOnlyLink}</TextLink>
			</div>
			<div className="extra">
				<div><h3>{copy.agents[0]}</h3><p>{copy.agents[1]}</p></div>
				<div className="pills">{copy.agentPills.map(channel => <span key={channel}>{channel}</span>)}</div>
			</div>
		</div>
	</div></section>;
}
