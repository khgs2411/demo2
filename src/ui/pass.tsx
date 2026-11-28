import type { ReactNode } from "react";

export type PassRow = { label: ReactNode; value: ReactNode; state?: "done" | "now" | "next" };

type PassProps = { stamp?: ReactNode } & (
	| { variant?: "gate"; tone?: "coral" | "sand" | "ink"; numbered?: boolean; kicker: ReactNode; code: ReactNode; rows: readonly PassRow[]; status: ReactNode; num: ReactNode }
	| { variant: "package"; tone: "sand" | "coral" | "ink"; children: ReactNode; stub: ReactNode }
);

export function Pass(props: PassProps) {
	if (props.variant === "package") {
		return <article className={`pass package-pass package-pass-${props.tone}`}>
			{props.stamp && <div className="stamp">{props.stamp}</div>}
			<div className="body">{props.children}</div>
			<div className="stub">{props.stub}</div>
		</article>;
	}
	const { kicker, code, rows, status, num, stamp, tone = "coral", numbered } = props;
	const hasStamp = stamp != null && typeof stamp !== "boolean" && stamp !== "";
	return <aside className={`pass gate-pass gate-pass-${tone} ${hasStamp ? "stamped" : ""}${numbered ? " pass-numbered" : ""}`}>
		<header><strong>{kicker}</strong><span className="pass-label">{code}</span></header>
		<dl>{rows.map((row, index) => <div key={index} className={row.state ?? ""} aria-current={row.state === "now" ? "step" : undefined}>
			{numbered && <span className="punch-hole" aria-hidden="true">{index + 1}</span>}
			<dt className="pass-label">{row.label}</dt><dd>{row.value}</dd>
		</div>)}</dl>
		<div className="pass-tear"><span className="pass-label">{status}</span><b><bdi dir="ltr">{num}</bdi></b></div>
		{hasStamp && <span className="pass-stamp" aria-hidden="true">{stamp}</span>}
	</aside>;
}
