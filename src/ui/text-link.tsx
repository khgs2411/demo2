import type { ComponentProps } from "react";

export function TextLink({ className = "", ...props }: ComponentProps<"a">) {
	return <a {...props} className={`link-arrow ${className}`} />;
}
