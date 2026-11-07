import type { ReactNode } from "react";

type LedgerRowProps = { name: ReactNode; price: ReactNode; details: ReactNode; children: ReactNode };

export function LedgerRow({ name, price, details, children }: LedgerRowProps) {
	return <div className="line"><div className="name">{name}</div><div className="price">{price}</div><div className="what">{details}</div>{children}</div>;
}
