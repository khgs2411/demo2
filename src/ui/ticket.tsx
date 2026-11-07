import type { ComponentProps, ReactNode } from "react";

type TicketProps = { stub: ReactNode; small?: boolean } & (
	| (ComponentProps<"a"> & { href: string })
	| (ComponentProps<"button"> & { href?: never })
);

export function Ticket({ stub, small, children, className = "", ...props }: TicketProps) {
	const content = <><span className="main">{children}</span><span className="stub" aria-hidden="true">{stub}</span></>;
	const classes = `ticket ${small ? "ticket-small" : ""} ${className}`;
	return "href" in props && props.href !== undefined
		? <a {...props as ComponentProps<"a">} className={classes}>{content}</a>
		: <button type="button" {...props as ComponentProps<"button">} className={classes}>{content}</button>;
}
