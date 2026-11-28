import { useEffect, useState } from "react";
import { TextLink } from "../../ui/text-link";
import { useInView } from "./home-motion";
import type { HomeCopy } from "./home-scenes";

const typeStep = 42;
const stampDelay = 520;

// The prompt an AI agent waits for types itself, then the stamp takes the job.
function usePromptTyping(prompt: string, reduced: boolean) {
	const { ref, seen } = useInView<HTMLDivElement>(reduced, .6);
	const [typed, setTyped] = useState(0);
	const [stamped, setStamped] = useState(false);
	useEffect(() => {
		if (reduced || !seen) return;
		let count = 0;
		let timer: ReturnType<typeof setTimeout>;
		function next() {
			count += 1;
			setTyped(count);
			timer = count < prompt.length ? setTimeout(next, typeStep) : setTimeout(() => setStamped(true), stampDelay);
		}
		timer = setTimeout(next, 300);
		return () => clearTimeout(timer);
	}, [prompt, reduced, seen]);
	return reduced
		? { ref, text: prompt, typing: false, stamped: true }
		: { ref, text: prompt.slice(0, typed), typing: seen && !stamped, stamped };
}

export function WhyStrip({ copy, reduced }: { copy: HomeCopy["whyMe"]; reduced: boolean }) {
	const { ref, text, typing, stamped } = usePromptTyping(copy.prompt, reduced);
	return <section className="why" aria-labelledby="why-heading"><div className="wrap">
		<div className="why-text">
			<h2 id="why-heading">{copy.question}</h2>
			<p>{copy.line}</p>
			<TextLink href="#/about">{copy.link}</TextLink>
		</div>
		<div className={`why-prompt${stamped ? " stamped" : ""}`} ref={ref} aria-hidden="true">
			<div className="prompt-box">
				<span className="prompt-label">{copy.agent}</span>
				<p className="prompt-text">{text}<i className={typing ? "caret blinking" : "caret"} /></p>
				<span className="prompt-send" />
			</div>
			{stamped && <span className="why-stamp">{copy.stamp}</span>}
		</div>
	</div></section>;
}
