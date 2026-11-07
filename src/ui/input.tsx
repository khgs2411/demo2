import { useId } from "react";
import type { ComponentProps } from "react";

type InputProps = ComponentProps<"input"> & { label: string };

export function Input({ label, id, className = "", ...props }: InputProps) {
	const generatedId = useId();
	const inputId = id ?? generatedId;
	return <label className="field" htmlFor={inputId}><span>{label}</span><input {...props} id={inputId} className={`input ${className}`} /></label>;
}
