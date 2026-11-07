import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useReducedMotion } from "../../motion/use-reduced-motion";
import { LogLine } from "../../ui/log-line";
import { Chapters, posterTopside } from "./chapters";
import { StoryFallback, useSaveData } from "./fallback";
import { ShowcaseScene } from "./scene";
import type { Timeline } from "./scene/timeline";
import "./showcase.css";

export function Story() {
	const { t } = useTranslation("showcase");
	const reducedMotion = useReducedMotion(), saveData = useSaveData();
	const [failed, setFailed] = useState(false);
	const staticStory = reducedMotion || saveData || failed;
	const storyRef = useRef<HTMLElement>(null), chaptersRef = useRef<HTMLDivElement>(null);
	const logRef = useRef<HTMLOutputElement>(null);
	const onError = useCallback(() => setFailed(true), []);
	const onFrame = useCallback((progress: number, frame: Timeline) => {
		document.documentElement.style.setProperty("--n", String(frame.night));
		storyRef.current?.style.setProperty("--p", String(progress));
		chaptersRef.current?.querySelectorAll<HTMLElement>(".chapter").forEach((chapter, i) => {
			const opacity = frame.chapterOpacities[i];
			chapter.style.opacity = String(opacity);
			chapter.style.transform = `translateY(${(1 - opacity) * 26}px)`;
			chapter.style.pointerEvents = opacity > .5 ? "auto" : "none";
			chapter.toggleAttribute("inert", opacity <= .5);
			chapter.setAttribute("aria-hidden", String(opacity <= .5));
		});
		if (logRef.current) logRef.current.value = frame.log;
	}, []);
	useEffect(() => {
		document.documentElement.style.setProperty("--n", "0");
		return () => document.documentElement.style.setProperty("--n", "0");
	}, [staticStory]);
	return <section ref={storyRef} className={`showcase-story${staticStory ? " showcase-static" : ""}`} aria-label={t("storyLabel")}>
		<div className="showcase-stage">
			{staticStory ? <StoryFallback /> : <>
				<Suspense fallback={<img className="showcase-loading" src={posterTopside} width={1440} height={900} alt="" />}>
					<ShowcaseScene storyRef={storyRef} onFrame={onFrame} onError={onError} />
				</Suspense>
				<Chapters ref={chaptersRef} />
				<LogLine className="showcase-log" ref={logRef} aria-hidden="true">agent ▸ idle</LogLine>
				<div className="showcase-rail" aria-hidden="true"><i /></div>
			</>}
		</div>
	</section>;
}
