import type { ReactNode } from "react";

export type PassRow = { label: ReactNode; value: ReactNode; state?: "done" | "now" | "next" };

// The admission pass beside a gate page: the booking summary ticket's shape, holding what the page opens.
export function Pass({ kicker, code, rows, status, num, stamp }: {
	kicker: ReactNode; code: ReactNode; rows: readonly PassRow[]; status: ReactNode; num: ReactNode; stamp?: ReactNode;
}) {
	const hasStamp = stamp != null && typeof stamp !== "boolean" && stamp !== "";
	return <aside className={`pass ${hasStamp ? "stamped" : ""}`}>
		<header><span className="pass-label">{kicker}</span><span className="pass-label">{code}</span></header>
		<dl>{rows.map((row, index) => <div key={index} className={row.state ?? ""}>
			<dt className="pass-label">{row.label}</dt><dd>{row.value}</dd>
		</div>)}</dl>
		<div className="pass-tear"><span className="pass-label">{status}</span><b><bdi dir="ltr">{num}</bdi></b></div>
		{hasStamp && <span className="pass-stamp" aria-hidden="true">{stamp}</span>}
	</aside>;
}
