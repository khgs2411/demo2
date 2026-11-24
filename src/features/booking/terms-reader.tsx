import { useTranslation } from "react-i18next";
import type { BookingTerms } from "./machine";

export function TermsReader({ terms }: { terms: BookingTerms }) {
	return <p className="booking-terms" lang={terms.locale} dir="auto">{terms.text}</p>;
}

export function TermsConsent({ terms, accepted, onChange }: {
	terms: BookingTerms; accepted: boolean; onChange: (accepted: boolean) => void;
}) {
	const { t } = useTranslation("booking");
	return <>
		<TermsReader terms={terms} />
		<label className="check"><input type="checkbox" required checked={accepted} onChange={event => onChange(event.target.checked)} /> {t("acceptTerms")}</label>
	</>;
}
