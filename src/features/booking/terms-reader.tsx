import { useTranslation } from "react-i18next";
import type { BookingTerms } from "./machine";

export function TermsReader({ terms, scrollable }: { terms: BookingTerms; scrollable?: boolean }) {
	return <p className="booking-terms" lang={terms.locale} dir="auto" tabIndex={scrollable ? 0 : undefined}>{terms.text}</p>;
}

export function TermsConsent({ terms, accepted, onChange }: {
	terms: BookingTerms; accepted: boolean; onChange: (accepted: boolean) => void;
}) {
	const { t } = useTranslation("booking");
	return <>
		<TermsReader terms={terms} scrollable />
		<label className="check"><input type="checkbox" required checked={accepted} onChange={event => onChange(event.target.checked)} /> {t("acceptTerms")}</label>
	</>;
}
