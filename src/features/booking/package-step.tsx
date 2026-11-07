import { useTranslation } from "react-i18next";
import { Ticket } from "../../ui/ticket";
import { getBookingOptions } from "../packages";
import type { AddonId, BookingSelection, PackageId } from "./machine";

export const addonCopy: Record<AddonId, string> = { "agent-whatsapp": "aWa", "agent-social": "aSocial", "agent-voice": "aVoice" };

export function PackageStep({ selection, onChange, onContinue }: {
	selection: BookingSelection; onChange: (selection: BookingSelection) => void; onContinue: () => void;
}) {
	const { t } = useTranslation("booking");
	const options = getBookingOptions();
	return <>
		<h1 tabIndex={-1}>{t("pTitle")}</h1><p className="lede">{t("pLede")}</p>
		<div className="ledger" role="radiogroup" aria-label={t("sPackage")}>
			{options.packages.map(entry => {
				const prefix = entry.id === "site" ? "site" : "sys";
				return <label className="row" key={entry.id}>
					<input type="radio" name="package" value={entry.id} checked={selection.packageId === entry.id} onChange={() => onChange({ ...selection, packageId: entry.id as PackageId, slotId: null })} />
					<span><b>{t(`${prefix}Name`)}</b><small>{t(`${prefix}Small`)}</small></span>
					<span className="price">{entry.recommended && <><span className="rec">{t("rec")}</span><br /></>}{t(`${prefix}Price`)}</span>
				</label>;
			})}
		</div>
		<fieldset className="addons"><legend className="mono">{t("addonsLabel")}</legend>
			{options.addons.map(entry => <label className="check" key={entry.id}>
				<input type="checkbox" checked={selection.addonInterests.includes(entry.id as AddonId)} onChange={event => onChange({ ...selection,
					addonInterests: event.target.checked ? [...selection.addonInterests, entry.id as AddonId] : selection.addonInterests.filter(id => id !== entry.id),
				})} /><span>{t(addonCopy[entry.id as AddonId])}</span>
			</label>)}
		</fieldset>
		<div className="actions"><Ticket stub="01" onClick={onContinue}>{t("next")}</Ticket></div>
	</>;
}
