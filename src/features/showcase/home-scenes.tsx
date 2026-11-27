import { useRef, type RefObject } from "react";
import { useTranslation } from "react-i18next";
import type { he } from "../../i18n/he";
import { usePunchChad } from "./home-motion";

export type HomeCopy = typeof he.home;
type BookingState = "press" | "done" | "full";

export function BookingRows({ rows, copy, activeRow, state, spots, actionRef }: {
	rows: HomeCopy["site"]["rows"];
	copy: HomeCopy["site"];
	activeRow: number;
	state?: BookingState;
	spots?: number;
	actionRef?: RefObject<HTMLSpanElement | null>;
}) {
	const { t } = useTranslation("home");
	return rows.map(([time, name, availability], index) => {
		const active = activeRow === index;
		const count = active && spots !== undefined ? spots : Number(availability);
		return <div className="row" key={name}>
			<span className="t">{time}</span>
			<span className="nm">{name}<span className={count === 1 ? "sp last" : "sp"}>
				{count === 0 ? copy.noSpots : count === 1 ? copy.lastSpot : t("site.spots", { count })}
			</span></span>
			<span ref={active ? actionRef : undefined} className={active && state ? `bk ${state}` : "bk"}>
				{active && state === "done" ? copy.booked : active && state === "full" ? copy.full : copy.book}
			</span>
		</div>;
	});
}

export function PunchCard({ copy, used, reduced, scene }: {
	copy: HomeCopy["card"];
	used: number;
	reduced: boolean;
	scene?: RefObject<HTMLDivElement | null>;
}) {
	const { t } = useTranslation("home");
	const card = useRef<HTMLDivElement>(null);
	usePunchChad(card, used, reduced, scene);
	const size = 10;
	return <div className="punch" ref={card}>
		<div className="p-top"><b>{copy.title}</b><span>{copy.who}</span></div>
		<div className="holes">{Array.from({ length: size }, (_, index) =>
			<i className={index < used ? "hit" : undefined} key={index}>{index + 1}</i>
		)}</div>
		<div className="p-left"><span>{t("card.used", { count: used })}</span><b>{t("card.left", { count: size - used })}</b></div>
	</div>;
}

export function StudioLandscape({ strip = false }: { strip?: boolean }) {
	return strip
		? <svg viewBox="0 0 400 120" preserveAspectRatio="none" aria-hidden="true">
			<rect width="400" height="120" fill="var(--sand)" />
			<circle cx="300" cy="44" r="22" fill="var(--mustard)" opacity=".85" />
			<path d="M0 80 Q90 40 190 70 T400 56 V120 H0Z" fill="var(--sage)" />
			<path d="M0 100 Q110 78 220 94 T400 88 V120 H0Z" fill="var(--forest)" />
		</svg>
		: <svg viewBox="0 0 200 250" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
			<rect width="200" height="250" fill="var(--sand)" />
			<circle cx="138" cy="78" r="30" fill="var(--mustard)" opacity=".85" />
			<path d="M0 190 Q60 150 110 176 T200 160 V250 H0Z" fill="var(--sage)" />
			<path d="M0 214 Q70 190 130 208 T200 200 V250 H0Z" fill="var(--forest)" />
			<g transform="translate(78 120)" fill="none" stroke="#c2734a" strokeWidth="7" strokeLinecap="round">
				<circle cx="22" cy="-8" r="9" fill="#c2734a" stroke="none" />
				<path d="M22 2 L22 44 M22 14 L-4 30 M22 14 L50 -2 M22 44 L4 76 M22 44 L44 74" />
			</g>
		</svg>;
}
