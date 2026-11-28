import { useId } from "react";
import type { ComponentProps, ReactNode } from "react";

type InputProps = ComponentProps<"input"> & { label: string; labelAction?: ReactNode };

export function Input({ label, labelAction, id, className = "", ...props }: InputProps) {
	const generatedId = useId();
	const inputId = id ?? generatedId;
	return <div className="field">
		<div className="field-label"><label htmlFor={inputId}>{label}</label>{labelAction}</div>
		<input {...props} id={inputId} className={`input ${className}`} />
	</div>;
}
