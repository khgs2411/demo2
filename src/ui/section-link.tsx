import type { ComponentProps, MouseEvent } from "react";

type SectionLinkProps = ComponentProps<"a"> & { targetId: string };

export function SectionLink({ targetId, href = `#${targetId}`, onClick, ...props }: SectionLinkProps) {
	function handleClick(event: MouseEvent<HTMLAnchorElement>) {
		onClick?.(event);
		if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
		event.preventDefault();
		const target = document.getElementById(targetId);
		target?.focus({ preventScroll: true });
		target?.scrollIntoView();
	}
	return <a {...props} href={href} onClick={handleClick} />;
}
