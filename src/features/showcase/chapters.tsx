import type { Ref } from "react";
import { useTranslation } from "react-i18next";
import { openBooking } from "../../app/open-booking";
import { Kicker } from "../../ui/kicker";
import { Ticket } from "../../ui/ticket";
import { TextLink } from "../../ui/text-link";
import { chapterAnchors } from "./scene/timeline";

const beats = ["front", "flip", "system", "agent", "book"] as const;
const kickers = ["TOPSIDE", "↻", "UNDERSIDE", "AGENT", "LIVE"];
export const posterTopside = `${import.meta.env.BASE_URL}poster-topside.webp`;
export const posterUnderside = `${import.meta.env.BASE_URL}poster-underside.webp`;

export function Chapters({ staticStory = false, ref }: { staticStory?: boolean; ref?: Ref<HTMLDivElement> }) {
	const { t } = useTranslation("showcase");
	return <div className="showcase-chapters" ref={ref}>
		{beats.map((beat, index) => {
			const Heading = index === 0 ? "h1" : "h2";
			const inactive = !staticStory && index !== 0;
			const topside = index === 0 || index === 4;
			return <section key={beat} className="chapter" data-c={index} data-at={chapterAnchors[index]}
				inert={inactive} aria-hidden={inactive ? true : undefined}
				style={staticStory ? undefined : { opacity: index === 0 ? 1 : 0 }}>
				<Kicker>{kickers[index]}</Kicker>
				<Heading>{t(`chapters.${beat}.lead`)}<br />{t(`chapters.${beat}.bridge`)}<span className={topside ? "u-coral" : index === 1 ? undefined : "u-wire"}>{t(`chapters.${beat}.end`)}</span></Heading>
				<p>{t(`chapters.${beat}.body`)}</p>
				{topside && <div className="act">
					<Ticket stub="№ 01" onClick={() => openBooking()}>{t(index === 0 ? "bookMeeting" : "chooseTime")}</Ticket>
					{index === 0 && <TextLink href="#/demo">{t("seeItWork")}</TextLink>}
				</div>}
				{staticStory && <img className="showcase-poster" src={topside ? posterTopside : posterUnderside}
					width={1440} height={900} loading={index === 0 ? "eager" : "lazy"}
					alt={t(topside ? "posterTopside" : "posterUnderside")} />}
			</section>;
		})}
	</div>;
}
