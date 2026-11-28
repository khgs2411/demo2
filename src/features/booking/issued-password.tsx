import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Ticket } from "../../ui/ticket";
import type { BookingCredentials } from "./machine";

export function IssuedPassword({ credentials }: { credentials: BookingCredentials }) {
	const { t } = useTranslation("booking");
	const [copyStatus, setCopyStatus] = useState<"copied" | "copyFailed" | null>(null);
	async function copy() {
		try {
			await navigator.clipboard.writeText(credentials.password);
			setCopyStatus("copied");
		} catch {
			setCopyStatus("copyFailed");
		}
	}
	return <div className="issued">
		<p>{t("savePassword")}</p>
		<code className="issued-password" dir="ltr">{credentials.formatted}</code>
		<Ticket stub="" className="booking-link" onClick={() => void copy()}>{t("copyPassword")}</Ticket>
		{copyStatus && <p role="status">{t(copyStatus)}</p>}
	</div>;
}
