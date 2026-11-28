import type { ComponentProps, MouseEvent } from "react";

type SectionLinkProps = Omit<ComponentProps<"a">, "href"> & { targetId: string };

export function SectionLink({ targetId, onClick, ...props }: SectionLinkProps) {
	function handleClick(event: MouseEvent<HTMLAnchorElement>) {
		onClick?.(event);
		if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
		event.preventDefault();
		document.getElementById(targetId)?.scrollIntoView();
	}
	return <a {...props} href={`#${targetId}`} onClick={handleClick} />;
}
