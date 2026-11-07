import type { ComponentProps } from "react";

export function Kicker({ className = "", ...props }: ComponentProps<"span">) {
	return <span {...props} className={`kicker ${className}`} />;
}
