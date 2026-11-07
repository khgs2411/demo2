import type { ComponentProps } from "react";

export function LogLine({ className = "", ...props }: ComponentProps<"output">) {
	return <output {...props} dir="ltr" className={`log-line ${className}`} />;
}
