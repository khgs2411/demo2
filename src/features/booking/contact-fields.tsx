import { useTranslation } from "react-i18next";
import { Input } from "../../ui/input";
import type { BookingContact } from "./machine";

export function ContactFields({ contact, onChange }: {
	contact: BookingContact;
	onChange: (field: keyof BookingContact, value: string) => void;
}) {
	const { t } = useTranslation("booking");
	return <>
		<Input label={t("name")} value={contact.displayName} onChange={event => onChange("displayName", event.target.value)} autoComplete="name" required />
		<Input label={t("phone")} value={contact.phoneNumber} onChange={event => onChange("phoneNumber", event.target.value)} type="tel" dir="ltr" autoComplete="tel" required />
	</>;
}
