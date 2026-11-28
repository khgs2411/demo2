import type { ComponentProps, ReactNode } from "react";

export type TicketTone = "coral" | "ink" | "ghost" | "paper";

type TicketProps = { stub: ReactNode; small?: boolean; large?: boolean; tone?: TicketTone } & (
	| (ComponentProps<"a"> & { href: string })
	| (ComponentProps<"button"> & { href?: never })
);

export function Ticket({ stub, small, large, tone = "coral", children, className = "", ...props }: TicketProps) {
	const content = <><span className="main">{children}</span><span className="stub" aria-hidden="true">{stub}</span></>;
	const classes = `ticket ${small ? "ticket-small" : large ? "ticket-large" : ""} ${tone === "coral" ? "" : `ticket-${tone}`} ${className}`;
	return "href" in props && props.href !== undefined
		? <a {...props as ComponentProps<"a">} className={classes}>{content}</a>
		: <button type="button" {...props as ComponentProps<"button">} className={classes}>{content}</button>;
}
