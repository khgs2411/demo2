import { useTranslation } from "react-i18next";
import { Input } from "../../ui/input";
import { Ticket } from "../../ui/ticket";
import type { BookingProfile } from "./machine";

export function ProfileStep({ profile, onChange, onSubmit, busy }: { profile: BookingProfile; onChange: (profile: BookingProfile) => void; onSubmit: () => void; busy: boolean }) {
	const { t } = useTranslation("booking");
	return <>
		<h1 tabIndex={-1}>{t("prTitle")}</h1><p className="lede">{t("prLede")}</p>
		<form onSubmit={event => { event.preventDefault(); onSubmit(); }}>
			<fieldset className="fields" disabled={busy}>
				<Input label={t("name")} value={profile.displayName} onChange={e => onChange({ ...profile, displayName: e.target.value })} autoComplete="name" required />
				<Input label={t("phone")} value={profile.phoneNumber} onChange={e => onChange({ ...profile, phoneNumber: e.target.value })} type="tel" dir="ltr" autoComplete="tel" required />
				<Input label={t("business")} value={profile.businessName} onChange={e => onChange({ ...profile, businessName: e.target.value })} autoComplete="organization" required />
				<div><Input label={t("website")} value={profile.websiteUrl ?? ""} onChange={e => onChange({ ...profile, websiteUrl: e.target.value })} type="url" dir="ltr" autoComplete="url" placeholder="https://" aria-describedby="website-hint" />
					<span className="hint" id="website-hint">{t("optional")}</span></div>
			</fieldset>
			<div className="actions"><Ticket stub="03" type="submit" disabled={busy}>{t(busy ? "loading" : "next")}</Ticket></div>
		</form>
	</>;
}
